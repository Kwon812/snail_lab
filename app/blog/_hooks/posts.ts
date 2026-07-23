"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createPost, deletePost, getPost, getPosts, updatePost, type PostInput } from "../_actions/posts";

/** 관리자 전용 글 목록 (DRAFT 포함). */
export function usePosts() {
  return useQuery({ queryKey: ["posts"], queryFn: () => getPosts() });
}

/** id로 단건 조회 — 수정 폼 채우기용. id가 없으면 비활성. */
export function usePost(id: string | null) {
  return useQuery({
    queryKey: ["post", id],
    queryFn: () => getPost(id!),
    enabled: !!id,
  });
}

/**
 * 새 글 작성 또는 수정 저장 — editId가 있으면 수정, 없으면 생성. 저장 성공 시 목록·단건 캐시를 무효화.
 * 화면별 후처리(토스트, 이동 등)는 호출부에서 `save.mutate(payload, { onSuccess, onError })`로 붙인다.
 */
export function useSavePost(editId: string | null) {
  const qc = useQueryClient();
  const isEdit = !!editId;
  return useMutation({
    mutationFn: (payload: PostInput) => (isEdit ? updatePost(editId!, payload) : createPost(payload)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["posts"] });
      if (isEdit) qc.invalidateQueries({ queryKey: ["post", editId] });
    },
  });
}

/** 글 삭제 — 성공 시 목록 캐시를 무효화. */
export function useDeletePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deletePost(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["posts"] }),
  });
}
