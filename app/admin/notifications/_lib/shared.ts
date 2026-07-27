import type { NotificationCategory } from "../../../_lib/notifications";

/** 카테고리별 칩 색상 — 목록을 훑을 때 유형이 색으로 먼저 읽히도록. */
export const CATEGORY_STYLES: Record<NotificationCategory, string> = {
  강의문의: "bg-signal/15 text-clay border-signal/25",
  시간조율: "bg-linkblue/12 text-linkblue border-linkblue/25",
  강의취소: "bg-mc-red/10 text-mc-red border-mc-red/25",
  강사모집: "bg-signal-light/20 text-clay border-signal-light/30",
  강의확정: "bg-charcoal/10 text-charcoal border-charcoal/20",
  "정산/계약": "bg-mc-yellow/15 text-clay border-mc-yellow/30",
  기타: "bg-ink/6 text-slate border-ink/12",
};

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** 알림이 뜬 시각을 "방금 / 12분 전 / 3시간 전 / 어제 14:30 / 7월 12일" 로. */
export function fmtWhen(iso: string): string {
  const then = new Date(iso);
  const diffMin = Math.floor((Date.now() - then.getTime()) / 60_000);

  if (diffMin < 1) return "방금";
  if (diffMin < 60) return `${diffMin}분 전`;

  const now = new Date();
  const sameDay =
    then.getFullYear() === now.getFullYear() &&
    then.getMonth() === now.getMonth() &&
    then.getDate() === now.getDate();
  if (sameDay) return `${Math.floor(diffMin / 60)}시간 전`;

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    then.getFullYear() === yesterday.getFullYear() &&
    then.getMonth() === yesterday.getMonth() &&
    then.getDate() === yesterday.getDate();
  if (isYesterday) return `어제 ${pad(then.getHours())}:${pad(then.getMinutes())}`;

  return `${then.getMonth() + 1}월 ${then.getDate()}일`;
}

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** 일정 알림 기본값 — 캘린더 화면과 같은 "당일 오전 7시". */
export const DEFAULT_REMINDER_HOUR = 7;

export function reminderIsoFor(date: string, hour: number = DEFAULT_REMINDER_HOUR): string | null {
  const d = new Date(`${date}T${pad(hour)}:00:00`);
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
}

export function isValidIsoDate(v: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  return !isNaN(new Date(`${v}T00:00:00`).getTime());
}
