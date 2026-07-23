"use client";

import { useState } from "react";
import { Eyebrow, Section } from "../../_components/ui";
import { downloadResource } from "../../_lib/upload";
import type { PublicResourceItem } from "../_queries/resources";

function fmtSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

function extOf(name: string): string {
  return (name.split(".").pop() || "").toUpperCase();
}

export function ResourcesList({ resources }: { resources: PublicResourceItem[] }) {
  const [downloading, setDownloading] = useState<string | null>(null);

  async function download(r: PublicResourceItem) {
    setDownloading(r.id);
    try {
      await downloadResource(r.path, r.file_name);
    } catch (err) {
      alert(`다운로드 실패: ${(err as Error).message}`);
    } finally {
      setTimeout(() => setDownloading(null), 800);
    }
  }

  return (
    <Section className="pt-36 sm:pt-44">
      <Eyebrow>자료실</Eyebrow>
      <h1 className="display mt-6 max-w-[18ch] text-[40px] leading-[1.02] sm:text-[56px]">
        공개 자료.
      </h1>
      <p className="mt-5 max-w-[48ch] text-[17px] leading-[1.5] text-slate">
        누구나 내려받을 수 있도록 공개한 강의 자료입니다.
      </p>

      <div className="mt-10">
        {resources.length === 0 ? (
          <p className="rounded-[20px] bg-lifted p-8 text-center text-[15px] text-dust">
            아직 공개된 자료가 없습니다.
          </p>
        ) : (
          <ul className="flex flex-col border-t border-ink/10">
            {resources.map((r) => (
              <li key={r.id} className="flex items-center gap-4 border-b border-ink/10 py-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white text-[11px] font-bold text-slate ring-1 ring-ink/10">
                  {extOf(r.file_name) || "FILE"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[16px] font-medium text-ink">{r.title}</p>
                  <p className="mt-0.5 truncate text-[13px] text-slate">
                    {r.description ? `${r.description} · ` : ""}
                    {r.file_name} · {fmtSize(r.file_size)} · {fmtDate(r.created_at)}
                  </p>
                </div>
                <button
                  onClick={() => download(r)}
                  disabled={downloading === r.id}
                  className="shrink-0 rounded-pill border border-ink/15 bg-white px-4 py-1.5 text-[13px] font-medium text-ink transition-colors hover:border-ink/40 disabled:opacity-50"
                >
                  {downloading === r.id ? "준비 중…" : "다운로드"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Section>
  );
}
