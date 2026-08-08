import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../_lib/supabase-admin";
import { archiveOpenAIProject, getProjectCostUSD } from "../../../_lib/openai-admin";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * 바이브 코딩 예산 감시 — 발급된 프로젝트별 누적 지출이 OPENAI_PROJECT_BUDGET_KRW를 넘으면
 * OpenAI 프로젝트를 archive(키 즉시 무효화)하고 status를 BLOCKED로 바꾼다.
 *
 * OpenAI Admin API엔 프로젝트별 "금액" 한도를 설정하는 엔드포인트가 없어서(대시보드 전용),
 * 이 크론이 Costs API를 주기적으로 조회해 대신 강제한다. Vercel Hobby 플랜은 크론이 하루 1회로
 * 제한되므로, 더 촘촘한 주기가 필요하면 Render Cron Job 등 외부 스케줄러가 이 라우트를
 * `Authorization: Bearer $CRON_SECRET` 헤더로 호출하도록 설정할 것 — 이 라우트 자체는
 * 호출 주체가 Vercel Cron이든 외부 스케줄러든 상관하지 않는다.
 *
 * KRW/USD 변환은 OPENAI_KRW_PER_USD 환경변수의 고정값을 쓴다(실시간 환율 조회 없음) — 환율이
 * 크게 바뀌면 이 값을 갱신해야 한다. 두 환경변수 중 하나라도 비어 있으면 감시를 건너뛴다
 * (기본값이 없으면 의도치 않게 아무 프로젝트나 차단하는 사고를 막기 위함).
 */
export async function GET(request: NextRequest) {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json({ error: "CRON_SECRET 미설정" }, { status: 500 });
  }
  if (request.headers.get("authorization") !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const budgetKrw = Number(process.env.OPENAI_PROJECT_BUDGET_KRW);
  const krwPerUsd = Number(process.env.OPENAI_KRW_PER_USD);
  if (!budgetKrw || !krwPerUsd) {
    return NextResponse.json({ ok: true, skipped: "OPENAI_PROJECT_BUDGET_KRW/OPENAI_KRW_PER_USD 미설정" });
  }
  const budgetUsd = budgetKrw / krwPerUsd;

  const supabase = supabaseAdmin();
  const { data: students, error } = await supabase
    .from("vibe_students")
    .select("id, name, openai_project_id, issued_at")
    .eq("status", "ISSUED")
    .not("openai_project_id", "is", null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const blocked: string[] = [];
  const passed: { name: string; costUsd: number }[] = [];
  const failed: { name: string; error: string }[] = [];

  for (const student of students ?? []) {
    // issued_at은 issue 라우트가 status를 ISSUED로 바꾸는 순간 항상 같이 채우므로 null일 수 없다.
    const sinceUnixSeconds = Math.floor(new Date(student.issued_at!).getTime() / 1000);
    try {
      const costUsd = await getProjectCostUSD(student.openai_project_id!, sinceUnixSeconds);
      if (costUsd < budgetUsd) {
        passed.push({ name: student.name, costUsd });
        continue;
      }

      // archive가 실패하면 여기서 던져서 catch로 빠진다 — DB를 BLOCKED로 바꾸지 않고
      // status를 ISSUED로 남겨둬서 다음 주기에 다시 시도하게 한다. archive 성공을 확인하기
      // 전엔 절대 BLOCKED로 표시하지 않는다(그렇지 않으면 실제로는 살아있는 프로젝트를
      // "차단됨"으로 잘못 보여주게 된다).
      await archiveOpenAIProject(student.openai_project_id!);
      const { error: updateError } = await supabase
        .from("vibe_students")
        .update({ status: "BLOCKED", budget_blocked_at: new Date().toISOString() })
        .eq("id", student.id)
        .eq("status", "ISSUED"); // 그 사이 관리자가 이미 재발급 허용했다면 덮어쓰지 않는다.
      if (updateError) throw new Error(updateError.message);
      blocked.push(student.name);
    } catch (err) {
      // 실패 이유를 그대로 응답에 남긴다 — Render 로그만 보고도 원인을 바로 알 수 있게.
      failed.push({ name: student.name, error: (err as Error).message });
    }
  }

  return NextResponse.json({
    ok: true,
    checked: students?.length ?? 0,
    blocked,
    passed,
    failed,
  });
}
