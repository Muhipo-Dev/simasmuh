import { SchedulesService } from './schedules.service';
export declare class SchedulesController {
    private readonly schedulesService;
    constructor(schedulesService: SchedulesService);
    findAll(): Promise<({
        subject: {
            id: string;
            name: string;
            code: string;
        };
        class: {
            id: string;
            name: string;
            gradeLevel: number;
            academicYear: string;
            homeroomTeacherId: string | null;
        };
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
        classId: string;
        dayOfWeek: number;
        startTime: string;
        endTime: string;
        subjectId: string;
        teacherId: string;
    })[]>;
    findOne(id: string): Promise<({
        subject: {
            id: string;
            name: string;
            code: string;
        };
        class: {
            id: string;
            name: string;
            gradeLevel: number;
            academicYear: string;
            homeroomTeacherId: string | null;
        };
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
        classId: string;
        dayOfWeek: number;
        startTime: string;
        endTime: string;
        subjectId: string;
        teacherId: string;
    }) | null>;
    create(data: any): Promise<{
        id: string;
        classId: string;
        dayOfWeek: number;
        startTime: string;
        endTime: string;
        subjectId: string;
        teacherId: string;
    }>;
    update(id: string, data: any): Promise<{
        id: string;
        classId: string;
        dayOfWeek: number;
        startTime: string;
        endTime: string;
        subjectId: string;
        teacherId: string;
    }>;
    remove(id: string): Promise<{
        id: string;
        classId: string;
        dayOfWeek: number;
        startTime: string;
        endTime: string;
        subjectId: string;
        teacherId: string;
    }>;
}
