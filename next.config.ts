import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // 강의계획서 PDF 업로드를 위해 서버 액션 본문 제한을 1MB → 10MB로 상향
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
