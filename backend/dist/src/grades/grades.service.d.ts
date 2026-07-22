import { PrismaService } from '../prisma/prisma.service';
export declare class GradesService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(): Promise<({
        subject: {
            id: string;
            name: string;
            code: string;
        };
        student: {
            id: string;
            name: string;
            nisn: string;
            nis: string;
            gender: string;
            classId: string;
        };
    } & {
        id: string;
        subjectId: string;
        studentId: string;
        type: string;
        score: number;
        semester: number;
    })[]>;
    findOne(id: string): Promise<({
        subject: {
            id: string;
            name: string;
            code: string;
        };
        student: {
            id: string;
            name: string;
            nisn: string;
            nis: string;
            gender: string;
            classId: string;
        };
    } & {
        id: string;
        subjectId: string;
        studentId: string;
        type: string;
        score: number;
        semester: number;
    }) | null>;
    create(data: any): Promise<{
        id: string;
        subjectId: string;
        studentId: string;
        type: string;
        score: number;
        semester: number;
    }>;
    update(id: string, data: any): Promise<{
        id: string;
        subjectId: string;
        studentId: string;
        type: string;
        score: number;
        semester: number;
    }>;
    remove(id: string): Promise<{
        id: string;
        subjectId: string;
        studentId: string;
        type: string;
        score: number;
        semester: number;
    }>;
}
