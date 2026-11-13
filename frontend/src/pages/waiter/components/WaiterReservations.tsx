import { useState } from 'react';
import { CalendarCheck, Phone, Users } from 'lucide-react';
import { toast } from 'sonner';
import { customerRequestService } from '@/features/customerSite/api/customerRequestService';
import { RESERVATION_PENDING, type StaffReservation } from '@/features/customerSite/types';
import { getApiErrorMessage } from '@/lib/apiError';
import { cn } from '@/lib/utils';

interface Props {
    reservations: StaffReservation[];
    loading: boolean;
    /** Rezervasyon onay/iptal: "Masa taşı ve rezervasyon" yetkisi. */
    canDecide: boolean;
    onChanged: () => void;
}

// "2026-11-14" → "14 Kasım Cumartesi"
function formatDay(date: string): string {
    const [year, month, day] = date.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' });
}

// Garson · Rezervasyon sekmesi: sitenin ve personelin aldığı yaklaşan rezervasyonlar (garsonun bölgeleri).
export default function WaiterReservations({ reservations, loading, canDecide, onChanged }: Props) {
    const [busyId, setBusyId] = useState<string | null>(null);

    const decide = async (reservation: StaffReservation, decision: 'confirm' | 'reject' | 'cancel') => {
        if (busyId) return;
        setBusyId(reservation.id);
        try {
            if (decision === 'confirm') await customerRequestService.confirmReservation(reservation.id);
            else if (decision === 'reject') await customerRequestService.rejectReservation(reservation.id);
            else await customerRequestService.cancelReservation(reservation.id);
            toast.success(decision === 'confirm' ? 'Rezervasyon onaylandı.' : decision === 'reject' ? 'Talep reddedildi.' : 'Rezervasyon iptal edildi.');
        } catch (err) {
            toast.error(getApiErrorMessage(err, 'İşlem yapılamadı.'));
        } finally {
            setBusyId(null);
            onChanged();
        }
    };

    if (loading) {
        return <div className="flex flex-col gap-2.5">{[...Array(3)].map((_, i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-muted" />)}</div>;
    }
    if (reservations.length === 0) {
        return (
            <div className="flex flex-col items-center gap-2 py-16 text-center">
                <CalendarCheck className="size-10 text-rb-text-muted" aria-hidden="true" />
                <p className="font-serif text-[22px] font-bold text-foreground">Yaklaşan rezervasyon yok</p>
                <p className="text-sm text-rb-text-sub">Bir masayı ayırmak için masayı açıp "…" menüsünden Rezervasyon'u seçin.</p>
            </div>
        );
    }

    const days = [...new Set(reservations.map(r => r.date))];

    return (
        <div className="flex flex-col gap-5">
            {days.map(day => (
                <section key={day} className="flex flex-col gap-2">
                    <h2 className="px-1 text-xs font-bold tracking-widest text-rb-text-sub uppercase">{formatDay(day)}</h2>
                    <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
                        {reservations.filter(r => r.date === day).map(r => {
                            const pending = r.status === RESERVATION_PENDING;
                            return (
                                <article key={r.id} className={cn('flex flex-col gap-2 rounded-2xl border bg-card p-3.5', pending ? 'border-rb-gold' : 'border-border')}>
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <p className="font-serif text-[22px] font-bold leading-tight text-foreground">{r.time} · {r.guestName}</p>
                                            <p className="text-sm text-rb-text-sub">{r.tableName} · {r.regionName} · {r.time}–{r.endTime}</p>
                                        </div>
                                        <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-xs font-bold', pending ? 'bg-rb-gold-bg text-foreground' : 'bg-rb-green-bg text-rb-green')}>
                                            {pending ? 'Onay bekliyor' : 'Onaylı'}
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-foreground">
                                        <span className="inline-flex items-center gap-1.5"><Users className="size-4 text-rb-text-sub" aria-hidden="true" />{r.partySize} kişi</span>
                                        {r.contact && <a href={`tel:${r.contact}`} className="inline-flex items-center gap-1.5 underline-offset-2 hover:underline"><Phone className="size-4 text-rb-text-sub" aria-hidden="true" />{r.contact}</a>}
                                    </div>
                                    {r.note && <p className="rounded-xl bg-muted px-3 py-2 text-sm text-foreground">{r.note}</p>}
                                    {canDecide && (
                                        <div className="mt-1 grid grid-cols-2 gap-2">
                                            {pending ? (
                                                <>
                                                    <button type="button" disabled={busyId !== null} onClick={() => decide(r, 'reject')} className="h-11 rounded-xl border border-border text-sm font-semibold text-foreground disabled:opacity-50">Reddet</button>
                                                    <button type="button" disabled={busyId !== null} onClick={() => decide(r, 'confirm')} className="h-11 rounded-xl bg-rb-gold text-sm font-bold text-rb-gold-foreground disabled:opacity-50">Onayla</button>
                                                </>
                                            ) : (
                                                <button type="button" disabled={busyId !== null} onClick={() => decide(r, 'cancel')} className="col-span-2 h-11 rounded-xl border border-rb-red/40 text-sm font-semibold text-rb-red disabled:opacity-50">İptal et</button>
                                            )}
                                        </div>
                                    )}
                                </article>
                            );
                        })}
                    </div>
                </section>
            ))}
        </div>
    );
}
