import { PrismaService } from '../prisma/prisma.service';
export declare class TeachersService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(): Promise<({
        user: {
            id: string;
            name: string;
            email: string;
            password: string;
            role: string;
            createdAt: Date;
            updatedAt: Date;
        };
    } & {
        id: string;
        nip: string | null;
        phone: string | null;
        userId: string;
    })[]>;
}
