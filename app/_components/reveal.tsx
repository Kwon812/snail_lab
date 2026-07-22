"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Fades/slides its content in when it scrolls into view.
 * - `stagger`: children animate one after another instead of the wrapper as a whole.
 * - `delay`: extra delay (ms) before this block starts.
 * Respects `prefers-reduced-motion` (handled in globals.css).
 */
export function Reveal({
  children,
  className = "",
  delay = 0,
  stagger = false,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  stagger?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
      className={`${stagger ? "reveal-stagger" : "reveal"} ${shown ? "reveal-in" : ""} ${className}`}
    >
      {children}
    </div>
  );
}
