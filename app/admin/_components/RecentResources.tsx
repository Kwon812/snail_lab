"use client";

import { useState } from "react";
import { useResources, useDeleteResource } from "../archive/_hooks/resources";
import type { ResourceItem } from "../archive/_actions/resources";
import { downloadResource } from "../../_lib/upload";
import { Spinner } from "../../_components/spinner";

function fmtSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
function extOf(name: string): string {
  return (name.split(".").pop() || "").toUpperCase();
}

export function RecentResources() {
  const { data, isPending, isError, error } = useResources();
  const del = useDeleteResource();

  const [downloading, setDownloading] = useState<string | null>(null);
  async function download(r: ResourceItem) {
    setDownloading(r.id);
    try {
      await downloadResource(r.path, r.file_name);
    } catch (err) {
      alert(`다운로드 실패: ${(err as Error).message}`);
    } finally {
      setTimeout(() => setDownloading(null), 800);
    }
  }

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
        자료를 불러오지 못했습니다 — {(error as Error).message}
      </p>
    );
  }

  if (data.length === 0) {
    return (
      <p className="rounded-[20px] bg-lifted p-6 text-[15px] text-dust">
        아직 올린 자료가 없습니다. 자료실에서 파일을 올려 보세요.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {data.map((r) => (
        <li
          key={r.id}
          className="flex items-center justify-between gap-4 rounded-[20px] bg-lifted px-6 py-4 shadow-card"
        >
          <span className="flex min-w-0 items-center gap-3">
            <span className="shrink-0 rounded-[10px] bg-white px-2 py-1 text-[10px] font-bold text-slate ring-1 ring-ink/10">
              {extOf(r.file_name) || "FILE"}
            </span>
            <span className="truncate text-[16px] font-medium text-ink">{r.title}</span>
          </span>

          <div className="flex shrink-0 items-center gap-1">
            <span className="mr-2 hidden text-[13px] text-slate sm:inline">
              {fmtSize(r.file_size)}
            </span>
            <button
              onClick={() => download(r)}
              disabled={downloading === r.id}
              className="rounded-pill px-3 py-1.5 text-[13px] font-medium text-ink transition-colors hover:bg-white disabled:opacity-50"
            >
              {downloading === r.id ? "준비 중…" : "다운로드"}
            </button>
            <button
              onClick={() => {
                if (confirm(`"${r.title}" 자료를 삭제할까요?`)) del.mutate(r);
              }}
              disabled={del.isPending}
              className="rounded-pill px-3 py-1.5 text-[13px] font-medium text-slate transition-colors hover:bg-white hover:text-signal disabled:opacity-50"
            >
              {del.isPending && del.variables?.id === r.id ? "삭제 중…" : "삭제"}
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
