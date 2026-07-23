"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Eyebrow, Section } from "../../_components/ui";
import { Reveal } from "../../_components/reveal";
import type { PublicLecture } from "../_queries/lectures";
import { LectureAdminActions, NewLectureButton } from "./LectureAdminActions";

export function LecturesList({ lectures }: { lectures: PublicLecture[] }) {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <LecturesContent lectures={lectures} />
    </Suspense>
  );
}

function LecturesContent({ lectures }: { lectures: PublicLecture[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const field = searchParams.get("field") ?? "all";
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const visible = lectures.filter((l) => field === "all" || l.field === field);
  const toggle = (slug: string) => setOpen((m) => ({ ...m, [slug]: !m[slug] }));
  const selectField = (f: string) =>
    router.replace(f === "all" ? "/lectures" : `/lectures?field=${encodeURIComponent(f)}`, {
      scroll: false,
    });

  // 실제 등록된 강의들의 분야에서 필터를 동적으로 생성 (사용자가 추가한 분야 자동 반영)
  const FILTERS = ["all", ...Array.from(new Set(lectures.map((l) => l.field).filter(Boolean)))];

  return (
    <Section className="pt-36 sm:pt-44">
      <div className="flex items-start justify-between gap-4">
        <Eyebrow>강의 소개</Eyebrow>
        <NewLectureButton />
      </div>
      <h1 className="display mt-6 max-w-[18ch] text-[40px] leading-[1.02] sm:text-[60px]">
        시작점에 맞는 커리큘럼.
      </h1>
      <p className="mt-6  text-[18px] leading-[1.5] text-slate">
        온라인·오프라인으로 진행되며, 수준과 목표에 맞춰 선택할 수 있습니다. 모든 강의는 완성작을 목표로 합니다.
      </p>

      {/* 분야별 필터 — 밑줄 탭 바 (리스트 구분선과 통일) */}
      {FILTERS.length > 1 && (
        <div className="mt-10 flex flex-wrap items-center gap-x-7 gap-y-1 border-b border-ink/10">
          {FILTERS.map((f) => {
            const active = field === f;
            return (
              <button
                key={f}
                onClick={() => selectField(f)}
                className={`-mb-px border-b-2 pb-3 text-[15px] font-medium transition-colors ${
                  active
                    ? "border-signal text-ink"
                    : "border-transparent text-slate hover:text-ink"
                }`}
              >
                {f === "all" ? "전체" : f}
              </button>
            );
          })}
        </div>
      )}

      {visible.length === 0 ? (
        <p className="mt-16 rounded-stadium bg-lifted p-10 text-center text-[17px] text-dust">
          아직 등록된 강의가 없습니다.
        </p>
      ) : (
        <Reveal stagger className="mt-6 flex flex-col">
          {visible.map((l, i) => (
            <article
              key={l.slug}
              className="relative grid grid-cols-[auto_1fr] gap-5 border-b border-ink/10 py-8 sm:gap-8"
            >
              <LectureAdminActions id={l.id} className="absolute right-0 top-8 z-10" />

              {/* index */}
              <span className="display pt-1 text-[22px] tabular-nums text-signal-light sm:text-[26px]">
                {String(i + 1).padStart(2, "0")}
              </span>

              <div className="flex flex-col pr-16 sm:pr-24">
                <div className="flex items-center gap-2 text-[12px] font-medium text-slate">
                    {l.field && <span>{l.field}</span>}
                    {l.field &&<span className="h-1 w-1 rounded-full bg-dust" />}
                  {l.level && <span>{l.level}</span>}
                  {l.level && l.mode && <span className="h-1 w-1 rounded-full bg-dust" />}
                  {l.mode && <span>{l.mode}</span>}
                </div>
                <h2 className="display mt-1.5 text-[24px] leading-[1.15] sm:text-[30px]">{l.title}</h2>
                {l.target && (
                  <p className="mt-2 text-[15px] leading-[1.5] text-slate">대상 · {l.target}</p>
                )}

                {/* 커리큘럼 토글 */}
                {l.curriculum.length > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={() => toggle(l.slug)}
                      aria-expanded={!!open[l.slug]}
                      className="mt-4 inline-flex w-fit items-center gap-1.5 text-[13px] font-medium text-slate transition-colors hover:text-ink"
                    >
                      총 {l.curriculum.length}강 커리큘럼
                      <Chevron open={!!open[l.slug]} />
                    </button>

                    <div
                      className={`grid transition-all duration-300 ease-out ${
                        open[l.slug] ? "mt-4 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                      }`}
                    >
                      <ol className="flex p-1 min-h-0  flex-col gap-1.5 overflow-hidden">
                        {l.curriculum.map((c, ci) => (
                          <li key={ci} className="flex items-start gap-2.5 text-[15px] leading-[1.5]">
                            <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-lifted text-[11px] font-medium text-slate ring-1 ring-ink/10">
                              {ci + 1}
                            </span>
                            <span className="text-ink">{c}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  </>
                )}
              </div>
            </article>
          ))}
        </Reveal>
      )}
    </Section>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`h-4 w-4 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
      aria-hidden
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}
