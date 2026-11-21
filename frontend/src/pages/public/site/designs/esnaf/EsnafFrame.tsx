import { useEffect, useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { canReserveOnline } from '@/features/customerSite/types';
import { RESERVATION_LOOKUP_PATH } from '@/features/customerSite/reservationCode';
import { useOnlineOrdering, useOnlineOrderingAvailable } from '@/features/delivery/useOnlineOrderingAvailable';
import { lastOrderTrackingPath, useSiteCart } from '@/features/delivery/useSiteCart';
import { cn } from '@/lib/utils';
import { RESERVATION_PATH, instagramHandle, sans, serif, siteNav, untilTime } from '../../siteParts';
import { directionsUrl, telHref, whatsappHref } from '../../siteTheme';
import { fullAddress, restaurantName, weekSchedule } from '../../useSite';
import { editExternal, useSiteEdit, useSiteWindow } from '../../siteEditContext';
import { useHideOnScroll } from '../../useScrolled';
import type { DesignFooterProps, DesignHeaderProps } from '../registry';
import { OpenLine, PhoneGlyph, TileStrip } from './EsnafBits';
import { esButton, esWrap } from './esnafParts';

// Esnaf Tabelası'nın çerçevesi.
// - Üst menü: dükkânın TABELASI. Kapak renginde bant, solda dev büyük harf ad (altında semt), sağda gerçek tabelalardaki
//   gibi büyük telefon numarası ve sarı "Sepet"; altında çini şerit, onun altında krem zeminde sayfalar (tabela plakası
//   gibi büyük harf), bugünün saati ve "Masa ayırt". Telefonda tabela + Sepet + menü düğmesi; menü açılınca sayfalar dev
//   büyük harfle alt alta ve büyük "Ara" düğmesi.
// - Alt bilgi: çinili TEZGÂH önü. Çini şerit, mürekkep zeminde ad ve adres, gün gün saat panosu (bugün sarı şeritte),
//   telefon ve bağlantılar; en altta "Yine bekleriz".

function timeOfDay(iso: string): string {
    return new Date(iso).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

/** Tabeladaki adın boyu: uzun ad küçülür, en uzunlar iki satıra kırılır. */
function headerNameClass(name: string): string {
    if (name.length <= 12) return 'text-[30px] sm:text-[40px] lg:text-[50px]';
    if (name.length <= 20) return 'text-[25px] sm:text-[32px] lg:text-[40px]';
    return 'text-[21px] sm:text-[26px] lg:text-[32px]';
}

export function EsnafHeader({ site, current, sticky }: DesignHeaderProps) {
    const win = useSiteWindow();
    const edit = useSiteEdit();
    const nameX = editExternal(edit, 'restaurant');
    const reserveX = editExternal(edit, 'reservation');
    const orderX = editExternal(edit, 'online');
    const [open, setOpen] = useState(false);
    const panelId = useId();
    const name = restaurantName(site);
    const nav = siteNav(site);
    const canReserve = canReserveOnline(site);
    const cart = useSiteCart();
    const canOrder = cart.enabled;
    const [trackPath] = useState(lastOrderTrackingPath);
    const hidden = useHideOnScroll(sticky) && !open;
    const place = [site.district, site.city].filter(Boolean).join(' / ');

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
        win.addEventListener('keydown', onKey);
        return () => win.removeEventListener('keydown', onKey);
    }, [open, win]);

    const close = () => setOpen(false);
    const toTop = () => { if (current === 'home') win.scrollTo({ top: 0, behavior: 'smooth' }); };
    const navLink = (on: boolean) => cn(serif, 'inline-flex min-h-[52px] items-center border-b-[5px] px-3 text-[19px] leading-none no-underline transition-colors',
        on ? 'border-[var(--site-hero-bg)] text-[var(--site-text)]' : 'border-transparent text-[var(--site-sub)] hover:border-[var(--site-border-strong)] hover:text-[var(--site-text)]');
    const panelLink = cn(serif, 'flex min-h-[60px] items-center justify-between gap-4 border-b-2 border-[var(--site-text)] text-[30px] leading-none text-[var(--site-text)] no-underline');

    return (
        <div className={cn(sans, sticky ? 'sticky' : 'relative', 'top-0 z-50 transition-transform duration-500 ease-out motion-reduce:transition-none', hidden && '-translate-y-full')}>
            <header className="rb-es-sign bg-[var(--site-hero-bg)] text-[var(--site-on-cover)]">
                <nav aria-label="Ana menü" className={cn(esWrap, 'flex min-h-[76px] items-center gap-3 py-2 sm:gap-4 lg:min-h-[96px]')}>
                    <Link to="/" onClick={toTop} {...nameX}
                        className={cn('flex min-h-11 min-w-0 flex-1 flex-col justify-center text-[var(--site-on-cover)] no-underline', nameX.className)}>
                        <span className={cn(serif, 'line-clamp-2 break-words leading-[0.92]', headerNameClass(name))}>{name}</span>
                        {place && <span className="mt-1 hidden truncate text-xs font-extrabold uppercase tracking-[0.16em] text-[var(--site-cover-accent)] sm:block">{place}</span>}
                    </Link>
                    {site.phone && !edit && (
                        <a href={telHref(site.phone)} aria-label={`Ara: ${site.phone}`}
                            className={cn(serif, 'hidden min-h-11 shrink-0 items-center gap-2 whitespace-nowrap text-[28px] leading-none text-[var(--site-cover-accent)] no-underline tabular-nums hover:underline md:inline-flex lg:text-[36px]')}>
                            <PhoneGlyph className="h-[0.75em] w-[0.75em]" />{site.phone}
                        </a>
                    )}
                    {canOrder && (
                        <Link to="/siparis" aria-label={`Sepet, ${cart.count} ürün`} aria-current={current === 'siparis' ? 'page' : undefined} {...orderX}
                            className={cn('inline-flex h-12 shrink-0 items-center gap-2 rounded-md bg-[var(--site-pop)] pl-3.5 pr-2 text-sm font-extrabold uppercase tracking-[0.04em] text-[var(--site-on-pop)] no-underline shadow-[inset_0_-3px_0_rgba(0,0,0,0.18)] transition-[filter] hover:brightness-105', orderX.className)}>
                            Sepet
                            <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-[4px] bg-[var(--site-on-pop)] px-1.5 text-[13px] tabular-nums text-[var(--site-pop)]">{cart.count}</span>
                        </Link>
                    )}
                    <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open} aria-controls={panelId}
                        aria-label={open ? 'Menüyü kapat' : 'Menüyü aç'}
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border-[3px] border-[var(--site-on-cover)] text-[var(--site-on-cover)] lg:hidden">
                        <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="square">
                            {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
                        </svg>
                    </button>
                </nav>
            </header>
            <TileStrip className="h-2.5 sm:h-3" />

            {/* Geniş ekranda tabelanın altındaki sayfa plakaları. */}
            <div className="hidden border-b-2 border-[var(--site-text)] bg-[var(--site-bg)] text-[var(--site-text)] lg:block">
                <div className={cn(esWrap, 'flex items-center gap-6')}>
                    <nav aria-label="Sayfalar" className="flex min-w-0 flex-1 items-center gap-1">
                        <Link to="/" onClick={toTop} aria-current={current === 'home' ? 'page' : undefined} className={navLink(current === 'home')}>Ana sayfa</Link>
                        {nav.map(item => (
                            <Link key={item.key} to={item.to} aria-current={current === item.key ? 'page' : undefined} className={navLink(current === item.key)}>{item.label}</Link>
                        ))}
                        {trackPath && <Link to={trackPath} className={navLink(false)}>Siparişim</Link>}
                    </nav>
                    <OpenLine site={site} className="shrink-0 text-sm" />
                    {canReserve && (
                        <Link to={RESERVATION_PATH} aria-current={current === 'rezervasyon' ? 'page' : undefined} {...reserveX}
                            className={cn(esButton.accent, 'min-h-11 shrink-0 px-5 text-sm', reserveX.className)}>Masa ayırt</Link>
                    )}
                </div>
            </div>

            {open && (
                <nav id={panelId} aria-label="Sayfalar" className="max-h-[calc(100svh-90px)] overflow-y-auto border-b-[6px] border-[var(--site-text)] bg-[var(--site-bg)] text-[var(--site-text)] lg:hidden">
                    <div className={cn(esWrap, 'flex flex-col pb-6 pt-2')}>
                        <Link to="/" onClick={close} aria-current={current === 'home' ? 'page' : undefined} className={panelLink}>Ana sayfa</Link>
                        {nav.map(item => (
                            <Link key={item.key} to={item.to} onClick={close} aria-current={current === item.key ? 'page' : undefined} className={panelLink}>
                                {item.label}{current === item.key && <span aria-hidden="true" className="h-3 w-3 rounded-sm bg-[var(--site-hero-bg)]" />}
                            </Link>
                        ))}
                        {canOrder && <Link to="/siparis" onClick={close} className={panelLink}>Paket sipariş</Link>}
                        {trackPath && <Link to={trackPath} onClick={close} className={panelLink}>Siparişim</Link>}
                        {canReserve && <Link to={RESERVATION_LOOKUP_PATH} onClick={close} className={panelLink}>Rezervasyon sorgula</Link>}
                        <OpenLine site={site} className="mt-5 text-[15px]" />
                        <div className="mt-4 flex flex-col gap-3">
                            {site.phone && <a href={telHref(site.phone)} className={esButton.accent}><PhoneGlyph className="h-5 w-5" />Ara: {site.phone}</a>}
                            {canReserve && <Link to={RESERVATION_PATH} onClick={close} className={esButton.ink}>Masa ayırt</Link>}
                        </div>
                    </div>
                </nav>
            )}
        </div>
    );
}

export function EsnafFooter({ site, bottomBar, visit }: DesignFooterProps) {
    const edit = useSiteEdit();
    const fixedX = editExternal(edit, 'fixed');
    const ordering = useOnlineOrdering();
    const canOrder = useOnlineOrderingAvailable();
    const [trackPath] = useState(lastOrderTrackingPath);
    const name = restaurantName(site);
    const nav = siteNav(site);
    const canReserve = canReserveOnline(site);
    const c = site.site;
    const address = fullAddress(site);
    const rows = visit ? weekSchedule(site) : null;
    const lastOrder = ordering?.state === 'open' && ordering.lastOrderAt ? timeOfDay(ordering.lastOrderAt) : null;

    const label = 'm-0 text-xs font-extrabold uppercase tracking-[0.18em] text-[var(--site-accent-on-sand)]';
    const footLink = 'inline-flex min-h-11 items-center font-bold text-[var(--site-on-footer)] no-underline underline-offset-4 hover:underline';

    return (
        <footer className={cn(sans, 'mt-auto bg-[var(--site-footer-bg)] text-[var(--site-on-footer)]', bottomBar && 'pb-[calc(84px+env(safe-area-inset-bottom))] md:pb-0')}>
            <TileStrip />
            <div className={cn(esWrap, 'grid gap-12 py-14 sm:py-16 md:grid-cols-2 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)_minmax(0,1fr)] lg:gap-14')}>
                <div className="flex min-w-0 flex-col gap-4">
                    <p className={cn(serif, 'm-0 break-words text-[44px] leading-[0.9] sm:text-[56px]')}>{name}</p>
                    {visit && address && (
                        <a href={directionsUrl(address)} target="_blank" rel="noopener noreferrer" className="max-w-[36ch] text-[15px] leading-relaxed text-[var(--site-footer-muted)] no-underline hover:underline">
                            {address}
                        </a>
                    )}
                    <nav aria-label="Alt menü" className="flex flex-wrap gap-x-5">
                        {nav.map(item => <Link key={item.key} to={item.to} className={footLink}>{item.label}</Link>)}
                        {canOrder && <Link to="/siparis" className={footLink}>Paket sipariş</Link>}
                        {trackPath && <Link to={trackPath} className={footLink}>Siparişim nerede?</Link>}
                        {canReserve && <Link to={RESERVATION_LOOKUP_PATH} className={footLink}>Rezervasyon sorgula</Link>}
                    </nav>
                </div>

                {rows && (
                    <section aria-labelledby="es-alt-saat" className="flex min-w-0 flex-col gap-3">
                        <h2 id="es-alt-saat" className={label}>Çalışma saatleri</h2>
                        <dl className="m-0 flex flex-col border-y-2 border-[color-mix(in_srgb,var(--site-on-footer)_22%,transparent)] py-1.5">
                            {rows.map(r => (
                                <div key={r.day} className={cn('flex items-baseline justify-between gap-4 rounded-[4px] px-2 py-1.5 text-[15px]',
                                    r.isToday ? 'bg-[var(--site-pop)] font-extrabold text-[var(--site-on-pop)]' : 'text-[var(--site-footer-muted)]')}>
                                    <dt>{r.label}{r.isToday && <span className="sr-only"> (bugün)</span>}</dt>
                                    <dd className="m-0 tabular-nums">{r.text}</dd>
                                </div>
                            ))}
                            {lastOrder && (
                                <div className="flex items-baseline justify-between gap-4 px-2 py-1.5 text-[15px] text-[var(--site-footer-muted)]">
                                    <dt>Paket sipariş</dt><dd className="m-0 tabular-nums">{untilTime(lastOrder)}</dd>
                                </div>
                            )}
                        </dl>
                        {c.hoursNote && <p className="m-0 text-[13px] text-[var(--site-footer-muted)]">{c.hoursNote}</p>}
                    </section>
                )}

                {visit && (site.phone || c.whatsappPhone || c.instagramUrl) && (
                    <section aria-labelledby="es-alt-ilt" className="flex min-w-0 flex-col gap-3">
                        <h2 id="es-alt-ilt" className={label}>Sipariş ve bilgi</h2>
                        {site.phone && (
                            <a href={telHref(site.phone)} className={cn(serif, 'inline-flex min-h-11 w-fit items-center break-all text-[38px] leading-none text-[var(--site-on-footer)] no-underline tabular-nums hover:underline sm:text-[44px]')}>
                                <span className="sr-only">Ara: </span>{site.phone}
                            </a>
                        )}
                        <div className="flex flex-wrap gap-x-5">
                            {c.whatsappPhone && <a href={whatsappHref(c.whatsappPhone)} target="_blank" rel="noopener noreferrer" className={footLink}>WhatsApp</a>}
                            {c.instagramUrl && <a href={c.instagramUrl} target="_blank" rel="noopener noreferrer" className={footLink}>{instagramHandle(c.instagramUrl)}</a>}
                            {address && <a href={directionsUrl(address)} target="_blank" rel="noopener noreferrer" className={footLink}>Yol tarifi</a>}
                        </div>
                    </section>
                )}
            </div>

            {/* Tezgâhın önü: dev "Yine bekleriz" ve sabit satır. */}
            <div className="border-t-2 border-dashed border-[color-mix(in_srgb,var(--site-on-footer)_25%,transparent)]">
                <div className={cn(esWrap, 'flex flex-col gap-4 py-8 lg:flex-row lg:items-end lg:justify-between')}>
                    <p className={cn(serif, 'm-0 text-[52px] leading-[0.85] text-[var(--site-accent-on-sand)] sm:text-[80px]')}>Yine bekleriz</p>
                    <div className="flex flex-wrap items-center gap-x-5 text-[13px] text-[var(--site-footer-muted)]">
                        <span {...fixedX} className={cn('inline-flex min-h-11 items-center', fixedX.className)}>© {new Date().getFullYear()} {name} ·&nbsp;<strong className="font-bold text-[var(--site-on-footer)]">Sophram</strong>&nbsp;ile hazırlandı</span>
                        <Link to="/gizlilik-politikasi" {...fixedX} className={cn('inline-flex min-h-11 items-center hover:text-[var(--site-on-footer)]', fixedX.className)}>KVKK</Link>
                        <Link to="/login" {...fixedX} className={cn('inline-flex min-h-11 items-center hover:text-[var(--site-on-footer)]', fixedX.className)}>Personel girişi</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}
