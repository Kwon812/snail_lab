/**
 * 갤럭시 앱이 가로챈 카톡/문자 알림(notification_events)의 공용 타입.
 * 인제스트 라우트와 /admin/notifications가 같은 정의를 쓰도록 여기에 모아둔다.
 */

export const NOTIFICATION_CATEGORIES = [
  "강의문의",
  "시간조율",
  "강의취소",
  "강사모집",
  "강의확정",
  "정산/계약",
  "기타",
] as const;

export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];

/**
 * "filtered"는 과거 값이다 — 예전엔 1차 필터에 걸린 원문도 일단 저장하고 status만 바꿨는데,
 * 개인정보 때문에 필터를 저장 앞으로 옮기면서(ingest/route.ts) 새로 생기지 않는다.
 * 남아 있는 과거 행 때문에 타입은 유지한다.
 */
export type NotificationStatus = "pending" | "classified" | "filtered" | "error";

/** 1차 필터에서 걸린 이유. 위와 같은 이유로 과거 행에만 남아 있다. */
export type FilterReason = "blocked" | "no_content" | "low_score";

export type NotificationSource = "kakao" | "sms" | "band" | "other";

export type NotificationExtracted = {
  org: string | null;
  date: string | null; // YYYY-MM-DD
  time: string | null; // HH:mm
  audience: string | null;
  headcount: number | null;
  contact: string | null;
  amount: string | null;
};

export type NotificationEvent = {
  id: string;
  device_id: string;
  app_package: string;
  source: NotificationSource;
  sender: string | null;
  body: string;
  posted_at: string;
  status: NotificationStatus;
  filter_reason: FilterReason | null;
  filter_score: number | null;
  category: NotificationCategory | null;
  confidence: number | null;
  summary: string | null;
  extracted: NotificationExtracted | null;
  needs_action: boolean;
  is_read: boolean;
  handled: boolean;
  schedule_id: string | null;
  error: string | null;
  created_at: string;
};

/** 조회할 때 쓰는 컬럼 목록 — 서버 액션과 라우트가 같은 모양을 돌려주도록 한 곳에서 관리. */
export const NOTIFICATION_COLUMNS =
  "id, device_id, app_package, source, sender, body, posted_at, status, filter_reason, " +
  "filter_score, category, confidence, summary, extracted, needs_action, is_read, handled, " +
  "schedule_id, error, created_at";

const KAKAO_PACKAGES = new Set(["com.kakao.talk"]);
const SMS_PACKAGES = new Set([
  "com.samsung.android.messaging",
  "com.google.android.apps.messaging",
  "com.android.mms",
]);
const BAND_PACKAGES = new Set(["com.nhn.android.band"]);

export function sourceFromPackage(appPackage: string): NotificationSource {
  if (KAKAO_PACKAGES.has(appPackage)) return "kakao";
  if (SMS_PACKAGES.has(appPackage)) return "sms";
  if (BAND_PACKAGES.has(appPackage)) return "band";
  return "other";
}

export const SOURCE_LABELS: Record<NotificationSource, string> = {
  kakao: "카톡",
  sms: "문자",
  band: "밴드",
  other: "기타",
};
