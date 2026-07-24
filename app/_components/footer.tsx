"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const COLS = [
  {
    head: "둘러보기",
    links: [
      { label: "강사 소개", href: "/about" },
      { label: "강의 소개", href: "/lectures" },
      { label: "블로그", href: "/blog" },
      { label: "문의하기", href: "/contact" },
    ],
  },
  {
    head: "함께하기",
    links: [
      { label: "강의 문의", href: "/contact" },
      { label: "기관·학교 출강", href: "/contact" },
      { label: "협업 제안", href: "/contact" },
    ],
  },
];

const SOCIAL = ["Instagram", "YouTube", "LinkedIn", "카카오톡"];

export function Footer() {
  const pathname = usePathname();

  // 앱 전용 캘린더 화면(추후 PWA)은 마케팅 footer 없이 단독 화면으로 보여준다.
  if (pathname?.startsWith("/admin/calendar/app")) return null;

  return (
    <footer className="mt-24 bg-ink px-6 pb-24 pt-20 text-cream sm:px-10 sm:pt-24">
      <div className="mx-auto w-full max-w-[1280px]">

        <div className="mt-16 grid grid-cols-2 gap-10 sm:grid-cols-4">
          {COLS.map((col) => (
            <div key={col.head}>
              <h3 className="text-[13px] font-bold uppercase tracking-[0.04em] text-dust">
                {col.head}
              </h3>
              <ul className="mt-4 space-y-3">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      className="text-[14px] text-cream/85 transition-colors hover:text-cream"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div>
            <h3 className="text-[13px] font-bold uppercase tracking-[0.04em] text-dust">
              소셜
            </h3>
            <ul className="mt-4 space-y-3">
              {SOCIAL.map((s) => (
                <li key={s}>
                  <a
                    href="#"
                    className="inline-flex items-center gap-1 text-[14px] text-cream/85 transition-colors hover:text-cream"
                  >
                    {s} <span className="text-[11px]">↗</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-16 flex flex-col gap-4 border-t border-white/15 pt-6 text-[13px] text-cream/60 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 최미선 미디어·그림책연구소. All rights reserved.</p>
          <div className="flex items-center gap-5">
            <a href="#" className="hover:text-cream">개인정보처리방침</a>
            <a href="#" className="hover:text-cream">이용약관</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
