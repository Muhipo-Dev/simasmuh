import { TeachersService } from './teachers.service';
export declare class TeachersController {
    private readonly teachersService;
    constructor(teachersService: TeachersService);
    findAll(): Promise<({
        user: {
            id: string;
            name: string;
            email: string;
            password: string;
            role: string;
            createdAt: Date;
            updatedAt: Date;
        };
    } & {
        id: string;
        nip: string | null;
        phone: string | null;
        userId: string;
    })[]>;
}
