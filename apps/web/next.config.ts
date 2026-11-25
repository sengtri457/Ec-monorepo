import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, "../.."),
  transpilePackages: ["@ec/map-basemap"],
  env: {
    NEXT_PUBLIC_BAKONG_ACCOUNT_ID:
      process.env.NEXT_PUBLIC_BAKONG_ACCOUNT_ID ||
      process.env.BAKONG_ACCOUNT_ID ||
      "",
    NEXT_PUBLIC_BAKONG_MERCHANT_NAME:
      process.env.NEXT_PUBLIC_BAKONG_MERCHANT_NAME ||
      process.env.BAKONG_MERCHANT_NAME ||
      "",
  },
  experimental: {
    cpus: 1,
  },
};

export default nextConfig;
