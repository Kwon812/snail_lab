"use server";

import { supabaseServerAuth } from "../../../_lib/supabase-server";

export type PushSubscriptionInput = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

/** 이 기기의 구독 정보를 저장(이미 있으면 갱신). */
export async function subscribePush(input: PushSubscriptionInput) {
  const supabase = await supabaseServerAuth();
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      endpoint: input.endpoint,
      p256dh: input.keys.p256dh,
      auth: input.keys.auth,
    },
    { onConflict: "endpoint" },
  );
  if (error) throw new Error(error.message);
  return { ok: true };
}

/** 이 기기의 구독을 해제(알림 끄기, 브라우저 권한 취소 등). */
export async function unsubscribePush(endpoint: string) {
  const supabase = await supabaseServerAuth();
  const { error } = await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
  if (error) throw new Error(error.message);
  return { ok: true };
}

/** 이 기기가 이미 구독돼 있는지 (알림 켜기 버튼의 초기 상태 표시용). */
export async function isPushSubscribed(endpoint: string): Promise<boolean> {
  const supabase = await supabaseServerAuth();
  const { data, error } = await supabase
    .from("push_subscriptions")
    .select("id")
    .eq("endpoint", endpoint)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return !!data;
}
