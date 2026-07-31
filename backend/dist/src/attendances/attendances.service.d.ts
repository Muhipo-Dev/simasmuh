import { PrismaService } from '../prisma/prisma.service';
export declare class AttendancesService {
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
        schedule: {
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
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        studentId: string;
        status: string;
        date: Date;
        scheduleId: string;
        location: string | null;
        photoUrl: string | null;
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
        createdAt: Date;
        updatedAt: Date;
        studentId: string;
        status: string;
        date: Date;
        scheduleId: string;
        location: string | null;
        photoUrl: string | null;
    }) | null>;
    create(data: any): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        studentId: string;
        status: string;
        date: Date;
        scheduleId: string;
        location: string | null;
        photoUrl: string | null;
    }>;
    createBulk(dataArray: any[]): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        studentId: string;
        status: string;
        date: Date;
        scheduleId: string;
        location: string | null;
        photoUrl: string | null;
    }[]>;
    update(id: string, data: any): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        studentId: string;
        status: string;
        date: Date;
        scheduleId: string;
        location: string | null;
        photoUrl: string | null;
    }>;
    remove(id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        studentId: string;
        status: string;
        date: Date;
        scheduleId: string;
        location: string | null;
        photoUrl: string | null;
    }>;
}
