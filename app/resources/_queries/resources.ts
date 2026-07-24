import "server-only";
import { supabaseServer } from "../../_lib/supabase";

/* ------------------------------------------------------------------ */
/*  Public resource reads (anon key). 목록은 전체 공개, 다운로드만 is_public 기준. */
/*  (storage.objects RLS의 "resources bucket public read" 정책이 실제 다운로드를 막는다) */
/* ------------------------------------------------------------------ */

export type PublicResourceItem = {
  id: string;
  title: string;
  description: string | null;
  path: string;
  file_name: string;
  file_type: string | null;
  file_size: number | null;
  is_public: boolean;
  created_at: string;
};

/** 자료실 전체 목록 — 다운로드 가능 여부는 각 항목의 is_public으로 화면에서 구분한다 */
export async function getPublicResources(): Promise<PublicResourceItem[]> {
  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("resources")
    .select("id, title, description, path, file_name, file_type, file_size, is_public, created_at")
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[getPublicResources]", error.message);
    return [];
  }
  return data ?? [];
}
