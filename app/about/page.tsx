import type { Metadata } from "next";
import { Eyebrow, Portrait, Section } from "../_components/ui";
import { Reveal } from "../_components/reveal";
import { credentials, timeline } from "../_data/content";

export const metadata: Metadata = {
  title: "강사 소개",
  description: "미디어 리터러시 · 그림책 · 아동심리학 강사 최미선의 이력과 활동을 소개합니다.",
};

const stats = [
  { num: "3,000+", label: "누적 교육 참여자" },
  { num: "12년", label: "아동교육 현장 경력" },
  { num: "200+", label: "강연 · 프로그램" },
  { num: "40+", label: "기관·학교 출강" },
];

export default function AboutPage() {
  return (
    <>
      <Section className="pt-36 sm:pt-44">
        <Reveal stagger className="grid grid-cols-1 items-center gap-14 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <Eyebrow>강사 소개</Eyebrow>
            <h1 className="display mt-6 text-[40px] leading-[1.02] sm:text-[60px]">
              아이 곁에서
              <br />
              12년을 보낸 사람.
            </h1>
            <p className="mt-7 max-w-[50ch] text-[18px] leading-[1.55] text-slate">
              어린이집 교사에서 시작해 도서관 그림책 프로그램, 부모 교육, 그리고 미디어 리터러시
              강사까지. 아이를 통제하는 법이 아니라, 아이를 이해하고 함께 대화하는 법을 나눕니다.
            </p>
          </div>
          <div className="flex justify-center lg:justify-end">
            <Portrait toneA="#f2933f" toneB="#cf4500" size={320} satellite={false}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/profile.png"
                alt="최미선 강사"
                className="absolute inset-0 h-full w-full object-cover"
              />
            </Portrait>
          </div>
        </Reveal>
      </Section>

      {/* Stats */}
      <Section className="pt-24 sm:pt-32">
        <Reveal stagger className="grid grid-cols-2 gap-6 rounded-stadium bg-lifted p-10 shadow-card sm:grid-cols-4 sm:p-14">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <div className="display text-[40px] text-ink sm:text-[52px]">{s.num}</div>
              <div className="mt-2 text-[14px] text-slate">{s.label}</div>
            </div>
          ))}
        </Reveal>
      </Section>

      {/* Timeline + Credentials */}
      <Section className="pt-24 sm:pt-32">
        <Reveal className="max-w-[42ch]">
          <Eyebrow>경력 타임라인</Eyebrow>
          <h2 className="display mt-5 text-[34px] leading-[1.05] sm:text-[46px]">
            걸어온 길.
          </h2>
        </Reveal>

        <Reveal stagger className="mt-14 grid grid-cols-1 gap-12 lg:grid-cols-[1.3fr_1fr] lg:gap-16">
          {/* Left — timeline */}
          <ol className="border-l border-ink/15">
            {timeline.map((t) => (
              <li key={t.year} className="relative pb-10 pl-8 last:pb-0">
                <span className="absolute -left-[6px] top-1.5 h-3 w-3 rounded-full bg-signal-light" />
                <span className="display text-[22px] text-ink">{t.year}</span>
                <p className="mt-1 max-w-[48ch] text-[17px] leading-[1.5] text-slate">{t.text}</p>
              </li>
            ))}
          </ol>

          {/* Right — 경력 / 학력 / 자격증 */}
          <div className="rounded-stadium bg-lifted p-8 shadow-card sm:p-10 lg:sticky lg:top-32 lg:self-start">
            <CredBlock title="경력" items={credentials.career} />
            <CredBlock title="학력" items={credentials.education} className="mt-8" />
            <CredBlock title="자격증" items={credentials.certificates} className="mt-8" />
          </div>
        </Reveal>
      </Section>

      {/* Philosophy */}
      <Section className="pt-24 sm:pt-32">
        <Reveal className="rounded-stadium bg-ink p-10 text-cream shadow-card sm:p-16">
          <Eyebrow>
            <span className="text-cream">강의 철학</span>
          </Eyebrow>
          <p className="display mt-6 max-w-[24ch] text-[28px] leading-[1.15] sm:text-[40px]">
            “막는다고 아이가 자라지 않습니다. 아이를 키우는 건 언제나 <span className="text-signal-light">대화</span>입니다.”
          </p>
          <p className="mt-6 max-w-[56ch] text-[16px] leading-[1.6] text-cream/70">
            미디어도, 그림책도, 마음도 — 결국 아이와 어떻게 이야기하느냐의 문제입니다. 제 강의의 목표는
            부모와 교사가 집과 교실로 돌아가 아이와 나눌 &lsquo;오늘의 한 마디&rsquo;를 갖게 하는 것입니다.
          </p>
        </Reveal>
      </Section>
    </>
  );
}

function CredBlock({
  title,
  items,
  className = "",
}: {
  title: string;
  items: string[];
  className?: string;
}) {
  return (
    <div className={className}>
      <h3 className="text-[13px] font-bold uppercase tracking-[0.04em] text-slate">{title}</h3>
      <ul className="mt-4 space-y-2.5">
        {items.map((it, i) => (
          <li key={i} className="flex items-start gap-2.5 text-[15px] leading-[1.5] text-ink">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-signal-light" />
            {it}
          </li>
        ))}
      </ul>
    </div>
  );
}
