import { supabaseAdmin } from "../../../_lib/supabase-admin";
import { classifyNotification } from "./classify";

/**
 * 저장된 알림 한 건을 분류하고 결과를 반영한다.
 * 실패해도 예외를 밖으로 던지지 않는다 — 원문은 이미 저장돼 있고, status만 error로 남겨
 * 관리자 페이지에서 "재분류"로 복구할 수 있게 하는 편이 낫다.
 */
export async function classifyAndSave(
  id: string,
  sender: string | null,
  body: string,
): Promise<void> {
  const supabase = supabaseAdmin();
  try {
    const c = await classifyNotification(sender, body);
    await supabase
      .from("notification_events")
      .update({
        status: "classified",
        category: c.category,
        confidence: c.confidence,
        summary: c.summary,
        extracted: c.extracted,
        needs_action: c.needs_action,
        filter_reason: null,
        error: null,
      })
      .eq("id", id);
  } catch (e) {
    await supabase
      .from("notification_events")
      .update({
        status: "error",
        error: e instanceof Error ? e.message : String(e),
      })
      .eq("id", id);
  }
}
