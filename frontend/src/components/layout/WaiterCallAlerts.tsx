import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Receipt } from 'lucide-react';
import { createHubConnection } from '@/lib/signalrConnection';
import { dismissStaffAlert, notifyStaff, playStaffTone } from '@/lib/staffAlerts';
import { pushBlockingAlert } from '@/lib/blockingAlerts';
import { playWaiterCallSound } from '@/pages/waiter/waiterSound';
import { emitOpenTable, emitTableAlert } from '@/pages/waiter/waiterEvents';

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

// Müşteri masadaki QR'dan garson çağırınca canlı uyarı: ses + kırmızı şeritli, kapatılana ya da masaya gidilene kadar
// kalan bildirim; masalar ekranında masanın kartı kırmızı yanar. Garson ekranında "Masaya git" masayı açar,
// yönetici panelinde masalar sayfasında masayı açar.
export default function WaiterCallAlerts({ variant }: Props) {
    const navigate = useNavigate();

    useEffect(() => {
        const { connection, stop } = createHubConnection(variant === 'waiter' ? '/table-hub' : '/cashier-hub');

        connection.on('WaiterCalled', (event: WaiterCalledEvent) => {
            if (!event?.tableId) return;
            emitTableAlert(event.tableId, 'call');
            // Ekranın ortasında, "Tamam"a basılmadan kapanmayan pencere (OrderRequestAlerts çizer).
            if (variant === 'waiter') playWaiterCallSound();
            else playStaffTone('call');
            pushBlockingAlert({
                kind: 'call',
                tableId: event.tableId,
                tableName: event.tableName,
                detail: event.regionName ? `${event.regionName} · müşteri QR menüden çağırdı` : 'Müşteri QR menüden çağırdı',
            });
        });

        // Müşteri QR'dan "Hesap iste"ye bastı: kasiyer ve yönetici "BillRequested" ile alır (BillRequestAlerts);
        // masaya bakan garson bunu alır. Masa kartı "Hesap istendi" durumuna zaten geçer, ayrıca mavi yanar.
        if (variant === 'waiter') {
            connection.on('CustomerBillRequested', (event: WaiterCalledEvent) => {
                if (!event?.tableId) return;
                emitTableAlert(event.tableId, 'bill');
                notifyStaff({
                    id: `bill-request-${event.tableId}`,
                    title: `${event.tableName} · hesap istiyor`,
                    description: event.regionName ? `${event.regionName} · müşteri QR menüden istedi` : 'Müşteri QR menüden istedi',
                    tone: 'accent',
                    icon: <Receipt aria-hidden="true" />,
                    persistent: true,
                    sound: playWaiterCallSound,
                    action: {
                        label: 'Masaya git',
                        onClick: () => {
                            navigate('/waiter');
                            emitOpenTable(event.tableId);
                        },
                    },
                });
            });
            // Hesap kapanınca ya da istek geri alınınca bildirim kendiliğinden kalkar.
            connection.on('BillRequestChanged', (tableId: string, billRequestedAt: string | null) => {
                if (!billRequestedAt) dismissStaffAlert(`bill-request-${tableId}`);
            });
        }

        let cancelled = false;
        connection.start().catch(err => { if (!cancelled) console.error('WaiterCalled SignalR:', err); });
        return () => { cancelled = true; stop(); };
    }, [variant, navigate]);

    return null;
}
