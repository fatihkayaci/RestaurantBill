import { useEffect, useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { canReserveOnline, type PublicSite } from '@/features/customerSite/types';
import { RESERVATION_LOOKUP_PATH } from '@/features/customerSite/reservationCode';
import { lastOrderTrackingPath, useSiteCart } from '@/features/delivery/useSiteCart';
import { cn } from '@/lib/utils';
import { RESERVATION_PATH, instagramHandle, sans, serif, siteNav, type SitePageKey } from '../../siteParts';
import { directionsUrl, initials, telHref, whatsappHref } from '../../siteTheme';
import { fullAddress, restaurantName, weekSchedule } from '../../useSite';
import { useSiteWindow } from '../../siteEditContext';
import { useScrolled } from '../../useScrolled';
import type { DesignFooterProps, DesignHeaderProps } from '../registry';
import { BagGlyph, CalendarGlyph, InstagramGlyph, PhoneGlyph, WhatsAppGlyph } from './SophraIcons';
import { CART_PATH, primaryAction, spWrap } from './sophraParts';
import { tableCartCount, tableCartPath, useTableVisit } from '@/features/customerSite/tableVisit';

// Sophra'nın üst menüsü ve alt bilgisi. Üst menü koyu bant (--site-paper): solda logo (yoksa baş harfler) + ad + konum,
// ortada sayfalar, sağda telefon ve "Rezervasyon". Ana sayfada kapağın üstünde saydam başlar (`overlay`), kaydırınca koyu
// zemin alır. Ana düğme "Rezervasyon" (rezervasyon kapalıysa "Menüyü incele"); sepette ürün varsa yanında küçük sepet düğmesi
// (Menü'nün sepet penceresini açar; masadaki müşteride masanın sepeti). Alt bilgi koyu (--site-footer-*): marka + kısa tanım + sosyal, sayfalar,
// iletişim, saatler; altta telif, gizlilik ve kullanım koşulları. Verisi olmayan sütun çizilmez.

/** Restoranın logosu (varsa) ya da baş harfleri altın halkada. */
export function SophraMark({ site, size = 'md' }: { site: PublicSite; size?: 'md' | 'lg' }) {
    const name = restaurantName(site);
    const logo = site.site.logoUrl;
    const box = size === 'lg' ? 'h-14 w-14' : 'h-11 w-11';
    if (logo) return <img src={logo} alt="" className={cn(box, 'shrink-0 rounded-full bg-[var(--site-on-paper)] object-contain p-1')} />;
    return (
        <span aria-hidden="true" className={cn(box, serif, 'flex shrink-0 items-center justify-center rounded-full border border-[var(--site-mustard-text)] text-[var(--site-mustard-text)]',
            size === 'lg' ? 'text-[22px]' : 'text-[17px]')}>
            {initials(name) || '•'}
        </span>
    );
}

export function SophraHeader({ site, current, sticky, overlay }: DesignHeaderProps) {
    const win = useSiteWindow();
    const scrolled = useScrolled(sticky);
    const [open, setOpen] = useState(false);
    const panelId = useId();
    const cart = useSiteCart();
    const visit = useTableVisit();
    const [trackPath] = useState(lastOrderTrackingPath);
    const name = restaurantName(site);
    // Sepet simgesi sepetin kendisini açar: paket siparişte Menü'deki sepet penceresi, masadaki müşteride masanın sepeti.
    const tableCount = visit ? tableCartCount(visit) : 0;
    const cartLink = visit ? (tableCount > 0 ? { to: tableCartPath(visit), count: tableCount, label: `${visit.tableName} sepeti, ${tableCount} ürün` } : null)
        : cart.enabled && cart.count > 0 ? { to: CART_PATH, count: cart.count, label: `Sepeti aç, ${cart.count} ürün` } : null;
    const nav = siteNav(site);
    const place = [site.district, site.city].filter(Boolean).join(', ');
    const canReserve = canReserveOnline(site);
    const action = primaryAction(site);
    const clear = overlay && !scrolled && !open;

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
        win.addEventListener('keydown', onKey);
        return () => win.removeEventListener('keydown', onKey);
    }, [open, win]);

    const toTop = () => { if (current === 'home') win.scrollTo({ top: 0, behavior: 'smooth' }); };
    const close = () => setOpen(false);
    const links = [{ key: 'home' as SitePageKey, to: '/', label: 'Ana sayfa' }, ...nav];
    const panelLink = 'flex min-h-12 items-center rounded-xl px-3 text-[17px] font-semibold text-[var(--site-on-paper)] no-underline hover:bg-[color-mix(in_srgb,var(--site-on-paper)_8%,transparent)]';

    const bar = (
        <div className={cn(sans, 'text-[var(--site-on-paper)] transition-[background-color,box-shadow] duration-300',
            clear ? 'bg-[linear-gradient(to_bottom,color-mix(in_srgb,var(--site-paper)_72%,transparent),transparent)]'
                : 'bg-[var(--site-paper)] shadow-[0_10px_30px_-24px_rgba(0,0,0,0.8)]')}>
            <nav aria-label="Ana menü" className={cn(spWrap, 'flex h-[68px] items-center gap-4 lg:h-[76px]')}>
                <Link to="/" onClick={toTop} className="flex min-h-11 min-w-0 items-center gap-3 text-[var(--site-on-paper)] no-underline">
                    <SophraMark site={site} />
                    <span className="flex min-w-0 flex-col leading-tight">
                        <span className={cn(serif, 'truncate text-[19px] sm:text-[21px]')}>{name}</span>
                        {place && <span className="hidden truncate text-[12px] text-[var(--site-on-paper-sub)] sm:block">{place}</span>}
                    </span>
                </Link>
                <ul className="m-0 ml-auto hidden list-none items-center gap-1 p-0 lg:flex">
                    {links.map(item => {
                        const on = current === item.key;
                        return (
                            <li key={item.key}>
                                <Link to={item.to} onClick={item.key === 'home' ? toTop : undefined} aria-current={on ? 'page' : undefined}
                                    className={cn('relative inline-flex h-11 items-center px-3.5 text-[15px] font-semibold no-underline transition-colors',
                                        on ? 'text-[var(--site-on-paper)]' : 'text-[var(--site-on-paper-sub)] hover:text-[var(--site-on-paper)]')}>
                                    {item.label}
                                    {on && <span aria-hidden="true" className="absolute inset-x-3.5 bottom-1.5 h-0.5 rounded-full bg-[var(--site-mustard-text)]" />}
                                </Link>
                            </li>
                        );
                    })}
                </ul>
                <div className="ml-auto flex shrink-0 items-center gap-2 lg:ml-4">
                    {site.phone && (
                        <a href={telHref(site.phone)} className="hidden min-h-11 items-center gap-2 whitespace-nowrap px-2 text-[15px] font-semibold text-[var(--site-on-paper)] no-underline hover:text-[var(--site-mustard-text)] xl:inline-flex">
                            <PhoneGlyph className="h-[18px] w-[18px] text-[var(--site-mustard-text)]" />{site.phone}
                        </a>
                    )}
                    {/* Sepette ürün varsa küçük sepet bağlantısı (Menü'deki sepete); ana düğme rezervasyon. */}
                    {cartLink && (
                        <Link to={cartLink.to} aria-label={cartLink.label}
                            className="relative inline-flex h-11 w-11 items-center justify-center rounded-full text-[var(--site-on-paper)] no-underline hover:text-[var(--site-mustard-text)]">
                            <BagGlyph className="h-[20px] w-[20px]" />
                            <span aria-hidden="true" className="absolute -right-0.5 -top-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--site-mustard)] px-1 text-[11px] font-extrabold tabular-nums text-[var(--site-paper)]">
                                {cartLink.count}
                            </span>
                        </Link>
                    )}
                    <Link to={action.to} className="hidden min-h-11 items-center gap-2 whitespace-nowrap rounded-full bg-[var(--site-accent)] px-5 text-[15px] font-bold text-[var(--site-on-accent)] no-underline ring-1 ring-[color-mix(in_srgb,var(--site-on-paper)_18%,transparent)] transition-opacity hover:opacity-90 sm:inline-flex">
                        {action.reserve && <CalendarGlyph className="h-[18px] w-[18px]" />}
                        {action.label}
                    </Link>
                    <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open} aria-controls={panelId} aria-label={open ? 'Menüyü kapat' : 'Menüyü aç'}
                        className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--site-paper-line-strong)] text-[var(--site-on-paper)] lg:hidden">
                        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
                            {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 8h16M4 16h16" />}
                        </svg>
                    </button>
                </div>
            </nav>
            {open && (
                <nav id={panelId} aria-label="Sayfalar" className="max-h-[calc(100dvh-68px)] overflow-y-auto border-t border-[var(--site-paper-line)] bg-[var(--site-paper)] lg:hidden">
                    <div className={cn(spWrap, 'flex flex-col gap-0.5 py-3')}>
                        {links.map(item => (
                            <Link key={item.key} to={item.to} onClick={close} aria-current={current === item.key ? 'page' : undefined} className={panelLink}>{item.label}</Link>
                        ))}
                        {trackPath && <Link to={trackPath} onClick={close} className={panelLink}>Siparişim</Link>}
                        {canReserve && <Link to={RESERVATION_LOOKUP_PATH} onClick={close} className={panelLink}>Rezervasyon sorgula</Link>}
                        <div className="mt-3 flex flex-col gap-2 border-t border-[var(--site-paper-line)] pt-4">
                            <Link to={action.to} onClick={close} className="flex min-h-12 items-center justify-center gap-2 rounded-full bg-[var(--site-accent)] text-[16px] font-bold text-[var(--site-on-accent)] no-underline">
                                {action.label}
                            </Link>
                            {site.phone && (
                                <a href={telHref(site.phone)} className="flex min-h-12 items-center justify-center gap-2 rounded-full border border-[var(--site-paper-line-strong)] text-[16px] font-semibold text-[var(--site-on-paper)] no-underline">
                                    <PhoneGlyph className="h-[18px] w-[18px]" />{site.phone}
                                </a>
                            )}
                        </div>
                    </div>
                </nav>
            )}
        </div>
    );

    // Kapağın üstünde: yer kaplamayan yapışkan katman (kapak en üstten başlar).
    if (overlay) return <div className={cn('top-0 z-50', sticky ? 'sticky h-0' : 'absolute inset-x-0')}>{bar}</div>;
    return <div className={cn(sticky ? 'sticky' : 'relative', 'top-0 z-50')}>{bar}</div>;
}

export function SophraFooter({ site, bottomBar, visit }: DesignFooterProps) {
    const [trackPath] = useState(lastOrderTrackingPath);
    const cart = useSiteCart();
    const name = restaurantName(site);
    const nav = siteNav(site);
    const c = site.site;
    const address = fullAddress(site);
    const rows = weekSchedule(site);
    const canReserve = canReserveOnline(site);
    const description = c.tagline || c.headline;
    const uniform = !!rows && rows.every(r => r.isOpen && r.text === rows[0].text);
    const showContact = visit && Boolean(address || site.phone || c.whatsappPhone);
    const showHours = visit && rows !== null;
    const hasSocial = Boolean(c.instagramUrl || c.whatsappPhone);

    const label = 'm-0 text-[13px] font-bold uppercase tracking-[0.16em] text-[var(--site-accent-on-sand)]';
    const muted = 'text-[var(--site-footer-muted)]';
    const link = 'inline-flex min-h-10 items-center self-start text-[15px] text-[var(--site-on-footer)] no-underline hover:text-[var(--site-accent-on-sand)]';
    const round = 'flex h-11 w-11 items-center justify-center rounded-full border border-[color-mix(in_srgb,var(--site-on-footer)_28%,transparent)] text-[var(--site-on-footer)] transition-colors hover:border-[var(--site-accent-on-sand)] hover:text-[var(--site-accent-on-sand)]';

    return (
        <footer className={cn(sans, 'mt-auto bg-[var(--site-footer-bg)] text-[var(--site-on-footer)]', bottomBar && 'pb-[calc(76px+env(safe-area-inset-bottom))] md:pb-0')}>
            <div className={cn(spWrap, 'grid grid-cols-1 gap-10 py-14 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))] lg:py-16')}>
                <div className="flex min-w-0 flex-col gap-4 sm:col-span-2 lg:col-span-1">
                    <Link to="/" className="flex items-center gap-3 self-start text-[var(--site-on-footer)] no-underline">
                        <SophraMark site={site} size="lg" />
                        <span className={cn(serif, 'text-[26px] leading-tight')}>{name}</span>
                    </Link>
                    {description && <p className={cn('m-0 max-w-[40ch] text-[15px] leading-relaxed', muted)}>{description}</p>}
                    {hasSocial && (
                        <div className="flex gap-2">
                            {c.instagramUrl && (
                                <a href={c.instagramUrl} target="_blank" rel="noopener noreferrer" aria-label={`Instagram: ${instagramHandle(c.instagramUrl)}`} className={round}><InstagramGlyph /></a>
                            )}
                            {c.whatsappPhone && (
                                <a href={whatsappHref(c.whatsappPhone)} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" className={round}><WhatsAppGlyph /></a>
                            )}
                        </div>
                    )}
                </div>
                <nav aria-label="Alt menü" className="flex min-w-0 flex-col gap-1">
                    <h2 className={cn(label, 'mb-2')}>Sayfalar</h2>
                    <Link to="/" className={link}>Ana sayfa</Link>
                    {nav.map(item => <Link key={item.key} to={item.to} className={link}>{item.label}</Link>)}
                    {cart.enabled && cart.count > 0 && <Link to={CART_PATH} className={link}>Sepetim ({cart.count})</Link>}
                    {trackPath && <Link to={trackPath} className={link}>Siparişim nerede?</Link>}
                    {canReserve && <Link to={RESERVATION_PATH} className={link}>Rezervasyon</Link>}
                    {canReserve && <Link to={RESERVATION_LOOKUP_PATH} className={link}>Rezervasyon sorgula</Link>}
                </nav>
                {showContact && (
                    <div className="flex min-w-0 flex-col gap-3">
                        <h2 className={cn(label, 'mb-1')}>İletişim</h2>
                        {address && (
                            <a href={directionsUrl(address)} target="_blank" rel="noopener noreferrer" className={cn('break-words text-[15px] leading-relaxed no-underline hover:text-[var(--site-accent-on-sand)]', muted)}>
                                {site.openAddress || address}
                                {site.openAddress && (site.district || site.city) && <><br />{[site.district, site.city].filter(Boolean).join(' / ')}</>}
                            </a>
                        )}
                        {site.phone && <a href={telHref(site.phone)} className={cn(link, 'text-[17px] font-bold')}>{site.phone}</a>}
                        {c.whatsappPhone && (
                            <a href={whatsappHref(c.whatsappPhone)} target="_blank" rel="noopener noreferrer" className={link}>WhatsApp: {c.whatsappPhone}</a>
                        )}
                    </div>
                )}
                {showHours && rows && (
                    <div className="flex min-w-0 flex-col gap-3">
                        <h2 className={cn(label, 'mb-1')}>Çalışma saatleri</h2>
                        {uniform ? (
                            <p className="m-0 text-[15px]"><span className={muted}>Her gün</span> <span className="tabular-nums">{rows[0].text}</span></p>
                        ) : (
                            <dl className="m-0 flex flex-col gap-1">
                                {rows.map(r => (
                                    <div key={r.day} className={cn('flex justify-between gap-4 text-[14px]', r.isToday ? 'font-bold text-[var(--site-on-footer)]' : muted)}>
                                        <dt>{r.label}{r.isToday && <span className="sr-only"> (bugün)</span>}</dt>
                                        <dd className="m-0 tabular-nums">{r.text}</dd>
                                    </div>
                                ))}
                            </dl>
                        )}
                        {c.hoursNote && <p className={cn('m-0 text-[13px]', muted)}>{c.hoursNote}</p>}
                    </div>
                )}
            </div>
            <div className="border-t border-[color-mix(in_srgb,var(--site-on-footer)_14%,transparent)]">
                <div className={cn(spWrap, 'flex flex-col gap-1 py-3 text-[13px] sm:flex-row sm:flex-wrap sm:items-center sm:justify-between', muted)}>
                    <span className="inline-flex min-h-10 items-center">© {new Date().getFullYear()} {name}. <strong className="ml-1 font-semibold text-[var(--site-on-footer)]">Sophram</strong>&nbsp;ile hazırlandı.</span>
                    <div className="flex flex-wrap gap-x-5">
                        <Link to="/gizlilik-politikasi" className="inline-flex min-h-10 items-center text-inherit no-underline hover:text-[var(--site-on-footer)]">Gizlilik ve KVKK</Link>
                        <Link to="/kullanim-kosullari" className="inline-flex min-h-10 items-center text-inherit no-underline hover:text-[var(--site-on-footer)]">Kullanım koşulları</Link>
                        <Link to="/login" className="inline-flex min-h-10 items-center text-inherit no-underline hover:text-[var(--site-on-footer)]">Personel girişi</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}
