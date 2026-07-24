import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "일정 관리",
};

export default function CalendarLayout({ children }: { children: React.ReactNode }) {
  return children;
}
