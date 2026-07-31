import { UsersService } from './users.service';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    getProfile(id: string): Promise<{
        id: string;
        username: string;
        email: string | null;
        name: string;
        role: string;
        avatarUrl: string | null;
        address: string | null;
        subRole: string | null;
        subRole2: string | null;
        subRole3: string | null;
        nipNbm: string | null;
        student: {
            class: {
                name: string;
            };
            nisn: string;
            nis: string;
        } | null;
        teacherProfile: {
            id: string;
            nip: string | null;
            phone: string | null;
            lastEducation: string | null;
            certificationStatus: string | null;
            certificationYear: number | null;
        } | null;
    } | null>;
    updateProfile(id: string, data: any): Promise<{
        id: string;
        username: string;
        email: string | null;
        name: string;
        role: string;
        avatarUrl: string | null;
        address: string | null;
        subRole: string | null;
        subRole2: string | null;
        nipNbm: string | null;
        teacherProfile: {
            nip: string | null;
            lastEducation: string | null;
            certificationStatus: string | null;
            certificationYear: number | null;
        } | null;
    }>;
    findAll(): Promise<{
        id: string;
        username: string;
        email: string | null;
        name: string;
        role: string;
        createdAt: Date;
        subRole: string | null;
        subRole2: string | null;
        subRole3: string | null;
        nipNbm: string | null;
        teacherProfile: {
            id: string;
            nip: string | null;
            phone: string | null;
            lastEducation: string | null;
            certificationStatus: string | null;
            certificationYear: number | null;
            userId: string;
        } | null;
    }[]>;
    create(data: any): Promise<{
        id: string;
        username: string;
        email: string | null;
        name: string;
        role: string;
        subRole: string | null;
        subRole2: string | null;
        subRole3: string | null;
        nipNbm: string | null;
    }>;
    update(id: string, data: any): Promise<{
        id: string;
        username: string;
        email: string | null;
        name: string;
        role: string;
        subRole: string | null;
        subRole2: string | null;
        subRole3: string | null;
        nipNbm: string | null;
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
    }>;
}
