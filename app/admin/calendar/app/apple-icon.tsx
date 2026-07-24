import { ImageResponse } from "next/og";

// 홈 화면 아이콘 — iOS는 배경이 없는 SVG를 그대로 쓰면 투명(검은색) 여백이 남으므로
// 크림색 배경을 꽉 채운 정사각형 위에 로고를 그려서 내보낸다.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

const MARK = `
<svg xmlns="http://www.w3.org/2000/svg" width="150" height="110" viewBox="0 0 150 110">
  <g transform="translate(3,8)">
    <path d="M 81 42 A 26 26 0 1 1 29 42 A 19.5 19.5 0 1 1 68 42 A 13 13 0 1 1 42 42 A 6.5 6.5 0 1 1 55 42" fill="none" stroke="#CF4500" stroke-width="3" stroke-linecap="round"/>
    <rect x="10" y="68" width="120" height="24" rx="12" fill="#141413"/>
    <line x1="112" y1="67" x2="117" y2="46" stroke="#141413" stroke-width="3" stroke-linecap="round"/>
    <circle cx="118" cy="42" r="4" fill="#CF4500"/>
    <line x1="124" y1="67" x2="134" y2="50" stroke="#141413" stroke-width="3" stroke-linecap="round"/>
    <circle cx="136" cy="46" r="4" fill="#CF4500"/>
  </g>
</svg>
`;

export default function AppleIcon() {
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
          width={122}
          height={90}
        />
      </div>
    ),
    { ...size },
  );
}
