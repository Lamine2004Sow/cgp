export interface PageParams {
    page?: number;
    pageSize?: number;
}
export interface PageMeta {
    page: number;
    pageSize: number;
    total: number;
}
export interface PageResult<T> extends PageMeta {
    items: T[];
}
export declare function normalizePagination({ page, pageSize }: PageParams): {
    page: number;
    pageSize: number;
    skip: number;
};
