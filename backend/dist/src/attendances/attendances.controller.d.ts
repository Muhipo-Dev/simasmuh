import { AttendancesService } from './attendances.service';
export declare class AttendancesController {
    private readonly attendancesService;
    constructor(attendancesService: AttendancesService);
    findAll(): Promise<({
        student: {
            id: string;
            name: string;
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
        date: Date;
        status: string;
        studentId: string;
        scheduleId: string;
    })[]>;
    findOne(id: string): Promise<({
        student: {
            id: string;
            name: string;
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
        date: Date;
        status: string;
        studentId: string;
        scheduleId: string;
    }) | null>;
    create(data: any): Promise<{
        id: string;
        date: Date;
        status: string;
        studentId: string;
        scheduleId: string;
    }>;
    update(id: string, data: any): Promise<{
        id: string;
        date: Date;
        status: string;
        studentId: string;
        scheduleId: string;
    }>;
    remove(id: string): Promise<{
        id: string;
        date: Date;
        status: string;
        studentId: string;
        scheduleId: string;
    }>;
}
