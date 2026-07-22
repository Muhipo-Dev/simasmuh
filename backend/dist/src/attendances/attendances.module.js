"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AttendancesModule = void 0;
const common_1 = require("@nestjs/common");
const attendances_controller_1 = require("./attendances.controller");
const attendances_service_1 = require("./attendances.service");
const prisma_service_1 = require("../prisma/prisma.service");
let AttendancesModule = class AttendancesModule {
};
exports.AttendancesModule = AttendancesModule;
exports.AttendancesModule = AttendancesModule = __decorate([
    (0, common_1.Module)({
        controllers: [attendances_controller_1.AttendancesController],
        providers: [attendances_service_1.AttendancesService, prisma_service_1.PrismaService]
    })
], AttendancesModule);
//# sourceMappingURL=attendances.module.js.map