import { useEffect, useId, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { canReserveOnline, type PublicSite } from '@/features/customerSite/types';
import { cn } from '@/lib/utils';
import { useOnlineOrdering, useOnlineOrderingAvailable } from '@/features/delivery/useOnlineOrderingAvailable';
import { lastOrderTrackingPath, useSiteCart } from '@/features/delivery/useSiteCart';
import { RESERVATION_LOOKUP_PATH } from '@/features/customerSite/reservationCode';
import { StockImageLabel } from '../components/StockImageLabel';
import { SiteShell } from './SiteChrome';
import {
    FONTS_HREF, MOTION_CSS, RESERVATION_PATH, cardButton, eyebrow, footLabel, headerAccentPill, headerPill, heroAccentButton, heroOutlineButton,
    iconCircle, instagramHandle, sans, sectionWrap, serif, siteCardDark, siteNav, untilTime, type SitePageKey,
} from './siteParts';
import { PhoneIcon } from './SiteCards';
import type { MobileAction } from './siteActions';
import { useMobileActions } from './siteActions';
import { directionsUrl, splitAccent, telHref, whatsappHref } from './siteTheme';
import { fullAddress, hoursLine, restaurantName, useSiteDocumentTitle, weekSchedule } from './useSite';
import { EditableBlock, EmptySlot, ExternalHint } from './siteEdit';
import { editExternal, useSiteEdit, useSiteWindow } from './siteEditContext';

// Restoran sitesinin ortak çerçevesi (tasarım: "Tema 2 · Açık"): ortalı başlık (solda sayfalar, ortada serif ad ve
// küçük konum satırı, sağda sipariş takibi, Sepet ve "Masa ayırt"), footer'ın üstünde "Acıktınız mı?" kartı, ziyaret
// bilgileri (adres · saatler · iletişim), dev soluk adlı alt bilgi ve telefonda her sayfada yapışkan alt eylem çubuğu.
// Başlık sayfanın akışında durur ve üstte yapışık kalır (içeriğin üstüne binmez).

const SCROLL_THRESHOLD = 8;

function useScrolled(enabled = true): boolean {
    const win = useSiteWindow();
    const [scrolled, setScrolled] = useState(() => enabled && win.scrollY > SCROLL_THRESHOLD);
    useEffect(() => {
        if (!enabled) return;
        let frame = 0;
        const onScroll = () => {
            if (frame) return;
            frame = win.requestAnimationFrame(() => {
                frame = 0;
                setScrolled(win.scrollY > SCROLL_THRESHOLD);
            });
        };
        win.addEventListener('scroll', onScroll, { passive: true });
        onScroll();
        return () => {
            win.removeEventListener('scroll', onScroll);
            if (frame) win.cancelAnimationFrame(frame);
        };
    }, [enabled, win]);
    return enabled && scrolled;
}

/**
 * Eski koyu kapakların başlık boşluğu. Tema 2'de başlık sayfanın akışında durduğundan boşluk gerekmez; akış sayfaları
 * (paket sipariş, takip) çağırmaya devam edebilsin diye bileşen duruyor.
 */
export function HeaderSpacer() {
    return null;
}

function TruckIcon() {
    return (
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" /><path d="M15 18H9" />
            <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.62l-3.48-4.35A1 1 0 0 0 17.52 8H14" /><circle cx="17" cy="18" r="2" /><circle cx="7" cy="18" r="2" />
        </svg>
    );
}

/** "Sarıyer · İstanbul" gibi küçük satır (adın altında); yoksa boş. */
function placeLine(site: PublicSite): string {
    return [site.district, site.city].filter(Boolean).join(' · ');
}

/**
 * Sitenin başlığı (Tema 2): geniş ekranda üç sütun (sayfalar · ad · eylemler), dar ekranda ad + Sepet + menü düğmesi.
 * Üstte yapışık kalır; `sticky={false}` ise (akış sayfaları) sayfayla kayar. "Sepet" hapı ve + düğmeleri yalnız online
 * sipariş açıkken görünür.
 */
export function SiteHeader({ site, current, sticky = true }: { site: PublicSite; current: SitePageKey; sticky?: boolean }) {
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
    const place = placeLine(site);

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
        win.addEventListener('keydown', onKey);
        return () => win.removeEventListener('keydown', onKey);
    }, [open, win]);

    const toTop = () => { if (current === 'home') win.scrollTo({ top: 0, behavior: 'smooth' }); };
    const close = () => setOpen(false);
    const cartLabel = `Sepet, ${cart.count} ürün`;
    // Ana sayfada sepet aynı sayfadadır (menü panosu); diğer sayfalarda sipariş sayfasına gider.
    const cartPill = canOrder && (current === 'home'
        ? <a href={cart.count > 0 ? '#sepet' : '#menu'} aria-label={cartLabel} {...orderX} className={cn(headerPill, 'px-3.5 sm:px-4', orderX.className)}>Sepet <span className="text-[var(--site-accent-text)] tabular-nums">{cart.count}</span></a>
        : <Link to="/siparis" aria-label={cartLabel} aria-current={current === 'siparis' ? 'page' : undefined} {...orderX} className={cn(headerPill, 'px-3.5 sm:px-4', orderX.className)}>Sepet <span className="text-[var(--site-accent-text)] tabular-nums">{cart.count}</span></Link>);
    const menuLink = 'flex min-h-12 items-center rounded-2xl px-4 text-[17px] font-semibold text-[var(--site-text)] no-underline hover:bg-[var(--site-alt)]';

    return (
        <header className={cn(sans, sticky ? 'sticky' : 'relative', 'top-0 z-50 border-b border-[var(--site-line)] bg-[color-mix(in_srgb,var(--site-bg)_94%,transparent)] text-[var(--site-text)] backdrop-blur-[14px] transition-shadow',
            scrolled && 'shadow-[0_10px_30px_-18px_rgba(30,26,22,0.35)]')}>
            <nav aria-label="Ana menü" className="mx-auto grid max-w-[1320px] grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-2.5 sm:px-8 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:gap-4 lg:py-[18px]">
                <div className="hidden flex-wrap gap-1 lg:flex">
                    {nav.map(item => (
                        <Link key={item.key} to={item.to} aria-current={current === item.key ? 'page' : undefined}
                            className={cn('inline-flex min-h-11 items-center rounded-full px-2.5 text-sm font-semibold no-underline transition-colors hover:text-[var(--site-text)] xl:px-3',
                                current === item.key ? 'text-[var(--site-text)] underline decoration-[var(--site-accent)] decoration-2 underline-offset-[6px]' : 'text-[var(--site-sub)]')}>
                            {item.label}
                        </Link>
                    ))}
                </div>
                <Link to="/" onClick={toTop} {...nameX}
                    className={cn('flex min-w-0 flex-col items-start leading-none no-underline lg:items-center lg:justify-self-center lg:text-center', nameX.className)}>
                    <span className={cn(serif, 'max-w-full truncate text-[26px] tracking-[-0.01em] lg:text-[32px]')}>{name}</span>
                    {place && <span className="mt-1.5 hidden max-w-full truncate text-[11px] font-bold uppercase tracking-[0.28em] text-[var(--site-accent-text)] sm:block">{place}</span>}
                </Link>
                <div className="flex items-center gap-2 justify-self-end">
                    {trackPath && (
                        <Link to={trackPath} aria-label="Siparişim" title="Siparişim" className={cn(iconCircle, 'hidden sm:flex')}><TruckIcon /></Link>
                    )}
                    {cartPill}
                    {canReserve ? (
                        <Link to={RESERVATION_PATH} aria-current={current === 'rezervasyon' ? 'page' : undefined} {...reserveX}
                            className={cn(headerAccentPill, 'hidden sm:inline-flex', reserveX.className)}>Masa ayırt</Link>
                    ) : canOrder && current !== 'home' && current !== 'siparis' && (
                        <Link to="/siparis" {...orderX} className={cn(headerAccentPill, 'hidden sm:inline-flex', orderX.className)}>Sipariş ver</Link>
                    )}
                    <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open} aria-controls={panelId}
                        aria-label={open ? 'Menüyü kapat' : 'Menüyü aç'} className={cn(iconCircle, 'lg:hidden')}>
                        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                            {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 8h16M4 16h16" />}
                        </svg>
                    </button>
                </div>
            </nav>
            {open && (
                <nav id={panelId} aria-label="Sayfalar" className="border-t border-[var(--site-line)] bg-[var(--site-bg)] lg:hidden">
                    <div className="mx-auto flex max-w-[1320px] flex-col gap-0.5 px-2 py-3 sm:px-6">
                        <Link to="/" onClick={close} aria-current={current === 'home' ? 'page' : undefined} className={menuLink}>Ana sayfa</Link>
                        {nav.map(item => (
                            <Link key={item.key} to={item.to} onClick={close} aria-current={current === item.key ? 'page' : undefined} className={menuLink}>{item.label}</Link>
                        ))}
                        {canOrder && <Link to="/siparis" onClick={close} aria-current={current === 'siparis' ? 'page' : undefined} className={menuLink}>Paket sipariş</Link>}
                        {trackPath && <Link to={trackPath} onClick={close} className={menuLink}>Siparişim</Link>}
                        {canReserve && (
                            <Link to={RESERVATION_LOOKUP_PATH} onClick={close} aria-current={current === 'rezervasyon-sorgula' ? 'page' : undefined} className={menuLink}>Rezervasyon sorgula</Link>
                        )}
                        {canReserve && (
                            <Link to={RESERVATION_PATH} onClick={close} className={cn(headerAccentPill, 'mx-2 mt-2 h-12 text-[15px]')}>Masa ayırt</Link>
                        )}
                    </div>
                </nav>
            )}
        </header>
    );
}

/**
 * Sitenin çerçevesi dışındaki müşteri sayfalarının (paket sipariş, sipariş takibi) üst menüsü: sayfayla birlikte kayar
 * (bu sayfaların kendi yapışkan kategori çubuğu ve sepeti var). Alttan açılan pencerelerin (z-40) altında kalsın diye z-30.
 */
export function FlowSiteHeader({ site, current }: { site: PublicSite; current: SitePageKey }) {
    useSiteDocumentTitle(site, current);
    return (
        <div className="relative z-30">
            <SiteHeader site={site} current={current} sticky={false} />
        </div>
    );
}

// ── Telefon alt eylem çubuğu ─────────────────────────────────────────────────────────────────────

export function MobileActionBar({ actions }: { actions: MobileAction[] }) {
    const x = editExternal(useSiteEdit(), 'actions');
    if (actions.length === 0) return null;
    return (
        <nav aria-label="Hızlı eylemler" {...x}
            className={cn(x.className, "fixed inset-x-0 bottom-0 z-40 border-t border-[var(--site-line)] bg-[color-mix(in_srgb,var(--site-bg)_94%,transparent)] px-3 pb-[calc(10px+env(safe-area-inset-bottom))] pt-2.5 shadow-[0_-8px_24px_rgba(30,26,22,0.08)] backdrop-blur-[14px] md:hidden")}>
            <ul className="m-0 flex list-none gap-2 p-0">
                {actions.map(a => {
                    const cls = cn('flex h-12 w-full items-center justify-center gap-1.5 rounded-full px-2 text-sm font-bold no-underline',
                        a.primary ? 'bg-[var(--site-accent)] font-extrabold text-[var(--site-on-accent)]' : 'border border-[var(--site-border-strong)] text-[var(--site-text)]');
                    return (
                        <li key={a.key} className={cn('min-w-0', a.primary ? 'flex-[1.4]' : 'flex-1')}>
                            {a.to
                                ? <Link to={a.to} className={cls}>{a.icon}<span className="truncate">{a.label}</span></Link>
                                : <a href={a.href} target={a.key === 'ara' ? undefined : '_blank'} rel="noopener noreferrer" className={cls}>{a.icon}<span className="truncate">{a.label}</span></a>}
                        </li>
                    );
                })}
            </ul>
        </nav>
    );
}

// ── Son çağrı (footer'ın üstünde tek kart) ───────────────────────────────────────────────────────

/** "Acıktınız mı?" kartı: saat ve semt, telefon ve tek ana eylem (Paket sipariş → Masa ayırt → Menüyü gör). */
export function LastCallCard({ site }: { site: PublicSite }) {
    const canOrder = useOnlineOrderingAvailable();
    const canReserve = canReserveOnline(site);
    const hours = hoursLine(site);
    const place = site.district || site.city;
    const meta = [hours, place].filter(Boolean).join(' · ');
    const primary = canOrder
        ? { to: '/siparis', label: 'Paket sipariş' }
        : canReserve ? { to: RESERVATION_PATH, label: 'Masa ayırt' } : { to: '/menu', label: 'Menüyü gör' };
    const x = editExternal(useSiteEdit(), 'lastCall');
    return (
        <section aria-labelledby="son-cagri" className={cn(sectionWrap, 'pb-10 md:pb-16')}>
            <div {...x} className={cn(siteCardDark, 'flex flex-wrap items-center justify-between gap-5 p-6 md:px-10 md:py-9', x.className)}>
                <div className="flex min-w-0 flex-col gap-1.5">
                    <h2 id="son-cagri" className={cn(serif, 'm-0 text-[38px] leading-none md:text-[52px]')}>Acıktınız <span className="italic">mı?</span></h2>
                    {meta && <p className="m-0 text-[15px] text-[var(--site-on-paper-sub)]">{meta}</p>}
                </div>
                <div className="flex w-full flex-wrap gap-2.5 sm:w-auto">
                    {site.phone && (
                        <a href={telHref(site.phone)} className={cn(cardButton.ghost, 'h-[52px] flex-1 px-6 text-[15px] sm:flex-none')}>
                            <PhoneIcon className="h-4 w-4" />{site.phone}
                        </a>
                    )}
                    <Link to={primary.to} className={cn(cardButton.accent, 'h-[52px] flex-1 px-7 text-[15px] sm:flex-none')}>{primary.label}</Link>
                </div>
            </div>
        </section>
    );
}

// ── Ziyaret: adres · saatler · iletişim ──────────────────────────────────────────────────────────

function timeOfDay(iso: string): string {
    return new Date(iso).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Üç sütun: adres ve yol tarifi, çalışma saatleri (her gün aynıysa tek satır; değilse gün gün, bugün kalın; açıksa
 * paket siparişin son saati), telefon ve WhatsApp/Instagram. Verisi olmayan sütun çizilmez. Düzenleyicide adres ve
 * telefon (Ayarlar'dan gelir) çizilmez; saat ve iletişim burada değişir.
 */
export function VisitSection({ site, className, compact = false }: { site: PublicSite; className?: string; compact?: boolean }) {
    const edit = useSiteEdit();
    const showEmpty = Boolean(edit?.showEmpty);
    const ordering = useOnlineOrdering();
    const content = site.site;
    const address = fullAddress(site);
    const rows = weekSchedule(site);
    const uniform = !!rows && rows.every(r => r.isOpen && r.text === rows[0].text);
    const lastOrder = ordering?.state === 'open' && ordering.lastOrderAt ? timeOfDay(ordering.lastOrderAt) : null;
    const hasSocial = Boolean(content.whatsappPhone || content.instagramUrl);
    const showAddress = Boolean(address) && !edit;
    const showPhone = Boolean(site.phone) && !edit;
    const showHours = Boolean(rows) || showEmpty;
    const showContact = showPhone || hasSocial || showEmpty;
    if (!showAddress && !showHours && !showContact) return null;
    // compact: alt bilgi sütunları (küçük yazı, ince satırlar); değilse sayfa bölümü (düzenleyicide).
    const label = cn(compact ? footLabel : eyebrow, 'm-0');
    const row = cn('flex justify-between gap-4 border-b border-[var(--site-line)] last:border-b-0', compact ? 'pb-1.5 text-sm' : 'pb-2 text-base');
    const big = compact ? 'text-[17px] font-semibold leading-snug' : cn(serif, 'text-[30px] leading-[1.15]');
    const btn = compact ? 'h-11' : 'h-[46px]';
    const Wrap = compact ? 'div' : 'section';

    return (
        <Wrap aria-label="Ziyaret ve iletişim" className={cn(
            compact ? 'contents' : cn(sectionWrap, 'grid grid-cols-1 gap-10 py-16 sm:grid-cols-[repeat(auto-fit,minmax(260px,1fr))] md:py-[88px]'),
            className,
        )}>
            {showAddress && (
                <ExternalHint source="restaurant">
                    <div className="flex min-w-0 flex-col gap-3">
                        <h2 className={label}>Adres</h2>
                        <p className={cn(big, 'm-0 break-words')}>
                            {site.openAddress || address}
                            {site.openAddress && (site.district || site.city) && <><br />{[site.district, site.city].filter(Boolean).join(', ')}</>}
                        </p>
                        {content.directionsNote && <p className="m-0 text-[15px] text-[var(--site-sub)]">{content.directionsNote}</p>}
                        <a href={directionsUrl(address)} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center self-start text-[15px] font-bold underline underline-offset-4">Yol tarifi al →</a>
                    </div>
                </ExternalHint>
            )}
            {showHours && (rows ? (
                <EditableBlock target="hours" label="Çalışma saatleri" className="rounded-[16px]">
                    <div id="saatler" className="flex min-w-0 flex-col gap-3">
                        <h2 className={label}>Saatler</h2>
                        {uniform ? (
                            <div className={row}><span className="text-[var(--site-sub)]">Her gün</span><span className="tabular-nums">{rows[0].text}</span></div>
                        ) : (
                            <dl className="m-0 flex flex-col gap-2">
                                {rows.map(r => (
                                    <div key={r.day} className={cn(row, r.isToday && 'font-bold')}>
                                        <dt className={r.isToday ? 'text-[var(--site-text)]' : 'text-[var(--site-sub)]'}>{r.label}{r.isToday && <span className="sr-only"> (bugün)</span>}</dt>
                                        <dd className={cn('m-0 tabular-nums', !r.isOpen && 'text-[var(--site-muted)]')}>{r.text}</dd>
                                    </div>
                                ))}
                            </dl>
                        )}
                        {lastOrder && !edit && <div className={row}><span className="text-[var(--site-sub)]">Paket sipariş</span><span className="tabular-nums">{untilTime(lastOrder)}</span></div>}
                        {content.hoursNote && <p className="m-0 text-sm text-[var(--site-muted)]">{content.hoursNote}</p>}
                    </div>
                </EditableBlock>
            ) : <EmptySlot target="hours" title="+ Çalışma saatlerini ekle" />)}
            {showContact && (
                <div className="flex min-w-0 flex-col gap-3">
                    <h2 className={label}>İletişim</h2>
                    {showPhone && <a href={telHref(site.phone)} className={cn(big, 'self-start no-underline')}>{site.phone}</a>}
                    {(showPhone || hasSocial) && (
                        <EditableBlock target="contact" label="WhatsApp ve Instagram" className="self-start rounded-full">
                            <div className="flex flex-wrap gap-2.5">
                                {showPhone && <a href={telHref(site.phone)} className={cn(cardButton.accent, btn)}>Hemen ara</a>}
                                {content.whatsappPhone && (
                                    <a href={whatsappHref(content.whatsappPhone)} target="_blank" rel="noopener noreferrer" className={cn(cardButton.outline, btn)}>WhatsApp</a>
                                )}
                                {content.instagramUrl && (
                                    <a href={content.instagramUrl} target="_blank" rel="noopener noreferrer" className={cn(cardButton.outline, btn)}>{instagramHandle(content.instagramUrl)}</a>
                                )}
                            </div>
                        </EditableBlock>
                    )}
                    {!showPhone && !hasSocial && <EmptySlot target="contact" title="+ WhatsApp ya da Instagram ekle" />}
                </div>
            )}
        </Wrap>
    );
}

// ── Alt bilgi (Footer B · koyu blok) ─────────────────────────────────────────────────────────────

/** Süs amaçlı mini harita (gerçek harita değil): tıklayınca Google Haritalar'da yol tarifi açılır. */
function MapThumb({ href }: { href: string }) {
    return (
        <a href={href} target="_blank" rel="noopener noreferrer" aria-label="Haritada aç"
            className="relative block h-[150px] overflow-hidden rounded-2xl bg-[#2B2621] bg-[linear-gradient(rgba(246,241,233,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(246,241,233,0.05)_1px,transparent_1px)] bg-[length:24px_24px] transition-opacity hover:opacity-90">
            <span aria-hidden="true" className="absolute -left-[10%] -right-[10%] top-[46%] h-[9px] -rotate-[9deg] bg-[#3A332C]" />
            <span aria-hidden="true" className="absolute -bottom-[10%] -top-[10%] left-[60%] w-[7px] rotate-[14deg] bg-[#3A332C]" />
            <span aria-hidden="true" className="absolute right-0 top-0 h-1/2 w-[34%] rounded-bl-[60px] bg-[#24343A]" />
            <span aria-hidden="true" className="absolute left-[46%] top-[42%] h-[18px] w-[18px] rounded-full border-[3px] border-[#1E1A16] bg-[var(--site-accent)] shadow-[0_0_0_6px_rgba(246,241,233,0.12)]" />
        </a>
    );
}

function WhatsAppIcon() {
    return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 11.5a8.4 8.4 0 0 1-12.4 7.4L3 21l2.1-5.4A8.4 8.4 0 1 1 21 11.5z" /></svg>;
}

function InstagramIcon() {
    return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="5" /><circle cx="12" cy="12" r="4" /></svg>;
}

/**
 * Tema 2 alt bilgisi (Footer B): krem zemin üstünde yuvarlak köşeli koyu blok. Üstte "bugün" şeridi (açık/kapalı,
 * bugünün saatleri, paket siparişin son saati, Sipariş ver · Masa ayırt), altında adres (mini harita) · çalışma saatleri
 * (bugün vurgulu) · iletişim · sayfalar sütunları, en altta telif ve KVKK. Verisi olmayan parça çizilmez.
 * `visit={false}`: adres/saat/iletişim sütunları yok (İletişim sayfası bunları zaten gösterir).
 */
export function SiteFooter({ site, bottomBar, visit = true }: { site: PublicSite; bottomBar: boolean; visit?: boolean }) {
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

    const label = 'm-0 text-[11px] font-extrabold uppercase tracking-[0.16em] text-[var(--site-accent-on-dark)]';
    const muted = 'text-[#B8AEA2]';
    const link = 'inline-flex min-h-11 items-center self-start text-[15px] no-underline hover:opacity-75';
    const roundIcon = 'flex h-11 w-11 items-center justify-center rounded-full border border-[rgba(246,241,233,0.25)] text-[#F6F1E9] transition-colors hover:border-[#F6F1E9]';

    const todayText = [
        today ? `Bugün ${today.text}` : null,
        lastOrder ? `Paket sipariş ${untilTime(lastOrder)}` : null,
    ].filter(Boolean).join(' · ');
    const showToday = site.isOpenNow !== null || Boolean(todayText) || canOrder || canReserve;
    const showAddress = visit && Boolean(address);
    const showHours = visit && rows !== null;
    const showContact = visit && (Boolean(site.phone) || hasSocial);

    return (
        <footer className={cn(sans, 'mt-auto bg-[var(--site-bg)] px-2 pb-2 sm:px-4 sm:pb-4', bottomBar && 'pb-[calc(88px+env(safe-area-inset-bottom))] sm:pb-[calc(88px+env(safe-area-inset-bottom))] md:pb-4')}>
            <div className="mx-auto max-w-[1408px] overflow-hidden rounded-[24px] bg-[#1E1A16] text-[#F6F1E9] md:rounded-[32px]">
                <div className={cn(sectionWrap, 'flex flex-col gap-10 pt-10 md:pt-14')}>
                    {showToday && (
                        <div className="flex flex-wrap items-center justify-between gap-4 rounded-[20px] border border-[rgba(246,241,233,0.1)] bg-[rgba(246,241,233,0.06)] px-5 py-4">
                            <div className="flex flex-wrap items-center gap-x-[18px] gap-y-2.5">
                                {site.isOpenNow !== null && (
                                    <span className="inline-flex items-center gap-2 font-extrabold">
                                        <span aria-hidden="true" className={cn('h-2 w-2 rounded-full', site.isOpenNow ? 'bg-[#4ADE80]' : 'bg-[#F87171]')} />
                                        {site.isOpenNow ? 'Şu an açık' : 'Şu an kapalı'}
                                    </span>
                                )}
                                {todayText && <span className={muted}>{todayText}</span>}
                            </div>
                            {(canOrder || canReserve) && (
                                <div className="flex flex-wrap gap-2">
                                    {canOrder && <Link to="/siparis" className="inline-flex h-[46px] items-center rounded-full bg-[var(--site-accent)] px-5 text-sm font-extrabold text-[var(--site-on-accent)] no-underline transition-opacity hover:opacity-90">Sipariş ver</Link>}
                                    {canReserve && <Link to={RESERVATION_PATH} className="inline-flex h-[46px] items-center rounded-full border border-[rgba(246,241,233,0.3)] px-5 text-sm font-bold no-underline transition-colors hover:border-[#F6F1E9]">Masa ayırt</Link>}
                                </div>
                            )}
                        </div>
                    )}

                    <div className="grid grid-cols-1 gap-9 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fit,minmax(220px,1fr))]">
                        {showAddress && (
                            <div className="flex min-w-0 flex-col gap-3">
                                <h2 className={label}>Adres</h2>
                                <MapThumb href={directionsUrl(address)} />
                                <p className={cn(serif, 'm-0 break-words text-2xl leading-[1.15]')}>
                                    {site.openAddress || address}
                                    {site.openAddress && (site.district || site.city) && <><br />{[site.district, site.city].filter(Boolean).join(' / ')}</>}
                                </p>
                                {content.directionsNote && <p className={cn('m-0 text-sm', muted)}>{content.directionsNote}</p>}
                                <a href={directionsUrl(address)} target="_blank" rel="noopener noreferrer" className={cn(link, 'text-sm font-bold')}>Yol tarifi al →</a>
                            </div>
                        )}
                        {showHours && rows && (
                            <div className="flex min-w-0 flex-col gap-3">
                                <h2 className={label}>Çalışma saatleri</h2>
                                <dl className="m-0 flex flex-col">
                                    {rows.map(r => (
                                        <div key={r.day} className={cn('-mx-2.5 flex justify-between gap-4 rounded-[10px] px-2.5 py-[7px] text-sm',
                                            r.isToday ? 'bg-[rgba(246,241,233,0.1)] font-extrabold text-[#F6F1E9]' : muted)}>
                                            <dt>{r.label}{r.isToday && ' · bugün'}</dt>
                                            <dd className="m-0 tabular-nums">{r.text}</dd>
                                        </div>
                                    ))}
                                </dl>
                                {content.hoursNote && <p className={cn('m-0 text-sm', muted)}>{content.hoursNote}</p>}
                            </div>
                        )}
                        {showContact && (
                            <div className="flex min-w-0 flex-col gap-3">
                                <h2 className={label}>İletişim</h2>
                                {site.phone && <a href={telHref(site.phone)} className={cn(serif, 'self-start text-[32px] leading-none no-underline')}>{site.phone}</a>}
                                <div className="mt-1 flex gap-2">
                                    {site.phone && <a href={telHref(site.phone)} aria-label="Ara" className={roundIcon}><PhoneIcon className="h-[18px] w-[18px]" /></a>}
                                    {content.whatsappPhone && <a href={whatsappHref(content.whatsappPhone)} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" className={roundIcon}><WhatsAppIcon /></a>}
                                    {content.instagramUrl && <a href={content.instagramUrl} target="_blank" rel="noopener noreferrer" aria-label={`Instagram: ${instagramHandle(content.instagramUrl)}`} className={roundIcon}><InstagramIcon /></a>}
                                </div>
                            </div>
                        )}
                        <nav aria-label="Alt menü" className="flex min-w-0 flex-col">
                            <h2 className={cn(label, 'mb-1')}>Sayfalar</h2>
                            {nav.map(item => <Link key={item.key} to={item.to} className={link}>{item.label}</Link>)}
                            {canOrder && <Link to="/siparis" className={link}>Paket sipariş</Link>}
                            {trackPath && <Link to={trackPath} className={link}>Siparişim nerede?</Link>}
                            {canReserve && <Link to={RESERVATION_LOOKUP_PATH} className={link}>Rezervasyon sorgula</Link>}
                        </nav>
                    </div>
                </div>

                <div className={cn(sectionWrap, 'mt-12 flex flex-wrap justify-between gap-x-6 border-t border-[rgba(246,241,233,0.1)] pb-3 pt-2 text-[13px]', muted)}>
                    <span {...fixedX} className={cn('inline-flex min-h-11 items-center', fixedX.className)}>© {new Date().getFullYear()} {name} ·&nbsp;<strong className="font-bold text-[#F6F1E9]">Sophram</strong>&nbsp;ile hazırlandı</span>
                    <div className="flex flex-wrap gap-x-5">
                        <Link to="/gizlilik-politikasi" {...fixedX} className={cn('inline-flex min-h-11 items-center hover:text-[#F6F1E9]', fixedX.className)}>KVKK</Link>
                        <Link to="/login" {...fixedX} className={cn('inline-flex min-h-11 items-center hover:text-[#F6F1E9]', fixedX.className)}>Personel girişi</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}

// Sayfaya girerken en üstten başlanır (SPA geçişinde önceki sayfanın kaydırması kalmasın); adres #bölüm içeriyorsa oraya gidilir.
function useScrollOnEnter() {
    const { pathname, hash } = useLocation();
    const win = useSiteWindow();
    useEffect(() => {
        if (hash) {
            win.document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView();
            return;
        }
        win.scrollTo({ top: 0 });
    }, [pathname, hash, win]);
}

/**
 * Sitenin bir sayfası: ortak başlık + içerik + son çağrı kartı + alt bilgi + telefon alt çubuğu. `className` içerik
 * sarmalayıcısının görünümünü değiştirir; `stickyHeader={false}` başlığı sayfayla kayan hâle getirir.
 * `lastCall={false}` son çağrı kartını gizler (sayfanın kendi çağrı kartı varsa). `mobileActions` alt çubuğun
 * düğmelerini değiştirir (boş dizi: çubuk yok); verilmezse Ara · Yol tarifi · Masa ayırt. Alt bilginin ziyaret sütunları
 * İletişim'de (aynı bilgiler sayfada) yoktur.
 */
export function SitePage({ site, current, className, stickyHeader = true, lastCall = true, mobileActions, children }: {
    site: PublicSite; current: SitePageKey; className?: string; stickyHeader?: boolean; lastCall?: boolean;
    mobileActions?: MobileAction[]; children: ReactNode;
}) {
    useScrollOnEnter();
    useSiteDocumentTitle(site, current);
    const defaults = useMobileActions(site, current);
    const edit = useSiteEdit();
    // Rezervasyon akışı kendi "Devam et" düğmesini taşır: orada çubuk ve son çağrı yok.
    const inFlow = current === 'rezervasyon';
    const actions = inFlow ? [] : mobileActions ?? defaults;
    const showLastCall = lastCall && !inFlow && current !== 'rezervasyon-sorgula' && current !== 'home';
    // Adres · saatler · iletişim her sayfanın alt bilgisinde; İletişim sayfası aynı bilgileri zaten gösterir.
    const footerVisit = current !== 'iletisim';
    return (
        <SiteShell accent={site.site.accentColor} theme={site.site.theme}>
            <link rel="stylesheet" href={FONTS_HREF} precedence="default" />
            <style>{MOTION_CSS}</style>
            <div className={cn('rb-site flex min-h-screen flex-col overflow-x-clip', className ?? cn(sans, 'bg-[var(--site-bg)] text-base leading-[1.6] text-[var(--site-text)]'))}>
                {/* Düzenleyicide yalnız burada değişen bölümler çizilir: başlık, son çağrı, alt bilgi ve alt çubuk yok. */}
                {!edit && <SiteHeader site={site} current={current} sticky={stickyHeader} />}
                {children}
                {!edit && showLastCall && <LastCallCard site={site} />}
                {!edit && <SiteFooter site={site} bottomBar={actions.length > 0} visit={footerVisit} />}
                {!edit && <MobileActionBar actions={actions} />}
            </div>
        </SiteShell>
    );
}

// ── Kapak zemini ─────────────────────────────────────────────────────────────────────────────────

/** Kapak üst satırı: iki yanında (ortalıysa) ya da solunda vurgu renginde ince çizgi. */
export function Kicker({ children, centered = false, className }: { children: ReactNode; centered?: boolean; className?: string }) {
    return (
        <span className={cn('inline-flex max-w-full items-center gap-3 text-xs font-bold uppercase tracking-[0.28em] text-[var(--site-sub)]', className)}>
            <span aria-hidden="true" className="h-px w-8 shrink-0 bg-[var(--site-accent)]" />
            <span className="min-w-0">{children}</span>
            {centered && <span aria-hidden="true" className="h-px w-8 shrink-0 bg-[var(--site-accent)]" />}
        </span>
    );
}

/**
 * Tema 2 kapak zemini: fotoğraf varsa fotoğraf + açık krem perde (yazı koyu kalır); yoksa ortada iç içe ince halkalar.
 * Hazır görselse köşede "Temsili görsel".
 */
export function HeroBackdrop({ image }: { site?: PublicSite; image?: string; overlay?: string }) {
    if (image) {
        return (
            <>
                <img src={image} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover" />
                <span aria-hidden="true" className="absolute inset-0 bg-[var(--site-overlay)]" />
                {image.includes('/shared/stock/') && <StockImageLabel className="bottom-auto right-3 top-3" />}
            </>
        );
    }
    return (
        <span aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
            <span className="absolute left-1/2 top-1/2 h-[900px] w-[900px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[rgba(30,26,22,0.07)]" />
            <span className="absolute left-1/2 top-1/2 h-[640px] w-[640px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[rgba(30,26,22,0.09)]" />
            <span className="absolute left-1/2 top-1/2 h-[380px] w-[380px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[var(--site-accent-line)]" />
        </span>
    );
}

/** Başlık metni: tek kelimeyse tamamı, değilse ikinci parça italik vurgu yazısıyla. */
export function AccentTitle({ text }: { text: string }) {
    const [main, accent] = splitAccent(text);
    return <>{main && <>{main} </>}<em className="rb-accent italic">{accent}</em></>;
}

/**
 * Alt sayfaların açık girişi (Tema 2): kapak (ya da verilen) fotoğrafı açık perdeyle, yoksa halkalar; üst satır, dev
 * serif başlık (italik vurgu). `compact` kısa kapak verir; `aside` geniş ekranda başlığın sağına, dar ekranda altına gelir.
 * `children` başlığın hemen altındadır. `titleClassName` başlığın boyutunu değiştirir (Mekân'ın uzun başlığı).
 */
export function PageHero({ site, label, title, image, imageTarget = 'photo:cover', imageLabel = 'Kapak fotoğrafı', compact = false, aside, titleClassName, children }: {
    site: PublicSite; label: string; title: ReactNode;
    /** Sayfanın kendi kapağı; boşsa sitenin kapağı. */
    image?: string;
    /** Düzenleyicide kapağa tıklayınca açılan fotoğraf menüsü (ör. `photo:hero-menu`). */
    imageTarget?: string;
    imageLabel?: string;
    compact?: boolean; aside?: ReactNode; titleClassName?: string; children?: ReactNode;
}) {
    const src = image || site.site.coverImageUrl;
    const edit = useSiteEdit();
    return (
        <EditableBlock target={imageTarget} label={imageLabel} chip="Fotoğrafı değiştir" className="outline-offset-[-4px]">
        <section className={cn('relative flex flex-col overflow-hidden border-b border-[var(--site-line)]', !compact && 'min-h-[360px] md:min-h-[460px]')}>
            <HeroBackdrop image={src || undefined} />
            {edit && !src && (
                <span className="relative mx-auto mt-4 rounded-full border border-dashed border-[var(--site-border-strong)] bg-[var(--site-card)] px-4 py-2 font-[family-name:'DM_Sans',system-ui,sans-serif] text-[15px] font-semibold">
                    + Kapak fotoğrafı ekle
                </span>
            )}
            <div className={cn(sectionWrap, 'relative flex flex-1 flex-col gap-6 md:flex-row md:flex-wrap md:items-end md:justify-between',
                compact ? 'pb-10 pt-12 md:pb-14 md:pt-20' : 'justify-end pb-12 pt-16 md:pb-16 md:pt-24')}>
                <div className="flex min-w-0 max-w-[880px] flex-col gap-4">
                    {!edit && label && <Kicker>{label}</Kicker>}
                    <h1 className={cn(serif, 'm-0 break-words text-[60px] leading-[0.92] tracking-[-0.02em] md:text-[clamp(72px,8vw,128px)]', titleClassName)}>
                        {typeof title === 'string' ? <AccentTitle text={title} /> : title}
                    </h1>
                    {children}
                </div>
                {aside}
            </div>
        </section>
        </EditableBlock>
    );
}

/** İçeriği girilmemiş sayfa: kısa açıklama ve ana sayfaya/menüye dönüş. */
export function PageEmpty({ label = 'Yakında', text, children }: { label?: string; text: string; children?: ReactNode }) {
    return (
        <main className="mx-auto flex w-full max-w-[760px] flex-1 flex-col items-center gap-6 px-4 py-20 text-center sm:px-8 md:py-28">
            <span className={eyebrow}>{label}</span>
            <p className={cn(serif, 'm-0 text-[40px] leading-[1.05] md:text-[56px]')}>{text}</p>
            {children}
            <div className="flex flex-wrap justify-center gap-3 pt-2">
                <Link to="/" className={cn(heroOutlineButton, 'h-[52px] px-6')}>Ana sayfa</Link>
                <Link to="/menu" className={cn(heroAccentButton, 'h-[52px] px-6')}>Menüyü gör</Link>
            </div>
        </main>
    );
}
