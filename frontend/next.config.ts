import type { NextConfig } from "next";
import os from "os";
import path from "path";

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

  // Scan OS hostname & FQDN
  try {
    const host = os.hostname();
    if (host) {
      hostnames.add(host);
      hostnames.add(`${host}.local`);
      hostnames.add(`${host}.lan`);
    }
  } catch (err) {
    console.warn("Unable to fetch OS hostname:", err);
  }

  // Include environment variable overrides for custom domains & tunnel URLs
  const envDomainVars = [
    process.env.ALLOWED_ORIGINS,
    process.env.DOMAIN,
    process.env.CUSTOM_DOMAIN,
    process.env.NEXTAUTH_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.APP_URL,
    process.env.SERVER_IP
  ];

  envDomainVars.forEach((val) => {
    if (!val) return;
    val.split(',').forEach((item) => {
      const trimmed = item.trim();
      if (trimmed) {
        try {
          if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
            const parsedUrl = new URL(trimmed);
            hostnames.add(parsedUrl.hostname);
          } else {
            hostnames.add(trimmed);
          }
        } catch {
          hostnames.add(trimmed);
        }
      }
    });
  });

  // Dynamic domain wildcard patterns & popular tunnel / local domain resolvers
  const commonDomainSuffixes = [
    '*.loca.lt',
    '*.ngrok-free.app',
    '*.ngrok.io',
    '*.trycloudflare.com',
    '*.nip.io',
    '*.sslip.io',
    '*.local',
    '*.lan'
  ];
  commonDomainSuffixes.forEach((d) => hostnames.add(d));

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
  turbopack: {
    root: path.resolve(__dirname),
  },
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
  reactStrictMode: false, // Prevents duplicate double-invocations in dev for faster response
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  // next-auth v4 → openid-client v5 memakai url.parse(); jika dibundel ke .next, Node 24 memunculkan DEP0169.
  // Externalize openid-client agar dimuat dari node_modules (DEP0169 tidak dipicu dari node_modules).
  // Catatan: jangan externalize 'next-auth' (memicu duplikasi instance React saat prerender).
  serverExternalPackages: ['@react-pdf/renderer', 'openid-client'],
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
  },
  onDemandEntries: {
    maxInactiveAge: 120 * 1000,
    pagesBufferLength: 20,
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
      '@radix-ui/react-dialog',
      '@radix-ui/react-popover',
      '@radix-ui/react-select',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-tooltip',
      '@radix-ui/react-tabs',
      '@radix-ui/react-accordion',
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
