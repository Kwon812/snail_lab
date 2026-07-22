"use server";

import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";

export type LecturePlan = {
  field: string;
  title: string;
  level: string;
  mode: string;
  target: string;
  intro: string;
  curriculum: string[];
};

const LecturePlanSchema = z.object({
  field: z.string().describe("강의 분야/카테고리 (예: 미디어 리터러시, 그림책, 아동심리학). 계획서에서 가장 잘 맞는 한 가지."),
  title: z.string().describe("강의 제목"),
  level: z.string().describe("대상 수준 (예: 학부모·교사, 초등학생, 입문). 명시 없으면 빈 문자열."),
  mode: z.string().describe("진행 방식. '온라인' / '오프라인' / '온라인 · 오프라인' 중 가장 가까운 하나. 불명확하면 '오프라인'."),
  target: z.string().describe("수강 대상을 한 줄로 요약."),
  intro: z.string().describe("강의 소개를 1~2문단으로. 계획서 개요/목표를 자연스러운 한국어로 정리."),
  curriculum: z.array(z.string()).describe("회차/주차별 커리큘럼 항목 배열. 각 항목은 한 줄 요약."),
});

const PROMPT = `첨부한 강의계획서(PDF)를 읽고, 강의 등록 폼을 채우기 위한 정보를 추출하세요.
- 한국어로 정리합니다.
- 계획서에 없는 항목은 빈 문자열(또는 빈 배열)로 두세요. 추측해서 지어내지 마세요.
- 커리큘럼은 회차/주차 순서대로, 각 회차를 한 줄로 요약합니다.
- mode는 '온라인' / '오프라인' / '온라인 · 오프라인' 중 하나로만.`;

/**
 * 강의계획서 PDF를 분석해 폼 초안(구조화 데이터)을 반환.
 * 관리자 전용(작성 화면에서만 호출). 키는 서버에서만 사용.
 */
export async function extractLecturePlan(formData: FormData): Promise<LecturePlan> {
  if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY.includes("sk-ant-...")) {
    throw new Error("ANTHROPIC_API_KEY가 설정되지 않았습니다. .env에 키를 넣어주세요.");
  }

  const file = formData.get("pdf");
  if (!(file instanceof File)) throw new Error("PDF 파일이 필요합니다.");
  if (file.type !== "application/pdf") throw new Error("PDF 파일만 업로드할 수 있습니다.");
  if (file.size > 10 * 1024 * 1024) throw new Error("파일이 너무 큽니다 (최대 10MB).");

  const bytes = new Uint8Array(await file.arrayBuffer());

  const { object } = await generateObject({
    model: anthropic(process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001"),
    schema: LecturePlanSchema,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: PROMPT },
          { type: "file", data: bytes, mediaType: "application/pdf", filename: file.name },
        ],
      },
    ],
  });

  return object;
}
