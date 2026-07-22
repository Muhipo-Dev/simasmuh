import { PrismaService } from '../prisma/prisma.service';
export declare class StudentsService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(): Promise<({
        class: {
            id: string;
            name: string;
            gradeLevel: number;
            academicYear: string;
            homeroomTeacherId: string | null;
        };
    } & {
        id: string;
        name: string;
        nisn: string;
        nis: string;
        gender: string;
        classId: string;
    })[]>;
    findOne(id: string): Promise<({
        class: {
            id: string;
            name: string;
            gradeLevel: number;
            academicYear: string;
            homeroomTeacherId: string | null;
        };
    } & {
        id: string;
        name: string;
        nisn: string;
        nis: string;
        gender: string;
        classId: string;
    }) | null>;
    create(data: {
        nisn: string;
        nis: string;
        name: string;
        gender: string;
        classId: string;
    }): Promise<{
        id: string;
        name: string;
        nisn: string;
        nis: string;
        gender: string;
        classId: string;
    }>;
    update(id: string, data: {
        nisn?: string;
        nis?: string;
        name?: string;
        gender?: string;
        classId?: string;
    }): Promise<{
        id: string;
        name: string;
        nisn: string;
        nis: string;
        gender: string;
        classId: string;
    }>;
    remove(id: string): Promise<{
        id: string;
        name: string;
        nisn: string;
        nis: string;
        gender: string;
        classId: string;
    }>;
}
