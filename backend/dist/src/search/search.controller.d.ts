import { SearchService } from './search.service.js';
import { SearchQueryDto } from './dto/search-query.dto.js';
export declare class SearchController {
    private searchService;
    constructor(searchService: SearchService);
    search(query: SearchQueryDto): Promise<{
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
    deepSearch(q: string, page?: string, limit?: string): Promise<{
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
