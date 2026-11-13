import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { createHubConnection } from '@/lib/signalrConnection';
import { formatMinutes } from '@/lib/format';
import type { OverdueOrderItem } from '@/features/stats/types';
import { playAlertSound } from '@/lib/alertSound';

/** Genel Bakış bu olayı dinleyip "Geciken siparişler" kartını beklemeden yeniler. */
export const OVERDUE_EVENT = 'rb:order-items-overdue';

// Yönetici paneli açıkken, hazırlanma süresini aşan ürünler için canlı uyarı (toast + kısa ses).
// Sunucu her kalem için bir kez gönderir; kalıcı bir bildirim kutusu yoktur.
export default function OverdueAlerts() {
    const navigate = useNavigate();

    useEffect(() => {
        const { connection, stop } = createHubConnection('/cashier-hub');

        connection.on('OrderItemsOverdue', (items: OverdueOrderItem[]) => {
            if (!items?.length) return;
            playAlertSound();
            window.dispatchEvent(new Event(OVERDUE_EVENT));

            const first = items[0];
            const late = Math.max(0, Math.floor((Date.now() - new Date(first.dueAt).getTime()) / 60000));
            const title = items.length === 1
                ? `${first.tableName}: ${first.quantity}× ${first.productName} gecikti`
                : `${items.length} ürün hazırlanma süresini aştı`;
            const description = items.length === 1
                ? `Hazırlanma süresi ${first.prepMinutes} dk${late > 0 ? ` · ${formatMinutes(late)} geçti` : ''}`
                : items.slice(0, 3).map(i => `${i.tableName}: ${i.quantity}× ${i.productName}`).join(', ')
                    + (items.length > 3 ? ` ve ${items.length - 3} ürün daha` : '');

            toast.warning(title, {
                description,
                duration: 15000,
                action: { label: 'Gör', onClick: () => navigate('/admin/overview') },
            });
        });

        let cancelled = false;
        connection.start().catch(err => { if (!cancelled) console.error('Overdue SignalR:', err); });
        return () => {
            cancelled = true;
            stop();
        };
    }, [navigate]);

    return null;
}
