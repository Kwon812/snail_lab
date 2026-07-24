import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "월간 캘린더",
  robots: { index: false, follow: false },
};

export default function CalendarAppLayout({ children }: { children: React.ReactNode }) {
  return children;
}
