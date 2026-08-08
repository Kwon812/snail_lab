"use server";

import { revalidatePath } from "next/cache";
import { supabaseServerAuth } from "../../../_lib/supabase-server";
import { revokeOpenAIAccess } from "../../../_lib/openai-admin";

export type VibeStudent = {
  id: string;
  name: string;
  phone: string;
  course_id: string;
  status: "PENDING" | "ISSUING" | "ISSUED" | "BLOCKED";
  issued_at: string | null;
  budget_blocked_at: string | null;
  created_at: string;
};

export type VibeStudentInput = {
  name: string;
  phone: string;
  courseId: string;
};

function normalizePhone(raw: string): string {
  return raw.replace(/\D/g, "");
}

/** 관리자 전용: 사전 등록된 수강생 전체 목록. */
export async function getVibeStudents(): Promise<VibeStudent[]> {
  const supabase = await supabaseServerAuth();
  const { data, error } = await supabase
    .from("vibe_students")
    .select("id, name, phone, course_id, status, issued_at, budget_blocked_at, created_at")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

/** 수강생 사전 등록 — 본인인증 페이지에서 이 값과 정확히 일치해야 키가 발급된다. */
export async function registerVibeStudent(input: VibeStudentInput) {
  const supabase = await supabaseServerAuth();
  const { data, error } = await supabase
    .from("vibe_students")
    .insert({
      name: input.name.trim().normalize("NFC"),
      phone: normalizePhone(input.phone),
      course_id: input.courseId.trim().normalize("NFC"),
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error("이미 같은 이름·전화번호·과정으로 등록된 수강생입니다.");
    }
    throw new Error(error.message);
  }
  revalidatePath("/admin/vibe-coding");
  revalidatePath("/admin");
  return data;
}

/**
 * 등록 정보를 지운다 — 발급된 프로젝트가 있으면 DB 행뿐 아니라 OpenAI 쪽 키(service account)도
 * 지우고 프로젝트도 archive한다. 실패를 조용히 삼키지 않는다 — service account 삭제가
 * 실패하면 그 키는 여전히 살아있을 수 있으니 revokeFailed를 true로 돌려줘서 화면에서
 * 관리자에게 경고를 보여준다(등록 정보 자체는 그래도 지운다 — DB 행이 없어도 OpenAI 쪽 정리는
 * 별도로 필요하다는 뜻).
 */
export async function deleteVibeStudent(id: string) {
  const supabase = await supabaseServerAuth();
  const { data: student, error: fetchError } = await supabase
    .from("vibe_students")
    .select("openai_project_id, openai_service_account_id")
    .eq("id", id)
    .single();
  if (fetchError) throw new Error(fetchError.message);

  let revokeFailed = false;
  if (student.openai_project_id) {
    try {
      await revokeOpenAIAccess(student.openai_project_id, student.openai_service_account_id);
    } catch {
      revokeFailed = true;
    }
  }

  const { error } = await supabase.from("vibe_students").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/vibe-coding");
  revalidatePath("/admin");
  return { id, revokeFailed };
}

/**
 * 기존 OpenAI 키를 지우고 프로젝트를 archive한 뒤 상태를 PENDING으로 되돌려 본인인증
 * 페이지에서 다시 발급받을 수 있게 한다. 세 가지 상황에서 같은 동작을 재사용한다:
 *  ① 발급된 키를 분실했을 때 ② 예산 초과로 BLOCKED된 학생을 풀어줄 때
 *  ③ 주차가 끝나서 이번 주 프로젝트를 마감하고 다음 주 발급을 준비할 때("주차 마감")
 * BLOCKED는 학생 스스로 못 풀고 반드시 이 관리자 액션을 거쳐야 한다 — 예산 초과 셀프 우회 방지.
 *
 * 실패를 조용히 삼키지 않는다 — service account 삭제가 실패하면 DB는 그대로 PENDING으로
 * 되돌리지만(재발급 자체는 막지 않기 위해), revokeFailed를 true로 돌려줘서 "예전 키가 아직
 * 살아있을 수 있다"는 걸 화면에서 관리자에게 알린다.
 */
export async function resetVibeStudent(id: string) {
  const supabase = await supabaseServerAuth();
  const { data: student, error: fetchError } = await supabase
    .from("vibe_students")
    .select("openai_project_id, openai_service_account_id")
    .eq("id", id)
    .single();
  if (fetchError) throw new Error(fetchError.message);

  let revokeFailed = false;
  if (student.openai_project_id) {
    try {
      await revokeOpenAIAccess(student.openai_project_id, student.openai_service_account_id);
    } catch {
      revokeFailed = true;
    }
  }

  const { error } = await supabase
    .from("vibe_students")
    .update({
      status: "PENDING",
      openai_project_id: null,
      openai_service_account_id: null,
      openai_api_key_id: null,
      issued_at: null,
      budget_blocked_at: null,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/vibe-coding");
  revalidatePath("/admin");
  return { id, revokeFailed };
}
