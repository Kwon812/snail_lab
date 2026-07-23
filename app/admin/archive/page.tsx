"use client";

import {useState} from "react";
import {Arrow, Eyebrow, Section} from "../../_components/ui";
import {Spinner} from "../../_components/spinner";
import type {ResourceItem} from "./_actions/resources";
import {useDeleteResource, useResources, useToggleResourcePublic, useUploadResources} from "./_hooks/resources";
import {downloadResource} from "../../_lib/upload";

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

export default function ArchivePage() {
    const {data, isPending, isError, error} = useResources();

    // 업로드 폼
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [files, setFiles] = useState<File [] | null>(null);
    const upload = useUploadResources();

    async function onUpload() {
        if (!files) return;
        try {
            await upload.mutateAsync({title, description, files});
            setTitle("");
            setDescription("");
            setFiles(null);
        } catch (err) {
            alert(`업로드 실패: ${(err as Error).message}`);
        }
    }

    const del = useDeleteResource();
    const togglePublic = useToggleResourcePublic();

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

    return (
        <Section className="pt-36 sm:pt-44">
            <Eyebrow>관리자 · 자료실</Eyebrow>
            <h1 className="display mt-6 max-w-[18ch] text-[40px] leading-[1.02] sm:text-[56px]">
                강의 자료 보관함.
            </h1>
            <p className="mt-5 max-w-[48ch] text-[17px] leading-[1.5] text-slate">
                PPT·PDF 등 강의 자료를 올려두고 관리합니다. 기본은 관리자만 열람할 수 있고, &quot;공개&quot;로 전환한
                자료는 자료실 페이지에서 누구나 내려받을 수 있습니다.
            </p>

            {/* 업로드 폼 */}
            <div className="mt-10 rounded-stadium bg-lifted p-6 shadow-card sm:p-8">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="자료 제목 (비우면 파일명)"
                        className="w-full rounded-[14px] border border-ink/15 bg-white px-4 py-3 text-[16px] text-ink outline-none placeholder:text-dust focus:border-ink/40"
                    />
                    <input
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="설명 (선택)"
                        className="w-full rounded-[14px] border border-ink/15 bg-white px-4 py-3 text-[16px] text-ink outline-none placeholder:text-dust focus:border-ink/40"
                    />
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                    <label
                        className="inline-flex cursor-pointer items-center gap-2 rounded-pill border border-ink/15 bg-white px-5 py-2.5 text-[14px] font-medium text-ink transition-colors hover:border-ink/40">
                        파일 선택
                        <input
                            type="file"
                            multiple
                            onChange={(e) => setFiles(e.target.files ? Array.from(e.target.files) : null)}
                            className="hidden"
                        />
                    </label>
                    <div className={'flex flex-col'}>
                        {
                            files?.map((file, i) => (
                                <span key={i}
                                      className="text-[14px] text-slate">{file.name} · {fmtSize(file.size)}</span>))
                        }
                    </div>

                    <button
                        onClick={onUpload}
                        disabled={!files || upload.isPending}
                        className="ml-auto inline-flex min-w-[100px] items-center justify-center gap-2 rounded-[20px] bg-ink px-5 py-2.5 text-[15px] font-medium text-cream transition-transform active:scale-95 disabled:opacity-50"
                    >
                        {upload.isPending ? <Spinner size={20}/> : <>업로드 <Arrow className="h-4 w-4"/></>}
                    </button>
                </div>
            </div>

            {/* 목록 */}
            <div className="mt-10">
                {isPending ? (
                    <div className="flex justify-center py-16">
                        <Spinner size={52}/>
                    </div>
                ) : isError ? (
                    <p className="rounded-[20px] bg-lifted p-6 text-[15px] text-slate">
                        자료를 불러오지 못했습니다 — {(error as Error).message}
                    </p>
                ) : data.length === 0 ? (
                    <p className="rounded-[20px] bg-lifted p-8 text-center text-[15px] text-dust">
                        아직 올린 자료가 없습니다.
                    </p>
                ) : (
                    <ul className="flex flex-col border-t border-ink/10">
                        {data.map((r) => (
                            <li
                                key={r.id}
                                className="flex items-center gap-4 border-b border-ink/10 py-4"
                            >
                <span
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white text-[11px] font-bold text-slate ring-1 ring-ink/10">
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
                                <button
                                    onClick={() => togglePublic.mutate(r)}
                                    disabled={togglePublic.isPending}
                                    className={`shrink-0 rounded-pill border px-4 py-1.5 text-[13px] font-medium transition-colors disabled:opacity-50 ${
                                        r.is_public
                                            ? "border-transparent bg-ink text-cream hover:opacity-90"
                                            : "border-ink/15 bg-white text-ink hover:border-ink/40"
                                    }`}
                                >
                                    {r.is_public ? "공개중" : "비공개"}
                                </button>
                                <button
                                    onClick={() => {
                                        if (confirm(`"${r.title}" 자료를 삭제할까요?`)) del.mutate(r);
                                    }}
                                    disabled={del.isPending}
                                    className="shrink-0 rounded-pill px-3 py-1.5 text-[13px] font-medium text-slate transition-colors hover:text-signal disabled:opacity-50"
                                >
                                    삭제
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </Section>
    );
}
