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
