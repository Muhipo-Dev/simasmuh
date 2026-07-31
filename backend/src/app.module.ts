import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ClassesModule } from './classes/classes.module';
import { UsersModule } from './users/users.module';
import { StudentsModule } from './students/students.module';
import { SchedulesModule } from './schedules/schedules.module';
import { AttendancesModule } from './attendances/attendances.module';
import { HomeroomJournalsModule } from './homeroom-journals/homeroom-journals.module';
import { GradesModule } from './grades/grades.module';
import { SettingsModule } from './settings/settings.module';
import { TeachingJournalsModule } from './teaching-journals/teaching-journals.module';
import { SubjectsModule } from './subjects/subjects.module';
import { TeachersModule } from './teachers/teachers.module';
import { DailyAttendancesModule } from './daily-attendances/daily-attendances.module';
import { AnnouncementsModule } from './announcements/announcements.module';
import { StaffJournalsModule } from './staff-journals/staff-journals.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { UploadModule } from './upload/upload.module';
import { IzinKeluarModule } from './izin-keluar/izin-keluar.module';
import { FinanceModule } from './finance/finance.module';
import { PaymentProofsModule } from './payment-proofs/payment-proofs.module';
import { NotificationsModule } from './notifications/notifications.module';
@Module({
  imports: [
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot({
      wildcard: true,
      delimiter: '.',
      maxListeners: 20,
    }),
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
