import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { publicService } from '@/features/customerSite/api/publicService';
import { isReservationDayOpen, type DaySlot, type PublicSite } from '@/features/customerSite/types';
import { RESERVATION_LOOKUP_PATH } from '@/features/customerSite/reservationCode';
import { cn } from '@/lib/utils';
import { reservationHref } from '../siteParts';
import { telHref } from '../siteTheme';
import { elButton, elItalic, elLabel, elSerif } from './eliteParts';

// Ana sayfanın rezervasyon seçicisi (Elit): 7 günlük şerit (kapalı gün seçilemez, "en fazla kaç gün sonrası" aşılmaz),
// günün saatleri (sunucudan; dolu saat çizili), kişi sayısı (en çok online sınır) ve özet → rezervasyon sayfası bu
// seçimle açılır (asıl talep orada alınır).

const DAYS = 7;

function toDateInput(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export default function EliteReserve({ site }: { site: PublicSite }) {
    const rules = site.reservation;
    const navigate = useNavigate();
    const maxParty = Math.max(1, rules.maxPartySize);
    const [now] = useState(() => new Date());
    const days = useMemo(() => Array.from({ length: Math.min(DAYS, rules.maxDaysAhead + 1) }, (_, i) => {
        const date = new Date(now);
        date.setDate(now.getDate() + i);
        const value = toDateInput(date);
        return {
            value,
            top: i === 0 ? 'Bugün' : i === 1 ? 'Yarın' : date.toLocaleDateString('tr-TR', { weekday: 'short' }),
            num: String(date.getDate()),
            short: date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' }),
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
        publicService.getDaySlots(site.branchId, day)
            .then(result => { if (!cancelled) setSlots(result); })
            .catch(() => { if (!cancelled) setSlots([]); });
        return () => { cancelled = true; };
    }, [site.branchId, day]);

    const open = slots?.filter(s => !s.full) ?? [];
    const time = open.some(s => s.time === picked) ? picked : (open[0]?.time ?? null);
    const dayInfo = days.find(d => d.value === day) ?? days[0];
    const summary = time ? `${dayInfo.short}, ${time} · ${people} kişi` : `${dayInfo.short} · ${people} kişi`;
    const field = cn(elLabel, 'text-[11px] text-[var(--site-muted)]');

    return (
        <form className="flex min-w-0 flex-col gap-9"
            onSubmit={e => { e.preventDefault(); if (time) navigate(reservationHref({ date: day, time, partySize: people })); }}>
            <div className="flex flex-col gap-3.5">
                <span id="el-rez-gun" className={field}>Tarih</span>
                <div className="-mx-1 overflow-x-auto px-1 [scrollbar-width:none]">
                    <div role="group" aria-labelledby="el-rez-gun"
                        className={cn('grid border-y border-[color-mix(in_srgb,var(--site-text)_15%,transparent)]', days.length > 4 && 'min-w-[420px]')}
                        style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}>
                        {days.map(d => {
                            const on = d.value === day;
                            return (
                                <button key={d.value} type="button" aria-pressed={on} disabled={!d.open}
                                    aria-label={d.open ? d.full : `${d.full}, rezervasyon alınmıyor`}
                                    onClick={() => { if (!on) { setSlots(null); setDay(d.value); } }}
                                    className={cn('flex min-h-[84px] flex-col items-center justify-center gap-2 bg-transparent px-1 transition-colors',
                                        !d.open ? 'cursor-not-allowed text-[var(--site-disabled)] line-through'
                                            : on ? 'text-[var(--site-text)] shadow-[inset_0_-2px_0_var(--site-accent-text)]' : 'text-[var(--site-muted)] hover:text-[var(--site-text)]')}>
                                    <span className="text-[10px] font-medium uppercase tracking-[0.2em]">{d.top}</span>
                                    <span className={cn(elSerif, 'text-[28px] leading-none md:text-[30px]')}>{d.num}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className="flex flex-wrap gap-9">
                <div className="flex min-w-0 flex-[1_1_260px] flex-col gap-3.5">
                    <span id="el-rez-saat" className={field}>Saat</span>
                    <div role="group" aria-labelledby="el-rez-saat" aria-busy={slots === null} className="flex flex-wrap gap-2">
                        {slots === null ? (
                            Array.from({ length: 6 }, (_, i) => <span key={i} aria-hidden="true" className="h-[46px] w-[76px] animate-pulse bg-[color-mix(in_srgb,var(--site-text)_8%,transparent)]" />)
                        ) : open.length === 0 ? (
                            <p className="m-0 text-[15px] text-[var(--site-sub)]">
                                {dayInfo.open ? 'Bu gün için uygun saat yok. Başka bir gün seçin.' : 'Bu gün rezervasyon alınmıyor. Başka bir gün seçin.'}
                            </p>
                        ) : slots.map(s => {
                            const on = s.time === time;
                            return (
                                <button key={s.time} type="button" disabled={s.full} aria-pressed={on} onClick={() => setPicked(s.time)}
                                    aria-label={s.full ? `${s.time}, dolu` : s.time}
                                    className={cn('h-[46px] min-w-[72px] border px-4 text-sm tracking-[0.1em] tabular-nums transition-colors',
                                        s.full ? 'cursor-not-allowed border-dashed border-[var(--site-border-mid)] text-[var(--site-disabled)] line-through'
                                            : on ? 'border-[var(--site-paper)] bg-[var(--site-paper)] text-[var(--site-on-paper)]'
                                                : 'border-[color-mix(in_srgb,var(--site-text)_22%,transparent)] bg-transparent text-[var(--site-text)] hover:border-[var(--site-text)]')}>
                                    {s.time}
                                </button>
                            );
                        })}
                    </div>
                </div>
                <div className="flex min-w-[200px] flex-[0_1_220px] flex-col gap-3.5">
                    <span id="el-rez-kisi" className={field}>Misafir</span>
                    <div role="group" aria-labelledby="el-rez-kisi" className="flex h-[54px] items-center justify-between border-b border-[color-mix(in_srgb,var(--site-text)_35%,transparent)]">
                        <button type="button" aria-label="Kişi azalt" disabled={people <= 1} onClick={() => setPeople(p => Math.max(1, p - 1))}
                            className="h-11 w-11 bg-transparent text-2xl font-light text-[var(--site-text)] disabled:opacity-35">−</button>
                        <span aria-live="polite" className={cn(elSerif, 'text-[30px]')}>{people} <span className="font-[family-name:var(--site-sans)] text-[11px] uppercase not-italic tracking-[0.22em] text-[var(--site-muted)]">kişi</span></span>
                        <button type="button" aria-label="Kişi artır" disabled={people >= maxParty} onClick={() => setPeople(p => Math.min(maxParty, p + 1))}
                            className="h-11 w-11 bg-transparent text-2xl font-light text-[var(--site-text)] disabled:opacity-35">+</button>
                    </div>
                </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-[18px] border-t border-[color-mix(in_srgb,var(--site-text)_15%,transparent)] pt-[22px]">
                <span className={cn(elItalic, 'text-[22px] text-[var(--site-accent-text)]')}>{summary}</span>
                <button type="submit" disabled={!time} className={cn(elButton.dark, 'disabled:cursor-not-allowed disabled:opacity-45 md:min-h-[58px] md:px-10')}>Masayı ayırt</button>
            </div>
            <p className="m-0 text-xs tracking-[0.08em] text-[var(--site-muted)]">
                {site.phone && <>Telefonla: <a href={telHref(site.phone)} className="inline-flex min-h-11 items-center font-medium text-[var(--site-text)]">{site.phone}</a> · </>}
                <Link to={RESERVATION_LOOKUP_PATH} className="inline-flex min-h-11 items-center font-medium text-[var(--site-text)]">Rezervasyonumu sorgula</Link>
            </p>
        </form>
    );
}
