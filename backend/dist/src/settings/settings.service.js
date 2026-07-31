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
exports.SettingsService = void 0;
const common_1 = require("@nestjs/common");
const crypto_1 = require("crypto");
const prisma_service_1 = require("../prisma/prisma.service");
let SettingsService = class SettingsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getSettings() {
        const settings = await this.prisma.setting.findFirst();
        if (!settings) {
            return this.prisma.setting.create({
                data: {
                    schoolName: 'Nama Sekolah',
                    address: 'Alamat Sekolah',
                },
            });
        }
        return settings;
    }
    async upsertSettings(data) {
        const settings = await this.prisma.setting.findFirst();
        if (settings) {
            return this.prisma.setting.update({
                where: { id: settings.id },
                data,
            });
        }
        return this.prisma.setting.create({
            data,
        });
    }
    async getStats() {
        const [teacherCount, studentCount, classCount] = await Promise.all([
            this.prisma.teacherProfile.count(),
            this.prisma.student.count(),
            this.prisma.class.count(),
        ]);
        return {
            teachers: teacherCount,
            students: studentCount,
            classes: classCount,
        };
    }
    async getQrPublicToken() {
        let settings = await this.prisma.setting.findFirst();
        if (!settings) {
            settings = await this.getSettings();
        }
        if (!settings.qrPublicToken) {
            const token = (0, crypto_1.randomBytes)(16).toString('hex');
            settings = await this.prisma.setting.update({
                where: { id: settings.id },
                data: { qrPublicToken: token },
            });
        }
        return { token: settings.qrPublicToken };
    }
    async regenerateQrPublicToken() {
        const settings = await this.getSettings();
        const token = (0, crypto_1.randomBytes)(16).toString('hex');
        const updated = await this.prisma.setting.update({
            where: { id: settings.id },
            data: { qrPublicToken: token },
        });
        return { token: updated.qrPublicToken };
    }
    async validateQrPublicToken(token) {
        const settings = await this.prisma.setting.findFirst();
        return { valid: settings?.qrPublicToken === token };
    }
    async getBankAccount() {
        const settings = await this.prisma.setting.findFirst({
            select: {
                bankName: true,
                bankNumber: true,
                bankOwner: true,
            },
        });
        if (!settings) {
            return { bankName: '', bankNumber: '', bankOwner: '' };
        }
        return {
            bankName: settings.bankName || '',
            bankNumber: settings.bankNumber || '',
            bankOwner: settings.bankOwner || '',
        };
    }
    async updateBankAccount(data) {
        const settings = await this.prisma.setting.findFirst();
        if (!settings) {
            return this.prisma.setting.create({
                data: {
                    schoolName: data.schoolName || 'Nama Sekolah',
                    address: data.address || 'Alamat Sekolah',
                    bankName: data.bankName || '',
                    bankNumber: data.bankNumber || '',
                    bankOwner: data.bankOwner || '',
                },
            });
        }
        return this.prisma.setting.update({
            where: { id: settings.id },
            data: {
                ...(data.bankName !== undefined && { bankName: data.bankName }),
                ...(data.bankNumber !== undefined && { bankNumber: data.bankNumber }),
                ...(data.bankOwner !== undefined && { bankOwner: data.bankOwner }),
            },
        });
    }
};
exports.SettingsService = SettingsService;
exports.SettingsService = SettingsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SettingsService);
//# sourceMappingURL=settings.service.js.map