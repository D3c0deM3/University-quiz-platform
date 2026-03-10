import { SubjectsService } from './subjects.service.js';
import { CreateSubjectDto, UpdateSubjectDto } from './dto/index.js';
export declare class SubjectsController {
    private subjectsService;
    constructor(subjectsService: SubjectsService);
    create(dto: CreateSubjectDto): Promise<{
        description: string | null;
        name: string;
        id: string;
        code: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    findAll(page: number, limit: number, search?: string): Promise<{
        data: ({
            _count: {
                materials: number;
                quizzes: number;
            };
        } & {
            description: string | null;
            name: string;
            id: string;
            code: string | null;
            createdAt: Date;
            updatedAt: Date;
        })[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    findOne(id: string): Promise<{
        _count: {
            materials: number;
            quizzes: number;
        };
    } & {
        description: string | null;
        name: string;
        id: string;
        code: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    update(id: string, dto: UpdateSubjectDto): Promise<{
        description: string | null;
        name: string;
        id: string;
        code: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    remove(id: string): Promise<{
        message: string;
    }>;
}
