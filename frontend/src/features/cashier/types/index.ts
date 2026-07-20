export type CashRegisterStatus = 1 | 2;

export interface CashRegister {
    id: number;
    name: string;
    balance: number;
    status: CashRegisterStatus;
    openedAt?: string;
}

export type CashTransactionType = 1 | 2 | 3 | 4;

export interface CashTransaction {
    id: number;
    cashRegisterId: number;
    type: CashTransactionType;
    amount: number;
    relatedCashRegisterId?: number | null;
    createdAt: string;
}
