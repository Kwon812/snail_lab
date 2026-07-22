"use client";

import { useTransition } from "react";
import { signOut } from "../../_actions/auth";

export function SignOutButton() {
  const [pending, startTransition] = useTransition();
  return (
    <button
      onClick={() => startTransition(() => signOut())}
      disabled={pending}
      className="rounded-pill border border-ink/15 bg-white px-4 py-2 text-[14px] font-medium text-ink transition-colors hover:border-ink/40 disabled:opacity-60"
    >
      {pending ? "로그아웃 중…" : "로그아웃"}
    </button>
  );
}
