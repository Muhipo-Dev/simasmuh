import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';
import { extractClientRealIp } from '../utils/client-ip.util';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'secretKey',
      passReqToCallback: true,
    });
  }

  async validate(req: any, payload: any) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        role: true,
        subRole: true,
        subRole2: true,
        subRole3: true,
        subRole4: true,
        subRole5: true,
        student: true,
        teacherProfile: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Jika token memiliki sessionId, periksa apakah sesi tersebut masih aktif di database
    if (payload.sessionId) {
      const activeSession = await this.prisma.userSession.findFirst({
        where: {
          id: payload.sessionId,
          userId: payload.sub,
          isActive: true,
        },
      });

      if (!activeSession) {
        throw new UnauthorizedException(
          'Sesi login telah diakhiri atau kedaluwarsa.',
        );
      }

      // Update lastActiveAt heartbeat & client IP dynamically (Debounced per 15 detik)
      const now = Date.now();
      const lastActive = activeSession.lastActiveAt
        ? new Date(activeSession.lastActiveAt).getTime()
        : 0;
      const currentIp = extractClientRealIp(req);

      if (
        now - lastActive > 15000 ||
        (currentIp &&
          currentIp !== '127.0.0.1' &&
          activeSession.ipAddress !== currentIp)
      ) {
        this.prisma.userSession
          .update({
            where: { id: activeSession.id },
            data: {
              lastActiveAt: new Date(),
              ...(currentIp && currentIp !== '127.0.0.1'
                ? { ipAddress: currentIp }
                : {}),
            },
          })
          .catch(() => {});
      }
    }

    return user;
  }
}
