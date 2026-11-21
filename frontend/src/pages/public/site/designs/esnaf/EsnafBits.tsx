import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { canReserveOnline, type PublicSite } from '@/features/customerSite/types';
import { useSiteCart } from '@/features/delivery/useSiteCart';
import { cn } from '@/lib/utils';
import { RESERVATION_PATH, serif, sinceYear } from '../../siteParts';
import { formatSitePrice, telHref } from '../../siteTheme';
import { EditableBlock } from '../../siteEdit';
import { useSiteEdit } from '../../siteEditContext';
import { esButton, esTitle, esWrap, todayHours } from './esnafParts';

// Esnaf Tabelası'nın küçük parçaları: çini şerit (tasarımın imzası), tabela plakası, "Şu an açık" satırı, bölüm
// başlığı, pano satırı ve "Buyurun" bandı.

/** Çini şerit: menü kutusu renginde kafes ve sarı benekler (tezgâh önü çinisi). Süs. */
export function TileStrip({ className }: { className?: string }) {
    return <span aria-hidden="true" className={cn('rb-es-tiles block h-4 w-full sm:h-5', className)} />;
}

/** "● Şu an açık 11:00 – 23:00": bugünün saati (tabelanın altı, alt bilgi). Saat girilmemişse çizilmez. */
export function OpenLine({ site, className, dotClassName }: { site: PublicSite; className?: string; dotClassName?: string }) {
    const line = todayHours(site);
    const edit = useSiteEdit();
    if (!line) return edit?.showEmpty ? <EditableBlock target="hours" label="Çalışma saatleri"><p className={cn('m-0 font-bold', className)}>+ Çalışma saatlerini ekle</p></EditableBlock> : null;
    return (
        <EditableBlock target="hours" label="Çalışma saatleri">
            <p className={cn('m-0 inline-flex flex-wrap items-center gap-x-2.5 gap-y-0.5', className)}>
                <span aria-hidden="true" className={cn('h-2.5 w-2.5 shrink-0 rounded-full', line.open ? 'bg-[var(--site-dot-ok)]' : line.open === false ? 'bg-[var(--site-dot-bad)]' : 'bg-[var(--site-pop)]', dotClassName)} />
                <span className="font-extrabold uppercase tracking-[0.04em]">{line.label}</span>
                {line.hours && <span className="font-bold tabular-nums">{line.hours}</span>}
            </p>
        </EditableBlock>
    );
}

/** Bölüm başlığı: solda dev büyük harf başlık, altında kalın çizgi; sağda isteğe bağlı bağlantı ya da not. */
export function EsHeading({ id, title, note, aside, className }: { id: string; title: ReactNode; note?: ReactNode; aside?: ReactNode; className?: string }) {
    return (
        <div className={cn('flex flex-col gap-3 border-b-[6px] border-[var(--site-text)] pb-4 sm:flex-row sm:items-end sm:justify-between sm:gap-8', className)}>
            <div className="flex min-w-0 flex-col gap-2">
                <h2 id={id} className={esTitle}>{title}</h2>
                {note && <p className="m-0 max-w-[56ch] text-base leading-relaxed text-[var(--site-sub)]">{note}</p>}
            </div>
            {aside && <div className="shrink-0">{aside}</div>}
        </div>
    );
}

/** Pano satırının artı düğmesi (ya da sepetteki adet). */
export function AddSquare({ name, quantity, onAdd, tone = 'paper' }: { name: string; quantity: number; onAdd: () => void; tone?: 'paper' | 'board' }) {
    const idle = tone === 'board' ? 'bg-[var(--site-pop)] text-[var(--site-on-pop)] hover:brightness-105' : 'bg-[var(--site-text)] text-[var(--site-bg)] hover:brightness-125';
    const inCart = tone === 'board' ? 'bg-[var(--site-on-menu-box)] text-[var(--site-menu-box)]' : 'bg-[var(--site-accent)] text-[var(--site-on-accent)]';
    return (
        <button type="button" onClick={onAdd}
            aria-label={quantity > 0 ? `${name} sepete bir tane daha ekle (sepette ${quantity})` : `${name} sepete ekle`}
            className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-[15px] font-extrabold tabular-nums transition-[filter,transform] active:translate-y-px',
                quantity > 0 ? inCart : idle)}>
            {quantity > 0 ? quantity : <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>}
        </button>
    );
}

/**
 * Fiyat panosunun satırı: büyük harf ad, sağa dayalı büyük fiyat, altında kısa açıklama; sipariş açıksa artı düğmesi.
 * `tone="board"`: koyu panoda (menü kutusu) krem yazı ve sarı fiyat; varsayılan krem/beyaz panoda mürekkep ve vurgu.
 */
export function PriceRow({ name, price, description, soldOut, featured, tone = 'paper', action }: {
    name: string; price: number; description?: string; soldOut?: boolean; featured?: boolean; tone?: 'paper' | 'board'; action?: ReactNode;
}) {
    const board = tone === 'board';
    return (
        <div className={cn('flex items-center gap-3 py-3', board ? 'border-b-2 border-dashed border-[color-mix(in_srgb,var(--site-on-menu-box)_30%,transparent)]' : 'border-b-2 border-[var(--site-border-strong)]')}>
            <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-3">
                    <span className={cn(serif, 'min-w-0 flex-1 text-[21px] leading-[1.05] sm:text-[23px]', soldOut && (board ? 'opacity-60' : 'text-[var(--site-sub)]'))}>{name}</span>
                    <span className={cn(serif, 'shrink-0 whitespace-nowrap text-[26px] leading-none tabular-nums sm:text-[30px]',
                        soldOut ? 'line-through decoration-2 opacity-60' : board ? 'text-[var(--site-pop)]' : 'text-[var(--site-accent-text)]')}>{formatSitePrice(price)}</span>
                </div>
                {(description || soldOut || featured) && (
                    <p className={cn('m-0 mt-1 line-clamp-2 text-sm leading-snug', board ? 'text-[var(--site-on-menu-box-sub)]' : 'text-[var(--site-sub)]')}>
                        {soldOut ? <span className="font-bold">Bugünlük bitti</span> : (
                            <>
                                {featured && <span className={cn('mr-2 font-extrabold uppercase tracking-[0.04em]', board ? 'text-[var(--site-pop)]' : 'text-[var(--site-accent-text)]')}><span aria-hidden="true">★ </span>Ustanın seçimi</span>}
                                {description}
                            </>
                        )}
                    </p>
                )}
            </div>
            {action}
        </div>
    );
}

/**
 * "Buyurun" bandı: tabela renginde bant, üstte ve altta çini şerit; ortada davet, dev telefon numarası ve düğmeler
 * (sipariş açıksa "Sipariş ver", rezervasyon açıksa "Masa ayırt"). Telefon da düğme de yoksa ya da düzenleyicide çizilmez.
 */
export function CallBand({ site, title = 'Buyurun' }: { site: PublicSite; title?: string }) {
    const edit = useSiteEdit();
    const cart = useSiteCart();
    const canReserve = canReserveOnline(site);
    if (edit || (!site.phone && !cart.enabled && !canReserve)) return null;
    return (
        <section aria-labelledby="es-buyurun" className="mt-auto bg-[var(--site-hero-bg)] text-[var(--site-on-cover)]">
            <TileStrip />
            <div className={cn(esWrap, 'grid items-center gap-8 py-14 sm:py-20 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-16')}>
                <div className="flex min-w-0 flex-col gap-4">
                    <h2 id="es-buyurun" className={cn(serif, 'm-0 text-[64px] leading-[0.85] sm:text-[96px] lg:text-[128px]')}>{title}</h2>
                    {site.phone && (
                        <a href={telHref(site.phone)} className={cn(serif, 'inline-flex min-h-11 w-fit max-w-full items-center gap-3 break-all text-[34px] leading-none text-[var(--site-cover-accent)] no-underline tabular-nums decoration-[3px] underline-offset-8 hover:underline sm:text-[52px]')}>
                            <PhoneGlyph className="h-[0.8em] w-[0.8em] shrink-0" /><span className="sr-only">Ara: </span>{site.phone}
                        </a>
                    )}
                </div>
                <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
                    {cart.enabled && <Link to="/siparis" className={esButton.pop}>Sipariş ver</Link>}
                    {canReserve && <Link to={RESERVATION_PATH} className={cart.enabled ? esButton.onSign : esButton.pop}>Masa ayırt</Link>}
                    {site.phone && !cart.enabled && !canReserve && <a href={telHref(site.phone)} className={esButton.pop}>Hemen ara</a>}
                </div>
            </div>
            <TileStrip />
        </section>
    );
}

/** Tabeladaki telefon simgesi (eski ahize). */
export function PhoneGlyph({ className }: { className?: string }) {
    return (
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className={className}>
            <path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1z" />
        </svg>
    );
}

/** Kuruluş yılı mührü: çift çizgili yuvarlak, hafif eğik, tabela renginde ("KURULUŞ 1987 'DEN BERİ"). */
export function YearStamp({ year, className }: { year: number; className?: string }) {
    const rest = sinceYear(year).slice(String(year).length);
    return (
        <span className={cn('rb-es-stamp flex aspect-square w-[150px] shrink-0 flex-col items-center justify-center rounded-full text-center text-[var(--site-hero-bg)] sm:w-[180px]', className)}>
            <span className="text-[11px] font-extrabold uppercase tracking-[0.2em]">Kuruluş</span>
            <span className={cn(serif, 'text-[52px] leading-[0.9] sm:text-[64px]')}>{year}</span>
            <span className="text-xs font-extrabold uppercase tracking-[0.14em]">{rest}</span>
        </span>
    );
}
