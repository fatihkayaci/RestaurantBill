import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { createHubConnection } from '@/lib/signalrConnection';
import { playAlertSound } from '@/lib/alertSound';

interface Props {
    /** Toast'taki "Gör" butonunun gideceği sayfa; verilmezse buton çıkmaz (kasiyer zaten listede görür). */
    actionPath?: string;
}

// Garson "Hesap iste" dediğinde kasiyer ve yönetici ekranlarında canlı uyarı (toast + kısa ses).
// Olay yalnızca kasiyer hub'ına gider; garsonlar bu hub'a bağlanmaz.
export default function BillRequestAlerts({ actionPath }: Props) {
    const navigate = useNavigate();

    useEffect(() => {
        const { connection, stop } = createHubConnection('/cashier-hub');
        connection.on('BillRequested', (_tableId: string, tableName: string, requestedByName: string) => {
            playAlertSound();
            toast.info(`${tableName}: hesap istendi`, {
                description: requestedByName ? `${requestedByName} kasaya bildirdi.` : undefined,
                duration: 15000,
                action: actionPath ? { label: 'Gör', onClick: () => navigate(actionPath) } : undefined,
            });
        });
        let cancelled = false;
        connection.start().catch(err => { if (!cancelled) console.error('BillRequest SignalR:', err); });
        return () => { cancelled = true; stop(); };
    }, [actionPath, navigate]);

    return null;
}
