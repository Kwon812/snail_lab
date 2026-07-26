import { after, NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "../../../_lib/supabase-admin";
import { sourceFromPackage } from "../../../_lib/notifications";
import { lectureFilter } from "../_lib/lectureFilter";
import { classifyAndSave } from "../_lib/pipeline";

export const dynamic = "force-dynamic";
// Haiku 분류는 보통 1~3초지만, after()로 응답 뒤에도 실행되므로 넉넉히 잡는다.
export const maxDuration = 60;

/**
 * 갤럭시 앱(NotificationListenerService)이 가로챈 카톡/문자 알림을 받는다.
 *
 * 앱은 기기에만 있는 정보로만 거르고(패키지 화이트리스트, 묶음 요약·상시 알림 플래그,
 * 5자 미만·한글 없음, 중복 해시) 나머지는 전부 여기로 보낸다. 키워드 1차 필터와 AI 분류는
 * 서버가 맡는다 — 규칙을 재빌드 없이 고칠 수 있으니까.
 *
 * 처리 순서:
 *   ① 시크릿 검증 → ② 1차 필터 → ③ 통과분만 저장(pending) → 즉시 200 응답
 *   → ④ AI 분류 (④는 after()로 응답 뒤에 실행)
 *
 * 1차 필터를 저장 **앞에** 두는 건 개인정보 때문이다. 이 엔드포인트로는 강의와 무관한 사적인
 * 대화까지 전부 올라오는데, 그걸 일단 저장해 두고 나중에 status만 filtered로 바꾸면 원문이
 * 서버에 남는다. 걸러진 건 아예 DB에 넣지 않는다.
 *
 * 그 대가로 "필터가 잘못 걸러낸 것"을 사후에 확인할 수 없다 — 필터 규칙을 손볼 땐
 * lectureFilter.ts 를 직접 검증해야 한다.
 *
 * 앱은 분류 결과를 쓰지 않는다(결과를 보는 곳은 /admin/notifications이고 거긴 Realtime으로
 * 받는다). 그래서 앱의 요청을 AI 응답까지 붙잡아 둘 이유가 없다.
 */

const EventSchema = z.object({
  appPackage: z.string().min(1).max(200),
  sender: z.string().max(200).nullable().optional(),
  body: z.string().min(1).max(4000),
  /** 기기에서 알림이 뜬 시각 (epoch ms). */
  postedAt: z.number().int().positive(),
  /** sha256(pkg|sender|body|분) — 중복 방지 키. */
  dedupeKey: z.string().min(8).max(128),
});

const BodySchema = z.object({
  deviceId: z.string().min(1).max(128),
  events: z.array(EventSchema).min(1).max(50),
});

/** 시크릿이 유출됐을 때 한 기기가 테이블을 채워버리지 못하도록 하는 하한선. */
const MAX_EVENTS_PER_MINUTE = 200;

export async function POST(request: NextRequest) {
  const expected = process.env.NOTIFY_INGEST_SECRET;
  if (!expected) {
    return NextResponse.json({ error: "NOTIFY_INGEST_SECRET 미설정" }, { status: 500 });
  }
  if (request.headers.get("x-ingest-secret") !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
  const { deviceId, events } = parsed.data;

  // 저장 전에 거른다 — 통과하지 못한 원문은 서버 어디에도 남기지 않는다.
  const passed = events
    .map((e) => ({ event: e, filter: lectureFilter(e.sender || null, e.body) }))
    .filter(({ filter }) => filter.pass);

  // 전부 걸러졌으면 DB를 건드릴 일이 없다. 앱은 200을 받아 큐에서 지운다.
  if (passed.length === 0) {
    return NextResponse.json({
      ok: true,
      received: events.length,
      filtered: events.length,
      stored: 0,
      duplicates: 0,
    });
  }

  const supabase = supabaseAdmin();

  // 저장되는 건수 기준으로 센다 — 걸러진 건 테이블을 늘리지 않으므로 한도에 포함할 이유가 없다.
  const since = new Date(Date.now() - 60_000).toISOString();
  const { count } = await supabase
    .from("notification_events")
    .select("id", { count: "exact", head: true })
    .eq("device_id", deviceId)
    .gte("created_at", since);
  if ((count ?? 0) + passed.length > MAX_EVENTS_PER_MINUTE) {
    return NextResponse.json({ error: "rate limited" }, { status: 429 });
  }

  const rows = passed.map(({ event: e, filter }) => ({
    device_id: deviceId,
    app_package: e.appPackage,
    source: sourceFromPackage(e.appPackage),
    sender: e.sender || null,
    body: e.body,
    posted_at: new Date(e.postedAt).toISOString(),
    dedupe_key: e.dedupeKey,
    filter_score: filter.score,
    status: "pending" as const,
  }));

  // ignoreDuplicates → ON CONFLICT DO NOTHING. select()는 실제로 새로 들어간 행만 돌려주므로
  // 중복은 조용히 무시되고, 앱은 어차피 200을 받아 큐에서 지운다(무한 재시도 방지).
  const { data: inserted, error } = await supabase
    .from("notification_events")
    .upsert(rows, { onConflict: "dedupe_key", ignoreDuplicates: true })
    .select("id, sender, body");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const newRows = inserted ?? [];

  // 응답을 먼저 보내고, AI 분류는 그 뒤에 이어서 실행한다.
  after(async () => {
    for (const row of newRows) {
      await classifyAndSave(row.id, row.sender, row.body);
    }
  });

  return NextResponse.json({
    ok: true,
    received: events.length,
    filtered: events.length - passed.length,
    stored: newRows.length,
    // 중복은 "필터는 통과했지만 이미 저장돼 있던 것"만 센다.
    duplicates: passed.length - newRows.length,
  });
}
