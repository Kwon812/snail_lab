"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Arrow, Eyebrow, Section } from "../../_components/ui";
import { Spinner } from "../../_components/spinner";
import { useLectures } from "../../lectures/_hooks/lectures";
import type { SurveyQuestion, SurveyQuestionType } from "./_actions/evaluations";
import {
  useCourseEvaluationResponseCount,
  useCourseEvaluations,
  useCreateCourseEvaluation,
  useDeleteCourseEvaluation,
  useDisconnectGoogle,
  useGoogleConnection,
  useToggleCourseEvaluationStatus,
} from "./_hooks/evaluations";

type QuestionDraft = {
  key: string;
  title: string;
  type: SurveyQuestionType;
  required: boolean;
  optionsText: string; // 한 줄에 하나씩 — MULTIPLE_CHOICE / CHECKBOX 전용
  lowLabel: string;
  highLabel: string;
};

const TYPE_LABEL: Record<SurveyQuestionType, string> = {
  SHORT_ANSWER: "단답형",
  PARAGRAPH: "장문형",
  MULTIPLE_CHOICE: "객관식(단일 선택)",
  CHECKBOX: "체크박스(복수 선택)",
  SCALE: "척도(1~5)",
};

function newQuestion(): QuestionDraft {
  return {
    key: Math.random().toString(36).slice(2),
    title: "",
    type: "SHORT_ANSWER",
    required: false,
    optionsText: "",
    lowLabel: "",
    highLabel: "",
  };
}

function toSurveyQuestion(q: QuestionDraft): SurveyQuestion {
  const base = { title: q.title.trim() || "제목 없는 문항", required: q.required, type: q.type };
  if (q.type === "MULTIPLE_CHOICE" || q.type === "CHECKBOX") {
    const options = q.optionsText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    return { ...base, options: options.length > 0 ? options : ["선택지 1"] };
  }
  if (q.type === "SCALE") {
    return {
      ...base,
      lowLabel: q.lowLabel.trim() || undefined,
      highLabel: q.highLabel.trim() || undefined,
    };
  }
  return base;
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

/** 응답 수 배지 — 행마다 독립적으로 구글 API를 호출해 지연 로딩한다(목록 자체는 즉시 뜬다). */
function ResponseCountBadge({ googleFormId }: { googleFormId: string }) {
  const { data, isPending, isError } = useCourseEvaluationResponseCount(googleFormId);
  if (isPending) return <span className="text-[13px] text-dust">응답 확인 중…</span>;
  if (isError) return <span className="text-[13px] text-dust">응답 수 조회 실패</span>;
  return <span className="text-[13px] text-slate">응답 {data}명</span>;
}

export default function CourseEvaluationAdminPage() {
  return (
    <Suspense>
      <CourseEvaluationAdminPageInner />
    </Suspense>
  );
}

function CourseEvaluationAdminPageInner() {
  const searchParams = useSearchParams();
  const connected = searchParams.get("connected") === "1";
  const googleError = searchParams.get("google_error");

  const { data: connection, isPending: connectionPending } = useGoogleConnection();
  const disconnect = useDisconnectGoogle();

  const { data: lectures } = useLectures();
  const { data: evaluations, isPending, isError, error } = useCourseEvaluations();
  const create = useCreateCourseEvaluation();
  const toggleStatus = useToggleCourseEvaluationStatus();
  const del = useDeleteCourseEvaluation();

  const [lectureName, setLectureName] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [questions, setQuestions] = useState<QuestionDraft[]>([newQuestion()]);
  const [result, setResult] = useState<{ formUrl: string; editUrl: string } | null>(null);

  function updateQuestion(key: string, patch: Partial<QuestionDraft>) {
    setQuestions((qs) => qs.map((q) => (q.key === key ? { ...q, ...patch } : q)));
  }

  function moveQuestion(key: string, dir: -1 | 1) {
    setQuestions((qs) => {
      const i = qs.findIndex((q) => q.key === key);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= qs.length) return qs;
      const next = [...qs];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  async function onSubmit() {
    if (!title.trim()) {
      alert("설문지 제목을 입력해 주세요.");
      return;
    }
    if (questions.length === 0) {
      alert("문항을 하나 이상 추가해 주세요.");
      return;
    }
    try {
      const res = await create.mutateAsync({
        lectureName: lectureName.trim() || null,
        title,
        description: description || undefined,
        questions: questions.map(toSurveyQuestion),
      });
      setResult({ formUrl: res.formUrl, editUrl: res.editUrl });
      setTitle("");
      setDescription("");
      setLectureName("");
      setQuestions([newQuestion()]);
    } catch (err) {
      alert(`설문지 생성 실패: ${(err as Error).message}`);
    }
  }

  return (
    <Section className="pt-36 sm:pt-44">
      <Eyebrow>관리자 · 강의 설문지</Eyebrow>
      <h1 className="display mt-6 max-w-[20ch] text-[40px] leading-[1.02] sm:text-[56px]">
        강의 설문지 작성.
      </h1>
      <p className="mt-5 max-w-[56ch] text-[17px] leading-[1.5] text-slate">
        문항을 만들면 구글 폼으로 자동 생성되고, 그 응답 링크가{" "}
        <span className="font-medium text-ink">/evaluation</span> 강의평가 탭에 노출됩니다.
      </p>

      {/* 구글 계정 연동 배너 */}
      <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-stadium bg-lifted p-6 shadow-card sm:p-8">
        {connectionPending ? (
          <Spinner size={24} />
        ) : connection?.connected ? (
          <>
            <p className="text-[15px] text-ink">
              구글 계정 연동됨 — <span className="font-medium">{connection.email}</span>
            </p>
            <button
              onClick={() => {
                if (confirm("구글 계정 연동을 해제할까요? 새 설문지를 만들기 전에 다시 연동해야 합니다.")) {
                  disconnect.mutate();
                }
              }}
              disabled={disconnect.isPending}
              className="shrink-0 rounded-pill border border-ink/15 bg-white px-4 py-1.5 text-[13px] font-medium text-ink transition-colors hover:border-ink/40 disabled:opacity-50"
            >
              연동 해제
            </button>
          </>
        ) : (
          <>
            <p className="text-[15px] text-ink">
              구글 폼을 만들려면 먼저 구글 계정을 연동해야 합니다.
              {googleError && (
                <span className="mt-1 block text-[13px] text-signal">
                  연동 실패({googleError}) — 다시 시도해 주세요.
                </span>
              )}
              {connected && !connection?.connected && (
                <span className="mt-1 block text-[13px] text-signal">연동 처리 중 문제가 발생했습니다.</span>
              )}
            </p>
            <a
              href="/api/google/oauth/start"
              className="shrink-0 rounded-pill bg-ink px-4 py-1.5 text-[13px] font-medium text-cream transition-colors hover:opacity-90"
            >
              구글 계정 연동
            </a>
          </>
        )}
      </div>

      {result && (
        <div className="mt-6 rounded-[20px] bg-signal/10 p-6 text-[14px] text-ink">
          설문지가 생성되었습니다.{" "}
          <a href={result.formUrl} target="_blank" rel="noreferrer" className="font-medium underline">
            응답 링크
          </a>{" "}
          ·{" "}
          <a href={result.editUrl} target="_blank" rel="noreferrer" className="font-medium underline">
            구글 폼에서 편집
          </a>
        </div>
      )}

      {/* 작성 폼 */}
      <div className="mt-10 rounded-stadium bg-lifted p-6 shadow-card sm:p-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <input
              value={lectureName}
              onChange={(e) => setLectureName(e.target.value)}
              list="course-evaluation-lecture-suggestions"
              placeholder="강의명(선택, 직접 입력 가능 — 예: 미디어 리터러시 심화반)"
              className="w-full rounded-[14px] border border-ink/15 bg-white px-4 py-3 text-[16px] text-ink outline-none placeholder:text-dust focus:border-ink/40"
            />
            <datalist id="course-evaluation-lecture-suggestions">
              {Array.from(new Set(lectures?.map((l) => l.title) ?? [])).map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </div>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="설문지 제목 (예: 미디어 리터러시 심화반 강의평가)"
            className="w-full rounded-[14px] border border-ink/15 bg-white px-4 py-3 text-[16px] text-ink outline-none placeholder:text-dust focus:border-ink/40"
          />
        </div>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="설문 설명(선택)"
          rows={2}
          className="mt-4 w-full rounded-[14px] border border-ink/15 bg-white px-4 py-3 text-[15px] text-ink outline-none placeholder:text-dust focus:border-ink/40"
        />

        {/* 문항 리스트 */}
        <div className="mt-6 flex flex-col gap-4">
          {questions.map((q, i) => (
            <div key={q.key} className="rounded-[20px] border border-ink/10 bg-white p-5">
              <div className="flex items-start gap-3">
                <span className="mt-3 shrink-0 text-[13px] font-bold text-dust">Q{i + 1}</span>
                <div className="flex-1">
                  <input
                    value={q.title}
                    onChange={(e) => updateQuestion(q.key, { title: e.target.value })}
                    placeholder="문항 내용"
                    className="w-full rounded-[12px] border border-ink/15 px-3 py-2 text-[15px] text-ink outline-none placeholder:text-dust focus:border-ink/40"
                  />
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <select
                      value={q.type}
                      onChange={(e) => updateQuestion(q.key, { type: e.target.value as SurveyQuestionType })}
                      className="rounded-[10px] border border-ink/15 px-3 py-1.5 text-[13px] text-ink outline-none focus:border-ink/40"
                    >
                      {(Object.keys(TYPE_LABEL) as SurveyQuestionType[]).map((t) => (
                        <option key={t} value={t}>
                          {TYPE_LABEL[t]}
                        </option>
                      ))}
                    </select>
                    <label className="flex items-center gap-1.5 text-[13px] text-slate">
                      <input
                        type="checkbox"
                        checked={q.required}
                        onChange={(e) => updateQuestion(q.key, { required: e.target.checked })}
                      />
                      필수
                    </label>
                    <div className="ml-auto flex items-center gap-1">
                      <button
                        onClick={() => moveQuestion(q.key, -1)}
                        disabled={i === 0}
                        className="grid h-7 w-7 place-items-center rounded-full text-slate hover:bg-cream disabled:opacity-30"
                        aria-label="위로"
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => moveQuestion(q.key, 1)}
                        disabled={i === questions.length - 1}
                        className="grid h-7 w-7 place-items-center rounded-full text-slate hover:bg-cream disabled:opacity-30"
                        aria-label="아래로"
                      >
                        ↓
                      </button>
                      <button
                        onClick={() => setQuestions((qs) => qs.filter((x) => x.key !== q.key))}
                        className="ml-1 rounded-pill px-2.5 py-1 text-[12px] font-medium text-slate hover:text-signal"
                      >
                        삭제
                      </button>
                    </div>
                  </div>

                  {(q.type === "MULTIPLE_CHOICE" || q.type === "CHECKBOX") && (
                    <textarea
                      value={q.optionsText}
                      onChange={(e) => updateQuestion(q.key, { optionsText: e.target.value })}
                      placeholder={"선택지를 한 줄에 하나씩 입력\n예)\n매우 만족\n만족\n보통"}
                      rows={3}
                      className="mt-3 w-full rounded-[12px] border border-ink/15 px-3 py-2 text-[14px] text-ink outline-none placeholder:text-dust focus:border-ink/40"
                    />
                  )}

                  {q.type === "SCALE" && (
                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <input
                        value={q.lowLabel}
                        onChange={(e) => updateQuestion(q.key, { lowLabel: e.target.value })}
                        placeholder="1점 라벨(예: 매우 불만족)"
                        className="rounded-[12px] border border-ink/15 px-3 py-2 text-[14px] text-ink outline-none placeholder:text-dust focus:border-ink/40"
                      />
                      <input
                        value={q.highLabel}
                        onChange={(e) => updateQuestion(q.key, { highLabel: e.target.value })}
                        placeholder="5점 라벨(예: 매우 만족)"
                        className="rounded-[12px] border border-ink/15 px-3 py-2 text-[14px] text-ink outline-none placeholder:text-dust focus:border-ink/40"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={() => setQuestions((qs) => [...qs, newQuestion()])}
          className="mt-4 rounded-pill border border-ink/15 bg-white px-4 py-1.5 text-[13px] font-medium text-ink transition-colors hover:border-ink/40"
        >
          + 문항 추가
        </button>

        <div>
          <button
            onClick={onSubmit}
            disabled={create.isPending || !connection?.connected}
            className="mt-6 inline-flex min-w-[140px] items-center justify-center gap-2 rounded-[20px] bg-ink px-5 py-2.5 text-[15px] font-medium text-cream transition-transform active:scale-95 disabled:opacity-50"
          >
            {create.isPending ? (
              <Spinner size={20} />
            ) : (
              <>
                구글 폼으로 생성 <Arrow className="h-4 w-4" />
              </>
            )}
          </button>
          {!connection?.connected && !connectionPending && (
            <p className="mt-2 text-[13px] text-dust">구글 계정을 먼저 연동해야 생성할 수 있습니다.</p>
          )}
        </div>
      </div>

      {/* 생성된 설문지 목록 */}
      <div className="mt-14">
        <Eyebrow>강의평가</Eyebrow>
        <h2 className="display mt-5 text-[28px] leading-[1.05] sm:text-[36px]">생성한 설문지</h2>
        <div className="mt-8">
          {isPending ? (
            <div className="flex justify-center py-16">
              <Spinner size={52} />
            </div>
          ) : isError ? (
            <p className="rounded-[20px] bg-lifted p-6 text-[15px] text-slate">
              목록을 불러오지 못했습니다 — {(error as Error).message}
            </p>
          ) : evaluations.length === 0 ? (
            <p className="rounded-[20px] bg-lifted p-8 text-center text-[15px] text-dust">
              아직 생성한 설문지가 없습니다.
            </p>
          ) : (
            <ul className="flex flex-col border-t border-ink/10">
              {evaluations.map((ev) => (
                <li key={ev.id} className="flex flex-wrap items-center gap-4 border-b border-ink/10 py-4">
                  <span
                    className={`shrink-0 rounded-pill px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-[0.04em] ${
                      ev.status === "PUBLISHED" ? "bg-signal/10 text-signal" : "bg-bone text-slate"
                    }`}
                  >
                    {ev.status === "PUBLISHED" ? "공개중" : "비공개"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[16px] font-medium text-ink">{ev.title}</p>
                    <p className="mt-0.5 truncate text-[13px] text-slate">
                      {ev.lecture_name ? `${ev.lecture_name} · ` : ""}
                      문항 {ev.questions.length}개 · 생성 {fmtDate(ev.created_at)} ·{" "}
                      <ResponseCountBadge googleFormId={ev.google_form_id} />
                    </p>
                  </div>
                  <a
                    href={ev.form_url}
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0 rounded-pill border border-ink/15 bg-white px-3 py-1.5 text-[13px] font-medium text-ink transition-colors hover:border-ink/40"
                  >
                    응답 링크
                  </a>
                  <a
                    href={ev.edit_url}
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0 rounded-pill border border-ink/15 bg-white px-3 py-1.5 text-[13px] font-medium text-ink transition-colors hover:border-ink/40"
                  >
                    폼 편집
                  </a>
                  <a
                    href={`/api/admin/course-evaluation/${ev.id}/export`}
                    className="shrink-0 rounded-pill border border-ink/15 bg-white px-3 py-1.5 text-[13px] font-medium text-ink transition-colors hover:border-ink/40"
                  >
                    엑셀로 내보내기
                  </a>
                  <button
                    onClick={() => toggleStatus.mutate(ev)}
                    disabled={toggleStatus.isPending}
                    className="shrink-0 rounded-pill border border-ink/15 bg-white px-3 py-1.5 text-[13px] font-medium text-ink transition-colors hover:border-ink/40 disabled:opacity-50"
                  >
                    {ev.status === "PUBLISHED" ? "비공개로" : "공개로"}
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`"${ev.title}" 설문지를 삭제할까요? 구글 폼도 휴지통으로 이동합니다.`)) {
                        del.mutate(ev);
                      }
                    }}
                    disabled={del.isPending}
                    className="shrink-0 rounded-pill px-3 py-1.5 text-[13px] font-medium text-slate transition-colors hover:text-signal disabled:opacity-50"
                  >
                    삭제
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Section>
  );
}
