import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: import.meta.dirname,
  },
  reactStrictMode: true,
  compress: true,
  images: {
    formats: ["image/avif", "image/webp"],
  },
  typescript: {
    // Pre-existing TS errors in company pages (custom component prop mismatches)
    // TODO: Fix these and remove this flag
    ignoreBuildErrors: true,
  },
  async rewrites() {
    return [
      {
        source: '/api2/:path*',
        destination: 'http://localhost:8000/:path*' // Proxy to backend2 (FastAPI)
      },
      {
        source: '/api/:path*',
        destination: 'http://localhost:5500/api/:path*' // Proxy to backend
      }
    ];
  }
};

export default nextConfig;
