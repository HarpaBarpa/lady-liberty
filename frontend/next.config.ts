import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  env: {
    NEXT_PUBLIC_LIBERTY_TOKEN: process.env.NEXT_PUBLIC_LIBERTY_TOKEN || "",
  },
};

export default nextConfig;
