import { PrismaService } from '../prisma/prisma.service';
export declare class GradesService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(): Promise<({
        student: {
            id: string;
            name: string;
            userId: string | null;
            nisn: string;
            nis: string;
            gender: string;
            classId: string;
        };
        subject: {
            id: string;
            name: string;
            code: string;
        };
    } & {
        id: string;
        studentId: string;
        subjectId: string;
        type: string;
        score: number;
        semester: number;
    })[]>;
    findOne(id: string): Promise<({
        student: {
            id: string;
            name: string;
            userId: string | null;
            nisn: string;
            nis: string;
            gender: string;
            classId: string;
        };
        subject: {
            id: string;
            name: string;
            code: string;
        };
    } & {
        id: string;
        studentId: string;
        subjectId: string;
        type: string;
        score: number;
        semester: number;
    }) | null>;
    create(data: any): Promise<{
        id: string;
        studentId: string;
        subjectId: string;
        type: string;
        score: number;
        semester: number;
    }>;
    update(id: string, data: any): Promise<{
        id: string;
        studentId: string;
        subjectId: string;
        type: string;
        score: number;
        semester: number;
    }>;
    remove(id: string): Promise<{
        id: string;
        studentId: string;
        subjectId: string;
        type: string;
        score: number;
        semester: number;
    }>;
}
