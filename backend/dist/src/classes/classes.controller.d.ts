import { ClassesService } from './classes.service';
export declare class ClassesController {
    private readonly classesService;
    constructor(classesService: ClassesService);
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
            userId: string | null;
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
    createBulk(dataArray: {
        name: string;
        gradeLevel: number;
        academicYear: string;
    }[]): Promise<{
        id: string;
        name: string;
        gradeLevel: number;
        academicYear: string;
        homeroomTeacherId: string | null;
    }[]>;
    update(id: string, data: any): Promise<{
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
