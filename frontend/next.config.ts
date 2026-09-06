import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return {
      fallback: [
        {
          source: '/api/:path*',
          destination: 'http://127.0.0.1:8080/api/:path*' // Proxy all unmatched API requests to Backend
        }
      ]
    };
  }
};

export default nextConfig;
