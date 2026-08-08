import { NextRequest, NextResponse } from "next/server";
import { supabaseServerAuth } from "../../../../../_lib/supabase-server";
import { getAccessTokenFromRefreshToken, getFormQuestions, listFormResponses } from "../../../../../_lib/google-forms";

export const dynamic = "force-dynamic";

/**
 * 응답을 엑셀(Excel)에서 바로 열리는 CSV로 내보낸다. xlsx 같은 바이너리 라이브러리는 안 쓴다 —
 * 응답 텍스트는 익명 방문자가 입력한 신뢰할 수 없는 값이라, 그런 라이브러리의 파싱 관련
 * ReDoS/프로토타입 오염 취약점에 노출시키지 않기 위해 직접 문자열로 CSV를 만든다.
 */
function csvField(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function toCsv(rows: string[][]): string {
  return rows.map((row) => row.map(csvField).join(",")).join("\r\n");
}

function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")} ${String(
    d.getHours(),
  ).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await supabaseServerAuth();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { data: evaluation, error } = await supabase
    .from("course_evaluations")
    .select("title, google_form_id")
    .eq("id", id)
    .maybeSingle();
  if (error || !evaluation) {
    return NextResponse.json({ error: "설문지를 찾을 수 없습니다." }, { status: 404 });
  }

  const { data: connection } = await supabase
    .from("google_oauth_connection")
    .select("refresh_token")
    .eq("id", 1)
    .maybeSingle();
  if (!connection) {
    return NextResponse.json({ error: "구글 계정이 연동되어 있지 않습니다." }, { status: 400 });
  }

  let accessToken: string;
  try {
    accessToken = await getAccessTokenFromRefreshToken(connection.refresh_token);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }

  const [questions, responses] = await Promise.all([
    getFormQuestions(accessToken, evaluation.google_form_id),
    listFormResponses(accessToken, evaluation.google_form_id),
  ]);

  const header = ["응답 시각", ...questions.map((q) => q.title || "(제목 없음)")];
  const rows = responses.map((r) => [
    fmtDateTime(r.lastSubmittedTime),
    ...questions.map((q) => r.answers[q.questionId] ?? ""),
  ]);

  // BOM을 붙여야 엑셀이 UTF-8로 인식해서 한글이 깨지지 않는다.
  const csv = String.fromCharCode(0xfeff) + toCsv([header, ...rows]);
  const fileName = `${evaluation.title}-응답`.replace(/[\\/:*?"<>|]/g, "_");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="responses.csv"; filename*=UTF-8''${encodeURIComponent(fileName)}.csv`,
    },
  });
}
