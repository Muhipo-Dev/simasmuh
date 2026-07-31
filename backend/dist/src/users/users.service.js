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
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const bcrypt = __importStar(require("bcryptjs"));
let UsersService = class UsersService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll() {
        return this.prisma.user.findMany({
            where: {
                role: {
                    not: 'SISWA',
                },
            },
            select: {
                id: true,
                name: true,
                email: true,
                username: true,
                nipNbm: true,
                role: true,
                subRole: true,
                subRole2: true,
                subRole3: true,
                createdAt: true,
                teacherProfile: true,
            },
        });
    }
    async create(data) {
        const nipNbmValue = data.nipNbm && data.nipNbm.trim() !== '' ? data.nipNbm.trim() : null;
        if (nipNbmValue) {
            const existingNip = await this.prisma.user.findFirst({
                where: { nipNbm: nipNbmValue },
            });
            if (existingNip)
                throw new common_1.BadRequestException('NIP / NBM sudah terdaftar pada akun lain');
        }
        const existing = await this.prisma.user.findFirst({
            where: {
                OR: [
                    ...(data.email ? [{ email: data.email }] : []),
                    { username: data.username || data.email || nipNbmValue },
                ],
            },
        });
        if (existing)
            throw new common_1.BadRequestException('Email atau username sudah terdaftar');
        const hashedPassword = await bcrypt.hash(data.password || 'password123', 10);
        return this.prisma.user.create({
            data: {
                username: data.username || data.email || nipNbmValue || 'user_' + Date.now(),
                name: data.name,
                email: data.email || null,
                nipNbm: nipNbmValue,
                password: hashedPassword,
                role: data.role || 'GURU',
                subRole: data.subRole || null,
                subRole2: data.subRole2 || null,
                subRole3: data.subRole3 || null,
                ...(data.role === 'GURU' ||
                    data.subRole === 'GURU' ||
                    data.subRole2 === 'GURU' ||
                    data.subRole3 === 'GURU'
                    ? {
                        teacherProfile: {
                            create: {
                                ...(nipNbmValue ? { nip: nipNbmValue } : {}),
                            },
                        },
                    }
                    : {}),
            },
            select: {
                id: true,
                name: true,
                email: true,
                username: true,
                nipNbm: true,
                role: true,
                subRole: true,
                subRole2: true,
                subRole3: true,
            },
        });
    }
    async update(id, data) {
        const nipNbmValue = data.nipNbm !== undefined
            ? data.nipNbm && data.nipNbm.trim() !== ''
                ? data.nipNbm.trim()
                : null
            : undefined;
        if (nipNbmValue !== undefined && nipNbmValue !== null) {
            const existingNip = await this.prisma.user.findFirst({
                where: { nipNbm: nipNbmValue, NOT: { id } },
            });
            if (existingNip)
                throw new common_1.BadRequestException('NIP / NBM sudah terdaftar pada akun lain');
        }
        const updateData = {
            name: data.name,
            email: data.email || null,
            username: data.username || data.email || data.nipNbm,
            role: data.role,
            subRole: data.subRole || null,
            subRole2: data.subRole2 || null,
            subRole3: data.subRole3 || null,
        };
        if (nipNbmValue !== undefined) {
            updateData.nipNbm = nipNbmValue;
        }
        if (data.password) {
            updateData.password = await bcrypt.hash(data.password, 10);
        }
        if (data.role === 'GURU' ||
            data.subRole === 'GURU' ||
            data.subRole2 === 'GURU' ||
            data.subRole3 === 'GURU') {
            const existingProfile = await this.prisma.teacherProfile.findUnique({
                where: { userId: id },
            });
            if (!existingProfile) {
                updateData.teacherProfile = {
                    create: { ...(nipNbmValue ? { nip: nipNbmValue } : {}) },
                };
            }
            else if (nipNbmValue !== undefined) {
                updateData.teacherProfile = { update: { nip: nipNbmValue } };
            }
        }
        return this.prisma.user.update({
            where: { id },
            data: updateData,
            select: {
                id: true,
                name: true,
                email: true,
                username: true,
                nipNbm: true,
                role: true,
                subRole: true,
                subRole2: true,
                subRole3: true,
            },
        });
    }
    async remove(id) {
        return this.prisma.user.delete({
            where: { id },
        });
    }
    async getProfile(id) {
        return this.prisma.user.findUnique({
            where: { id },
            select: {
                id: true,
                name: true,
                email: true,
                username: true,
                nipNbm: true,
                role: true,
                subRole: true,
                subRole2: true,
                subRole3: true,
                avatarUrl: true,
                address: true,
                teacherProfile: {
                    select: {
                        id: true,
                        nip: true,
                        phone: true,
                        lastEducation: true,
                        certificationStatus: true,
                        certificationYear: true,
                    },
                },
                student: {
                    select: {
                        nisn: true,
                        nis: true,
                        class: {
                            select: {
                                name: true,
                            },
                        },
                    },
                },
            },
        });
    }
    async updateProfile(id, data) {
        const updateData = {};
        if (data.name !== undefined)
            updateData.name = data.name;
        if (data.address !== undefined)
            updateData.address = data.address;
        if (data.avatarUrl !== undefined)
            updateData.avatarUrl = data.avatarUrl;
        if (data.nipNbm !== undefined)
            updateData.nipNbm = data.nipNbm ? data.nipNbm.trim() : null;
        if (data.email !== undefined) {
            if (data.email && data.email.trim() !== '') {
                const existingEmail = await this.prisma.user.findFirst({
                    where: { email: data.email.trim(), NOT: { id } },
                });
                if (existingEmail)
                    throw new common_1.BadRequestException('Email sudah terdaftar pada akun lain');
                updateData.email = data.email.trim();
            }
            else {
                updateData.email = null;
            }
        }
        if (data.newPassword && data.newPassword.trim() !== '') {
            const currentUser = await this.prisma.user.findUnique({ where: { id } });
            if (!currentUser)
                throw new common_1.BadRequestException('Pengguna tidak ditemukan');
            if (data.oldPassword !== undefined) {
                const isMatch = await bcrypt.compare(data.oldPassword, currentUser.password);
                if (!isMatch && currentUser.password !== data.oldPassword) {
                    throw new common_1.BadRequestException('Kata sandi lama yang Anda masukkan salah!');
                }
            }
            updateData.password = await bcrypt.hash(data.newPassword.trim(), 10);
        }
        const tpFields = {};
        if (data.lastEducation !== undefined)
            tpFields.lastEducation = data.lastEducation;
        if (data.certificationStatus !== undefined)
            tpFields.certificationStatus = data.certificationStatus;
        if (data.certificationYear !== undefined)
            tpFields.certificationYear = data.certificationYear
                ? Number(data.certificationYear)
                : null;
        if (data.nipNbm !== undefined)
            tpFields.nip = data.nipNbm ? data.nipNbm.trim() : null;
        if (Object.keys(tpFields).length > 0) {
            const teacherProfile = await this.prisma.teacherProfile.findUnique({
                where: { userId: id },
            });
            if (teacherProfile) {
                updateData.teacherProfile = { update: tpFields };
            }
        }
        return this.prisma.user.update({
            where: { id },
            data: updateData,
            select: {
                id: true,
                name: true,
                email: true,
                username: true,
                nipNbm: true,
                role: true,
                subRole: true,
                subRole2: true,
                avatarUrl: true,
                address: true,
                teacherProfile: {
                    select: {
                        nip: true,
                        lastEducation: true,
                        certificationStatus: true,
                        certificationYear: true,
                    },
                },
            },
        });
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], UsersService);
//# sourceMappingURL=users.service.js.map