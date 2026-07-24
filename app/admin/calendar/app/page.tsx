"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Eyebrow } from "../../../_components/ui";
import { Spinner } from "../../../_components/spinner";
import type { ScheduleItem } from "../_actions/schedules";
import { useCreateSchedule, useDeleteSchedule, useSchedules, useUpdateSchedule } from "../_hooks/schedules";
import { useSubscribePush, useUnsubscribePush } from "../_hooks/push";
import { toISO, fmtSelected, buildGrid, shiftMonth, MonthGrid } from "../_lib/shared";
import { urlBase64ToUint8Array, subscriptionToInput } from "../_lib/push";

// 알림은 시간 선택 없이 고정 — 일정 날짜의 당일 오전 8시.
const REMINDER_HOUR = 8;

function reminderIsoFor(date: string): string {
    return new Date(`${date}T${String(REMINDER_HOUR).padStart(2, "0")}:00:00`).toISOString();
}

// 오늘 기준 앞뒤로 이 만큼의 개월을 이어붙여 스크롤로 넘길 수 있게 한다.
const MONTHS_BEFORE = 6;
const MONTHS_AFTER = 6;

/**
 * 모바일 전용 월간 캘린더 — 나중에 PWA로 홈 화면에 추가해서 쓸 앱 화면.
 * 마케팅 사이트 chrome(Nav/Footer) 없이 달력만 꽉 채워 보여준다. (app/_components/nav.tsx, footer.tsx 에서 이 경로를 감지해 숨김)
 * 월 이동은 버튼이 아니라 세로 스크롤로 — 여러 달을 이어붙여 렌더링한다.
 */
export default function CalendarAppPage() {
    const today = useMemo(() => new Date(), []);
    const [selected, setSelected] = useState(toISO(today));
    const [dialogOpen, setDialogOpen] = useState(false);

    const months = useMemo(
        () => Array.from({ length: MONTHS_BEFORE + MONTHS_AFTER + 1 }, (_, i) => shiftMonth(today, i - MONTHS_BEFORE)),
        [today],
    );

    const grids = useMemo(() => months.map(({ year, month }) => ({ year, month, grid: buildGrid(year, month) })), [months]);

    const from = toISO(grids[0].grid[0]);
    const to = toISO(grids[grids.length - 1].grid[grids[grids.length - 1].grid.length - 1]);
    const { data, isPending, isError, error } = useSchedules({ from, to });

    // 처음 들어오면 스크롤을 맨 위(제일 이전 달)가 아니라 이번 달부터 보이게 점프시킨다.
    // 달 목록은 로딩이 끝나야 렌더되므로 isPending이 풀린 뒤에 실행해야 한다.
    const currentMonthRef = useRef<HTMLElement | null>(null);
    useLayoutEffect(() => {
        if (isPending) return;
        currentMonthRef.current?.scrollIntoView({ block: "start" });
    }, [isPending]);

    const byDate = useMemo(() => {
        const map = new Map<string, ScheduleItem[]>();
        for (const s of data ?? []) {
            const list = map.get(s.date) ?? [];
            list.push(s);
            map.set(s.date, list);
        }
        return map;
    }, [data]);

    const [editing, setEditing] = useState<ScheduleItem | null>(null);
    const [title, setTitle] = useState("");
    const [remindEnabled, setRemindEnabled] = useState(false);
    const create = useCreateSchedule();
    const update = useUpdateSchedule();
    const del = useDeleteSchedule();

    function startCreate() {
        setEditing(null);
        setTitle("");
        setRemindEnabled(false);
    }

    function startEdit(s: ScheduleItem) {
        setEditing(s);
        setTitle(s.title);
        setRemindEnabled(!!s.remind_at);
    }

    function openDay(d: Date) {
        setSelected(toISO(d));
        startCreate();
        setDialogOpen(true);
    }

    function closeDialog() {
        setDialogOpen(false);
        startCreate();
    }

    async function onSubmit() {
        if (!title.trim()) return;
        try {
            const remindAtIso = remindEnabled ? reminderIsoFor(selected) : null;
            if (editing) {
                await update.mutateAsync({
                    id: editing.id,
                    input: { date: selected, title: title.trim(), memo: editing.memo ?? undefined, remindAt: remindAtIso },
                });
            } else {
                await create.mutateAsync({ date: selected, title: title.trim(), remindAt: remindAtIso });
            }
            startCreate();
        } catch (err) {
            alert(`저장 실패: ${(err as Error).message}`);
        }
    }

    // ---- 웹 푸시 구독 (알림 켜기/끄기) ----
    // 브라우저 지원 여부는 서버에서 알 수 없으니 false로 시작(SSR과 동일한 첫 렌더) → 마운트 후 effect에서 갱신.
    const [pushSupported, setPushSupported] = useState(false);
    const [pushEnabled, setPushEnabled] = useState(false);
    const [pushBusy, setPushBusy] = useState(false);
    const subscribePush = useSubscribePush();
    const unsubscribePush = useUnsubscribePush();

    useEffect(() => {
        const supported = "serviceWorker" in navigator && "PushManager" in window;
        setPushSupported(supported);
        if (!supported) return;
        navigator.serviceWorker.register("/sw.js").then(async (reg) => {
            const sub = await reg.pushManager.getSubscription();
            setPushEnabled(!!sub);
        });
    }, []);

    async function togglePush() {
        const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!vapidKey) {
            alert("알림 설정이 안 되어 있습니다 (VAPID 키 없음).");
            return;
        }
        setPushBusy(true);
        try {
            const reg = await navigator.serviceWorker.ready;
            if (pushEnabled) {
                const sub = await reg.pushManager.getSubscription();
                if (sub) {
                    await unsubscribePush.mutateAsync(sub.endpoint);
                    await sub.unsubscribe();
                }
                setPushEnabled(false);
                return;
            }

            const permission = await Notification.requestPermission();
            if (permission !== "granted") {
                alert("알림 권한이 허용되지 않았습니다.");
                return;
            }
            const sub = await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
            });
            await subscribePush.mutateAsync(subscriptionToInput(sub));
            setPushEnabled(true);
        } catch (err) {
            alert(`알림 설정 실패: ${(err as Error).message}`);
        } finally {
            setPushBusy(false);
        }
    }

    async function onDelete(s: ScheduleItem) {
        if (!confirm(`"${s.title}" 일정을 삭제할까요?`)) return;
        try {
            await del.mutateAsync(s);
            if (editing?.id === s.id) startCreate();
        } catch (err) {
            alert(`삭제 실패: ${(err as Error).message}`);
        }
    }

    const selectedEvents = byDate.get(selected) ?? [];

    return (
        <div className="h-[100dvh] snap-y snap-mandatory overflow-y-scroll bg-cream">
            {pushSupported && (
                <button
                    onClick={togglePush}
                    disabled={pushBusy}
                    aria-label={pushEnabled ? "알림 끄기" : "알림 켜기"}
                    className={`fixed right-3 top-[calc(env(safe-area-inset-top)+12px)] z-40 grid h-10 w-10 place-items-center rounded-full text-[18px] shadow-pill ring-1 ring-ink/10 transition-colors disabled:opacity-50 ${
                        pushEnabled ? "bg-signal text-cream" : "bg-white text-ink"
                    }`}
                >
                    {pushEnabled ? "🔔" : "🔕"}
                </button>
            )}

            {isPending ? (
                <div className="flex h-[100dvh] items-center justify-center">
                    <Spinner size={40} />
                </div>
            ) : isError ? (
                <p className="p-6 text-center text-[14px] text-slate">
                    일정을 불러오지 못했습니다 — {(error as Error).message}
                </p>
            ) : (
                grids.map(({ year, month, grid }, i) => (
                    <section
                        key={`${year}-${month}`}
                        ref={i === MONTHS_BEFORE ? currentMonthRef : undefined}
                        className="flex h-[100dvh] snap-start flex-col"
                    >
                        <h2 className="display shrink-0 pb-1 pl-1 text-center pt-[calc(env(safe-area-inset-top)+12px)] text-[32px] text-ink">
                            {year}년 {month + 1}월
                        </h2>
                        <div className="min-h-0 flex-1">
                            <MonthGrid isMoblie grid={grid} month={month} byDate={byDate} selected={selected} today={today} onSelect={openDay} />
                        </div>
                    </section>
                ))
            )}

            {dialogOpen && (
                <div className="fixed inset-0 z-50 flex items-end bg-ink/40" onClick={closeDialog}>
                    <div
                        className="max-h-[88vh] w-full overflow-y-auto rounded-t-[28px] bg-cream p-6 pb-[calc(env(safe-area-inset-bottom)+24px)]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-ink/15" />
                        <div className="flex items-center justify-between">
                            <h3 className="display text-[22px]">{fmtSelected(selected)}</h3>
                            <button
                                onClick={closeDialog}
                                className="grid h-8 w-8 place-items-center rounded-full text-slate transition-colors active:bg-ink/5"
                                aria-label="닫기"
                            >
                                ✕
                            </button>
                        </div>

                        <Eyebrow>{selectedEvents.length > 0 ? `일정 상세 · ${selectedEvents.length}건` : "일정 상세"}</Eyebrow>
                        {selectedEvents.length === 0 ? (
                            <p className="mt-4 rounded-[16px] border border-dashed border-ink/20 p-6 text-center text-[14px] text-slate">
                                등록된 일정이 없습니다.
                            </p>
                        ) : (
                            <ul className="mt-4 flex flex-col gap-3">
                                {selectedEvents.map((e) => (
                                    <li
                                        key={e.id}
                                        className="flex items-start justify-between gap-3 rounded-[18px] bg-white p-4 shadow-pill ring-1 ring-ink/[0.06]"
                                    >
                                        <div className="min-w-0">
                                            <p className="text-[18px] font-bold leading-snug text-ink">{e.title}</p>
                                            {e.memo && <p className="mt-1 text-[13px] leading-snug text-slate">{e.memo}</p>}
                                            {e.remind_at && (
                                                <p className="mt-1 text-[12px] font-medium text-signal">🔔 당일 오전 8시 알림</p>
                                            )}
                                        </div>
                                        <div className="flex shrink-0 gap-1">
                                            <button
                                                onClick={() => startEdit(e)}
                                                className="rounded-pill px-2.5 py-1 text-[12px] font-medium text-slate transition-colors active:bg-cream active:text-ink"
                                            >
                                                수정
                                            </button>
                                            <button
                                                onClick={() => onDelete(e)}
                                                className="rounded-pill px-2.5 py-1 text-[12px] font-medium text-slate transition-colors active:bg-cream active:text-signal"
                                            >
                                                삭제
                                            </button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}

                        <div className="mt-6">
                            <h4 className="text-[15px] font-semibold text-ink">{editing ? "일정 수정" : "일정 추가"}</h4>
                            <div className="mt-3 flex flex-col gap-3">
                                <textarea
                                    autoFocus
                                    rows={2}
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="일정내용"
                                    className="w-full rounded-[14px] border  border-ink/25 bg-white px-4 py-2.5 text-[14px] text-ink outline-none placeholder:text-dust focus:border-ink/60"
                                />
                                <button
                                    onClick={() => setRemindEnabled((v) => !v)}
                                    className={`flex items-center justify-between rounded-[14px] border px-4 py-2.5 text-[14px] font-medium transition-colors ${
                                        remindEnabled
                                            ? "border-transparent bg-signal text-cream"
                                            : "border-ink/25 bg-white text-ink"
                                    }`}
                                >
                                    <span>🔔 당일 오전 8시 알림</span>
                                    <span className="text-[12px]">{remindEnabled ? "켜짐" : "꺼짐"}</span>
                                </button>
                                <div className="flex gap-2">
                                    <button
                                        onClick={onSubmit}
                                        disabled={!title.trim() || create.isPending || update.isPending}
                                        className="flex-1 rounded-[20px] bg-ink px-4 py-2.5 text-[14px] font-medium text-cream transition-transform active:scale-[0.97] disabled:opacity-50"
                                    >
                                        {editing ? "수정 저장" : "추가"}
                                    </button>
                                    {editing && (
                                        <button
                                            onClick={startCreate}
                                            className="rounded-[20px] border border-ink/25 px-4 py-2.5 text-[14px] text-ink transition-colors active:border-ink/50"
                                        >
                                            취소
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
