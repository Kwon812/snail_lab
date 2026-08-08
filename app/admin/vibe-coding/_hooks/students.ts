"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteVibeStudent,
  getVibeStudents,
  registerVibeStudent,
  resetVibeStudent,
  type VibeStudentInput,
} from "../_actions/students";

/** 관리자 전용 수강생 목록. */
export function useVibeStudents() {
  return useQuery({ queryKey: ["vibe-students"], queryFn: () => getVibeStudents() });
}

/** 수강생 사전 등록 — 성공 시 목록 캐시를 무효화. */
export function useRegisterVibeStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: VibeStudentInput) => registerVibeStudent(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["vibe-students"] }),
  });
}

/** 등록 정보 삭제 — 성공 시 목록 캐시를 무효화. */
export function useDeleteVibeStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteVibeStudent(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["vibe-students"] }),
  });
}

/** 재발급 허용(기존 프로젝트 archive + 상태 초기화) — 성공 시 목록 캐시를 무효화. */
export function useResetVibeStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => resetVibeStudent(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["vibe-students"] }),
  });
}
