import type { Metadata } from "next";

export const SITE_NAME = "달팽이 그림책 연구소";

/**
 * openGraph/twitter는 상위 세그먼트 것과 얕은 병합(shallow merge)이라 페이지에서 정의하면
 * type/locale/siteName까지 통째로 덮어써진다 — 그래서 매번 전체를 채워서 반환한다.
 * 카카오톡 등 공유 미리보기는 og:title을 그대로 쓰므로 "사이트명 - 페이지명" 형태로 노출된다.
 */
export function pageMetadata(title: string, description: string, image?: string): Metadata {
  const ogTitle = `${SITE_NAME} - ${title}`;
  const images = image ? [{ url: image }] : undefined;

  return {
    title,
    description,
    openGraph: {
      type: "website",
      locale: "ko_KR",
      siteName: SITE_NAME,
      title: ogTitle,
      description,
      images,
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description,
      images: image ? [image] : undefined,
    },
  };
}
