import type {ScheduleItem} from "../_actions/schedules";

export const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

// 같은 날짜 안에 일정이 여러 개일 때 구분되도록 순서대로 돌려 쓰는 칩 색상.
export const CHIP_STYLES = [
    "border-l-2 border-l-signal/[0.3]  bg-signal/[0.15] text-clay",
    "border-l-2 border-l-linkblue/[0.3] bg-linkblue/[0.12] text-linkblue",
    "border-l-2 border-l-charcoal/[0.3] bg-charcoal/[0.1] text-charcoal",
    "border-l-2 border-l-signal-light/[0.4] bg-signal-light/[0.2] text-clay",
];

export function pad(n: number): string {
    return String(n).padStart(2, "0");
}

export function toISO(d: Date): string {
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// 알림은 시간 선택 없이 고정 — 일정 날짜의 당일 오전 8시.
export const REMINDER_HOUR = 8;

export function reminderIsoFor(date: string): string {
    return new Date(`${date}T${String(REMINDER_HOUR).padStart(2, "0")}:00:00`).toISOString();
}

/** base 월에서 offset개월만큼 이동한 { year, month }. */
export function shiftMonth(base: Date, offset: number): { year: number; month: number } {
    const d = new Date(base.getFullYear(), base.getMonth() + offset, 1);
    return {year: d.getFullYear(), month: d.getMonth()};
}

export function fmtSelected(iso: string): string {
    const d = new Date(`${iso}T00:00:00`);
    return `${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEKDAYS[d.getDay()]})`;
}

export function buildWeek(anchor: Date): Date[] {
    const start = new Date(anchor);
    start.setDate(anchor.getDate() - anchor.getDay());
    return Array.from({length: 7}, (_, i) => {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        return d;
    });
}

export function buildGrid(year: number, month: number): Date[] {
    const first = new Date(year, month, 1);
    const gridStart = new Date(first);
    gridStart.setDate(first.getDate() - first.getDay());

    const last = new Date(year, month + 1, 0);
    const gridEnd = new Date(last);
    gridEnd.setDate(last.getDate() + (6 - last.getDay()));

    const days: Date[] = [];
    const cur = new Date(gridStart);
    while (cur <= gridEnd) {
        days.push(new Date(cur));
        cur.setDate(cur.getDate() + 1);
    }
    return days;
}

export function MonthGrid({
                              grid,
                              month,
                              byDate,
                              selected,
                              today,
                              onSelect,
                              isMoblie = false
                          }: {
    grid: Date[];
    month: number;
    byDate: Map<string, ScheduleItem[]>;
    selected: string;
    today: Date;
    onSelect: (d: Date) => void;
    isMoblie?: boolean;
}) {
    return (
        <div className={isMoblie ? "flex h-full flex-col" : ""}>
            <div className="grid grid-cols-7">
                {WEEKDAYS.map((w) => (
                    <div
                        key={w}
                        className="border-b border-ink/10 py-2 text-center text-[13px] font-semibold uppercase tracking-[0.04em] text-slate"
                    >
                        {w}
                    </div>
                ))}
            </div>
            <div className={`grid grid-cols-7 ${isMoblie ? "flex-1 auto-rows-fr" : ""}`}>
                {grid.map((d, i) => {
                    const iso = toISO(d);
                    const inMonth = d.getMonth() === month;
                    const events = byDate.get(iso) ?? [];
                    const isSelected = iso === selected;
                    const isToday = iso === toISO(today);
                    const isLastRow = i >= grid.length - 7;
                    return (
                        <button
                            key={iso}
                            onClick={() => onSelect(d)}
                            className={`flex ${isMoblie ? "h-full" : "h-[92px] sm:h-[108px]"} flex-col items-start gap-1.5 overflow-hidden border-ink/10 p-1 md:p-1.5 text-left transition-colors  ${isLastRow ? "" : "border-b"} ${
                                isSelected
                                    ? "bg-signal/[0.16]"
                                    : isToday
                                        ? "hover:bg-signal/[0.14]"
                                        : "hover:bg-ink/[0.04]"
                            } ${!inMonth ? "opacity-20" : ""}`}
                        >
              <span className="flex w-full items-center justify-between">
                <span
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-[13px] font-semibold ${
                        isSelected || isToday ? "bg-signal text-cream" : "text-ink"
                    }`}
                >
                  {d.getDate()}
                </span>
                  {events.length > (isMoblie ? 4 : 2) && (
                      <span className="pr-1 text-[10.5px] font-semibold text-slate">
                    +{events.length - (isMoblie ? 4 : 2)}
                  </span>
                  )}
              </span>
                            <span className="flex w-full flex-col gap-1">
                {events.slice(0, (isMoblie ? 4 : 2)).map((e, i) => (
                    <span
                        key={e.id}
                        className={`truncate  ${!isMoblie && 'rounded-full border-0!'} px-2 py-0.5 text-[10.5px] font-semibold leading-tight sm:text-[11px] ${CHIP_STYLES[i % CHIP_STYLES.length]} `}
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
    );
}
