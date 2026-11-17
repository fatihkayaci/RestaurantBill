import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { ArrowRight, CalendarPlus, Check, ChevronLeft, Clock, Copy, MapPin, Minus, Navigation, Phone, Plus, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { publicService } from '@/features/customerSite/api/publicService';
import {
    formatDuration, isReservationDayOpen, type DaySlot, type PublicSite, type PublicTable, type ReservationStatusInfo,
} from '@/features/customerSite/types';
import { RESERVATION_LOOKUP_PATH } from '@/features/customerSite/reservationCode';
import { getApiErrorMessage } from '@/lib/apiError';
import { cn } from '@/lib/utils';
import { MyReservations } from './SiteChrome';
import { serif } from './siteParts';
import { directionsUrl, formatDay, telHref } from './siteTheme';
import { fullAddress, hoursText } from './useSite';
import { downloadIcs } from '../reservationCalendar';

const DAY_CHIPS = 14;
const DEFAULT_TIME = '19:00';

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

// Seçili saat o günün boş başlangıçları arasında yoksa: 19:00, o da yoksa ilk boş saat.
function pickTime(slots: DaySlot[], current: string): string {
    const free = slots.filter(s => !s.full).map(s => s.time);
    if (free.includes(current)) return current;
    return free.includes(DEFAULT_TIME) ? DEFAULT_TIME : (free[0] ?? '');
}

// Saat düğmeleri yalnız görünüm için günün bölümüne göre gruplanır (ana sayfadaki seçiciyle aynı): 12:00 öncesi sabah,
// 17:00 öncesi öğle, sonrası akşam.
const DAY_PARTS = [
    { name: 'Sabah', until: 12 },
    { name: 'Öğle', until: 17 },
    { name: 'Akşam', until: 24 },
];

function groupSlots(slots: DaySlot[]): { name: string; slots: DaySlot[] }[] {
    return DAY_PARTS.map((part, i) => ({
        name: part.name,
        slots: slots.filter(s => {
            const hour = Number(s.time.slice(0, 2));
            return hour < part.until && hour >= (i === 0 ? 0 : DAY_PARTS[i - 1].until);
        }),
    })).filter(g => g.slots.length > 0);
}

// Sitenin sıcak, editoryal paleti (SiteFrame ile aynı tonlar); vurgu rengi restoranın ayarından.
const card = 'rounded-[20px] border border-[var(--site-border-mid)] bg-white';
const chipOn = 'border-[var(--site-accent)] bg-[var(--site-accent)] text-[var(--site-on-accent)] shadow-[0_6px_16px_-8px_var(--site-accent)]';
const chipOff = 'border-[var(--site-border-mid)] bg-white text-[var(--site-text)] hover:border-[var(--site-text)]';
const chipDisabled = 'cursor-not-allowed border-dashed border-[var(--site-border-strong)] bg-transparent text-[var(--site-border-strong)]';
const focusRing = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--site-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-white';
const inputClass = 'h-[52px] w-full rounded-xl border border-[var(--site-border-mid)] bg-white px-4 text-base text-[var(--site-text)] transition-colors placeholder:text-[var(--site-disabled)] hover:border-[var(--site-border-strong)] focus:border-[var(--site-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--site-accent)]/25';
const labelClass = 'mb-1.5 block text-sm font-medium text-[var(--site-text)]';
const primaryButton = 'flex h-14 w-full items-center justify-center gap-2 rounded-full bg-[var(--site-accent)] text-base font-semibold text-[var(--site-on-accent)] transition-[opacity,transform] hover:-translate-y-px hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 motion-reduce:transition-none';
const secondaryButton = 'flex h-12 items-center justify-center gap-2 rounded-full border border-[var(--site-border-mid)] bg-white px-5 text-[15px] font-semibold text-[var(--site-text)] transition-colors hover:border-[var(--site-text)]';
const alertClass = 'rounded-xl border border-[var(--site-error-line)] bg-[var(--site-error-bg)] p-3.5 text-sm font-medium text-[var(--site-error)]';
const eyebrowClass = 'text-[11px] font-medium uppercase tracking-[0.22em] text-[var(--site-muted)]';

type Step = 'slot' | 'details' | 'done';

const STEPS: { key: Step; label: string }[] = [
    { key: 'slot', label: 'Tarih ve masa' },
    { key: 'details', label: 'Bilgileriniz' },
    { key: 'done', label: 'Talep' },
];

interface Props {
    site: PublicSite;
    restaurantName: string;
    mine: ReservationStatusInfo[];
    onSent: (created: ReservationStatusInfo) => void;
    onClose: () => void;
    /** Ana sayfadaki hızlı seçiciden gelinirse başlangıç seçimi. */
    initial?: { date: string; time: string; partySize: number };
    /** Sitenin sayfası içinde (ortak başlık/alt bilgiyle): akışın başlığı yapışmaz, sayfa başlığı h1 olur. */
    embedded?: boolean;
}

// Rezervasyon talebi: 1) tarih, saat, kişi ve masa  2) ad, telefon, not  → restoran onaylayınca kesinleşir.
export default function ReservationFlow({ site, restaurantName, mine, onSent, onClose, initial, embedded = false }: Props) {
    const rules = site.reservation;
    const maxParty = rules.maxPartySize;
    const [now] = useState(() => new Date());
    const today = toDateInput(now);
    const maxDate = toDateInput(dateAfter(now, rules.maxDaysAhead));
    // Şubenin kapalı günleri seçilemez; şerit "en fazla kaç gün sonrası" ayarını aşmaz.
    const dayChips = useMemo(() => Array.from({ length: Math.min(DAY_CHIPS, rules.maxDaysAhead + 1) }, (_, i) => {
        const date = dateAfter(now, i);
        const value = toDateInput(date);
        return {
            value,
            top: i === 0 ? 'Bugün' : i === 1 ? 'Yarın' : date.toLocaleDateString('tr-TR', { weekday: 'short' }),
            num: String(date.getDate()),
            month: date.toLocaleDateString('tr-TR', { month: 'short' }),
            open: isReservationDayOpen(rules, value),
        };
    }), [now, rules]);

    const [step, setStep] = useState<Step>('slot');
    const [slot, setSlot] = useState(() => (initial
        ? { date: initial.date, time: initial.time }
        : { date: dayChips.find(chip => chip.open)?.value ?? today, time: DEFAULT_TIME }));
    const { date, time } = slot;
    // Tarih kendiliğinden seçildiyse (kullanıcı dokunmadıysa) ve o gün boş saat kalmadıysa sonraki açık güne geçilir.
    const [autoDate, setAutoDate] = useState(!initial);
    // Günün başlangıç saatleri (şubenin aralığı ve o günün saatleriyle); null: yükleniyor.
    const [daySlots, setDaySlots] = useState<DaySlot[] | null>(null);
    const [daySlotsError, setDaySlotsError] = useState<string | null>(null);
    const [partySize, setPartySize] = useState(() => Math.max(1, Math.min(initial?.partySize ?? 2, maxParty)));
    const [unavailable, setUnavailable] = useState<Set<string> | null>(null);
    const [slotError, setSlotError] = useState<string | null>(null);
    const [selected, setSelected] = useState<PublicTable | null>(null);
    const [guestName, setGuestName] = useState('');
    const [contact, setContact] = useState('');
    const [note, setNote] = useState('');
    const [sending, setSending] = useState(false);
    // Son gönderilen talep (sunucunun döndürdüğü hâliyle): onay ekranında kısa kod, özet ve rezervasyon sayfasının bağlantısı.
    const [created, setCreated] = useState<ReservationStatusInfo | null>(null);
    const [formError, setFormError] = useState<string | null>(null);
    // Gönderimden sonra artar: seçilen aralığın doluluğu yeniden çekilir.
    const [refreshTick, setRefreshTick] = useState(0);

    useEffect(() => {
        let cancelled = false;
        publicService.getDaySlots(site.branchId, date)
            .then(result => {
                if (cancelled) return;
                if (autoDate && !result.some(s => !s.full)) {
                    const next = dayChips.find(chip => chip.open && chip.value > date);
                    if (next) {
                        setSlot(prev => ({ ...prev, date: next.value }));
                        return;
                    }
                }
                setDaySlots(result);
                setDaySlotsError(null);
                const nextTime = pickTime(result, time);
                if (nextTime !== time) {
                    setSlot({ date, time: nextTime });
                    setSelected(null);
                    setUnavailable(null);
                }
            })
            .catch(err => {
                if (cancelled) return;
                setDaySlots([]);
                setDaySlotsError(getApiErrorMessage(err, 'Saatler yüklenemedi. Lütfen tekrar deneyin.'));
            });
        return () => { cancelled = true; };
        // Saat değişince günün saatleri yeniden çekilmez; yalnızca tarih ya da gönderim sonrası.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [site.branchId, date, refreshTick, autoDate, dayChips]);

    // Seçili saat o günün boş başlangıçlarından biriyse masaların doluluğu çekilir.
    const timeReady = daySlots?.some(s => s.time === time && !s.full) ?? false;

    useEffect(() => {
        if (!timeReady) return;
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
    }, [site.branchId, date, time, refreshTick, timeReady]);

    const changeSlot = (nextDate: string, nextTime: string) => {
        if (nextDate !== date) {
            setDaySlots(null);
            setDaySlotsError(null);
            setAutoDate(false);
        }
        setSlot({ date: nextDate, time: nextTime });
        setSelected(null);
        setUnavailable(null);
        setSlotError(null);
        setFormError(null);
    };

    const goTop = () => window.scrollTo({ top: 0 });

    // Kişi sayısı değişince seçili masa artık sığmıyorsa seçim kalkar.
    const changeParty = (next: number) => {
        setPartySize(next);
        if (selected?.capacity && selected.capacity < next) setSelected(null);
    };
    const scrollToSection = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

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
            const reservation = await publicService.createReservation({
                tableId: selected.id,
                guestName: guestName.trim(),
                contact: contact.trim(),
                date,
                time,
                partySize,
                note: note.trim(),
            });
            onSent(reservation);
            setCreated(reservation);
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
    const dateInChips = dayChips.some(chip => chip.value === date);
    // Ana sayfanın hızlı seçicisinden gün ve saat seçili gelindiyse dar ekranda masalar en üstte.
    const tablesFirst = !!initial && timeReady;
    const Title = embedded ? 'h2' : 'h1';
    const toSlot = () => { setStep('slot'); goTop(); };

    const stepBar = (
        <div className="border-b border-[var(--site-border-mid)] bg-white">
            <div className="mx-auto flex max-w-[1180px] items-center gap-2 px-3 py-3 md:px-12 md:py-4">
                {step !== 'done' && (
                    <button
                        type="button"
                        onClick={back}
                        aria-label={step === 'details' ? 'Önceki adım' : 'Restoran sayfasına dön'}
                        className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[var(--site-text)] transition-colors hover:bg-[var(--site-bg)]', focusRing)}
                    >
                        <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                    </button>
                )}
                <Title className="sr-only">Rezervasyon · {restaurantName}</Title>
                <ol aria-label="Rezervasyon adımları" className={cn('flex min-w-0 flex-1 items-center gap-2 sm:gap-3', step === 'done' && 'pl-2')}>
                    {STEPS.map((item, i) => {
                        const index = STEPS.findIndex(s => s.key === step);
                        const state = i < index ? 'past' : i === index ? 'current' : 'next';
                        return (
                            <li key={item.key} aria-current={state === 'current' ? 'step' : undefined} className={cn('flex min-w-0 items-center gap-2 sm:gap-3', i < STEPS.length - 1 && 'flex-1')}>
                                <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold tabular-nums transition-colors',
                                    state === 'current' ? 'border-[var(--site-accent)] bg-[var(--site-accent)] text-[var(--site-on-accent)]'
                                        : state === 'past' ? 'border-[var(--site-text)] bg-[var(--site-text)] text-white' : 'border-[var(--site-border-mid)] bg-white text-[var(--site-disabled)]')}>
                                    {state === 'past' ? <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" /> : i + 1}
                                </span>
                                <span className={cn('whitespace-nowrap text-[13px] font-medium',
                                    state === 'current' ? 'text-[var(--site-text)]' : 'text-[var(--site-disabled)]',
                                    state !== 'current' && 'hidden sm:inline')}>
                                    {item.label}
                                </span>
                                {i < STEPS.length - 1 && <span aria-hidden="true" className={cn('h-px min-w-3 flex-1', state === 'past' ? 'bg-[var(--site-text)]' : 'bg-[var(--site-border-mid)]')} />}
                            </li>
                        );
                    })}
                </ol>
            </div>
        </div>
    );

    if (step === 'done') {
        return (
            <div className="flex flex-col bg-[var(--site-bg)] text-[var(--site-text)]">
                {stepBar}
                <main className="mx-auto flex w-full max-w-xl flex-col gap-6 px-5 pb-16 pt-10 md:pt-14">
                    <div role="status" className="flex flex-col items-center gap-3 text-center">
                        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--site-ok-bg)] text-[var(--site-ok)] ring-8 ring-[var(--site-ok-bg)]/50">
                            <Check className="h-7 w-7" strokeWidth={2.5} aria-hidden="true" />
                        </span>
                        <p className={cn(serif, 'm-0 mt-2 text-[40px] leading-[1] tracking-[-0.02em] md:text-[52px]')}>Talebiniz <span className="italic">alındı.</span></p>
                        <p className="m-0 max-w-sm text-[15px] leading-relaxed text-[var(--site-sub)]">
                            Restoran onaylayınca kesinleşir. Durumu rezervasyon sayfanızdan izleyin.
                        </p>
                    </div>

                    {created && <ReservationTicket reservation={created} restaurantName={restaurantName} />}
                    {created && (
                        <ConfirmationActions reservation={created} restaurantName={restaurantName} address={fullAddress(site)} onNewRequest={toSlot} />
                    )}

                    <MyReservations items={mine} className="pt-2" />

                    <button type="button" onClick={onClose} className={cn(secondaryButton, 'h-14 w-full', focusRing)}>Restoran sayfasına dön</button>
                </main>
            </div>
        );
    }

    const ctaLabel = step === 'slot' ? 'Devam et' : sending ? 'Gönderiliyor…' : 'Rezervasyon talebi gönder';
    const cta = (className?: string) => step === 'slot' ? (
        <button type="button" disabled={!selected} onClick={() => { setStep('details'); goTop(); }} className={cn(primaryButton, focusRing, className)}>
            {ctaLabel}
            {selected && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
        </button>
    ) : (
        <button type="submit" disabled={sending || !selected} className={cn(primaryButton, focusRing, className)}>
            {ctaLabel}
        </button>
    );

    const slotColumn = (
        <div className="flex min-w-0 flex-col gap-5">
            {mine.length > 0 && <MyReservations items={mine} className={cn(card, 'p-5')} />}

            <FlowSection id="rez-gun" num="01" title="Hangi gün?" legend="Tarih">
                <div className="-mx-5 flex snap-x scroll-px-5 gap-2 overflow-x-auto px-5 pb-2 sm:scroll-px-6 [scrollbar-width:thin] sm:-mx-6 sm:px-6">
                    {dayChips.map(chip => {
                        const on = chip.value === date;
                        return (
                            <button
                                key={chip.value}
                                type="button"
                                aria-pressed={on}
                                disabled={!chip.open}
                                aria-label={chip.open ? formatDay(chip.value) : `${formatDay(chip.value)}, rezervasyon alınmıyor`}
                                onClick={() => changeSlot(chip.value, time)}
                                className={cn('flex h-[84px] w-[66px] shrink-0 snap-start flex-col items-center justify-center gap-1 rounded-[14px] border transition-colors', focusRing,
                                    !chip.open ? chipDisabled : on ? 'border-[var(--site-text)] bg-[var(--site-text)] text-white' : chipOff)}
                            >
                                <span className="text-[10px] font-medium uppercase tracking-[0.12em] opacity-75">{chip.top}</span>
                                <span className={cn(serif, 'text-[28px] leading-none tabular-nums', !chip.open && 'line-through decoration-1')}>{chip.num}</span>
                                <span className="text-[10px] opacity-70">{chip.month}</span>
                            </button>
                        );
                    })}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-[var(--site-alt)] pt-4">
                    <label htmlFor="rez-tarih" className="shrink-0 text-sm text-[var(--site-muted)]">Başka bir tarih</label>
                    <input
                        id="rez-tarih"
                        type="date"
                        value={date}
                        min={today}
                        max={maxDate}
                        onChange={e => { if (e.target.value) changeSlot(e.target.value, time); }}
                        className={cn(inputClass, 'h-11 max-w-[200px] text-[15px]', !dateInChips && 'border-[var(--site-accent)] ring-2 ring-[var(--site-accent)]/20')}
                    />
                </div>
            </FlowSection>

            <FlowSection num="02" title="Kaç kişisiniz?" legend="Kişi sayısı">
                <div className="flex items-center justify-between gap-4">
                    <p className="m-0 text-sm text-[var(--site-muted)]">Online en fazla {maxParty} kişi</p>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            aria-label="Kişi sayısını azalt"
                            disabled={partySize <= 1}
                            onClick={() => changeParty(Math.max(1, partySize - 1))}
                            className={cn('flex h-11 w-11 items-center justify-center rounded-full border border-[var(--site-border-mid)] bg-white text-[var(--site-text)] transition-colors hover:border-[var(--site-text)] disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:border-[var(--site-border-mid)]', focusRing)}
                        >
                            <Minus className="h-4 w-4" strokeWidth={2.25} aria-hidden="true" />
                        </button>
                        <output id="rez-kisi" aria-live="polite" aria-label={`${partySize} kişi`} className={cn(serif, 'min-w-[84px] text-center text-[30px] leading-none tabular-nums')}>
                            {partySize} <span className="text-lg italic text-[var(--site-muted)]">kişi</span>
                        </output>
                        <button
                            type="button"
                            aria-label="Kişi sayısını artır"
                            disabled={partySize >= maxParty}
                            onClick={() => changeParty(Math.min(maxParty, partySize + 1))}
                            className={cn('flex h-11 w-11 items-center justify-center rounded-full border border-[var(--site-border-mid)] bg-white text-[var(--site-text)] transition-colors hover:border-[var(--site-text)] disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:border-[var(--site-border-mid)]', focusRing)}
                        >
                            <Plus className="h-4 w-4" strokeWidth={2.25} aria-hidden="true" />
                        </button>
                    </div>
                </div>
            </FlowSection>

            <FlowSection num="03" title="Saat kaçta?" legend="Saat" note={formatDay(date)}>
                {daySlotsError ? (
                    <p role="alert" className={alertClass}>{daySlotsError}</p>
                ) : daySlots === null ? (
                    <div className="grid grid-cols-4 gap-2 sm:grid-cols-6" aria-busy="true" aria-label="Saatler yükleniyor">
                        {[...Array(8)].map((_, i) => <div key={i} className="h-[60px] animate-pulse rounded-xl bg-[var(--site-alt)]" />)}
                    </div>
                ) : !daySlots.some(s => !s.full) ? (
                    <EmptyNote>
                        {!isReservationDayOpen(rules, date)
                            ? 'Bu gün rezervasyon alınmıyor. Başka bir gün seçin.'
                            : daySlots.length > 0
                                ? 'Bu günün tüm saatleri dolu. Başka bir gün seçin.'
                                : 'Bu gün için uygun saat kalmadı. Başka bir gün seçin.'}
                    </EmptyNote>
                ) : (
                    <div className="flex flex-col gap-4">
                        {groupSlots(daySlots).map(group => (
                            <div key={group.name} className="grid grid-cols-1 items-start gap-2 sm:grid-cols-[72px_minmax(0,1fr)] sm:gap-4">
                                <span className={cn(eyebrowClass, 'sm:pt-[22px]')}>{group.name}</span>
                                <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
                                    {group.slots.map(option => {
                                        const on = option.time === time;
                                        return (
                                            <button
                                                key={option.time}
                                                type="button"
                                                aria-pressed={on}
                                                disabled={option.full}
                                                aria-label={option.full ? `${option.time}, dolu` : option.time}
                                                onClick={() => changeSlot(date, option.time)}
                                                className={cn('flex h-[60px] flex-col items-center justify-center gap-0.5 rounded-xl border transition-colors', focusRing, option.full ? chipDisabled : on ? chipOn : chipOff)}
                                            >
                                                <span className={cn(serif, 'text-[22px] leading-none tabular-nums', option.full && 'line-through decoration-1')}>{option.time}</span>
                                                <span className="text-[10px] font-medium uppercase tracking-[0.1em] opacity-75">{option.full ? 'dolu' : on ? 'seçili' : 'müsait'}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </FlowSection>

            {/* Dar ekranda seçim özeti masaların hemen üstünde; hızlı seçiciden gelindiyse ikisi en üste çıkar. */}
            <div className={cn(card, 'flex items-center justify-between gap-3 px-4 py-3 lg:hidden', tablesFirst && 'order-first')}>
                <p className="m-0 min-w-0 truncate text-[15px] font-semibold">
                    {shortDay(date)} · {timeReady ? time : 'saat seçin'} · {partySize} kişi
                </p>
                <button type="button" onClick={() => scrollToSection('rez-gun')} className={cn('flex h-11 shrink-0 items-center rounded-full px-4 text-sm font-semibold text-[var(--site-accent)] hover:bg-[var(--site-bg)]', focusRing)}>
                    Değiştir
                </button>
            </div>

            <FlowSection id="rez-masa" className={cn(tablesFirst && 'max-lg:order-first')} num="04" title="Nerede oturalım?" legend="Masa" note={timeReady ? `${formatDay(date)}, ${time}` : undefined}>
                {!timeReady ? (
                    <EmptyNote>{daySlots === null && !daySlotsError ? 'Saatler yükleniyor…' : 'Masaları görmek için önce bir gün ve saat seçin.'}</EmptyNote>
                ) : (
                    <div className="flex flex-col gap-5">
                        {slotError && <p role="alert" className={alertClass}>{slotError}</p>}

                        {!slotError && unavailable === null && (
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4" aria-busy="true" aria-label="Masalar yükleniyor">
                                {[...Array(6)].map((_, i) => <div key={i} className="h-[72px] animate-pulse rounded-xl bg-[var(--site-alt)]" />)}
                            </div>
                        )}

                        {!slotError && unavailable !== null && site.regions.map(region => {
                            const freeCount = region.tables.filter(t => !unavailable.has(t.id) && !(t.capacity && t.capacity < partySize)).length;
                            return (
                                <div key={region.id} className="flex flex-col gap-2.5">
                                    <h3 className={cn(eyebrowClass, 'm-0 flex items-center gap-3')}>
                                        {region.name}
                                        <span aria-hidden="true" className="h-px flex-1 bg-[var(--site-alt)]" />
                                        <span className="normal-case tracking-normal">{freeCount > 0 ? `${freeCount} masa boş` : 'boş masa yok'}</span>
                                    </h3>
                                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
                                        {region.tables.map(table => {
                                            const busy = unavailable.has(table.id);
                                            // Kapasitesi girilmiş ve kişi sayısına yetmeyen masa seçilemez; girilmemişse her gruba açık.
                                            const tooSmall = !busy && !!table.capacity && table.capacity < partySize;
                                            const on = selected?.id === table.id;
                                            const capacityText = table.capacity ? `${table.capacity} kişilik` : null;
                                            return (
                                                <button
                                                    key={table.id}
                                                    type="button"
                                                    disabled={busy || tooSmall}
                                                    aria-pressed={on}
                                                    aria-label={busy ? `${table.name}, bu saatte dolu`
                                                        : tooSmall ? `${table.name}, ${table.capacity} kişilik, ${partySize} kişiye dar`
                                                            : capacityText ? `${table.name}, ${capacityText}` : table.name}
                                                    onClick={() => { setSelected(on ? null : table); setFormError(null); }}
                                                    className={cn('relative flex min-h-[72px] flex-col items-start justify-center gap-1 rounded-xl border px-3.5 py-2.5 text-left transition-colors', focusRing, busy || tooSmall ? chipDisabled : on ? chipOn : chipOff)}
                                                >
                                                    <span className="text-[15px] font-semibold leading-tight">{table.name}</span>
                                                    {capacityText && <span className="text-xs opacity-80">{capacityText}</span>}
                                                    <span className="flex items-center gap-1.5 text-xs font-medium opacity-80">
                                                        <span aria-hidden="true" className={cn('h-1.5 w-1.5 rounded-full', busy || tooSmall ? 'bg-[var(--site-border-strong)]' : on ? 'bg-current' : 'bg-[#2E9E57]')} />
                                                        {busy ? 'Bu saatte dolu' : tooSmall ? 'Size dar' : on ? 'Seçili' : 'Boş'}
                                                    </span>
                                                    {on && <Check className="absolute right-3 top-3 h-4 w-4" strokeWidth={2.75} aria-hidden="true" />}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </FlowSection>
        </div>
    );

    const detailsColumn = (
        <div className="flex min-w-0 flex-col gap-5">
            {/* Dar ekranda seçim özeti formun üstünde; geniş ekranda sağdaki özet kartında. */}
            <div className={cn(card, 'flex items-center justify-between gap-3 p-4 lg:hidden')}>
                <div className="min-w-0">
                    <p className={cn(serif, 'm-0 text-[26px] leading-tight')}>{selected?.name}</p>
                    <p className="m-0 text-sm text-[var(--site-muted)]">{formatDay(date)} · {time} · {partySize} kişi</p>
                </div>
                <button type="button" onClick={toSlot} className={cn('flex h-11 shrink-0 items-center rounded-full px-4 text-sm font-semibold text-[var(--site-accent)] hover:bg-[var(--site-bg)]', focusRing)}>
                    Değiştir
                </button>
            </div>

            <FlowSection num="05" title="Sizi nasıl tanıyalım?" legend="İletişim bilgileriniz">
                <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label htmlFor="rez-ad" className={labelClass}>Ad soyad</label>
                            <input id="rez-ad" value={guestName} onChange={e => setGuestName(e.target.value)} required maxLength={100} autoComplete="name" placeholder="Adınız ve soyadınız" className={inputClass} />
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
                                className={cn(inputClass, 'tabular-nums')}
                            />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="rez-not" className={labelClass}>Not <span className="font-normal text-[var(--site-disabled)]">(isteğe bağlı)</span></label>
                        <textarea
                            id="rez-not"
                            value={note}
                            onChange={e => setNote(e.target.value)}
                            maxLength={500}
                            rows={3}
                            placeholder="Doğum günü, bebek sandalyesi gibi istekleriniz"
                            className={cn(inputClass, 'h-auto resize-y py-3 leading-relaxed')}
                        />
                    </div>
                    <p className="m-0 text-[13px] leading-relaxed text-[var(--site-muted)]">
                        Talebi gönderince size bir rezervasyon kodu verilir; bu kod ve telefon numaranızla rezervasyonunuzu sonradan sorgulayabilirsiniz.
                    </p>
                    {formError && <p role="alert" className={alertClass}>{formError}</p>}
                </div>
            </FlowSection>
        </div>
    );

    const address = fullAddress(site);
    const hours = hoursText(site);

    const summaryCard = (
        <div className={cn(card, 'hidden overflow-hidden lg:block')}>
            <div className="relative flex min-h-[132px] flex-col justify-end overflow-hidden bg-[var(--site-paper)] px-6 pb-5 pt-8 text-white">
                {site.site.coverImageUrl && (
                    <>
                        <img src={site.site.coverImageUrl} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover" />
                        <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(180deg,rgba(20,16,12,0.25),rgba(20,16,12,0.78))]" />
                    </>
                )}
                <span className="relative text-[11px] font-medium uppercase tracking-[0.22em] text-white/75">Rezervasyonunuz</span>
                <span className={cn(serif, 'relative mt-1 text-[32px] italic leading-none')}>{restaurantName}</span>
            </div>
            <dl className="m-0 flex flex-col divide-y divide-[var(--site-alt)] px-6 py-2">
                <SummaryRow label="Tarih" value={formatDay(date)} />
                <SummaryRow label="Saat" value={timeReady ? time : '—'} />
                <SummaryRow label="Kişi" value={`${partySize} kişi`} />
                <SummaryRow label="Masa" value={selected?.name ?? 'Seçilmedi'} muted={!selected} />
            </dl>
            <div className="flex flex-col gap-2.5 px-6 pb-6 pt-2">
                {cta()}
                {step === 'details' ? (
                    <button type="button" onClick={toSlot} className="self-center text-sm font-medium text-[var(--site-muted)] underline-offset-4 hover:text-[var(--site-text)] hover:underline">
                        Tarih ya da masayı değiştir
                    </button>
                ) : (
                    <p className="m-0 text-center text-xs text-[var(--site-muted)]">{selected ? 'Sonraki adımda adınızı ve telefonunuzu alacağız.' : 'Devam etmek için bir masa seçin.'}</p>
                )}
            </div>
        </div>
    );

    const infoCard = (
        <div className={cn(card, 'flex flex-col gap-4 p-5 sm:p-6')}>
            <span className={eyebrowClass}>Bilmeniz gerekenler</span>
            <ul className="m-0 flex list-none flex-col gap-3.5 p-0 text-sm leading-relaxed text-[var(--site-sub)]">
                <InfoItem icon={<Check className="h-4 w-4" aria-hidden="true" />}>Talebiniz restorana iletilir; restoran onaylayınca kesinleşir.</InfoItem>
                <InfoItem icon={<Clock className="h-4 w-4" aria-hidden="true" />}>Masa {formatDuration(rules.durationMinutes)} süreyle sizin için ayrılır.</InfoItem>
                <InfoItem icon={<Users className="h-4 w-4" aria-hidden="true" />}>Online en fazla {maxParty} kişilik rezervasyon yapılabilir.</InfoItem>
            </ul>
            {(address || site.phone || hours) && (
                <div className="flex flex-col gap-3 border-t border-[var(--site-alt)] pt-4 text-sm">
                    {address && (
                        <InfoItem icon={<MapPin className="h-4 w-4" aria-hidden="true" />}>
                            <span className="block text-[var(--site-text)]">{address}</span>
                            <a href={directionsUrl(address)} target="_blank" rel="noopener noreferrer" className="font-semibold text-[var(--site-text)] underline decoration-[var(--site-border-mid)] underline-offset-4 hover:decoration-[var(--site-text)]">Yol tarifi al</a>
                        </InfoItem>
                    )}
                    {site.phone && (
                        <InfoItem icon={<Phone className="h-4 w-4" aria-hidden="true" />}>
                            <a href={telHref(site.phone)} className="font-semibold tabular-nums text-[var(--site-text)] no-underline hover:underline">{site.phone}</a>
                        </InfoItem>
                    )}
                    {hours && (
                        <InfoItem icon={<Clock className="h-4 w-4" aria-hidden="true" />}>
                            <span className="text-[var(--site-text)]">Her gün <span className="tabular-nums">{hours}</span></span>
                            {site.isOpenNow !== null && <span className="text-[var(--site-muted)]"> · {site.isOpenNow ? 'şu an açık' : 'şu an kapalı'}</span>}
                        </InfoItem>
                    )}
                </div>
            )}
            {mine.length === 0 && (
                <p className="m-0 border-t border-[var(--site-alt)] pt-4 text-sm text-[var(--site-muted)]">
                    Rezervasyonunuz var mı?{' '}
                    <Link to={RESERVATION_LOOKUP_PATH} className="font-semibold text-[var(--site-accent)] underline-offset-4 hover:underline">Kodla sorgulayın</Link>
                </p>
            )}
        </div>
    );

    const layout = (
        <>
            <div className="mx-auto grid w-full max-w-[1180px] flex-1 grid-cols-1 items-start gap-5 px-4 pb-10 pt-6 sm:px-5 md:px-12 md:pt-10 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-8 lg:pb-16">
                {step === 'slot' ? slotColumn : detailsColumn}
                <aside className="flex min-w-0 flex-col gap-5 lg:sticky lg:top-28">
                    {summaryCard}
                    {infoCard}
                </aside>
            </div>

            {/* Dar ekranda yapışkan onay çubuğu */}
            <div className="sticky bottom-0 z-10 border-t border-[var(--site-border-mid)] bg-white/95 backdrop-blur-md lg:hidden">
                <div className="mx-auto flex max-w-2xl flex-col gap-2.5 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3">
                    {step === 'slot' ? (
                        <p className="m-0 truncate text-center text-sm text-[var(--site-sub)]">{selected ? summary : 'Bir masa seçin'}</p>
                    ) : null}
                    {cta()}
                    {step === 'details' && <p className="m-0 text-center text-xs text-[var(--site-muted)]">Talebiniz restoran onayladığında kesinleşir.</p>}
                </div>
            </div>
        </>
    );

    return (
        <div className={cn('flex flex-col bg-[var(--site-bg)] text-[var(--site-text)]', embedded ? 'min-h-[70vh]' : 'min-h-screen')}>
            {stepBar}
            {step === 'details' ? <form onSubmit={submit} className="flex flex-1 flex-col">{layout}</form> : layout}
        </div>
    );
}

function FlowSection({ id, className, num, title, legend, note, children }: {
    id?: string; className?: string; num: string; title: string; legend: string; note?: string; children: ReactNode;
}) {
    return (
        <fieldset id={id} className={cn(card, 'm-0 min-w-0 scroll-mt-24 p-5 sm:p-6', className)}>
            <legend className="sr-only">{legend}</legend>
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <p aria-hidden="true" className="m-0 flex items-baseline gap-3">
                    <span className="text-[11px] font-medium tracking-[0.2em] text-[var(--site-accent)]">{num}</span>
                    <span className={cn(serif, 'text-[28px] leading-none tracking-[-0.01em] md:text-[32px]')}>{title}</span>
                </p>
                {note && <span className="text-sm text-[var(--site-muted)]">{note}</span>}
            </div>
            {children}
        </fieldset>
    );
}

function EmptyNote({ children }: { children: ReactNode }) {
    return (
        <p className="m-0 rounded-xl border border-dashed border-[var(--site-border-mid)] bg-[var(--site-bg)] px-4 py-5 text-center text-sm text-[var(--site-muted)]">{children}</p>
    );
}

function SummaryRow({ label, value, muted = false }: { label: string; value: string; muted?: boolean }) {
    return (
        <div className="flex items-baseline justify-between gap-4 py-3">
            <dt className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--site-muted)]">{label}</dt>
            <dd className={cn('m-0 text-right text-[15px] font-semibold', muted && 'font-normal text-[var(--site-disabled)]')}>{value}</dd>
        </div>
    );
}

function InfoItem({ icon, children }: { icon: ReactNode; children: ReactNode }) {
    return (
        <li className="flex list-none items-start gap-3">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--site-bg)] text-[var(--site-sub)]">{icon}</span>
            <span className="min-w-0">{children}</span>
        </li>
    );
}

// Onay ekranının bileti: kısa kod öne çıkar; bağlantı kaybolursa müşteri bu kod ve telefonuyla /rezervasyon-sorgula'dan bulur.
function ReservationTicket({ reservation, restaurantName }: { reservation: ReservationStatusInfo; restaurantName: string }) {
    const { code } = reservation;
    const copy = async () => {
        try {
            await navigator.clipboard.writeText(code);
            toast.success('Kod kopyalandı');
        } catch {
            toast.error('Kopyalanamadı; kodu not alın.');
        }
    };

    return (
        <section aria-label="Rezervasyon özeti" className="relative overflow-hidden rounded-[22px] border border-[var(--site-border-mid)] bg-white shadow-[0_18px_40px_-24px_rgba(20,16,12,0.35)]">
            <div className="flex flex-col items-center gap-2 bg-[var(--site-text)] px-6 pb-7 pt-6 text-center text-white">
                <span className="text-[11px] font-medium uppercase tracking-[0.24em] text-white/60">{restaurantName}</span>
                {code ? (
                    <>
                        <p className="m-0 mt-1 text-sm text-white/75">Rezervasyon kodunuz</p>
                        <p aria-label={`Rezervasyon kodunuz: ${code.split('').join(' ')}`} className="m-0 font-mono text-[40px] font-bold leading-none tracking-[0.14em] tabular-nums sm:text-[46px]">{code}</p>
                        <button
                            type="button"
                            onClick={copy}
                            className="mt-2 flex h-11 items-center justify-center gap-2 rounded-full border border-white/30 px-5 text-sm font-semibold text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                        >
                            <Copy className="h-4 w-4" aria-hidden="true" />
                            Kodu kopyala
                        </button>
                    </>
                ) : (
                    <p className={cn(serif, 'm-0 text-[32px] italic leading-none')}>Rezervasyon talebi</p>
                )}
            </div>

            {/* Bilet kesiği */}
            <div aria-hidden="true" className="relative h-0">
                <span className="absolute -left-3 -top-3 h-6 w-6 rounded-full border border-[var(--site-border-mid)] bg-[var(--site-bg)]" />
                <span className="absolute -right-3 -top-3 h-6 w-6 rounded-full border border-[var(--site-border-mid)] bg-[var(--site-bg)]" />
            </div>

            <dl className="m-0 grid grid-cols-2 gap-x-4 gap-y-4 border-t border-dashed border-[var(--site-border-mid)] px-6 pb-5 pt-6">
                <TicketField label="Tarih" value={formatDay(reservation.date)} wide />
                <TicketField label="Saat" value={`${reservation.time}–${reservation.endTime}`} />
                <TicketField label="Kişi" value={`${reservation.partySize} kişi`} />
                <TicketField label="Masa" value={reservation.tableName} />
                <TicketField label="Ad" value={reservation.guestName} />
            </dl>
            {code && (
                <p className="m-0 border-t border-[var(--site-alt)] px-6 py-4 text-[13px] leading-relaxed text-[var(--site-muted)]">
                    Bu kod ve telefon numaranızla rezervasyonunuzu{' '}
                    <Link to={RESERVATION_LOOKUP_PATH} className="font-semibold text-[var(--site-text)] underline underline-offset-4">sorgulayabilirsiniz</Link>.
                </p>
            )}
        </section>
    );
}

function TicketField({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
    return (
        <div className={cn('min-w-0', wide && 'col-span-2')}>
            <dt className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--site-muted)]">{label}</dt>
            <dd className={cn(serif, 'm-0 mt-1 break-words text-[24px] leading-tight tabular-nums')}>{value}</dd>
        </div>
    );
}

// "2026-11-14" → "Cuma 14 Kas" (seçim özeti satırı).
function shortDay(date: string): string {
    const [year, month, day] = date.split('-').map(Number);
    const value = new Date(year, month - 1, day);
    return `${value.toLocaleDateString('tr-TR', { weekday: 'long' })} ${day} ${value.toLocaleDateString('tr-TR', { month: 'short' })}`;
}

// Onay ekranının eylemleri: ana eylem rezervasyon sayfası (durum ve ön sipariş orada), yanında takvim dosyası ve yol tarifi;
// bağlantıyı kopyalamak ve yeni talep ikincil satırda. Bağlantı bu cihazda da saklanır.
function ConfirmationActions({ reservation, restaurantName, address, onNewRequest }: {
    reservation: ReservationStatusInfo; restaurantName: string; address: string; onNewRequest: () => void;
}) {
    const path = `/rezervasyon/${reservation.accessToken}`;
    const url = `${window.location.origin}${path}`;

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(url);
            toast.success('Bağlantı kopyalandı');
        } catch {
            toast.error('Kopyalanamadı; "Rezervasyon sayfamı aç" ile açıp adres çubuğundan kopyalayın.');
        }
    };

    const addToCalendar = () => downloadIcs({
        uid: reservation.code || reservation.accessToken.slice(0, 12),
        title: `${restaurantName} · Rezervasyon`,
        date: reservation.date,
        time: reservation.time,
        endTime: reservation.endTime,
        location: address || undefined,
        description: [
            `${reservation.partySize} kişi · ${reservation.tableName}`,
            reservation.code ? `Rezervasyon kodu: ${reservation.code}` : '',
            'Restoran onaylayınca kesinleşir.',
            url,
        ].filter(Boolean).join('\n'),
    });

    const textButton = cn('inline-flex min-h-11 items-center gap-1.5 rounded-full px-2 font-semibold text-[var(--site-text)] underline-offset-4 hover:underline', focusRing);

    return (
        <div className="flex flex-col gap-2.5">
            <Link to={path} className={cn(primaryButton, focusRing, 'no-underline')}>
                Rezervasyon sayfamı aç
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <div className={cn('grid gap-2', address ? 'grid-cols-2' : 'grid-cols-1')}>
                <button type="button" onClick={addToCalendar} className={cn(secondaryButton, focusRing)}>
                    <CalendarPlus className="h-4 w-4" aria-hidden="true" />
                    Takvime ekle
                </button>
                {address && (
                    <a href={directionsUrl(address)} target="_blank" rel="noopener noreferrer" className={cn(secondaryButton, focusRing, 'no-underline')}>
                        <Navigation className="h-4 w-4" aria-hidden="true" />
                        Yol tarifi
                    </a>
                )}
            </div>
            <p className="m-0 flex items-center justify-center gap-1 text-sm text-[var(--site-muted)]">
                <button type="button" onClick={copy} className={textButton}>
                    <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                    Bağlantıyı kopyala
                </button>
                <span aria-hidden="true">·</span>
                <button type="button" onClick={onNewRequest} className={textButton}>Yeni talep</button>
            </p>
        </div>
    );
}
