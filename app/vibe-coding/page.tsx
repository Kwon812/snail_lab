"use client";

import { useState } from "react";
import { Arrow, Eyebrow, Section } from "../_components/ui";
import { Spinner } from "../_components/spinner";

type IssueResult = { apiKey: string; projectId: string; projectName: string };

export default function VibeCodingPage() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [courseId, setCourseId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<IssueResult | null>(null);
  const [copied, setCopied] = useState(false);

  async function onSubmit() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/vibe-coding/issue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, courseId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "발급에 실패했습니다.");
      setResult(json);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function copyKey() {
    if (!result) return;
    await navigator.clipboard.writeText(result.apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Section className="pt-36 sm:pt-44">
      <Eyebrow>바이브 코딩</Eyebrow>
      <h1 className="display mt-6 max-w-[18ch] text-[40px] leading-[1.02] sm:text-[56px]">
        본인인증 하고
        <br />
        실습용 API 키 받기.
      </h1>
      <p className="mt-5 max-w-[52ch] text-[17px] leading-[1.5] text-slate">
        강의에 등록된 이름·전화번호·과정명을 정확히 입력하면 실습에 쓸 OpenAI API 키를
        발급해 드립니다. 키는 이 화면에서 딱 한 번만 보여지니, 꼭 복사해서 Codex에 바로
        입력해 두세요.
      </p>

      <div className="mt-10 max-w-[520px] rounded-stadium bg-lifted p-8 shadow-card">
        {result ? (
          <div>
            <p className="text-[14px] font-bold uppercase tracking-[0.04em] text-signal">
              발급 완료 — 지금 바로 복사하세요
            </p>
            <div className="mt-4 break-all rounded-[16px] border border-ink/15 bg-white px-4 py-3 font-mono text-[14px] text-ink">
              {result.apiKey}
            </div>
            <button
              onClick={copyKey}
              className="mt-4 inline-flex items-center gap-2 rounded-[20px] bg-ink px-5 py-2.5 text-[15px] font-medium text-cream transition-transform active:scale-95"
            >
              {copied ? "복사됨!" : "키 복사하기"}
            </button>
            <p className="mt-4 text-[13px] leading-[1.6] text-slate">
              이 키는 다시 보여드릴 수 없습니다. 지금 Codex 설정에 붙여넣고 안전한 곳에
              보관해 주세요. 분실했다면 담당 강사에게 재발급을 요청하세요.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <Field label="이름">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="등록하신 성함"
                className="input"
              />
            </Field>
            <Field label="전화번호">
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="01012345678"
                className="input"
              />
            </Field>
            <Field label="과정명">
              <input
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                placeholder="안내받은 과정명을 정확히 입력"
                className="input"
              />
            </Field>

            {error && <p className="text-[14px] text-signal">{error}</p>}

            <button
              onClick={onSubmit}
              disabled={loading || !name.trim() || !phone.trim() || !courseId.trim()}
              className="mt-2 flex items-center justify-center gap-2 rounded-[20px] bg-ink px-6 py-3.5 text-[16px] font-medium tracking-[-0.02em] text-cream transition-transform active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? (
                <Spinner size={20} />
              ) : (
                <>
                  본인인증 하고 키 발급받기 <Arrow className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        )}
      </div>

      <style>{`
        .input {
          width: 100%;
          border-radius: 14px;
          border: 1px solid rgba(20,20,19,0.15);
          background: #fff;
          padding: 12px 16px;
          font-size: 16px;
          outline: none;
          transition: border-color .15s;
        }
        .input::placeholder { color: var(--color-dust); }
        .input:focus { border-color: rgba(20,20,19,0.5); }
      `}</style>
    </Section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-2 block text-[13px] font-bold uppercase tracking-[0.04em] text-slate">
        {label}
      </label>
      {children}
    </div>
  );
}
