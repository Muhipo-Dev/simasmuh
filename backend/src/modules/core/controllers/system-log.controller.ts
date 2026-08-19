import {
  Controller,
  Get,
  Post,
  Query,
  Param,
  Body,
  Res,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import { SystemLogService } from '../services/system-log.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('system-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SystemLogController {
  constructor(private readonly systemLogService: SystemLogService) {}

  @Get()
  @Roles('SUPERADMIN', 'ADMIN_IT', 'ADMIN_WEB')
  async getLogs(
    @Query('category') category?: string,
    @Query('level') level?: string,
    @Query('search') search?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('isArchived') isArchived?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const isArchivedBool =
      isArchived === 'true' ? true : isArchived === 'false' ? false : undefined;

    return this.systemLogService.getLogs({
      category,
      level,
      search,
      startDate,
      endDate,
      isArchived: isArchivedBool,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Get('stats')
  @Roles('SUPERADMIN', 'ADMIN_IT', 'ADMIN_WEB')
  async getStorageStats() {
    return this.systemLogService.getStorageStats();
  }

  @Get('archives')
  @Roles('SUPERADMIN', 'ADMIN_IT', 'ADMIN_WEB')
  async getArchives(
    @Query('category') category?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.systemLogService.getArchives({
      category,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Post('archive-now')
  @Roles('SUPERADMIN', 'ADMIN_IT')
  async triggerArchiveNow(
    @Body()
    body?: {
      category?: string;
      forceAll?: boolean;
      algorithm?: 'GZIP_LEVEL_9' | 'BROTLI_MAX';
    },
  ) {
    return this.systemLogService.archiveLogsToSupabase({
      category: body?.category || 'ALL',
      forceAll: body?.forceAll || false,
      algorithm: body?.algorithm || 'GZIP_LEVEL_9',
    });
  }

  @Get('archives/:id/download')
  @Roles('SUPERADMIN', 'ADMIN_IT', 'ADMIN_WEB')
  async downloadArchive(
    @Param('id') id: string,
    @Query('decompress') decompress: string,
    @Res() res: Response,
  ) {
    const shouldDecompress = decompress === 'true';
    const result = await this.systemLogService.getArchiveContent(id, shouldDecompress);

    if (result.isDecompressed) {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${result.archive.filename.replace(/\.(gz|br)$/, '')}"`,
      );
      return res.status(HttpStatus.OK).send(JSON.stringify(result.data, null, 2));
    } else {
      res.setHeader('Content-Type', result.contentType || 'application/gzip');
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      return res.status(HttpStatus.OK).send(result.buffer);
    }
  }

  @Get('archives/:id/preview')
  @Roles('SUPERADMIN', 'ADMIN_IT', 'ADMIN_WEB')
  async previewArchive(@Param('id') id: string) {
    return this.systemLogService.getArchiveContent(id, true);
  }

  @Post('purge')
  @Roles('SUPERADMIN', 'ADMIN_IT')
  async purgeArchived(@Body() body?: { olderThanDays?: number }) {
    return this.systemLogService.purgeArchivedLogs(body?.olderThanDays || 30);
  }
}
