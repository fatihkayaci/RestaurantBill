import { Copy, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { reservationLinkUrl, reservationShareText, whatsAppShareUrl } from '../reservationCode';
import type { StaffReservation } from '../types';

// Admin "Rezervasyonlar" ve garson "Rezervasyon" sekmesi: kısa kod (telefonda okunur) ve müşterinin rezervasyon
// bağlantısını kopyalama / WhatsApp ile gönderme. SMS yok; WhatsApp personelin kendi telefonundan açılır.

export function ReservationCodeBadge({ code, className }: { code: string; className?: string }) {
    if (!code) return null;
    return (
        <span className={cn('inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-2 py-0.5 text-xs text-rb-text-sub', className)}>
            Kod
            <span className="font-mono text-sm font-bold tracking-[0.08em] text-foreground">{code}</span>
        </span>
    );
}

// "2026-11-14" + "19:30" → "14 Kasım Cumartesi 19:30"
function when(reservation: StaffReservation): string {
    const [year, month, day] = reservation.date.split('-').map(Number);
    const date = new Date(year, month - 1, day).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' });
    return `${date} ${reservation.time} · ${reservation.tableName}`;
}

export function ReservationShareActions({ reservation, className }: { reservation: StaffReservation; className?: string }) {
    if (!reservation.accessToken) return null;
    const url = reservationLinkUrl(reservation.accessToken, reservation.siteSlug);
    const whatsApp = whatsAppShareUrl(reservation.contact, reservationShareText(reservation.code, url, when(reservation)));

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(url);
            toast.success('Rezervasyon bağlantısı kopyalandı.');
        } catch {
            toast.error('Kopyalanamadı.');
        }
    };

    const button = 'inline-flex h-10 items-center justify-center gap-1.5 rounded-[10px] border border-border bg-card px-3 text-sm font-semibold text-foreground transition-colors hover:border-rb-gold';

    return (
        <div className={cn('grid gap-2', whatsApp ? 'grid-cols-2' : 'grid-cols-1', className)}>
            <button type="button" onClick={copy} className={button}>
                <Copy className="size-4 shrink-0" aria-hidden="true" />
                Bağlantıyı kopyala
            </button>
            {whatsApp && (
                <a href={whatsApp} target="_blank" rel="noopener noreferrer" className={cn(button, 'no-underline')}>
                    <MessageCircle className="size-4 shrink-0" aria-hidden="true" />
                    WhatsApp ile gönder
                </a>
            )}
        </div>
    );
}
