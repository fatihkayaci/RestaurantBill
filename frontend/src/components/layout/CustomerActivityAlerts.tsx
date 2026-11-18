import { useEffect, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarCheck, CalendarX, MessageSquareText, UtensilsCrossed } from 'lucide-react';
import { createHubConnection } from '@/lib/signalrConnection';
import { notifyStaff, playStaffTone, type StaffAlertTone } from '@/lib/staffAlerts';
import type { CustomerActivityEvent, CustomerActivityKind } from '@/features/customerSite/types';
import { playOrderRequestSound } from '@/pages/waiter/waiterSound';

interface Props {
    /**
     * waiter: masa hub'ı; rezervasyon olayları yalnızca masaya bakan garsonlara gelir (iletişim mesajı gelmez).
     * manager: kasiyer hub'ının yönetici grubu (Admin/Owner paneli): rezervasyonlar ve iletişim mesajları.
     */
    variant: 'waiter' | 'manager';
}

/** "2026-11-20" → "20.11". */
function shortDate(date: string | null): string {
    if (!date) return '';
    const [, month, day] = date.split('-');
    return day && month ? `${day}.${month}` : date;
}

function slot(event: CustomerActivityEvent): string {
    const when = [shortDate(event.date), event.time].filter(Boolean).join(' ');
    const party = event.partySize ? `${event.partySize} kişi` : '';
    return [event.tableName, when, party].filter(Boolean).join(' · ');
}

interface Presentation {
    title: string;
    description: string;
    tone: StaffAlertTone;
    icon: ReactNode;
    /** İş gerektiren (onay bekleyen) olay: kapatılana kadar kalır. */
    persistent: boolean;
    actionLabel: string;
}

function present(event: CustomerActivityEvent): Presentation {
    const guest = event.guestName || 'Müşteri';
    const presentations: Record<CustomerActivityKind, () => Presentation> = {
        reservationRequested: () => ({
            title: 'Yeni rezervasyon talebi',
            description: `${guest} · ${slot(event)} · onayınızı bekliyor`,
            tone: 'gold',
            icon: <CalendarCheck aria-hidden="true" />,
            persistent: true,
            actionLabel: 'Rezervasyonlar',
        }),
        reservationCancelled: () => ({
            title: 'Rezervasyon iptal edildi',
            description: `${guest} kendisi iptal etti · ${slot(event)}`,
            tone: 'red',
            icon: <CalendarX aria-hidden="true" />,
            persistent: false,
            actionLabel: 'Rezervasyonlar',
        }),
        preOrderPlaced: () => ({
            title: 'Rezervasyona ön sipariş geldi',
            description: `${guest} · ${slot(event)}`,
            tone: 'gold',
            icon: <UtensilsCrossed aria-hidden="true" />,
            persistent: true,
            actionLabel: 'Rezervasyonlar',
        }),
        preOrderUpdated: () => ({
            title: 'Ön sipariş değişti',
            description: `${guest} · ${slot(event)}`,
            tone: 'gold',
            icon: <UtensilsCrossed aria-hidden="true" />,
            persistent: false,
            actionLabel: 'Rezervasyonlar',
        }),
        contactMessage: () => ({
            title: 'Yeni şikayet / öneri mesajı',
            description: `${guest} restoran sitesinden yazdı`,
            tone: 'accent',
            icon: <MessageSquareText aria-hidden="true" />,
            persistent: false,
            actionLabel: 'Oku',
        }),
    };
    return (presentations[event.kind] ?? presentations.contactMessage)();
}

// Müşterinin sitede yaptığı, personelin hemen görmesi gereken işler: yeni rezervasyon talebi, misafirin iptali,
// rezervasyona ön sipariş, iletişim mesajı. Ortak bildirim yolundan (lib/staffAlerts): ses + şeritli toast.
export default function CustomerActivityAlerts({ variant }: Props) {
    const navigate = useNavigate();

    useEffect(() => {
        const { connection, stop } = createHubConnection(variant === 'waiter' ? '/table-hub' : '/cashier-hub');

        connection.on('CustomerActivity', (event: CustomerActivityEvent) => {
            if (!event?.kind) return;
            // Garson ekranında iletişim mesajlarının sayfası yok.
            if (variant === 'waiter' && event.kind === 'contactMessage') return;
            const p = present(event);
            const target = event.kind === 'contactMessage'
                ? '/admin/contact-messages'
                : variant === 'waiter' ? '/waiter?tab=reservations' : '/admin/reservations';
            notifyStaff({
                id: `customer-${event.kind}-${event.tableId ?? ''}-${event.occurredAt}`,
                title: p.title,
                description: p.description,
                tone: p.tone,
                icon: p.icon,
                persistent: p.persistent,
                sound: variant === 'waiter' ? playOrderRequestSound : () => playStaffTone(p.persistent ? 'request' : 'info'),
                action: { label: p.actionLabel, onClick: () => navigate(target) },
            });
        });

        let cancelled = false;
        connection.start().catch(err => { if (!cancelled) console.error('CustomerActivity SignalR:', err); });
        return () => { cancelled = true; stop(); };
    }, [variant, navigate]);

    return null;
}
