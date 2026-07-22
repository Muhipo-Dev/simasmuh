import { PrismaService } from '../prisma/prisma.service';
export declare class TeachingJournalsService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(): Promise<({
        schedule: {
            class: {
                id: string;
                name: string;
                gradeLevel: number;
                academicYear: string;
                homeroomTeacherId: string | null;
            };
        } & {
            id: string;
            classId: string;
            dayOfWeek: number;
            startTime: string;
            endTime: string;
            subjectId: string;
            teacherId: string;
        };
    } & {
        id: string;
        teacherId: string;
        date: Date;
        scheduleId: string;
        notes: string | null;
        material: string;
    })[]>;
    findOne(id: string): Promise<({
        schedule: {
            id: string;
            classId: string;
            dayOfWeek: number;
            startTime: string;
            endTime: string;
            subjectId: string;
            teacherId: string;
        };
    } & {
        id: string;
        teacherId: string;
        date: Date;
        scheduleId: string;
        notes: string | null;
        material: string;
    }) | null>;
    create(data: any): Promise<{
        id: string;
        teacherId: string;
        date: Date;
        scheduleId: string;
        notes: string | null;
        material: string;
    }>;
    update(id: string, data: any): Promise<{
        id: string;
        teacherId: string;
        date: Date;
        scheduleId: string;
        notes: string | null;
        material: string;
    }>;
    remove(id: string): Promise<{
        id: string;
        teacherId: string;
        date: Date;
        scheduleId: string;
        notes: string | null;
        material: string;
    }>;
}
