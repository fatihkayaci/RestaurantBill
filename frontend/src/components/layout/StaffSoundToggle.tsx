import { useSyncExternalStore } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { staffAlertSound } from '@/lib/staffAlerts';
import { cn } from '@/lib/utils';

// Yönetici ve kasiyer başlığındaki bildirim sesi düğmesi (QR sipariş, garson çağrısı, hesap isteği, rezervasyon…).
// "locked": tercih açık ama tarayıcı henüz dokunuş görmedi; ekrana ilk dokunuş ya da bu düğme sesi açar.
export default function StaffSoundToggle({ labelClassName = 'hidden xl:inline' }: { labelClassName?: string }) {
    const state = useSyncExternalStore(staffAlertSound.subscribe, staffAlertSound.getState);
    const muted = state === 'off';

    return (
        <button
            type="button"
            data-staff-alert-sound-toggle
            onClick={staffAlertSound.toggle}
            aria-pressed={!muted}
            aria-label="Bildirim sesi"
            title={state === 'locked' ? 'Tarayıcı sesi bekletiyor; açmak için dokunun' : muted ? 'Bildirim sesini aç' : 'Bildirim sesini kapat'}
            className={cn(
                'flex h-10 min-w-10 items-center justify-center gap-1.5 rounded-lg border px-2 text-sm font-semibold transition-colors',
                muted
                    ? 'border-rb-gold/45 bg-rb-gold/15 text-rb-gold hover:bg-rb-gold/25'
                    : 'border-white/10 bg-white/[0.03] text-sidebar-foreground/75 hover:bg-white/[0.06]'
            )}
        >
            {muted ? <VolumeX className="h-4.5 w-4.5" aria-hidden="true" /> : <Volume2 className="h-4.5 w-4.5" aria-hidden="true" />}
            <span className={cn('whitespace-nowrap', labelClassName)}>{muted ? 'Ses kapalı' : 'Ses açık'}</span>
        </button>
    );
}
