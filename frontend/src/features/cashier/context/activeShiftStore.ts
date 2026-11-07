import { createContext, useContext } from 'react';
import type { Shift } from '../types';

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
