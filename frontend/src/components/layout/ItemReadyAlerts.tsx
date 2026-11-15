import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { createHubConnection } from '@/lib/signalrConnection';
import type { ItemsReadyEvent } from '@/features/orders/types';
import { playItemReadySound } from '@/pages/waiter/waiterSound';
import { emitItemsReady, emitOpenTable } from '@/pages/waiter/waiterEvents';

// Mutfak ürünleri pasaya koyunca garson ekranında canlı uyarı (ses + kapatılana kadar kalan toast).
// Sunucu olayı yalnızca masanın bölgesine bakan garsonlara gönderir; burada ayrıca süzme yapılmaz.
export default function ItemReadyAlerts() {
    const navigate = useNavigate();

    useEffect(() => {
        const { connection, stop } = createHubConnection('/table-hub');

        connection.on('ItemsReady', (event: ItemsReadyEvent) => {
            if (!event?.items?.length) return;
            playItemReadySound();
            emitItemsReady(event);

            toast.success(`${event.tableName} – ürün hazır`, {
                description: (
                    <ul>
                        {event.items.map(item => (
                            <li key={item.orderItemId}>
                                {item.quantity}× {item.productName}
                                {item.note && <span className="opacity-70"> · {item.note}</span>}
                            </li>
                        ))}
                    </ul>
                ),
                // Garson ürünü alana kadar ekranda kalsın; kapatma düğmesiyle ya da "Masaya git" ile kalkar.
                duration: Infinity,
                closeButton: true,
                action: {
                    label: 'Masaya git',
                    onClick: () => {
                        // Başka sekmedeyse (QR, rezervasyon) masalara dön, sonra masayı aç.
                        navigate('/waiter');
                        emitOpenTable(event.tableId);
                    },
                },
            });
        });

        let cancelled = false;
        connection.start().catch(err => { if (!cancelled) console.error('ItemsReady SignalR:', err); });
        return () => { cancelled = true; stop(); };
    }, [navigate]);

    return null;
}
