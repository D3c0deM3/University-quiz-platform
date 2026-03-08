export declare enum SearchSortBy {
    RELEVANCE = "relevance",
    DATE = "date",
    TITLE = "title"
}
export declare enum SearchSortOrder {
    ASC = "asc",
    DESC = "desc"
}
export declare class SearchQueryDto {
    q?: string;
    subject?: string;
    tags?: string;
    topic?: string;
    type?: string;
    difficulty?: string;
    dateFrom?: string;
    dateTo?: string;
    sort?: SearchSortBy;
    order?: SearchSortOrder;
    page?: number;
    limit?: number;
}
