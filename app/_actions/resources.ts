"use server";

import { supabaseServerAuth } from "../_lib/supabase-server";

export type ResourceItem = {
  id: string;
  title: string;
  description: string | null;
  path: string;
  file_name: string;
  file_type: string | null;
  file_size: number | null;
  created_at: string;
};

export type ResourceInput = {
  title: string;
  description?: string;
  path: string;
  fileName: string;
  fileType?: string;
  fileSize?: number;
};

/** 자료실 목록 (관리자 전용) */
export async function getResources(): Promise<ResourceItem[]> {
  const supabase = await supabaseServerAuth();
  const { data, error } = await supabase
    .from("resources")
    .select("id, title, description, path, file_name, file_type, file_size, created_at")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

/** 자료 메타 등록 (파일은 브라우저에서 이미 업로드됨 → path만 저장) */
export async function createResource(input: ResourceInput) {
  const supabase = await supabaseServerAuth();
  const { data, error } = await supabase
    .from("resources")
    .insert({
      title: input.title || input.fileName,
      description: input.description || null,
      path: input.path,
      file_name: input.fileName,
      file_type: input.fileType || null,
      file_size: input.fileSize ?? null,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data;
}

/** 자료 삭제 (스토리지 파일 + 테이블 행) */
export async function deleteResource(id: string, path: string) {
  const supabase = await supabaseServerAuth();
  await supabase.storage.from("resources").remove([path]); // 실패해도 행 삭제는 진행
  const { error } = await supabase.from("resources").delete().eq("id", id);
  if (error) throw new Error(error.message);
  return { id };
}
