import { Injectable, Optional } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerRequest, ThrottlerException } from '@nestjs/throttler';
import { Request } from 'express';
import { extractClientRealIp, isPrivateOrLocalIp } from '../utils/client-ip.util';
import { WaitingRoomService } from '../waiting-room/waiting-room.service';

/**
 * AdaptiveThrottlerGuard
 * -------------------------------------------------------------
 * Memberikan alokasi kuota / rate limit yang terintegrasi cerdas dengan
 * sistem Waiting Room dan asal jaringan:
 * 1. Jaringan Lokal / LAN: 5x Kuota Normal (Prioritas tinggi operasional sekolah).
 * 2. Pengguna Valid Ber-Tiket Waiting Room (Admitted Token): 2x Kuota Normal (Layanan lancar bebas throttle).
 * 3. Jika Server Sedang Lonjakan Kritis (High Surge / DDoS): Memicu Waiting Room Redirect secara elegan.
 */
@Injectable()
export class AdaptiveThrottlerGuard extends ThrottlerGuard {
  constructor(
    @Optional() private readonly waitingRoomService?: WaitingRoomService,
    ...rest: any[]
  ) {
    super(...(rest as [any, any, any]));
  }

  protected async handleRequest(requestProps: ThrottlerRequest): Promise<boolean> {
    const { context, limit, ttl, throttler } = requestProps;
    const req = context.switchToHttp().getRequest<Request>();
    const clientIp = extractClientRealIp(req);
    const isLocal = isPrivateOrLocalIp(clientIp);

    const clientToken =
      (req.headers?.['x-waiting-room-token'] as string) ||
      (req.query?.['wr_token'] as string);

    const isAdmitted = this.waitingRoomService?.isAdmitted(clientToken) ?? false;

    // Hitung multiplier kuota dinamis:
    // - Jaringan LAN/Lokal: 5x limit
    // - Pengguna berstatus Admitted di Waiting Room: 2.5x limit
    // - Pengunjung biasa/Luar Jaringan: 1x limit
    let multiplier = 1;
    if (isLocal) {
      multiplier = 5;
    } else if (isAdmitted) {
      multiplier = 2.5;
    }

    const adjustedLimit = Math.round(limit * multiplier);

    try {
      return await super.handleRequest({
        ...requestProps,
        limit: adjustedLimit,
        ttl,
        throttler,
      });
    } catch (err) {
      if (err instanceof ThrottlerException) {
        // Jika server sedang ramai atau batas terlewati, aktifkan waiting room otomatis
        this.waitingRoomService?.recordRequest();
        const res = context.switchToHttp().getResponse();
        if (!res.headersSent) {
          res.status(429).json({
            statusCode: 429,
            error: 'Too Many Requests',
            message: 'Batas frekuensi permintaan terlampaui. Sistem mengarahkan Anda ke ruang tunggu antrean yang aman.',
            redirectWaitingRoom: true,
            isLocalNetwork: isLocal,
          });
          return false;
        }
      }
      throw err;
    }
  }

  protected async getTracker(req: Record<string, any>): Promise<string> {
    return extractClientRealIp(req);
  }
}

