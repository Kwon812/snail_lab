"use server";

import { supabaseServerAuth } from "../../../_lib/supabase-server";
import {
  NOTIFICATION_COLUMNS,
  type NotificationCategory,
  type NotificationEvent,
} from "../../../_lib/notifications";

/**
 * 알림함(notification_events) 관리자 액션.
 * 조회·수정 모두 로그인 세션 클라이언트로 하므로 RLS가 그대로 보호한다.
 */

const LIST_LIMIT = 200;

export async function getNotifications(): Promise<NotificationEvent[]> {
  const supabase = await supabaseServerAuth();

  // status='filtered'는 인제스트가 걸러진 원문까지 저장하던 시절의 행이다. 지금은 1차 필터가
  // 저장 앞으로 옮겨가서 새로 생기지 않지만, 남아 있는 과거 기록이 목록에 섞이지 않게 뺀다.
  const { data, error } = await supabase
    .from("notification_events")
    .select(NOTIFICATION_COLUMNS)
    .neq("status", "filtered")
    .order("posted_at", { ascending: false })
    .limit(LIST_LIMIT);

  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as NotificationEvent[];
}

/** "확인 완료" — 읽음과 처리 완료를 한 상태로 합쳐서 다룬다. */
export async function setHandled(id: string, handled: boolean) {
  const supabase = await supabaseServerAuth();
  const { error } = await supabase
    .from("notification_events")
    .update({ handled, is_read: true })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

/** AI가 잘못 분류했을 때 직접 교정. */
export async function setCategory(id: string, category: NotificationCategory) {
  const supabase = await supabaseServerAuth();
  const { error } = await supabase
    .from("notification_events")
    .update({ category, status: "classified", confidence: 1, error: null })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export type ScheduleFromEventInput = {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  memo?: string;
  /** ISO datetime. null이면 알림 없음. */
  remindAt: string | null;
};

/**
 * 알림에서 뽑은 값으로 schedules에 일정을 만들고 알림과 연결한다.
 * 여기서 만든 일정은 기존 파이프라인(웹훅 → 조용한 푸시 → 앱 재동기화 → 로컬 알림)을 그대로 타므로,
 * 문의 도착부터 갤럭시 알림까지 한 흐름으로 이어진다.
 */
export async function createScheduleFromEvent(input: ScheduleFromEventInput) {
  const supabase = await supabaseServerAuth();

  const { data: schedule, error: scheduleError } = await supabase
    .from("schedules")
    .insert({
      date: input.date,
      title: input.title,
      memo: input.memo || null,
      remind_at: input.remindAt,
      remind_sent: false,
    })
    .select("id")
    .single();
  if (scheduleError) throw new Error(scheduleError.message);

  const { error } = await supabase
    .from("notification_events")
    .update({ schedule_id: schedule.id, handled: true, is_read: true })
    .eq("id", input.id);
  if (error) throw new Error(error.message);

  return schedule;
}
