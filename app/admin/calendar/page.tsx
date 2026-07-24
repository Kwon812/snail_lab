"use client";

import { useMemo, useState } from "react";
import { Arrow, Eyebrow, Section } from "../../_components/ui";
import { Spinner } from "../../_components/spinner";
import type { ScheduleItem } from "./_actions/schedules";
import {
    useCreateSchedule,
    useDeleteSchedule,
    useImportLegacyCalendar,
    useSchedules,
    useUpdateSchedule,
} from "./_hooks/schedules";
import { WEEKDAYS, CHIP_STYLES, toISO, fmtSelected, buildWeek, buildGrid, MonthGrid } from "./_lib/shared";

export default function CalendarPage() {
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
    const { data: weekData } = useSchedules({ from: weekFrom, to: weekTo });

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
    const create = useCreateSchedule();
    const update = useUpdateSchedule();
    const del = useDeleteSchedule();
    const importLegacy = useImportLegacyCalendar();

    function startCreate() {
        setEditing(null);
        setTitle("");
        setMemo("");
    }

    function startEdit(s: ScheduleItem) {
        setEditing(s);
        setTitle(s.title);
        setMemo(s.memo ?? "");
    }

    async function onSubmit() {
        if (!title.trim()) return;
        try {
            if (editing) {
                await update.mutateAsync({
                    id: editing.id,
                    input: { date: selected, title: title.trim(), memo: memo.trim() },
                });
            } else {
                await create.mutateAsync({ date: selected, title: title.trim(), memo: memo.trim() });
            }
            startCreate();
        } catch (err) {
            alert(`저장 실패: ${(err as Error).message}`);
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

    async function onImport() {
        try {
            const res = await importLegacy.mutateAsync();
            alert(res.imported > 0 ? `${res.imported}건을 가져왔습니다.` : "이미 일정이 있어 건너뛰었습니다.");
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
                    모바일에서는{" "}
                    <a href="/admin/calendar/app" className="underline decoration-dust/60 underline-offset-4 hover:text-ink">
                        앱 전용 화면
                    </a>
                    을 이용하세요.
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
                                {selectedEvents.map((e) => (
                                    <li key={e.id}
                                        className="flex items-start justify-between gap-3 border-b border-ink/15 py-4">
                                        <div className="min-w-0">
                                            <p className="text-[15px] font-semibold leading-snug text-ink">{e.title}</p>
                                            {e.memo &&
                                                <p className="mt-1 text-[13px] leading-snug text-slate">{e.memo}</p>}
                                        </div>
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
                                    </li>
                                ))}
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
                                    if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return;
                                    const d = new Date(`${v}T00:00:00`);
                                    if (isNaN(d.getTime())) return;
                                    goToDate(d);
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
