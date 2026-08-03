import Link from "next/link";
import {Arrow, Eyebrow, Orbit, Portrait, Section} from "./_components/ui";
import {Reveal} from "./_components/reveal";
import {clients, fields, testimonials} from "./_data/content";
import {getPublishedPosts} from "./blog/_queries/posts";

export const revalidate = 60;

export default async function Home() {
    const posts = await getPublishedPosts(4);
    return (
        <>
            {/* ---------------------------------------------------------- */}
            {/*  HERO                                                       */}
            {/* ---------------------------------------------------------- */}
            <Section className="pt-36 sm:pt-44">
                <Reveal stagger className="grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
                    {/* Left — editorial copy */}
                    <div>
                        <Eyebrow>미디어 리터러시 · 그림책 · 아동심리 강사</Eyebrow>
                        <h1 className="display mt-6 max-w-[15ch] text-[42px] leading-[1.02] sm:text-[64px]">
                            <span className="text-signal-light">그림책</span>을 품다, <br/> &nbsp;&nbsp; &nbsp; <span className="text-signal-light">미디어</span>로 잇다.
                        </h1>
                        <p className="mt-7 max-w-[46ch] text-[18px] leading-[1.55] text-slate">
                            아이의 순수한 시선부터 어르신의 삶의 지혜까지.<br/>그림책으로 시작해 미디어로 완성되는 세대공감 플랫폼.
                        </p>
                        <div className="mt-9 flex flex-wrap items-center gap-x-7 gap-y-3">
                            <Link
                                href="/about"
                                className="group inline-flex items-center gap-1.5 text-[16px] font-medium tracking-[-0.02em] text-ink hover:text-signal"
                            >
                                강사 소개
                                <Arrow className="h-4 w-4 transition-transform group-hover:translate-x-0.5"/>
                            </Link>
                            <Link
                                href="/lectures"
                                className="group inline-flex items-center gap-1.5 text-[16px] font-medium tracking-[-0.02em] text-ink hover:text-signal"
                            >
                                강의 살펴보기
                                <Arrow className="h-4 w-4 transition-transform group-hover:translate-x-0.5"/>
                            </Link>
                        </div>
                    </div>

                    {/* Right — signature circular portrait, orbit & ghost watermark */}
                    <div className="relative flex justify-center lg:justify-end">
                        <div className="relative">
                            {/* ghost watermark behind the portrait */}
                            <span
                                aria-hidden
                                className="display pointer-events-none absolute -top-10 left-1/2 -z-10 hidden -translate-x-1/2 select-none whitespace-nowrap text-[140px] leading-none text-ghost lg:block"
                            >
                                그림책
                            </span>
                            <Orbit className="-left-24 top-8 hidden h-[240px] w-[460px] lg:block"/>

                            {/* portrait + floating info pills */}
                            <div className="relative w-fit">
                                <Portrait href="/about" toneA="#f2933f" toneB="#cf4500" size={360} lift>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src="/profile.png"
                                        alt="최미선 강사"
                                        className="absolute inset-0 h-full w-full object-cover"
                                    />
                                    {/* edge fade — dissolves the photo into the cream canvas */}
                                    <span
                                        aria-hidden
                                        className="pointer-events-none absolute inset-0 rounded-full"
                                        style={{ boxShadow: "inset 0 0 55px 18px var(--color-cream)" }}
                                    />
                                </Portrait>

                            </div>

                            {/* name + role caption */}
                            <div className="mt-6 text-center">
                                <p className="display text-[20px] text-ink">최미선</p>
                                <p className="mt-1 text-[13px] text-slate">달팽이 그림책연구소 대표</p>
                            </div>
                        </div>
                    </div>
                </Reveal>
            </Section>

            {/* ---------------------------------------------------------- */}
            {/*  강의 분야 — constellation of portraits                     */}
            {/* ---------------------------------------------------------- */}
            <Section className="pt-28 sm:pt-40">
                <Reveal>
                    <Eyebrow>강의 분야</Eyebrow>

                    <p className="mt-4 text-[17px] leading-[1.5] text-slate">
                        세 가지 축으로 아이와 미디어, 그리고 마음을 다룹니다. 카드를 눌러 커리큘럼을 확인하세요.
                    </p>
                </Reveal>

                <Reveal
                    stagger
                    className="relative mt-16 grid grid-cols-1 gap-x-8 gap-y-20 sm:grid-cols-2 lg:grid-cols-3"
                >
                    <Orbit className="left-[16%] top-[64px] hidden h-[200px] w-[380px] lg:block"/>
                    <Orbit className="left-[50%] top-[64px] hidden h-[200px] w-[380px] lg:block"/>
                    {fields.map((f, i) => (
                        <div
                            key={f.slug}
                            className={`flex flex-col items-center text-center ${
                                i % 2 === 1 ? "lg:mt-16" : ""
                            }`}
                        >
                            <div className="relative">
                            <Portrait className={'bg-orange-500'} href={`/lectures?field=${encodeURIComponent(f.title)}`} toneA={f.tone.a} toneB={f.tone.b} size={230}
                                      lift>
                                {/* 흰줄 벡터 아이콘 — 원 위에 겹치게 */}
                                {/*<span*/}
                                {/*    aria-hidden*/}
                                {/*    className="pointer-events-none absolute inset-0 bg-white"*/}
                                {/*    style={{*/}
                                {/*        WebkitMaskImage: `url(/icon-0${i + 1}-${f.slug}.svg)`,*/}
                                {/*        maskImage: `url(/icon-0${i + 1}-${f.slug}.svg)`,*/}
                                {/*        WebkitMaskRepeat: "no-repeat",*/}
                                {/*        maskRepeat: "no-repeat",*/}
                                {/*        WebkitMaskPosition: "center",*/}
                                {/*        maskPosition: "center",*/}
                                {/*        WebkitMaskSize: "52%",*/}
                                {/*        maskSize: "52%",*/}
                                {/*    }}*/}
                                {/*/>*/}
                            </Portrait>
                            {/* 새끼친 하위 분야 — 본 원 곁에 붙는 조그마한 위성 원 */}
                            {"sub" in f && (
                                <Link
                                    href={`/lectures?field=${encodeURIComponent(f.sub.title)}`}
                                    className="absolute -right-7 -top-2 grid h-[84px] w-[84px] place-items-center rounded-full text-[14px] font-medium text-white shadow-[0_10px_24px_rgba(0,0,0,0.14)] transition-transform duration-300 ease-out hover:-translate-y-1.5 hover:shadow-[0_18px_36px_rgba(0,0,0,0.18)]"
                                    style={{background: `radial-gradient(circle at 35% 30%, ${f.sub.tone.a}, ${f.sub.tone.b})`}}
                                >
                                    {f.sub.title}
                                </Link>
                            )}
                            </div>
                            <div className="mt-10">
                <span className="display text-[15px] tabular-nums text-signal-light">
                  {`0${i + 1}`}
                </span>
                                <h3 className="display mt-1.5 text-[24px]">{f.title}</h3>
                                <p className="mx-auto mt-2 max-w-[26ch] text-[15px] leading-[1.5] text-slate">
                                    {f.desc}
                                </p>
                            </div>
                        </div>
                    ))}
                </Reveal>
            </Section>

            {/* ---------------------------------------------------------- */}
            {/*  출강 이력 — logo rolling band                              */}
            {/* ---------------------------------------------------------- */}
            <section className="mt-28 overflow-hidden py-14 sm:mt-40">
                <Section>
                    <Reveal>
                        <p className="text-center text-[14px] font-bold uppercase tracking-[0.04em] text-slate">
                            이런 곳에서 함께했습니다
                        </p>
                    </Reveal>
                </Section>
                <div className="relative mt-8 flex overflow-hidden">
                    <div className="flex shrink-0 animate-[marquee_32s_linear_infinite] items-center gap-14 pr-14">
                        {[...clients, ...clients].map((c, i) => (
                            <span
                                key={i}
                                className="whitespace-nowrap text-[26px] font-medium tracking-[-0.02em] text-ink/35"
                            >
                {c}
              </span>
                        ))}
                    </div>
                </div>
            </section>

            {/* ---------------------------------------------------------- */}
            {/*  후기                                                       */}
            {/* ---------------------------------------------------------- */}
            <Section className="pt-24 sm:pt-32">
                <Reveal className="max-w-[42ch]">
                    <Eyebrow>참여자 후기</Eyebrow>
                    <h2 className="display mt-5 text-[34px] leading-[1.05] sm:text-[46px]">
                        현장이 보내는 신뢰.
                    </h2>
                </Reveal>
                <Reveal stagger className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
                    {testimonials.map((t) => (
                        <figure
                            key={t.name}
                            className="flex flex-col rounded-[28px] bg-lifted p-8 shadow-card"
                        >
                            <div className="text-signal-light" aria-label={`별점 ${t.rating}점`}>
                                {"★".repeat(t.rating)}
                            </div>
                            <blockquote className="mt-5 flex-1 text-[17px] leading-[1.55]">
                                “{t.content}”
                            </blockquote>
                            <figcaption className="mt-7 flex items-center gap-3">
                <span
                    className="h-11 w-11 rounded-full"
                    style={{background: "radial-gradient(circle at 35% 30%, #f2933f, #cf4500)"}}
                />
                                <span>
                  <span className="block text-[15px] font-medium">{t.name}</span>
                  <span className="block text-[13px] text-slate">{t.affiliation}</span>
                </span>
                            </figcaption>
                        </figure>
                    ))}
                </Reveal>
            </Section>

            {/* ---------------------------------------------------------- */}
            {/*  최신 블로그                                                */}
            {/* ---------------------------------------------------------- */}
            {posts.length > 0 && (
            <Section className="pt-24 sm:pt-32">
                <Reveal className="flex items-end justify-between gap-6">
                    <div className="max-w-[42ch]">
                        <Eyebrow>최신 블로그</Eyebrow>
                        <h2 className="display mt-5 text-[34px] leading-[1.05] sm:text-[46px]">
                            현장의 기록.
                        </h2>
                    </div>
                    <Link
                        href="/blog"
                        className="hidden shrink-0 items-center gap-2 text-[16px] font-medium tracking-[-0.02em] text-ink hover:text-signal sm:inline-flex"
                    >
                        전체 보기 <Arrow className="h-4 w-4"/>
                    </Link>
                </Reveal>

                <Reveal stagger className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                    {posts.map((p) => (
                        <Link
                            key={p.slug}
                            href={`/blog/${p.slug}`}
                            className="group flex flex-col overflow-hidden rounded-[28px] bg-lifted shadow-card transition-transform hover:-translate-y-1"
                        >
                            {p.thumbnail ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={p.thumbnail} alt={p.title} className="aspect-[4/3] w-full object-cover"/>
                            ) : (
                                <div
                                    className="aspect-[4/3] w-full"
                                    style={{
                                        background: `radial-gradient(circle at 35% 30%, ${p.tone.a}, ${p.tone.b})`,
                                    }}
                                />
                            )}
                            <div className="flex flex-1 flex-col p-6">
                                <span className="text-[13px] font-medium text-signal">{p.category}</span>
                                <h3 className="mt-4 flex-1 text-[18px] font-medium leading-[1.35] tracking-[-0.01em]">
                                    {p.title}
                                </h3>
                                <span className="mt-5 text-[13px] text-slate">
                  {p.date}
                </span>
                            </div>
                        </Link>
                    ))}
                </Reveal>
            </Section>
            )}

            {/* keyframes for the logo marquee */}
            <style>{`@keyframes marquee { from { transform: translateX(0) } to { transform: translateX(-50%) } }`}</style>
        </>
    );
}
