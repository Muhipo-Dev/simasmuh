import { Controller, Post, Body, Req } from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() body: any, @Req() req: Request) {
    const { username, password } = body;
    const ipAddress = req.ip || req.headers['x-forwarded-for']?.toString() || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.authService.login(username, password, ipAddress, userAgent);
  }

  @Post('logout')
  async logout(@Body() body: { userId: string; sessionId?: string }) {
    return this.authService.logoutSession(body.userId, body.sessionId);
  }
}


