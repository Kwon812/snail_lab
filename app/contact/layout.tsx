import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "문의하기",
  description: "개인·학부모 수강 문의, 기관·학교 출강 요청, 협업 제안을 남겨주세요.",
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
