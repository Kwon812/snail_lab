"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Arrow } from "./ui";

const LINKS = [
  { href: "/about", label: "소개" },
  { href: "/lectures", label: "강의" },
  { href: "/blog", label: "블로그" },
];

export function Nav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="pointer-events-none fixed inset-x-0 top-6 z-50 px-4 sm:px-8">
      <nav className="pointer-events-auto mx-auto flex w-full max-w-[1180px] items-center justify-between rounded-pill bg-white/90 px-2 py-2 shadow-pill backdrop-blur-md sm:px-6">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5" onClick={() => setOpen(false)}>
          <Image
            src="/logo-symbol.svg"
            alt="달팽이 그림책 연구소"
            width={56}
            height={56}
            priority
            className="-mt-1 h-12 w-12 shrink-0"
          />
          <span className="flex flex-col leading-none">
            <span className="text-[16px] font-medium tracking-[-0.02em] text-ink">
              달팽이 그림책 연구소
            </span>
            <span className="mt-1 flex items-center gap-1 text-[9px] font-bold tracking-[0.18em] text-slate">
              <span className="h-1 w-1 rounded-full bg-signal" />
              PICTURE BOOK LAB
            </span>
          </span>
        </Link>

        {/* Desktop links */}
        <div className="hidden items-center gap-9 lg:flex">
          {LINKS.map((l) => {
            const active = pathname === l.href || pathname.startsWith(l.href + "/");
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`text-[16px] font-medium tracking-[-0.02em] transition-colors ${
                  active ? "text-ink" : "text-ink/55 hover:text-ink"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </div>

        {/* Right — CTA + mobile toggle */}
        <div className="flex items-center gap-2">
          <Link
            href="/contact"
            className="hidden items-center gap-2 rounded-[20px] bg-ink px-5 py-2 text-[15px] font-medium tracking-[-0.02em] text-cream transition-transform active:scale-95 lg:inline-flex"
          >
            문의하기
            <Arrow className="h-4 w-4" />
          </Link>
          <button
            aria-label="메뉴"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="grid h-11 w-11 place-items-center rounded-full border border-ink/15 lg:hidden"
          >
            <span className="relative block h-3.5 w-5">
              <span
                className={`absolute left-0 h-[1.5px] w-5 bg-ink transition-all ${
                  open ? "top-1.5 rotate-45" : "top-0"
                }`}
              />
              <span
                className={`absolute left-0 top-1.5 h-[1.5px] w-5 bg-ink transition-opacity ${
                  open ? "opacity-0" : "opacity-100"
                }`}
              />
              <span
                className={`absolute left-0 h-[1.5px] w-5 bg-ink transition-all ${
                  open ? "top-1.5 -rotate-45" : "top-3"
                }`}
              />
            </span>
          </button>
        </div>
      </nav>

      {/* Mobile overlay menu */}
      {open && (
        <div className="pointer-events-auto mx-auto mt-3 w-full max-w-[1180px] rounded-[28px] bg-white p-4 shadow-card lg:hidden">
          <div className="flex flex-col">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="flex items-center justify-between border-b border-ink/8 px-3 py-4 text-[18px] font-medium tracking-[-0.02em] last:border-0"
              >
                {l.label}
                <Arrow className="h-4 w-4 text-ink/40" />
              </Link>
            ))}
            <Link
              href="/contact"
              onClick={() => setOpen(false)}
              className="mt-3 flex items-center justify-center gap-2 rounded-[20px] bg-ink px-5 py-3 text-[16px] font-medium text-cream"
            >
              강의 문의 <Arrow className="h-4 w-4" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
