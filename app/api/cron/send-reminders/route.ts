import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { supabaseAdmin } from "../../../_lib/supabase-admin";

export const dynamic = "force-dynamic";

/**
 * Vercel Cron이 주기적으로 호출. remind_at이 지났고 아직 안 보낸 일정을 찾아
 * 등록된 모든 기기(push_subscriptions)로 웹 푸시를 보낸다.
 */
export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
  const vapidSubject = process.env.VAPID_SUBJECT;
  if (!vapidPublic || !vapidPrivate || !vapidSubject) {
    return NextResponse.json({ error: "vapid env not configured" }, { status: 500 });
  }
  webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);

  const supabase = supabaseAdmin();

  const { data: due, error: dueError } = await supabase
    .from("schedules")
    .select("id, title, date, remind_at")
    .eq("remind_sent", false)
    .not("remind_at", "is", null)
    .lte("remind_at", new Date().toISOString());
  if (dueError) return NextResponse.json({ error: dueError.message }, { status: 500 });
  if (!due || due.length === 0) return NextResponse.json({ sent: 0, schedules: 0 });

  const { data: subs, error: subsError } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth");
  if (subsError) return NextResponse.json({ error: subsError.message }, { status: 500 });

  let sent = 0;
  const deadSubIds: string[] = [];

  for (const schedule of due) {
    const payload = JSON.stringify({
      title: "오늘 수업",
      body: schedule.title,
      url: "/admin/calendar/app",
    });

    for (const sub of subs ?? []) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
        );
        sent++;
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) deadSubIds.push(sub.id);
      }
    }

    await supabase.from("schedules").update({ remind_sent: true }).eq("id", schedule.id);
  }

  if (deadSubIds.length > 0) {
    await supabase.from("push_subscriptions").delete().in("id", deadSubIds);
  }

  return NextResponse.json({ sent, schedules: due.length, prunedSubscriptions: deadSubIds.length });
}
