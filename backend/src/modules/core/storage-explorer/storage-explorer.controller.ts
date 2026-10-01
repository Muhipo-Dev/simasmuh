import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Req,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { StorageExplorerService } from './storage-explorer.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles, UserRole } from '../auth/roles.decorator';

@Controller('storage-explorer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(
  UserRole.SUPERADMIN,
  UserRole.ADMIN_IT,
  UserRole.ADMIN_TU,
  UserRole.KEUANGAN,
  UserRole.KEUANGAN_ALL,
  UserRole.KEUANGAN_MASUK,
  UserRole.KEUANGAN_KELUAR,
  UserRole.SUPERVISOR_KEUANGAN,
)
export class StorageExplorerController {
  constructor(private readonly storageExplorerService: StorageExplorerService) {}

  @Get('list')
  async listContents(
    @Query('path') path: string = '',
    @Query('search') search: string = '',
    @Query('type') type: string = 'ALL',
  ) {
    return this.storageExplorerService.listContents(path, search, type);
  }

  @Get('stats')
  async getStats() {
    return this.storageExplorerService.getStats();
  }

  @Post('mkdir')
  async createFolder(@Body() body: { path?: string; name: string }) {
    if (!body.name) {
      throw new BadRequestException('Nama folder wajib diisi');
    }
    return this.storageExplorerService.createFolder(body.path || '', body.name);
  }

  @Post('upload')
  async uploadFiles(
    @Body() body: { path?: string; files: Array<{ name: string; base64: string }> },
  ) {
    if (!body.files || !Array.isArray(body.files) || body.files.length === 0) {
      throw new BadRequestException('Berkas upload tidak valid atau kosong');
    }
    return this.storageExplorerService.uploadFiles(body.path || '', body.files);
  }

  @Post('rename')
  async renameItem(
    @Body() body: { path?: string; oldName: string; newName: string },
  ) {
    if (!body.oldName || !body.newName) {
      throw new BadRequestException('Nama lama dan nama baru wajib diisi');
    }
    return this.storageExplorerService.renameItem(
      body.path || '',
      body.oldName,
      body.newName,
    );
  }

  @Post('delete')
  async deleteItem(@Body() body: { path?: string; name: string }) {
    if (!body.name) {
      throw new BadRequestException('Nama item wajib ditentukan');
    }
    return this.storageExplorerService.deleteItem(body.path || '', body.name);
  }

  @Post('sync-face-ai')
  async syncFaceNetAi() {
    return this.storageExplorerService.triggerFaceAiSync();
  }

  @Get('students-list')
  async getStudentsList(@Query('search') search: string = '') {
    return this.storageExplorerService.getStudentsList(search);
  }

  @Get('surat-list')
  async getSuratList(@Query('search') search: string = '') {
    return this.storageExplorerService.getSuratList(search);
  }

  @Post('link-student')
  async linkPhotoToStudent(
    @Body() body: { studentId: string; fileRelPath: string },
  ) {
    if (!body.studentId || !body.fileRelPath) {
      throw new BadRequestException('studentId dan fileRelPath wajib diisi');
    }
    return this.storageExplorerService.linkPhotoToStudent(
      body.studentId,
      body.fileRelPath,
    );
  }

  @Post('link-surat')
  async linkDocToSurat(
    @Body()
    body: {
      suratId: string;
      suratType: 'MASUK' | 'KELUAR';
      fileRelPath: string;
    },
  ) {
    if (!body.suratId || !body.suratType || !body.fileRelPath) {
      throw new BadRequestException('suratId, suratType, dan fileRelPath wajib diisi');
    }
    return this.storageExplorerService.linkDocToSurat(
      body.suratId,
      body.suratType,
      body.fileRelPath,
    );
  }

  @Get('tagihan-list')
  async getTagihanList(@Query('search') search: string = '') {
    return this.storageExplorerService.getTagihanList(search);
  }

  @Post('link-payment-proof')
  async linkProofToTagihan(
    @Body()
    body: {
      tagihanId: string;
      fileRelPath: string;
      amount?: number;
      notes?: string;
    },
  ) {
    if (!body.tagihanId || !body.fileRelPath) {
      throw new BadRequestException('tagihanId dan fileRelPath wajib diisi');
    }
    return this.storageExplorerService.linkProofToTagihan(
      body.tagihanId,
      body.fileRelPath,
      body.amount,
      body.notes,
    );
  }

  @Get('backups')
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN_IT)
  async getBackupsList() {
    return this.storageExplorerService.getBackupsList();
  }

  @Post('create-backup')
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN_IT)
  async createFullBackup(@Body('notes') notes?: string) {
    return this.storageExplorerService.createFullBackup(notes);
  }

  @Post('reset-challenge')
  @Roles(UserRole.SUPERADMIN)
  async requestResetChallenge(
    @Req() req: any,
    @Body('password') password?: string,
  ) {
    const userId = req.user?.id || req.user?.userId;
    return this.storageExplorerService.requestResetChallenge(userId, password);
  }

  @Post('execute-reset')
  @Roles(UserRole.SUPERADMIN)
  async executeSystemReset(
    @Req() req: any,
    @Body()
    body: {
      challengeCode: string;
      confirmPhrase: string;
      resetOption: 'TRANSACTIONAL_ONLY' | 'ALL_STUDENTS_AND_DATA';
    },
  ) {
    const userId = req.user?.id || req.user?.userId;
    return this.storageExplorerService.executeSystemReset(userId, body);
  }
}

