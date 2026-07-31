import { PrismaService } from '../prisma/prisma.service';
export declare class TeachersService {
    private prisma;
    constructor(prisma: PrismaService);
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
        };
        homeroomClasses: {
            id: string;
            name: string;
            gradeLevel: number;
            academicYear: string;
            homeroomTeacherId: string | null;
        }[];
        schedules: ({
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
        } & {
            id: string;
            classId: string;
            dayOfWeek: number;
            startTime: string;
            endTime: string;
            subjectId: string;
            teacherId: string;
        })[];
    } & {
        id: string;
        nip: string | null;
        phone: string | null;
        lastEducation: string | null;
        certificationStatus: string | null;
        certificationYear: number | null;
        userId: string;
    })[]>;
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
        };
        homeroomClasses: {
            id: string;
            name: string;
            gradeLevel: number;
            academicYear: string;
            homeroomTeacherId: string | null;
        }[];
        schedules: ({
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
        } & {
            id: string;
            classId: string;
            dayOfWeek: number;
            startTime: string;
            endTime: string;
            subjectId: string;
            teacherId: string;
        })[];
    } & {
        id: string;
        nip: string | null;
        phone: string | null;
        lastEducation: string | null;
        certificationStatus: string | null;
        certificationYear: number | null;
        userId: string;
    }) | null>;
    create(data: any): Promise<{
        teacherProfile: {
            id: string;
            nip: string | null;
            phone: string | null;
            lastEducation: string | null;
            certificationStatus: string | null;
            certificationYear: number | null;
            userId: string;
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
        };
    } & {
        id: string;
        nip: string | null;
        phone: string | null;
        lastEducation: string | null;
        certificationStatus: string | null;
        certificationYear: number | null;
        userId: string;
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
    } | null>;
}
