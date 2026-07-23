import "server-only";
import { supabaseServer } from "../../_lib/supabase";

/* ------------------------------------------------------------------ */
/*  Public resource reads (anon key). RLS: only is_public=true rows readable. */
/* ------------------------------------------------------------------ */

export type PublicResourceItem = {
  id: string;
  title: string;
  description: string | null;
  path: string;
  file_name: string;
  file_type: string | null;
  file_size: number | null;
  created_at: string;
};

/** 공개(is_public=true)로 전환된 자료만 — RLS로도 이중 보호됨 */
export async function getPublicResources(): Promise<PublicResourceItem[]> {
  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("resources")
    .select("id, title, description, path, file_name, file_type, file_size, created_at")
    .eq("is_public", true)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[getPublicResources]", error.message);
    return [];
  }
  return data ?? [];
}
