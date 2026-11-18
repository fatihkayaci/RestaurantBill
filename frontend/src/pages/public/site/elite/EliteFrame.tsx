import { useEffect, useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { canReserveOnline, type PublicSite } from '@/features/customerSite/types';
import { useOnlineOrdering, useOnlineOrderingAvailable } from '@/features/delivery/useOnlineOrderingAvailable';
import { lastOrderTrackingPath, useSiteCart } from '@/features/delivery/useSiteCart';
import { RESERVATION_LOOKUP_PATH } from '@/features/customerSite/reservationCode';
import { cn } from '@/lib/utils';
import { RESERVATION_PATH, instagramHandle, siteNav, untilTime, type SitePageKey } from '../siteParts';
import { directionsUrl, telHref, whatsappHref, wordmarkParts } from '../siteTheme';
import { fullAddress, restaurantName, weekSchedule } from '../useSite';
import { editExternal, useSiteEdit, useSiteWindow } from '../siteEditContext';
import { useScrolled } from '../useScrolled';
import { elButton, elLabel, elSerif } from './eliteParts';

// Elit üst menü ve alt bilgi (tasarım: EliteHeader, EliteFooter). Üst menü koyu zeminde açık yazılıdır: fotoğraflı kapağı
// olan sayfalarda kapağın üstünde saydam (`overlay`), diğer sayfalarda (akış sayfaları) koyu espresso şerit. Yapışkan
// (`sticky`) üst menü kaydırınca üstte kalır; kapak üstündeyken sayfa kaydırılınca koyu zemin alır.

function timeOfDay(iso: string): string {
    return new Date(iso).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

/** Ad: ilk kelime büyük aralıklı serif, kalanı (yoksa semt) altında küçük altın satır. */
function Wordmark({ site, big = false }: { site: PublicSite; big?: boolean }) {
    const { first, rest } = wordmarkParts(restaurantName(site));
    const second = rest || site.district || site.city;
    return (
        <>
            <span className={cn(elSerif, 'block max-w-full truncate uppercase leading-none',
                big ? 'text-[30px] tracking-[0.24em] sm:text-[40px] sm:tracking-[0.3em]' : 'text-[19px] tracking-[0.2em] sm:text-[24px] sm:tracking-[0.3em]')}>{first}</span>
            {second && (
                <span className={cn('block max-w-full truncate uppercase text-[var(--site-accent-on-dark)]',
                    big ? 'text-[11px] tracking-[0.5em]' : 'text-[10px] tracking-[0.42em] sm:tracking-[0.5em]')}>{second}</span>
            )}
        </>
    );
}

export function EliteHeader({ site, current, overlay, sticky }: { site: PublicSite; current: SitePageKey; overlay: boolean; sticky: boolean }) {
    const win = useSiteWindow();
    const edit = useSiteEdit();
    const nameX = editExternal(edit, 'restaurant');
    const reserveX = editExternal(edit, 'reservation');
    const orderX = editExternal(edit, 'online');
    const [open, setOpen] = useState(false);
    const panelId = useId();
    const nav = siteNav(site);
    const canReserve = canReserveOnline(site);
    const cart = useSiteCart();
    const canOrder = cart.enabled;
    const [trackPath] = useState(lastOrderTrackingPath);
    // Kapak üstünde saydam başlık yapışıksa: kaydırınca (ya da telefon menüsü açıkken) koyu zemin.
    const scrolled = useScrolled(overlay && sticky);
    const solid = !overlay || scrolled || open;

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
        win.addEventListener('keydown', onKey);
        return () => win.removeEventListener('keydown', onKey);
    }, [open, win]);

    const close = () => setOpen(false);
    const toTop = () => { if (current === 'home') win.scrollTo({ top: 0, behavior: 'smooth' }); };
    const navLink = (on: boolean) => cn('inline-flex min-h-11 items-center whitespace-nowrap border-b pb-0.5 pt-1.5 text-xs font-normal uppercase tracking-[0.24em] text-[var(--site-on-paper)] no-underline transition-colors',
        on ? 'border-[var(--site-accent-on-dark)]' : 'border-transparent hover:border-[color-mix(in_srgb,var(--site-on-paper)_40%,transparent)]');
    const menuLink = 'flex min-h-12 items-center border-b border-[color-mix(in_srgb,var(--site-accent-on-dark)_18%,transparent)] text-sm uppercase tracking-[0.24em] text-[var(--site-on-paper)] no-underline';

    // Kapak üstündeki yapışkan başlık sıfır yükseklikli bir tutucuda durur: kapak yine en üstten başlar, başlık onun
    // üstüne biner ve kaydırınca ekranın üstünde kalır. Zemin ve çizgi içteki kutuda (tutucunun yüksekliği yok).
    const bar = (
        <div className={cn('text-[var(--site-on-paper)] transition-[background-color,border-color] duration-200',
            solid ? 'border-b border-[color-mix(in_srgb,var(--site-accent-on-dark)_30%,transparent)] bg-[var(--site-paper)]' : 'border-b border-transparent')}>
            <header className="mx-auto grid max-w-[1440px] grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 py-5 sm:px-8 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:px-14 lg:py-[30px]">
                <nav aria-label="Ana menü" className="hidden flex-wrap gap-x-8 gap-y-1 lg:flex">
                    {nav.map(item => (
                        <Link key={item.key} to={item.to} aria-current={current === item.key ? 'page' : undefined} className={navLink(current === item.key)}>{item.label}</Link>
                    ))}
                </nav>
                <Link to="/" onClick={toTop} {...nameX}
                    className={cn('flex min-h-11 min-w-0 flex-col items-start justify-center gap-1 text-[var(--site-on-paper)] no-underline lg:items-center lg:justify-self-center', nameX.className)}>
                    <Wordmark site={site} />
                </Link>
                <div className="flex shrink-0 items-center gap-2 justify-self-end sm:gap-4 lg:gap-[22px]">
                    {trackPath && (
                        <Link to={trackPath} className="hidden min-h-11 items-center text-xs uppercase tracking-[0.22em] text-[var(--site-on-paper)] no-underline hover:opacity-75 xl:inline-flex">Siparişim</Link>
                    )}
                    {canOrder && (
                        <Link to="/siparis" aria-label={`Sepet, ${cart.count} ürün`} aria-current={current === 'siparis' ? 'page' : undefined} {...orderX}
                            className={cn('inline-flex min-h-11 items-center gap-2.5 text-xs uppercase tracking-[0.22em] text-[var(--site-on-paper)] no-underline hover:opacity-75', orderX.className)}>
                            <span className="hidden sm:inline">Sepet</span>
                            <svg aria-hidden="true" className="sm:hidden" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M6 7h12l-1 13H7L6 7z" /><path d="M9 7a3 3 0 0 1 6 0" /></svg>
                            <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full border border-[var(--site-accent-on-dark)] px-1.5 text-[11px] tracking-normal tabular-nums text-[var(--site-accent-on-dark)]">{cart.count}</span>
                        </Link>
                    )}
                    {canReserve ? (
                        <Link to={RESERVATION_PATH} aria-current={current === 'rezervasyon' ? 'page' : undefined} {...reserveX}
                            className={cn('hidden h-[46px] items-center border border-[var(--site-accent-on-dark)] px-[22px] text-xs font-medium uppercase tracking-[0.24em] text-[var(--site-accent-on-dark)] no-underline transition-opacity hover:opacity-80 sm:inline-flex', reserveX.className)}>Rezervasyon</Link>
                    ) : canOrder && current !== 'siparis' && (
                        <Link to="/siparis" {...orderX}
                            className={cn('hidden h-[46px] items-center border border-[var(--site-accent-on-dark)] px-[22px] text-xs font-medium uppercase tracking-[0.24em] text-[var(--site-accent-on-dark)] no-underline transition-opacity hover:opacity-80 sm:inline-flex', orderX.className)}>Sipariş ver</Link>
                    )}
                    <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open} aria-controls={panelId}
                        aria-label={open ? 'Menüyü kapat' : 'Menüyü aç'}
                        className="flex h-11 w-11 shrink-0 items-center justify-center border border-[color-mix(in_srgb,var(--site-on-paper)_40%,transparent)] text-[var(--site-on-paper)] lg:hidden">
                        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
                            {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M3 8h18M3 16h18" />}
                        </svg>
                    </button>
                </div>
            </header>
            {open && (
                <nav id={panelId} aria-label="Sayfalar" className="border-t border-[color-mix(in_srgb,var(--site-accent-on-dark)_25%,transparent)] bg-[var(--site-paper)] lg:hidden">
                    <div className="mx-auto flex max-w-[640px] flex-col px-4 pb-6 pt-2 sm:px-8">
                        <Link to="/" onClick={close} aria-current={current === 'home' ? 'page' : undefined} className={menuLink}>Ana sayfa</Link>
                        {nav.map(item => (
                            <Link key={item.key} to={item.to} onClick={close} aria-current={current === item.key ? 'page' : undefined} className={menuLink}>{item.label}</Link>
                        ))}
                        {canOrder && <Link to="/siparis" onClick={close} aria-current={current === 'siparis' ? 'page' : undefined} className={menuLink}>Paket sipariş</Link>}
                        {trackPath && <Link to={trackPath} onClick={close} className={menuLink}>Siparişim</Link>}
                        {canReserve && <Link to={RESERVATION_LOOKUP_PATH} onClick={close} className={menuLink}>Rezervasyon sorgula</Link>}
                        {canReserve && <Link to={RESERVATION_PATH} onClick={close} className={cn(elButton.gold, 'mt-5')}>Rezervasyon</Link>}
                    </div>
                </nav>
            )}
        </div>
    );

    if (overlay) return <div className={cn('top-0 z-50', sticky ? 'sticky h-0' : 'absolute inset-x-0')}>{bar}</div>;
    return <div className={cn('top-0 z-50', sticky ? 'sticky' : 'relative')}>{bar}</div>;
}

// ── Alt bilgi ────────────────────────────────────────────────────────────────────────────────────

/** Süs harita (gerçek harita değil): koyu ızgara, iki yol ve altın iğne; tıklayınca Google Haritalar'da yol tarifi. */
function MapThumb({ href }: { href: string }) {
    return (
        <a href={href} target="_blank" rel="noopener noreferrer" aria-label="Haritada aç"
            className="relative block h-[150px] overflow-hidden border border-[color-mix(in_srgb,var(--site-accent-on-dark)_30%,transparent)] bg-[var(--site-footer-map)] bg-[linear-gradient(color-mix(in_srgb,var(--site-on-footer)_4%,transparent)_1px,transparent_1px),linear-gradient(90deg,color-mix(in_srgb,var(--site-on-footer)_4%,transparent)_1px,transparent_1px)] bg-[length:22px_22px] transition-opacity hover:opacity-85">
            <span aria-hidden="true" className="absolute -left-[10%] -right-[10%] top-[46%] h-[7px] -rotate-[9deg] bg-[var(--site-footer-road)]" />
            <span aria-hidden="true" className="absolute -bottom-[10%] -top-[10%] left-[60%] w-[5px] rotate-[14deg] bg-[var(--site-footer-road)]" />
            <span aria-hidden="true" className="absolute left-[46%] top-[42%] h-3 w-3 rounded-full bg-[var(--site-accent-on-dark)] shadow-[0_0_0_7px_color-mix(in_srgb,var(--site-accent-on-dark)_22%,transparent)]" />
        </a>
    );
}

/**
 * Elit alt bilgi: ortada ad, "bugün" şeridi (açık/kapalı, bugünün saatleri, paket siparişin son saati, Rezervasyon ·
 * Sipariş ver · Menü), ince altın çizgilerle dört sütun (adres · saatler · iletişim · sayfalar), en altta telif ve KVKK.
 * Verisi olmayan parça çizilmez. `visit={false}`: adres/saat/iletişim sütunları yok (İletişim sayfası).
 */
export function EliteFooter({ site, bottomBar, visit }: { site: PublicSite; bottomBar: boolean; visit: boolean }) {
    const edit = useSiteEdit();
    const fixedX = editExternal(edit, 'fixed');
    const ordering = useOnlineOrdering();
    const canOrder = useOnlineOrderingAvailable();
    const [trackPath] = useState(lastOrderTrackingPath);
    const name = restaurantName(site);
    const nav = siteNav(site);
    const canReserve = canReserveOnline(site);
    const content = site.site;
    const address = fullAddress(site);
    const rows = weekSchedule(site);
    const today = rows?.find(r => r.isToday) ?? null;
    const lastOrder = ordering?.state === 'open' && ordering.lastOrderAt ? timeOfDay(ordering.lastOrderAt) : null;
    const hasSocial = Boolean(content.whatsappPhone || content.instagramUrl);

    const todayText = [today ? `Bugün ${today.text}` : null, lastOrder ? `Paket sipariş ${untilTime(lastOrder)}` : null].filter(Boolean).join(' · ');
    const buttons = [
        canReserve && { key: 'rez', to: RESERVATION_PATH, label: 'Rezervasyon' },
        canOrder && { key: 'siparis', to: '/siparis', label: 'Sipariş ver' },
        { key: 'menu', to: '/menu', label: 'Menü' },
    ].filter((b): b is { key: string; to: string; label: string } => Boolean(b)).slice(0, 2);
    const showToday = site.isOpenNow !== null || Boolean(todayText);
    const showAddress = visit && Boolean(address);
    const showHours = visit && rows !== null;
    const showContact = visit && (Boolean(site.phone) || hasSocial);
    const cols = [showAddress, showHours, showContact].filter(Boolean).length + 1;

    const label = cn(elLabel, 'm-0 text-[11px] tracking-[0.34em] text-[var(--site-accent-on-dark)]');
    const muted = 'text-[var(--site-footer-muted)]';
    const col = 'flex min-w-0 flex-col gap-4 border-[color-mix(in_srgb,var(--site-accent-on-dark)_25%,transparent)] py-8 first:pt-0 md:py-0 lg:px-9 lg:first:pl-0 lg:last:pr-0';
    const underline = 'inline-flex min-h-11 items-center border-b border-[var(--site-accent-on-dark)] text-[11px] uppercase tracking-[0.26em] text-[var(--site-on-footer)] no-underline hover:opacity-75';
    const pageLink = 'inline-flex min-h-11 items-center self-start text-xs uppercase tracking-[0.22em] text-[var(--site-on-footer)] no-underline hover:opacity-75';

    return (
        <footer className={cn('mt-auto border-t border-[var(--site-accent-on-dark)] bg-[var(--site-footer-bg)] text-[var(--site-on-footer)]',
            bottomBar && 'pb-[calc(76px+env(safe-area-inset-bottom))] md:pb-0')}>
            <div className="mx-auto flex max-w-[1280px] flex-col gap-12 px-4 pt-20 sm:px-10 md:gap-14 md:pt-24">
                <div className="flex flex-col items-center gap-2 text-center">
                    <Wordmark site={site} big />
                </div>

                {showToday && (
                    <div className="flex flex-wrap items-center justify-between gap-4 border-y border-[color-mix(in_srgb,var(--site-accent-on-dark)_35%,transparent)] py-[22px]">
                        <div className="flex flex-wrap items-center gap-x-[26px] gap-y-2.5 text-xs uppercase tracking-[0.2em]">
                            {site.isOpenNow !== null && (
                                <span className="inline-flex items-center gap-2.5 font-medium">
                                    <span aria-hidden="true" className={cn('h-1.5 w-1.5 rounded-full', site.isOpenNow ? 'bg-[var(--site-dot-ok)]' : 'bg-[var(--site-dot-bad)]')} />
                                    {site.isOpenNow ? 'Şu an açık' : 'Şu an kapalı'}
                                </span>
                            )}
                            {todayText && <span className={muted}>{todayText}</span>}
                        </div>
                        <div className="flex flex-wrap gap-3">
                            {buttons.map((b, i) => (
                                <Link key={b.key} to={b.to} className={cn(i === 0 ? elButton.gold : elButton.ghost, 'min-h-12 px-7 text-[11px] tracking-[0.28em] md:min-h-12')}>{b.label}</Link>
                            ))}
                        </div>
                    </div>
                )}

                <div className={cn('grid grid-cols-1 divide-y divide-[color-mix(in_srgb,var(--site-accent-on-dark)_20%,transparent)] md:grid-cols-2 md:gap-x-10 md:gap-y-12 md:divide-y-0 lg:gap-x-0 lg:[&>*+*]:border-l',
                    ({ 1: 'md:grid-cols-1 lg:grid-cols-1', 2: 'lg:grid-cols-2', 3: 'lg:grid-cols-3', 4: 'lg:grid-cols-4' } as Record<number, string>)[cols])}>
                    {showAddress && (
                        <div className={col}>
                            <h2 className={label}>Adres</h2>
                            <MapThumb href={directionsUrl(address)} />
                            <p className={cn(elSerif, 'm-0 break-words text-[21px] leading-[1.4]')}>
                                {site.openAddress || address}
                                {site.openAddress && (site.district || site.city) && <><br />{[site.district, site.city].filter(Boolean).join(', ')}</>}
                            </p>
                            {content.directionsNote && <p className={cn('m-0 text-sm leading-relaxed', muted)}>{content.directionsNote}</p>}
                            <a href={directionsUrl(address)} target="_blank" rel="noopener noreferrer" className={cn('inline-flex min-h-11 items-center self-start text-[11px] uppercase tracking-[0.28em] no-underline hover:opacity-75', muted)}>Yol tarifi →</a>
                        </div>
                    )}
                    {showHours && rows && (
                        <div className={col}>
                            <h2 className={label}>Saatler</h2>
                            <dl className="m-0 flex flex-col">
                                {rows.map(r => (
                                    <div key={r.day} className={cn('flex justify-between gap-4 border-b border-[color-mix(in_srgb,var(--site-accent-on-dark)_12%,transparent)] py-2 text-[13px] tracking-[0.04em]',
                                        r.isToday ? 'font-medium text-[var(--site-accent-on-dark)]' : muted)}>
                                        <dt>{r.label}{r.isToday && ' · bugün'}</dt>
                                        <dd className="m-0 tabular-nums">{r.text}</dd>
                                    </div>
                                ))}
                            </dl>
                            {content.hoursNote && <p className={cn('m-0 text-[13px] leading-relaxed', muted)}>{content.hoursNote}</p>}
                        </div>
                    )}
                    {showContact && (
                        <div className={col}>
                            <h2 className={label}>İletişim</h2>
                            {site.phone && <a href={telHref(site.phone)} className={cn(elSerif, 'inline-flex min-h-11 items-center self-start text-[28px] leading-[1.1] text-[var(--site-on-footer)] no-underline')}>{site.phone}</a>}
                            {hasSocial && (
                                <div className="flex flex-wrap gap-x-[22px] gap-y-1">
                                    {content.whatsappPhone && <a href={whatsappHref(content.whatsappPhone)} target="_blank" rel="noopener noreferrer" className={underline}>WhatsApp</a>}
                                    {content.instagramUrl && <a href={content.instagramUrl} target="_blank" rel="noopener noreferrer" aria-label={`Instagram: ${instagramHandle(content.instagramUrl)}`} className={underline}>Instagram</a>}
                                </div>
                            )}
                        </div>
                    )}
                    <nav aria-label="Alt menü" className={cn(col, 'gap-1')}>
                        <h2 className={cn(label, 'mb-2')}>Sayfalar</h2>
                        {nav.map(item => <Link key={item.key} to={item.to} className={pageLink}>{item.label}</Link>)}
                        {canOrder && <Link to="/siparis" className={pageLink}>Paket sipariş</Link>}
                        {trackPath && <Link to={trackPath} className={pageLink}>Siparişim</Link>}
                        {canReserve && <Link to={RESERVATION_PATH} className={pageLink}>Rezervasyon</Link>}
                        {canReserve && <Link to={RESERVATION_LOOKUP_PATH} className={pageLink}>Rezervasyon sorgula</Link>}
                    </nav>
                </div>
            </div>

            <div className="mx-auto mt-16 flex max-w-[1280px] flex-wrap justify-between gap-x-6 border-t border-[color-mix(in_srgb,var(--site-on-footer)_10%,transparent)] px-4 pb-4 pt-3 text-[11px] uppercase tracking-[0.22em] text-[var(--site-footer-muted)] sm:px-10">
                <span {...fixedX} className={cn('inline-flex min-h-11 items-center', fixedX.className)}>© {new Date().getFullYear()} {name} ·&nbsp;<span className="text-[var(--site-on-footer)]">Sophram</span>&nbsp;ile hazırlandı</span>
                <div className="flex flex-wrap gap-x-6">
                    <Link to="/gizlilik-politikasi" {...fixedX} className={cn('inline-flex min-h-11 min-w-11 items-center justify-center text-[var(--site-footer-muted)] no-underline hover:text-[var(--site-on-footer)]', fixedX.className)}>KVKK</Link>
                    <Link to="/login" {...fixedX} className={cn('inline-flex min-h-11 items-center text-[var(--site-footer-muted)] no-underline hover:text-[var(--site-on-footer)]', fixedX.className)}>Personel girişi</Link>
                </div>
            </div>
        </footer>
    );
}
