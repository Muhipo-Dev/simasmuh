import { SettingsService } from './settings.service';
export declare class SettingsController {
    private readonly settingsService;
    constructor(settingsService: SettingsService);
    getStats(): Promise<{
        teachers: number;
        students: number;
        classes: number;
    }>;
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
    getQrPublicToken(): Promise<{
        token: string | null;
    }>;
    regenerateQrPublicToken(): Promise<{
        token: string | null;
    }>;
    validateQrPublicToken(token: string): Promise<{
        valid: boolean;
    }>;
}
