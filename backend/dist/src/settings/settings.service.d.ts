import { PrismaService } from '../prisma/prisma.service';
export declare class SettingsService {
    private prisma;
    constructor(prisma: PrismaService);
    getSettings(): Promise<{
        id: string;
        email: string | null;
        address: string;
        phone: string | null;
        schoolName: string;
        logoUrl: string | null;
        principalName: string | null;
        principalNip: string | null;
        qrPublicToken: string | null;
        bankName: string | null;
        bankNumber: string | null;
        bankOwner: string | null;
    }>;
    upsertSettings(data: any): Promise<{
        id: string;
        email: string | null;
        address: string;
        phone: string | null;
        schoolName: string;
        logoUrl: string | null;
        principalName: string | null;
        principalNip: string | null;
        qrPublicToken: string | null;
        bankName: string | null;
        bankNumber: string | null;
        bankOwner: string | null;
    }>;
    getStats(): Promise<{
        teachers: number;
        students: number;
        classes: number;
    }>;
    getQrPublicToken(): Promise<{
        token: string | null;
    }>;
    regenerateQrPublicToken(): Promise<{
        token: string | null;
    }>;
    validateQrPublicToken(token: string): Promise<{
        valid: boolean;
    }>;
    getBankAccount(): Promise<{
        bankName: string;
        bankNumber: string;
        bankOwner: string;
    }>;
    updateBankAccount(data: any): Promise<{
        id: string;
        email: string | null;
        address: string;
        phone: string | null;
        schoolName: string;
        logoUrl: string | null;
        principalName: string | null;
        principalNip: string | null;
        qrPublicToken: string | null;
        bankName: string | null;
        bankNumber: string | null;
        bankOwner: string | null;
    }>;
}
