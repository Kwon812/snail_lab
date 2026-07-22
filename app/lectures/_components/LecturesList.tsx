"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Arrow, Eyebrow, Section } from "../../_components/ui";
import { Reveal } from "../../_components/reveal";
import { fields } from "../../_data/content";
import type { PublicLecture } from "../queries";
import { LectureAdminActions, NewLectureButton } from "./LectureAdminActions";

const FILTERS = [
  { slug: "all", label: "전체" },
  ...fields.map((f) => ({ slug: f.slug, label: f.title })),
];

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
  const selectField = (slug: string) =>
    router.replace(slug === "all" ? "/lectures" : `/lectures?field=${slug}`, { scroll: false });

  return (
    <Section className="pt-36 sm:pt-44">
      <div className="flex items-start justify-between gap-4">
        <Eyebrow>강의 소개</Eyebrow>
        <NewLectureButton />
      </div>
      <h1 className="display mt-6 max-w-[18ch] text-[40px] leading-[1.02] sm:text-[60px]">
        시작점에 맞는 커리큘럼.
      </h1>
      <p className="mt-6 max-w-[52ch] text-[18px] leading-[1.5] text-slate">
        온라인·오프라인으로 진행되며, 수준과 목표에 맞춰 선택할 수 있습니다. 모든 강의는 완성작을 목표로 합니다.
      </p>

      {/* 분야별 필터 */}
      <div className="mt-10 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.slug}
            onClick={() => selectField(f.slug)}
            className={`rounded-pill px-5 py-2 text-[15px] font-medium transition-colors ${
              field === f.slug
                ? "bg-ink text-cream"
                : "bg-white text-ink border border-ink/15 hover:border-ink/40"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="mt-16 rounded-stadium bg-lifted p-10 text-center text-[17px] text-dust">
          아직 등록된 강의가 없습니다.
        </p>
      ) : (
        <Reveal stagger className="mt-12 flex flex-col gap-8">
          {visible.map((l) => (
            <article
              key={l.slug}
              className="relative grid grid-cols-1 gap-8 rounded-stadium bg-lifted p-8 shadow-card sm:p-10 lg:grid-cols-[300px_1fr] lg:items-stretch"
            >
              <LectureAdminActions id={l.id} className="absolute right-5 top-5 z-10" />
              {l.thumbnail ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={l.thumbnail}
                  alt={l.title}
                  className="aspect-[4/3] w-full rounded-[28px] object-cover"
                />
              ) : (
                <div
                  className="aspect-[4/3] w-full rounded-[28px]"
                  style={{
                    background: `radial-gradient(circle at 35% 30%, ${l.tone.a}, ${l.tone.b})`,
                  }}
                />
              )}
              <div className="flex flex-col">
                <div className="flex items-center gap-2 text-[13px] font-medium text-orange-500">
                  {l.level && <span>{l.level}</span>}
                  {l.level && l.mode && <span className="h-1 w-1 rounded-full bg-dust" />}
                  {l.mode && <span>{l.mode}</span>}
                </div>
                <h2 className="display mt-3 text-[28px] sm:text-[34px]">{l.title}</h2>
                {l.target && (
                  <p className="mt-2 text-[16px] leading-[1.5] text-slate">대상 · {l.target}</p>
                )}

                {/* 커리큘럼 토글 */}
                {l.curriculum.length > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={() => toggle(l.slug)}
                      aria-expanded={!!open[l.slug]}
                      className="mt-3 inline-flex w-fit items-center gap-1.5 text-[14px] font-medium text-slate transition-colors hover:text-ink"
                    >
                      총 {l.curriculum.length}강 커리큘럼
                      <Chevron open={!!open[l.slug]} />
                    </button>

                    <div
                      className={`grid transition-all duration-300 ease-out ${
                        open[l.slug] ? "mt-4 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                      }`}
                    >
                      <ol className="flex min-h-0 flex-col gap-2 overflow-hidden">
                        {l.curriculum.map((c, i) => (
                          <li key={i} className="flex items-start gap-3 text-[15px] leading-[1.5]">
                            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white text-[12px] font-medium text-slate ring-1 ring-ink/10">
                              {i + 1}
                            </span>
                            <span className="pt-0.5 text-ink">{c}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  </>
                )}

                <Link
                  href="/contact"
                  className="group mt-8 inline-flex w-fit items-center gap-2.5 rounded-pill border border-ink/15 bg-white py-1.5 pl-5 pr-1.5 transition-colors hover:border-ink lg:mt-auto lg:self-end"
                >
                  <span className="text-[15px] font-medium tracking-[-0.02em] text-ink">
                    신청 · 문의하기
                  </span>
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink text-cream transition-transform group-hover:translate-x-0.5">
                    <Arrow className="h-4 w-4" />
                  </span>
                </Link>
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
