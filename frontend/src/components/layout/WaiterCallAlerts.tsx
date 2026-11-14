import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { createHubConnection } from '@/lib/signalrConnection';
import { playAlertSound } from '@/lib/alertSound';
import { playWaiterCallSound } from '@/pages/waiter/waiterSound';
import { emitOpenTable } from '@/pages/waiter/waiterEvents';

/** Sunucunun "WaiterCalled" olayı: müşteri masadaki QR'dan "Garson çağır"a bastı. */
export interface WaiterCalledEvent {
    tableId: string;
    tableName: string;
    regionId: string;
    regionName: string;
    calledAt: string;
}

interface Props {
    /**
     * waiter: masa hub'ı; sunucu olayı yalnızca masaya bakan garsonlara gönderir (ürün hazır ile aynı kural).
     * manager: kasiyer hub'ının yönetici grubu (Admin/Owner paneli); kasiyer ekranları almaz.
     */
    variant: 'waiter' | 'manager';
}

// Müşteri masadaki QR'dan garson çağırınca canlı uyarı: kısa ses + toast. Garson ekranında masaya gidilene kadar
// kalır ve "Masaya git" masayı açar; yönetici panelinde kısa süre görünür ve masalar sayfasına götürür.
export default function WaiterCallAlerts({ variant }: Props) {
    const navigate = useNavigate();

    useEffect(() => {
        const { connection, stop } = createHubConnection(variant === 'waiter' ? '/table-hub' : '/cashier-hub');

        connection.on('WaiterCalled', (event: WaiterCalledEvent) => {
            if (!event?.tableId) return;

            if (variant === 'waiter') {
                playWaiterCallSound();
                toast.warning(`${event.tableName} garson çağırıyor`, {
                    id: `waiter-call-${event.tableId}`,
                    description: event.regionName || undefined,
                    duration: Infinity,
                    closeButton: true,
                    action: {
                        label: 'Masaya git',
                        onClick: () => {
                            navigate('/waiter');
                            emitOpenTable(event.tableId);
                        },
                    },
                });
                return;
            }

            playAlertSound();
            toast.info(`${event.tableName} garson çağırıyor`, {
                id: `waiter-call-${event.tableId}`,
                description: event.regionName ? `${event.regionName} · müşteri QR menüden çağırdı.` : 'Müşteri QR menüden çağırdı.',
                duration: 15000,
                action: { label: 'Gör', onClick: () => navigate('/admin/tables') },
            });
        });

        let cancelled = false;
        connection.start().catch(err => { if (!cancelled) console.error('WaiterCalled SignalR:', err); });
        return () => { cancelled = true; stop(); };
    }, [variant, navigate]);

    return null;
}
