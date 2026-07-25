"use client";

import { useEffect, useRef, useState } from "react";

export type SelectItem<T> = { label: string; value: T };

/** 클릭하면 드롭다운이 펼쳐지는 커스텀 셀렉트 — 마우스로 목록에서 바로 클릭해서 고른다. */
export function CustomSelect<T extends string | number>({
  items,
  value,
  onChange,
  className = "",
}: {
  items: SelectItem<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const current = items.find((it) => it.value === value);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex w-full items-center justify-between rounded-[14px] border px-4 py-2.5 text-left text-[14px] outline-none transition-colors ${
          open ? "border-ink/60 bg-white" : "border-ink/25 bg-white hover:border-ink/40"
        }`}
      >
        <span className="text-ink">{current?.label ?? "-"}</span>
        <span className={`text-[10px] text-dust transition-transform ${open ? "rotate-180" : ""}`}>▾</span>
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-20 max-h-52 overflow-y-auto rounded-[14px] border border-ink/15 bg-white py-1 shadow-card">
          {items.map((it) => (
            <button
              key={String(it.value)}
              type="button"
              onClick={() => {
                onChange(it.value);
                setOpen(false);
              }}
              className={`block w-full px-4 py-2 text-left text-[14px] transition-colors hover:bg-cream ${
                it.value === value ? "font-bold text-ink" : "text-slate"
              }`}
            >
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
