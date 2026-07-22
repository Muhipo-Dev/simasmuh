import { Module } from '@nestjs/common';
import { TeachersController } from './teachers.controller';
import { TeachersService } from './teachers.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [TeachersController],
  providers: [TeachersService, PrismaService]
})
export class TeachersModule {}
