import type { NextConfig } from "next";
const PATH_BROWSERIFY = "path-browserify";
const EMPTY_SHIM_REL = "./src/lib/shims/empty.js";

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
    // Resolve aliases for Turbopack (dev)
    resolveAlias: {
      fs: EMPTY_SHIM_REL,
      path: PATH_BROWSERIFY,
      module: EMPTY_SHIM_REL,
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
  webpack: (config, { isServer }) => {
    config.resolve = config.resolve || {};

    // Only polyfill/alias for client bundles; keep server with real modules.
    if (!isServer) {
      config.resolve.fallback = {
        ...(config.resolve.fallback || {}),
        fs: false,
        path: require.resolve(PATH_BROWSERIFY),
        module: false,
      };

      config.resolve.alias = {
        ...(config.resolve.alias || {}),
        fs: EMPTY_SHIM_REL,
        path: PATH_BROWSERIFY,
        module: EMPTY_SHIM_REL,
      };
    }

    return config;
  },
};

export default nextConfig;
