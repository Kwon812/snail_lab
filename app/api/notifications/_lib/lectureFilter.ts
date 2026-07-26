import type { FilterReason } from "../../../_lib/notifications";

/**
 * 1차 필터 — 강의 관련 메시지인지 키워드로 판정한다. AI 호출 전에 여기서 대부분이 걸러진다.
 *
 * 앱이 아니라 서버에 두는 이유:
 *  1. 키워드·임계값은 실사용하며 계속 손보게 되는데, 앱에 있으면 그때마다 EAS 빌드 → APK 설치다.
 *  2. 걸러진 것도 notification_events에 filtered로 남으므로, 관리자 페이지에서 "놓친 문의"를
 *     확인하고 그 자리에서 규칙을 고칠 수 있다. 앱에서 버리면 기록 자체가 남지 않는다.
 *
 * 앱에는 앞으로 바뀔 일이 없는 구조적 규칙만 둔다(패키지 화이트리스트, 묶음 요약·상시 알림 플래그,
 * 5자 미만·한글 없음, 중복 해시). 규칙이 안정되면 그때 아래 키워드도 앱으로 내릴 수 있다.
 */

// 광고·인증·결제 안내. 이게 걸리면 키워드가 몇 개 맞아도 무조건 제외한다.
const BLOCK = /\(광고\)|\[광고\]|무료\s?수신거부|수신\s?거부|인증\s?번호|인증코드|카드승인|승인취소|결제\s?완료|출금|입금액|택배|배송\s?완료|운송장|주문\s?번호/;

// 카톡이 "알림 미리보기 숨김" 상태일 때 본문 대신 오는 문구들.
const NO_CONTENT = /^(새로운? 메시지|메시지 ?\d*개?|알림|사진|이모티콘|동영상|파일)$/;

// 강한 키워드 — 하나만 있어도 통과(2점).
const STRONG = /강의|강사|특강|강연|출강|연수|초빙|섭외|수업|강사료|정산/g;

// 약한 키워드 — 두 개 이상이어야 통과(개당 1점, 최대 3점).
const WEAK = /워크[숍샵]|일정|시간|견적|사례비|계약|세금계산서|학교|도서관|유치원|어린이집|학부모|아이들|그림책|리터러시|미디어|교육청|평생학습|복지관|문의|요청|가능하실|취소|연기|확정|커리큘럼|계획서|회차|섭외|일자|장소/g;

/** 통과 기준 점수. 강한 키워드 1개 = 2점, 약한 키워드 2개 = 2점. */
export const PASS_SCORE = 2;

export type FilterResult =
  | { pass: true; score: number }
  | { pass: false; reason: FilterReason; score: number };

export function lectureFilter(sender: string | null, body: string): FilterResult {
  const trimmed = body.trim();
  if (NO_CONTENT.test(trimmed)) return { pass: false, reason: "no_content", score: 0 };

  // 발신자(방 이름)에도 "○○초등학교" 같은 단서가 있으므로 함께 본다.
  const text = `${sender ?? ""} ${trimmed}`;
  if (BLOCK.test(text)) return { pass: false, reason: "blocked", score: 0 };

  // 같은 단어가 반복돼도 점수가 부풀지 않도록 고유 매치만 센다.
  const uniq = (re: RegExp) => new Set(text.match(re) ?? []).size;
  const score = uniq(STRONG) * 2 + Math.min(uniq(WEAK), 3);

  return score >= PASS_SCORE
    ? { pass: true, score }
    : { pass: false, reason: "low_score", score };
}
