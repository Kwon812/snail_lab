"use client";

import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { Arrow, Chip, Eyebrow, Section } from "../../_components/ui";
import { Spinner } from "../../_components/spinner";
import type { PublicCourseEvaluation } from "../_queries/evaluations";

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

/** QR은 외부 서비스 없이 브라우저에서 직접 그린다 — 설문 링크를 제3자 서버로 보내지 않는다. */
function QrModal({ evaluation, onClose }: { evaluation: PublicCourseEvaluation; onClose: () => void }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(evaluation.form_url, { width: 320, margin: 2 }).then((url) => {
      if (!cancelled) setDataUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [evaluation.form_url]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/40 p-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[380px] rounded-[28px] bg-white p-8 text-center shadow-card"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-[16px] font-medium text-ink">{evaluation.title}</p>
        <p className="mt-1 text-[13px] text-slate">휴대폰 카메라로 QR을 스캔하면 설문으로 이동합니다.</p>
        <div className="mt-6 flex justify-center">
          {dataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={dataUrl} alt={`${evaluation.title} 설문 QR코드`} className="h-[220px] w-[220px]" />
          ) : (
            <div className="flex h-[220px] w-[220px] items-center justify-center">
              <Spinner size={40} />
            </div>
          )}
        </div>
        <button
          onClick={onClose}
          className="mt-6 rounded-pill border border-ink/15 bg-white px-5 py-2 text-[14px] font-medium text-ink transition-colors hover:border-ink/40"
        >
          닫기
        </button>
      </div>
    </div>
  );
}

export function EvaluationsList({ evaluations }: { evaluations: PublicCourseEvaluation[] }) {
  const [lecture, setLecture] = useState<string>("전체");
  const [qrTarget, setQrTarget] = useState<PublicCourseEvaluation | null>(null);
  const lectureNames = useMemo(
    () => ["전체", ...Array.from(new Set(evaluations.map((e) => e.lecture_name).filter(Boolean) as string[]))],
    [evaluations],
  );
  const filtered = lecture === "전체" ? evaluations : evaluations.filter((e) => e.lecture_name === lecture);

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
                    {e.lecture_name ? `${e.lecture_name} · ` : ""}
                    {e.description ? `${e.description} · ` : ""}
                    등록 {fmtDate(e.created_at)}
                  </p>
                </div>
                <button
                  onClick={() => setQrTarget(e)}
                  className="inline-flex shrink-0 items-center gap-2 rounded-[20px] border border-ink/15 bg-white px-5 py-2 text-[15px] font-medium text-ink transition-colors hover:border-ink/40"
                >
                  QR 보기
                </button>
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

      {qrTarget && <QrModal evaluation={qrTarget} onClose={() => setQrTarget(null)} />}
    </Section>
  );
}
