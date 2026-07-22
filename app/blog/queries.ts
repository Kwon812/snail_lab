import "server-only";
import { supabaseServer } from "../_lib/supabase";
import { fmtDate, normalizeSlug, toneFor } from "../_lib/format";

/* ------------------------------------------------------------------ */
/*  Public blog reads (anon key). RLS: only PUBLISHED rows readable.   */
/* ------------------------------------------------------------------ */

export type PublicPostCard = {
  id: string;
  slug: string;
  title: string;
  category: string;
  excerpt: string;
  date: string;
  tags: string[];
  thumbnail: string | null;
  tone: { a: string; b: string };
};

/** Published posts for lists (blog index, home "latest", related). */
export async function getPublishedPosts(limit?: number): Promise<PublicPostCard[]> {
  const supabase = supabaseServer();
  let q = supabase
    .from("posts")
    .select("id, slug, title, category, excerpt, tags, thumbnail, published_at")
    .eq("status", "PUBLISHED")
    .order("published_at", { ascending: false });
  if (limit) q = q.limit(limit);

  const { data, error } = await q;
  // Degrade gracefully (e.g. before the schema is migrated) instead of failing the page/build.
  if (error) {
    console.error("[getPublishedPosts]", error.message);
    return [];
  }

  return (data ?? []).map((p) => ({
    id: p.id,
    slug: p.slug,
    title: p.title,
    category: p.category,
    excerpt: p.excerpt ?? "",
    date: fmtDate(p.published_at),
    tags: p.tags ?? [],
    thumbnail: (p.thumbnail as string) ?? null,
    tone: toneFor(p.slug),
  }));
}

export type PublicPost = PublicPostCard & {
  content: unknown; // Tiptap JSON
  viewCount: number;
};

/** A single published post by slug (blog detail page). */
export async function getPostBySlug(slug: string): Promise<PublicPost | null> {
  const supabase = supabaseServer();
  // Decode + NFC-normalize so a Hangul route param matches the stored slug.
  const { data, error } = await supabase
    .from("posts")
    .select("id, slug, title, category, excerpt, tags, thumbnail, content, view_count, published_at, status")
    .eq("slug", normalizeSlug(slug))
    .maybeSingle();
  if (error) {
    console.error("[getPostBySlug]", error.message);
    return null;
  }
  if (!data || data.status !== "PUBLISHED") return null;

  return {
    id: data.id,
    slug: data.slug,
    title: data.title,
    category: data.category,
    excerpt: data.excerpt ?? "",
    date: fmtDate(data.published_at),
    tags: data.tags ?? [],
    thumbnail: (data.thumbnail as string) ?? null,
    tone: toneFor(data.slug),
    content: data.content,
    viewCount: data.view_count ?? 0,
  };
}
