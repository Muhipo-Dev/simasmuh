import { SubjectsService } from './subjects.service';
export declare class SubjectsController {
    private readonly subjectsService;
    constructor(subjectsService: SubjectsService);
    findAll(): Promise<{
        id: string;
        name: string;
        code: string;
    }[]>;
    findOne(id: string): Promise<{
        id: string;
        name: string;
        code: string;
    } | null>;
    create(data: {
        name: string;
        code: string;
    }): Promise<{
        id: string;
        name: string;
        code: string;
    }>;
    createBulk(dataArray: {
        name: string;
        code: string;
    }[]): Promise<{
        id: string;
        name: string;
        code: string;
    }[]>;
    update(id: string, data: any): Promise<{
        id: string;
        name: string;
        code: string;
    }>;
    remove(id: string): Promise<{
        id: string;
        name: string;
        code: string;
    }>;
}
