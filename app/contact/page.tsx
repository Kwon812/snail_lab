"use client";

import { useState } from "react";
import { Arrow, Eyebrow, Section } from "../_components/ui";
import { Reveal } from "../_components/reveal";

const TYPES = ["개인·학부모", "기관·학교 출강", "협업 제안"];

const channels = [
  { label: "카카오톡 아이디", value: "cmss88" },
  { label: "이메일", value: "cmss88@hanmail.net" },
  { label: "인스타그램 DM", value: "@choimiseon.book" },
];

export default function ContactPage() {
  const [type, setType] = useState("개인 수강");

  return (
    <Section className="pt-36 sm:pt-44">
      <Reveal stagger className="grid grid-cols-1 gap-14 lg:grid-cols-[1fr_1.1fr]">
        {/* Left — intro + channels */}
        <div>
          <Eyebrow>강의문의</Eyebrow>
          <h1 className="display mt-6 text-[40px] leading-[1.02] sm:text-[56px]">
            어떤 이야기든
            <br />
            환영합니다.
          </h1>
          <p className="mt-6 max-w-[44ch] text-[18px] leading-[1.55] text-slate">
            강의 문의부터 기업 출강, 협업 제안까지. 폼을 남겨주시면 영업일 기준 1~2일 내에
            답변드립니다.
          </p>

          <div className="mt-10 space-y-3">
            {channels.map((c) => (
              <div
                key={c.label}
                className="flex items-center justify-between rounded-[20px] bg-lifted px-6 py-4 shadow-card"
              >
                <span className="text-[14px] text-slate">{c.label}</span>
                <span className="text-[16px] font-medium">{c.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right — form */}
        <form
          onSubmit={(e) => e.preventDefault()}
          className="rounded-stadium bg-lifted p-8 shadow-card sm:p-12"
        >
          <div className="space-y-6">
            <Field label="이름">
              <input
                type="text"
                placeholder="성함을 입력해 주세요"
                className="input"
              />
            </Field>
            <Field label="연락처">
              <input
                type="text"
                placeholder="이메일 또는 전화번호"
                className="input"
              />
            </Field>

            <div>
              <label className="mb-2.5 block text-[14px] font-medium text-ink">문의 유형</label>
              <div className="flex flex-wrap gap-2">
                {TYPES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={`rounded-pill px-5 py-2 text-[14px] font-medium transition-colors ${
                      type === t
                        ? "bg-ink text-cream"
                        : "bg-white text-ink border border-ink/15 hover:border-ink/40"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <Field label="내용">
              <textarea
                rows={5}
                placeholder="문의하실 내용을 자유롭게 작성해 주세요"
                className="input resize-none"
              />
            </Field>


            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-[20px] bg-ink px-6 py-4 text-[16px] font-medium tracking-[-0.02em] text-cream transition-transform active:scale-[0.98]"
            >
              문의 보내기 <Arrow className="h-4 w-4" />
            </button>
          </div>
        </form>
      </Reveal>

      <style>{`
        .input {
          width: 100%;
          border-radius: 16px;
          border: 1px solid rgba(20,20,19,0.15);
          background: #fff;
          padding: 14px 18px;
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
      <label className="mb-2.5 block text-[14px] font-medium text-ink">{label}</label>
      {children}
    </div>
  );
}
