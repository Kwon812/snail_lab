"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "../../_lib/supabase-browser";

export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onSignOut() {
    setPending(true);
    // 브라우저 클라이언트로 로그아웃 → 쿠키 정리 + onAuthStateChange 발생
    // → AdminOnly(useIsAdmin)들이 즉시 갱신되어 관리자 버튼이 바로 사라짐.
    await supabaseBrowser().auth.signOut();
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <button
      onClick={onSignOut}
      disabled={pending}
      className="rounded-pill border border-ink/15 bg-white px-4 py-2 text-[14px] font-medium text-ink transition-colors hover:border-ink/40 disabled:opacity-60"
    >
      {pending ? "로그아웃 중…" : "로그아웃"}
    </button>
  );
}
