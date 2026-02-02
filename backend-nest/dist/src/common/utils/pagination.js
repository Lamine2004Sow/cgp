"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizePagination = normalizePagination;
function normalizePagination({ page, pageSize }) {
    const normalizedPage = Number.isFinite(page) && page && page > 0 ? page : 1;
    const normalizedPageSize = Number.isFinite(pageSize) && pageSize && pageSize > 0 ? pageSize : 20;
    return {
        page: normalizedPage,
        pageSize: normalizedPageSize,
        skip: (normalizedPage - 1) * normalizedPageSize,
    };
}
//# sourceMappingURL=pagination.js.map