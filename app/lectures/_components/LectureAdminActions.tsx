"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { deleteLecture } from "../_actions/lectures";
import { AdminOnly } from "../../_components/admin-gate";

/** Edit / delete controls for a single lecture, shown only to a logged-in admin. */
export function LectureAdminActions({ id, className = "" }: { id: string; className?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function onDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("이 강의를 삭제할까요?")) return;
    start(async () => {
      await deleteLecture(id);
      router.refresh();
    });
  }

  return (
    <AdminOnly>
      <div className={`flex items-center gap-1 ${className}`}>
        <Link
          href={`/admin/lectures/new?id=${id}`}
          className="rounded-pill bg-white/90 px-3 py-1.5 text-[13px] font-medium text-ink shadow ring-1 ring-ink/10 transition-colors hover:bg-white"
        >
          수정
        </Link>
        <button
          onClick={onDelete}
          disabled={pending}
          className="rounded-pill bg-white/90 px-3 py-1.5 text-[13px] font-medium text-slate shadow ring-1 ring-ink/10 transition-colors hover:text-signal disabled:opacity-50"
        >
          {pending ? "삭제 중…" : "삭제"}
        </button>
      </div>
    </AdminOnly>
  );
}

/** "새 강의 작성" button, admin-only. */
export function NewLectureButton({ className = "" }: { className?: string }) {
  return (
    <AdminOnly>
      <Link
        href="/admin/lectures/new"
        className={`inline-flex items-center gap-1.5 rounded-pill bg-ink px-5 py-2 text-[14px] font-medium text-cream transition-transform active:scale-95 ${className}`}
      >
        + 새 강의 작성
      </Link>
    </AdminOnly>
  );
}
