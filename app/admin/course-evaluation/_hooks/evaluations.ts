"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createCourseEvaluation,
  deleteCourseEvaluation,
  disconnectGoogle,
  getCourseEvaluationResponseCount,
  getCourseEvaluations,
  getGoogleConnection,
  toggleCourseEvaluationStatus,
  type CourseEvaluationInput,
  type CourseEvaluationItem,
} from "../_actions/evaluations";

/** 구글 계정 연동 상태. */
export function useGoogleConnection() {
  return useQuery({ queryKey: ["google-connection"], queryFn: () => getGoogleConnection() });
}

export function useDisconnectGoogle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => disconnectGoogle(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["google-connection"] }),
  });
}

/** 강의평가 설문지 목록(관리자 전용, 전체 상태). */
export function useCourseEvaluations() {
  return useQuery({ queryKey: ["course-evaluations"], queryFn: () => getCourseEvaluations() });
}

/** 문항으로 구글 폼을 생성하고 목록에 저장 — 성공 시 목록 캐시를 무효화. */
export function useCreateCourseEvaluation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CourseEvaluationInput) => createCourseEvaluation(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["course-evaluations"] }),
  });
}

export function useToggleCourseEvaluationStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (item: CourseEvaluationItem) =>
      toggleCourseEvaluationStatus(item.id, item.status === "PUBLISHED" ? "CLOSED" : "PUBLISHED"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["course-evaluations"] }),
  });
}

export function useDeleteCourseEvaluation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (item: CourseEvaluationItem) => deleteCourseEvaluation(item.id, item.google_form_id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["course-evaluations"] }),
  });
}

/** 응답 수 — 행마다 지연 로딩(구글 API 호출이라 목록 전체 로딩을 막지 않도록 분리). */
export function useCourseEvaluationResponseCount(googleFormId: string) {
  return useQuery({
    queryKey: ["course-evaluation-response-count", googleFormId],
    queryFn: () => getCourseEvaluationResponseCount(googleFormId),
    staleTime: 30_000,
  });
}
