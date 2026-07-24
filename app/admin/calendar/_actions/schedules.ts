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

export async function deleteSchedule(id: string) {
  const supabase = await supabaseServerAuth();
  const { error } = await supabase.from("schedules").delete().eq("id", id);
  if (error) throw new Error(error.message);
  return { id };
}

/**
 * 1회성: app/_data/calander.txt(구형 캘린더 앱 백업)를 파싱해 schedules에 채워 넣는다.
 * 이미 일정이 하나라도 있으면 중복 삽입을 막기 위해 실행하지 않는다.
 */
export async function importLegacyCalendar(): Promise<{ imported: number }> {
  const supabase = await supabaseServerAuth();

  const { count, error: countError } = await supabase
    .from("schedules")
    .select("id", { count: "exact", head: true });
  if (countError) throw new Error(countError.message);
  if (count && count > 0) return { imported: 0 };

  const filePath = path.join(process.cwd(), "app/_data/calander.txt");
  const raw = await readFile(filePath, "utf-8");
  const events = parseCalendarTxt(raw);

  const CHUNK = 200;
  for (let i = 0; i < events.length; i += CHUNK) {
    const chunk = events.slice(i, i + CHUNK);
    const { error } = await supabase.from("schedules").insert(chunk);
    if (error) throw new Error(error.message);
  }

  return { imported: events.length };
}
