import type { NextConfig } from "next";
import os from "os";

// Dynamically fetch all server local & public IP addresses and hostnames
function getDynamicServerOrigins() {
  const hostnames = new Set<string>([
    'localhost',
    '127.0.0.1',
    '0.0.0.0',
    'simasmuh.razagopo.my.id',
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
  experimental: {
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
