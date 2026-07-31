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
exports.AttendancesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let AttendancesService = class AttendancesService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll() {
        return this.prisma.attendance.findMany({
            include: { student: true, schedule: { include: { subject: true } } },
        });
    }
    async findOne(id) {
        return this.prisma.attendance.findUnique({
            where: { id },
            include: { student: true, schedule: true },
        });
    }
    async create(data) {
        return this.prisma.attendance.create({ data });
    }
    async createBulk(dataArray) {
        return this.prisma.$transaction(dataArray.map((data) => this.prisma.attendance.create({
            data,
        })));
    }
    async update(id, data) {
        return this.prisma.attendance.update({ where: { id }, data });
    }
    async remove(id) {
        return this.prisma.attendance.delete({ where: { id } });
    }
};
exports.AttendancesService = AttendancesService;
exports.AttendancesService = AttendancesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AttendancesService);
//# sourceMappingURL=attendances.service.js.map