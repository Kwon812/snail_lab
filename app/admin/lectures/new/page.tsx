"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { Arrow, Eyebrow, Section } from "../../../_components/ui";
import { Spinner } from "../../../_components/spinner";
import { createLecture, getLecture, updateLecture } from "../../../_actions/lectures";
import { ThumbnailField } from "../../_components/ThumbnailField";
import { fields } from "../../../_data/content";

const MODES = ["온라인", "오프라인", "온라인 · 오프라인"];

export default function LectureWritePage() {
  return (
    <Suspense fallback={<div className="flex justify-center pt-48"><Spinner size={52} /></div>}>
      <LectureEditor />
    </Suspense>
  );
}

function LectureEditor() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("id");
  const isEdit = !!editId;

  const [fieldSlug, setFieldSlug] = useState<string>(fields[0].slug);
  const [title, setTitle] = useState("");
  const [level, setLevel] = useState("");
  const [mode, setMode] = useState(MODES[1]);
  const [target, setTarget] = useState("");
  const [intro, setIntro] = useState("");
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [curriculum, setCurriculum] = useState<string[]>([""]);
  const [status, setStatus] = useState<"DRAFT" | "PUBLISHED">("DRAFT");
  const [preview, setPreview] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);

  const field = fields.find((f) => f.slug === fieldSlug)!;
  const tone = field.tone;

  function updateItem(i: number, v: string) {
    setCurriculum((prev) => prev.map((c, idx) => (idx === i ? v : c)));
  }
  function addItem() {
    setCurriculum((prev) => [...prev, ""]);
  }
  function removeItem(i: number) {
    setCurriculum((prev) => (prev.length === 1 ? [""] : prev.filter((_, idx) => idx !== i)));
  }

  // --- Edit mode: load existing lecture and hydrate the form ---
  const { data: existing, isPending: loadingLecture } = useQuery({
    queryKey: ["lecture", editId],
    queryFn: () => getLecture(editId!),
    enabled: isEdit,
  });
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    if (!existing || hydrated) return;
    setFieldSlug(existing.field);
    setTitle(existing.title);
    setLevel(existing.level ?? "");
    setMode(existing.mode ?? MODES[1]);
    setTarget(existing.target ?? "");
    setIntro(existing.intro ?? "");
    setThumbnail(existing.thumbnail ?? null);
    setCurriculum(existing.curriculum.length ? existing.curriculum : [""]);
    setStatus(existing.status);
    setHydrated(true);
  }, [existing, hydrated]);

  const qc = useQueryClient();
  const [pendingKind, setPendingKind] = useState<"DRAFT" | "PUBLISHED" | null>(null);
  const [lit, setLit] = useState(false); // brief glow on the status pill after a save

  const save = useMutation({
    mutationFn: (next: "DRAFT" | "PUBLISHED") => {
      const payload = {
        field: fieldSlug,
        title,
        level,
        mode,
        target,
        intro,
        thumbnail,
        tone,
        curriculum: curriculum.map((c) => c.trim()).filter(Boolean),
        status: next,
      };
      return isEdit ? updateLecture(editId!, payload) : createLecture(payload);
    },
    onMutate: (next) => {
      setPendingKind(next);
      setStatus(next);
    },
    onSuccess: (_data, next) => {
      setSaved(isEdit ? "수정되었습니다." : next === "PUBLISHED" ? "발행되었습니다." : "임시저장되었습니다.");
      setLit(true);
      setTimeout(() => setLit(false), 1400); // pill glows briefly to confirm the save
      qc.invalidateQueries({ queryKey: ["lectures"] });
      if (isEdit) qc.invalidateQueries({ queryKey: ["lecture", editId] });

      if (next === "PUBLISHED") {
        // 발행하면 공개 강의 목록으로 이동. replace로 편집 화면을 히스토리에서 치워 뒤로가기 방지.
        router.replace("/lectures");
      } else {
        setTimeout(() => setSaved(null), 2200);
      }
    },
    onError: (err) => {
      setSaved(`저장 실패: ${(err as Error).message}`);
      setTimeout(() => setSaved(null), 3200);
    },
    onSettled: () => setPendingKind(null),
  });
  const saving = save.isPending;

  return (
    <div className="pt-28 sm:pt-32">
      {/* ---- Action bar --------------------------------------- */}
      <Section>
        <div className="mx-auto flex max-w-[860px] flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Eyebrow>{isEdit ? "강의 수정" : "강의 작성"}</Eyebrow>
            <StatusPill status={status} lit={lit} />
            {isEdit && loadingLecture && <Spinner size={20} />}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPreview((v) => !v)}
              className="rounded-[20px] border-[1.5px] border-ink bg-white px-5 py-2 text-[15px] font-medium tracking-[-0.02em] transition-transform active:scale-95"
            >
              {preview ? "편집으로" : "미리보기"}
            </button>
            <button
              onClick={() => save.mutate("DRAFT")}
              disabled={saving}
              className="inline-flex min-w-[92px] items-center justify-center rounded-[20px] border-[1.5px] border-ink bg-white px-5 py-2 text-[15px] font-medium tracking-[-0.02em] transition-transform active:scale-95 disabled:opacity-60"
            >
              {pendingKind === "DRAFT" ? <Spinner size={20} /> : "임시저장"}
            </button>
            <button
              onClick={() => save.mutate("PUBLISHED")}
              disabled={saving}
              className="inline-flex min-w-[92px] items-center justify-center gap-2 rounded-[20px] border-[1.5px] border-ink bg-ink px-5 py-2 text-[15px] font-medium tracking-[-0.02em] text-cream transition-transform active:scale-95 disabled:opacity-60"
            >
              {pendingKind === "PUBLISHED" ? <Spinner size={20} /> : <>{isEdit ? "수정 발행" : "발행"} <Arrow className="h-4 w-4" /></>}
            </button>
          </div>
        </div>
      </Section>

      {preview ? (
        <PreviewLecture
          title={title}
          level={level}
          mode={mode}
          target={target}
          thumbnail={thumbnail}
          curriculum={curriculum.map((c) => c.trim()).filter(Boolean)}
        />
      ) : (
        <Section className="mt-8">
          <div className="mx-auto max-w-[860px]">
            {/* 분야 */}
            <FieldLabel>분야</FieldLabel>
            <div className="mt-3 flex flex-wrap gap-2">
              {fields.map((f) => (
                <Pill key={f.slug} active={fieldSlug === f.slug} onClick={() => setFieldSlug(f.slug)}>
                  {f.title}
                </Pill>
              ))}
            </div>

            {/* Title */}
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="강의 제목을 입력하세요"
              className="display mt-8 w-full resize-none bg-transparent text-[34px] leading-[1.1] text-ink outline-none placeholder:text-dust sm:text-[44px]"
            />

            {/* Level / Mode */}
            <div className="mt-8 flex flex-col gap-8 sm:grid-cols-2">
              <div>
                <FieldLabel>대상</FieldLabel>
                <div className="mt-3 flex flex-wrap gap-2">
                  <input
                      value={level}
                      onChange={(e) => setLevel(e.target.value)}
                      placeholder="초중고 학생들 "
                      className="mt-3 w-full rounded-[16px] border border-ink/15 bg-white px-4 py-3 text-[16px] text-ink outline-none placeholder:text-dust focus:border-ink/40"
                  />
                </div>
              </div>
              <div>
                <FieldLabel>진행 방식</FieldLabel>
                <div className="mt-3 flex flex-wrap gap-2">
                  {MODES.map((m) => (
                    <Pill key={m} active={mode === m} onClick={() => setMode(m)}>
                      {m}
                    </Pill>
                  ))}
                </div>
              </div>
            </div>

            {/* Target */}
            <div className="mt-8">
              <FieldLabel>대상 설명</FieldLabel>
              <input
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                placeholder="예: 아이의 미디어 사용이 걱정되는 부모와 교사"
                className="mt-3 w-full rounded-[16px] border border-ink/15 bg-white px-4 py-3 text-[16px] text-ink outline-none placeholder:text-dust focus:border-ink/40"
              />
            </div>

            {/* Intro */}
            <div className="mt-8">
              <FieldLabel>강의 소개 (선택)</FieldLabel>
              <textarea
                value={intro}
                onChange={(e) => setIntro(e.target.value)}
                rows={3}
                placeholder="강의를 한두 문단으로 소개해 주세요."
                className="mt-3 w-full resize-none rounded-[16px] border border-ink/15 bg-white px-4 py-3 text-[16px] leading-[1.6] text-ink outline-none placeholder:text-dust focus:border-ink/40"
              />
            </div>

            {/* Thumbnail */}
            <div className="mt-8">
              <ThumbnailField
                value={thumbnail}
                onChange={setThumbnail}
                label="대표 이미지 (선택)"
                aspect="aspect-[4/3]"
                className="max-w-[360px]"
              />
            </div>

            {/* Curriculum */}
            <div className="mt-8">
              <FieldLabel>커리큘럼</FieldLabel>
              <div className="mt-3 flex flex-col gap-2">
                {curriculum.map((c, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-lifted text-[13px] font-medium text-slate">
                      {i + 1}
                    </span>
                    <input
                      value={c}
                      onChange={(e) => updateItem(i, e.target.value)}
                      placeholder={`${i + 1}강 내용을 입력하세요`}
                      className="min-w-0 flex-1 rounded-[16px] border border-ink/15 bg-white px-4 py-2.5 text-[15px] text-ink outline-none placeholder:text-dust focus:border-ink/40"
                    />
                    <button
                      type="button"
                      onClick={() => removeItem(i)}
                      aria-label="항목 삭제"
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-slate transition-colors hover:bg-lifted hover:text-signal"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addItem}
                className="mt-3 inline-flex items-center gap-2 rounded-pill border border-ink/15 bg-white px-5 py-2 text-[14px] font-medium text-ink transition-colors hover:border-ink/40"
              >
                + 커리큘럼 추가
              </button>
            </div>
          </div>
        </Section>
      )}

      {/* Toast */}
      {saved && (
        <div className="fixed bottom-8 left-1/2 z-50 -translate-x-1/2 rounded-pill bg-ink px-6 py-3 text-[15px] font-medium text-cream shadow-card">
          {saved}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Small building blocks                                             */
/* ------------------------------------------------------------------ */
function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[13px] font-bold uppercase tracking-[0.04em] text-slate">{children}</span>
  );
}

function Pill({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-pill px-5 py-2 text-[14px] font-medium transition-colors ${
        active ? "bg-ink text-cream" : "bg-white text-ink border border-ink/15 hover:border-ink/40"
      }`}
    >
      {children}
    </button>
  );
}

function StatusPill({ status, lit = false }: { status: "DRAFT" | "PUBLISHED"; lit?: boolean }) {
  const draft = status === "DRAFT";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-pill px-3 py-1 text-[12px] font-bold uppercase tracking-[0.04em] transition-all duration-300 ${
        lit
          ? "bg-signal text-white shadow-[0_0_0_4px_rgba(207,69,0,0.18)]"
          : draft
            ? "bg-bone text-slate"
            : "bg-signal/10 text-signal"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full transition-colors ${
          lit ? "animate-pulse bg-white" : draft ? "bg-slate" : "bg-signal"
        }`}
      />
      {draft ? "임시저장" : "발행됨"}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Preview — the exact card used on the /lectures page               */
/* ------------------------------------------------------------------ */
function PreviewLecture({
  title,
  level,
  mode,
  target,
  thumbnail,
  curriculum,
}: {
  title: string;
  level: string;
  mode: string;
  target: string;
  thumbnail: string | null;
  curriculum: string[];
}) {
  return (
    <Section className="mt-8">
      <article className="grid grid-cols-1 gap-8 rounded-stadium bg-lifted p-8 shadow-card sm:p-10 lg:grid-cols-[300px_1fr] lg:items-stretch">
        {thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumbnail} alt={title} className="aspect-[4/3] w-full rounded-[28px] object-cover" />
        ) : (
          <div className="aspect-[4/3] w-full rounded-[28px] bg-gray-200" />
        )}
        <div className="flex flex-col">
          <div className="flex items-center gap-2 text-[13px] font-medium text-orange-500">
            <span>{level || "대상"}</span>
            <span className="h-1 w-1 rounded-full bg-dust" />
            <span>{mode}</span>
          </div>
          <h2 className="display mt-3 text-[28px] sm:text-[34px]">
            {title || "강의 제목을 입력하세요"}
          </h2>
          <p className="mt-2 text-[16px] leading-[1.5] text-slate">
            대상 · {target || "대상 설명을 입력하세요"}
          </p>
          <p className="mt-3 text-[14px] text-slate/80">총 {curriculum.length}강 커리큘럼</p>

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
    </Section>
  );
}
