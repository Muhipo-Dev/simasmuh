import { SchedulesService } from './schedules.service';
export declare class SchedulesController {
    private readonly schedulesService;
    constructor(schedulesService: SchedulesService);
    findAll(userId?: string, teacherId?: string): Promise<({
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
    createBulk(dataArray: any[]): Promise<any[]>;
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
