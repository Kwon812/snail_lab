"use client";

import { useMemo, useState } from "react";
import { Arrow, Chip, Eyebrow, Section } from "../../_components/ui";
import type { PublicCourseEvaluation } from "../_queries/evaluations";

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

export function EvaluationsList({ evaluations }: { evaluations: PublicCourseEvaluation[] }) {
  const [lecture, setLecture] = useState<string>("전체");
  const lectureNames = useMemo(
    () => ["전체", ...Array.from(new Set(evaluations.map((e) => e.lecture_title).filter(Boolean) as string[]))],
    [evaluations],
  );
  const filtered = lecture === "전체" ? evaluations : evaluations.filter((e) => e.lecture_title === lecture);

  return (
    <Section className="pt-36 sm:pt-44">
      <Eyebrow>강의평가</Eyebrow>
      <h1 className="display mt-6 max-w-[18ch] text-[40px] leading-[1.02] sm:text-[56px]">
        강의평가 설문.
      </h1>
      <p className="mt-5 max-w-[48ch] text-[17px] leading-[1.5] text-slate">
        수강한 강의의 설문지를 눌러 참여해 주세요.
      </p>

      {lectureNames.length > 1 && (
        <div className="mt-8 flex flex-wrap gap-2">
          {lectureNames.map((name) => (
            <button key={name} onClick={() => setLecture(name)}>
              <Chip active={lecture === name}>{name}</Chip>
            </button>
          ))}
        </div>
      )}

      <div className="mt-10">
        {filtered.length === 0 ? (
          <p className="rounded-[20px] bg-lifted p-8 text-center text-[15px] text-dust">
            {evaluations.length === 0 ? "아직 등록된 강의평가 설문이 없습니다." : "해당 강의의 설문이 없습니다."}
          </p>
        ) : (
          <ul className="flex flex-col border-t border-ink/10">
            {filtered.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center gap-4 border-b border-ink/10 py-5">
                <div className="min-w-0 flex-1">
                  <p className="text-[17px] font-medium text-ink">{e.title}</p>
                  <p className="mt-1 text-[13px] text-slate">
                    {e.lecture_title ? `${e.lecture_title} · ` : ""}
                    {e.description ? `${e.description} · ` : ""}
                    등록 {fmtDate(e.created_at)}
                  </p>
                </div>
                <a
                  href={e.form_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex shrink-0 items-center gap-2 rounded-[20px] bg-ink px-5 py-2 text-[15px] font-medium text-cream transition-transform active:scale-95"
                >
                  설문 참여 <Arrow className="h-4 w-4" />
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Section>
  );
}
