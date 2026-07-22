"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deletePost, getPosts } from "../../_actions/posts";
import { Spinner } from "../../_components/spinner";
import { Arrow } from "../../_components/ui";

export function RecentPosts() {
  const qc = useQueryClient();
  const { data, isPending, isError, error } = useQuery({
    queryKey: ["posts"],
    queryFn: () => getPosts(),
  });

  const del = useMutation({
    mutationFn: (id: string) => deletePost(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["posts"] }),
  });

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
        글을 불러오지 못했습니다 — {(error as Error).message}
      </p>
    );
  }

  if (data.length === 0) {
    return (
      <p className="rounded-[20px] bg-lifted p-6 text-[15px] text-dust">
        아직 작성된 글이 없습니다. 위에서 새 글을 작성해 보세요.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {data.map((p) => (
        <li
          key={p.id}
          className="flex items-center justify-between gap-4 rounded-[20px] bg-lifted px-6 py-4 shadow-card"
        >
          <Link href={`/blog/${p.slug}`} className="group flex min-w-0 items-center gap-3">
            <span
              className={`shrink-0 rounded-pill px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-[0.04em] ${
                p.status === "PUBLISHED" ? "bg-signal/10 text-signal" : "bg-bone text-slate"
              }`}
            >
              {p.status === "PUBLISHED" ? "발행됨" : "임시"}
            </span>
            <span className="truncate text-[16px] font-medium text-ink group-hover:text-signal">
              {p.title}
            </span>
          </Link>

          <div className="flex shrink-0 items-center gap-1">
            <span className="mr-2 hidden text-[13px] text-slate sm:inline">{p.category}</span>
            <Link
              href={`/admin/blog/new?id=${p.id}`}
              className="rounded-pill px-3 py-1.5 text-[13px] font-medium text-ink transition-colors hover:bg-white"
            >
              수정
            </Link>
            <button
              onClick={() => {
                if (confirm(`"${p.title}" 글을 삭제할까요?`)) del.mutate(p.id);
              }}
              disabled={del.isPending}
              className="rounded-pill px-3 py-1.5 text-[13px] font-medium text-slate transition-colors hover:bg-white hover:text-signal disabled:opacity-50"
            >
              {del.isPending && del.variables === p.id ? "삭제 중…" : "삭제"}
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
