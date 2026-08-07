import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    '172.168.2.12',
    '182.253.144.111',
    'simasmuh.razagopo.my.id',
    '192.168.137.1',
    '192.168.37.1',
    '192.168.3.253',
    'localhost',
    '127.0.0.1',
  ],
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL || 'http://127.0.0.1:3001';
    return [
      {
        source: '/api-backend/:path*',
        destination: `${backendUrl}/:path*`, // Proxy to Backend
      },
      {
        source: '/uploads/:path*',
        destination: `${backendUrl}/uploads/:path*`, // Proxy uploads to backend
      }
    ]
  },
  images: {
    qualities: [25, 50, 75, 100],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3001',
      },
      {
        protocol: 'http',
        hostname: '172.168.2.12',
      },
      {
        protocol: 'http',
        hostname: '182.253.144.111',
      },
      {
        protocol: 'https',
        hostname: 'simasmuh.razagopo.my.id',
      }
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
      allowedOrigins: [
        'simasmuh.razagopo.my.id',
        '182.253.144.111',
        '182.253.144.111:3000',
        '172.168.2.12',
        '172.168.2.12:3000',
        'localhost:3000',
        '127.0.0.1:3000',
      ]
    }
  }
};

export default nextConfig;
