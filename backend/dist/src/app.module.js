"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const event_emitter_1 = require("@nestjs/event-emitter");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
const prisma_module_1 = require("./prisma/prisma.module");
const auth_module_1 = require("./auth/auth.module");
const classes_module_1 = require("./classes/classes.module");
const users_module_1 = require("./users/users.module");
const students_module_1 = require("./students/students.module");
const schedules_module_1 = require("./schedules/schedules.module");
const attendances_module_1 = require("./attendances/attendances.module");
const homeroom_journals_module_1 = require("./homeroom-journals/homeroom-journals.module");
const grades_module_1 = require("./grades/grades.module");
const settings_module_1 = require("./settings/settings.module");
const teaching_journals_module_1 = require("./teaching-journals/teaching-journals.module");
const subjects_module_1 = require("./subjects/subjects.module");
const teachers_module_1 = require("./teachers/teachers.module");
const daily_attendances_module_1 = require("./daily-attendances/daily-attendances.module");
const announcements_module_1 = require("./announcements/announcements.module");
const staff_journals_module_1 = require("./staff-journals/staff-journals.module");
const serve_static_1 = require("@nestjs/serve-static");
const path_1 = require("path");
const upload_module_1 = require("./upload/upload.module");
const izin_keluar_module_1 = require("./izin-keluar/izin-keluar.module");
const finance_module_1 = require("./finance/finance.module");
const payment_proofs_module_1 = require("./payment-proofs/payment-proofs.module");
const notifications_module_1 = require("./notifications/notifications.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            schedule_1.ScheduleModule.forRoot(),
            event_emitter_1.EventEmitterModule.forRoot({
                wildcard: true,
                delimiter: '.',
                maxListeners: 20,
            }),
            serve_static_1.ServeStaticModule.forRoot({
                rootPath: (0, path_1.join)(process.cwd(), 'uploads'),
                serveRoot: '/uploads',
            }),
            prisma_module_1.PrismaModule,
            auth_module_1.AuthModule,
            classes_module_1.ClassesModule,
            users_module_1.UsersModule,
            students_module_1.StudentsModule,
            schedules_module_1.SchedulesModule,
            attendances_module_1.AttendancesModule,
            homeroom_journals_module_1.HomeroomJournalsModule,
            grades_module_1.GradesModule,
            settings_module_1.SettingsModule,
            teaching_journals_module_1.TeachingJournalsModule,
            subjects_module_1.SubjectsModule,
            teachers_module_1.TeachersModule,
            daily_attendances_module_1.DailyAttendancesModule,
            announcements_module_1.AnnouncementsModule,
            staff_journals_module_1.StaffJournalsModule,
            upload_module_1.UploadModule,
            izin_keluar_module_1.IzinKeluarModule,
            finance_module_1.FinanceModule,
            payment_proofs_module_1.PaymentProofsModule,
            notifications_module_1.NotificationsModule,
        ],
        controllers: [app_controller_1.AppController],
        providers: [app_service_1.AppService],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map