"use client";

import { useMutation } from "@tanstack/react-query";
import { subscribePush, unsubscribePush, type PushSubscriptionInput } from "../_actions/push";

export function useSubscribePush() {
  return useMutation({
    mutationFn: (input: PushSubscriptionInput) => subscribePush(input),
  });
}

export function useUnsubscribePush() {
  return useMutation({
    mutationFn: (endpoint: string) => unsubscribePush(endpoint),
  });
}
