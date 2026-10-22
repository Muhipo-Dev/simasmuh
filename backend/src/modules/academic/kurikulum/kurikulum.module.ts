import { Module } from '@nestjs/common';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { DocxGeneratorService } from './common/docx-generator.service';
import { KurikulumMerdekaService } from './merdeka/kurikulum-merdeka.service';
import { KurikulumMerdekaController } from './merdeka/kurikulum-merdeka.controller';

@Module({
  imports: [PrismaModule],
  controllers: [KurikulumMerdekaController],
  providers: [
    DocxGeneratorService,
    KurikulumMerdekaService,
  ],
  exports: [
    DocxGeneratorService,
    KurikulumMerdekaService,
  ],
})
export class KurikulumModule {}
