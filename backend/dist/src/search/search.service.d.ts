import { PrismaService } from '../prisma/prisma.service.js';
import { SearchQueryDto } from './dto/search-query.dto.js';
export declare class SearchService {
    private prisma;
    constructor(prisma: PrismaService);
    search(dto: SearchQueryDto): Promise<{
        data: {
            id: any;
            title: any;
            summary: any;
            keywords: any;
            topics: any;
            tags: any;
            difficultyLevel: any;
            contentType: any;
            fileType: any;
            originalName: any;
            fileSize: any;
            createdAt: any;
            subject: {
                id: any;
                name: any;
            };
            uploader: {
                firstName: any;
                lastName: any;
            };
        }[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    deepSearch(query: string, page?: number, limit?: number): Promise<{
        data: {
            id: any;
            title: any;
            summary: any;
            keywords: any;
            tags: any;
            fileType: any;
            originalName: any;
            createdAt: any;
            subjectName: any;
            relevance: any;
        }[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
}
