import { Outlet } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { shiftService } from '@/features/cashier/api/shiftService';
import { createHubConnection } from '@/lib/signalrConnection';
import ShiftStartGate from './components/ShiftStartGate';
import EndShiftModal from './components/EndShiftModal';
import RoleShell from '@/components/layout/RoleShell';
import BillRequestAlerts from '@/components/layout/BillRequestAlerts';
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

    // Gün sonu otomatik kapanışı (ya da yöneticinin yaptığı bir değişiklik) kasiyerin gününü kapattıysa
    // ekran "kasa atanmadı" kapısına döner; ödeme denemesi hata verene kadar beklenmez.
    useEffect(() => {
        if (!shiftGateResolved) return;
        const { connection, stop } = createHubConnection('/cashier-hub');
        const recheck = () => {
            shiftService.getMyCurrent()
                .then(setShift)
                .catch(() => {
                    setShift(null);
                    setShowEndShiftModal(false);
                    setShiftGateResolved(false);
                    toast.info('Gününüz kapatıldı. Yeni gün başlatıldığında devam edebilirsiniz.');
                });
        };
        connection.on('ShiftAutoClosed', recheck);
        connection.on('ShiftsChanged', recheck);
        let cancelled = false;
        connection.start().catch(err => { if (!cancelled) console.error('SignalR:', err); });
        return () => { cancelled = true; stop(); };
    }, [shiftGateResolved, setShift]);

    const endShiftButton = shiftGateResolved && (
        <button
            onClick={() => setShowEndShiftModal(true)}
            className="text-xs font-semibold text-rb-red border border-rb-red/40 bg-rb-red-bg rounded-full px-2.5 sm:px-3 py-1.5 hover:opacity-80 transition-opacity whitespace-nowrap"
        >
            <span className="sm:hidden">Kapat</span>
            <span className="hidden sm:inline">Günü Kapat</span>
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
            {shiftGateResolved && <BillRequestAlerts />}
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
