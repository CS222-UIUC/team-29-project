import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ensure API routes are properly directed to the backend
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: process.env.NODE_ENV === 'production' 
          ? 'https://api.threadflow.app/:path*'  // Production API
          : 'http://localhost:8000/:path*',      // Development API
      },
    ];
  },
  reactStrictMode: true,
  experimental: {
  },
  images: {
    domains: ['localhost'],
  }
};

export default nextConfig;