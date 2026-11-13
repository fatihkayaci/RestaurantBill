import { useEffect, useSyncExternalStore } from 'react';
import { Outlet } from 'react-router-dom';
import { useTheme } from 'next-themes';
import { Volume2, VolumeX } from 'lucide-react';
import RoleShell from '@/components/layout/RoleShell';
import { cn } from '@/lib/utils';
import { getKitchenSoundState, subscribeKitchenSound, toggleKitchenSound } from './kitchenSound';

// Başlıktaki ses düğmesi. "locked": tercih açık ama tarayıcı henüz dokunuş görmedi; dokununca ses açılır.
function KitchenSoundToggle() {
    const state = useSyncExternalStore(subscribeKitchenSound, getKitchenSoundState);
    const on = state === 'on';
    const label = on ? 'Sesi kapat' : 'Sesi aç';

    return (
        <button
            type="button"
            data-kitchen-sound-toggle
            onClick={toggleKitchenSound}
            aria-pressed={on}
            title={state === 'locked' ? 'Tarayıcı sesi bekletiyor; açmak için dokunun' : label}
            className={cn(
                'flex min-h-10 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold transition-colors sm:px-3',
                on
                    ? 'border-white/10 bg-white/[0.03] text-sidebar-foreground/75 hover:bg-white/[0.06]'
                    : 'border-rb-gold/45 bg-rb-gold/15 text-rb-gold hover:bg-rb-gold/25'
            )}
        >
            {on ? <Volume2 className="h-4 w-4" aria-hidden="true" /> : <VolumeX className="h-4 w-4" aria-hidden="true" />}
            <span className="hidden sm:inline whitespace-nowrap">{label}</span>
        </button>
    );
}

export default function KitchenLayout() {
    const { setTheme } = useTheme();

    // Mutfak ekranı koyu tasarlandı (parlak mutfakta da uzaktan okunur, ekran gece göz almaz). Bu cihazda daha önce
    // tema seçilmediyse koyu başlar; başlıktaki tema anahtarı yine çalışır ve seçim kalıcıdır.
    useEffect(() => {
        try {
            if (!localStorage.getItem('theme')) setTheme('dark');
        } catch {
            // depolama kapalı: varsayılan tema kalır
        }
    }, [setTheme]);

    return (
        <RoleShell
            roleLabel="Mutfak"
            statsSlotId="kitchen-stats-slot"
            statsSlotClassName="hidden lg:flex"
            actions={<KitchenSoundToggle />}
            className="kitchen-screen h-dvh min-h-0 overflow-hidden"
            bodyClassName="min-h-0 overflow-hidden flex flex-col"
        >
            <Outlet />
        </RoleShell>
    );
}
