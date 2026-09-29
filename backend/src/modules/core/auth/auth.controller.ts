import { Controller, Post, Body, Req } from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { Throttle } from '@nestjs/throttler';
import { extractClientRealIp } from '../utils/client-ip.util';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // 🛡️ Proteksi Brute Force: Maksimal 6 percobaan login per 60 detik per IP
  @Throttle({ default: { limit: 6, ttl: 60000 } })
  @Post('login')
  async login(@Body() body: any, @Req() req: Request) {
    const { username, password } = body;
    const ipAddress = extractClientRealIp(req);
    const userAgent = req.headers['user-agent'];
    return this.authService.login(username, password, ipAddress, userAgent);
  }

  @Post('logout')
  async logout(
    @Body() body: { userId: string; sessionId?: string },
    @Req() req: Request,
  ) {
    const ipAddress = extractClientRealIp(req);
    const userAgent = req.headers['user-agent'];
    return this.authService.logoutSession(
      body.userId,
      body.sessionId,
      ipAddress,
      userAgent,
    );
  }

  // 🛡️ Proteksi Anti-Spam: Maksimal 5 permintaan OTP per 60 detik per IP
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('forgot-password/request-otp')
  async requestOtp(
    @Body() body: { emailOrUsername: string },
    @Req() req: Request,
  ) {
    const ipAddress = extractClientRealIp(req);
    const userAgent = req.headers['user-agent'];
    return this.authService.requestPasswordResetOtp(
      body.emailOrUsername,
      ipAddress,
      userAgent,
    );
  }

  // 🛡️ Verifikasi Kode OTP 6-Digit
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('forgot-password/verify-otp')
  async verifyOtp(@Body() body: { emailOrUsername: string; otpCode: string }) {
    return this.authService.verifyPasswordResetOtp(
      body.emailOrUsername,
      body.otpCode,
    );
  }

  // 🛡️ Eksekusi Reset Password menggunakan OTP Sekali Pakai
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('forgot-password/reset-password')
  async resetPassword(
    @Body()
    body: {
      emailOrUsername: string;
      otpCode: string;
      newPassword: string;
    },
    @Req() req: Request,
  ) {
    const ipAddress = extractClientRealIp(req);
    const userAgent = req.headers['user-agent'];
    return this.authService.resetPasswordWithOtp(
      body.emailOrUsername,
      body.otpCode,
      body.newPassword,
      ipAddress,
      userAgent,
    );
  }
}
