import type { CSSProperties, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { canReserveOnline, type PublicSite } from '@/features/customerSite/types';
import { cn } from '@/lib/utils';
import { RESERVATION_PATH, reservationHref } from '../../siteParts';
import { telHref } from '../../siteTheme';
import { EditableBlock } from '../../siteEdit';
import { useSiteEdit } from '../../siteEditContext';
import { bhButton, bhTitle, morningLine, upcomingWeekend, weekendLine, type DishKind } from './bahceParts';

// Bahçe Kahvaltısı'nın küçük parçaları: güneş işareti, yaprak, "sabahtan açık" çipi, çizimli tabaklar (fotoğraf yokken
// sofrayı dolduran yumurta, domates, zeytin, peynir, bal, ekmek, çay), bölüm başlığı ve hafta sonu "Sofranızı ayırtın"
// kartı. Bütün renkler --site-* değişkenlerinden.

/** Güneş işareti (üst menüde adın yanında, alt bilgide): tereyağı daire ve kısa ışınlar. */
export function SunMark({ className }: { className?: string }) {
    return (
        <svg aria-hidden="true" viewBox="0 0 40 40" className={cn('shrink-0', className)}>
            <g stroke="var(--site-mustard)" strokeWidth="3" strokeLinecap="round">
                {[0, 45, 90, 135, 180, 225, 270, 315].map(a => (
                    <line key={a} x1="20" y1="3.5" x2="20" y2="7.5" transform={`rotate(${a} 20 20)`} />
                ))}
            </g>
            <circle cx="20" cy="20" r="9.5" fill="var(--site-mustard)" />
            <circle cx="20" cy="20" r="9.5" fill="none" stroke="var(--site-text)" strokeOpacity="0.12" strokeWidth="1" />
        </svg>
    );
}

/** Yaprak dalı (süs): zeytin yeşili iki üç yaprak. */
export function Sprig({ className, style }: { className?: string; style?: CSSProperties }) {
    return (
        <svg aria-hidden="true" viewBox="0 0 120 60" className={cn('pointer-events-none', className)} style={style} fill="none">
            <path d="M4 52 C 40 46, 76 30, 116 6" stroke="var(--site-olive)" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M34 44c-2-12 6-22 18-24-1 12-8 21-18 24Z" fill="var(--site-olive)" />
            <path d="M58 34c4-11 15-16 26-13-5 10-15 15-26 13Z" fill="color-mix(in srgb, var(--site-olive) 72%, var(--site-mustard))" />
            <path d="M80 22c-1-10 6-17 16-18-1 10-7 16-16 18Z" fill="var(--site-olive)" />
            <path d="M20 50c6-8 16-10 24-6-6 7-16 9-24 6Z" fill="color-mix(in srgb, var(--site-olive) 60%, var(--site-card))" />
        </svg>
    );
}

/** "● Sabahtan açık 08:00 – 14:00" çipi, bugünün gerçek saatinden. `weekend`: hafta sonu farklıysa yanında tereyağı çip. Saat yoksa çizilmez. */
export function MorningChip({ site, className, tone = 'light', weekend = false }: {
    site: PublicSite; className?: string; tone?: 'light' | 'cover'; weekend?: boolean;
}) {
    const line = morningLine(site);
    const edit = useSiteEdit();
    if (!line) return edit?.showEmpty ? <EditableBlock target="hours" label="Çalışma saatleri"><span className="text-sm font-bold">+ Çalışma saatlerini ekle</span></EditableBlock> : null;
    const wk = weekend ? weekendLine(site) : null;
    const cover = tone === 'cover';
    return (
        <EditableBlock target="hours" label="Çalışma saatleri" className="rounded-full">
            <p className={cn('m-0 flex flex-wrap items-center gap-2', className)}>
                <span className={cn('inline-flex min-h-9 items-center gap-2 rounded-full px-3.5 text-sm',
                    cover ? 'bg-[color-mix(in_srgb,var(--site-on-cover)_14%,transparent)] text-[var(--site-on-cover)]' : 'border border-[var(--site-border)] bg-[var(--site-card)] text-[var(--site-text)]')}>
                    <span aria-hidden="true" className={cn('h-2 w-2 shrink-0 rounded-full',
                        line.open ? 'bg-[var(--site-ok)]' : line.open === false ? 'bg-[var(--site-error)]' : 'bg-[var(--site-mustard)]',
                        cover && line.open && 'bg-[var(--site-dot-ok)]', cover && line.open === false && 'bg-[var(--site-dot-bad)]')} />
                    <span className="font-semibold">{line.label}</span>
                    {line.hours && <span className="font-bold tabular-nums">{line.hours}</span>}
                </span>
                {wk && (
                    <span className="inline-flex min-h-9 items-center rounded-full bg-[var(--site-mustard)] px-3.5 text-sm font-bold text-[var(--site-text)]">{wk}</span>
                )}
            </p>
        </EditableBlock>
    );
}

// ── Çizimli tabaklar ───────────────────────────────────────────────────────────────────────────

/** Tabağın içindeki çizim (viewBox 100): yemek renkleri vurgu, tereyağı, zeytin ve kart renginden. */
function DishArt({ kind }: { kind: DishKind }) {
    switch (kind) {
        case 'egg':
            return (
                <g>
                    <path d="M28 50c-4-14 8-24 20-22 8-8 26-4 26 10 10 6 6 24-6 26-6 10-26 10-32 0-12 0-14-10-8-14Z" fill="var(--site-card)" stroke="var(--site-border-mid)" strokeWidth="1" />
                    <circle cx="44" cy="48" r="9" fill="var(--site-mustard)" />
                    <circle cx="62" cy="56" r="8" fill="color-mix(in srgb, var(--site-mustard) 80%, var(--site-accent))" />
                    <circle cx="41" cy="45" r="2.4" fill="var(--site-card)" opacity="0.7" />
                </g>
            );
        case 'tomato':
            return (
                <g>
                    {[[38, 40], [62, 42], [50, 62]].map(([x, y], i) => (
                        <g key={i}>
                            <circle cx={x} cy={y} r="15" fill="var(--site-accent)" />
                            <circle cx={x} cy={y} r="10.5" fill="color-mix(in srgb, var(--site-accent) 62%, var(--site-card))" />
                            {[0, 72, 144, 216, 288].map(a => (
                                <ellipse key={a} cx={x} cy={y - 5.5} rx="1.6" ry="2.8" fill="color-mix(in srgb, var(--site-mustard) 70%, var(--site-card))" transform={`rotate(${a} ${x} ${y})`} />
                            ))}
                        </g>
                    ))}
                    <path d="M70 66c6-2 10 2 10 6" stroke="var(--site-olive)" strokeWidth="3" strokeLinecap="round" fill="none" />
                </g>
            );
        case 'olive':
            return (
                <g>
                    {[[36, 40, -20], [52, 36, 10], [66, 46, 30], [42, 58, 40], [58, 62, -10], [72, 64, 20]].map(([x, y, r], i) => (
                        <g key={i} transform={`rotate(${r} ${x} ${y})`}>
                            <ellipse cx={x} cy={y} rx="8" ry="5.8" fill={i % 3 === 1 ? 'var(--site-text)' : 'var(--site-olive)'} />
                            <ellipse cx={x - 2.5} cy={y - 1.8} rx="2" ry="1.2" fill="var(--site-card)" opacity="0.45" />
                        </g>
                    ))}
                </g>
            );
        case 'cheese':
            return (
                <g>
                    <path d="M24 60 L60 28 L78 62 Z" fill="color-mix(in srgb, var(--site-mustard) 45%, var(--site-card))" stroke="color-mix(in srgb, var(--site-mustard) 70%, var(--site-text))" strokeOpacity="0.35" strokeWidth="1.2" strokeLinejoin="round" />
                    <rect x="30" y="64" width="40" height="12" rx="3" fill="var(--site-card)" stroke="var(--site-border-mid)" strokeWidth="1" />
                    <circle cx="56" cy="50" r="3.5" fill="color-mix(in srgb, var(--site-mustard) 25%, var(--site-card))" />
                    <circle cx="46" cy="56" r="2.5" fill="color-mix(in srgb, var(--site-mustard) 25%, var(--site-card))" />
                    <circle cx="64" cy="57" r="2" fill="color-mix(in srgb, var(--site-mustard) 25%, var(--site-card))" />
                </g>
            );
        case 'honey':
            return (
                <g>
                    <circle cx="50" cy="50" r="24" fill="var(--site-card)" stroke="var(--site-border-mid)" strokeWidth="1" />
                    <circle cx="50" cy="50" r="18" fill="color-mix(in srgb, var(--site-mustard) 78%, var(--site-accent))" />
                    <path d="M38 46c6-6 18-6 24 0" stroke="var(--site-mustard)" strokeWidth="3" strokeLinecap="round" fill="none" />
                    <circle cx="43" cy="43" r="3" fill="var(--site-card)" opacity="0.5" />
                </g>
            );
        case 'bread':
            return (
                <g>
                    {[[34, 44, -14], [58, 40, 8], [46, 62, 24]].map(([x, y, r], i) => (
                        <g key={i} transform={`rotate(${r} ${x} ${y})`}>
                            <rect x={x - 14} y={y - 10} width="28" height="20" rx="9" fill="color-mix(in srgb, var(--site-mustard) 55%, var(--site-accent))" />
                            <rect x={x - 10} y={y - 6} width="20" height="12" rx="6" fill="color-mix(in srgb, var(--site-mustard) 40%, var(--site-card))" />
                        </g>
                    ))}
                </g>
            );
        case 'tea':
            return (
                <g>
                    <circle cx="50" cy="50" r="30" fill="color-mix(in srgb, var(--site-accent) 70%, var(--site-text))" />
                    <circle cx="50" cy="50" r="30" fill="none" stroke="var(--site-card)" strokeOpacity="0.55" strokeWidth="4" />
                    <ellipse cx="40" cy="40" rx="8" ry="5" fill="var(--site-card)" opacity="0.28" transform="rotate(-30 40 40)" />
                </g>
            );
    }
}

/** Çizimli tabak: kart renginde tabak, iç kuyusu ara bant rengi, içinde çizim. Kenarı ve gölgesi `rb-bh-plate`. */
export function DrawnPlate({ kind, className }: { kind: DishKind; className?: string }) {
    const tea = kind === 'tea';
    return (
        <span aria-hidden="true" className={cn('rb-bh-plate block aspect-square rounded-full', tea && 'rb-bh-saucer', className)}>
            <svg viewBox="0 0 100 100" className="block h-full w-full">
                {!tea && <circle cx="50" cy="50" r="40" fill="var(--site-alt)" />}
                <DishArt kind={kind} />
            </svg>
        </span>
    );
}

/** Bölüm başlığı: solda küçük güneş, başlık; isteğe bağlı açıklama ve sağda bağlantı. */
export function BhHeading({ id, title, note, aside, className, center = false }: {
    id: string; title: ReactNode; note?: ReactNode; aside?: ReactNode; className?: string; center?: boolean;
}) {
    return (
        <div className={cn('flex flex-col gap-4', center ? 'items-center text-center' : 'sm:flex-row sm:items-end sm:justify-between', className)}>
            <div className={cn('flex min-w-0 flex-col gap-3', center && 'items-center')}>
                <h2 id={id} className={cn(bhTitle, 'text-balance')}>{title}</h2>
                {note && <p className="m-0 max-w-[54ch] text-base leading-relaxed text-[var(--site-sub)] sm:text-[17px]">{note}</p>}
            </div>
            {aside && <div className="shrink-0">{aside}</div>}
        </div>
    );
}

/**
 * Hafta sonu "Sofranızı ayırtın" kartı: tereyağı zeminde davet; rezervasyon açıksa yaklaşan Cumartesi/Pazar'ın gerçek
 * başlangıç saatleri (seçilince akış o gün ve saatle açılır) ve "Masa ayırt"; yalnız telefon varsa "Ara". Düzenleyicide
 * ya da ikisi de yoksa çizilmez.
 */
export function WeekendCard({ site, title = 'Hafta sonu sofranız hazır olsun.' }: { site: PublicSite; title?: string }) {
    const edit = useSiteEdit();
    const canReserve = canReserveOnline(site);
    if (edit || (!canReserve && !site.phone)) return null;
    const weekend = canReserve ? upcomingWeekend(site, new Date(), 4) : [];
    return (
        <section aria-labelledby="bh-davet" className="px-3 pb-16 pt-4 sm:px-5 sm:pb-24">
            <div className="rb-bh-sunny relative mx-auto max-w-[1200px] overflow-hidden rounded-[40px] bg-[var(--site-mustard)] px-5 py-12 text-[var(--site-text)] sm:px-12 sm:py-16">
                <Sprig className="absolute -right-4 top-4 w-[150px] rotate-[8deg] opacity-90 sm:w-[210px]" />
                <div className="relative flex max-w-[640px] flex-col gap-5">
                    <h2 id="bh-davet" className={cn(bhTitle, 'text-balance')}>{title}</h2>
                    <p className="m-0 max-w-[46ch] text-base leading-relaxed text-[var(--site-text)] sm:text-[17px]">
                        {canReserve ? 'Gününüzü, saatinizi ve kaç kişi olacağınızı seçin; onaylanınca masanız sizi bekler.' : 'Masa ayırtmak için arayın; size uygun saati birlikte bulun.'}
                    </p>
                    {weekend.length > 0 && (
                        <div className="flex flex-col gap-3">
                            {weekend.map(day => (
                                <div key={day.date} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                                    <span className="min-w-[150px] text-[15px] font-bold">{day.label}</span>
                                    <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
                                        {day.times.map(t => (
                                            <li key={t}>
                                                <Link to={reservationHref({ date: day.date, time: t, partySize: 2 })}
                                                    aria-label={`${day.label}, ${t} için masa ayırt`}
                                                    className="inline-flex min-h-11 items-center rounded-full bg-[var(--site-card)] px-4 text-[15px] font-bold tabular-nums text-[var(--site-text)] no-underline shadow-[0_1px_0_color-mix(in_srgb,var(--site-text)_18%,transparent)] transition-colors hover:bg-[var(--site-text)] hover:text-[var(--site-card)]">
                                                    {t}
                                                </Link>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    )}
                    <div className="mt-1 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
                        {canReserve && <Link to={RESERVATION_PATH} className={bhButton.accent}>Masa ayırt</Link>}
                        {site.phone && <a href={telHref(site.phone)} className={bhButton.soft}>Ara: {site.phone}</a>}
                    </div>
                </div>
            </div>
        </section>
    );
}
