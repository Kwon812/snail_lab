import "server-only";
import { supabaseServer } from "../_lib/supabase";
import { toneFor } from "../_lib/format";

/* ------------------------------------------------------------------ */
/*  Public lecture reads (anon key). RLS: only PUBLISHED rows readable. */
/* ------------------------------------------------------------------ */

export type PublicLecture = {
  id: string;
  slug: string;
  field: string;
  title: string;
  level: string;
  mode: string;
  target: string;
  intro: string;
  thumbnail: string | null;
  curriculum: string[];
  tone: { a: string; b: string };
};

/** Published lectures for the /lectures page. */
export async function getPublishedLectures(): Promise<PublicLecture[]> {
  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("lectures")
    .select("id, slug, field, title, level, mode, target, intro, thumbnail, curriculum, tone, created_at")
    .eq("status", "PUBLISHED")
    .order("order", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[getPublishedLectures]", error.message);
    return [];
  }

  return (data ?? []).map((l) => ({
    id: l.id,
    slug: l.slug,
    field: l.field,
    title: l.title,
    level: l.level ?? "",
    mode: l.mode ?? "",
    target: l.target ?? "",
    intro: l.intro ?? "",
    thumbnail: (l.thumbnail as string) ?? null,
    curriculum: (l.curriculum as string[]) ?? [],
    tone: (l.tone as { a: string; b: string }) ?? toneFor(l.slug),
  }));
}
