/**
 * 구형 캘린더 앱(터치캘린더류)의 텍스트 백업 포맷 파서.
 *
 * 레코드는 물리적 줄이 "63 n w " 또는 "63 d "로 시작할 때 새로 시작하고,
 * 그렇지 않은 줄은 직전 레코드의 연속(제목이 여러 줄에 걸침)으로 취급한다.
 * "63 d " 레코드는 제목이 없는 반복 일정의 완료 표시라 가져올 내용이 없다.
 */

const RECORD_START = /^63 (n w|d)\b/;
const DATE_RE = /^63 n w 양력\s*(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/;
// "일" 뒤 4개 플래그 + (알람: ...) + 알람표시 + (시간: ...) + 고정 13개 숫자 필드 → 그 다음이 제목
const PREFIX_RE =
  /^63 n w 양력 \d{4}년 \d{1,2}월 \d{1,2}일\s+-?\d+\s+-?\d+\s+-?\d+\s+-?\d+\s+\(알람:[^)]*\)\s+-?\d+\s+\(시간:[^)]*\)\s+(?:-?\d+\s+){13}/;

export type ParsedEvent = { date: string; title: string };

function toRecords(raw: string): string[] {
  const records: string[] = [];
  let current: string[] = [];
  for (const line of raw.split(/\r?\n/)) {
    if (RECORD_START.test(line)) {
      if (current.length) records.push(current.join("\n"));
      current = [line];
    } else if (current.length) {
      current.push(line);
    }
  }
  if (current.length) records.push(current.join("\n"));
  return records;
}

export function parseCalendarTxt(raw: string): ParsedEvent[] {
  const events: ParsedEvent[] = [];
  for (const rec of toRecords(raw)) {
    if (!rec.startsWith("63 n w ")) continue; // "63 d " 등은 스킵

    const dateMatch = rec.match(DATE_RE);
    const prefixMatch = rec.match(PREFIX_RE);
    if (!dateMatch || !prefixMatch) continue;

    const [, y, mo, d] = dateMatch;
    const title = rec
      .slice(prefixMatch[0].length)
      .split("┙")[0]
      .replace(/\s+/g, " ")
      .trim();
    if (!title) continue;

    const date = `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
    events.push({ date, title });
  }
  return events;
}
