import Link from "next/link";
import { Arrow, Eyebrow, Section } from "../_components/ui";
import { RecentPosts } from "./_components/RecentPosts";
import { RecentLectures } from "./_components/RecentLectures";
import { RecentResources } from "./_components/RecentResources";
import { SignOutButton } from "./_components/SignOutButton";
import {getCurrentUser} from "./_actions/auth";
import {supabaseServerAuth} from "@/app/_lib/supabase-server";
import {notFound} from "next/navigation";

const actions = [
  {
    href: "/admin/blog/new",
    label: "블로그 작성",
    desc: "미디어 리터러시 · 그림책 · 아동심리 글을 WYSIWYG 에디터로 작성합니다.",
    tone: { a: "#f2933f", b: "#cf4500" },
  },
  {
    href: "/admin/lectures/new",
    label: "강의 작성",
    desc: "분야 · 커리큘럼 · 진행 방식을 갖춘 강의를 폼으로 등록합니다.",
    tone: { a: "#f7b25a", b: "#b8420f" },
  },
  {
    href: "/admin/archive",
    label: "자료실",
    desc: "PPT·PDF·HWP 등 강의 자료를 올리고 관리합니다. 관리자만 열람·다운로드.",
    tone: { a: "#ef8a4c", b: "#9a3a0a" },
  },
];

export default async function AdminHome() {

  return (
    <Section className="pt-36 sm:pt-44">
      <div className="flex items-start justify-between gap-4">
        <Eyebrow>관리자</Eyebrow>
        <SignOutButton />
      </div>
      <h1 className="display mt-6 max-w-[20ch] text-[40px] leading-[1.02] sm:text-[60px]">
        무엇을 작성할까요?
      </h1>
      <p className="mt-6 max-w-[48ch] text-[18px] leading-[1.5] text-slate">
        작성할 콘텐츠 유형을 선택하세요.
      </p>

      <div className="mt-14 grid grid-cols-1 gap-6  md:grid-cols-2 lg:grid-cols-3">
        {actions.map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className="group flex flex-col justify-between overflow-hidden rounded-stadium bg-lifted p-8 shadow-card transition-transform hover:-translate-y-1 sm:p-10"
          >
            <div
              className="h-32 w-32 rounded-full"
              style={{ background: `radial-gradient(circle at 35% 30%, ${a.tone.a}, ${a.tone.b})` }}
            />
            <div className="mt-10 flex items-end justify-between gap-4">
              <div>
                <h2 className="display text-[28px] text-ink sm:text-[32px]">{a.label}</h2>
                <p className="mt-3 max-w-[30ch] text-[15px] leading-[1.5] text-slate">{a.desc}</p>
              </div>
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-ink text-cream transition-transform group-hover:translate-x-1">
                <Arrow className="h-6 w-6" />
              </span>
            </div>
          </Link>
        ))}
      </div>

      {/* 최근 글 — Supabase에서 TanStack Query로 로드 */}
      <div className="mt-20">
        <Eyebrow>블로그</Eyebrow>
        <h2 className="display mt-5 text-[28px] leading-[1.05] sm:text-[36px]">작성한 글</h2>
        <div className="mt-8">
          <RecentPosts />
        </div>
      </div>

      {/* 강의 목록 */}
      <div className="mt-16">
        <Eyebrow>강의</Eyebrow>
        <h2 className="display mt-5 text-[28px] leading-[1.05] sm:text-[36px]">등록한 강의</h2>
        <div className="mt-8">
          <RecentLectures />
        </div>
      </div>

      {/* 자료실 목록 */}
      <div className="mt-16">
        <div className="flex items-end justify-between gap-4">
          <div>
            <Eyebrow>자료실</Eyebrow>
            <h2 className="display mt-5 text-[28px] leading-[1.05] sm:text-[36px]">올린 자료</h2>
          </div>
        </div>
        <div className="mt-8">
          <RecentResources />
        </div>
      </div>
    </Section>
  );
}
