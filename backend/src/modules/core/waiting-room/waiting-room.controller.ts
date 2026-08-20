import { Controller, Get, Post, Body, Query, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { WaitingRoomService } from './waiting-room.service';

@Controller('waiting-room')
export class WaitingRoomController {
  constructor(private readonly waitingRoomService: WaitingRoomService) {}

  @Get('status')
  getStatus(@Query('token') token: string, @Req() req: Request) {
    const ip = req.ip || req.headers['x-forwarded-for']?.toString() || req.socket.remoteAddress;
    return this.waitingRoomService.getOrCreateQueue(token, ip);
  }

  @Post('heartbeat')
  heartbeat(@Body() body: { token?: string }, @Req() req: Request) {
    const ip = req.ip || req.headers['x-forwarded-for']?.toString() || req.socket.remoteAddress;
    return this.waitingRoomService.getOrCreateQueue(body.token, ip);
  }

  @Get('metrics')
  getMetrics() {
    return this.waitingRoomService.getMetrics();
  }

  @Post('admin/config')
  updateConfig(@Body() body: { maxCapacity?: number; maxRps?: number; forceEnabled?: boolean }) {
    return this.waitingRoomService.setCapacity(body.maxCapacity, body.maxRps, body.forceEnabled);
  }
}
