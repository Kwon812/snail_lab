"use client";

import Link from "next/link";
import { useState } from "react";
import { Eyebrow, Section } from "../../_components/ui";
import { Reveal } from "../../_components/reveal";
import { categories } from "../../_data/content";
import type { PublicPostCard } from "../queries";
import { NewPostButton, PostAdminActions } from "./PostAdminActions";

export function BlogList({ posts }: { posts: PublicPostCard[] }) {
  const [cat, setCat] = useState("전체");
  const [q, setQ] = useState("");

  const visible = posts.filter((p) => {
    const inCat = cat === "전체" || p.category === cat;
    const inQ =
      q.trim() === "" ||
      p.title.toLowerCase().includes(q.toLowerCase()) ||
      p.excerpt.toLowerCase().includes(q.toLowerCase());
    return inCat && inQ;
  });

  return (
    <Section className="pt-36 sm:pt-44">
      <div className="flex items-start justify-between gap-4">
        <Eyebrow>블로그</Eyebrow>
        <NewPostButton />
      </div>
      <h1 className="display mt-6 max-w-[20ch] text-[40px] leading-[1.02] sm:text-[60px]">
        아이와 나눌 이야기.
      </h1>

      {/* Search + filter row */}
      <div className="mt-10 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`rounded-pill px-5 py-2 text-[15px] font-medium transition-colors ${
                cat === c
                  ? "bg-ink text-cream"
                  : "bg-white text-ink border border-ink/15 hover:border-ink/40"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="검색어를 입력하세요"
          className="w-full rounded-pill border border-ink/20 bg-white px-6 py-3 text-[15px] outline-none placeholder:text-dust focus:border-ink/50 sm:w-72"
        />
      </div>

      {posts.length === 0 ? (
        <p className="mt-20 rounded-stadium bg-lifted p-10 text-center text-[17px] text-dust">
          아직 발행된 글이 없습니다.
        </p>
      ) : (
        <>
          <Reveal stagger className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((p) => (
              <div key={p.slug} className="group relative">
                <Link
                  href={`/blog/${p.slug}`}
                  className="flex h-full flex-col overflow-hidden rounded-[28px] bg-lifted shadow-card transition-transform hover:-translate-y-1"
                >
                  {p.thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.thumbnail} alt={p.title} className="aspect-[16/10] w-full object-cover" />
                  ) : (
                    <div
                      className="aspect-[16/10] w-full"
                      style={{
                        background: `radial-gradient(circle at 35% 30%, ${p.tone.a}, ${p.tone.b})`,
                      }}
                    />
                  )}
                  <div className="flex flex-1 flex-col p-6">
                    <span className="text-[13px] font-medium text-signal">{p.category}</span>
                    <h3 className="mt-4 flex-1 text-[19px] font-medium leading-[1.35] tracking-[-0.01em]">
                      {p.title}
                    </h3>
                    <span className="mt-5 text-[13px] text-slate">{p.date}</span>
                  </div>
                </Link>
                <PostAdminActions id={p.id} className="absolute right-3 top-3" />
              </div>
            ))}
          </Reveal>

          {visible.length === 0 && (
            <p className="mt-20 text-center text-[17px] text-dust">검색 결과가 없습니다.</p>
          )}
        </>
      )}
    </Section>
  );
}
