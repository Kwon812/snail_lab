"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { deletePost } from "../_actions/posts";
import { AdminOnly } from "../../_components/admin-gate";

/**
 * Edit / delete controls for a single post, shown only to a logged-in admin.
 * `afterDelete`: "refresh" (stay, revalidate list) or "blog" (go to /blog).
 */
export function PostAdminActions({
  id,
  className = "",
  afterDelete = "refresh",
}: {
  id: string;
  className?: string;
  afterDelete?: "refresh" | "blog";
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function onDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("이 글을 삭제할까요?")) return;
    start(async () => {
      await deletePost(id);
      if (afterDelete === "blog") router.push("/blog");
      else router.refresh();
    });
  }

  return (
    <AdminOnly>
      <div className={`flex items-center gap-1 ${className}`}>
        <Link
          href={`/admin/blog/new?id=${id}`}
          onClick={(e) => e.stopPropagation()}
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

/** "새 글 작성" button, admin-only. */
export function NewPostButton({ className = "" }: { className?: string }) {
  return (
    <AdminOnly>
      <Link
        href="/admin/blog/new"
        className={`inline-flex items-center gap-1.5 rounded-pill bg-ink px-5 py-2 text-[14px] font-medium text-cream transition-transform active:scale-95 ${className}`}
      >
        + 새 글 작성
      </Link>
    </AdminOnly>
  );
}
