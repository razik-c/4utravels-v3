import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "pub-5dad1e282497443e95752a827b458a59.r2.dev",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;

