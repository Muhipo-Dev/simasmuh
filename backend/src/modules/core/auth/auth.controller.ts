import { Controller, Post, Body, Req } from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { Throttle } from '@nestjs/throttler';

function extractClientIp(req: Request): string {
  const cfIp = req.headers['cf-connecting-ip']?.toString();
  if (cfIp) return cfIp.trim();

  const realIp = req.headers['x-real-ip']?.toString();
  if (realIp) return realIp.trim();

  const forwardedFor = req.headers['x-forwarded-for']?.toString();
  if (forwardedFor) {
    const firstIp = forwardedFor.split(',')[0].trim();
    if (firstIp) return firstIp;
  }

  const trueClientIp = req.headers['true-client-ip']?.toString();
  if (trueClientIp) return trueClientIp.trim();

  return req.ip || req.socket?.remoteAddress || '127.0.0.1';
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // 🛡️ Proteksi Brute Force: Maksimal 6 percobaan login per 60 detik per IP
  @Throttle({ default: { limit: 6, ttl: 60000 } })
  @Post('login')
  async login(@Body() body: any, @Req() req: Request) {
    const { username, password } = body;
    const ipAddress = extractClientIp(req);
    const userAgent = req.headers['user-agent'];
    return this.authService.login(username, password, ipAddress, userAgent);
  }

  @Post('logout')
  async logout(@Body() body: { userId: string; sessionId?: string }, @Req() req: Request) {
    const ipAddress = extractClientIp(req);
    const userAgent = req.headers['user-agent'];
    return this.authService.logoutSession(body.userId, body.sessionId, ipAddress, userAgent);
  }
}


