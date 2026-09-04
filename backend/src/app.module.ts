import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { CacheModule } from '@nestjs/cache-manager';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './modules/core/prisma/prisma.module';
import { AuthModule } from './modules/core/auth/auth.module';
import { ClassesModule } from './modules/master-data/classes/classes.module';
import { UsersModule } from './modules/master-data/users/users.module';
import { StudentsModule } from './modules/master-data/students/students.module';
import { ParentsModule } from './modules/master-data/parents/parents.module';
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
import { CharacterAssessmentsModule } from './modules/academic/character-assessments/character-assessments.module';
import { GuestBookModule } from './modules/tu/guest-book/guest-book.module';
import { SuratKeluarModule } from './modules/tu/surat-keluar/surat-keluar.module';
import { SuratMasukModule } from './modules/tu/surat-masuk/surat-masuk.module';
import { NotulensiRapatModule } from './modules/tu/notulensi-rapat/notulensi-rapat.module';
import { KegiatanSekolahModule } from './modules/tu/kegiatan-sekolah/kegiatan-sekolah.module';
import { SystemLogModule } from './modules/core/system-log/system-log.module';
import { WaitingRoomModule } from './modules/core/waiting-room/waiting-room.module';
import { WaitingRoomMiddleware } from './modules/core/waiting-room/waiting-room.middleware';
import { SqlInjectionSanitizerMiddleware } from './modules/core/middlewares/sql-injection-sanitizer.middleware';
import { APP_GUARD } from '@nestjs/core';
import { ApiKeyGuard } from './modules/core/auth/api-key.guard';

import { AdaptiveThrottlerGuard } from './modules/core/guards/adaptive-throttler.guard';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot({
      wildcard: true,
      delimiter: '.',
      maxListeners: 20,
    }),
    // 🛡️ Global Rate Limiter: Proteksi longgar & adaptif
    // - Luar Jaringan/Internet: 60 req/detik (burst) & 300 req/menit
    // - Lokal Jaringan/LAN: 5x lebih besar (300 req/detik & 1500 req/menit)
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,
        limit: 60, // Internet: 60 req/dtk | Lokal: 300 req/dtk
      },
      {
        name: 'medium',
        ttl: 60000,
        limit: 300, // Internet: 300 req/menit | Lokal: 1500 req/menit
      },
    ]),
    // ⚡ In-Memory Cache Global: Caching respon database untuk performa tinggi
    CacheModule.register({
      isGlobal: true,
      ttl: 30000, // 30 detik default
      max: 500, // max 500 cached keys
    }),
    ServeStaticModule.forRoot({
      rootPath: STORAGE_ROOT,
      serveRoot: '/uploads',
    }),
    PrismaModule,
    SystemLogModule,
    WaitingRoomModule,
    AuthModule,
    ClassesModule,
    UsersModule,
    StudentsModule,
    ParentsModule,
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
    CharacterAssessmentsModule,
    GuestBookModule,
    SuratKeluarModule,
    SuratMasukModule,
    NotulensiRapatModule,
    KegiatanSekolahModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: AdaptiveThrottlerGuard, // Aktifkan Adaptive Throttler Guard (LAN vs Internet)
    },
    {
      provide: APP_GUARD,
      useClass: ApiKeyGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // 1. Terapkan Proteksi Sanitasi SQL Injection
    // 2. Terapkan Waiting Room & DDoS Surge Control
    consumer
      .apply(SqlInjectionSanitizerMiddleware, WaitingRoomMiddleware)
      .forRoutes('*');
  }
}
