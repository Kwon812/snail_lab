"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Arrow, Eyebrow, Section } from "../../_components/ui";
import { Spinner } from "../../_components/spinner";
import { signIn } from "../_actions/auth";
import {supabaseServerAuth} from "@/app/_lib/supabase-server";
import {supabaseBrowser} from "@/app/_lib/supabase-browser";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex justify-center pt-48"><Spinner size={52} /></div>}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/admin";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = await supabaseBrowser();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    // const res = await signIn(email, password);
    if (error) {
      setError("로그인에 실패했습니다. 이메일과 비밀번호를 확인해 주세요.");
      setLoading(false);
      return;
    }
    router.refresh();
    router.replace(next);
  }

  return (
    <Section className="pt-40 sm:pt-48">
      <div className="mx-auto max-w-[420px]">
        <Eyebrow>관리자</Eyebrow>
        <h1 className="display mt-5 text-[34px] leading-[1.05] sm:text-[44px]">로그인</h1>
        <p className="mt-4 text-[16px] leading-[1.5] text-slate">
          달팽이 그림책 연구소 관리자만 접근할 수 있습니다.
        </p>

        <form onSubmit={onSubmit} className="mt-10 flex flex-col gap-4">
          <div>
            <label className="mb-2 block text-[13px] font-medium text-ink">이메일</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full rounded-[16px] border border-ink/15 bg-white px-4 py-3 text-[16px] text-ink outline-none placeholder:text-dust focus:border-ink/40"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="mb-2 block text-[13px] font-medium text-ink">비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full rounded-[16px] border border-ink/15 bg-white px-4 py-3 text-[16px] text-ink outline-none placeholder:text-dust focus:border-ink/40"
              placeholder="••••••••"
            />
          </div>

          {error && <p className="text-[14px] text-signal">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 inline-flex h-[52px] items-center justify-center gap-2 rounded-[20px] bg-ink px-6 text-[16px] font-medium tracking-[-0.02em] text-cream transition-transform active:scale-[0.98] disabled:opacity-60"
          >
            {loading ? <Spinner size={22} /> : <>로그인 <Arrow className="h-4 w-4" /></>}
          </button>
        </form>
      </div>
    </Section>
  );
}
