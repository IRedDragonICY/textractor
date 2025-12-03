import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";
const isTauri = process.env.TAURI_ENV_PLATFORM !== undefined;

const nextConfig: NextConfig = {
  // Enable static export for Tauri
  output: isProd || isTauri ? "export" : undefined,
  
  // Disable image optimization for static export
  images: {
    unoptimized: true,
  },
  
  // Trailing slash for file-based routing in Tauri
  trailingSlash: true,
  
  // Disable server-side features for Tauri compatibility
  ...(isTauri && {
    experimental: {
      // Optimize for Tauri builds
    },
  }),
};

export default nextConfig;
