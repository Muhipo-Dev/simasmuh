import { Module } from '@nestjs/common';
import { WaitingRoomService } from './waiting-room.service';
import { WaitingRoomController } from './waiting-room.controller';
import { WaitingRoomMiddleware } from './waiting-room.middleware';

@Module({
  controllers: [WaitingRoomController],
  providers: [WaitingRoomService, WaitingRoomMiddleware],
  exports: [WaitingRoomService, WaitingRoomMiddleware],
})
export class WaitingRoomModule {}
