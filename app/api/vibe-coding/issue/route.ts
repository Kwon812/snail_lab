import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "../../../_lib/supabase-admin";
import {
  archiveOpenAIProject,
  applyProjectModelPermissions,
  applyProjectRateLimits,
  createOpenAIProject,
  createProjectServiceAccount,
} from "../../../_lib/openai-admin";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * 수강생 본인인증 → OpenAI API 키 발급.
 *
 * 로그인 세션이 없는 일반 방문자가 호출하므로 supabaseAdmin()(service_role)으로 RLS를
 * 우회해서 조회한다 — vibe_students 테이블엔 anon 정책이 아예 없어서(기본 거부) anon 키로는
 * 이 조회 자체가 불가능하다. 이름·전화번호·과정명이 관리자가 등록해 둔 값과 정확히 일치해야만
 * 다음 단계로 진행된다.
 *
 * 순서: ① 대조 ② 이미 발급됐으면 거절 ③ Project 생성 ④ 요청 속도 상한 + 모델 허용목록
 *      적용(둘 다 best-effort) ⑤ Service Account(=API 키) 생성 ⑥ DB에 상태 반영(동시 요청
 *      이중 발급 방지) ⑦ 키를 응답으로 1회만 반환 — 이 값은 서버 어디에도 저장하지 않는다.
 */

const BodySchema = z.object({
  name: z.string().trim().min(1).max(80),
  phone: z.string().trim().min(9).max(20),
  courseId: z.string().trim().min(1).max(120),
});

function normalizePhone(raw: string): string {
  return raw.replace(/\D/g, "");
}

export async function POST(request: NextRequest) {
  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "입력값을 확인해 주세요." }, { status: 400 });
  }
  const name = parsed.data.name.normalize("NFC");
  const phone = normalizePhone(parsed.data.phone);
  const courseId = parsed.data.courseId.normalize("NFC");

  const supabase = supabaseAdmin();
  const { data: student, error } = await supabase
    .from("vibe_students")
    .select("id, status")
    .eq("name", name)
    .eq("phone", phone)
    .eq("course_id", courseId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!student) {
    return NextResponse.json(
      { error: "등록된 수강생 정보를 찾을 수 없습니다. 이름·전화번호·과정명을 다시 확인해 주세요." },
      { status: 404 },
    );
  }
  if (student.status === "ISSUED") {
    return NextResponse.json(
      { error: "이미 API 키가 발급되었습니다. 키를 분실했다면 담당 강사에게 재발급을 요청해 주세요." },
      { status: 409 },
    );
  }
  if (student.status === "BLOCKED") {
    return NextResponse.json(
      { error: "사용량 예산 초과로 이용이 제한되었습니다. 담당 강사에게 재발급을 요청해 주세요." },
      { status: 403 },
    );
  }

  let project;
  try {
    project = await createOpenAIProject(`vibe-coding · ${name} · ${courseId}`.slice(0, 120));
  } catch (err) {
    return NextResponse.json({ error: `프로젝트 생성 실패: ${(err as Error).message}` }, { status: 502 });
  }

  try {
    await applyProjectRateLimits(project.id);
  } catch {
    // 사용량 상한 적용은 best-effort — 실패해도 키 발급 자체는 계속 진행한다.
  }
  try {
    await applyProjectModelPermissions(project.id);
  } catch {
    // 모델 제한도 best-effort — 조직 등급에 따라 미지원일 수 있어 실패해도 발급을 막지 않는다.
  }

  let serviceAccount;
  try {
    serviceAccount = await createProjectServiceAccount(project.id, "student");
  } catch (err) {
    await archiveOpenAIProject(project.id).catch(() => {});
    return NextResponse.json({ error: `API 키 생성 실패: ${(err as Error).message}` }, { status: 502 });
  }

  // status=PENDING 조건부 업데이트로 동시 요청 이중 발급을 막는다 — 갱신된 행이 없으면
  // 그 사이 다른 요청이 먼저 발급을 마쳤다는 뜻이므로, 방금 만든 프로젝트는 폐기한다.
  const { data: updated, error: updateError } = await supabase
    .from("vibe_students")
    .update({
      status: "ISSUED",
      openai_project_id: project.id,
      openai_service_account_id: serviceAccount.id,
      openai_api_key_id: serviceAccount.api_key.id,
      issued_at: new Date().toISOString(),
    })
    .eq("id", student.id)
    .eq("status", "PENDING")
    .select("id");

  if (updateError) {
    await archiveOpenAIProject(project.id).catch(() => {});
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }
  if (!updated || updated.length === 0) {
    await archiveOpenAIProject(project.id).catch(() => {});
    return NextResponse.json(
      { error: "이미 다른 요청으로 발급이 진행되었습니다. 잠시 후 다시 확인해 주세요." },
      { status: 409 },
    );
  }

  return NextResponse.json({
    apiKey: serviceAccount.api_key.value,
    projectId: project.id,
    projectName: project.name,
  });
}
