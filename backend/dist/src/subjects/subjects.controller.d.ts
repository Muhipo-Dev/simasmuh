import { SubjectsService } from './subjects.service';
export declare class SubjectsController {
    private readonly subjectsService;
    constructor(subjectsService: SubjectsService);
    findAll(): Promise<{
        id: string;
        name: string;
        code: string;
    }[]>;
}
