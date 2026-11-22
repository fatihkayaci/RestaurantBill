import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Receipt } from 'lucide-react';
import { createHubConnection } from '@/lib/signalrConnection';
import { dismissStaffAlert, notifyStaff, playStaffTone } from '@/lib/staffAlerts';
import { emitTableAlert } from '@/pages/waiter/waiterEvents';
import { billHintText } from '@/features/customerSite/tableActions';
import type { BillRequestHint } from '@/features/customerSite/types';

interface Props {
    /** Toast'taki "Masayı aç" düğmesinin gideceği masalar sayfası (?table=<id> eklenir); verilmezse düğme çıkmaz. */
    actionPath?: string;
}

function billAlertId(tableId: string): string {
    return `bill-request-${tableId}`;
}

// "Hesap iste" (garsondan ya da masadaki QR'dan) kasiyer ve yönetici ekranlarında: ses + mavi şeritli, hesap
// kapanana ya da kapatılana kadar kalan bildirim. Masanın hesabı ödenince/istek geri alınınca kendiliğinden kalkar.
export default function BillRequestAlerts({ actionPath }: Props) {
    const navigate = useNavigate();

    useEffect(() => {
        const cashierHub = createHubConnection('/cashier-hub');
        // Dördüncü argüman: müşterinin ödeme tercihi / bölme bilgisi (eski sunucu göndermez).
        cashierHub.connection.on('BillRequested', (tableId: string, tableName: string, requestedByName: string, hint?: BillRequestHint | null) => {
            emitTableAlert(tableId, 'bill');
            const hintText = billHintText(hint?.paymentHint, hint?.splitCount);
            notifyStaff({
                id: billAlertId(tableId),
                title: `${tableName} · hesap istendi`,
                description: [requestedByName ? `${requestedByName} istedi` : '', hintText].filter(Boolean).join(' · ') || undefined,
                tone: 'accent',
                icon: <Receipt aria-hidden="true" />,
                persistent: true,
                sound: () => playStaffTone('info'),
                action: actionPath ? { label: 'Masayı aç', onClick: () => navigate(`${actionPath}?table=${tableId}`) } : undefined,
            });
        });

        // Hesap ödendi, masa kapandı ya da istek geri alındı: bildirim kendiliğinden kalkar.
        const tableHub = createHubConnection('/table-hub');
        tableHub.connection.on('BillRequestChanged', (tableId: string, billRequestedAt: string | null) => {
            if (!billRequestedAt) dismissStaffAlert(billAlertId(tableId));
        });
        tableHub.connection.on('TableStatusChanged', (tableId: string, status: number) => {
            if (status !== 2) dismissStaffAlert(billAlertId(tableId));
        });
        tableHub.connection.on('OrderClosed', (tableId: string) => dismissStaffAlert(billAlertId(tableId)));

        let cancelled = false;
        cashierHub.connection.start().catch(err => { if (!cancelled) console.error('BillRequest SignalR:', err); });
        tableHub.connection.start().catch(err => { if (!cancelled) console.error('BillRequest table-hub:', err); });
        return () => { cancelled = true; cashierHub.stop(); tableHub.stop(); };
    }, [actionPath, navigate]);

    return null;
}
