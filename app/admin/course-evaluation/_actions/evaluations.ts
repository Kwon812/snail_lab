"use server";

import { revalidatePath } from "next/cache";
import { supabaseServerAuth } from "../../../_lib/supabase-server";
import {
  createGoogleForm,
  getAccessTokenFromRefreshToken,
  listFormResponses,
  trashGoogleForm,
  type SurveyQuestion,
} from "../../../_lib/google-forms";

export type { SurveyQuestion, SurveyQuestionType } from "../../../_lib/google-forms";

export type GoogleConnection = {
  connected: boolean;
  email: string | null;
};

/** 구글 연동 상태 — /admin/course-evaluation 상단 배너에 쓴다. */
export async function getGoogleConnection(): Promise<GoogleConnection> {
  const supabase = await supabaseServerAuth();
  const { data, error } = await supabase
    .from("google_oauth_connection")
    .select("email")
    .eq("id", 1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return { connected: !!data, email: data?.email ?? null };
}

/** 연동 해제 — 이후 설문지 생성 전엔 다시 연동해야 한다. */
export async function disconnectGoogle() {
  const supabase = await supabaseServerAuth();
  const { error } = await supabase.from("google_oauth_connection").delete().eq("id", 1);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/course-evaluation");
}

export type CourseEvaluationInput = {
  lectureId: string | null;
  title: string;
  description?: string;
  questions: SurveyQuestion[];
};

export type CourseEvaluationItem = {
  id: string;
  lecture_id: string | null;
  lecture_title: string | null;
  title: string;
  description: string | null;
  questions: SurveyQuestion[];
  google_form_id: string;
  form_url: string;
  edit_url: string;
  status: "PUBLISHED" | "CLOSED";
  created_at: string;
};

async function requireRefreshToken(): Promise<string> {
  const supabase = await supabaseServerAuth();
  const { data, error } = await supabase
    .from("google_oauth_connection")
    .select("refresh_token")
    .eq("id", 1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) {
    throw new Error("먼저 구글 계정을 연동해 주세요.");
  }
  return data.refresh_token as string;
}

/** 설문 문항으로 실제 구글 폼을 만들고, 그 결과(formId·링크)를 course_evaluations에 저장한다. */
export async function createCourseEvaluation(input: CourseEvaluationInput) {
  if (!input.title.trim()) throw new Error("설문지 제목을 입력해 주세요.");
  if (input.questions.length === 0) throw new Error("문항을 하나 이상 추가해 주세요.");

  const refreshToken = await requireRefreshToken();
  const accessToken = await getAccessTokenFromRefreshToken(refreshToken);
  const form = await createGoogleForm(accessToken, {
    title: input.title,
    description: input.description,
    questions: input.questions,
  });

  const supabase = await supabaseServerAuth();
  const { data, error } = await supabase
    .from("course_evaluations")
    .insert({
      lecture_id: input.lectureId,
      title: input.title,
      description: input.description || null,
      questions: input.questions,
      google_form_id: form.formId,
      form_url: form.responderUri,
      edit_url: form.editUri,
    })
    .select("id")
    .single();

  if (error) {
    // 폼은 이미 만들어졌는데 DB 저장에 실패한 경우 — 고아 폼이 남지만, 관리자가 구글 드라이브에서
    // 직접 지울 수 있으니 여기선 저장 실패만 알린다(폼 생성 자체를 되돌리진 않음).
    throw new Error(`설문지는 구글에 생성됐지만 목록 저장에 실패했습니다: ${error.message}`);
  }

  revalidatePath("/admin/course-evaluation");
  revalidatePath("/evaluation");
  return { id: data.id, formUrl: form.responderUri, editUrl: form.editUri };
}

/** 관리자 목록 — 상태 무관 전체. */
export async function getCourseEvaluations(): Promise<CourseEvaluationItem[]> {
  const supabase = await supabaseServerAuth();
  const { data, error } = await supabase
    .from("course_evaluations")
    .select(
      "id, lecture_id, title, description, questions, google_form_id, form_url, edit_url, status, created_at, lectures(title)",
    )
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    id: row.id,
    lecture_id: row.lecture_id,
    lecture_title: (row.lectures as unknown as { title: string } | null)?.title ?? null,
    title: row.title,
    description: row.description,
    questions: (row.questions as SurveyQuestion[]) ?? [],
    google_form_id: row.google_form_id,
    form_url: row.form_url,
    edit_url: row.edit_url,
    status: row.status,
    created_at: row.created_at,
  }));
}

/** PUBLISHED ↔ CLOSED 전환 — /evaluation 공개 노출 여부만 바꾼다(구글 폼 자체는 그대로 둠). */
export async function toggleCourseEvaluationStatus(id: string, status: "PUBLISHED" | "CLOSED") {
  const supabase = await supabaseServerAuth();
  const { error } = await supabase.from("course_evaluations").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/course-evaluation");
  revalidatePath("/evaluation");
  return { id, status };
}

/** 목록에서 삭제 — 구글 폼도 휴지통으로 이동을 시도한다(best-effort, 실패해도 목록 삭제는 진행). */
export async function deleteCourseEvaluation(id: string, googleFormId: string) {
  try {
    const refreshToken = await requireRefreshToken();
    const accessToken = await getAccessTokenFromRefreshToken(refreshToken);
    await trashGoogleForm(accessToken, googleFormId);
  } catch {
    // 연동이 끊겼거나 이미 지워진 폼이어도 목록 행 삭제는 계속 진행한다.
  }

  const supabase = await supabaseServerAuth();
  const { error } = await supabase.from("course_evaluations").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/course-evaluation");
  revalidatePath("/evaluation");
  return { id };
}

/** 응답 수 — 목록의 각 행에서 개별 조회한다(구글 폼 API를 직접 호출하므로 지연 로딩). */
export async function getCourseEvaluationResponseCount(googleFormId: string): Promise<number> {
  const refreshToken = await requireRefreshToken();
  const accessToken = await getAccessTokenFromRefreshToken(refreshToken);
  const responses = await listFormResponses(accessToken, googleFormId);
  return responses.length;
}
