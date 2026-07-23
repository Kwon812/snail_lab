"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createLecture,
  deleteLecture,
  getLecture,
  getLectures,
  updateLecture,
  type LectureInput,
} from "../_actions/lectures";

/** 관리자 전용 강의 목록 (DRAFT 포함). */
export function useLectures() {
  return useQuery({ queryKey: ["lectures"], queryFn: () => getLectures() });
}

/** id로 단건 조회 — 수정 폼 채우기용. id가 없으면 비활성. */
export function useLecture(id: string | null) {
  return useQuery({
    queryKey: ["lecture", id],
    queryFn: () => getLecture(id!),
    enabled: !!id,
  });
}

/**
 * 새 강의 작성 또는 수정 저장 — editId가 있으면 수정, 없으면 생성. 저장 성공 시 목록·단건 캐시를 무효화.
 * 화면별 후처리(토스트, 이동 등)는 호출부에서 `save.mutate(payload, { onSuccess, onError })`로 붙인다.
 */
export function useSaveLecture(editId: string | null) {
  const qc = useQueryClient();
  const isEdit = !!editId;
  return useMutation({
    mutationFn: (payload: LectureInput) =>
      isEdit ? updateLecture(editId!, payload) : createLecture(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lectures"] });
      if (isEdit) qc.invalidateQueries({ queryKey: ["lecture", editId] });
    },
  });
}

/** 강의 삭제 — 성공 시 목록 캐시를 무효화. */
export function useDeleteLecture() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteLecture(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lectures"] }),
  });
}
