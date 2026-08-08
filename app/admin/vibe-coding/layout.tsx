import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "바이브 코딩",
};

export default function VibeCodingAdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
