import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, LogOut, RefreshCw } from 'lucide-react';
import { shiftService } from '@/features/cashier/api/shiftService';
import { authService } from '@/features/auth/api/authService';
import { Button } from '@/components/ui/button';
import { useActiveShift } from '@/features/cashier/context/activeShiftStore';
import { createHubConnection } from '@/lib/signalrConnection';

interface ShiftStartGateProps {
    onResolved: () => void;
}

// Kasiyer günü kendisi başlatmaz: yönetici Vardiyalar sayfasında günü başlatıp kasayı ona atar.
// Atama yoksa kasiyer yalnızca bu ekranı görür; atama yapıldığında ("ShiftsChanged") ekran kendiliğinden açılır.
export default function ShiftStartGate({ onResolved }: ShiftStartGateProps) {
    const navigate = useNavigate();
    const { setShift } = useActiveShift();
    const [state, setState] = useState<'checking' | 'waiting'>('checking');
    const [refreshing, setRefreshing] = useState(false);
    // Üst bileşen her render'da yeni bir onResolved verir; hub bağlantısı bu yüzden yeniden kurulmasın.
    const callbacks = useRef({ onResolved, setShift });
    useEffect(() => { callbacks.current = { onResolved, setShift }; });

    const check = useCallback(() => shiftService.getMyCurrent()
        .then(shift => {
            callbacks.current.setShift(shift);
            callbacks.current.onResolved();
        })
        .catch(() => setState('waiting')), []);

    useEffect(() => {
        shiftService.getMyCurrent()
            .then(shift => {
                callbacks.current.setShift(shift);
                callbacks.current.onResolved();
            })
            .catch(() => setState('waiting'));

        const { connection, stop } = createHubConnection('/cashier-hub');
        connection.on('ShiftsChanged', () => { check(); });
        let cancelled = false;
        connection.start().catch(err => { if (!cancelled) console.error('SignalR:', err); });

        const onVisible = () => { if (document.visibilityState === 'visible') check(); };
        document.addEventListener('visibilitychange', onVisible);

        return () => {
            cancelled = true;
            stop();
            document.removeEventListener('visibilitychange', onVisible);
        };
    }, [check]);

    const handleRefresh = async () => {
        setRefreshing(true);
        await check();
        setRefreshing(false);
    };

    const handleLogout = () => {
        authService.logout();
        navigate('/login');
    };

    if (state === 'checking') {
        return (
            <div className="flex-1 flex items-center justify-center">
                <p className="text-muted-foreground text-sm">Yükleniyor...</p>
            </div>
        );
    }

    return (
        <div className="flex-1 flex items-center justify-center p-6">
            <div role="status" className="w-full max-w-md bg-card border border-border rounded-xl shadow-lg p-6 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rb-amber-bg text-rb-amber">
                    <Lock className="h-5 w-5" aria-hidden="true" />
                </div>
                <h2 className="font-serif text-xl font-bold text-foreground">Size henüz kasa atanmadı</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    Gün başlatıldığında ve size bir kasa atandığında buradan devam edebilirsiniz. Yöneticinize başvurun.
                </p>
                <p className="mt-2 text-xs text-muted-foreground">Atama yapıldığında bu ekran kendiliğinden açılır.</p>
                <div className="mt-6 flex gap-2">
                    <Button variant="outline" onClick={handleLogout} className="flex-1 min-h-11">
                        <LogOut className="h-4 w-4" aria-hidden="true" />
                        Çıkış yap
                    </Button>
                    <Button onClick={handleRefresh} disabled={refreshing} className="flex-1 min-h-11">
                        <RefreshCw className={refreshing ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} aria-hidden="true" />
                        {refreshing ? 'Bakılıyor...' : 'Yenile'}
                    </Button>
                </div>
            </div>
        </div>
    );
}
