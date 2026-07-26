import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { NOTIFICATION_CATEGORIES } from "../../../_lib/notifications";

/**
 * 2차 분류 — 1차 필터를 통과한 메시지만 AI로 유형을 나누고 필요한 값을 뽑는다.
 * 기존 app/lectures/_actions/lecture-ai.ts의 generateObject 패턴을 그대로 따른다.
 */

const ClassificationSchema = z.object({
  category: z
    .enum(NOTIFICATION_CATEGORIES)
    .describe("메시지의 성격에 가장 가까운 하나."),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe("분류 확신도. 애매하면 0.5 미만으로 낮춰라."),
  summary: z
    .string()
    .describe("무엇을 요구하는 메시지인지 한 문장으로. 30자 내외, 명사형 종결."),
  extracted: z.object({
    org: z.string().nullable().describe("기관·학교·단체명. 없으면 null"),
    date: z
      .string()
      .nullable()
      .describe("언급된 강의 날짜를 YYYY-MM-DD로 정규화. 없으면 null"),
    time: z.string().nullable().describe("언급된 시각을 HH:mm(24시간제)으로. 없으면 null"),
    audience: z.string().nullable().describe("수강 대상 (예: 초등 4학년, 학부모). 없으면 null"),
    headcount: z.number().nullable().describe("인원 수. 없으면 null"),
    contact: z.string().nullable().describe("전화번호·이메일 등 회신처. 없으면 null"),
    amount: z.string().nullable().describe("강사료·금액. 원문 표현 그대로. 없으면 null"),
  }),
  needs_action: z.boolean().describe("강사의 회신·확인이 필요한 메시지인지"),
});

export type Classification = z.infer<typeof ClassificationSchema>;

/** 상대 날짜("다음 주 화요일")를 해석하려면 오늘이 언제인지 알려줘야 한다. 기준은 한국 시간. */
function todayInSeoul(): string {
  // sv-SE 로케일이 YYYY-MM-DD 형식을 준다.
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul" }).format(new Date());
}

function buildPrompt(sender: string | null, body: string): string {
  return `강사(최미선)에게 카카오톡/문자로 온 메시지 하나를 분류합니다.

[카테고리 정의]
- 강의문의  : 새 강의를 의뢰하거나 가능 여부·조건을 묻는 첫 연락
- 시간조율  : 이미 얘기된 강의의 날짜·시간·장소를 바꾸거나 맞추는 대화
- 강의취소  : 예정된 강의의 취소·무산·연기 통보
- 강사모집  : 기관이 강사를 공개 모집·공고하는 안내 (개별 의뢰가 아님)
- 강의확정  : 일정·조건이 확정됐다는 통보, 또는 확정 요청에 대한 수락
- 정산/계약 : 강사료·계약서·세금계산서·서류 제출 등 행정 처리
- 기타      : 위 어디에도 명확히 들어가지 않음

[규칙]
- 추측해서 지어내지 마세요. 메시지에 없는 정보는 반드시 null.
- 날짜는 오늘(${todayInSeoul()}, 한국 시간) 기준으로 해석합니다. "다음 주 화요일" → 실제 날짜로 변환.
- 연도가 없으면 가장 가까운 미래로 봅니다.
- 두 카테고리에 걸치면 "지금 이 메시지가 요구하는 행동"을 기준으로 하나만 고릅니다.
- 애매하면 '기타' + confidence를 낮게. 억지로 끼워 맞추지 마세요.
- 알림 하나에는 대화의 마지막 메시지만 담겨 있을 수 있습니다. 맥락이 부족하면 confidence를 낮추세요.

[발신] ${sender ?? "(없음)"}
[본문] ${body}`;
}

export async function classifyNotification(
  sender: string | null,
  body: string,
): Promise<Classification> {
  if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY.includes("sk-ant-...")) {
    throw new Error("ANTHROPIC_API_KEY가 설정되지 않았습니다.");
  }

  const { object } = await generateObject({
    model: anthropic(process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001"),
    schema: ClassificationSchema,
    prompt: buildPrompt(sender, body),
  });

  return object;
}
