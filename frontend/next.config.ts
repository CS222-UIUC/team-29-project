import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ensure API routes are properly directed to the backend
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: process.env.NODE_ENV === 'production' 
          ? 'https://api.threadflow.app/:path*'  // Production API
          : 'http://backend:8000/:path*',      // Development API
      },
    ];
  },
  // Enable React strict mode for better development
  reactStrictMode: true,
  // Configure experimental features (without turbo)
  experimental: {
    // Removed turbo: true as it's now handled via CLI
  },
  // Images domains if you need external images
  images: {
    domains: ['localhost'],
  }
};

export default nextConfig;