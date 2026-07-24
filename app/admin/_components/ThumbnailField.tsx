"use client";

import { useState } from "react";
import { Spinner } from "../../_components/spinner";
import { uploadImage } from "../../_lib/upload";

/**
 * Reusable cover-image uploader: dropzone → Supabase Storage → public URL.
 * Controlled via `value` / `onChange`.
 */
export function ThumbnailField({
  value,
  onChange,
  label = "대표 이미지",
  aspect = "aspect-[16/9]",
  className = "max-w-[420px]",
}: {
  value: string | null;
  onChange: (url: string | null) => void;
  label?: string;
  aspect?: string;
  className?: string;
}) {
  const [uploading, setUploading] = useState(false);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      onChange(await uploadImage(file));
    } catch (err) {
      alert(`이미지 업로드 실패: ${(err as Error).message}`);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <p className="mb-2 text-[13px] font-bold uppercase tracking-[0.04em] text-slate">{label}</p>
      {value ? (
        <div className={`relative w-full overflow-hidden rounded-[20px] shadow-card ${className}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt={label} className={`${aspect} w-full object-cover`} />
          <button
            type="button"
            onClick={() => onChange(null)}
            aria-label="이미지 삭제"
            className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-white/90 text-ink shadow hover:text-signal"
          >
            ×
          </button>
        </div>
      ) : (
        <label
          className={`flex ${aspect} w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-[20px] border border-dashed border-ink/25 bg-transparent text-slate transition-colors hover:border-ink/50 ${className}`}
        >
          {uploading ? (
            <Spinner size={36} />
          ) : (
            <>
              <span className="text-[14px]">클릭해서 이미지 업로드</span>
            </>
          )}
          <input type="file" accept="image/*" onChange={onPick} disabled={uploading} className="hidden" />
        </label>
      )}
    </div>
  );
}
