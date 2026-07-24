"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createSchedule,
  deleteSchedule,
  getSchedules,
  importLegacyCalendar,
  updateSchedule,
  type ScheduleInput,
  type ScheduleItem,
} from "../_actions/schedules";

/** 특정 연-월(from~to, YYYY-MM-DD) 범위의 일정. */
export function useSchedules(range: { from: string; to: string }) {
  return useQuery({
    queryKey: ["schedules", range.from, range.to],
    queryFn: () => getSchedules(range),
  });
}

function useInvalidateSchedules() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["schedules"] });
}

export function useCreateSchedule() {
  const invalidate = useInvalidateSchedules();
  return useMutation({
    mutationFn: (input: ScheduleInput) => createSchedule(input),
    onSuccess: invalidate,
  });
}

export function useUpdateSchedule() {
  const invalidate = useInvalidateSchedules();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ScheduleInput }) => updateSchedule(id, input),
    onSuccess: invalidate,
  });
}

export function useDeleteSchedule() {
  const invalidate = useInvalidateSchedules();
  return useMutation({
    mutationFn: (s: ScheduleItem) => deleteSchedule(s.id),
    onSuccess: invalidate,
  });
}

/** 레거시 텍스트 백업 1회성 가져오기. */
export function useImportLegacyCalendar() {
  const invalidate = useInvalidateSchedules();
  return useMutation({
    mutationFn: () => importLegacyCalendar(),
    onSuccess: invalidate,
  });
}
