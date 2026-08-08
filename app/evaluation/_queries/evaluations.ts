import "server-only";
import { supabaseServer } from "../../_lib/supabase";

/* ------------------------------------------------------------------ */
/*  Public course_evaluations reads (anon key). RLS: status=PUBLISHED만. */
/* ------------------------------------------------------------------ */

export type PublicCourseEvaluation = {
  id: string;
  lecture_id: string | null;
  lecture_title: string | null;
  title: string;
  description: string | null;
  form_url: string;
  created_at: string;
};

/** 강의평가 탭에 노출할 공개(PUBLISHED) 설문지 목록. */
export async function getPublishedCourseEvaluations(): Promise<PublicCourseEvaluation[]> {
  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("course_evaluations")
    .select("id, lecture_id, title, description, form_url, created_at, lectures(title)")
    .eq("status", "PUBLISHED")
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[getPublishedCourseEvaluations]", error.message);
    return [];
  }
  return (data ?? []).map((row) => ({
    id: row.id,
    lecture_id: row.lecture_id,
    lecture_title: (row.lectures as unknown as { title: string } | null)?.title ?? null,
    title: row.title,
    description: row.description,
    form_url: row.form_url,
    created_at: row.created_at,
  }));
}
