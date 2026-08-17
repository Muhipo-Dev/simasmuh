import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './modules/core/prisma/prisma.module';
import { AuthModule } from './modules/core/auth/auth.module';
import { ClassesModule } from './modules/master-data/classes/classes.module';
import { UsersModule } from './modules/master-data/users/users.module';
import { StudentsModule } from './modules/master-data/students/students.module';
import { SchedulesModule } from './modules/academic/schedules/schedules.module';
import { AttendancesModule } from './modules/attendance/attendances/attendances.module';
import { HomeroomJournalsModule } from './modules/academic/homeroom-journals/homeroom-journals.module';
import { GradesModule } from './modules/academic/grades/grades.module';
import { SettingsModule } from './modules/core/settings/settings.module';
import { TeachingJournalsModule } from './modules/academic/teaching-journals/teaching-journals.module';
import { SubjectsModule } from './modules/master-data/subjects/subjects.module';
import { TeachersModule } from './modules/master-data/teachers/teachers.module';
import { DailyAttendancesModule } from './modules/attendance/daily-attendances/daily-attendances.module';
import { AnnouncementsModule } from './modules/communication/announcements/announcements.module';
import { StaffJournalsModule } from './modules/attendance/staff-journals/staff-journals.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { STORAGE_ROOT } from './modules/core/config/storage.config';
import { UploadModule } from './modules/core/upload/upload.module';
import { IzinKeluarModule } from './modules/attendance/izin-keluar/izin-keluar.module';
import { FinanceModule } from './modules/finance/finance/finance.module';
import { PaymentProofsModule } from './modules/finance/payment-proofs/payment-proofs.module';
import { NotificationsModule } from './modules/communication/notifications/notifications.module';
import { FaceAttendanceModule } from './modules/attendance/face-attendance/face-attendance.module';
import { APP_GUARD } from '@nestjs/core';
import { ApiKeyGuard } from './modules/core/auth/api-key.guard';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot({
      wildcard: true,
      delimiter: '.',
      maxListeners: 20,
    }),
    ServeStaticModule.forRoot({
      rootPath: STORAGE_ROOT,
      serveRoot: '/uploads',
    }),
    PrismaModule,
    AuthModule,
    ClassesModule,
    UsersModule,
    StudentsModule,
    SchedulesModule,
    AttendancesModule,
    HomeroomJournalsModule,
    GradesModule,
    SettingsModule,
    TeachingJournalsModule,
    SubjectsModule,
    TeachersModule,
    DailyAttendancesModule,
    AnnouncementsModule,
    StaffJournalsModule,
    UploadModule,
    IzinKeluarModule,
    FinanceModule,
    PaymentProofsModule,
    NotificationsModule,
    FaceAttendanceModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ApiKeyGuard,
    },
  ],
})
export class AppModule {}
