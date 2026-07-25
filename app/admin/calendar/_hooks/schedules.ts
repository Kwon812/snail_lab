"use client";

import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabaseBrowser } from "../../../_lib/supabase-browser";
import {
  createSchedule,
  createRecurringSchedules,
  deleteSchedule,
  getSchedules,
  importLegacyCalendar,
  updateSchedule,
  type RecurringScheduleInput,
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

// 내가 만든 변경은 뮤테이션 쪽에서 이미 무효화하므로, 그 직후 Realtime이
// 같은 변경을 감지해 또 무효화(중복 요청)하지 않도록 잠깐 억제한다.
let suppressRealtimeUntil = 0;

function useInvalidateSchedules() {
  const qc = useQueryClient();
  return () => {
    suppressRealtimeUntil = Date.now() + 1500;
    qc.invalidateQueries({ queryKey: ["schedules"] });
  };
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
        id: `optimistic-${crypto.randomUUID()}`,
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

/** 반복 일정 — 계산된 날짜 목록만큼 한 번에 생성. */
export function useCreateRecurringSchedules() {
  const invalidate = useInvalidateSchedules();
  return useMutation({
    mutationFn: (input: RecurringScheduleInput) => createRecurringSchedules(input),
    onSuccess: invalidate,
  });
}

export function useUpdateSchedule() {
  const qc = useQueryClient();
  const invalidate = useInvalidateSchedules();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ScheduleInput }) => updateSchedule(id, input),
    onMutate: async ({ id, input }) => {
      await qc.cancelQueries({ queryKey: ["schedules"] });
      const previous = qc.getQueriesData<ScheduleItem[]>({ queryKey: ["schedules"] });

      // 날짜 자체가 바뀔 수 있으니, range별로 "이 범위에 속하면 갱신된 값을 넣고, 아니면(범위를
      // 벗어났으면) 지운다" — 그래야 주간/월간 캐시가 동시에 떠 있어도 양쪽 다 일관되게 반영된다.
      for (const [key, data] of previous) {
        if (!data) continue;
        const [, from, to] = key as [string, string, string];
        const existing = data.find((s) => s.id === id);
        const without = data.filter((s) => s.id !== id);
        if (input.date < from || input.date > to) {
          qc.setQueryData<ScheduleItem[]>(key, without);
          continue;
        }
        const updated: ScheduleItem = {
          id,
          date: input.date,
          title: input.title,
          memo: input.memo || null,
          remind_at: input.remindAt !== undefined ? input.remindAt : (existing?.remind_at ?? null),
          created_at: existing?.created_at ?? new Date().toISOString(),
        };
        qc.setQueryData<ScheduleItem[]>(key, [...without, updated].sort((a, b) => a.date.localeCompare(b.date)));
      }

      return { previous };
    },
    onError: (_err, _input, context) => {
      context?.previous.forEach(([key, data]) => qc.setQueryData(key, data));
    },
    onSettled: invalidate,
  });
}

export function useDeleteSchedule() {
  const qc = useQueryClient();
  const invalidate = useInvalidateSchedules();
  return useMutation({
    mutationFn: (s: ScheduleItem) => deleteSchedule(s.id),
    onMutate: async (s) => {
      await qc.cancelQueries({ queryKey: ["schedules"] });
      const previous = qc.getQueriesData<ScheduleItem[]>({ queryKey: ["schedules"] });

      for (const [key, data] of previous) {
        if (!data) continue;
        qc.setQueryData<ScheduleItem[]>(
          key,
          data.filter((item) => item.id !== s.id),
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

/** 레거시 텍스트 백업 가져오기 — 중복(날짜+제목)은 건너뛰므로 여러 번 눌러도 안전하다. */
export function useImportLegacyCalendar() {
  const invalidate = useInvalidateSchedules();
  return useMutation({
    mutationFn: () => importLegacyCalendar(),
    onSuccess: invalidate,
  });
}

/**
 * schedules 테이블 변경(Realtime)을 구독해 캐시를 무효화한다.
 * 갤럭시 Expo 앱 등 다른 클라이언트에서 만든 변경도 이 페이지에 열려 있는 동안 반영되게 한다.
 * 페이지 컴포넌트 최상단에서 한 번 호출.
 *
 * ⚠️ 토큰을 반드시 채널이 붙기 **전에** 넣어야 한다.
 *
 * RLS가 걸린 테이블은 Realtime 서버가 "이 구독자가 이 행을 select 할 수 있는가"를 확인해서
 * 이벤트를 걸러내는데, 그 판단 기준이 **채널이 join 하는 시점의 토큰**으로 고정된다. 세션은
 * 쿠키에서 비동기로 복원되므로, subscribe()를 먼저 부르면 채널이 익명 상태로 붙어버리고
 * 그 뒤에 setAuth()를 해도 이미 붙은 채널에는 소급 적용되지 않는다.
 * (DELETE는 RLS 필터를 안 타서 익명으로도 오기 때문에 "삭제만 반영"되는 것처럼 보인다.)
 *
 * 구독 상태는 SUBSCRIBED로 멀쩡히 뜨는데 이벤트만 안 오므로 콘솔만 봐서는 알아채기 어렵다 —
 * SUBSCRIBED가 찍히는데도 반영이 안 되면 이 순서부터 의심할 것.
 */
export function useSchedulesRealtime() {
  const invalidate = useInvalidateSchedules();

  useEffect(() => {
    const supabase = supabaseBrowser();
    let timer: ReturnType<typeof setTimeout> | null = null;
    let channel: RealtimeChannel | null = null;
    let cancelled = false;

    const handler = () => {
      if (Date.now() < suppressRealtimeUntil) return; // 방금 내가 스스로 반영한 변경이면 중복 갱신 생략
      if (timer) clearTimeout(timer);
      timer = setTimeout(invalidate, 300);
    };

    async function join() {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;

      await supabase.realtime.setAuth(data.session?.access_token ?? null);
      if (cancelled) return;

      channel = supabase
        .channel("schedules-changes")
        .on("postgres_changes", { event: "*", schema: "public", table: "schedules" }, handler)
        .subscribe((status, err) => {
          console.log("[realtime] schedules-changes:", status, err ?? "");
        });
    }

    void join();

    // 토큰이 갱신되거나 다시 로그인하면, 새 토큰으로 채널을 다시 붙인다.
    // (이미 붙은 채널의 RLS 바인딩은 갱신되지 않으므로 재연결이 유일한 방법이다.)
    const { data: authSub } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "TOKEN_REFRESHED" && event !== "SIGNED_IN") return;
      if (channel) {
        supabase.removeChannel(channel);
        channel = null;
      }
      void join();
    });

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      authSub.subscription.unsubscribe();
      if (channel) supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
