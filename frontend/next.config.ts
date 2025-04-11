// frontend/next.config.ts (Should already be correct)
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      // Keep NextAuth routes on the frontend
      {
        source: '/api/auth/:path*',
        destination: '/api/auth/:path*', // Internal routing
      },
      // Forward other API routes to the backend
      {
        source: '/api/:path*', // This catches /api/conversations, /api/chat, etc.
        destination: process.env.NODE_ENV === 'production'
          ? 'https://production-backend-url.com/:path*'
          // Use service name from docker-compose in development
          : 'http://backend:8000/:path*',
      },
    ];
  },
  reactStrictMode: true,
  experimental: {},
  images: {
    // Add image domains if user profiles use external images (e.g., Google avatars)
    domains: ['localhost', 'lh3.googleusercontent.com'], // Example for Google images
  }
};

export default nextConfig;