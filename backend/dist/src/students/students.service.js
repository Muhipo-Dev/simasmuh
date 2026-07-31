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
exports.StudentsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const bcrypt = __importStar(require("bcryptjs"));
let StudentsService = class StudentsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll() {
        return this.prisma.student.findMany({
            include: { class: true, user: true },
        });
    }
    async findOne(id) {
        return this.prisma.student.findUnique({
            where: { id },
            include: { class: true, user: true },
        });
    }
    async findByUserId(userId) {
        return this.prisma.student.findFirst({
            where: { userId },
            include: { class: true },
        });
    }
    async create(data) {
        const username = data.username || data.nisn;
        const plainPassword = data.password || username;
        const hashedPassword = await bcrypt.hash(plainPassword, 10);
        return this.prisma.user.create({
            data: {
                username: username,
                email: data.nis,
                password: hashedPassword,
                name: data.name,
                role: 'SISWA',
                student: {
                    create: {
                        nisn: data.nisn,
                        nis: data.nis,
                        name: data.name,
                        gender: data.gender,
                        classId: data.classId,
                    },
                },
            },
            include: {
                student: true,
            },
        });
    }
    async createBulk(dataArray) {
        const hashedDataArray = await Promise.all(dataArray.map(async (data) => {
            const username = data.username || data.nisn || String(Math.random());
            const plainPassword = data.password || username;
            const hashedPassword = await bcrypt.hash(plainPassword, 10);
            return { ...data, username, password: hashedPassword };
        }));
        return this.prisma.$transaction(hashedDataArray.map((data) => {
            return this.prisma.user.upsert({
                where: { username: data.username },
                update: {
                    name: data.name,
                    password: data.password,
                    student: {
                        upsert: {
                            update: {
                                nisn: data.nisn,
                                nis: data.nis,
                                name: data.name,
                                gender: data.gender,
                                classId: data.classId,
                            },
                            create: {
                                nisn: data.nisn,
                                nis: data.nis,
                                name: data.name,
                                gender: data.gender,
                                classId: data.classId,
                            },
                        },
                    },
                },
                create: {
                    username: data.username,
                    password: data.password,
                    name: data.name,
                    role: 'SISWA',
                    student: {
                        create: {
                            nisn: data.nisn,
                            nis: data.nis,
                            name: data.name,
                            gender: data.gender,
                            classId: data.classId,
                        },
                    },
                },
            });
        }), { timeout: 60000 });
    }
    async update(id, data) {
        const student = await this.prisma.student.findUnique({ where: { id } });
        if (!student)
            throw new Error('Student not found');
        let finalPassword = data.password;
        if (finalPassword && !finalPassword.startsWith('$2')) {
            finalPassword = await bcrypt.hash(finalPassword, 10);
        }
        return this.prisma.student.update({
            where: { id },
            data: {
                nisn: data.nisn,
                nis: data.nis,
                name: data.name,
                gender: data.gender,
                ...(data.classId && { class: { connect: { id: data.classId } } }),
                ...(student.userId && {
                    user: {
                        update: {
                            name: data.name,
                            ...(data.username && { username: data.username }),
                            ...(finalPassword && { password: finalPassword }),
                        },
                    },
                }),
            },
            include: { user: true },
        });
    }
    async remove(id) {
        const student = await this.prisma.student.findUnique({ where: { id } });
        if (student) {
            if (student.userId) {
                return this.prisma.user.delete({ where: { id: student.userId } });
            }
            else {
                return this.prisma.student.delete({ where: { id } });
            }
        }
        return null;
    }
};
exports.StudentsService = StudentsService;
exports.StudentsService = StudentsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], StudentsService);
//# sourceMappingURL=students.service.js.map