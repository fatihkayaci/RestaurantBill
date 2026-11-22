import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { HandPlatter, Receipt } from 'lucide-react';
import { createHubConnection } from '@/lib/signalrConnection';
import { dismissStaffAlert, notifyStaff, playStaffTone } from '@/lib/staffAlerts';
import { pushBlockingAlert } from '@/lib/blockingAlerts';
import { playWaiterCallSound } from '@/pages/waiter/waiterSound';
import { emitOpenTable, emitTableAlert } from '@/pages/waiter/waiterEvents';
import { billHintText, waiterCallText, WaiterCallReason } from '@/features/customerSite/tableActions';

/** Sunucunun "WaiterCalled" olayı: müşteri masadaki QR'dan "Garson çağır"a bastı. */
export interface WaiterCalledEvent {
    tableId: string;
    tableName: string;
    regionId: string;
    regionName: string;
    calledAt: string;
    /** Çağrı anında masada açık hesap yoktu: QR masa dışından (fotoğraftan) kullanılmış olabilir. */
    tableLooksEmpty?: boolean;
    /** Çağırma nedeni (WaiterCallReason: 1 Su, 2 Peçete/çatal, 3 Diğer); eski sunucu/istemci: yok. */
    reason?: number | null;
    /** Yalnız "Diğer"de müşterinin kısa notu. */
    note?: string | null;
    /** Yalnız CustomerBillRequested'da: müşterinin ödeme tercihi (BillPaymentHint) ve bölme bilgisi. */
    paymentHint?: number | null;
    splitCount?: number | null;
    /** Yalnız CustomerBillRequested'da: istek anında ödenecek kalan. */
    remaining?: number | null;
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
            // "Masa 7 · Su istiyor"; "Diğer"de müşterinin notu ayrıntıda tırnak içinde.
            const note = event.reason === WaiterCallReason.Other && event.note ? `“${event.note}”` : '';
            const origin = event.regionName ? `${event.regionName} · müşteri QR menüden çağırdı` : 'Müşteri QR menüden çağırdı';
            // Yönetici panelinde ekranı kapatan pencere yerine sağ üstte bildirim (toast); garsonda pencere kalır.
            if (variant === 'manager') {
                const title = `${event.tableName} · ${waiterCallText(event.reason)}`;
                notifyStaff({
                    id: `waiter-call-${event.tableId}`,
                    title,
                    description: [event.tableLooksEmpty ? 'Masa boş görünüyor' : '', note, origin].filter(Boolean).join(' · '),
                    tone: 'red',
                    icon: <HandPlatter aria-hidden="true" />,
                    durationMs: 60_000,
                    action: { label: 'Masayı aç', onClick: () => navigate(`/admin/tables?table=${event.tableId}`) },
                });
                return;
            }
            pushBlockingAlert({
                kind: 'call',
                tableId: event.tableId,
                tableName: event.tableName,
                label: waiterCallText(event.reason),
                detail: note ? `${note} · ${origin}` : origin,
                warning: event.tableLooksEmpty ? 'Masa boş görünüyor' : undefined,
            });
        });

        // Müşteri QR'dan "Hesap iste"ye bastı: kasiyer ve yönetici "BillRequested" ile alır (BillRequestAlerts);
        // masaya bakan garson bunu alır. Masa kartı "Hesap istendi" durumuna zaten geçer, ayrıca mavi yanar.
        if (variant === 'waiter') {
            connection.on('CustomerBillRequested', (event: WaiterCalledEvent) => {
                if (!event?.tableId) return;
                emitTableAlert(event.tableId, 'bill');
                // "Kart · 3 kişiye bölünecek": müşterinin tercihi garsonun bildirimine de yazılır.
                const hintText = billHintText(event.paymentHint, event.splitCount);
                const origin = event.regionName ? `${event.regionName} · müşteri QR menüden istedi` : 'Müşteri QR menüden istedi';
                notifyStaff({
                    id: `bill-request-${event.tableId}`,
                    title: `${event.tableName} · hesap istiyor`,
                    description: hintText ? `${hintText} · ${origin}` : origin,
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
