export interface DataOption {
    key: string;
    label: string;
    acceptsDate: boolean;
    description: string;
}

export interface DataBranch {
    id: string;
    name: string;
}

export interface DataOverview {
    companyName: string;
    branches: DataBranch[];
    groups: DataOption[];
    resetItems: DataOption[];
    closureGraceDays: number;
}

export interface CountLine {
    label: string;
    count: number;
}

export interface DeletionGroup {
    key: string;
    label: string;
    lines: CountLine[];
    dateFiltered: boolean;
}

export interface BranchDeletionPreview {
    branchId: string;
    branchName: string;
    groups: DeletionGroup[];
}

export interface DeletionPreview {
    branches: BranchDeletionPreview[];
    blockers: string[];
    totalCount: number;
}

export interface ResetPreview {
    branches: { branchId: string; branchName: string; items: { key: string; label: string; description: string }[] }[];
}

export interface ClosureStatus {
    companyName: string;
    isClosed: boolean;
    closedAt: string | null;
    deletionScheduledAt: string | null;
}

export interface ClosurePreview {
    companyName: string;
    graceDays: number;
    deletionDate: string;
    branches: BranchDeletionPreview[];
    staffCount: number;
}

export interface DataSelection {
    branchIds: string[];
    groups: string[];
    olderThan?: string | null;
}

export interface Confirmation {
    restaurantName: string;
    password: string;
}

// Satış/rezervasyon gibi geçmiş grupları; CSV ile indirilebilenler bunlardır.
export const HISTORY_GROUPS = ['sales', 'reservations', 'delivery', 'messages', 'auditLogs'];

export function toggle(list: string[], key: string, on: boolean): string[] {
    return on ? (list.includes(key) ? list : [...list, key]) : list.filter(k => k !== key);
}
