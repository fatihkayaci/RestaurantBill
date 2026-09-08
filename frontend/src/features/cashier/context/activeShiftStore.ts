import { createContext, useContext } from 'react';
import type { Shift } from '../types';

const STORAGE_KEY = 'cashier.activeCashRegisterId';

export interface ActiveShiftContextValue {
    shift: Shift | null;
    setShift: (shift: Shift | null) => void;
}

export const ActiveShiftContext = createContext<ActiveShiftContextValue>({
    shift: null,
    setShift: () => {},
});

export function useActiveShift() {
    return useContext(ActiveShiftContext);
}

export function persistCashRegisterId(cashRegisterId: string | null): void {
    try {
        if (cashRegisterId) localStorage.setItem(STORAGE_KEY, cashRegisterId);
        else localStorage.removeItem(STORAGE_KEY);
    } catch {
        // localStorage erişilemezse (gizli sekme vb.) sessizce yok say, sadece sayfa
        // yenilendiğinde kasa seçimi hatırlanmaz.
    }
}

export function getStoredCashRegisterId(): string | null {
    try {
        return localStorage.getItem(STORAGE_KEY);
    } catch {
        return null;
    }
}

export function clearStoredCashRegisterId(): void {
    persistCashRegisterId(null);
}
