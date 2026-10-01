import { Module } from '@nestjs/common';
import { StorageExplorerService } from './storage-explorer.service';
import { StorageExplorerController } from './storage-explorer.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [StorageExplorerController],
  providers: [StorageExplorerService],
  exports: [StorageExplorerService],
})
export class StorageExplorerModule {}
