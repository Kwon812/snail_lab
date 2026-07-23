import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "자료실 관리",
};

export default function ArchiveLayout({ children }: { children: React.ReactNode }) {
  return children;
}
