import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ParentsService } from './parents.service';
import { JwtAuthGuard } from '../../core/auth/jwt-auth.guard';

@Controller('parents')
export class ParentsController {
  constructor(private readonly parentsService: ParentsService) {}

  @Get('my-dashboard')
  @UseGuards(JwtAuthGuard)
  getMyDashboard(@Req() req: any) {
    return this.parentsService.getMyDashboard(req.user?.id);
  }

  @Get('my-students')
  @UseGuards(JwtAuthGuard)
  getMyStudents(@Req() req: any) {
    return this.parentsService.getMyStudents(req.user?.id);
  }

  @Get('my-notification-settings')
  @UseGuards(JwtAuthGuard)
  async getMyNotificationSettings(@Req() req: any) {
    const dash = await this.parentsService.getMyDashboard(req.user?.id);
    return dash.notificationSettings;
  }

  @Put('my-notification-settings')
  @UseGuards(JwtAuthGuard)
  updateMyNotificationSettings(@Req() req: any, @Body() body: any) {
    return this.parentsService.updateNotificationSettings(req.user?.id, body);
  }

  @Get()
  findAll() {
    return this.parentsService.findAll();
  }

  @Get('available-students')
  getAvailableStudents() {
    return this.parentsService.getAvailableStudents();
  }

  @Post('sync-from-students')
  syncFromStudents() {
    return this.parentsService.syncFromStudents();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.parentsService.findOne(id);
  }

  @Post()
  create(@Body() data: any) {
    return this.parentsService.create(data);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() data: any) {
    return this.parentsService.update(id, data);
  }

  @Patch(':id/toggle-active')
  @UseGuards(JwtAuthGuard)
  toggleActive(
    @Param('id') id: string,
    @Body('isActive') isActive: boolean,
  ) {
    return this.parentsService.toggleActive(id, isActive);
  }

  @Post('bulk-toggle-active')
  @UseGuards(JwtAuthGuard)
  bulkToggleActive(
    @Body('ids') ids: string[],
    @Body('isActive') isActive: boolean,
  ) {
    return this.parentsService.bulkToggleActive(ids, isActive);
  }

  @Post('bulk-delete')
  bulkDelete(@Body('ids') ids: string[]) {
    return this.parentsService.removeMany(ids);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.parentsService.remove(id);
  }
}
