import { pageMetadata } from "../_lib/seo";

export const metadata = pageMetadata(
  "바이브 코딩",
  "본인인증 후 실습용 OpenAI API 키를 발급받으세요.",
);

export default function VibeCodingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
