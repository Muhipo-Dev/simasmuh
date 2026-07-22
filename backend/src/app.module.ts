import { Module } from '@nestjs/common';
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

@Module({
  imports: [PrismaModule, AuthModule, ClassesModule, UsersModule, StudentsModule, SchedulesModule, AttendancesModule, HomeroomJournalsModule, GradesModule, SettingsModule, TeachingJournalsModule, SubjectsModule, TeachersModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
