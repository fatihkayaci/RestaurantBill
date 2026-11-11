import { Outlet } from 'react-router-dom';
import { useState } from 'react';
import ShiftStartGate from './components/ShiftStartGate';
import EndShiftModal from './components/EndShiftModal';
import RoleShell from '@/components/layout/RoleShell';
import { ActiveShiftProvider } from '@/features/cashier/context/ActiveShiftContext';
import { useActiveShift } from '@/features/cashier/context/activeShiftStore';

export default function CashierLayout() {
    return (
        <ActiveShiftProvider>
            <CashierLayoutContent />
        </ActiveShiftProvider>
    );
}

function CashierLayoutContent() {
    const { setShift } = useActiveShift();

    const [shiftGateResolved, setShiftGateResolved] = useState(false);
    const [showEndShiftModal, setShowEndShiftModal] = useState(false);

    const endShiftButton = shiftGateResolved && (
        <button
            onClick={() => setShowEndShiftModal(true)}
            className="text-xs font-semibold text-rb-red border border-rb-red/40 bg-rb-red-bg rounded-full px-2.5 sm:px-3 py-1.5 hover:opacity-80 transition-opacity whitespace-nowrap"
        >
            <span className="sm:hidden">Bitir</span>
            <span className="hidden sm:inline">Vardiyayı Bitir</span>
        </button>
    );

    return (
        <RoleShell
            roleLabel="Kasiyer"
            statsSlotId="cashier-stats-slot"
            statsSlotClassName="hidden lg:flex"
            actions={endShiftButton}
            bodyClassName="overflow-auto flex flex-col"
        >
            {shiftGateResolved
                ? <Outlet />
                : <ShiftStartGate onResolved={() => setShiftGateResolved(true)} />}

            {showEndShiftModal && (
                <EndShiftModal
                    onClose={() => setShowEndShiftModal(false)}
                    onShiftClosed={() => {
                        setShowEndShiftModal(false);
                        setShiftGateResolved(false);
                        setShift(null);
                    }}
                />
            )}
        </RoleShell>
    );
}
