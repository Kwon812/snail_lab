"use client";

import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabaseBrowser } from "../../../_lib/supabase-browser";
import type { NotificationCategory } from "../../../_lib/notifications";
import {
  createScheduleFromEvent,
  getNotifications,
  setCategory,
  setHandled,
  type ScheduleFromEventInput,
} from "../_actions/notifications";

export function useNotifications() {
  return useQuery({
    queryKey: ["notifications"],
    queryFn: () => getNotifications(),
  });
}

// 내가 만든 변경은 뮤테이션 쪽에서 이미 무효화하므로, 그 직후 Realtime이 같은 변경을 감지해
// 또 무효화(중복 요청)하지 않도록 잠깐 억제한다. (schedules 쪽과 같은 방식)
let suppressRealtimeUntil = 0;

function useInvalidateNotifications() {
  const qc = useQueryClient();
  return () => {
    suppressRealtimeUntil = Date.now() + 1500;
    qc.invalidateQueries({ queryKey: ["notifications"] });
  };
}

export function useSetHandled() {
  const invalidate = useInvalidateNotifications();
  return useMutation({
    mutationFn: ({ id, handled }: { id: string; handled: boolean }) => setHandled(id, handled),
    onSettled: invalidate,
  });
}

export function useSetCategory() {
  const invalidate = useInvalidateNotifications();
  return useMutation({
    mutationFn: ({ id, category }: { id: string; category: NotificationCategory }) =>
      setCategory(id, category),
    onSettled: invalidate,
  });
}

export function useCreateScheduleFromEvent() {
  const qc = useQueryClient();
  const invalidate = useInvalidateNotifications();
  return useMutation({
    mutationFn: (input: ScheduleFromEventInput) => createScheduleFromEvent(input),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["schedules"] });
      invalidate();
    },
  });
}

/**
 * notification_events 변경(Realtime)을 구독해 캐시를 무효화한다. 페이지 최상단에서 한 번 호출.
 *
 * ⚠️ 토큰을 반드시 채널이 붙기 **전에** 넣어야 한다.
 *
 * RLS가 걸린 테이블은 Realtime 서버가 "이 구독자가 이 행을 select 할 수 있는가"를 확인해서
 * 이벤트를 걸러내는데, 그 판단 기준이 **채널이 join 하는 시점의 토큰**으로 고정된다. 세션은
 * 쿠키에서 비동기로 복원되므로, subscribe()를 먼저 부르면 채널이 익명 상태로 붙어버리고
 * 그 뒤에 setAuth()를 해도 이미 붙은 채널에는 소급 적용되지 않는다.
 *
 * 이때 증상이 고약하다 — 구독 상태는 멀쩡히 SUBSCRIBED로 뜨는데 이벤트만 하나도 안 온다.
 * (DELETE는 RLS 필터를 안 타서 익명으로도 오기 때문에 "삭제만 반영된다"로 보이기도 한다.)
 */
export function useNotificationsRealtime() {
  const invalidate = useInvalidateNotifications();

  useEffect(() => {
    const supabase = supabaseBrowser();
    let timer: ReturnType<typeof setTimeout> | null = null;
    let channel: RealtimeChannel | null = null;
    let cancelled = false;

    const handler = () => {
      if (Date.now() < suppressRealtimeUntil) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(invalidate, 300);
    };

    async function join() {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;

      await supabase.realtime.setAuth(data.session?.access_token ?? null);
      if (cancelled) return;

      channel = supabase
        .channel("notification-events-changes")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "notification_events" },
          handler,
        )
        .subscribe((status, err) => {
          console.log("[realtime] notification_events:", status, err ?? "");
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
