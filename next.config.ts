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
  
  // Performance optimizations
  compiler: {
    // Remove console.log in production
    removeConsole: isProd ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  
  // Turbopack configuration (now top-level in Next.js 16)
  turbopack: {
    // Resolve aliases if needed
    resolveAlias: {
      // Add any module aliases here if needed
    },
  },
  
  // Modern JavaScript optimizations
  experimental: {
    // Optimize package imports for tree shaking
    optimizePackageImports: [
      'framer-motion',
      'lucide-react',
      'react-icons',
      '@dnd-kit/core',
      '@dnd-kit/sortable',
    ],
    // Enable Turbopack filesystem caching for faster dev startup
    turbopackFileSystemCacheForDev: true,
  },
};

export default nextConfig;
