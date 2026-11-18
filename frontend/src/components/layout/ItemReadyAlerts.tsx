import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BellRing } from 'lucide-react';
import { createHubConnection } from '@/lib/signalrConnection';
import { notifyStaff } from '@/lib/staffAlerts';
import type { ItemsReadyEvent } from '@/features/orders/types';
import { playItemReadySound } from '@/pages/waiter/waiterSound';
import { emitItemsReady, emitOpenTable } from '@/pages/waiter/waiterEvents';

// Mutfak ürünleri pasaya koyunca garson ekranında canlı uyarı: ses + yeşil şeritli, kapatılana ya da masaya gidilene
// kadar kalan bildirim; masanın kartı yeşil yanar. Sunucu olayı yalnızca masanın bölgesine bakan garsonlara gönderir.
export default function ItemReadyAlerts() {
    const navigate = useNavigate();

    useEffect(() => {
        const { connection, stop } = createHubConnection('/table-hub');

        connection.on('ItemsReady', (event: ItemsReadyEvent) => {
            if (!event?.items?.length) return;
            emitItemsReady(event);

            notifyStaff({
                id: `items-ready-${event.tableId}-${event.items.map(i => i.orderItemId).join('-')}`,
                title: `${event.tableName} · ürün hazır`,
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
                tone: 'green',
                icon: <BellRing aria-hidden="true" />,
                // Garson ürünü alana kadar ekranda kalsın; kapatma düğmesiyle ya da "Masaya git" ile kalkar.
                persistent: true,
                sound: playItemReadySound,
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
