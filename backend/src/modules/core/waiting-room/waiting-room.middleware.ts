import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { WaitingRoomService } from './waiting-room.service';

@Injectable()
export class WaitingRoomMiddleware implements NestMiddleware {
  constructor(private readonly waitingRoomService: WaitingRoomService) {}

  use(req: Request, res: Response, next: NextFunction) {
    this.waitingRoomService.recordRequest();

    const path = req.path || '';

    // Kecualikan endpoint public/health/waiting-room/auth login dari pemblokiran middleware
    if (
      path.startsWith('/waiting-room') ||
      path.startsWith('/api/v1/waiting-room') ||
      path.startsWith('/settings/public') ||
      path.startsWith('/api/v1/settings/public') ||
      path.startsWith('/uploads') ||
      path.startsWith('/health')
    ) {
      return next();
    }

    const clientToken = (req.headers['x-waiting-room-token'] as string) || (req.query['wr_token'] as string);

    // Jika server sedang kondisi lonjakan traffic kritis dan token belum di-admit
    if (this.waitingRoomService.isTrafficCritical()) {
      if (!this.waitingRoomService.isAdmitted(clientToken)) {
        // Berikan sinyal HTTP 429 / 503 dengan info queue redirect
        return res.status(429).json({
          statusCode: 429,
          error: 'Waiting Room Required',
          message: 'Lalu lintas server sedang sangat padat. Anda dialihkan ke ruang tunggu antrean.',
          redirectWaitingRoom: true,
        });
      }
    }

    next();
  }
}
