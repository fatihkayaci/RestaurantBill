import { useSyncExternalStore } from 'react';
import { Outlet } from 'react-router-dom';
import { Volume2, VolumeX } from 'lucide-react';
import RoleShell from '@/components/layout/RoleShell';
import ItemReadyAlerts from '@/components/layout/ItemReadyAlerts';
import WaiterCallAlerts from '@/components/layout/WaiterCallAlerts';
import OrderRequestAlerts from '@/components/layout/OrderRequestAlerts';
import CustomerActivityAlerts from '@/components/layout/CustomerActivityAlerts';
import { cn } from '@/lib/utils';
import { waiterSound } from './waiterSound';

// Başlıktaki "ürün hazır" ses düğmesi (mutfaktakinin garson eşi). "locked": tercih açık ama tarayıcı henüz
// dokunuş görmedi; telefonda ekrana ilk dokunuş ya da bu düğme sesi açar.
function WaiterSoundToggle() {
    const state = useSyncExternalStore(waiterSound.subscribe, waiterSound.getState);
    const on = state === 'on';
    const label = on ? 'Ses açık' : 'Ses kapalı';

    return (
        <button
            type="button"
            data-waiter-sound-toggle
            onClick={waiterSound.toggle}
            aria-pressed={on}
            aria-label="Uyarı sesi (QR sipariş, garson çağrısı, hesap isteği, ürün hazır)"
            title={state === 'locked' ? 'Tarayıcı sesi bekletiyor; açmak için dokunun' : on ? 'Sesi kapat' : 'Sesi aç'}
            className={cn(
                'flex min-h-11 items-center gap-1.5 rounded-lg border px-2.5 text-sm font-semibold transition-colors sm:px-3',
                on
                    ? 'border-white/10 bg-white/[0.03] text-sidebar-foreground/75 hover:bg-white/[0.06]'
                    : 'border-rb-gold/45 bg-rb-gold/15 text-rb-gold hover:bg-rb-gold/25'
            )}
        >
            {on ? <Volume2 className="h-5 w-5" aria-hidden="true" /> : <VolumeX className="h-5 w-5" aria-hidden="true" />}
            <span className="hidden sm:inline whitespace-nowrap">{label}</span>
        </button>
    );
}

// Ekran yüksekliğine sabitlenir: masa ızgarası, paneller ve alt sekme çubuğu kendi içinde kayar.
export default function WaiterLayout() {
    return (
        <RoleShell
            roleLabel="Garson"
            large
            actions={<WaiterSoundToggle />}
            className="h-dvh min-h-0 bg-[#F1ECE4] dark:bg-background"
            bodyClassName="flex min-h-0 flex-col overflow-hidden"
        >
            <ItemReadyAlerts />
            <WaiterCallAlerts variant="waiter" />
            <OrderRequestAlerts variant="waiter" />
            <CustomerActivityAlerts variant="waiter" />
            <Outlet />
        </RoleShell>
    );
}
