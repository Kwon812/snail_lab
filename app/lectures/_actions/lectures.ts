"use server";

import { revalidatePath } from "next/cache";
import { supabaseServerAuth } from "../../_lib/supabase-server";

export type LectureInput = {
  field: string; // 분야 slug: media-literacy | picture-book | child-psychology
  title: string;
  level: string;
  mode: string;
  target: string;
  intro: string;
  thumbnail: string | null;
  tone: { a: string; b: string };
  curriculum: string[];
  status: "DRAFT" | "PUBLISHED";
};

export type LectureListItem = {
  id: string;
  title: string;
  slug: string;
  field: string;
  status: string;
  created_at: string;
};

function slugify(title: string): string {
  const base = title
    .normalize("NFC")
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
  return (base || `lecture-${Date.now().toString(36)}`).normalize("NFC");
}

async function uniqueSlug(title: string): Promise<string> {
  const supabase = await supabaseServerAuth();
  const base = slugify(title);
  let slug = base;
  let n = 1;
  while (true) {
    const { data, error } = await supabase
      .from("lectures")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return slug;
    slug = `${base}-${++n}`;
  }
}

export async function createLecture(input: LectureInput) {
  const supabase = await supabaseServerAuth();
  const slug = await uniqueSlug(input.title || "무제 강의");

  const { data, error } = await supabase
    .from("lectures")
    .insert({
      field: input.field,
      title: input.title || "무제 강의",
      slug,
      level: input.level || null,
      mode: input.mode || null,
      target: input.target || null,
      intro: input.intro || null,
      thumbnail: input.thumbnail || null,
      tone: input.tone,
      curriculum: input.curriculum,
      status: input.status,
    })
    .select("id, slug")
    .single();

  if (error) throw new Error(error.message);

  if (input.status === "PUBLISHED") {
    revalidatePath("/lectures");
  }

  return data;
}

// 관리자 전용: DRAFT 포함 전체 목록 (세션 필요). 공개 목록은 lectures/_queries/lectures.ts.
export async function getLectures(): Promise<LectureListItem[]> {
  const supabase = await supabaseServerAuth();
  const { data, error } = await supabase
    .from("lectures")
    .select("id, title, slug, field, status, created_at")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export type LectureDetail = {
  id: string;
  field: string;
  title: string;
  slug: string;
  level: string | null;
  mode: string | null;
  target: string | null;
  intro: string | null;
  thumbnail: string | null;
  tone: { a: string; b: string } | null;
  curriculum: string[];
  status: "DRAFT" | "PUBLISHED";
};

// 관리자 전용: id로 단건 조회 (수정 폼 채우기용). 공개 목록은 lectures/_queries/lectures.ts의 getPublishedLectures.
export async function getLecture(id: string): Promise<LectureDetail | null> {
  const supabase = await supabaseServerAuth();
  const { data, error } = await supabase
    .from("lectures")
    .select("id, field, title, slug, level, mode, target, intro, thumbnail, tone, curriculum, status")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as LectureDetail) ?? null;
}

export async function updateLecture(id: string, input: LectureInput) {
  const supabase = await supabaseServerAuth();
  const { data, error } = await supabase
    .from("lectures")
    .update({
      field: input.field,
      title: input.title || "무제 강의",
      level: input.level || null,
      mode: input.mode || null,
      target: input.target || null,
      intro: input.intro || null,
      thumbnail: input.thumbnail || null,
      tone: input.tone,
      curriculum: input.curriculum,
      status: input.status,
    })
    .eq("id", id)
    .select("id, slug")
    .single();

  if (error) throw new Error(error.message);
  revalidatePath("/lectures");
  return data;
}

export async function deleteLecture(id: string) {
  const supabase = await supabaseServerAuth();
  const { error } = await supabase.from("lectures").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/lectures");
  return { id };
}
