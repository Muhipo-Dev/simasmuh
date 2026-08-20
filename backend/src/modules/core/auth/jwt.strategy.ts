import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'secretKey',
    });
  }

  async validate(payload: any) {
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
        throw new UnauthorizedException('Sesi login telah diakhiri atau kedaluwarsa.');
      }
    }

    return user;
  }
}
