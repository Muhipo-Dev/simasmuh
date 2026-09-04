import { Module } from '@nestjs/common';
import { KegiatanSekolahController } from './kegiatan-sekolah.controller';
import { KegiatanSekolahService } from './kegiatan-sekolah.service';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { SystemLogModule } from '../../core/system-log/system-log.module';

@Module({
  imports: [PrismaModule, SystemLogModule],
  controllers: [KegiatanSekolahController],
  providers: [KegiatanSekolahService],
  exports: [KegiatanSekolahService],
})
export class KegiatanSekolahModule {}
