import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  env: {
    NEXT_PUBLIC_LIBERTY_TOKEN: process.env.NEXT_PUBLIC_LIBERTY_TOKEN || "",
  },
};

export default nextConfig;
