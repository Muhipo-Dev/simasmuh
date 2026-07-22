import { PrismaService } from '../prisma/prisma.service';
export declare class HomeroomJournalsService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(): Promise<({
        teacher: {
            user: {
                id: string;
                email: string;
                password: string;
                name: string;
                role: string;
                createdAt: Date;
                updatedAt: Date;
            };
        } & {
            id: string;
            nip: string | null;
            phone: string | null;
            userId: string;
        };
    } & {
        id: string;
        teacherId: string;
        date: Date;
        notes: string;
        actionTaken: string | null;
    })[]>;
    findOne(id: string): Promise<({
        teacher: {
            user: {
                id: string;
                email: string;
                password: string;
                name: string;
                role: string;
                createdAt: Date;
                updatedAt: Date;
            };
        } & {
            id: string;
            nip: string | null;
            phone: string | null;
            userId: string;
        };
    } & {
        id: string;
        teacherId: string;
        date: Date;
        notes: string;
        actionTaken: string | null;
    }) | null>;
    create(data: any): Promise<{
        id: string;
        teacherId: string;
        date: Date;
        notes: string;
        actionTaken: string | null;
    }>;
    update(id: string, data: any): Promise<{
        id: string;
        teacherId: string;
        date: Date;
        notes: string;
        actionTaken: string | null;
    }>;
    remove(id: string): Promise<{
        id: string;
        teacherId: string;
        date: Date;
        notes: string;
        actionTaken: string | null;
    }>;
}
