import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { CalendarCheck, Phone, Search, Settings2, Users } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { customerRequestService } from '@/features/customerSite/api/customerRequestService';
import { reservationSettingsService } from '@/features/customerSite/api/reservationSettingsService';
import {
    formatDuration, RESERVATION_CONFIRMED, RESERVATION_PENDING, type ReservationRules, type StaffReservation,
} from '@/features/customerSite/types';
import { createHubConnection } from '@/lib/signalrConnection';
import { getApiErrorMessage } from '@/lib/apiError';
import { PreOrderBadge, PreOrderPanel, ReservationArrivalActions } from '@/features/customerSite/components/ReservationArrival';
import { ReservationCodeBadge, ReservationShareActions } from '@/features/customerSite/components/ReservationShare';
import { normalizeReservationCodeQuery } from '@/features/customerSite/reservationCode';
import { settingsPath } from './settings/settingsTabs';

type Decision = 'confirm' | 'reject' | 'cancel';

// "2026-11-14" → "14 Kasım Cumartesi"
function formatDay(date: string): string {
    const [year, month, day] = date.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' });
}

// Arama: kod (büyük/küçük harf, boşluk ve tire fark etmez), misafir adı ya da telefonun rakamları.
function matches(reservation: StaffReservation, query: string): boolean {
    const text = query.trim();
    if (!text) return true;
    const code = normalizeReservationCodeQuery(text);
    if (code && normalizeReservationCodeQuery(reservation.code).includes(code)) return true;
    if (reservation.guestName.toLocaleLowerCase('tr-TR').includes(text.toLocaleLowerCase('tr-TR'))) return true;
    const digits = text.replace(/\D/g, '');
    return digits.length >= 3 && reservation.contact.replace(/\D/g, '').includes(digits);
}

const DECISION_DONE: Record<Decision, string> = {
    confirm: 'Rezervasyon onaylandı.',
    reject: 'Rezervasyon talebi reddedildi.',
    cancel: 'Rezervasyon iptal edildi.',
};

// Müşterilerin siteden gönderdiği rezervasyon talepleri. Onay masayı o saat aralığı için ayırır;
// masanın anlık durumunu (Boş/Dolu/Rezerve) değiştirmez.
export default function ReservationsPage() {
    const [reservations, setReservations] = useState<StaffReservation[]>([]);
    const [loading, setLoading] = useState(true);
    const [busyId, setBusyId] = useState<string | null>(null);
    const [rules, setRules] = useState<ReservationRules | null>(null);
    const [query, setQuery] = useState('');

    useEffect(() => {
        reservationSettingsService.get()
            .then(setRules)
            .catch(err => toast.error(getApiErrorMessage(err, 'Rezervasyon ayarları yüklenemedi.')));
    }, []);

    const load = useCallback(() => {
        customerRequestService.getReservations()
            .then(setReservations)
            .catch(err => toast.error(getApiErrorMessage(err, 'Rezervasyonlar yüklenemedi.')))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => { load(); }, [load]);

    // Yeni talep geldiğinde sayfa kendiliğinden yenilensin.
    useEffect(() => {
        const { connection, stop } = createHubConnection('/table-hub');
        connection.on('CustomerRequestsChanged', load);
        let cancelled = false;
        connection.start().catch(err => { if (!cancelled) console.error('SignalR:', err); });
        return () => { cancelled = true; stop(); };
    }, [load]);

    const decide = async (reservation: StaffReservation, decision: Decision) => {
        if (busyId) return;
        setBusyId(reservation.id);
        try {
            if (decision === 'confirm') await customerRequestService.confirmReservation(reservation.id);
            else if (decision === 'reject') await customerRequestService.rejectReservation(reservation.id);
            else await customerRequestService.cancelReservation(reservation.id);
            toast.success(DECISION_DONE[decision]);
        } catch (err) {
            toast.error(getApiErrorMessage(err, 'İşlem yapılamadı.'));
        } finally {
            setBusyId(null);
            load();
        }
    };

    const visible = reservations.filter(r => matches(r, query));
    const pending = visible.filter(r => r.status === RESERVATION_PENDING);
    const confirmed = visible.filter(r => r.status === RESERVATION_CONFIRMED);

    const card = (reservation: StaffReservation) => {
        const isPending = reservation.status === RESERVATION_PENDING;
        const busy = busyId !== null;
        return (
            <article key={reservation.id} className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <p className="font-serif text-[21px] font-bold leading-tight text-foreground">
                            {reservation.time}–{reservation.endTime}
                        </p>
                        <p className="text-sm text-rb-text-sub">{formatDay(reservation.date)}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                        <span className="rounded-lg bg-rb-gold-bg px-2.5 py-1 text-sm font-semibold text-foreground">
                            {reservation.tableName}
                        </span>
                        <ReservationCodeBadge code={reservation.code} />
                    </div>
                </div>

                <div className="flex flex-col gap-1.5 text-sm text-foreground">
                    <p className="flex flex-wrap items-center gap-2 text-base font-semibold">
                        {reservation.guestName}
                        <PreOrderBadge reservation={reservation} />
                    </p>
                    <a href={`tel:${reservation.contact.replace(/\s/g, '')}`} className="flex items-center gap-2 self-start text-foreground underline-offset-4 hover:underline">
                        <Phone className="h-4 w-4 shrink-0 text-rb-text-sub" aria-hidden="true" />
                        {reservation.contact}
                    </a>
                    <p className="flex items-center gap-2 text-rb-text-sub">
                        <Users className="h-4 w-4 shrink-0" aria-hidden="true" />
                        {reservation.partySize} kişi · {reservation.regionName}
                    </p>
                    {reservation.note && (
                        <p className="rounded-lg bg-background px-3 py-2 text-foreground">
                            <span className="font-semibold">Not:</span> {reservation.note}
                        </p>
                    )}
                </div>

                <ReservationShareActions reservation={reservation} />

                {isPending ? (
                    <div className="mt-auto grid grid-cols-2 gap-2">
                        <button
                            type="button"
                            onClick={() => decide(reservation, 'reject')}
                            disabled={busy}
                            className="h-11 rounded-[10px] border border-border bg-card text-sm font-semibold text-foreground transition-colors hover:border-rb-red hover:text-rb-red disabled:opacity-50"
                        >
                            Reddet
                        </button>
                        <button
                            type="button"
                            onClick={() => decide(reservation, 'confirm')}
                            disabled={busy}
                            className="h-11 rounded-[10px] bg-rb-gold text-sm font-semibold text-rb-gold-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                        >
                            Onayla
                        </button>
                    </div>
                ) : (
                    <div className="mt-auto flex flex-col gap-2">
                        <PreOrderPanel reservation={reservation} />
                        <ReservationArrivalActions reservation={reservation} onChanged={load} disabled={busy} />
                        <button
                            type="button"
                            onClick={() => decide(reservation, 'cancel')}
                            disabled={busy}
                            className="h-10 rounded-[10px] text-sm font-semibold text-rb-text-sub transition-colors hover:text-rb-red disabled:opacity-50"
                        >
                            Rezervasyonu iptal et
                        </button>
                    </div>
                )}
            </article>
        );
    };

    const grid = 'grid grid-cols-1 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(280px,1fr))]';

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-serif font-bold text-foreground">Rezervasyonlar</h1>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                        Müşterilerin siteden gönderdiği talepler.
                        {rules && ` Onayladığınız rezervasyon masayı ${formatDuration(rules.durationMinutes)} için ayırır.`}
                    </p>
                    {rules && !rules.enabled && (
                        <p className="mt-2 inline-flex rounded-lg bg-rb-red-bg px-2.5 py-1 text-xs font-semibold text-rb-red">
                            Online rezervasyon kapalı: sitede rezervasyon bölümü görünmüyor.
                        </p>
                    )}
                </div>
                <Link
                    to={settingsPath('rezervasyon')}
                    className="flex h-10 items-center gap-2 rounded-[10px] border border-border bg-card px-3.5 text-sm font-semibold text-foreground transition-colors hover:border-rb-gold"
                >
                    <Settings2 className="h-4 w-4" aria-hidden="true" />
                    Rezervasyon ve ön sipariş ayarları
                </Link>
            </div>

            {loading ? (
                <div className={grid} aria-busy="true">
                    {[...Array(3)].map((_, i) => <div key={i} className="h-52 animate-pulse rounded-2xl bg-muted" />)}
                </div>
            ) : reservations.length === 0 ? (
                <EmptyState
                    icon={CalendarCheck}
                    title="Bekleyen rezervasyon yok"
                    description="Müşteriler restoran sitenizden masa ve saat seçip talep gönderdiğinde burada görünür."
                />
            ) : (
                <>
                    <div className="relative max-w-sm">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-rb-text-sub" aria-hidden="true" />
                        <label htmlFor="rez-ara" className="sr-only">Rezervasyon ara</label>
                        <input
                            id="rez-ara"
                            type="search"
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            placeholder="Kod (K7M-2QP), ad ya da telefon"
                            autoComplete="off"
                            className="h-10 w-full rounded-[10px] border border-border bg-card pl-9 pr-3 text-sm text-foreground placeholder:text-rb-text-sub focus:outline-none focus:ring-2 focus:ring-rb-gold"
                        />
                    </div>
                    {query.trim() && visible.length === 0 && (
                        <p className="text-sm text-muted-foreground">Aramanızla eşleşen rezervasyon yok. Liste yalnızca bekleyen ve yaklaşan onaylı rezervasyonları içerir.</p>
                    )}

                    <section className="space-y-3">
                        <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
                            Onay bekleyenler
                            <span className="rounded-full bg-rb-gold px-2 py-0.5 text-xs font-bold text-rb-gold-foreground">{pending.length}</span>
                        </h2>
                        {pending.length === 0
                            ? <p className="text-sm text-muted-foreground">Onay bekleyen talep yok.</p>
                            : <div className={grid}>{pending.map(card)}</div>}
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-base font-semibold text-foreground">Onaylı, yaklaşan rezervasyonlar</h2>
                        {confirmed.length === 0
                            ? <p className="text-sm text-muted-foreground">Onaylı rezervasyon yok.</p>
                            : <div className={grid}>{confirmed.map(card)}</div>}
                    </section>
                </>
            )}
        </div>
    );
}
