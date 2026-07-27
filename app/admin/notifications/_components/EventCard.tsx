"use client";

import { useState } from "react";
import Link from "next/link";
import {
  NOTIFICATION_CATEGORIES,
  SOURCE_LABELS,
  type NotificationCategory,
  type NotificationEvent,
} from "../../../_lib/notifications";
import {
  useCreateScheduleFromEvent,
  useSetCategory,
  useSetHandled,
} from "../_hooks/notifications";
import {
  CATEGORY_STYLES,
  fmtWhen,
  isValidIsoDate,
  reminderIsoFor,
  toISODate,
} from "../_lib/shared";

const ACTION_BTN =
  "rounded-pill border border-ink/15 bg-white px-3 py-1.5 text-[13px] font-medium text-ink transition-colors hover:border-ink/40 disabled:opacity-50";

export function EventCard({ event }: { event: NotificationEvent }) {
  const [showBody, setShowBody] = useState(false);
  const [composing, setComposing] = useState(false);

  const setHandled = useSetHandled();
  const setCategory = useSetCategory();

  const ex = event.extracted;

  const facts: [string, string][] = [];
  if (ex?.org) facts.push(["기관", ex.org]);
  if (ex?.date) facts.push(["날짜", ex.date]);
  if (ex?.time) facts.push(["시각", ex.time]);
  if (ex?.audience) facts.push(["대상", ex.audience]);
  if (ex?.headcount) facts.push(["인원", `${ex.headcount}명`]);
  if (ex?.amount) facts.push(["금액", ex.amount]);
  if (ex?.contact) facts.push(["연락처", ex.contact]);

  return (
    <article
      className={`rounded-[24px] bg-lifted p-6 shadow-card transition-opacity ${
        event.handled ? "opacity-55" : ""
      }`}
    >
      {/*
        머리글은 두 줄로 나눈다 — 한 줄에 종류·이름·시각을 다 넣으면 읽을 게 너무 많다.
        위: 이게 무엇인지(출처·유형·상태), 아래: 누가 언제 보냈는지.
      */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="rounded-pill border border-ink/12 bg-white px-2 py-0.5 text-[11px] font-medium text-slate">
            {SOURCE_LABELS[event.source]}
          </span>
          {event.category && (
            <span
              className={`rounded-pill border px-2 py-0.5 text-[11px] font-medium ${
                CATEGORY_STYLES[event.category]
              }`}
            >
              {event.category}
            </span>
          )}
          {event.status === "pending" && (
            <span className="rounded-pill border border-ink/12 px-2 py-0.5 text-[11px] text-slate">
              분류 중…
            </span>
          )}
          {event.status === "error" && (
            <span className="rounded-pill border border-mc-red/30 bg-mc-red/10 px-2 py-0.5 text-[11px] text-mc-red">
              분류 실패
            </span>
          )}
        </div>

        {!event.handled && (
          <span
            className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-signal"
            aria-label="확인하지 않음"
          />
        )}
      </div>

      <div className="mt-2.5 flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="text-[15px] font-medium tracking-[-0.01em] text-ink">
          {event.sender || "발신자 없음"}
        </span>
        <span className="text-[12px] text-slate">{fmtWhen(event.posted_at)}</span>
      </div>

      {/* 요약 */}
      <p className="mt-3 text-[18px] leading-[1.5] tracking-[-0.01em] text-ink">
        {event.summary || event.body}
      </p>

      {event.status === "error" && event.error && (
        <p className="mt-2 text-[13px] text-mc-red">{event.error}</p>
      )}

      {/* 추출된 값 */}
      {facts.length > 0 && (
        <dl className="mt-4 flex flex-wrap gap-2">
          {facts.map(([k, v]) => (
            <div
              key={k}
              className="flex items-baseline gap-1.5 rounded-pill bg-cream px-3 py-1.5 text-[13px]"
            >
              <dt className="text-slate">{k}</dt>
              <dd className="font-medium text-ink">{v}</dd>
            </div>
          ))}
        </dl>
      )}

      {/* 원문 */}
      {event.summary && (
        <>
          <button
            onClick={() => setShowBody((v) => !v)}
            className="mt-4 text-[13px] font-medium text-slate underline underline-offset-4 hover:text-ink"
          >
            {showBody ? "원문 접기" : "원문 보기"}
          </button>
          {showBody && (
            <p className="mt-3 whitespace-pre-wrap rounded-[16px] bg-cream p-4 text-[15px] leading-[1.65] text-charcoal">
              {event.body}
            </p>
          )}
        </>
      )}

      {/* 액션 */}
      <div className="mt-5 flex flex-wrap items-center gap-2">
        {!event.schedule_id && (
          <button
            onClick={() => setComposing((v) => !v)}
            className="rounded-pill bg-ink px-4 py-1.5 text-[13px] font-medium text-cream transition-transform active:scale-95"
          >
            일정으로 만들기
          </button>
        )}
        {event.schedule_id && (
          <Link
            href="/admin/calendar"
            className="rounded-pill border border-ink/15 bg-white px-3 py-1.5 text-[13px] font-medium text-ink hover:border-ink/40"
          >
            일정 등록됨 · 달력 열기
          </Link>
        )}

        <button
          className={ACTION_BTN}
          disabled={setHandled.isPending}
          onClick={() => setHandled.mutate({ id: event.id, handled: !event.handled })}
        >
          {event.handled ? "확인 취소" : "확인 완료"}
        </button>

        {/* 오분류 교정 */}
        <label className="ml-auto flex items-center gap-2 text-[13px] text-slate">
          유형 변경
          <select
            value={event.category ?? ""}
            disabled={setCategory.isPending}
            onChange={(e) =>
              setCategory.mutate({
                id: event.id,
                category: e.target.value as NotificationCategory,
              })
            }
            className="rounded-pill border border-ink/15 bg-white px-3 py-1.5 text-[13px] text-ink"
          >
            <option value="" disabled>
              선택
            </option>
            {NOTIFICATION_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
      </div>

      {composing && <ScheduleComposer event={event} onDone={() => setComposing(false)} />}
    </article>
  );
}

/** 추출된 날짜·기관을 채워 넣은 일정 생성 폼. 값이 없거나 틀렸을 수 있으니 항상 확인 후 저장. */
function ScheduleComposer({
  event,
  onDone,
}: {
  event: NotificationEvent;
  onDone: () => void;
}) {
  const ex = event.extracted;
  const [date, setDate] = useState(ex?.date ?? toISODate(new Date()));
  const [title, setTitle] = useState(
    [ex?.org ?? event.sender ?? "", ex?.audience ?? ""].filter(Boolean).join(" · ") || "강의",
  );
  const [memo, setMemo] = useState(
    [ex?.time ? `${ex.time} 시작` : "", event.summary ?? ""].filter(Boolean).join("\n"),
  );
  const [remind, setRemind] = useState(true);

  const create = useCreateScheduleFromEvent();
  const dateOk = isValidIsoDate(date);

  return (
    <div className="mt-5 rounded-[20px] border border-ink/10 bg-cream p-5">
      <div className="grid gap-3 sm:grid-cols-[160px_minmax(0,1fr)]">
        <label className="flex flex-col gap-1 text-[13px] text-slate">
          날짜
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-[14px] border border-ink/15 bg-white px-3 py-2 text-[15px] text-ink"
          />
        </label>
        <label className="flex flex-col gap-1 text-[13px] text-slate">
          제목
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="rounded-[14px] border border-ink/15 bg-white px-3 py-2 text-[15px] text-ink"
          />
        </label>
      </div>

      <label className="mt-3 flex flex-col gap-1 text-[13px] text-slate">
        메모
        <textarea
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          rows={2}
          className="rounded-[14px] border border-ink/15 bg-white px-3 py-2 text-[15px] leading-[1.5] text-ink"
        />
      </label>

      <label className="mt-3 flex items-center gap-2 text-[14px] text-ink">
        <input
          type="checkbox"
          checked={remind}
          onChange={(e) => setRemind(e.target.checked)}
          className="h-4 w-4 accent-[var(--color-signal)]"
        />
        당일 오전 7시에 알림
      </label>

      {!ex?.date && (
        <p className="mt-3 text-[13px] text-slate">
          메시지에서 날짜를 찾지 못했습니다. 직접 확인해서 골라주세요.
        </p>
      )}

      <div className="mt-4 flex items-center gap-2">
        <button
          disabled={!dateOk || !title.trim() || create.isPending}
          onClick={() =>
            create.mutate(
              {
                id: event.id,
                date,
                title: title.trim(),
                memo: memo.trim(),
                remindAt: remind ? reminderIsoFor(date) : null,
              },
              { onSuccess: onDone },
            )
          }
          className="rounded-pill bg-ink px-4 py-2 text-[14px] font-medium text-cream transition-transform active:scale-95 disabled:opacity-50"
        >
          {create.isPending ? "만드는 중…" : "일정 만들기"}
        </button>
        <button onClick={onDone} className={ACTION_BTN}>
          취소
        </button>
        {create.isError && (
          <span className="text-[13px] text-mc-red">
            {(create.error as Error).message}
          </span>
        )}
      </div>
    </div>
  );
}
