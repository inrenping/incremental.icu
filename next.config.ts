import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
const withNextIntl = createNextIntlPlugin();
const nextConfig: NextConfig = {
  async rewrites() {
    if (process.env.NODE_ENV === "development") {
      return [
        {
          // 匹配所有 /api/v1 开头的请求
          source: "/api/v1/:path*",
          destination: `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/:path*`,
        },
      ];
    }
    return [];
  }
};
export default withNextIntl(nextConfig);
