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
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const pg_1 = require("pg");
const adapter_pg_1 = require("@prisma/adapter-pg");
const bcrypt = __importStar(require("bcryptjs"));
const connectionString = process.env.DATABASE_URL;
const pool = new pg_1.Pool({ connectionString });
const adapter = new adapter_pg_1.PrismaPg(pool);
const prisma = new client_1.PrismaClient({ adapter });
async function main() {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const guruPassword = await bcrypt.hash('guru123', 10);
    const superAdmin = await prisma.user.upsert({
        where: { username: 'superadmin' },
        update: {},
        create: {
            username: 'superadmin',
            email: 'superadmin@sekolah.com',
            name: 'Super Admin',
            password: hashedPassword,
            role: 'ADMIN_IT',
        },
    });
    const guru = await prisma.user.upsert({
        where: { username: 'guru' },
        update: {},
        create: {
            username: 'guru',
            email: 'guru@sekolah.com',
            name: 'Guru Wali',
            password: guruPassword,
            role: 'GURU',
            teacherProfile: {
                create: {
                    nip: '198001012005011001',
                    phone: '081234567890',
                }
            }
        },
    });
    const math = await prisma.subject.upsert({
        where: { code: 'MTK-101' },
        update: {},
        create: {
            name: 'Matematika',
            code: 'MTK-101',
        },
    });
    const bio = await prisma.subject.upsert({
        where: { code: 'BIO-101' },
        update: {},
        create: {
            name: 'Biologi',
            code: 'BIO-101',
        },
    });
    console.log({ superAdmin, guru, math, bio });
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map