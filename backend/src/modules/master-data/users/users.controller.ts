import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../../core/auth/jwt-auth.guard';
import { RolesGuard } from '../../core/auth/roles.guard';
import { Roles, UserRole } from '../../core/auth/roles.decorator';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get(':id/profile')
  getProfile(@Param('id') id: string) {
    return this.usersService.getProfile(id);
  }

  @Get(':id/login-history')
  getLoginHistory(@Param('id') id: string) {
    return this.usersService.getLoginHistory(id);
  }

  @Get(':id/unlink-logs')
  getUnlinkLogs(@Param('id') id: string) {
    return this.usersService.getUnlinkLogs(id);
  }

  @Delete(':id/unlink-logs')
  deleteUnlinkLogs(@Param('id') id: string) {
    return this.usersService.deleteUnlinkLogs(id);
  }

  @Delete(':id/unlink-logs/:logId')
  deleteSingleUnlinkLog(
    @Param('id') id: string,
    @Param('logId') logId: string,
  ) {
    return this.usersService.deleteSingleUnlinkLog(id, logId);
  }

  @Post(':id/unlink-session')
  unlinkSession(@Param('id') id: string, @Body('sessionId') sessionId: string) {
    return this.usersService.unlinkSession(id, sessionId);
  }

  @Get('all-active-sessions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERADMIN', UserRole.ADMIN_IT)
  getSupervisorAllSessions() {
    return this.usersService.getAllActiveSessions();
  }

  @Post('terminate-all-sessions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERADMIN', UserRole.ADMIN_IT)
  terminateAllSessions(
    @Body('excludeCurrentSessionId') excludeCurrentSessionId: string,
    @Request() req: any,
  ) {
    return this.usersService.terminateAllSessions(
      req.user?.id,
      excludeCurrentSessionId || req.user?.sessionId,
    );
  }

  @Post('terminate-session/:sessionId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERADMIN', UserRole.ADMIN_IT)
  terminateSession(@Param('sessionId') sessionId: string, @Request() req: any) {
    return this.usersService.terminateSession(sessionId, req.user?.id);
  }

  @Delete('session/:sessionId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERADMIN', UserRole.ADMIN_IT)
  deleteSingleSession(
    @Param('sessionId') sessionId: string,
    @Request() req: any,
  ) {
    return this.usersService.deleteSingleSession(sessionId, req.user?.id);
  }

  @Delete(':id/all-sessions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERADMIN', UserRole.ADMIN_IT)
  deleteUserSessions(@Param('id') id: string, @Request() req: any) {
    return this.usersService.deleteUserSessions(id, req.user?.id);
  }

  @Post(':id/send-reset-password')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERADMIN', UserRole.ADMIN_IT)
  sendPasswordResetLink(@Param('id') id: string, @Request() req: any) {
    return this.usersService.sendPasswordResetLink(id, req.user);
  }

  @Put(':id/profile')
  updateProfile(@Param('id') id: string, @Body() data: any) {
    return this.usersService.updateProfile(id, data);
  }

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Post()
  create(@Body() data: any) {
    return this.usersService.create(data);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() data: any) {
    return this.usersService.update(id, data);
  }

  @Post('bulk-delete')
  bulkDelete(@Body('ids') ids: string[]) {
    return this.usersService.removeMany(ids);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
