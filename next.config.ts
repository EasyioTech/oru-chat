import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'], // Modern image formats
    minimumCacheTTL: 60, // Cache for 60 seconds
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
  },
  outputFileTracingRoot: path.resolve(__dirname, '../../'),

  // Production optimizations - enable type checking and linting
  typescript: {
    ignoreBuildErrors: false, // Enable strict type checking
  },
  eslint: {
    ignoreDuringBuilds: false, // Enable linting during builds
  },

  // Enable compression
  compress: true,

  // Optimize builds
  swcMinify: true,
  reactStrictMode: true,
} as NextConfig;

export default nextConfig;
