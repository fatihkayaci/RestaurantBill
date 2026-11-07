import { useState, type ReactNode } from 'react';
import type { Shift } from '../types';
import { ActiveShiftContext } from './activeShiftStore';

export function ActiveShiftProvider({ children }: { children: ReactNode }) {
    const [shift, setShift] = useState<Shift | null>(null);

    return (
        <ActiveShiftContext.Provider value={{ shift, setShift }}>
            {children}
        </ActiveShiftContext.Provider>
    );
}
