import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

/* ------------------------------------------------------------------ */
/*  Arrow — the recurring ink glyph                                    */
/* ------------------------------------------------------------------ */
export function Arrow({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Eyebrow — accent dot + uppercase label                            */
/* ------------------------------------------------------------------ */
export function Eyebrow({ children }: { children: ReactNode }) {
  return <span className="eyebrow">{children}</span>;
}

/* ------------------------------------------------------------------ */
/*  Buttons — Ink pill (primary) / Outlined pill (secondary)          */
/* ------------------------------------------------------------------ */
type ButtonProps = {
  href?: string;
  variant?: "primary" | "secondary";
  children: ReactNode;
  className?: string;
} & Omit<ComponentPropsWithoutRef<"a">, "href">;

export function Button({
  href,
  variant = "primary",
  children,
  className = "",
  ...rest
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-[20px] px-6 py-2 text-[16px] font-medium tracking-[-0.02em] transition-transform active:scale-[0.97]";
  const styles =
    variant === "primary"
      ? "bg-ink text-cream border-[1.5px] border-ink hover:opacity-90"
      : "bg-white text-ink border-[1.5px] border-ink hover:bg-cream";
  const cls = `${base} ${styles} ${className}`;

  if (href) {
    return (
      <Link href={href} className={cls} {...rest}>
        {children}
      </Link>
    );
  }
  return (
    <button className={cls} {...(rest as ComponentPropsWithoutRef<"button">)}>
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Circular portrait with docked white satellite CTA                 */
/* ------------------------------------------------------------------ */
export function Portrait({
  href,
  toneA,
  toneB,
  size = 300,
  className = "",
  satellite = true,
  lift = false,
  children,
}: {
  href?: string;
  toneA?: string;
  toneB?: string;
  size?: number;
  className?: string;
  satellite?: boolean;
  /** On hover, only the circle floats up — the satellite CTA stays put. */
  lift?: boolean;
  children?: ReactNode;
}) {
  const liftClasses = lift
    ? "shadow-[0_18px_40px_rgba(0,0,0,0.10)] transition-all duration-300 ease-out group-hover:-translate-y-3 group-hover:shadow-[0_38px_64px_rgba(0,0,0,0.17)]"
    : "";

  const inner = (
    <>
      {/* The circle — floats on hover when `lift` is set */}
      <div
        className={`portrait relative shrink-0 overflow-hidden ${liftClasses} ${className}`}
        style={
          {
            width: size,
            height: size,
            maxWidth: "100%",
            ["--tone-a" as string]: toneA,
            ["--tone-b" as string]: toneB,
          } as React.CSSProperties
        }
      >
        {children}
      </div>
      {/* Satellite CTA — anchored to the wrapper, stays put */}
      {satellite && (
        <span className="absolute bottom-[6%] right-[6%] grid h-[56px] w-[56px] translate-x-1/4 translate-y-1/4 place-items-center rounded-full bg-white text-ink shadow-[0_10px_24px_rgba(0,0,0,0.12)]">
          <Arrow className="h-5 w-5" />
        </span>
      )}
    </>
  );

  if (href) {
    return (
      <Link href={href} aria-label="자세히 보기" className="group relative block w-fit">
        {inner}
      </Link>
    );
  }
  return <div className="group relative w-fit">{inner}</div>;
}

/* ------------------------------------------------------------------ */
/*  Thin orbital arc — connective decoration between portraits        */
/* ------------------------------------------------------------------ */
export function Orbit({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`pointer-events-none absolute ${className}`}
      viewBox="0 0 400 200"
      fill="none"
      aria-hidden
    >
      <path
        d="M2 160 C 120 20, 280 20, 398 160"
        stroke="var(--color-signal-light)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Section shell — consistent gutters + vertical rhythm              */
/* ------------------------------------------------------------------ */
export function Section({
  children,
  className = "",
  id,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={`px-6 sm:px-10 ${className}`}>
      <div className="mx-auto w-full max-w-[1280px]">{children}</div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Chip — small pill tag                                             */
/* ------------------------------------------------------------------ */
export function Chip({
  children,
  active = false,
}: {
  children: ReactNode;
  active?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-pill px-5 py-2 w-fit text-[14px] font-medium transition-colors ${
        active
          ? "bg-ink text-cream"
          : "bg-white text-ink border border-ink/15 hover:border-ink/40"
      }`}
    >
      {children}
    </span>
  );
}
