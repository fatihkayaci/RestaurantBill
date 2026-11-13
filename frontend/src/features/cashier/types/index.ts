export type CashRegisterStatus = 1 | 2;

export interface CashRegister {
    id: string;
    name: string;
    balance: number;
    status: CashRegisterStatus;
    openedAt?: string;
}

export type CashTransactionType = 1 | 2 | 3 | 4 | 5 | 6;

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
    // Kör sayım: kasiyere null gelir, sadece Admin/Owner görür.
    expectedOpeningBalance: number | null;
    hasOpenShift: boolean;
    openShiftId?: string | null;
    openedAt?: string | null;
    openShiftOwnerName?: string | null;
    isMine: boolean;
    // Kasanın son vardiyası sayılmadan kapandıysa açılışta sayım gerekir.
    requiresCount: boolean;
    // Açık vardiya yokken kartta son vardiyayı anlatmak ve "Sayım gir" için.
    lastClosedShiftId?: string | null;
    lastClosedAt?: string | null;
    lastClosedBySystem: boolean;
    lastClosedCounted: boolean;
    lastShiftOwnerName?: string | null;
}

/** Açık günü olan kasa: ödeme bu kasanın açık vardiyasına yazılır. */
export interface OpenRegister {
    cashRegisterId: string;
    cashRegisterName: string;
    shiftId: string;
    openedAt: string;
    shiftOwnerName: string;
}

/** 1 Kart, 2 Nakit, 3 QR, 4 IBAN (havale/EFT; kasaya nakit girmez). */
export type PaymentMethod = 1 | 2 | 3 | 4;

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
    // Kör sayım: kasiyere null gelir, sadece Admin/Owner görür.
    expectedCashInRegister: number | null;
    openTablesCount: number;
}

export type ShiftStatus = 1 | 2;

export type ShiftCountStatus = 1 | 2; // Counted | NotCounted

export type DifferenceReviewStatus = 1 | 2 | 3; // Pending | Approved | Rejected

export interface Shift {
    id: string;
    branchId: string;
    cashRegisterId: string;
    cashRegisterName: string;
    openedByUserId: string;
    openedByUserName: string;
    closedByUserId?: string | null;
    expectedOpeningBalance: number;
    openingBalance: number;
    openingDifference: number;
    openingDifferenceReviewStatus: DifferenceReviewStatus;
    openingDifferenceReviewedAt?: string | null;
    openingDifferenceReviewedByUserId?: string | null;
    openingDifferenceReviewNote?: string | null;
    expectedClosingBalance: number;
    countedClosingBalance?: number | null;
    difference?: number | null;
    closingDifferenceReviewStatus?: DifferenceReviewStatus | null;
    closingDifferenceReviewedAt?: string | null;
    closingDifferenceReviewedByUserId?: string | null;
    closingDifferenceReviewNote?: string | null;
    openedAt: string;
    closedAt?: string | null;
    status: ShiftStatus;
    note?: string | null;
    countStatus: ShiftCountStatus;
    closedBySystem: boolean;
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
    paidByUserName: string;
    createdByUserName: string;
    details: ShiftTransactionDetail[];
}
