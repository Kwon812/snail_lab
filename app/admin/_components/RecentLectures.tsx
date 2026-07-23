"use client";

import Link from "next/link";
import { useLectures, useDeleteLecture } from "../../lectures/_hooks/lectures";
import { Spinner } from "../../_components/spinner";

const FIELD_LABEL: Record<string, string> = {
  "media-literacy": "미디어 리터러시",
  "picture-book": "그림책",
  "child-psychology": "아동심리학",
};

export function RecentLectures() {
  const { data, isPending, isError, error } = useLectures();
  const del = useDeleteLecture();

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
        강의를 불러오지 못했습니다 — {(error as Error).message}
      </p>
    );
  }

  if (data.length === 0) {
    return (
      <p className="rounded-[20px] bg-lifted p-6 text-[15px] text-dust">
        아직 등록된 강의가 없습니다. 위에서 새 강의를 작성해 보세요.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {data.map((l) => (
        <li
          key={l.id}
          className="flex items-center justify-between gap-4 rounded-[20px] bg-lifted px-6 py-4 shadow-card"
        >
          <span className="flex min-w-0 items-center gap-3">
            <span
              className={`shrink-0 rounded-pill px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-[0.04em] ${
                l.status === "PUBLISHED" ? "bg-signal/10 text-signal" : "bg-bone text-slate"
              }`}
            >
              {l.status === "PUBLISHED" ? "발행됨" : "임시"}
            </span>
            <span className="truncate text-[16px] font-medium text-ink">{l.title}</span>
          </span>

          <div className="flex shrink-0 items-center gap-1">
            <span className="mr-2 hidden text-[13px] text-slate sm:inline">
              {FIELD_LABEL[l.field] ?? l.field}
            </span>
            <Link
              href={`/admin/lectures/new?id=${l.id}`}
              className="rounded-pill px-3 py-1.5 text-[13px] font-medium text-ink transition-colors hover:bg-white"
            >
              수정
            </Link>
            <button
              onClick={() => {
                if (confirm(`"${l.title}" 강의를 삭제할까요?`)) del.mutate(l.id);
              }}
              disabled={del.isPending}
              className="rounded-pill px-3 py-1.5 text-[13px] font-medium text-slate transition-colors hover:bg-white hover:text-signal disabled:opacity-50"
            >
              {del.isPending && del.variables === l.id ? "삭제 중…" : "삭제"}
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
