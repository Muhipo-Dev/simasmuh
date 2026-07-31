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
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const prisma_service_1 = require("../prisma/prisma.service");
const bcrypt = __importStar(require("bcryptjs"));
let AuthService = class AuthService {
    prisma;
    jwtService;
    constructor(prisma, jwtService) {
        this.prisma = prisma;
        this.jwtService = jwtService;
    }
    async login(emailOrUsername, password) {
        const user = await this.prisma.user.findFirst({
            where: {
                OR: [
                    { email: emailOrUsername },
                    { username: emailOrUsername },
                    { nipNbm: emailOrUsername },
                    { teacherProfile: { nip: emailOrUsername } },
                    { student: { nis: emailOrUsername } },
                    { student: { nisn: emailOrUsername } },
                ],
            },
            include: {
                student: true,
                teacherProfile: true,
            },
        });
        if (!user) {
            throw new common_1.UnauthorizedException('Email, username, atau NIP/NBM salah');
        }
        let isValid = false;
        if (user.password.startsWith('$2')) {
            isValid = await bcrypt.compare(password, user.password);
        }
        else {
            isValid = user.password === password;
        }
        if (!isValid && user.role === 'SISWA' && user.student) {
            if (password === user.student.nis ||
                password === user.student.nisn ||
                password === user.username ||
                password === `siswa${user.student.nis}` ||
                password === `siswa${user.student.nisn}`) {
                isValid = true;
            }
        }
        if (!isValid) {
            throw new common_1.UnauthorizedException('Email, username, atau kata sandi salah');
        }
        const payload = {
            sub: user.id,
            email: user.email,
            username: user.username,
            nipNbm: user.nipNbm || user.teacherProfile?.nip || null,
            name: user.name,
            role: user.role,
            subRole: user.subRole,
            subRole2: user.subRole2,
            subRole3: user.subRole3,
        };
        const token = this.jwtService.sign(payload);
        return {
            access_token: token,
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                nipNbm: user.nipNbm || user.teacherProfile?.nip || null,
                name: user.name,
                role: user.role,
                subRole: user.subRole,
                subRole2: user.subRole2,
                subRole3: user.subRole3,
            },
        };
    }
    async googleLogin(email) {
        const user = await this.prisma.user.findFirst({
            where: { email },
            include: {
                student: true,
                teacherProfile: true,
            },
        });
        if (!user) {
            throw new common_1.NotFoundException('User with this Google email not found');
        }
        const payload = {
            sub: user.id,
            email: user.email,
            username: user.username,
            nipNbm: user.nipNbm || user.teacherProfile?.nip || null,
            name: user.name,
            role: user.role,
            subRole: user.subRole,
            subRole2: user.subRole2,
            subRole3: user.subRole3,
        };
        const token = this.jwtService.sign(payload);
        return {
            access_token: token,
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                nipNbm: user.nipNbm || user.teacherProfile?.nip || null,
                name: user.name,
                role: user.role,
                subRole: user.subRole,
                subRole2: user.subRole2,
                subRole3: user.subRole3,
            },
        };
    }
    async linkGoogleAccount(email, username, password) {
        const loginResult = await this.login(username, password);
        if (!loginResult) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        const existingUserWithEmail = await this.prisma.user.findFirst({
            where: { email },
        });
        if (existingUserWithEmail && existingUserWithEmail.id !== loginResult.user.id) {
            throw new common_1.UnauthorizedException('Email Google ini sudah ditautkan dengan akun lain.');
        }
        const updatedUser = await this.prisma.user.update({
            where: { id: loginResult.user.id },
            data: { email: email },
            include: {
                student: true,
                teacherProfile: true,
            },
        });
        const payload = {
            sub: updatedUser.id,
            email: updatedUser.email,
            username: updatedUser.username,
            nipNbm: updatedUser.nipNbm || updatedUser.teacherProfile?.nip || null,
            name: updatedUser.name,
            role: updatedUser.role,
            subRole: updatedUser.subRole,
            subRole2: updatedUser.subRole2,
            subRole3: updatedUser.subRole3,
        };
        const token = this.jwtService.sign(payload);
        return {
            access_token: token,
            user: {
                id: updatedUser.id,
                email: updatedUser.email,
                username: updatedUser.username,
                nipNbm: updatedUser.nipNbm || updatedUser.teacherProfile?.nip || null,
                name: updatedUser.name,
                role: updatedUser.role,
                subRole: updatedUser.subRole,
                subRole2: updatedUser.subRole2,
                subRole3: updatedUser.subRole3,
            },
        };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService])
], AuthService);
//# sourceMappingURL=auth.service.js.map