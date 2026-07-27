"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Eyebrow, Section } from "../../_components/ui";
import { Spinner } from "../../_components/spinner";
import { NOTIFICATION_CATEGORIES, type NotificationCategory } from "../../_lib/notifications";
import { EventCard } from "./_components/EventCard";
import { useNotifications, useNotificationsRealtime } from "./_hooks/notifications";

type Tab = NotificationCategory | "전체";

export default function NotificationsPage() {
  useNotificationsRealtime();

  const [tab, setTab] = useState<Tab>("전체");

  const { data, isPending, isError, error } = useNotifications();

  const items = useMemo(() => data ?? [], [data]);

  const visible = useMemo(() => {
    const inTab = tab === "전체" ? items : items.filter((e) => e.category === tab);

    // 확인 완료한 건은 목록 아래로 내린다. sort가 안정 정렬이므로 각 그룹 안에서는
    // 서버가 준 순서(posted_at 내림차순 = 최신순)가 그대로 유지된다.
    return [...inTab].sort((a, b) => Number(a.handled) - Number(b.handled));
  }, [items, tab]);

  const stats = useMemo(
    () => ({
      total: items.length,
      unhandled: items.filter((e) => !e.handled).length,
    }),
    [items],
  );

  const countFor = (t: Tab): number =>
    t === "전체" ? items.length : items.filter((e) => e.category === t).length;

  return (
    <Section className="pb-32 pt-36 sm:pt-44">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Eyebrow>관리자</Eyebrow>
          <h1 className="display mt-5 text-[40px] leading-[1.02] sm:text-[56px]">알림함</h1>
          <p className="mt-5 max-w-[52ch] text-[17px] leading-[1.5] text-slate">
            갤럭시에 도착한 카톡·문자 중 강의 관련으로 판단된 메시지입니다. 새 알림은 실시간으로 올라옵니다.
          </p>
        </div>
        <Link
          href="/admin"
          className="rounded-pill border border-ink/15 bg-white px-4 py-2 text-[14px] font-medium text-ink transition-colors hover:border-ink/40"
        >
          관리자 홈
        </Link>
      </div>

      <div className="mt-10 flex flex-wrap gap-3">
        <Stat label="전체 수신" value={stats.total} />
        <Stat label="미확인" value={stats.unhandled} accent />
      </div>

      <div className="no-scrollbar mt-8 flex items-center gap-2 overflow-x-auto pb-1">
        {(["전체", ...NOTIFICATION_CATEGORIES] as Tab[]).map((t) => {
          const active = tab === t;
          const n = countFor(t);
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`shrink-0 rounded-pill border px-4 py-2 text-[14px] font-medium transition-colors ${
                active
                  ? "border-ink bg-ink text-cream"
                  : "border-ink/15 bg-white text-ink hover:border-ink/40"
              }`}
            >
              {t}
              {n > 0 && (
                <span className={active ? "ml-2 text-cream/70" : "ml-2 text-slate"}>{n}</span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-8">
        {isPending ? (
          <div className="flex justify-center py-20">
            <Spinner />
          </div>
        ) : isError ? (
          <p className="py-20 text-center text-[15px] text-mc-red">
            불러오지 못했습니다 — {(error as Error).message}
          </p>
        ) : visible.length === 0 ? (
          <p className="py-20 text-center text-[16px] text-slate">
            {tab === "전체"
              ? "아직 도착한 알림이 없습니다."
              : `${tab}에 해당하는 알림이 없습니다.`}
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {visible.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
        )}
      </div>
    </Section>
  );
}

function Stat({ label, value, accent = false }: { label: string; value: number; accent?: boolean }) {
  return (
    <div
      className={`rounded-[20px] px-5 py-4 ${
        accent && value > 0 ? "bg-signal text-white" : "bg-lifted text-ink"
      }`}
    >
      <div className={`text-[13px] ${accent && value > 0 ? "text-white/75" : "text-slate"}`}>
        {label}
      </div>
      <div className="mt-1 text-[26px] font-medium leading-none tabular-nums">{value}</div>
    </div>
  );
}
