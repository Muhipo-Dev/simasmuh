import { PrismaService } from '../prisma/prisma.service';
export declare class HomeroomJournalsService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(): Promise<({
        teacher: {
            user: {
                id: string;
                username: string;
                email: string | null;
                password: string;
                name: string;
                role: string;
                avatarUrl: string | null;
                address: string | null;
                createdAt: Date;
                updatedAt: Date;
                subRole: string | null;
                subRole2: string | null;
                subRole3: string | null;
                nipNbm: string | null;
            };
        } & {
            id: string;
            nip: string | null;
            phone: string | null;
            lastEducation: string | null;
            certificationStatus: string | null;
            certificationYear: number | null;
            userId: string;
        };
    } & {
        id: string;
        notes: string;
        teacherId: string;
        date: Date;
        actionTaken: string | null;
    })[]>;
    findOne(id: string): Promise<({
        teacher: {
            user: {
                id: string;
                username: string;
                email: string | null;
                password: string;
                name: string;
                role: string;
                avatarUrl: string | null;
                address: string | null;
                createdAt: Date;
                updatedAt: Date;
                subRole: string | null;
                subRole2: string | null;
                subRole3: string | null;
                nipNbm: string | null;
            };
        } & {
            id: string;
            nip: string | null;
            phone: string | null;
            lastEducation: string | null;
            certificationStatus: string | null;
            certificationYear: number | null;
            userId: string;
        };
    } & {
        id: string;
        notes: string;
        teacherId: string;
        date: Date;
        actionTaken: string | null;
    }) | null>;
    create(data: any): Promise<{
        id: string;
        notes: string;
        teacherId: string;
        date: Date;
        actionTaken: string | null;
    }>;
    update(id: string, data: any): Promise<{
        id: string;
        notes: string;
        teacherId: string;
        date: Date;
        actionTaken: string | null;
    }>;
    remove(id: string): Promise<{
        id: string;
        notes: string;
        teacherId: string;
        date: Date;
        actionTaken: string | null;
    }>;
}
