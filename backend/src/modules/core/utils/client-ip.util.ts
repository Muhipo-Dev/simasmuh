import type { Request } from 'express';

/**
 * Ekstraksi Alamat IP Klien / ISP Endpoint Pengguna Nyata
 * Mendukung header proxy Cloudflare, Reverse Proxy Nginx, Tunneling (Ngrok, Localtunnel, Cloudflared),
 * Load Balancer, dan koneksi langsung (LAN / Wi-Fi).
 */
export function extractClientRealIp(req: Request | any): string {
  if (!req) return '127.0.0.1';

  // 1. Cloudflare IP
  const cfIp = req.headers?.['cf-connecting-ip']?.toString();
  if (cfIp && isValidIp(cfIp.trim())) return cfIp.trim();

  // 2. Akamai / Fastly / Edge True Client IP
  const trueClientIp = req.headers?.['true-client-ip']?.toString();
  if (trueClientIp && isValidIp(trueClientIp.trim()))
    return trueClientIp.trim();

  // 3. Standar X-Real-IP dari Reverse Proxy / Nginx
  const realIp = req.headers?.['x-real-ip']?.toString();
  if (realIp && isValidIp(realIp.trim())) return realIp.trim();

  // 4. Standar X-Forwarded-For (Ambil hop pertama = Client asli pengguna / ISP)
  const forwardedFor = req.headers?.['x-forwarded-for']?.toString();
  if (forwardedFor) {
    const ips = forwardedFor.split(',').map((ip: string) => ip.trim());
    for (const ip of ips) {
      if (ip && isValidIp(ip)) {
        return ip;
      }
    }
  }

  // 5. Header kustom lainnya
  const clientIp = req.headers?.['x-client-ip']?.toString();
  if (clientIp && isValidIp(clientIp.trim())) return clientIp.trim();

  // 6. Fallback Express / Socket Remote Address
  let socketIp =
    req.ip ||
    req.socket?.remoteAddress ||
    req.connection?.remoteAddress ||
    '127.0.0.1';

  // Normalisasi IPv6 localhost ::ffff:127.0.0.1 / ::1
  if (socketIp.startsWith('::ffff:')) {
    socketIp = socketIp.substring(7);
  } else if (socketIp === '::1') {
    socketIp = '127.0.0.1';
  }

  return socketIp;
}

function isValidIp(ip: string): boolean {
  if (!ip) return false;
  // Saring format IP yang valid
  return (
    /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(ip) || /^[a-fA-F0-9:]+$/.test(ip)
  );
}

/**
 * Deteksi apakah alamat IP berasal dari Jaringan Lokal / LAN / Intranet Sekolah
 * Mencakup Loopback (127.0.0.1, ::1), Kelas A (10.x.x.x), Kelas B (172.16.x.x - 172.31.x.x),
 * Kelas C (192.168.x.x), dan Carrier Grade NAT (100.64.x.x).
 */
export function isPrivateOrLocalIp(ip: string): boolean {
  if (!ip) return false;
  const cleanIp = ip.trim();

  // Localhost & Loopback
  if (
    cleanIp === '127.0.0.1' ||
    cleanIp === '::1' ||
    cleanIp === 'localhost' ||
    cleanIp.startsWith('127.')
  ) {
    return true;
  }

  // 10.0.0.0 – 10.255.255.255 (Private Class A)
  if (cleanIp.startsWith('10.')) {
    return true;
  }

  // 192.168.0.0 – 192.168.255.255 (Private Class C)
  if (cleanIp.startsWith('192.168.')) {
    return true;
  }

  // 172.16.0.0 – 172.31.255.255 (Private Class B)
  const matchB = cleanIp.match(/^172\.(\d{1,3})\./);
  if (matchB) {
    const secondOctet = parseInt(matchB[1], 10);
    if (secondOctet >= 16 && secondOctet <= 31) {
      return true;
    }
  }

  // 169.254.0.0 – 169.254.255.255 (Link-Local)
  if (cleanIp.startsWith('169.254.')) {
    return true;
  }

  // 100.64.0.0 - 100.127.255.255 (Carrier-Grade NAT)
  const matchCgnat = cleanIp.match(/^100\.(\d{1,3})\./);
  if (matchCgnat) {
    const secondOctet = parseInt(matchCgnat[1], 10);
    if (secondOctet >= 64 && secondOctet <= 127) {
      return true;
    }
  }

  return false;
}

