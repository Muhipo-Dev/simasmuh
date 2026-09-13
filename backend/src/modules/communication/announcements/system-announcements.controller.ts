import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  Query,
} from '@nestjs/common';
import { SystemAnnouncementsService } from './system-announcements.service';

@Controller('system-announcements')
export class SystemAnnouncementsController {
  constructor(
    private readonly systemAnnouncementsService: SystemAnnouncementsService,
  ) {}

  @Post()
  create(
    @Body()
    data: {
      title: string;
      content: string;
      target?: string;
      authorId: string;
      type?: string;
      image?: string;
      isUrgent?: boolean;
    },
  ) {
    return this.systemAnnouncementsService.create(data);
  }

  @Get()
  findAll() {
    return this.systemAnnouncementsService.findAll();
  }

  @Get('dashboard')
  findForDashboard(
    @Query('role') role?: string,
    @Query('subRole') subRole?: string,
    @Query('subRole2') subRole2?: string,
    @Query('subRole3') subRole3?: string,
    @Query('subRole4') subRole4?: string,
    @Query('subRole5') subRole5?: string,
  ) {
    const roles = [
      role,
      subRole,
      subRole2,
      subRole3,
      subRole4,
      subRole5,
    ].filter(Boolean);

    if (
      roles.includes('ADMIN_IT') ||
      roles.includes('SUPERADMIN')
    ) {
      return this.systemAnnouncementsService.findAll();
    } else if (roles.includes('SISWA')) {
      return this.systemAnnouncementsService.findAll([
        'ALL',
        'SEMUA',
        'INTERNAL',
        'SISWA',
      ]);
    } else if (roles.includes('WALI_MURID')) {
      return this.systemAnnouncementsService.findAll([
        'ALL',
        'SEMUA',
        'INTERNAL',
        'WALI_MURID',
      ]);
    } else if (roles.length > 0) {
      return this.systemAnnouncementsService.findAll([
        'ALL',
        'SEMUA',
        'INTERNAL',
        'GURU',
      ]);
    }
    return this.systemAnnouncementsService.findAll(['ALL', 'SEMUA', 'PUBLIC']);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.systemAnnouncementsService.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body()
    data: Partial<{
      title: string;
      content: string;
      target: string;
      authorId: string;
      type: string;
      image: string;
    }>,
  ) {
    return this.systemAnnouncementsService.update(id, data);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.systemAnnouncementsService.remove(id);
  }
}
