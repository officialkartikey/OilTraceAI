import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return {
      fallback: [
        {
          source: '/api/:path*',
          destination: 'http://localhost:5000/api/:path*' // Proxy all unmatched API requests to Backend
        }
      ]
    };
  }
};

export default nextConfig;
