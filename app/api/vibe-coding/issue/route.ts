import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "../../../_lib/supabase-admin";
import {
  archiveOpenAIProject,
  applyProjectModelPermissions,
  applyProjectRateLimits,
  createOpenAIProject,
  createProjectServiceAccount,
  revokeOpenAIAccess,
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
 * 순서: ① 대조 ② 이미 발급됐거나 처리 중이면 거절 ③ status=PENDING → ISSUING 원자적 클레임
 *      (동시 요청 중 단 하나만 성공 — 진 요청은 OpenAI를 아예 호출하지 않고 바로 끝난다)
 *      ④ Project 생성 ⑤ 요청 속도 상한 + 모델 허용목록 적용(best-effort) ⑥ Service
 *      Account(=API 키) 생성 ⑦ status=ISSUED로 확정 ⑧ 키를 응답으로 1회만 반환 — 이 값은
 *      서버 어디에도 저장하지 않는다. ③~⑦ 사이 실패하면 항상 status를 PENDING으로 되돌려
 *      재시도 가능하게 한다(예외로 죽어서 되돌리기 자체가 못 도는 경우엔 ISSUING에 멈춰 있을
 *      수 있는데, 이때는 관리자가 /admin/vibe-coding에서 초기화하면 된다).
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
  if (student.status === "ISSUING") {
    return NextResponse.json(
      { error: "다른 요청으로 발급이 진행 중입니다. 잠시 후 다시 시도해 주세요." },
      { status: 409 },
    );
  }

  // 원자적 클레임: status=PENDING인 행만 ISSUING으로 바꾼다. 동시에 여러 요청이 들어와도
  // Postgres 행 잠금 덕분에 단 하나만 성공하고, 진 요청들은 0행 갱신을 받아 여기서 바로
  // 끝난다 — OpenAI 프로젝트를 만들기도 전에 걸러지므로 낭비되는 API 호출 자체가 없다.
  const { data: claimed, error: claimError } = await supabase
    .from("vibe_students")
    .update({ status: "ISSUING" })
    .eq("id", student.id)
    .eq("status", "PENDING")
    .select("id");

  if (claimError) {
    return NextResponse.json({ error: claimError.message }, { status: 500 });
  }
  if (!claimed || claimed.length === 0) {
    return NextResponse.json(
      { error: "다른 요청으로 발급이 진행 중입니다. 잠시 후 다시 시도해 주세요." },
      { status: 409 },
    );
  }

  // 이 지점부터는 이 요청이 유일한 소유자다. 실패하면 반드시 PENDING으로 되돌려 재시도를
  // 허용한다 — 여기서 되돌리기 전에 서버가 통째로 죽는 극단적인 경우만 ISSUING에 멈추고,
  // 그때는 관리자가 /admin/vibe-coding에서 초기화하면 된다.
  let project;
  try {
    project = await createOpenAIProject(`vibe-coding · ${name} · ${courseId}`.slice(0, 120));
  } catch (err) {
    await supabase.from("vibe_students").update({ status: "PENDING" }).eq("id", student.id);
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
    await supabase.from("vibe_students").update({ status: "PENDING" }).eq("id", student.id);
    return NextResponse.json({ error: `API 키 생성 실패: ${(err as Error).message}` }, { status: 502 });
  }

  const { error: finalizeError } = await supabase
    .from("vibe_students")
    .update({
      status: "ISSUED",
      openai_project_id: project.id,
      openai_service_account_id: serviceAccount.id,
      openai_api_key_id: serviceAccount.api_key.id,
      issued_at: new Date().toISOString(),
    })
    .eq("id", student.id);

  if (finalizeError) {
    // 이 시점엔 이미 살아있는 키가 만들어져 있었는데 DB 기록에 실패한 것이므로, 프로젝트만
    // archive하는 게 아니라 service account 자체를 지워서 그 키를 실제로 무효화한다.
    await revokeOpenAIAccess(project.id, serviceAccount.id).catch(() => {});
    return NextResponse.json({ error: finalizeError.message }, { status: 500 });
  }

  return NextResponse.json({
    apiKey: serviceAccount.api_key.value,
    projectId: project.id,
    projectName: project.name,
  });
}
