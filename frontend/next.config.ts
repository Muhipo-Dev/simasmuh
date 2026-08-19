import type { NextConfig } from "next";
import os from "os";

// Dynamically fetch all server local & public IP addresses and hostnames
function getDynamicServerOrigins() {
  const hostnames = new Set<string>([
    'localhost',
    '127.0.0.1',
    '0.0.0.0',
    'simasmuh.razagopo.my.id',
    'sim.smamuhipo.sch.id',
    '182.253.144.111',
    '[IP_ADDRESS]'
  ]);

  // Include environment variable overrides if configured
  if (process.env.ALLOWED_ORIGINS) {
    process.env.ALLOWED_ORIGINS.split(',').forEach((o) => {
      const trimmed = o.trim();
      if (trimmed) hostnames.add(trimmed);
    });
  }

  if (process.env.SERVER_IP) {
    hostnames.add(process.env.SERVER_IP.trim());
  }

  // Scan all network interfaces dynamically (Wi-Fi, Ethernet, VPN, Hotspot, Public IP)
  try {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      const netList = interfaces[name];
      if (netList) {
        for (const net of netList) {
          if (net.address) {
            hostnames.add(net.address);
          }
        }
      }
    }
  } catch (err) {
    console.warn("Unable to fetch network interfaces:", err);
  }

  const hostnameList = Array.from(hostnames);

  // Common ports used in dev & production environments
  const ports = ['', ':3000', ':3001', ':80', ':443', ':8080', ':5000'];
  const originsWithPortsSet = new Set<string>();

  hostnameList.forEach((host) => {
    ports.forEach((port) => {
      originsWithPortsSet.add(`${host}${port}`);
    });
  });

  return {
    origins: hostnameList,
    originsWithPorts: Array.from(originsWithPortsSet),
  };
}

const dynamicServerData = getDynamicServerOrigins();

const nextConfig: NextConfig = {
  compress: true,
  allowedDevOrigins: [
    '*',
    ...dynamicServerData.origins,
    ...dynamicServerData.originsWithPorts,
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
      },
      {
        source: '/api/face-stream',
        destination: 'http://127.0.0.1:8089/video_feed', // Proxy to FaceNet AI Microservice
      }
    ]
  },
  images: {
    qualities: [25, 50, 75, 100],
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
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  serverExternalPackages: ['@react-pdf/renderer'],
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
  },
  onDemandEntries: {
    maxInactiveAge: 60 * 1000,
    pagesBufferLength: 8,
  },
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      'date-fns',
      'exceljs',
      'xlsx',
      'framer-motion',
      '@tanstack/react-query',
      'sweetalert2',
      'sonner',
      '@radix-ui/react-separator',
      '@radix-ui/react-switch',
      '@radix-ui/react-slot',
      'clsx',
      'tailwind-merge',
      'class-variance-authority',
      'socket.io-client',
      'qrcode.react',
    ],
    serverActions: {
      bodySizeLimit: '50mb',
      allowedOrigins: [
        '*',
        ...dynamicServerData.origins,
        ...dynamicServerData.originsWithPorts,
      ]
    }
  }
};

export default nextConfig;
