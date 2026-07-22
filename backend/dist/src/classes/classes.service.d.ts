import { PrismaService } from '../prisma/prisma.service';
export declare class ClassesService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(): Promise<({
        _count: {
            students: number;
        };
    } & {
        id: string;
        name: string;
        gradeLevel: number;
        academicYear: string;
        homeroomTeacherId: string | null;
    })[]>;
    findOne(id: string): Promise<({
        schedules: ({
            subject: {
                id: string;
                name: string;
                code: string;
            };
        } & {
            id: string;
            classId: string;
            dayOfWeek: number;
            startTime: string;
            endTime: string;
            subjectId: string;
            teacherId: string;
        })[];
        students: {
            id: string;
            name: string;
            nisn: string;
            nis: string;
            gender: string;
            classId: string;
        }[];
    } & {
        id: string;
        name: string;
        gradeLevel: number;
        academicYear: string;
        homeroomTeacherId: string | null;
    }) | null>;
    create(data: {
        name: string;
        gradeLevel: number;
        academicYear: string;
    }): Promise<{
        id: string;
        name: string;
        gradeLevel: number;
        academicYear: string;
        homeroomTeacherId: string | null;
    }>;
    update(id: string, data: {
        name?: string;
        gradeLevel?: number;
        academicYear?: string;
    }): Promise<{
        id: string;
        name: string;
        gradeLevel: number;
        academicYear: string;
        homeroomTeacherId: string | null;
    }>;
    remove(id: string): Promise<{
        id: string;
        name: string;
        gradeLevel: number;
        academicYear: string;
        homeroomTeacherId: string | null;
    }>;
}
