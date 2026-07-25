"use server";

import { readFile } from "node:fs/promises";
import path from "node:path";
import { supabaseServerAuth } from "../../../_lib/supabase-server";
import { parseCalendarTxt } from "../_lib/parseCalendarTxt";

export type ScheduleItem = {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  memo: string | null;
  remind_at: string | null; // ISO datetime — 설정 시 이 시각에 푸시 알림 발송
  created_at: string;
};

export type ScheduleInput = {
  date: string;
  title: string;
  memo?: string;
  /** 지정하지 않으면(undefined) 기존 알림 설정을 건드리지 않는다. null이면 알림 해제. */
  remindAt?: string | null;
};

/** 일정 목록 (관리자 전용). year-month 범위로 좁혀서 조회. */
export async function getSchedules(range?: { from: string; to: string }): Promise<ScheduleItem[]> {
  const supabase = await supabaseServerAuth();
  let query = supabase
    .from("schedules")
    .select("id, date, title, memo, remind_at, created_at")
    .order("date", { ascending: true });
  if (range) query = query.gte("date", range.from).lte("date", range.to);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createSchedule(input: ScheduleInput) {
  const supabase = await supabaseServerAuth();
  const { data, error } = await supabase
    .from("schedules")
    .insert({
      date: input.date,
      title: input.title,
      memo: input.memo || null,
      ...(input.remindAt !== undefined ? { remind_at: input.remindAt, remind_sent: false } : {}),
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateSchedule(id: string, input: ScheduleInput) {
  const supabase = await supabaseServerAuth();
  const { error } = await supabase
    .from("schedules")
    .update({
      date: input.date,
      title: input.title,
      memo: input.memo || null,
      ...(input.remindAt !== undefined ? { remind_at: input.remindAt, remind_sent: false } : {}),
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
  return { id };
}

export type RecurringScheduleInput = {
  title: string;
  memo?: string;
  /** 각 회차의 날짜와(설정했다면) 그 회차의 알림 시각 — 반복 계산은 클라이언트에서 미리 해서 넘긴다. */
  dates: { date: string; remindAt: string | null }[];
};

/** 반복 일정 — 계산된 날짜 목록만큼 schedules 행을 한 번에 만든다(진짜 "반복 일정"이 아니라 개별 행 여러 개). */
export async function createRecurringSchedules(input: RecurringScheduleInput): Promise<{ created: number }> {
  const supabase = await supabaseServerAuth();
  const rows = input.dates.map((d) => ({
    date: d.date,
    title: input.title,
    memo: input.memo || null,
    remind_at: d.remindAt,
    remind_sent: false,
  }));

  const CHUNK = 200;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const { error } = await supabase.from("schedules").insert(rows.slice(i, i + CHUNK));
    if (error) throw new Error(error.message);
  }

  return { created: rows.length };
}

export async function deleteSchedule(id: string) {
  const supabase = await supabaseServerAuth();
  const { error } = await supabase.from("schedules").delete().eq("id", id);
  if (error) throw new Error(error.message);
  return { id };
}

/** 가져온 일정의 알림은 항상 "당일 오전 7시(KST)"로 고정. 서버는 UTC라 오프셋을 명시해야 한다. */
const IMPORT_REMIND_AT_KST = "T07:00:00+09:00";

/** 같은 일정인지 판단하는 키 — 공백 차이(줄바꿈·연속 공백)는 무시하고 날짜+제목으로 비교. */
function dedupeKey(date: string, title: string): string {
  return `${date}|${title.replace(/\s+/g, " ").trim()}`;
}

/**
 * app/_data/calander.txt(구형 캘린더 앱 백업)를 파싱해 schedules에 채워 넣는다.
 *
 * 여러 번 돌려도 안전하다: 기존 행은 건드리지 않고, DB에 이미 같은 (날짜+제목)이 있으면 건너뛴다.
 * 백업 파일을 새로 받아 덮어쓴 뒤 다시 실행하면 "새로 생긴 일정만" 추가된다.
 *
 * 알림은 새로 넣는 행 전부에 당일 오전 7시로 켜 둔다. 과거 날짜도 그대로 넣는데, 앱(choi-media-
 * calendar-app)의 getUpcomingReminders가 "지금 ~ 7일 이내"의 remind_at만 조회해서 로컬알람을
 * 예약하므로 지난 날짜가 알람으로 울릴 일은 없다.
 */
export async function importLegacyCalendar(): Promise<{ imported: number; skipped: number }> {
  const supabase = await supabaseServerAuth();

  const filePath = path.join(process.cwd(), "app/_data/calander.txt");
  const raw = await readFile(filePath, "utf-8");
  const events = parseCalendarTxt(raw);
  if (events.length === 0) return { imported: 0, skipped: 0 };

  const dates = events.map((e) => e.date).sort();
  const from = dates[0];
  const to = dates[dates.length - 1];

  // 파일과 겹치는 기간의 기존 일정만 읽어서 중복 판정에 쓴다(전체를 다 읽을 필요 없음).
  const existing = new Set<string>();
  const PAGE = 1000;
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await supabase
      .from("schedules")
      .select("date, title")
      .gte("date", from)
      .lte("date", to)
      .order("date", { ascending: true })
      .range(offset, offset + PAGE - 1);
    if (error) throw new Error(error.message);
    for (const row of data ?? []) existing.add(dedupeKey(row.date, row.title));
    if (!data || data.length < PAGE) break;
  }

  const seen = new Set<string>();
  const rows: { date: string; title: string; remind_at: string; remind_sent: boolean }[] = [];

  for (const e of events) {
    const key = dedupeKey(e.date, e.title);
    if (existing.has(key) || seen.has(key)) continue; // DB에 이미 있거나 파일 안에서 중복
    seen.add(key);
    rows.push({
      date: e.date,
      title: e.title,
      remind_at: `${e.date}${IMPORT_REMIND_AT_KST}`,
      remind_sent: false,
    });
  }

  const CHUNK = 200;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const { error } = await supabase.from("schedules").insert(rows.slice(i, i + CHUNK));
    if (error) throw new Error(error.message);
  }

  return { imported: rows.length, skipped: events.length - rows.length };
}
