"use client";

import { useMemo, useState } from "react";
import { Arrow, Eyebrow, Section } from "../../_components/ui";
import { Spinner } from "../../_components/spinner";
import { CustomSelect } from "./_components/CustomSelect";
import type { ScheduleItem } from "./_actions/schedules";
import {
    useCreateSchedule,
    useCreateRecurringSchedules,
    useDeleteSchedule,
    useImportLegacyCalendar,
    useSchedules,
    useSchedulesRealtime,
    useUpdateSchedule,
} from "./_hooks/schedules";
import {
    WEEKDAYS,
    CHIP_STYLES,
    toISO,
    fmtSelected,
    buildWeek,
    buildGrid,
    reminderIsoFor,
    hourMinuteFromIso,
    formatAmPmTime,
    DEFAULT_REMINDER_HOUR,
    DEFAULT_REMINDER_MINUTE,
    pad,
    datesWeekly,
    isValidIsoDate,
    MonthGrid,
} from "./_lib/shared";

export default function CalendarPage() {
    useSchedulesRealtime();
    const today = useMemo(() => new Date(), []);
    const [year, setYear] = useState(today.getFullYear());
    const [month, setMonth] = useState(today.getMonth());
    const [selected, setSelected] = useState(toISO(today));

    const grid = useMemo(() => buildGrid(year, month), [year, month]);
    const from = toISO(grid[0]);
    const to = toISO(grid[grid.length - 1]);

    const { data, isPending, isError, error } = useSchedules({ from, to });

    const byDate = useMemo(() => {
        const map = new Map<string, ScheduleItem[]>();
        for (const s of data ?? []) {
            const list = map.get(s.date) ?? [];
            list.push(s);
            map.set(s.date, list);
        }
        return map;
    }, [data]);

    const [weekAnchor, setWeekAnchor] = useState(today);
    const week = useMemo(() => buildWeek(weekAnchor), [weekAnchor]);
    const weekFrom = toISO(week[0]);
    const weekTo = toISO(week[week.length - 1]);
    const { data: weekData, isPending: isWeekPending, isError: isWeekError, error: weekError } = useSchedules({
        from: weekFrom,
        to: weekTo,
    });

    function prevWeek() {
        setWeekAnchor((d) => {
            const nd = new Date(d);
            nd.setDate(d.getDate() - 7);
            return nd;
        });
    }

    function nextWeek() {
        setWeekAnchor((d) => {
            const nd = new Date(d);
            nd.setDate(d.getDate() + 7);
            return nd;
        });
    }

    const weekByDate = useMemo(() => {
        const map = new Map<string, ScheduleItem[]>();
        for (const s of weekData ?? []) {
            const list = map.get(s.date) ?? [];
            list.push(s);
            map.set(s.date, list);
        }
        return map;
    }, [weekData]);

    function prevMonth() {
        setYear((y) => (month === 0 ? y - 1 : y));
        setMonth((m) => (m === 0 ? 11 : m - 1));
    }

    function nextMonth() {
        setYear((y) => (month === 11 ? y + 1 : y));
        setMonth((m) => (m === 11 ? 0 : m + 1));
    }

    function goToDate(d: Date) {
        setYear(d.getFullYear());
        setMonth(d.getMonth());
        setSelected(toISO(d));
    }

    const [editing, setEditing] = useState<ScheduleItem | null>(null);
    const [title, setTitle] = useState("");
    const [memo, setMemo] = useState("");
    const [remindEnabled, setRemindEnabled] = useState(true);
    const [remindHour, setRemindHour] = useState(DEFAULT_REMINDER_HOUR);
    const [remindMinute, setRemindMinute] = useState(DEFAULT_REMINDER_MINUTE);
    const [repeatEnabled, setRepeatEnabled] = useState(false);
    const [repeatUntil, setRepeatUntil] = useState("");
    const create = useCreateSchedule();
    const createRecurring = useCreateRecurringSchedules();
    const update = useUpdateSchedule();
    const del = useDeleteSchedule();
    const importLegacy = useImportLegacyCalendar();

    function startCreate() {
        setEditing(null);
        setTitle("");
        setMemo("");
        setRemindEnabled(true);
        setRemindHour(DEFAULT_REMINDER_HOUR);
        setRemindMinute(DEFAULT_REMINDER_MINUTE);
        setRepeatEnabled(false);
        setRepeatUntil("");
    }

    function startEdit(s: ScheduleItem) {
        setEditing(s);
        setTitle(s.title);
        setMemo(s.memo ?? "");
        setRemindEnabled(!!s.remind_at);
        if (s.remind_at) {
            const { hour, minute } = hourMinuteFromIso(s.remind_at);
            setRemindHour(hour);
            setRemindMinute(minute);
        } else {
            setRemindHour(DEFAULT_REMINDER_HOUR);
            setRemindMinute(DEFAULT_REMINDER_MINUTE);
        }
        setRepeatEnabled(false);
        setRepeatUntil("");
    }

    // 목록은 낙관적 업데이트로 바로 반영되니, 폼도 실제 서버 응답을 기다리지 않고 바로 비운다 —
    // 뮤테이션은 백그라운드에서 계속 진행되고, 실패하면 그때 알림만 띄운다.
    function onSubmit() {
        if (!title.trim()) return;
        let mutation: Promise<unknown>;
        if (editing) {
            const remindAt = remindEnabled ? reminderIsoFor(selected, remindHour, remindMinute) : null;
            mutation = update.mutateAsync({
                id: editing.id,
                input: { date: selected, title: title.trim(), memo: memo.trim(), remindAt },
            });
        } else if (repeatEnabled && repeatUntil) {
            const dates = datesWeekly(selected, repeatUntil).map((date) => ({
                date,
                remindAt: remindEnabled ? reminderIsoFor(date, remindHour, remindMinute) : null,
            }));
            mutation = createRecurring.mutateAsync({ title: title.trim(), memo: memo.trim(), dates });
        } else {
            const remindAt = remindEnabled ? reminderIsoFor(selected, remindHour, remindMinute) : null;
            mutation = create.mutateAsync({ date: selected, title: title.trim(), memo: memo.trim(), remindAt });
        }
        startCreate();
        mutation.catch((err) => alert(`저장 실패: ${(err as Error).message}`));
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

    async function onImport() {
        try {
            const res = await importLegacy.mutateAsync();
            alert(
                res.imported > 0
                    ? `${res.imported}건을 가져왔습니다. (중복 ${res.skipped}건 건너뜀)`
                    : `새로 가져올 일정이 없습니다. (중복 ${res.skipped}건)`,
            );
        } catch (err) {
            alert(`가져오기 실패: ${(err as Error).message}`);
        }
    }

    const selectedEvents = byDate.get(selected) ?? [];

    return (
        <Section className="pt-36 sm:pt-44">
            <Eyebrow>관리자 · 일정</Eyebrow>
            <h1 className="display mt-6 max-w-[18ch] text-[40px] leading-[1.02] sm:text-[56px]">
                강사 캘린더.
            </h1>
            <div className="mt-5 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
                <p className="max-w-[48ch] text-[17px] leading-[1.5] text-slate">
                    관리자만 볼 수 있는 개인 일정입니다. 날짜를 눌러 일정을 확인·추가·수정하세요.
                </p>
                <button
                    onClick={onImport}
                    disabled={importLegacy.isPending}
                    className="shrink-0 text-[13px] font-medium text-dust underline decoration-dust/60 underline-offset-4 transition-colors hover:text-slate disabled:opacity-50"
                >
                    {importLegacy.isPending ? "가져오는 중…" : "레거시 데이터 가져오기"}
                </button>
            </div>

            {/* 주간 일정 — 월간 달력과 동일한 격자 스타일 */}
            <div className="mt-10 flex flex-wrap items-end justify-between gap-4">
                <div>
                    <Eyebrow>이번 주</Eyebrow>
                    <h2 className="display mt-3 text-[24px]">주간 일정</h2>
                </div>
                <div className="flex items-center gap-2.5">
                    <button
                        onClick={prevWeek}
                        className="grid h-8 w-8 place-items-center rounded-full text-ink ring-1 ring-ink/10 transition-colors hover:bg-ink hover:text-cream"
                        aria-label="이전 주"
                    >
                        <Arrow className="h-4 w-4 rotate-180" />
                    </button>
                    <span className="text-[15px] font-medium text-slate">
                        {week[0].getMonth() + 1}월 {week[0].getDate()}일 – {week[6].getMonth() + 1}월 {week[6].getDate()}일
                    </span>
                    <button
                        onClick={nextWeek}
                        className="grid h-8 w-8 place-items-center rounded-full text-ink ring-1 ring-ink/10 transition-colors hover:bg-ink hover:text-cream"
                        aria-label="다음 주"
                    >
                        <Arrow className="h-4 w-4" />
                    </button>
                </div>
            </div>

            <div className="mt-6 rounded-stadium bg-lifted p-6 shadow-card ring-1 ring-ink/[0.06] sm:p-10">
                {isWeekPending ? (
                    <div className="flex justify-center py-16">
                        <Spinner size={40} />
                    </div>
                ) : isWeekError ? (
                    <p className="py-10 text-center text-[14px] text-slate">
                        일정을 불러오지 못했습니다 — {(weekError as Error).message}
                    </p>
                ) : (
                    <div className="grid grid-cols-7">
                        {WEEKDAYS.map((w) => (
                            <div
                                key={w}
                                className="border-b border-ink/10 py-2 text-center text-[13px] font-semibold uppercase tracking-[0.04em] text-slate"
                            >
                                {w}
                            </div>
                        ))}
                        {week.map((d) => {
                            const iso = toISO(d);
                            const events = weekByDate.get(iso) ?? [];
                            const isToday = iso === toISO(today);
                            return (
                                <button
                                    key={iso}
                                    onClick={() => goToDate(d)}
                                    className={`flex min-h-[92px] flex-col items-start gap-1.5 border-ink/10 p-1.5 text-left transition-colors sm:p-2  ${isToday ? "bg-signal/[0.08]" : "hover:bg-ink/[0.04]"}`}
                                >
                                    <span
                                        className={`flex h-7 w-7 items-center justify-center rounded-full text-[13px] font-semibold ${
                                            isToday ? "bg-signal text-cream" : "text-ink"
                                        }`}
                                    >
                                        {d.getDate()}
                                    </span>
                                    <span className="flex w-full flex-col gap-1">
                                        {events.map((e, i) => (
                                            <span
                                                key={e.id}
                                                className={`whitespace-normal break-words border-0! rounded-lg px-2 py-1 text-[10.5px] font-semibold leading-tight sm:text-[11px] ${CHIP_STYLES[i % CHIP_STYLES.length]}`}
                                            >
                                                {e.title}
                                            </span>
                                        ))}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            <div className="mt-10 flex flex-wrap items-end justify-between gap-4">
                <div>
                    <Eyebrow>이번 달</Eyebrow>
                    <h2 className="display mt-3 text-[24px]">월간 일정</h2>
                </div>
                <div className="flex items-center gap-2.5">
                    <button
                        onClick={prevMonth}
                        className="grid h-8 w-8 place-items-center rounded-full text-ink ring-1 ring-ink/10 transition-colors hover:bg-ink hover:text-cream"
                        aria-label="이전 달"
                    >
                        <Arrow className="h-4 w-4 rotate-180" />
                    </button>
                    <span className="text-[15px] font-medium text-slate">
                        {year}년 {month + 1}월
                    </span>
                    <button
                        onClick={nextMonth}
                        className="grid h-8 w-8 place-items-center rounded-full text-ink ring-1 ring-ink/10 transition-colors hover:bg-ink hover:text-cream"
                        aria-label="다음 달"
                    >
                        <Arrow className="h-4 w-4" />
                    </button>
                </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_380px] lg:items-start">
                {/* 달력 */}
                <div className="p-6 sm:p-10 rounded-stadium bg-lifted  shadow-card ring-1 ring-ink/[0.06] ">
                    {isPending ? (
                        <div className="flex justify-center py-20">
                            <Spinner size={44} />
                        </div>
                    ) : isError ? (
                        <p className="py-10 text-center text-[14px] text-slate">
                            일정을 불러오지 못했습니다 — {(error as Error).message}
                        </p>
                    ) : (
                        <div className="mt-8">
                            <MonthGrid
                                grid={grid}
                                month={month}
                                byDate={byDate}
                                selected={selected}
                                today={today}
                                onSelect={(d) => setSelected(toISO(d))}
                            />
                        </div>
                    )}
                </div>

                {/* 선택한 날의 일정 + 추가/수정 폼 */}
                <div className="flex flex-col gap-6">
                    <div className="rounded-stadium bg-lifted p-6 shadow-card ring-1 ring-ink/[0.06] sm:p-8">
                        <Eyebrow>{selectedEvents.length > 0 ? `일정 ${selectedEvents.length}건` : "일정"}</Eyebrow>
                        <h3 className="display mt-3 text-[24px]">{fmtSelected(selected)}</h3>
                        {selectedEvents.length === 0 ? (
                            <p className="mt-6 rounded-[16px] border border-dashed border-ink/20 p-6 text-center text-[14px] text-slate">
                                등록된 일정이 없습니다.
                            </p>
                        ) : (
                            <ul className="mt-6 flex flex-col border-t border-ink/15">
                                {selectedEvents.map((e) => {
                                    // 낙관적으로 추가된(서버 저장 전) 항목은 아직 진짜 uuid가 없어서, 이 상태로
                                    // 수정/삭제하면 서버에서 uuid 오류가 난다 — 저장이 끝날 때까지 액션을 막는다.
                                    const pending = e.id.startsWith("optimistic-");
                                    return (
                                    <li key={e.id}
                                        className="flex items-start justify-between gap-3 border-b border-ink/15 py-4">
                                        <div className="min-w-0">
                                            <p className="text-[15px] font-semibold leading-snug text-ink">{e.title}</p>
                                            {e.memo &&
                                                <p className="mt-1 text-[13px] leading-snug text-slate">{e.memo}</p>}
                                            {e.remind_at && (
                                                <p className="mt-1 text-[12px] font-medium text-signal">
                                                    🔔 당일 {formatAmPmTime(hourMinuteFromIso(e.remind_at).hour, hourMinuteFromIso(e.remind_at).minute)} 알림
                                                </p>
                                            )}
                                        </div>
                                        {pending ? (
                                            <span className="shrink-0 px-2.5 py-1 text-[12px] font-medium italic text-slate/70">저장 중…</span>
                                        ) : (
                                        <div className="flex shrink-0 gap-1">
                                            <button
                                                onClick={() => startEdit(e)}
                                                className="rounded-pill px-2.5 py-1 text-[12px] font-medium text-slate transition-colors hover:bg-cream hover:text-ink"
                                            >
                                                수정
                                            </button>
                                            <button
                                                onClick={() => onDelete(e)}
                                                className="rounded-pill px-2.5 py-1 text-[12px] font-medium text-slate transition-colors hover:bg-cream hover:text-signal"
                                            >
                                                삭제
                                            </button>
                                        </div>
                                        )}
                                    </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>

                    <div className="rounded-stadium bg-lifted p-6 shadow-card ring-1 ring-ink/[0.06] sm:p-8">
                        <h3 className="text-[16px] font-semibold text-ink">{editing ? "일정 수정" : "일정 추가"}</h3>
                        <div className="mt-5 flex flex-col gap-3">
                            <input
                                type="date"
                                value={selected}
                                onChange={(e) => {
                                    const v = e.target.value;
                                    if (!isValidIsoDate(v)) return;
                                    goToDate(new Date(`${v}T00:00:00`));
                                }}
                                className="w-full rounded-[14px] border border-ink/25 bg-white px-4 py-2.5 text-[14px] text-ink outline-none focus:border-ink/60"
                            />
                            <input
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="제목"
                                className="w-full rounded-[14px] border border-ink/25 bg-white px-4 py-2.5 text-[14px] text-ink outline-none placeholder:text-dust focus:border-ink/60"
                            />
                            <textarea
                                value={memo}
                                onChange={(e) => setMemo(e.target.value)}
                                placeholder="메모 (선택)"
                                rows={3}
                                className="w-full rounded-[14px] border border-ink/25 bg-white px-4 py-2.5 text-[14px] text-ink outline-none placeholder:text-dust focus:border-ink/60"
                            />
                            <button
                                onClick={() => setRemindEnabled((v) => !v)}
                                className={`flex items-center justify-between rounded-[14px] border px-4 py-2.5 text-[14px] font-medium transition-colors ${
                                    remindEnabled ? "border-transparent bg-signal text-cream" : "border-ink/25 bg-white text-ink"
                                }`}
                            >
                                <span>🔔 당일 {formatAmPmTime(remindHour, remindMinute)} 알림</span>
                                <span className="text-[12px]">{remindEnabled ? "켜짐" : "꺼짐"}</span>
                            </button>
                            {remindEnabled && (
                                <div className="flex gap-2">
                                    <CustomSelect
                                        className="w-[84px]"
                                        items={[
                                            { label: "오전", value: "AM" as const },
                                            { label: "오후", value: "PM" as const },
                                        ]}
                                        value={remindHour < 12 ? "AM" : "PM"}
                                        onChange={(period) => {
                                            const h12 = remindHour % 12 === 0 ? 12 : remindHour % 12;
                                            setRemindHour((h12 % 12) + (period === "PM" ? 12 : 0));
                                        }}
                                    />
                                    <CustomSelect
                                        className="flex-1"
                                        items={Array.from({ length: 12 }, (_, i) => i + 1).map((h) => ({
                                            label: `${h}시`,
                                            value: h,
                                        }))}
                                        value={remindHour % 12 === 0 ? 12 : remindHour % 12}
                                        onChange={(h12) => {
                                            const isPM = remindHour >= 12;
                                            setRemindHour((h12 % 12) + (isPM ? 12 : 0));
                                        }}
                                    />
                                    <CustomSelect
                                        className="flex-1"
                                        items={Array.from({ length: 12 }, (_, i) => i * 5).map((m) => ({
                                            label: `${pad(m)}분`,
                                            value: m,
                                        }))}
                                        value={remindMinute - (remindMinute % 5)}
                                        onChange={(m) => setRemindMinute(m)}
                                    />
                                </div>
                            )}
                            {!editing && (
                                <>
                                    <button
                                        onClick={() => setRepeatEnabled((v) => !v)}
                                        className={`flex items-center justify-between rounded-[14px] border px-4 py-2.5 text-[14px] font-medium transition-colors ${
                                            repeatEnabled
                                                ? "border-transparent bg-signal text-cream"
                                                : "border-ink/25 bg-white text-ink"
                                        }`}
                                    >
                                        <span>🔁 매주 {WEEKDAYS[new Date(`${selected}T00:00:00`).getDay()]}요일 반복</span>
                                        <span className="text-[12px]">{repeatEnabled ? "켜짐" : "꺼짐"}</span>
                                    </button>
                                    {repeatEnabled && (
                                        <label className="flex flex-col gap-1">
                                            <span className="text-[12px] font-medium text-slate">이 날짜까지 반복</span>
                                            <input
                                                type="date"
                                                value={repeatUntil}
                                                min={selected}
                                                onChange={(e) => {
                                                    const v = e.target.value;
                                                    if (v && !isValidIsoDate(v)) return;
                                                    setRepeatUntil(v);
                                                }}
                                                className="w-full rounded-[14px] border border-ink/25 bg-white px-4 py-2.5 text-[14px] text-ink outline-none focus:border-ink/60"
                                            />
                                        </label>
                                    )}
                                </>
                            )}
                            <div className="flex gap-2">
                                <button
                                    onClick={onSubmit}
                                    disabled={
                                        !title.trim() ||
                                        (repeatEnabled && !repeatUntil) ||
                                        create.isPending ||
                                        update.isPending ||
                                        createRecurring.isPending
                                    }
                                    className="flex-1 rounded-[20px] bg-ink px-4 py-2.5 text-[14px] font-medium text-cream transition-transform active:scale-[0.97] disabled:opacity-50"
                                >
                                    {editing ? "수정 저장" : "추가"}
                                </button>
                                {editing && (
                                    <button
                                        onClick={startCreate}
                                        className="rounded-[20px] border border-ink/25 px-4 py-2.5 text-[14px] text-ink transition-colors hover:border-ink/50"
                                    >
                                        취소
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Section>
    );
}
