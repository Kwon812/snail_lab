import type { MetadataRoute } from "next";

// 사이트 전체가 아니라 모바일 캘린더 앱 화면만 PWA로 설치되도록 scope/start_url을 그 경로로 좁혀둔다.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "강사 캘린더",
    short_name: "강사 캘린더",
    description: "달팽이 그림책 연구소 관리자용 일정 캘린더",
    start_url: "/admin/calendar/app",
    scope: "/admin/calendar/app",
    display: "standalone",
    background_color: "#f3f0ee",
    theme_color: "#f3f0ee",
    icons: [
      {
        src: "/admin/calendar/app/icon",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
