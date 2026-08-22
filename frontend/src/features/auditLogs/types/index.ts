export interface AuditLog {
    id: string;
    branchId: string;
    branchName?: string | null;
    actorName: string;
    category: number;
    severity: number;
    action: string;
    message: string;
    entityType?: string | null;
    entityId?: string | null;
    createdAt: string;
}

export interface PagedResult<T> {
    items: T[];
    totalCount: number;
    pageNumber: number;
    pageSize: number;
    totalPages: number;
}
