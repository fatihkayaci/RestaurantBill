export type CashRegisterStatus = 1 | 2;

export interface CashRegister {
    id: string;
    name: string;
    balance: number;
    status: CashRegisterStatus;
    openedAt?: string;
}

export type CashTransactionType = 1 | 2 | 3 | 4;

export interface CashTransaction {
    id: string;
    cashRegisterId: string;
    type: CashTransactionType;
    amount: number;
    relatedCashRegisterId?: string | null;
    createdAt: string;
}

export interface ShiftStartCandidate {
    cashRegisterId: string;
    cashRegisterName: string;
    expectedOpeningBalance: number;
}

export type PaymentMethod = 1 | 2 | 3;

export interface ShiftPaymentBreakdown {
    method: PaymentMethod;
    count: number;
    amount: number;
}

export interface ShiftSummary {
    shiftId: string;
    openedAt: string;
    transactionCount: number;
    breakdown: ShiftPaymentBreakdown[];
    total: number;
    openTablesCount: number;
}

export interface CurrentShift {
    id: string;
    cashRegisterId: string;
    cashRegisterName: string;
    openedAt: string;
}

export interface ShiftTransactionDetail {
    createdAt: string;
    method: PaymentMethod;
    amount: number;
    taxAmount: number;
    itemCount: number;
}

export interface ShiftTransaction {
    id: string;
    createdAt: string;
    method: PaymentMethod;
    amount: number;
    taxAmount: number;
    itemCount: number;
    tableName: string;
    createdByUserName: string;
    details: ShiftTransactionDetail[];
}
