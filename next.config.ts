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
  
  // Modern JavaScript optimizations - reduce polyfills
  experimental: {
    // Optimize package imports for tree shaking
    optimizePackageImports: [
      'framer-motion',
      'lucide-react',
      'react-icons',
      '@dnd-kit/core',
      '@dnd-kit/sortable',
    ],
  },
  
  // Webpack optimizations
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Optimize chunks
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          ...config.optimization?.splitChunks,
          cacheGroups: {
            ...(config.optimization?.splitChunks as { cacheGroups?: Record<string, unknown> })?.cacheGroups,
            // Separate heavy libraries into their own chunks
            framerMotion: {
              test: /[\\/]node_modules[\\/]framer-motion[\\/]/,
              name: 'framer-motion',
              chunks: 'all',
              priority: 20,
            },
            dndKit: {
              test: /[\\/]node_modules[\\/]@dnd-kit[\\/]/,
              name: 'dnd-kit',
              chunks: 'all',
              priority: 20,
            },
          },
        },
      };
    }
    return config;
  },
};

export default nextConfig;
