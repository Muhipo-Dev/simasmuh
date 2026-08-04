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
import { AnnouncementsService } from './announcements.service';

@Controller('announcements')
export class AnnouncementsController {
  constructor(private readonly announcementsService: AnnouncementsService) {}

  @Post()
  create(
    @Body()
    data: {
      title: string;
      content: string;
      target: string;
      authorId: string;
      type?: string;
      eventDate?: string | Date;
      image?: string;
    },
  ) {
    return this.announcementsService.create(data);
  }

  @Get()
  findAll() {
    // Superadmin fetch all
    return this.announcementsService.findAll();
  }

  @Get('public')
  findPublic() {
    // For landing page & public pages
    return this.announcementsService.findAll(['ALL', 'PUBLIC', 'SEMUA']);
  }

  @Get('dashboard')
  findForDashboard(
    @Query('role') role?: string,
    @Query('subRole') subRole?: string,
    @Query('subRole2') subRole2?: string,
    @Query('subRole3') subRole3?: string,
  ) {
    const roles = [role, subRole, subRole2, subRole3].filter(Boolean);
    if (roles.includes('ADMIN_IT') || roles.includes('ADMIN_WEB') || roles.includes('SUPERADMIN')) {
      return this.announcementsService.findAll();
    } else if (roles.includes('SISWA')) {
      return this.announcementsService.findAll(['ALL', 'SEMUA', 'INTERNAL', 'SISWA']);
    } else if (roles.length > 0) {
      return this.announcementsService.findAll(['ALL', 'SEMUA', 'INTERNAL', 'GURU', 'WALI_MURID']);
    }
    return this.announcementsService.findAll(['ALL', 'SEMUA', 'PUBLIC']);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.announcementsService.findOne(id);
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
      eventDate: string | Date;
      image: string;
    }>,
  ) {
    return this.announcementsService.update(id, data);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.announcementsService.remove(id);
  }
}
