"use client";

import { useState } from "react";
import { Arrow, Eyebrow, Section } from "../../_components/ui";
import { Spinner } from "../../_components/spinner";
import { useLectures } from "../../lectures/_hooks/lectures";
import {
  useDeleteVibeStudent,
  useRegisterVibeStudent,
  useResetVibeStudent,
  useVibeStudents,
} from "./_hooks/students";

function fmtDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

function fmtPhone(digits: string): string {
  if (digits.length === 11) return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  return digits;
}

export default function VibeCodingAdminPage() {
  const { data, isPending, isError, error } = useVibeStudents();
  const { data: lectures } = useLectures();
  const courseSuggestions = Array.from(new Set(lectures?.map((l) => l.title) ?? []));

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [courseId, setCourseId] = useState("");
  const register = useRegisterVibeStudent();
  const del = useDeleteVibeStudent();
  const reset = useResetVibeStudent();

  async function onRegister() {
    if (!name.trim() || !phone.trim() || !courseId.trim()) return;
    try {
      await register.mutateAsync({ name, phone, courseId });
      setName("");
      setPhone("");
      setCourseId("");
    } catch (err) {
      alert(`등록 실패: ${(err as Error).message}`);
    }
  }

  return (
    <Section className="pt-36 sm:pt-44">
      <Eyebrow>관리자 · 바이브 코딩</Eyebrow>
      <h1 className="display mt-6 max-w-[20ch] text-[40px] leading-[1.02] sm:text-[56px]">
        수강생 사전 등록.
      </h1>
      <p className="mt-5 max-w-[56ch] text-[17px] leading-[1.5] text-slate">
        여기서 등록한 이름·전화번호·과정명과 정확히 일치해야 수강생이{" "}
        <span className="font-medium text-ink">/vibe-coding</span> 본인인증 페이지에서 OpenAI
        API 키를 발급받을 수 있습니다. 키는 발급 순간에만 수강생 화면에 표시되고 서버에는
        저장되지 않습니다 — 분실했다면 아래 목록에서 &quot;재발급 허용&quot;을 눌러주세요.
      </p>

      {/* 등록 폼 */}
      <div className="mt-10 rounded-stadium bg-lifted p-6 shadow-card sm:p-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="이름"
            className="w-full rounded-[14px] border border-ink/15 bg-white px-4 py-3 text-[16px] text-ink outline-none placeholder:text-dust focus:border-ink/40"
          />
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="전화번호 (01012345678)"
            className="w-full rounded-[14px] border border-ink/15 bg-white px-4 py-3 text-[16px] text-ink outline-none placeholder:text-dust focus:border-ink/40"
          />
          <div>
            <input
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              list="vibe-course-suggestions"
              placeholder="과정명 (예: 미디어 리터러시 심화반)"
              className="w-full rounded-[14px] border border-ink/15 bg-white px-4 py-3 text-[16px] text-ink outline-none placeholder:text-dust focus:border-ink/40"
            />
            <datalist id="vibe-course-suggestions">
              {courseSuggestions.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>
        </div>
        <button
          onClick={onRegister}
          disabled={register.isPending || !name.trim() || !phone.trim() || !courseId.trim()}
          className="mt-4 inline-flex min-w-[100px] items-center justify-center gap-2 rounded-[20px] bg-ink px-5 py-2.5 text-[15px] font-medium text-cream transition-transform active:scale-95 disabled:opacity-50"
        >
          {register.isPending ? <Spinner size={20} /> : <>등록 <Arrow className="h-4 w-4" /></>}
        </button>
      </div>

      {/* 목록 */}
      <div className="mt-10">
        {isPending ? (
          <div className="flex justify-center py-16">
            <Spinner size={52} />
          </div>
        ) : isError ? (
          <p className="rounded-[20px] bg-lifted p-6 text-[15px] text-slate">
            목록을 불러오지 못했습니다 — {(error as Error).message}
          </p>
        ) : data.length === 0 ? (
          <p className="rounded-[20px] bg-lifted p-8 text-center text-[15px] text-dust">
            아직 등록된 수강생이 없습니다.
          </p>
        ) : (
          <ul className="flex flex-col border-t border-ink/10">
            {data.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-4 border-b border-ink/10 py-4">
                <span
                  className={`shrink-0 rounded-pill px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-[0.04em] ${
                    s.status === "ISSUED"
                      ? "bg-signal/10 text-signal"
                      : s.status === "BLOCKED"
                        ? "bg-red-100 text-red-700"
                        : s.status === "ISSUING"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-bone text-slate"
                  }`}
                >
                  {s.status === "ISSUED"
                    ? "발급완료"
                    : s.status === "BLOCKED"
                      ? "예산초과 차단"
                      : s.status === "ISSUING"
                        ? "발급 처리중"
                        : "대기중"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[16px] font-medium text-ink">
                    {s.name} <span className="text-slate">· {fmtPhone(s.phone)}</span>
                  </p>
                  <p className="mt-0.5 truncate text-[13px] text-slate">
                    {s.course_id} · 등록 {fmtDate(s.created_at)}
                    {s.issued_at ? ` · 발급 ${fmtDate(s.issued_at)}` : ""}
                    {s.budget_blocked_at ? ` · 차단 ${fmtDate(s.budget_blocked_at)}` : ""}
                  </p>
                </div>
                {(s.status === "ISSUED" || s.status === "BLOCKED" || s.status === "ISSUING") && (
                  <button
                    onClick={() => {
                      const msg =
                        s.status === "BLOCKED"
                          ? `"${s.name}"은 예산 초과로 차단된 상태입니다. 재발급을 허용할까요?`
                          : s.status === "ISSUING"
                            ? `"${s.name}"의 발급이 처리중에 멈춰 있습니다. 상태를 초기화하고 다시 본인인증할 수 있게 할까요?`
                            : `"${s.name}"의 이번 주차를 마감할까요? 지금 프로젝트를 폐기하고, 다음 주차엔 본인인증 페이지에서 새로 발급받게 됩니다.`;
                      if (confirm(msg)) reset.mutate(s.id);
                    }}
                    disabled={reset.isPending}
                    className="shrink-0 rounded-pill border border-ink/15 bg-white px-4 py-1.5 text-[13px] font-medium text-ink transition-colors hover:border-ink/40 disabled:opacity-50"
                  >
                    {reset.isPending && reset.variables === s.id
                      ? "처리 중…"
                      : s.status === "BLOCKED"
                        ? "재발급 허용"
                        : s.status === "ISSUING"
                          ? "초기화"
                          : "주차 마감"}
                  </button>
                )}
                <button
                  onClick={() => {
                    const msg =
                      s.status === "PENDING"
                        ? `"${s.name}" 등록 정보를 삭제할까요?`
                        : `"${s.name}" 등록 정보를 삭제할까요? 발급된 OpenAI 프로젝트도 함께 폐기됩니다.`;
                    if (confirm(msg)) del.mutate(s.id);
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
    </Section>
  );
}
