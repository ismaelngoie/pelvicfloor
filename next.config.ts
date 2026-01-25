import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export", // Crucial for Cloudflare Pages (Static Export)
  images: {
    unoptimized: true, // Required for static export
  },
  reactStrictMode: true,
};

export default nextConfig;
