import type { Metadata } from "next";
import { Sofia_Sans } from "next/font/google";
import "./globals.css";
import { Nav } from "./_components/nav";
import { Footer } from "./_components/footer";
import { Providers } from "./_lib/providers";

const sofia = Sofia_Sans({
  variable: "--font-sofia",
  subsets: ["latin"],
  display: "swap",
});

const SITE_NAME = "달팽이 그림책 연구소";
const SITE_DESC =
  "달팽이 그림책 연구소. 미디어 리터러시 · 그림책 · 아동심리학으로 아이와 미디어 사이 건강한 거리를 만드는 학부모·교사·기관 대상 교육.";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: {
    default: `${SITE_NAME} — 미디어 리터러시 · 그림책 · 아동심리`,
    template: `%s — ${SITE_NAME}`,
  },
  description: SITE_DESC,
  keywords: [
    "달팽이 그림책 연구소",
    "미디어 리터러시",
    "그림책",
    "아동심리",
    "부모 교육",
    "교사 연수",
    "미디어 효과",
  ],
  authors: [{ name: "최미선" }],
  openGraph: {
    type: "website",
    locale: "ko_KR",
    siteName: SITE_NAME,
    title: `${SITE_NAME} — 미디어 리터러시 · 그림책 · 아동심리`,
    description: SITE_DESC,
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: SITE_DESC,
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" className={`${sofia.variable} h-full`}>
      <body className="min-h-full">
        <Providers>
          <Nav />
          <main>{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
