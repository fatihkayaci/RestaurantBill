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
import { useHideOnScroll, useScrolled } from '../../useScrolled';
import type { DesignFooterProps, DesignHeaderProps } from '../registry';
import { MorningChip, Sprig, SunMark } from './BahceBits';
import { bhButton } from './bahceParts';

// Bahçe Kahvaltısı'nın çerçevesi.
// - Üst menü: sayfanın kenarından ayrık, yüzen yuvarlak bir kapsül (beyaz, hafif buzlu): solda güneş işareti ve ad,
//   yanında bugünün saatini söyleyen "Sabahtan açık 08:00 – 14:00" çipi (geniş ekranda), ortada yuvarlak sayfa
//   bağlantıları, sağda Sepet ve "Masa ayırt". Telefonda ad + Sepet + menü düğmesi; menü kapsülün içinde aşağı açılır
//   (iri bağlantılar ve saat çipi).
// - Alt bilgi: orman yeşili bahçe; üst kenarı çalı/yaprak sırası (SVG, alt bilgi renginde), içinde ad ve güneş, gün gün
//   saatler (bugün tereyağı), iletişim, sayfalar; en altta sabit satır.

function timeOfDay(iso: string): string {
    return new Date(iso).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

export function BahceHeader({ site, current, sticky }: DesignHeaderProps) {
    const scrolled = useScrolled(sticky);
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

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
        win.addEventListener('keydown', onKey);
        return () => win.removeEventListener('keydown', onKey);
    }, [open, win]);

    const close = () => setOpen(false);
    const toTop = () => { if (current === 'home') win.scrollTo({ top: 0, behavior: 'smooth' }); };
    const navLink = (on: boolean) => cn('inline-flex h-10 items-center rounded-full px-3.5 text-[15px] font-semibold no-underline transition-colors',
        on ? 'bg-[var(--site-alt)] text-[var(--site-text)]' : 'text-[var(--site-sub)] hover:bg-[var(--site-alt)] hover:text-[var(--site-text)]');
    const panelLink = 'flex min-h-14 items-center justify-between gap-4 rounded-[18px] px-3 text-[24px] leading-none text-[var(--site-text)] no-underline hover:bg-[var(--site-alt)]';

    return (
        <div className={cn(sans, sticky ? 'sticky' : 'relative', 'top-0 z-50 px-2.5 pt-2.5 transition-transform duration-500 ease-out motion-reduce:transition-none sm:px-5 sm:pt-4',
            hidden && '-translate-y-[130%]')}>
            <header className={cn('mx-auto max-w-[1200px] rounded-[30px] border border-[var(--site-border)] bg-[color-mix(in_srgb,var(--site-card)_90%,transparent)] text-[var(--site-text)] backdrop-blur-[14px] transition-shadow duration-300',
                (scrolled || open) && 'shadow-[0_18px_40px_-24px_color-mix(in_srgb,var(--site-text)_45%,transparent)]')}>
                <nav aria-label="Ana menü" className="flex min-h-[62px] items-center gap-2 py-2 pl-3 pr-2 sm:gap-3 sm:pl-4 lg:min-h-[70px]">
                    <Link to="/" onClick={toTop} {...nameX}
                        className={cn('flex min-h-11 min-w-0 items-center gap-2.5 text-[var(--site-text)] no-underline', nameX.className)}>
                        <SunMark className="h-8 w-8 sm:h-9 sm:w-9" />
                        <span className={cn(serif, 'min-w-0 truncate text-[21px] leading-none tracking-[-0.03em] sm:text-[24px]')}>{name}</span>
                    </Link>
                    <MorningChip site={site} className="ml-1 hidden xl:flex" />
                    <div className="ml-auto hidden items-center gap-1 lg:flex">
                        {nav.map(item => (
                            <Link key={item.key} to={item.to} aria-current={current === item.key ? 'page' : undefined} className={navLink(current === item.key)}>{item.label}</Link>
                        ))}
                        {trackPath && <Link to={trackPath} className={navLink(false)}>Siparişim</Link>}
                    </div>
                    <div className="ml-auto flex shrink-0 items-center gap-2 lg:ml-2">
                        {canOrder && (
                            <Link to="/siparis" aria-label={`Sepet, ${cart.count} ürün`} aria-current={current === 'siparis' ? 'page' : undefined} {...orderX}
                                className={cn('inline-flex h-11 items-center gap-2 rounded-full border border-[var(--site-border-mid)] bg-[var(--site-card)] pl-4 pr-1.5 text-sm font-bold text-[var(--site-text)] no-underline transition-colors hover:border-[var(--site-text)]', orderX.className)}>
                                Sepet
                                <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-full bg-[var(--site-mustard)] px-2 text-xs font-extrabold tabular-nums text-[var(--site-text)]">{cart.count}</span>
                            </Link>
                        )}
                        {canReserve && (
                            <Link to={RESERVATION_PATH} aria-current={current === 'rezervasyon' ? 'page' : undefined} {...reserveX}
                                className={cn(bhButton.accent, 'hidden min-h-11 px-5 text-sm sm:inline-flex', reserveX.className)}>Masa ayırt</Link>
                        )}
                        <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open} aria-controls={panelId}
                            aria-label={open ? 'Menüyü kapat' : 'Menüyü aç'}
                            className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--site-alt)] text-[var(--site-text)] lg:hidden">
                            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 8h16M4 16h10" />}
                            </svg>
                        </button>
                    </div>
                </nav>
                {open && (
                    <nav id={panelId} aria-label="Sayfalar" className="px-2.5 pb-4 lg:hidden">
                        <MorningChip site={site} weekend className="px-1 pb-3" />
                        <div className="flex flex-col">
                            <Link to="/" onClick={close} aria-current={current === 'home' ? 'page' : undefined} className={cn(serif, panelLink)}>Ana sayfa</Link>
                            {nav.map(item => (
                                <Link key={item.key} to={item.to} onClick={close} aria-current={current === item.key ? 'page' : undefined} className={cn(serif, panelLink)}>
                                    {item.label}{current === item.key && <span aria-hidden="true" className="h-3 w-3 rounded-full bg-[var(--site-mustard)]" />}
                                </Link>
                            ))}
                            {canOrder && <Link to="/siparis" onClick={close} className={cn(serif, panelLink)}>Paket sipariş</Link>}
                            {trackPath && <Link to={trackPath} onClick={close} className={cn(serif, panelLink)}>Siparişim</Link>}
                            {canReserve && <Link to={RESERVATION_LOOKUP_PATH} onClick={close} className={cn(serif, panelLink)}>Rezervasyon sorgula</Link>}
                        </div>
                        {canReserve && <Link to={RESERVATION_PATH} onClick={close} className={cn(bhButton.accent, 'mt-4 w-full')}>Masa ayırt</Link>}
                    </nav>
                )}
            </header>
        </div>
    );
}

/** Alt bilginin üst kenarı: yuvarlak çalı sırası ve arada birkaç yaprak (alt bilgi renginde; genişliğe uzar). */
function Hedge() {
    return (
        <div aria-hidden="true" className="relative h-[46px] overflow-hidden sm:h-[64px]">
            <svg viewBox="0 0 1200 64" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
                <path fill="var(--site-footer-bg)"
                    d="M0 64V40c40-26 90-30 128-6 26-28 84-34 118-4 30-30 92-30 124 2 36-28 96-24 124 6 30-34 98-36 132-2 28-26 86-28 116 2 36-30 100-30 132 2 30-24 82-26 112-2 34-28 92-28 126 4 22-14 56-18 88-8V64Z" />
            </svg>
            <Sprig className="absolute bottom-[18px] left-[8%] w-[96px] -rotate-[8deg] sm:w-[128px]" />
            <Sprig className="absolute bottom-[22px] right-[10%] w-[84px] rotate-[168deg] scale-y-[-1] sm:w-[112px]" />
        </div>
    );
}

export function BahceFooter({ site, bottomBar, visit }: DesignFooterProps) {
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
    const label = 'm-0 text-[15px] font-bold text-[var(--site-mustard)]';
    const link = 'inline-flex min-h-11 items-center text-[15px] text-[var(--site-on-footer)] no-underline underline-offset-4 hover:underline';

    const contact: { key: string; label: string; href: string; external?: boolean }[] = [];
    if (visit && site.phone) contact.push({ key: 'tel', label: site.phone, href: telHref(site.phone) });
    if (visit && c.whatsappPhone) contact.push({ key: 'wa', label: `WhatsApp ${c.whatsappPhone}`, href: whatsappHref(c.whatsappPhone), external: true });
    if (visit && c.instagramUrl) contact.push({ key: 'ig', label: instagramHandle(c.instagramUrl), href: c.instagramUrl, external: true });

    return (
        <footer className={cn(sans, 'mt-auto text-[var(--site-on-footer)]')}>
            <Hedge />
            <div className={cn('bg-[var(--site-footer-bg)] px-4 pb-8 pt-8 sm:px-8 sm:pt-10', bottomBar && 'pb-[calc(96px+env(safe-area-inset-bottom))] md:pb-8')}>
                <div className="mx-auto grid max-w-[1200px] gap-10 md:grid-cols-[minmax(0,1.3fr)_repeat(3,minmax(0,1fr))] md:gap-8">
                    <div className="flex min-w-0 flex-col gap-4">
                        <div className="flex items-center gap-3">
                            <SunMark className="h-11 w-11" />
                            <p className={cn(serif, 'm-0 min-w-0 break-words text-[30px] leading-none tracking-[-0.03em] sm:text-[36px]')}>{name}</p>
                        </div>
                        {visit && address && (
                            <a href={directionsUrl(address)} target="_blank" rel="noopener noreferrer" className="max-w-[34ch] text-[15px] leading-relaxed text-[var(--site-footer-muted)] no-underline hover:underline">
                                {site.openAddress || address}{site.openAddress && (site.district || site.city) && <>, {[site.district, site.city].filter(Boolean).join(' / ')}</>}
                            </a>
                        )}
                        {canReserve && <Link to={RESERVATION_PATH} className={cn(bhButton.butter, 'self-start')}>Masa ayırt</Link>}
                    </div>

                    {rows && (
                        <div className="flex flex-col gap-3">
                            <p className={label}>Saatler</p>
                            <dl className="m-0 flex flex-col gap-1">
                                {rows.map(r => (
                                    <div key={r.day} className={cn('flex justify-between gap-3 rounded-full px-3 py-1 text-[14px]',
                                        r.isToday ? 'bg-[var(--site-mustard)] font-bold text-[var(--site-text)]' : 'text-[var(--site-footer-muted)]')}>
                                        <dt>{r.label}{r.isToday && <span className="sr-only"> (bugün)</span>}</dt>
                                        <dd className="m-0 tabular-nums">{r.text}</dd>
                                    </div>
                                ))}
                                {lastOrder && (
                                    <div className="flex justify-between gap-3 px-3 py-1 text-[14px] text-[var(--site-footer-muted)]">
                                        <dt>Paket sipariş</dt><dd className="m-0 tabular-nums">{untilTime(lastOrder)}</dd>
                                    </div>
                                )}
                            </dl>
                            {c.hoursNote && <p className="m-0 px-3 text-[13px] text-[var(--site-footer-muted)]">{c.hoursNote}</p>}
                        </div>
                    )}

                    {contact.length > 0 && (
                        <div className="flex flex-col gap-2">
                            <p className={label}>Ulaşın</p>
                            <ul className="m-0 flex list-none flex-col p-0">
                                {contact.map(row => (
                                    <li key={row.key}>
                                        <a href={row.href} target={row.external ? '_blank' : undefined} rel={row.external ? 'noopener noreferrer' : undefined} className={cn(link, 'break-all')}>{row.label}</a>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    <nav aria-label="Alt menü" className="flex flex-col gap-2">
                        <p className={label}>Sayfalar</p>
                        <ul className="m-0 flex list-none flex-col p-0">
                            {nav.map(item => <li key={item.key}><Link to={item.to} className={link}>{item.label}</Link></li>)}
                            {canOrder && <li><Link to="/siparis" className={link}>Paket sipariş</Link></li>}
                            {trackPath && <li><Link to={trackPath} className={link}>Siparişim nerede?</Link></li>}
                            {canReserve && <li><Link to={RESERVATION_LOOKUP_PATH} className={link}>Rezervasyon sorgula</Link></li>}
                        </ul>
                    </nav>
                </div>

                <div className="mx-auto mt-10 flex max-w-[1200px] flex-wrap items-center justify-between gap-x-5 gap-y-1 border-t border-[color-mix(in_srgb,var(--site-on-footer)_16%,transparent)] pt-4 text-[13px] text-[var(--site-footer-muted)]">
                    <span {...fixedX} className={cn('inline-flex min-h-11 items-center', fixedX.className)}>© {new Date().getFullYear()} {name} ·&nbsp;<strong className="font-bold text-[var(--site-on-footer)]">Sophram</strong>&nbsp;ile hazırlandı</span>
                    <span className="flex gap-5">
                        <Link to="/gizlilik-politikasi" {...fixedX} className={cn('inline-flex min-h-11 items-center hover:text-[var(--site-on-footer)]', fixedX.className)}>KVKK</Link>
                        <Link to="/login" {...fixedX} className={cn('inline-flex min-h-11 items-center hover:text-[var(--site-on-footer)]', fixedX.className)}>Personel girişi</Link>
                    </span>
                </div>
            </div>
        </footer>
    );
}
