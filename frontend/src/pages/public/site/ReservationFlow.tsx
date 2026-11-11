import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Check, ChevronLeft, Minus, Plus } from 'lucide-react';
import { publicService } from '@/features/customerSite/api/publicService';
import type { PublicSite, PublicTable, ReservationStatusInfo } from '@/features/customerSite/types';
import { getApiErrorMessage } from '@/lib/apiError';
import { cn } from '@/lib/utils';
import { MyReservations } from './SiteSections';
import { formatDay, headingFont } from './siteTheme';

const MAX_DAYS_AHEAD = 60;
const DAY_CHIPS = 14;
const MAX_PARTY = 20;
const DEFAULT_TIME = '19:00';

// 09:00 – 23:30 arası yarım saatlik başlangıçlar.
const TIME_OPTIONS = Array.from({ length: 30 }, (_, i) => {
    const hour = 9 + Math.floor(i / 2);
    return `${String(hour).padStart(2, '0')}:${i % 2 === 0 ? '00' : '30'}`;
});

const toMinutes = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
};

function toDateInput(date: Date): string {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
}

function dateAfter(base: Date, days: number): Date {
    const date = new Date(base);
    date.setDate(date.getDate() + days);
    return date;
}

// Bugün geçmiş saatler seçilemez; hiç saat kalmadıysa yarından başlanır.
function initialSlot(now: Date): { date: string; time: string } {
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const future = TIME_OPTIONS.filter(t => toMinutes(t) > nowMinutes);
    if (future.length === 0) return { date: toDateInput(dateAfter(now, 1)), time: DEFAULT_TIME };
    const time = future.includes(DEFAULT_TIME) ? DEFAULT_TIME : future[0];
    return { date: toDateInput(now), time };
}

const chipOn = 'border-[1.5px] border-[var(--site-accent)] bg-[var(--site-accent)] text-[var(--site-on-accent)]';
const chipOff = 'border border-[var(--site-border-strong)] bg-[var(--site-card)] text-[var(--site-text)] hover:border-[var(--site-accent)]';
const chipDisabled = 'cursor-not-allowed border border-dashed border-[var(--site-border-strong)] bg-transparent text-[var(--site-muted)] line-through';
const legendClass = 'mb-2.5 p-0 text-[15px] font-semibold';
const inputClass = 'h-12 w-full rounded-xl border border-[var(--site-border-strong)] bg-[var(--site-card)] px-3 text-base text-[var(--site-text)] placeholder:text-[var(--site-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--site-accent)]';
const labelClass = 'mb-1.5 block text-sm font-semibold';
const primaryButton = 'flex h-14 w-full items-center justify-center rounded-full bg-[var(--site-accent)] text-[17px] font-semibold text-[var(--site-on-accent)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45';

type Step = 'slot' | 'details' | 'done';

interface Props {
    site: PublicSite;
    restaurantName: string;
    mine: ReservationStatusInfo[];
    onSent: (created: ReservationStatusInfo) => void;
    onClose: () => void;
}

// Rezervasyon talebi: 1) tarih, saat, kişi ve masa  2) ad, telefon, not  → restoran onaylayınca kesinleşir.
export default function ReservationFlow({ site, restaurantName, mine, onSent, onClose }: Props) {
    const [now] = useState(() => new Date());
    const today = toDateInput(now);
    const maxDate = toDateInput(dateAfter(now, MAX_DAYS_AHEAD));
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const dayChips = useMemo(() => Array.from({ length: DAY_CHIPS }, (_, i) => {
        const date = dateAfter(now, i);
        return {
            value: toDateInput(date),
            top: i === 0 ? 'Bugün' : i === 1 ? 'Yarın' : date.toLocaleDateString('tr-TR', { weekday: 'short' }),
            num: String(date.getDate()),
        };
    }), [now]);

    const [step, setStep] = useState<Step>('slot');
    const [slot, setSlot] = useState(() => initialSlot(now));
    const { date, time } = slot;
    const [partySize, setPartySize] = useState(2);
    const [unavailable, setUnavailable] = useState<Set<string> | null>(null);
    const [slotError, setSlotError] = useState<string | null>(null);
    const [selected, setSelected] = useState<PublicTable | null>(null);
    const [guestName, setGuestName] = useState('');
    const [contact, setContact] = useState('');
    const [note, setNote] = useState('');
    const [sending, setSending] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    // Gönderimden sonra artar: seçilen aralığın doluluğu yeniden çekilir.
    const [refreshTick, setRefreshTick] = useState(0);

    useEffect(() => {
        let cancelled = false;
        publicService.getAvailability(site.branchId, date, time)
            .then(result => {
                if (cancelled) return;
                setUnavailable(new Set(result.unavailableTableIds));
                setSlotError(null);
            })
            .catch(err => {
                if (cancelled) return;
                setUnavailable(null);
                setSlotError(getApiErrorMessage(err, 'Uygun masalar yüklenemedi. Lütfen tekrar deneyin.'));
            });
        return () => { cancelled = true; };
    }, [site.branchId, date, time, refreshTick]);

    const changeSlot = (nextDate: string, nextTime: string) => {
        // Bugüne dönülürken seçili saat geçmişte kaldıysa ilk uygun saate kay.
        let fixedTime = nextTime;
        if (nextDate === today && toMinutes(nextTime) <= nowMinutes) {
            fixedTime = TIME_OPTIONS.find(t => toMinutes(t) > nowMinutes) ?? nextTime;
        }
        setSlot({ date: nextDate, time: fixedTime });
        setSelected(null);
        setUnavailable(null);
        setSlotError(null);
        setFormError(null);
    };

    const goTop = () => window.scrollTo({ top: 0 });

    const back = () => {
        if (step === 'details') { setStep('slot'); goTop(); return; }
        onClose();
    };

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        if (!selected || sending) return;
        setSending(true);
        setFormError(null);
        try {
            const created = await publicService.createReservation({
                tableId: selected.id,
                guestName: guestName.trim(),
                contact: contact.trim(),
                date,
                time,
                partySize,
                note: note.trim(),
            });
            onSent(created);
            setSelected(null);
            setNote('');
            setRefreshTick(t => t + 1);
            setStep('done');
            goTop();
        } catch (err) {
            setFormError(getApiErrorMessage(err, 'Rezervasyon talebi gönderilemedi. Lütfen tekrar deneyin.'));
            setRefreshTick(t => t + 1);
        } finally {
            setSending(false);
        }
    };

    const summary = selected
        ? `${selected.name} · ${formatDay(date)} · ${time} · ${partySize} kişi`
        : `${formatDay(date)} · ${time} · ${partySize} kişi`;
    const stepLabel = step === 'slot' ? 'Adım 1 / 2' : step === 'details' ? 'Adım 2 / 2' : 'Talep gönderildi';
    const dateInChips = dayChips.some(chip => chip.value === date);

    return (
        <div className="flex min-h-screen flex-col">
            <header className="sticky top-0 z-20 border-b border-[var(--site-border)] bg-[var(--site-bg)]">
                <div className="mx-auto flex h-[60px] max-w-2xl items-center gap-1 px-2">
                    <button
                        type="button"
                        onClick={back}
                        aria-label={step === 'details' ? 'Önceki adım' : 'Restoran sayfasına dön'}
                        className="flex h-11 w-11 items-center justify-center rounded-full text-[var(--site-text)] hover:bg-[var(--site-raised)]"
                    >
                        <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                    </button>
                    <div className="min-w-0">
                        <h1 className={cn(headingFont, 'text-lg font-bold leading-tight')}>Rezervasyon</h1>
                        <p className="truncate text-xs text-[var(--site-muted)]">{restaurantName} · {stepLabel}</p>
                    </div>
                </div>
            </header>

            {step === 'done' && (
                <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-5 py-6">
                    <div role="status" className="flex items-start gap-3 rounded-2xl border border-[var(--site-ok-line)] bg-[var(--site-ok-bg)] p-4">
                        <Check className="mt-0.5 h-5 w-5 shrink-0 text-[var(--site-ok)]" strokeWidth={2.5} aria-hidden="true" />
                        <div>
                            <p className="text-base font-semibold">Talebiniz alındı</p>
                            <p className="mt-0.5 text-sm leading-relaxed text-[var(--site-sub)]">
                                Restoran onayladığında rezervasyonunuz kesinleşir. Durumu bu sayfadan takip edebilirsiniz.
                            </p>
                        </div>
                    </div>
                    <MyReservations items={mine} />
                    <div className="flex flex-col gap-2.5">
                        <button type="button" onClick={onClose} className={primaryButton}>Restoran sayfasına dön</button>
                        <button
                            type="button"
                            onClick={() => { setStep('slot'); goTop(); }}
                            className="flex h-12 items-center justify-center rounded-full border border-[var(--site-border-strong)] text-[15px] font-semibold hover:border-[var(--site-text)]"
                        >
                            Yeni rezervasyon talebi
                        </button>
                    </div>
                </main>
            )}

            {step === 'slot' && (
                <>
                    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-[26px] px-5 pb-8 pt-5">
                        <MyReservations items={mine} />

                        <fieldset className="m-0 border-0 p-0">
                            <legend className={legendClass}>Tarih</legend>
                            <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
                                {dayChips.map(chip => {
                                    const on = chip.value === date;
                                    return (
                                        <button
                                            key={chip.value}
                                            type="button"
                                            aria-pressed={on}
                                            aria-label={formatDay(chip.value)}
                                            onClick={() => changeSlot(chip.value, time)}
                                            className={cn('flex h-16 w-[62px] shrink-0 flex-col items-center justify-center rounded-[14px] transition-colors', on ? chipOn : chipOff)}
                                        >
                                            <span className="text-xs font-medium">{chip.top}</span>
                                            <span className="text-lg font-bold tabular-nums">{chip.num}</span>
                                        </button>
                                    );
                                })}
                            </div>
                            <div className="mt-3 flex items-center gap-3">
                                <label htmlFor="rez-tarih" className="shrink-0 text-sm text-[var(--site-sub)]">Başka bir tarih</label>
                                <input
                                    id="rez-tarih"
                                    type="date"
                                    value={date}
                                    min={today}
                                    max={maxDate}
                                    onChange={e => { if (e.target.value) changeSlot(e.target.value, time); }}
                                    className={cn(inputClass, 'h-11 max-w-[200px]', !dateInChips && 'border-[var(--site-accent)]')}
                                />
                            </div>
                        </fieldset>

                        <fieldset className="m-0 border-0 p-0">
                            <legend className={legendClass}>Saat</legend>
                            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                                {TIME_OPTIONS.map(option => {
                                    const past = date === today && toMinutes(option) <= nowMinutes;
                                    const on = option === time;
                                    return (
                                        <button
                                            key={option}
                                            type="button"
                                            aria-pressed={on}
                                            disabled={past}
                                            onClick={() => changeSlot(date, option)}
                                            className={cn('h-12 rounded-xl text-[15px] font-semibold tabular-nums transition-colors', past ? chipDisabled : on ? chipOn : chipOff)}
                                        >
                                            {option}
                                        </button>
                                    );
                                })}
                            </div>
                        </fieldset>

                        <div className="flex items-center justify-between">
                            <label htmlFor="rez-kisi" className="text-[15px] font-semibold">Kişi sayısı</label>
                            <div className="flex items-center gap-1 rounded-full border border-[var(--site-border-strong)] bg-[var(--site-card)] p-0.5">
                                <button
                                    type="button"
                                    aria-label="Kişi sayısını azalt"
                                    disabled={partySize <= 1}
                                    onClick={() => setPartySize(n => Math.max(1, n - 1))}
                                    className="flex h-11 w-11 items-center justify-center rounded-full disabled:opacity-40"
                                >
                                    <Minus className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
                                </button>
                                <output id="rez-kisi" aria-live="polite" className="w-10 text-center text-lg font-bold tabular-nums">{partySize}</output>
                                <button
                                    type="button"
                                    aria-label="Kişi sayısını artır"
                                    disabled={partySize >= MAX_PARTY}
                                    onClick={() => setPartySize(n => Math.min(MAX_PARTY, n + 1))}
                                    className="flex h-11 w-11 items-center justify-center rounded-full disabled:opacity-40"
                                >
                                    <Plus className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
                                </button>
                            </div>
                        </div>

                        <fieldset className="m-0 flex flex-col gap-[18px] border-0 p-0">
                            <legend className={legendClass}>
                                Masa seçin <span className="font-normal text-[var(--site-muted)]">· {formatDay(date)}, {time}</span>
                            </legend>

                            {slotError && <p role="alert" className="rounded-xl border border-[var(--site-error-line)] bg-[var(--site-error-bg)] p-3 text-sm font-medium text-[var(--site-error)]">{slotError}</p>}

                            {!slotError && unavailable === null && (
                                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4" aria-busy="true">
                                    {[...Array(8)].map((_, i) => <div key={i} className="h-[60px] animate-pulse rounded-xl bg-[var(--site-card)]" />)}
                                </div>
                            )}

                            {!slotError && unavailable !== null && site.regions.map(region => (
                                <div key={region.id} className="flex flex-col gap-2">
                                    <h2 className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--site-muted)]">{region.name}</h2>
                                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                                        {region.tables.map(table => {
                                            const busy = unavailable.has(table.id);
                                            const on = selected?.id === table.id;
                                            return (
                                                <button
                                                    key={table.id}
                                                    type="button"
                                                    disabled={busy}
                                                    aria-pressed={on}
                                                    aria-label={busy ? `${table.name}, bu saatte dolu` : table.name}
                                                    onClick={() => { setSelected(on ? null : table); setFormError(null); }}
                                                    className={cn('flex min-h-[60px] flex-col items-center justify-center rounded-xl px-2 py-1.5 text-center transition-colors', busy ? chipDisabled : on ? chipOn : chipOff)}
                                                >
                                                    <span className="text-[15px] font-bold leading-tight">{table.name}</span>
                                                    <span className="text-[11px] font-medium">{busy ? 'Dolu' : on ? 'Seçili' : 'Boş'}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </fieldset>

                        <p className="text-[13px] leading-relaxed text-[var(--site-muted)]">
                            Talebiniz restorana iletilir; restoran onaylayınca kesinleşir. Masa 2 saat ayrılır.
                        </p>
                    </main>

                    <div className="sticky bottom-0 z-10 border-t border-[var(--site-border)] bg-[var(--site-bg)]">
                        <div className="mx-auto flex max-w-2xl flex-col gap-2.5 px-5 pb-5 pt-3.5">
                            <p className="text-sm text-[var(--site-sub)]">{selected ? summary : 'Bir masa seçin'}</p>
                            <button
                                type="button"
                                disabled={!selected}
                                onClick={() => { setStep('details'); goTop(); }}
                                className={primaryButton}
                            >
                                Devam et
                            </button>
                        </div>
                    </div>
                </>
            )}

            {step === 'details' && (
                <form onSubmit={submit} className="flex flex-1 flex-col">
                    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-5 pb-8 pt-5">
                        <div className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--site-border)] bg-[var(--site-card)] p-4">
                            <div className="min-w-0">
                                <p className={cn(headingFont, 'text-xl font-bold leading-tight')}>{selected?.name}</p>
                                <p className="text-sm text-[var(--site-sub)]">{formatDay(date)} · {time} · {partySize} kişi</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => { setStep('slot'); goTop(); }}
                                className="flex h-11 shrink-0 items-center rounded-xl px-3 text-sm font-semibold text-[var(--site-accent)] hover:bg-[var(--site-raised)]"
                            >
                                Değiştir
                            </button>
                        </div>
                        <div>
                            <label htmlFor="rez-ad" className={labelClass}>Ad soyad</label>
                            <input id="rez-ad" value={guestName} onChange={e => setGuestName(e.target.value)} required maxLength={100} autoComplete="name" className={inputClass} />
                        </div>
                        <div>
                            <label htmlFor="rez-telefon" className={labelClass}>Telefon</label>
                            <input
                                id="rez-telefon"
                                type="tel"
                                inputMode="tel"
                                value={contact}
                                onChange={e => setContact(e.target.value)}
                                required
                                maxLength={30}
                                autoComplete="tel"
                                placeholder="05xx xxx xx xx"
                                className={inputClass}
                            />
                        </div>
                        <div>
                            <label htmlFor="rez-not" className={labelClass}>Not (isteğe bağlı)</label>
                            <textarea
                                id="rez-not"
                                value={note}
                                onChange={e => setNote(e.target.value)}
                                maxLength={500}
                                rows={3}
                                placeholder="Doğum günü, bebek sandalyesi gibi istekleriniz"
                                className={cn(inputClass, 'h-auto py-2.5')}
                            />
                        </div>
                        {formError && <p role="alert" className="rounded-xl border border-[var(--site-error-line)] bg-[var(--site-error-bg)] p-3 text-sm font-medium text-[var(--site-error)]">{formError}</p>}
                    </main>

                    <div className="sticky bottom-0 z-10 border-t border-[var(--site-border)] bg-[var(--site-bg)]">
                        <div className="mx-auto flex max-w-2xl flex-col gap-2 px-5 pb-5 pt-3.5">
                            <button type="submit" disabled={sending || !selected} className={primaryButton}>
                                {sending ? 'Gönderiliyor…' : 'Rezervasyon talebi gönder'}
                            </button>
                            <p className="text-center text-xs text-[var(--site-muted)]">Talebiniz restoran onayladığında kesinleşir.</p>
                        </div>
                    </div>
                </form>
            )}
        </div>
    );
}
