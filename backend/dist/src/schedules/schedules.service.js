"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchedulesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const bcrypt = __importStar(require("bcryptjs"));
let SchedulesService = class SchedulesService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(query) {
        const where = {};
        if (query?.teacherId) {
            where.teacherId = query.teacherId;
        }
        if (query?.userId) {
            where.teacher = { userId: query.userId };
        }
        return this.prisma.schedule.findMany({
            where,
            include: {
                class: true,
                subject: true,
                teacher: { include: { user: true } },
            },
        });
    }
    async findOne(id) {
        return this.prisma.schedule.findUnique({
            where: { id },
            include: {
                class: true,
                subject: true,
                teacher: { include: { user: true } },
            },
        });
    }
    async create(data) {
        return this.prisma.schedule.create({ data });
    }
    async createBulk(dataArray) {
        const createdSchedules = [];
        let currentSubjectCount = undefined;
        for (const data of dataArray) {
            let classId = data.classId;
            if (!classId && data.className) {
                let cls = await this.prisma.class.findFirst({
                    where: { name: { equals: data.className, mode: 'insensitive' } },
                });
                if (!cls) {
                    cls = await this.prisma.class.create({
                        data: {
                            name: data.className,
                            gradeLevel: 10,
                            academicYear: '2026/2027',
                        },
                    });
                }
                classId = cls.id;
            }
            let subjectId = data.subjectId;
            if (!subjectId && data.subjectName) {
                let subject = await this.prisma.subject.findFirst({
                    where: { name: { equals: data.subjectName, mode: 'insensitive' } },
                });
                if (!subject) {
                    if (currentSubjectCount === undefined) {
                        currentSubjectCount = await this.prisma.subject.count();
                    }
                    currentSubjectCount++;
                    const prefix = currentSubjectCount.toString().padStart(2, '0');
                    const words = data.subjectName
                        .split(' ')
                        .filter((w) => w.trim().length > 0);
                    let abbr = '';
                    if (words.length === 1) {
                        abbr = words[0].substring(0, 5).toUpperCase();
                    }
                    else {
                        abbr = words
                            .map((w) => w[0])
                            .join('')
                            .toUpperCase();
                    }
                    const code = `${prefix}-${abbr}`;
                    subject = await this.prisma.subject.create({
                        data: { name: data.subjectName, code },
                    });
                }
                subjectId = subject.id;
            }
            let teacherId = data.teacherId;
            if (!teacherId && data.teacherName) {
                let teacherProf = await this.prisma.teacherProfile.findFirst({
                    where: {
                        user: { name: { equals: data.teacherName, mode: 'insensitive' } },
                    },
                    include: { user: true },
                });
                if (!teacherProf) {
                    const defaultPassword = await bcrypt.hash('guru123', 10);
                    const baseUsername = data.teacherName
                        .replace(/\s+/g, '')
                        .toLowerCase()
                        .substring(0, 15);
                    const randomNum = Math.floor(Math.random() * 1000);
                    const uniqueUsername = `${baseUsername}${randomNum}`;
                    const newUser = await this.prisma.user.create({
                        data: {
                            name: data.teacherName,
                            username: uniqueUsername,
                            password: defaultPassword,
                            role: 'GURU',
                        },
                    });
                    teacherProf = await this.prisma.teacherProfile.create({
                        data: {
                            userId: newUser.id,
                        },
                        include: { user: true },
                    });
                }
                teacherId = teacherProf.id;
            }
            if (classId && subjectId && teacherId) {
                const schedule = await this.prisma.schedule.create({
                    data: {
                        dayOfWeek: Number(data.dayOfWeek),
                        startTime: data.startTime,
                        endTime: data.endTime,
                        classId: classId,
                        subjectId: subjectId,
                        teacherId: teacherId,
                    },
                });
                createdSchedules.push(schedule);
            }
        }
        return createdSchedules;
    }
    async update(id, data) {
        return this.prisma.schedule.update({
            where: { id },
            data,
        });
    }
    async remove(id) {
        return this.prisma.schedule.delete({ where: { id } });
    }
};
exports.SchedulesService = SchedulesService;
exports.SchedulesService = SchedulesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SchedulesService);
//# sourceMappingURL=schedules.service.js.map