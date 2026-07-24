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
  const qc = useQueryClient();
  const invalidate = useInvalidateSchedules();
  return useMutation({
    mutationFn: (input: ScheduleInput) => createSchedule(input),
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: ["schedules"] });
      const previous = qc.getQueriesData<ScheduleItem[]>({ queryKey: ["schedules"] });

      const optimisticItem: ScheduleItem = {
        id: `optimistic-${Date.now()}`,
        date: input.date,
        title: input.title,
        memo: input.memo || null,
        remind_at: input.remindAt ?? null,
        created_at: new Date().toISOString(),
      };

      // 이 날짜가 실제로 포함된 range 캐시에만 낙관적으로 끼워 넣는다.
      for (const [key] of previous) {
        const [, from, to] = key as [string, string, string];
        if (input.date < from || input.date > to) continue;
        qc.setQueryData<ScheduleItem[]>(key, (old) =>
          old ? [...old, optimisticItem].sort((a, b) => a.date.localeCompare(b.date)) : old,
        );
      }

      return { previous };
    },
    onError: (_err, _input, context) => {
      context?.previous.forEach(([key, data]) => qc.setQueryData(key, data));
    },
    onSettled: invalidate,
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
