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
    MOTION_CSS, RESERVATION_PATH, cardButton, eyebrow, headerAccentPill, heroAccentButton, heroOutlineButton,
    iconCircle, instagramHandle, sans, sectionWrap, serif, siteNav, untilTime, type SitePageKey,
} from './siteParts';
import { PhoneIcon } from './SiteCards';
import type { MobileAction } from './siteActions';
import { useMobileActions } from './siteActions';
import { directionsUrl, resolveDesign, splitAccent, telHref, whatsappHref } from './siteTheme';
import { fullAddress, restaurantName, useSiteDocumentTitle, weekSchedule } from './useSite';
import { forgetTableVisit, tableMenuPath, useTableVisit, VISIT_GRACE_MS } from '@/features/customerSite/tableVisit';
import { publicService } from '@/features/customerSite/api/publicService';
import { X } from 'lucide-react';
import { EditableBlock, EmptySlot, ExternalHint } from './siteEdit';
import { editExternal, useSiteEdit, useSiteWindow } from './siteEditContext';
import { useSiteDesign } from './siteDesign';
import { designLayout } from './designs/registry';
import { useHideOnScroll, useScrolled } from './useScrolled';

// Restoran sitesinin ortak çerçevesi (tasarım: "Tema 2 · Açık"): ortalı başlık (solda sayfalar, ortada serif ad ve
// küçük konum satırı, sağda sipariş takibi, Sepet ve "Masa ayırt"), ziyaret
// bilgileri (adres · saatler · iletişim), dev soluk adlı alt bilgi ve telefonda her sayfada yapışkan alt eylem çubuğu.
// Başlık sayfanın akışında durur ve üstte yapışık kalır (içeriğin üstüne binmez).

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

function FlameIcon() {
    return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
        </svg>
    );
}

/**
 * Sitenin başlığı. Sade tasarımda (Tema 2 · kutulu) krem sayfanın üstünde beyaz yuvarlak kutu: solda ad ve küçük konum
 * satırı, ortada krem hap grubunda sayfalar (açık sayfa beyaz hap), krem Sepet. Renkli tasarımda ("Renkli" üst menü) kum zeminde; solda kapak renginde yuvarlak içinde alev ve ad + konum,
 * ortada krem hap grubunda sayfalar (açık sayfa koyu hap), sağda "Siparişim" (bu cihazdan sipariş verildiyse), koyu
 * "Sepet" (online sipariş açıkken; hardal adet rozeti) ve "Masa ayırt". Dar ekranda ad + Sepet + menü düğmesi. Üstte
 * yapışık kalır (kaydırınca arkası buzlanır); `sticky={false}` ise (akış sayfaları) sayfayla kayar.
 */
export function SiteHeader({ site, current, sticky = true, overlay = false }: { site: PublicSite; current: SitePageKey; sticky?: boolean; overlay?: boolean }) {
    // Tasarımın kendi üst menüsü (tasarım kaydı; Elit: koyu, kapağı fotoğraflı sayfalarda `overlay` ile kapağın üstünde
    // saydam). Tasarım site verisinden (SiteShell dışındaki akış sayfalarında da doğru tasarım).
    const { Header = ClassicHeader } = designLayout(site.site.design);
    return <Header site={site} current={current} overlay={overlay} sticky={sticky} />;
}

function ClassicHeader({ site, current, sticky }: { site: PublicSite; current: SitePageKey; sticky: boolean; overlay?: boolean }) {
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
    // Site verisinden (SiteShell dışındaki akış sayfalarında da doğru tasarım).
    const sade = resolveDesign(site.site.design) === 'sade';
    // Aşağı kaydırınca gizlenir, yukarı kaydırınca geri gelir (telefon menüsü açıkken hep görünür).
    const hidden = useHideOnScroll(sticky) && !open;

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
        win.addEventListener('keydown', onKey);
        return () => win.removeEventListener('keydown', onKey);
    }, [open, win]);

    const toTop = () => { if (current === 'home') win.scrollTo({ top: 0, behavior: 'smooth' }); };
    const close = () => setOpen(false);
    const creamPill = sade
        ? 'inline-flex h-12 items-center gap-2 whitespace-nowrap rounded-full bg-[var(--site-bg)] px-4 text-sm font-bold text-[var(--site-text)] no-underline transition-colors hover:bg-[var(--site-alt)]'
        : 'inline-flex h-[50px] items-center gap-2 whitespace-nowrap rounded-full bg-[var(--site-card)] px-[18px] text-sm font-bold text-[var(--site-text)] no-underline transition-opacity hover:opacity-85';
    const menuLink = cn('flex min-h-12 items-center rounded-2xl px-4 text-[17px] text-[var(--site-text)] no-underline hover:bg-[var(--site-bg)]', sade ? 'font-semibold' : 'font-bold');

    return (
        <div className={cn(sans, sticky ? 'sticky' : 'relative', 'top-0 z-50 px-2 pt-2 transition-transform duration-[600ms] ease-in-out motion-reduce:transition-none',
            hidden && '-translate-y-full',
            sade ? 'sm:px-4 sm:pt-4'
                : cn('transition-[background-color,box-shadow,translate] sm:px-4 sm:pt-3.5',
                    scrolled ? 'bg-[color-mix(in_srgb,var(--site-bg)_90%,transparent)] pb-2 shadow-[0_10px_30px_-20px_rgba(36,24,15,0.45)] backdrop-blur-[12px]' : 'bg-transparent'))}>
            <header className={cn('mx-auto max-w-[1408px] text-[var(--site-text)]',
                sade && cn('rounded-[24px] bg-[var(--site-card)] transition-shadow', scrolled ? 'shadow-[0_14px_36px_-18px_rgba(30,26,22,0.35)]' : 'shadow-[0_1px_0_rgba(30,26,22,0.04)]'))}>
                <nav aria-label="Ana menü" className={cn('flex items-center justify-between gap-3', sade ? 'py-2 pl-4 pr-2 sm:py-3 sm:pl-6 sm:pr-3' : 'py-1.5 pl-1 pr-1 sm:pl-3')}>
                    {sade ? (
                        <Link to="/" onClick={toTop} {...nameX}
                            className={cn('flex min-h-11 min-w-0 items-center gap-3 leading-none text-[var(--site-text)] no-underline', nameX.className)}>
                            <span className={cn(serif, 'min-w-0 truncate text-[26px] tracking-[-0.01em] sm:text-[30px]')}>{name}</span>
                            {place && <span className="hidden shrink-0 whitespace-nowrap text-xs font-extrabold uppercase tracking-[0.22em] text-[var(--site-accent-text)] xl:inline">{place}</span>}
                        </Link>
                    ) : (
                        <Link to="/" onClick={toTop} {...nameX}
                            className={cn('flex min-h-11 min-w-0 items-center gap-2 text-[var(--site-text)] no-underline sm:gap-3', nameX.className)}>
                            <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--site-hero-bg)] text-[var(--site-mustard)] sm:h-[46px] sm:w-[46px]"><FlameIcon /></span>
                            <span className="flex min-w-0 flex-col leading-none">
                                <span className={cn(serif, 'truncate text-[19px] font-extrabold sm:text-[26px]')}>{name}</span>
                                {place && <span className="mt-1 hidden truncate text-xs font-extrabold uppercase tracking-[0.2em] text-[var(--site-accent-text)] sm:block">{place}</span>}
                            </span>
                        </Link>
                    )}
                    <div className={cn('hidden gap-0.5 rounded-full lg:flex', sade ? 'bg-[var(--site-bg)] p-1' : 'bg-[var(--site-card)] p-[5px]')}>
                        {nav.map(item => {
                            const on = current === item.key;
                            return (
                                <Link key={item.key} to={item.to} aria-current={on ? 'page' : undefined}
                                    className={cn('inline-flex h-11 items-center whitespace-nowrap rounded-full text-sm no-underline transition-colors',
                                        sade
                                            ? cn('px-4', on ? 'bg-[var(--site-card)] font-bold text-[var(--site-text)] shadow-[0_1px_2px_rgba(30,26,22,0.08)]' : 'font-semibold text-[var(--site-sub)] hover:text-[var(--site-text)]')
                                            : cn('px-[18px]', on ? 'bg-[var(--site-paper)] font-extrabold text-[var(--site-on-paper)]' : 'font-bold text-[var(--site-text)] hover:bg-[var(--site-bg)]'))}>
                                    {item.label}
                                </Link>
                            );
                        })}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                        {trackPath && (
                            <Link to={trackPath} className={cn(creamPill, 'hidden md:inline-flex')}><TruckIcon />Siparişim</Link>
                        )}
                        {canOrder && (
                            <Link to="/siparis" aria-label={`Sepet, ${cart.count} ürün`} aria-current={current === 'siparis' ? 'page' : undefined} {...orderX}
                                className={cn(sade ? cn(creamPill, 'px-3.5 sm:px-4')
                                    : 'inline-flex h-[50px] items-center gap-2.5 whitespace-nowrap rounded-full bg-[var(--site-paper)] py-0 pl-3.5 pr-2 text-sm font-bold text-[var(--site-on-paper)] no-underline transition-opacity hover:opacity-90 sm:pl-[18px]', orderX.className)}>
                                Sepet
                                <span className={cn('inline-flex items-center justify-center rounded-full font-extrabold tabular-nums',
                                    sade ? 'h-6 min-w-6 bg-[var(--site-paper)] px-1.5 text-xs text-[var(--site-on-paper)]' : 'h-[34px] min-w-[34px] bg-[var(--site-mustard)] px-2 text-[var(--site-text)]')}>{cart.count}</span>
                            </Link>
                        )}
                        {canReserve ? (
                            <Link to={RESERVATION_PATH} aria-current={current === 'rezervasyon' ? 'page' : undefined} {...reserveX}
                                className={cn(headerAccentPill, 'hidden h-[50px] px-[22px] sm:inline-flex', reserveX.className)}>Masa ayırt</Link>
                        ) : canOrder && current !== 'siparis' && (
                            <Link to="/siparis" {...orderX} className={cn(headerAccentPill, 'hidden h-[50px] px-[22px] sm:inline-flex', orderX.className)}>Sipariş ver</Link>
                        )}
                        <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open} aria-controls={panelId}
                            aria-label={open ? 'Menüyü kapat' : 'Menüyü aç'} className={cn(iconCircle, 'border-0 lg:hidden', sade ? 'h-12 w-12 bg-[var(--site-bg)]' : 'h-[50px] w-[50px] bg-[var(--site-card)]')}>
                            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
                                {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 8h16M4 16h16" />}
                            </svg>
                        </button>
                    </div>
                </nav>
                {open && (
                    <nav id={panelId} aria-label="Sayfalar" className={cn('lg:hidden', sade ? 'border-t border-[var(--site-line)]' : 'mt-2 rounded-[24px] bg-[var(--site-card)] shadow-[0_16px_40px_-20px_rgba(36,24,15,0.4)]')}>
                        <div className="flex flex-col gap-0.5 px-2 py-3">
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
        </div>
    );
}

/**
 * Sitenin çerçevesi dışındaki müşteri sayfalarının (paket sipariş, sipariş takibi) üst menüsü. Paket siparişte sayfayla
 * birlikte kayar (orası menü gibidir: kendi yapışkan kategori çubuğu ve sepeti var); `sticky` verilirse (sipariş takibi)
 * üstte yapışık kalır. Alttan açılan pencerelerin (z-40) altında kalsın diye z-30.
 */
export function FlowSiteHeader({ site, current, sticky = false }: { site: PublicSite; current: SitePageKey; sticky?: boolean }) {
    useSiteDocumentTitle(site, current);
    return (
        <div className={cn(sticky ? 'sticky top-0' : 'relative', 'z-30')}>
            <SiteHeader site={site} current={current} sticky={sticky} />
        </div>
    );
}

// ── Telefon alt eylem çubuğu ─────────────────────────────────────────────────────────────────────

export function MobileActionBar({ actions }: { actions: MobileAction[] }) {
    const x = editExternal(useSiteEdit(), 'actions');
    // Elit: köşesiz, büyük harfli düğmeler (tasarım kaydı `mobileBar`).
    const elit = designLayout(useSiteDesign()).mobileBar === 'square';
    if (actions.length === 0) return null;
    return (
        <nav aria-label="Hızlı eylemler" {...x}
            className={cn(x.className, "fixed inset-x-0 bottom-0 z-40 border-t border-[var(--site-line)] bg-[color-mix(in_srgb,var(--site-bg)_94%,transparent)] px-3 pb-[calc(10px+env(safe-area-inset-bottom))] pt-2.5 shadow-[0_-8px_24px_rgba(30,26,22,0.08)] backdrop-blur-[14px] md:hidden")}>
            <ul className="m-0 flex list-none gap-2 p-0">
                {actions.map(a => {
                    const cls = cn('flex h-12 w-full items-center justify-center gap-1.5 px-2 no-underline',
                        elit ? 'text-xs font-medium uppercase tracking-[0.06em]' : 'rounded-full text-sm font-bold',
                        a.primary ? cn('bg-[var(--site-accent)] text-[var(--site-on-accent)]', elit ? 'bg-[var(--site-paper)] text-[var(--site-on-paper)]' : 'font-extrabold')
                            : 'border border-[var(--site-border-strong)] text-[var(--site-text)]');
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

// ── Ziyaret: adres · saatler · iletişim ──────────────────────────────────────────────────────────

function timeOfDay(iso: string): string {
    return new Date(iso).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Üç sütun: adres ve yol tarifi, çalışma saatleri (her gün aynıysa tek satır; değilse gün gün, bugün kalın; açıksa
 * paket siparişin son saati), telefon ve WhatsApp/Instagram. Verisi olmayan sütun çizilmez. Düzenleyicide adres ve
 * telefon (Ayarlar'dan gelir) çizilmez; saat ve iletişim burada değişir.
 */
export function VisitSection({ site, className }: { site: PublicSite; className?: string }) {
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
    const label = cn(eyebrow, 'm-0');
    const row = 'flex justify-between gap-4 border-b border-[var(--site-line)] pb-2 text-base last:border-b-0';
    const big = cn(serif, 'text-[30px] leading-[1.15]');
    const btn = 'h-[46px]';

    return (
        <section aria-label="Ziyaret ve iletişim" className={cn(sectionWrap, 'grid grid-cols-1 gap-10 py-16 sm:grid-cols-[repeat(auto-fit,minmax(260px,1fr))] md:py-[88px]', className)}>
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
        </section>
    );
}

// ── Alt bilgi (Footer B · Renkli: zeytin, Sade: kum tonu; renkler --site-footer-* değişkenlerinde) ─────────────────────────────────────────────────────────────

/** Süs amaçlı mini harita (gerçek harita değil): tıklayınca Google Haritalar'da yol tarifi açılır. */
function MapThumb({ href }: { href: string }) {
    return (
        <a href={href} target="_blank" rel="noopener noreferrer" aria-label="Haritada aç"
            className="relative block h-[150px] overflow-hidden rounded-2xl bg-[var(--site-footer-map)] bg-[linear-gradient(color-mix(in_srgb,var(--site-on-footer)_6%,transparent)_1px,transparent_1px),linear-gradient(90deg,color-mix(in_srgb,var(--site-on-footer)_6%,transparent)_1px,transparent_1px)] bg-[length:24px_24px] transition-opacity hover:opacity-90">
            <span aria-hidden="true" className="absolute -left-[10%] -right-[10%] top-[46%] h-[9px] -rotate-[9deg] bg-[var(--site-footer-road)]" />
            <span aria-hidden="true" className="absolute -bottom-[10%] -top-[10%] left-[60%] w-[7px] rotate-[14deg] bg-[var(--site-footer-road)]" />
            <span aria-hidden="true" className="absolute right-0 top-0 h-1/2 w-[34%] rounded-bl-[60px] bg-[var(--site-footer-water)]" />
            <span aria-hidden="true" className="absolute left-[46%] top-[42%] h-[18px] w-[18px] rounded-full border-[3px] border-[var(--site-footer-bg)] bg-[var(--site-accent)] shadow-[0_0_0_6px_color-mix(in_srgb,var(--site-on-footer)_12%,transparent)]" />
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
 * Alt bilgi (Footer B, "Zeytin" tonu — Renkli tasarımın varsayılanı): kum zemin üstünde yuvarlak köşeli zeytin yeşili blok. Üstte "bugün" şeridi (açık/kapalı,
 * bugünün saatleri, paket siparişin son saati, Sipariş ver · Masa ayırt), altında adres (mini harita) · çalışma saatleri
 * (bugün vurgulu) · iletişim · sayfalar sütunları, en altta telif ve KVKK. Verisi olmayan parça çizilmez.
 * `visit={false}`: adres/saat/iletişim sütunları yok (İletişim sayfası bunları zaten gösterir).
 */
export function SiteFooter({ site, bottomBar, visit = true }: { site: PublicSite; bottomBar: boolean; visit?: boolean }) {
    const { Footer = ClassicFooter } = designLayout(site.site.design);
    return <Footer site={site} bottomBar={bottomBar} visit={visit} />;
}

function ClassicFooter({ site, bottomBar, visit }: { site: PublicSite; bottomBar: boolean; visit: boolean }) {
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

    const label = 'm-0 text-xs font-extrabold uppercase tracking-[0.16em] text-[var(--site-accent-on-sand)]';
    const muted = 'text-[var(--site-footer-muted)]';
    const link = 'inline-flex min-h-11 items-center self-start text-[15px] no-underline hover:opacity-75';
    const roundIcon = 'flex h-11 w-11 items-center justify-center rounded-full border border-[color-mix(in_srgb,var(--site-on-footer)_30%,transparent)] text-[var(--site-on-footer)] transition-colors hover:border-[var(--site-on-footer)]';

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
            <div className="mx-auto max-w-[1408px] overflow-hidden rounded-[24px] bg-[var(--site-footer-bg)] text-[var(--site-on-footer)] md:rounded-[36px]">
                <div className={cn(sectionWrap, 'flex flex-col gap-10 pt-10 md:pt-14')}>
                    {showToday && (
                        <div className="flex flex-wrap items-center justify-between gap-4 rounded-[20px] border border-[color-mix(in_srgb,var(--site-on-footer)_14%,transparent)] bg-[color-mix(in_srgb,var(--site-on-footer)_7%,transparent)] px-5 py-4">
                            <div className="flex flex-wrap items-center gap-x-[18px] gap-y-2.5">
                                {site.isOpenNow !== null && (
                                    <span className="inline-flex items-center gap-2 font-extrabold">
                                        <span aria-hidden="true" className={cn('h-2 w-2 rounded-full', site.isOpenNow ? 'bg-[var(--site-dot-ok)]' : 'bg-[var(--site-dot-bad)]')} />
                                        {site.isOpenNow ? 'Şu an açık' : 'Şu an kapalı'}
                                    </span>
                                )}
                                {todayText && <span className={muted}>{todayText}</span>}
                            </div>
                            {(canOrder || canReserve) && (
                                <div className="flex flex-wrap gap-2">
                                    {canOrder && <Link to="/siparis" className="inline-flex h-[46px] items-center rounded-full bg-[var(--site-accent)] px-5 text-sm font-extrabold text-[var(--site-on-accent)] no-underline transition-opacity hover:opacity-90">Sipariş ver</Link>}
                                    {canReserve && <Link to={RESERVATION_PATH} className="inline-flex h-[46px] items-center rounded-full border border-[color-mix(in_srgb,var(--site-on-footer)_40%,transparent)] px-5 text-sm font-bold no-underline transition-colors hover:border-[var(--site-on-footer)]">Masa ayırt</Link>}
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
                                            r.isToday ? 'bg-[color-mix(in_srgb,var(--site-on-footer)_12%,transparent)] font-extrabold text-[var(--site-on-footer)]' : muted)}>
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
                                {site.phone && <a href={telHref(site.phone)} className={cn(serif, 'inline-flex min-h-11 items-center self-start text-[32px] leading-none no-underline')}>{site.phone}</a>}
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

                <div className={cn(sectionWrap, 'mt-12 flex flex-wrap justify-between gap-x-6 border-t border-[color-mix(in_srgb,var(--site-on-footer)_15%,transparent)] pb-3 pt-2 text-[13px]', muted)}>
                    <span {...fixedX} className={cn('inline-flex min-h-11 items-center', fixedX.className)}>© {new Date().getFullYear()} {name} ·&nbsp;<strong className="font-bold text-[var(--site-on-footer)]">Sophram</strong>&nbsp;ile hazırlandı</span>
                    <div className="flex flex-wrap gap-x-5">
                        <Link to="/gizlilik-politikasi" {...fixedX} className={cn('inline-flex min-h-11 items-center hover:text-[var(--site-on-footer)]', fixedX.className)}>KVKK</Link>
                        <Link to="/login" {...fixedX} className={cn('inline-flex min-h-11 items-center hover:text-[var(--site-on-footer)]', fixedX.className)}>Personel girişi</Link>
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
 * Sitenin bir sayfası: ortak başlık + içerik + alt bilgi + telefon alt çubuğu. `className` içerik
 * sarmalayıcısının görünümünü değiştirir. Başlık her sayfada üstte yapışık kalır; `stickyHeader={false}` (yalnız Menü
 * sayfası) başlığı sayfayla kayan hâle getirir.
 * `mobileActions` alt çubuğun
 * düğmelerini değiştirir (boş dizi: çubuk yok); verilmezse Ara · Yol tarifi · Masa ayırt. Alt bilginin ziyaret sütunları
 * İletişim'de (aynı bilgiler sayfada) yoktur. `overlayHeader`: Elit'te üst menü sayfanın tam genişlik kapağının üstünde
 * saydam durur (kapak onun yerini bırakır; yapışıksa kaydırınca koyu zemin alır); diğer tasarımlarda etkisi yok.
 */
export function SitePage({ site, current, className, stickyHeader = true, overlayHeader = false, mobileActions, children }: {
    site: PublicSite; current: SitePageKey; className?: string; stickyHeader?: boolean; overlayHeader?: boolean;
    mobileActions?: MobileAction[]; children: ReactNode;
}) {
    useScrollOnEnter();
    useSiteDocumentTitle(site, current);
    const defaults = useMobileActions(site, current);
    const edit = useSiteEdit();
    // Rezervasyon akışı kendi "Devam et" düğmesini taşır: orada alt çubuk yok.
    const inFlow = current === 'rezervasyon';
    const actions = inFlow ? [] : mobileActions ?? defaults;
    // Adres · saatler · iletişim her sayfanın alt bilgisinde; İletişim sayfası aynı bilgileri zaten gösterir.
    const footerVisit = current !== 'iletisim';
    const layout = designLayout(site.site.design);
    return (
        <SiteShell accent={site.site.accentColor} theme={site.site.theme} design={site.site.design} font={site.site.font}>
            <style>{MOTION_CSS}</style>
            {layout.flowCss && <style>{layout.flowCss}</style>}
            <div className={cn('rb-site relative flex min-h-screen flex-col overflow-x-clip', layout.flowClass, className ?? cn(sans, 'bg-[var(--site-bg)] text-base leading-[1.6] text-[var(--site-text)]'))}>
                {/* Düzenleyicide yalnız burada değişen bölümler çizilir: başlık, alt bilgi ve alt çubuk yok. */}
                {!edit && <TableVisitStrip />}
                {!edit && <SiteHeader site={site} current={current} sticky={stickyHeader} overlay={overlayHeader} />}
                {children}
                {!edit && <SiteFooter site={site} bottomBar={actions.length > 0} visit={footerVisit} />}
                {!edit && <MobileActionBar actions={actions} />}
            </div>
        </SiteShell>
    );
}

/**
 * Bu sekmede masa QR'ı okutulduysa (müşteri masada) sitenin en üstünde ince şerit: masanın adı ve masa menüsüne dönüş.
 * Masadaki müşteriye paket siparişin sepeti, teslimat ücreti ve mahallesi gösterilmez (useSiteCart kapanır); siparişi
 * masanın menüsünden verir.
 */
function TableVisitStrip() {
    const visit = useTableVisit();
    const tableId = visit?.tableId;
    const savedAt = visit?.savedAt ?? 0;
    // Müşteri masadan kalkıp gitmiş olabilir (sekme telefonda açık kalır): masada açık hesap yoksa ve QR yeni
    // okutulmadıysa masa bilgisi düşer, site normal (paket sipariş) davranır.
    useEffect(() => {
        if (!tableId || Date.now() - savedAt < VISIT_GRACE_MS) return;
        let cancelled = false;
        publicService.getTableBill(tableId)
            .then(bill => { if (!cancelled && (!bill.hasBill || bill.isPaid)) forgetTableVisit(); })
            .catch(() => { /* bağlantı yoksa şerit kalır; 2 saat sonra kendiliğinden düşer */ });
        return () => { cancelled = true; };
    }, [tableId, savedAt]);
    if (!visit) return null;
    return (
        <div role="region" aria-label="Masanız" className="relative z-40 bg-[var(--site-accent)] text-[var(--site-on-accent)]">
            <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-1.5 text-[14px] sm:px-6">
                <span className="min-w-0 font-semibold">{visit.tableName} · Siparişinizi masanın menüsünden verebilirsiniz.</span>
                <span className="flex shrink-0 items-center gap-1">
                    <Link to={tableMenuPath(visit)} className="inline-flex min-h-10 items-center font-bold text-inherit underline underline-offset-4">Masa menüsüne dön</Link>
                    <button type="button" onClick={forgetTableVisit} aria-label="Masada değilim, şeridi kapat" title="Masada değilim"
                        className="inline-flex h-10 w-10 items-center justify-center rounded-full text-inherit hover:bg-black/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current">
                        <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                </span>
            </div>
        </div>
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
