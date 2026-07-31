import { PrismaService } from '../prisma/prisma.service';
export declare class SubjectsService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(): Promise<{
        id: string;
        name: string;
        code: string;
    }[]>;
    findOne(id: string): Promise<{
        id: string;
        name: string;
        code: string;
    } | null>;
    create(data: {
        name: string;
        code: string;
    }): Promise<{
        id: string;
        name: string;
        code: string;
    }>;
    createBulk(dataArray: {
        name: string;
        code: string;
    }[]): Promise<{
        id: string;
        name: string;
        code: string;
    }[]>;
    update(id: string, data: {
        name?: string;
        code?: string;
    }): Promise<{
        id: string;
        name: string;
        code: string;
    }>;
    remove(id: string): Promise<{
        id: string;
        name: string;
        code: string;
    }>;
}
