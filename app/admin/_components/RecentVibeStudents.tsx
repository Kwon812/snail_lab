"use client";

import Link from "next/link";
import { useVibeStudents } from "../vibe-coding/_hooks/students";
import { Spinner } from "../../_components/spinner";

export function RecentVibeStudents() {
  const { data, isPending, isError, error } = useVibeStudents();

  if (isPending) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size={52} />
      </div>
    );
  }

  if (isError) {
    return (
      <p className="rounded-[20px] bg-lifted p-6 text-[15px] text-slate">
        목록을 불러오지 못했습니다 — {(error as Error).message}
      </p>
    );
  }

  if (data.length === 0) {
    return (
      <p className="rounded-[20px] bg-lifted p-6 text-[15px] text-dust">
        아직 등록된 수강생이 없습니다. 위에서 &quot;바이브 코딩&quot;을 눌러 등록해 보세요.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {data.slice(0, 6).map((s) => (
        <li
          key={s.id}
          className="flex items-center justify-between gap-4 rounded-[20px] bg-lifted px-6 py-4 shadow-card"
        >
          <span className="flex min-w-0 items-center gap-3">
            <span
              className={`shrink-0 rounded-pill px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-[0.04em] ${
                s.status === "ISSUED"
                  ? "bg-signal/10 text-signal"
                  : s.status === "BLOCKED"
                    ? "bg-red-100 text-red-700"
                    : "bg-bone text-slate"
              }`}
            >
              {s.status === "ISSUED" ? "발급완료" : s.status === "BLOCKED" ? "예산초과" : "대기중"}
            </span>
            <span className="truncate text-[16px] font-medium text-ink">{s.name}</span>
          </span>
          <span className="shrink-0 truncate text-[13px] text-slate">{s.course_id}</span>
        </li>
      ))}
      {data.length > 6 && (
        <Link
          href="/admin/vibe-coding"
          className="mt-1 self-end text-[13px] font-medium text-ink underline underline-offset-2"
        >
          전체 {data.length}명 보기
        </Link>
      )}
    </ul>
  );
}
