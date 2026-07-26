import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../_lib/supabase-admin";

export const dynamic = "force-dynamic";

const EXPO_PUSH_ENDPOINT = "https://exp.host/--/api/v2/push/send";
const CHUNK_SIZE = 100;

/**
 * Supabase Database Webhook이 schedules insert/update 때마다 호출.
 * 등록된 기기들에 "조용한"(화면에 안 뜨는) 데이터 전용 푸시를 보내 백그라운드 태스크를 깨운다 —
 * 실제 알람 표시는 기기의 로컬 알림이 담당하고, 이 푸시는 순수 재동기화 신호일 뿐이다.
 */
export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-webhook-secret");
  if (secret !== process.env.SCHEDULE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = supabaseAdmin();
  const { data: tokens, error } = await supabase.from("expo_push_tokens").select("token");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!tokens || tokens.length === 0) return NextResponse.json({ sent: 0 });

  const messages = tokens.map((t) => ({
    to: t.token,
    data: { type: "schedules-changed" },
    priority: "high" as const,
    _contentAvailable: true,
  }));

  let sent = 0;
  const tickets: unknown[] = [];
  for (let i = 0; i < messages.length; i += CHUNK_SIZE) {
    const chunk = messages.slice(i, i + CHUNK_SIZE);
    const res = await fetch(EXPO_PUSH_ENDPOINT, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(chunk),
    });
    const json = await res.json().catch(() => null);
    tickets.push(json);
    // Expo가 HTTP 200을 줘도 메시지별로 개별 에러(DeviceNotRegistered, 자격증명 오류 등)를
    // data 배열 안에 담아서 보낸다 — res.ok만으로는 실제 발송 성공 여부를 알 수 없다.
    const items: Array<{ status?: string }> = json?.data ?? [];
    sent += items.filter((it) => it.status === "ok").length;
  }

  return NextResponse.json({ sent, tokens: tokens.length, tickets });
}
