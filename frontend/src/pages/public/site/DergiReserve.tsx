import { useEffect, useMemo, useState } from 'react';
import { publicService } from '@/features/customerSite/api/publicService';
import { isReservationDayOpen, type DaySlot, type ReservationRules } from '@/features/customerSite/types';
import { cn } from '@/lib/utils';

const DAYS = 7;

export interface ReserveChoice {
    date: string;
    time: string;
    partySize: number;
}

function toDateInput(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// Saatler günün bölümüne göre gruplanır: 12:00 öncesi sabah, 17:00 öncesi öğle, sonrası akşam.
const PARTS = [
    { name: 'Sabah', until: 12 },
    { name: 'Öğle', until: 17 },
    { name: 'Akşam', until: 24 },
];

function groupSlots(slots: DaySlot[]): { name: string; slots: DaySlot[] }[] {
    return PARTS.map((part, i) => ({
        name: part.name,
        slots: slots.filter(s => {
            const hour = Number(s.time.slice(0, 2));
            return hour < part.until && hour >= (i === 0 ? 0 : PARTS[i - 1].until);
        }),
    })).filter(g => g.slots.length > 0);
}

const serif = "font-[family-name:'Instrument_Serif',serif] font-normal";
const roundButton = 'h-11 w-11 rounded-full border border-[#DDD7CE] bg-white text-xl text-[#141414] disabled:opacity-35';

// Ana sayfanın rezervasyon kartı (tasarım: "Birleşik · açık" · saat tablosu): 7 günlük şerit, kişi sayısı,
// sabah/öğle/akşam saat düğmeleri → "Devam et" tam akışı bu seçimle açar.
// Gün şeridi şubenin "en fazla kaç gün sonrası" ayarını aşmaz; kapalı günler seçilemez.
export default function DergiReserve({ branchId, rules, onContinue }: {
    branchId: string;
    rules: ReservationRules;
    onContinue: (choice: ReserveChoice) => void;
}) {
    const maxParty = rules.maxPartySize;
    const [now] = useState(() => new Date());
    const days = useMemo(() => Array.from({ length: Math.min(DAYS, rules.maxDaysAhead + 1) }, (_, i) => {
        const date = new Date(now);
        date.setDate(now.getDate() + i);
        const value = toDateInput(date);
        return {
            value,
            top: i === 0 ? 'Bugün' : i === 1 ? 'Yarın' : date.toLocaleDateString('tr-TR', { weekday: 'short' }),
            num: String(date.getDate()),
            month: date.toLocaleDateString('tr-TR', { month: 'long' }),
            full: date.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' }),
            open: isReservationDayOpen(rules, value),
        };
    }), [now, rules]);

    const [day, setDay] = useState(() => (days.find(d => d.open) ?? days[0]).value);
    const [people, setPeople] = useState(() => Math.min(2, maxParty));
    const [slots, setSlots] = useState<DaySlot[] | null>(null);
    const [picked, setPicked] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        publicService.getDaySlots(branchId, day)
            .then(result => { if (!cancelled) setSlots(result); })
            .catch(() => { if (!cancelled) setSlots([]); });
        return () => { cancelled = true; };
    }, [branchId, day]);

    const open = slots?.filter(s => !s.full) ?? [];
    const time = open.some(s => s.time === picked) ? picked : (open[0]?.time ?? null);
    const groups = groupSlots(slots ?? []);
    const dayInfo = days.find(d => d.value === day) ?? days[0];

    return (
        <form
            onSubmit={e => { e.preventDefault(); if (time) onContinue({ date: day, time, partySize: people }); }}
            className="flex w-full min-w-0 flex-col gap-7 rounded-[20px] border border-[#DDD7CE] bg-white p-4 sm:p-8"
        >
            <div role="group" aria-label="Gün" className="-mx-1 overflow-x-auto px-1">
                <div className={cn('grid gap-1.5', days.length > 4 && 'min-w-[480px]')}
                    style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}>
                    {days.map(d => {
                        const on = d.value === day;
                        return (
                            <button key={d.value} type="button" aria-pressed={on} disabled={!d.open}
                                aria-label={d.open ? d.full : `${d.full}, rezervasyon alınmıyor`}
                                onClick={() => { if (!on) { setSlots(null); setDay(d.value); } }}
                                className={cn('flex min-h-[92px] flex-col items-center justify-center gap-1 rounded-[14px] border',
                                    !d.open ? 'cursor-not-allowed border-dashed border-[#CFC8BC] bg-transparent text-[#B8B1A6]'
                                        : on ? 'border-[#141414] bg-[#141414] text-white' : 'border-[#E6E1D9] bg-white text-[#141414]')}>
                                <span className="text-[11px] font-medium uppercase tracking-[0.12em] opacity-75">{d.top}</span>
                                <span className={cn(serif, 'text-[30px] leading-none')}>{d.num}</span>
                                <span className="text-[11px] opacity-70">{d.month}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="flex items-center justify-between gap-4 border-y border-[#ECE7DF] py-3.5">
                <span id="rez-kisi" className="font-medium">Kaç kişisiniz?</span>
                <span role="group" aria-labelledby="rez-kisi" className="flex items-center gap-1.5">
                    <button type="button" aria-label="Kişi azalt" disabled={people <= 1} onClick={() => setPeople(p => Math.max(1, p - 1))} className={roundButton}>−</button>
                    <span aria-live="polite" className={cn(serif, 'min-w-20 text-center text-[28px]')}>{people} kişi</span>
                    <button type="button" aria-label="Kişi artır" disabled={people >= maxParty} onClick={() => setPeople(p => Math.min(maxParty, p + 1))} className={roundButton}>+</button>
                </span>
            </div>

            <div role="group" aria-label="Saat" aria-busy={slots === null} className="flex flex-col gap-[18px]">
                {slots === null ? (
                    <div className="grid grid-cols-4 gap-1.5" aria-hidden="true">
                        {Array.from({ length: 8 }, (_, i) => <span key={i} className="min-h-16 animate-pulse rounded-xl bg-[#F1EDE6]" />)}
                    </div>
                ) : groups.length === 0 || open.length === 0 ? (
                    <p className="m-0 text-[#6F6A63]">
                        {dayInfo.open ? 'Bu gün için uygun saat yok. Başka bir gün seçin.' : 'Bu gün rezervasyon alınmıyor. Başka bir gün seçin.'}
                    </p>
                ) : groups.map(g => (
                    <div key={g.name} className="grid grid-cols-1 items-start gap-2 sm:grid-cols-[96px_minmax(0,1fr)] sm:gap-4">
                        <span className="text-xs font-medium uppercase tracking-[0.18em] text-[#6F6A63] sm:pt-4">{g.name}</span>
                        <div className="grid grid-cols-4 gap-1.5">
                            {g.slots.map(s => {
                                const on = s.time === time;
                                return (
                                    <button key={s.time} type="button" disabled={s.full} aria-pressed={on} onClick={() => setPicked(s.time)}
                                        className={cn('flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl border',
                                            s.full ? 'cursor-not-allowed border-dashed border-[#CFC8BC] bg-transparent text-[#B8B1A6] line-through'
                                                : on ? 'border-[var(--site-accent)] bg-[var(--site-accent)] text-[var(--site-on-accent)]'
                                                    : 'border-[#DDD7CE] bg-white text-[#141414]')}>
                                        <span className={cn(serif, 'text-[22px] leading-none sm:text-2xl')}>{s.time}</span>
                                        <span className="text-[11px] opacity-75">{s.full ? 'dolu' : 'müsait'}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>

            <button
                type="submit"
                disabled={!time}
                className="min-h-[60px] rounded-full bg-[var(--site-accent)] px-6 text-base font-semibold text-[var(--site-on-accent)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45"
            >
                Devam et{time && ` · ${dayInfo.top} ${time} · ${people} kişi`}
            </button>
        </form>
    );
}
