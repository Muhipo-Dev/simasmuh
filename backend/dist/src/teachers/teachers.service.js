"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TeachersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let TeachersService = class TeachersService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll() {
        return this.prisma.teacherProfile.findMany({
            where: {
                user: {
                    OR: [
                        { role: 'GURU' },
                        { subRole: 'GURU' },
                        { subRole2: 'GURU' },
                        { subRole3: 'GURU' },
                    ],
                },
            },
            include: {
                user: true,
                schedules: {
                    include: {
                        subject: true,
                        class: true,
                    },
                },
                homeroomClasses: true,
            },
        });
    }
    async findOne(id) {
        return this.prisma.teacherProfile.findUnique({
            where: { id },
            include: {
                user: true,
                schedules: {
                    include: {
                        subject: true,
                        class: true,
                    },
                },
                homeroomClasses: true,
            },
        });
    }
    async create(data) {
        return this.prisma.user.create({
            data: {
                username: data.username || data.nip || data.email,
                email: data.email,
                password: data.password || 'guru123',
                name: data.name,
                role: 'GURU',
                teacherProfile: {
                    create: {
                        nip: data.nip,
                        phone: data.phone,
                    },
                },
            },
            include: {
                teacherProfile: true,
            },
        });
    }
    async createBulk(dataArray) {
        return this.prisma.$transaction(dataArray.map((data) => this.prisma.user.create({
            data: {
                username: data.username || data.nip || data.email,
                email: data.email,
                password: data.password || 'guru123',
                name: data.name,
                role: 'GURU',
                teacherProfile: {
                    create: {
                        nip: data.nip,
                        phone: data.phone,
                    },
                },
            },
        })), { timeout: 60000 });
    }
    async update(id, data) {
        return this.prisma.teacherProfile.update({
            where: { id },
            data: {
                nip: data.nip,
                phone: data.phone,
                user: {
                    update: {
                        username: data.username || data.nip || data.email,
                        email: data.email,
                        name: data.name,
                        ...(data.password && { password: data.password }),
                    },
                },
            },
            include: { user: true },
        });
    }
    async remove(id) {
        const teacher = await this.prisma.teacherProfile.findUnique({
            where: { id },
        });
        if (teacher) {
            return this.prisma.user.delete({ where: { id: teacher.userId } });
        }
        return null;
    }
};
exports.TeachersService = TeachersService;
exports.TeachersService = TeachersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], TeachersService);
//# sourceMappingURL=teachers.service.js.map