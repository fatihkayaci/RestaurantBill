import { useCallback, useState, type ReactNode } from 'react';
import type { Shift } from '../types';
import { ActiveShiftContext, persistCashRegisterId } from './activeShiftStore';

export function ActiveShiftProvider({ children }: { children: ReactNode }) {
    const [shift, setShiftState] = useState<Shift | null>(null);

    const setShift = useCallback((next: Shift | null) => {
        setShiftState(next);
        persistCashRegisterId(next?.cashRegisterId ?? null);
    }, []);

    return (
        <ActiveShiftContext.Provider value={{ shift, setShift }}>
            {children}
        </ActiveShiftContext.Provider>
    );
}
