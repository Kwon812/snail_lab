"use server";

import { revalidatePath } from "next/cache";
import { supabaseServerAuth } from "../_lib/supabase-server";

export type PostInput = {
  title: string;
  excerpt?: string;
  category: string;
  tags: string[];
  thumbnail?: string | null;
  status: "DRAFT" | "PUBLISHED";
  content: unknown; // Tiptap JSON document
};

export type PostListItem = {
  id: string;
  title: string;
  slug: string;
  category: string;
  status: string;
  created_at: string;
};

/** Turn a (possibly Korean) title into a URL-safe slug, always non-empty.
 *  NFC-normalized so Hangul slugs match consistently across storage/URL. */
function slugify(title: string): string {
  const base = title
    .normalize("NFC")
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-") // keep letters/numbers (incl. Hangul), collapse the rest
    .replace(/^-+|-+$/g, "");
  return (base || `post-${Date.now().toString(36)}`).normalize("NFC");
}

async function uniqueSlug(title: string): Promise<string> {
  const supabase = await supabaseServerAuth();
  const base = slugify(title);
  let slug = base;
  let n = 1;
  // Append a counter until the slug is free.
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data, error } = await supabase
      .from("posts")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return slug;
    slug = `${base}-${++n}`;
  }
}

export async function createPost(input: PostInput) {
  const supabase = await supabaseServerAuth();
  const slug = await uniqueSlug(input.title || "무제");

  const { data, error } = await supabase
    .from("posts")
    .insert({
      title: input.title || "무제",
      slug,
      excerpt: input.excerpt || null,
      category: input.category,
      tags: input.tags,
      thumbnail: input.thumbnail || null,
      status: input.status,
      content: input.content,
      published_at: input.status === "PUBLISHED" ? new Date().toISOString() : null,
    })
    .select("id, slug")
    .single();

  if (error) throw new Error(error.message);

  if (input.status === "PUBLISHED") {
    revalidatePath("/blog");
    revalidatePath(`/blog/${slug}`);
  }

  return data;
}

// 관리자 전용: DRAFT 포함 전체 목록 (세션 필요). 공개 목록은 blog/queries.ts.
export async function getPosts(): Promise<PostListItem[]> {
  const supabase = await supabaseServerAuth();
  const { data, error } = await supabase
    .from("posts")
    .select("id, title, slug, category, status, created_at")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export type PostDetail = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  category: string;
  tags: string[];
  thumbnail: string | null;
  status: "DRAFT" | "PUBLISHED";
  content: unknown;
};

// 관리자 전용: id로 단건 조회 (수정 폼 채우기용). 공개 상세는 blog/queries.ts의 getPostBySlug.
export async function getPost(id: string): Promise<PostDetail | null> {
  const supabase = await supabaseServerAuth();
  const { data, error } = await supabase
    .from("posts")
    .select("id, title, slug, excerpt, category, tags, thumbnail, status, content")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as PostDetail) ?? null;
}

export async function updatePost(id: string, input: PostInput) {
  const supabase = await supabaseServerAuth();

  // Keep the existing slug/published_at; only stamp published_at when it first goes live.
  const { data: current, error: readErr } = await supabase
    .from("posts")
    .select("slug, published_at")
    .eq("id", id)
    .single();
  if (readErr) throw new Error(readErr.message);

  console.log(input.content)
  const { data, error } = await supabase
    .from("posts")
    .update({
      title: input.title || "무제",
      excerpt: input.excerpt || null,
      category: input.category,
      tags: input.tags,
      thumbnail: input.thumbnail || null,
      status: input.status,
      content: input.content,
      published_at:
        input.status === "PUBLISHED"
          ? current.published_at ?? new Date().toISOString()
          : null,
    })
    .eq("id", id)
    .select("id, slug")
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/blog");
  revalidatePath(`/blog/${current.slug}`);
  return data;
}

export async function deletePost(id: string) {
  const supabase = await supabaseServerAuth();
  const { data: current } = await supabase
    .from("posts")
    .select("slug")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase.from("posts").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/blog");
  if (current?.slug) revalidatePath(`/blog/${current.slug}`);
  return { id };
}
