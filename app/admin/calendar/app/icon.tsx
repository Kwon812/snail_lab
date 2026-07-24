import { ImageResponse } from "next/og";

// 매니페스트/안드로이드용 아이콘 — apple-icon.tsx와 동일하게 배경을 꽉 채워서
// 마스킹(둥근 모서리, 어댑티브 아이콘) 시 여백이 검게 남지 않도록 한다.
export const size = { width: 512, height: 512 };
export const contentType = "image/png";

const MARK = `
<svg xmlns="http://www.w3.org/2000/svg" width="150" height="110" viewBox="0 0 150 110">
  <g transform="translate(3,8)">
    <path d="M 81 42 A 26 26 0 1 1 29 42 A 19.5 19.5 0 1 1 68 42 A 13 13 0 1 1 42 42 A 6.5 6.5 0 1 1 55 42" fill="none" stroke="#CF4500" stroke-width="6" stroke-linecap="round"/>
    <rect x="10" y="68" width="120" height="24" rx="12" fill="#141413"/>
    <line x1="112" y1="67" x2="117" y2="46" stroke="#141413" stroke-width="6" stroke-linecap="round"/>
    <circle cx="118" cy="42" r="4" fill="#CF4500"/>
    <line x1="124" y1="67" x2="134" y2="50" stroke="#141413" stroke-width="6" stroke-linecap="round"/>
    <circle cx="136" cy="46" r="4" fill="#CF4500"/>
  </g>
</svg>
`;

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#F3F0EE",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <img
          alt=""
          src={`data:image/svg+xml;base64,${Buffer.from(MARK).toString("base64")}`}
          width={340}
          height={250}
        />
      </div>
    ),
    { ...size },
  );
}
