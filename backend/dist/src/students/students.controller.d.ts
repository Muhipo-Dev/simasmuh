import { StudentsService } from './students.service';
export declare class StudentsController {
    private readonly studentsService;
    constructor(studentsService: StudentsService);
    findAll(): Promise<({
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
        } | null;
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
        userId: string | null;
        nisn: string;
        nis: string;
        gender: string;
        classId: string;
    })[]>;
    findByUser(userId: string): Promise<({
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
        userId: string | null;
        nisn: string;
        nis: string;
        gender: string;
        classId: string;
    }) | null>;
    findOne(id: string): Promise<({
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
        } | null;
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
        userId: string | null;
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
        student: {
            id: string;
            name: string;
            userId: string | null;
            nisn: string;
            nis: string;
            gender: string;
            classId: string;
        } | null;
    } & {
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
    }>;
    createBulk(dataArray: any[]): Promise<{
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
    }[]>;
    update(id: string, data: any): Promise<{
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
        } | null;
    } & {
        id: string;
        name: string;
        userId: string | null;
        nisn: string;
        nis: string;
        gender: string;
        classId: string;
    }>;
    remove(id: string): Promise<{
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
    } | {
        id: string;
        name: string;
        userId: string | null;
        nisn: string;
        nis: string;
        gender: string;
        classId: string;
    } | null>;
}
