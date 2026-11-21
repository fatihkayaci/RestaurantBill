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
import { mhButton, mhWrap } from './meyhaneParts';

// Meyhane Gecesi'nin çerçevesi.
// - Üst menü: ortada tabela gibi ad, solda yazı bağlantılı sayfalar (geniş ekranda), sağda Sepet ve "Masa ayırt".
//   Kapak koyu olduğundan sayfanın zemininde saydam durur; kaydırınca koyu buzlu zemin alır. Telefonda ad + Sepet +
//   menü düğmesi; menü açılınca sayfalar başlık yazı tipinde, büyük, alt alta (basılı menünün içindekiler sayfası gibi).
// - Alt bilgi: koyu zeminde krem bir ADİSYON fişi: başta ad ve adres, gün gün saatler noktalı çizgiyle (bugün
//   işaretli), iletişim satırları, sayfalar, "Toplam: Afiyet olsun" ve fişin dişli yırtık alt kenarı.

function timeOfDay(iso: string): string {
    return new Date(iso).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

export function MeyhaneHeader({ site, current, sticky }: DesignHeaderProps) {
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
    const navLink = (on: boolean) => cn('inline-flex min-h-11 items-center border-b border-transparent text-[15px] font-semibold no-underline transition-colors',
        on ? 'border-[var(--site-accent-text)] text-[var(--site-text)]' : 'text-[var(--site-sub)] hover:text-[var(--site-text)]');
    const panelLink = 'flex min-h-14 items-center justify-between gap-4 border-b border-[var(--site-line)] text-[26px] leading-none text-[var(--site-text)] no-underline';
    const solid = scrolled || open;

    return (
        <div className={cn(sans, sticky ? 'sticky' : 'relative', 'top-0 z-50 transition-[transform,background-color,box-shadow] duration-500 ease-out motion-reduce:transition-none',
            hidden && '-translate-y-full',
            solid ? 'bg-[color-mix(in_srgb,var(--site-bg)_90%,transparent)] shadow-[0_1px_0_var(--site-line),0_18px_40px_-28px_rgba(0,0,0,0.9)] backdrop-blur-[12px]' : 'bg-transparent')}>
            <header className={cn(mhWrap, 'text-[var(--site-text)]')}>
                <nav aria-label="Ana menü" className="grid min-h-[68px] grid-cols-[1fr_auto] items-center gap-3 lg:min-h-[84px] lg:grid-cols-[1fr_auto_1fr]">
                    <div className="hidden items-center gap-6 lg:flex">
                        {nav.map(item => (
                            <Link key={item.key} to={item.to} aria-current={current === item.key ? 'page' : undefined} className={navLink(current === item.key)}>{item.label}</Link>
                        ))}
                    </div>
                    <Link to="/" onClick={toTop} {...nameX}
                        className={cn('flex min-h-11 min-w-0 items-center text-[var(--site-text)] no-underline lg:justify-center', nameX.className)}>
                        <span className={cn(serif, 'min-w-0 truncate text-[24px] leading-none sm:text-[28px] lg:text-[32px]')}>{name}</span>
                    </Link>
                    <div className="flex shrink-0 items-center justify-end gap-2 sm:gap-3">
                        {trackPath && <Link to={trackPath} className={cn(navLink(false), 'hidden xl:inline-flex')}>Siparişim</Link>}
                        {canOrder && (
                            <Link to="/siparis" aria-label={`Sepet, ${cart.count} ürün`} aria-current={current === 'siparis' ? 'page' : undefined} {...orderX}
                                className={cn('inline-flex h-11 items-center gap-2 rounded-md border border-[var(--site-border-mid)] px-3 text-sm font-bold text-[var(--site-text)] no-underline transition-colors hover:border-[var(--site-accent-text)]', orderX.className)}>
                                Sepet
                                <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-[var(--site-accent)] px-1.5 text-xs font-extrabold tabular-nums text-[var(--site-on-accent)]">{cart.count}</span>
                            </Link>
                        )}
                        {canReserve && (
                            <Link to={RESERVATION_PATH} aria-current={current === 'rezervasyon' ? 'page' : undefined} {...reserveX}
                                className={cn(mhButton.lamp, 'hidden min-h-11 px-5 text-sm sm:inline-flex', reserveX.className)}>Masa ayırt</Link>
                        )}
                        <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open} aria-controls={panelId}
                            aria-label={open ? 'Menüyü kapat' : 'Menüyü aç'}
                            className="flex h-11 w-11 items-center justify-center rounded-md border border-[var(--site-border-mid)] text-[var(--site-text)] lg:hidden">
                            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                                {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h10" />}
                            </svg>
                        </button>
                    </div>
                </nav>
                {open && (
                    <nav id={panelId} aria-label="Sayfalar" className="pb-6 lg:hidden">
                        <div className="flex flex-col">
                            <Link to="/" onClick={close} aria-current={current === 'home' ? 'page' : undefined} className={cn(serif, panelLink)}>Ana sayfa</Link>
                            {nav.map(item => (
                                <Link key={item.key} to={item.to} onClick={close} aria-current={current === item.key ? 'page' : undefined} className={cn(serif, panelLink)}>
                                    {item.label}{current === item.key && <span aria-hidden="true" className="h-2 w-2 rounded-full bg-[var(--site-accent)]" />}
                                </Link>
                            ))}
                            {canOrder && <Link to="/siparis" onClick={close} className={cn(serif, panelLink)}>Paket sipariş</Link>}
                            {trackPath && <Link to={trackPath} onClick={close} className={cn(serif, panelLink)}>Siparişim</Link>}
                            {canReserve && <Link to={RESERVATION_LOOKUP_PATH} onClick={close} className={cn(serif, panelLink)}>Rezervasyon sorgula</Link>}
                        </div>
                        {canReserve && <Link to={RESERVATION_PATH} onClick={close} className={cn(mhButton.lamp, 'mt-5 w-full')}>Masa ayırt</Link>}
                    </nav>
                )}
            </header>
        </div>
    );
}

export function MeyhaneFooter({ site, bottomBar, visit }: DesignFooterProps) {
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
    const [today] = useState(() => new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' }));

    // Fiş: zemin sitenin yazı rengi (krem), yazı sitenin zemin rengi (kömür); ikincil yazı ikisinin karışımı (≥ 7:1).
    const ink = 'text-[var(--site-bg)]';
    const faint = 'text-[color-mix(in_srgb,var(--site-bg)_74%,var(--site-text))]';
    const rule = 'border-0 border-t border-dashed border-[color-mix(in_srgb,var(--site-bg)_35%,transparent)]';
    const lineRow = 'flex items-baseline gap-2 text-[15px]';
    const leader = 'min-w-4 flex-1 -translate-y-1 border-b border-dotted border-[color-mix(in_srgb,var(--site-bg)_45%,transparent)]';
    const slipLink = 'inline-flex min-h-11 items-center font-semibold text-[var(--site-bg)] underline decoration-[color-mix(in_srgb,var(--site-bg)_35%,transparent)] underline-offset-4 hover:decoration-[var(--site-bg)]';

    const contact: { key: string; label: string; value: string; href: string; external?: boolean }[] = [];
    if (visit && site.phone) contact.push({ key: 'tel', label: 'Telefon', value: site.phone, href: telHref(site.phone) });
    if (visit && c.whatsappPhone) contact.push({ key: 'wa', label: 'WhatsApp', value: c.whatsappPhone, href: whatsappHref(c.whatsappPhone), external: true });
    if (visit && c.instagramUrl) contact.push({ key: 'ig', label: 'Instagram', value: instagramHandle(c.instagramUrl), href: c.instagramUrl, external: true });

    return (
        <footer className={cn(sans, 'mt-auto bg-[var(--site-footer-bg)] px-4 pb-10 pt-16 text-[var(--site-on-footer)] sm:pt-20',
            bottomBar && 'pb-[calc(96px+env(safe-area-inset-bottom))] md:pb-10')}>
            <div className="mx-auto w-full max-w-[460px] [filter:drop-shadow(0_26px_40px_rgba(0,0,0,0.55))]">
                <div className={cn('rb-mh-slip flex flex-col gap-5 bg-[var(--site-text)] px-6 pb-12 pt-9 sm:px-9', ink)}>
                    <div className="flex flex-col items-center gap-1.5 text-center">
                        <p className={cn(serif, 'm-0 break-words text-[30px] leading-none')}>{name}</p>
                        {visit && address && (
                            <a href={directionsUrl(address)} target="_blank" rel="noopener noreferrer" className={cn('text-sm no-underline hover:underline', faint)}>
                                {site.openAddress || address}{site.openAddress && (site.district || site.city) && <>, {[site.district, site.city].filter(Boolean).join(' / ')}</>}
                            </a>
                        )}
                        <p className={cn('m-0 text-[13px] tabular-nums', faint)}>{today}</p>
                    </div>

                    {rows && (
                        <>
                            <hr className={rule} />
                            <dl className="m-0 flex flex-col gap-1.5">
                                {rows.map(r => (
                                    <div key={r.day} className={cn(lineRow, r.isToday ? 'font-bold' : faint)}>
                                        <dt>{r.label}{r.isToday && <span className="sr-only"> (bugün)</span>}</dt>
                                        <span aria-hidden="true" className={leader} />
                                        <dd className="m-0 tabular-nums">{r.isToday && <span aria-hidden="true">› </span>}{r.text}</dd>
                                    </div>
                                ))}
                                {lastOrder && (
                                    <div className={cn(lineRow, faint)}>
                                        <dt>Paket sipariş</dt><span aria-hidden="true" className={leader} /><dd className="m-0 tabular-nums">{untilTime(lastOrder)}</dd>
                                    </div>
                                )}
                            </dl>
                            {c.hoursNote && <p className={cn('m-0 text-[13px]', faint)}>{c.hoursNote}</p>}
                        </>
                    )}

                    {contact.length > 0 && (
                        <>
                            <hr className={rule} />
                            <ul className="m-0 flex list-none flex-col p-0">
                                {contact.map(row => (
                                    <li key={row.key}>
                                        <a href={row.href} target={row.external ? '_blank' : undefined} rel={row.external ? 'noopener noreferrer' : undefined}
                                            className={cn(lineRow, 'min-h-11 items-center text-[var(--site-bg)] no-underline hover:underline')}>
                                            <span className={faint}>{row.label}</span>
                                            <span aria-hidden="true" className={leader} />
                                            <span className="font-bold">{row.value}</span>
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </>
                    )}

                    <hr className={rule} />
                    <nav aria-label="Alt menü" className="flex flex-wrap justify-center gap-x-5">
                        {nav.map(item => <Link key={item.key} to={item.to} className={slipLink}>{item.label}</Link>)}
                        {canOrder && <Link to="/siparis" className={slipLink}>Paket sipariş</Link>}
                        {trackPath && <Link to={trackPath} className={slipLink}>Siparişim nerede?</Link>}
                        {canReserve && <Link to={RESERVATION_LOOKUP_PATH} className={slipLink}>Rezervasyon sorgula</Link>}
                    </nav>

                    <hr className={rule} />
                    <div className="flex items-center justify-between gap-4">
                        <span className={cn(serif, 'text-[22px] leading-none')}>Toplam</span>
                        <span className={cn(serif, 'rotate-[-4deg] rounded-md border-2 border-current px-3 py-1.5 text-[20px] leading-none')}>Afiyet olsun</span>
                    </div>
                    {canReserve && <Link to={RESERVATION_PATH} className="inline-flex min-h-[52px] items-center justify-center rounded-md bg-[var(--site-bg)] px-6 text-[15px] font-bold text-[var(--site-text)] no-underline transition-opacity hover:opacity-90">Masa ayırt</Link>}
                </div>
            </div>

            <div className={cn('mx-auto mt-8 flex max-w-[460px] flex-wrap items-center justify-center gap-x-5 text-center text-[13px] text-[var(--site-footer-muted)]')}>
                <span {...fixedX} className={cn('inline-flex min-h-11 items-center', fixedX.className)}>© {new Date().getFullYear()} {name} ·&nbsp;<strong className="font-bold text-[var(--site-on-footer)]">Sophram</strong>&nbsp;ile hazırlandı</span>
                <Link to="/gizlilik-politikasi" {...fixedX} className={cn('inline-flex min-h-11 items-center hover:text-[var(--site-on-footer)]', fixedX.className)}>KVKK</Link>
                <Link to="/login" {...fixedX} className={cn('inline-flex min-h-11 items-center hover:text-[var(--site-on-footer)]', fixedX.className)}>Personel girişi</Link>
            </div>
        </footer>
    );
}
