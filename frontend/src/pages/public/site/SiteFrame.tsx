import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { canReserveOnline, type PublicSite } from '@/features/customerSite/types';
import { cn } from '@/lib/utils';
import { useOnlineOrderingAvailable } from '@/features/delivery/useOnlineOrderingAvailable';
import { RESERVATION_LOOKUP_PATH } from '@/features/customerSite/reservationCode';
import { SiteShell } from './SiteChrome';
import {
    FONTS_HREF, MOTION_CSS, RESERVATION_PATH, cardButton, cardLink, instagramHandle, line, sans, serif, siteCard, siteCardDark,
    siteNav, underlineLink, type SitePageKey,
} from './siteParts';
import { HoursBlock, InfoCard, OpenBadge, PhoneIcon } from './SiteCards';
import type { MobileAction } from './siteActions';
import { useMobileActions } from './siteActions';
import { collagePhotos } from './siteMedia';
import { directionsUrl, telHref, whatsappHref } from './siteTheme';
import { fullAddress, hoursLine, restaurantName, useSiteDocumentTitle } from './useSite';
import { EditableBlock, EditableText } from './siteEdit';
import { editExternal, editTarget, useSiteEdit, useSitePreview, useSiteWindow } from './siteEditContext';

// Restoran sitesinin ortak çerçevesi (ana sayfa, menü, Hakkımızda, Mekân, İletişim, Rezervasyon):
// sayfanın üstüne sabitlenen ve kaydırınca küçülüp cam bir hapa dönüşen başlık (Başlık A), footer'ın üstünde tek
// "son çağrı" kartı, hareketli açık alt bilgi (Footer B) ve telefonda her sayfada yapışkan alt eylem çubuğu.

const SCROLL_THRESHOLD = 24;
const ease = 'duration-500 ease-[cubic-bezier(0.2,0.7,0.2,1)] motion-reduce:transition-none';

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

/** Başlık sayfanın üstüne bindiğinden (fixed ya da absolute) sayfanın en üstünde onun yüksekliği kadar boşluk bırakılır; kaydırınca sayfa kaymaz. */
export function HeaderSpacer() {
    // Düzenleyicide başlık çizilmez (burada değişmez): kapakta yalnız küçük bir boşluk kalır.
    const edit = useSiteEdit();
    return <div aria-hidden="true" className={edit ? 'h-6 shrink-0' : 'h-[86px] shrink-0 md:h-[106px]'} />;
}

/**
 * Sitenin başlığı. En üstte koyu giriş görselinin üstünde şeffaf ve geniş; sayfa kaydırılınca üstte sabit kalır,
 * küçülür ve koyu cam bir hapa dönüşür (açık bölümlerin üstünde de okunur). Dar ekranda bağlantılar açılır menüde.
 * `sticky={false}` ise (menü sayfası) başlık sayfayla birlikte yukarı kayıp gider, hapa dönüşmez.
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
    const canOrder = useOnlineOrderingAvailable();

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
        win.addEventListener('keydown', onKey);
        return () => win.removeEventListener('keydown', onKey);
    }, [open, win]);

    const toTop = () => { if (current === 'home') win.scrollTo({ top: 0, behavior: 'smooth' }); };
    const compact = scrolled || open;

    return (
        <div className={cn(sticky ? 'fixed' : 'absolute', 'inset-x-0 top-0 z-50 transition-[padding]', ease, compact ? 'px-3 pt-3 md:px-6 md:pt-4' : 'px-0 pt-0')}>
            <header className={cn(sans,
                'mx-auto grid grid-cols-[minmax(0,1fr)_auto] items-center border text-[13px] font-medium uppercase text-white transition-all xl:grid-cols-[1fr_auto_1fr]',
                ease,
                compact
                    ? 'max-w-[1440px] gap-3 rounded-[36px] border-white/15 bg-[rgba(26,22,19,0.82)] py-2 pl-5 pr-2 tracking-[0.12em] shadow-[0_12px_32px_rgba(0,0,0,0.22)] backdrop-blur-[14px] md:pl-7'
                    : 'max-w-[2560px] gap-4 rounded-[0px] border-transparent bg-transparent px-5 py-5 tracking-[0.14em] md:px-12 md:py-7')}
            >
                {/* Masaüstü bağlantıları hiç alt satıra inmez (whitespace-nowrap). Ad ortada kalsın diye iki yan sütun eşit;
                    beş bağlantının sığması için xl'den itibaren gösterilir, 2xl'e kadar biraz küçük yazı ve dar aralıkla. */}
                <nav aria-label="Ana menü" className={cn('hidden items-center whitespace-nowrap text-[12px] transition-[gap] xl:flex 2xl:text-[13px]', ease,
                    compact ? 'gap-4 tracking-[0.08em] 2xl:gap-5 2xl:tracking-[0.12em]' : 'gap-5 tracking-[0.1em] 2xl:gap-7 2xl:tracking-[0.14em]')}>
                    {nav.map(item => (
                        <Link key={item.key} to={item.to} aria-current={current === item.key ? 'page' : undefined}
                            className={cn(underlineLink, 'text-white', current === item.key && 'bg-[length:100%_1px]')}>
                            {item.label}
                        </Link>
                    ))}
                    {canReserve && (
                        <Link to={RESERVATION_LOOKUP_PATH} aria-current={current === 'rezervasyon-sorgula' ? 'page' : undefined} {...reserveX}
                            className={cn(underlineLink, 'text-white', current === 'rezervasyon-sorgula' && 'bg-[length:100%_1px]', reserveX.className)}>
                            Rezervasyon sorgula
                        </Link>
                    )}
                </nav>
                <Link to="/" onClick={toTop} {...nameX}
                    className={cn(serif, nameX.className, 'min-w-0 truncate normal-case italic leading-none tracking-normal text-white transition-[font-size] xl:max-w-full xl:justify-self-center', ease,
                        compact ? 'text-[22px] md:text-[24px]' : 'text-[22px] sm:text-[26px] md:text-[30px]')}>
                    {name}
                </Link>
                <div className="flex items-center gap-2 justify-self-end">
                    <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open} aria-controls={panelId}
                        aria-label={open ? 'Menüyü kapat' : 'Menüyü aç'}
                        className={cn('flex items-center justify-center rounded-full border border-white/35 text-white transition-all xl:hidden', ease, compact ? 'h-10 w-10' : 'h-11 w-11')}>
                        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                            {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 8h16M4 16h16" />}
                        </svg>
                    </button>
                    {canOrder && (
                        <Link to="/siparis" aria-current={current === 'siparis' ? 'page' : undefined} {...orderX}
                            className={cn(orderX.className, 'hidden items-center whitespace-nowrap rounded-full border px-4 transition-all sm:flex sm:px-5', ease,
                                current === 'siparis' ? 'border-white' : 'border-white/40',
                                compact
                                    ? 'h-10 text-white hover:bg-white/10'
                                    : 'h-11 bg-white/15 text-white backdrop-blur-[12px] hover:bg-white/25')}>
                            Paket sipariş
                        </Link>
                    )}
                    {canReserve && (
                        <Link to={RESERVATION_PATH} aria-current={current === 'rezervasyon' ? 'page' : undefined} {...reserveX}
                            className={cn(reserveX.className, 'hidden items-center whitespace-nowrap rounded-full border px-4 transition-all sm:flex sm:px-5', ease,
                                compact
                                    ? 'h-10 border-white bg-white text-[#141414] hover:bg-white/90'
                                    : 'h-11 border-white/40 bg-white/15 text-white backdrop-blur-[12px] hover:bg-white/25')}>
                            Masa ayırt
                        </Link>
                    )}
                </div>
            </header>
            {open && (
                <nav id={panelId} aria-label="Sayfalar"
                    className="mx-auto mt-2 flex max-w-[1440px] flex-col rounded-[28px] border border-white/15 bg-[rgba(26,22,19,0.94)] p-3 text-white shadow-[0_16px_40px_rgba(0,0,0,0.28)] backdrop-blur-[14px] xl:hidden">
                    <Link to="/" onClick={() => setOpen(false)} aria-current={current === 'home' ? 'page' : undefined}
                        className={cn(serif, 'rounded-2xl px-4 py-2.5 text-[30px] italic leading-tight text-white hover:bg-white/10')}>Ana sayfa</Link>
                    {nav.map(item => (
                        <Link key={item.key} to={item.to} onClick={() => setOpen(false)} aria-current={current === item.key ? 'page' : undefined}
                            className={cn(serif, 'rounded-2xl px-4 py-2.5 text-[30px] leading-tight text-white hover:bg-white/10', current === item.key && 'italic')}>
                            {item.label}
                        </Link>
                    ))}
                    {canOrder && (
                        <Link to="/siparis" onClick={() => setOpen(false)} aria-current={current === 'siparis' ? 'page' : undefined}
                            className={cn(serif, 'rounded-2xl px-4 py-2.5 text-[30px] leading-tight text-white hover:bg-white/10', current === 'siparis' && 'italic')}>
                            Paket sipariş
                        </Link>
                    )}
                    {canReserve && (
                        <>
                            <Link to={RESERVATION_PATH} onClick={() => setOpen(false)}
                                className={cn(serif, 'rounded-2xl px-4 py-2.5 text-[30px] leading-tight text-white hover:bg-white/10', current === 'rezervasyon' && 'italic')}>
                                Masa ayırt
                            </Link>
                            <Link to={RESERVATION_LOOKUP_PATH} onClick={() => setOpen(false)} aria-current={current === 'rezervasyon-sorgula' ? 'page' : undefined}
                                className={cn(serif, 'rounded-2xl px-4 py-2.5 text-[30px] leading-tight text-white hover:bg-white/10', current === 'rezervasyon-sorgula' && 'italic')}>
                                Rezervasyon sorgula
                            </Link>
                        </>
                    )}
                </nav>
            )}
        </div>
    );
}

/**
 * Sitenin çerçevesi dışındaki müşteri sayfalarının (paket sipariş, sipariş takibi) üst menüsü: koyu kapağın üstünde durur,
 * sayfayla birlikte kayar (bu sayfaların kendi yapışkan kategori çubuğu ve sepeti var). Alttan açılan pencerelerin (z-40)
 * altında kalsın diye z-30 katmanında; kapak üstte `HeaderSpacer` kadar boşluk bırakmalı.
 */
export function FlowSiteHeader({ site, current }: { site: PublicSite; current: SitePageKey }) {
    useSiteDocumentTitle(site, current);
    return (
        <div className="relative z-30">
            <SiteHeader site={site} current={current} sticky={false} />
        </div>
    );
}

// Görünür olunca bir kez açılır (alt bilgi kartlarının belirmesi). Öğe ekrana girmeden biraz önce açılır; IntersectionObserver
// yoksa, öğe ilk çizimde zaten ekrandaysa ya da sayfa yazdırılırsa hemen görünür (içerik hiçbir durumda gizli kalmaz).
function useReveal<T extends Element>() {
    const ref = useRef<T>(null);
    // Düzenleyicinin önizlemesinde kartlar hep görünür.
    const inPreview = useSitePreview() !== null;
    const [shown, setShown] = useState(() => inPreview || typeof IntersectionObserver === 'undefined');
    useEffect(() => {
        const el = ref.current;
        if (!el || shown) return;
        const show = () => setShown(true);
        if (el.getBoundingClientRect().top < window.innerHeight) {
            show();
            return;
        }
        const observer = new IntersectionObserver(entries => {
            if (entries.some(e => e.isIntersecting)) show();
        }, { rootMargin: '0px 0px 15% 0px' });
        observer.observe(el);
        window.addEventListener('beforeprint', show);
        return () => {
            observer.disconnect();
            window.removeEventListener('beforeprint', show);
        };
    }, [shown]);
    return { ref, shown };
}

// ── Telefon alt eylem çubuğu ─────────────────────────────────────────────────────────────────────

export function MobileActionBar({ actions }: { actions: MobileAction[] }) {
    const x = editExternal(useSiteEdit(), 'actions');
    if (actions.length === 0) return null;
    return (
        <nav aria-label="Hızlı eylemler" {...x}
            className={cn(x.className, "fixed inset-x-0 bottom-0 z-40 border-t border-[var(--site-border)] bg-[color-mix(in_srgb,var(--site-card)_92%,transparent)] px-3 pb-[calc(10px+env(safe-area-inset-bottom))] pt-2.5 shadow-[0_-8px_24px_rgba(0,0,0,0.08)] backdrop-blur-[14px] md:hidden")}>
            <ul className="m-0 flex list-none gap-2 p-0">
                {actions.map(a => {
                    const cls = cn('flex h-12 w-full items-center justify-center gap-2 rounded-full px-3 text-[15px] font-semibold no-underline',
                        a.primary ? 'bg-[var(--site-accent)] font-bold text-[var(--site-on-accent)]' : 'border border-[var(--site-border-strong)] text-[var(--site-text)]');
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
        <section aria-labelledby="son-cagri" className="mx-auto w-full max-w-[1344px] px-5 pb-8 md:px-12 md:pb-12">
            <div {...x} className={cn(siteCardDark, 'flex flex-wrap items-center justify-between gap-5 p-6 md:rounded-[24px] md:px-10 md:py-8', x.className)}>
                <div className="flex min-w-0 flex-col gap-1.5">
                    <h2 id="son-cagri" className={cn(serif, 'm-0 text-[36px] leading-none md:text-[48px]')}>Acıktınız <span className="italic">mı?</span></h2>
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

const MARQUEE_MIN_CHARS = 160; // 44px serifte bir kopyanın geniş ekranı doldurması için

/**
 * Açık alt bilgi (Footer B): ince çizgiler arasında yavaşça kayan restoran adı, görününce sırayla beliren üç kart
 * (ad + menü — alt yazı yoksa kategori çipleri —, ziyaret ve iletişim, çalışma saatleri; dar ekranda alt alta),
 * alt satırda telif ve sayfalar. Verisi girilmemiş kart ya da satır çizilmez. Hareket azaltma tercihinde kayma ve belirme olmaz.
 */
export function SiteFooter({ site, bottomBar }: { site: PublicSite; bottomBar: boolean }) {
    const { ref, shown } = useReveal<HTMLDivElement>();
    const edit = useSiteEdit();
    const nameX = editExternal(edit, 'restaurant');
    const menuX = editExternal(edit, 'menu');
    const fixedX = editExternal(edit, 'fixed');
    const contactT = editTarget(edit, 'contact', 'WhatsApp, Instagram');
    const contactId = useId();
    const hoursId = useId();
    const name = restaurantName(site);
    const content = site.site;
    const address = fullAddress(site);
    const hasHours = Boolean(hoursLine(site));
    const nav = siteNav(site);
    const canReserve = canReserveOnline(site);

    const unit = `${name} ✦ `;
    const repeat = Math.max(2, Math.ceil(MARQUEE_MIN_CHARS / unit.length));
    const reveal = (step: number) => ({
        className: cn('transition-[opacity,transform] duration-700 ease-out motion-reduce:transition-none',
            shown ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0 motion-reduce:translate-y-0 motion-reduce:opacity-100'),
        style: { transitionDelay: shown ? `${step * 110}ms` : '0ms' },
    });
    // Arkada kapak fotoğrafı (kapaklarla aynı görsel), üstünde zemin renginde perde: yazılar ve kartlar okunur kalır.
    const photo = content.coverImageUrl;
    const photoStyle = photo ? {
        backgroundImage: `linear-gradient(180deg, color-mix(in srgb, var(--site-bg) 92%, transparent), color-mix(in srgb, var(--site-bg) 80%, transparent)), url(${JSON.stringify(photo)})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
    } : undefined;
    const textLink = 'self-start text-[15px] text-[var(--site-text)] transition-colors hover:text-[var(--site-accent-text)]';
    const bottomLink = cn(underlineLink, 'text-[var(--site-sub)]');
    const cardPad = cn('md:p-[26px]', photo && 'shadow-[0_6px_24px_rgba(20,16,12,0.08)]');
    const chips = site.categories.slice(0, 6);

    return (
        <footer id="iletisim" style={photoStyle} className={cn(sans, 'mt-auto border-t bg-[var(--site-bg)] text-base leading-[1.55] text-[var(--site-text)]', line)}>
            {/* Kayan ad: süs; ekran okuyucu atlar */}
            <div aria-hidden="true" {...nameX} className={cn('overflow-hidden whitespace-nowrap border-b py-4 md:py-[22px]', line, nameX.className)}>
                <div className={cn(serif, 'rb-kay-yavas inline-flex text-[34px] leading-none md:text-[44px]')}>
                    {[0, 1].map(copy => (
                        <span key={copy} className="pr-4">
                            {Array.from({ length: repeat }, (_, i) => (
                                <span key={i}>
                                    {i % 2 === 1 ? <span className="italic">{name}</span> : name}{' '}
                                    <span className="text-[var(--site-accent-text)]">✦</span>{' '}
                                </span>
                            ))}
                        </span>
                    ))}
                </div>
            </div>

            <div ref={ref} className={cn('mx-auto flex max-w-[1344px] flex-col gap-6 px-5 pt-8 md:px-12 md:pb-7 md:pt-10', bottomBar ? 'pb-[calc(96px+env(safe-area-inset-bottom))]' : 'pb-7')}>
                <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,280px),1fr))] gap-4">
                    <div {...reveal(0)}>
                        <div className={cn(siteCard, 'flex h-full min-w-0 flex-col gap-3.5 p-5', cardPad)}>
                            <span {...nameX} className={cn(serif, 'break-words text-[40px] italic leading-[0.95] md:text-[44px]', nameX.className)}>
                                {name}<span className="text-[var(--site-accent-text)]">.</span>
                            </span>
                            {content.tagline ? (
                                <EditableText as="p" field="tagline" value={content.tagline} placeholder="Alt başlık" className="m-0 text-[15px] leading-normal text-[var(--site-sub)]" />
                            ) : chips.length > 0 && (
                                <ul aria-label="Menüdeki kategoriler" {...menuX} className={cn('m-0 flex list-none flex-wrap gap-1.5 p-0', menuX.className)}>
                                    {chips.map(c => (
                                        <li key={c.id}>
                                            <Link to={`/menu#kat-${c.id}`} className="flex h-9 items-center rounded-full border border-[var(--site-line)] px-3.5 text-sm font-semibold text-[var(--site-text)] hover:border-[var(--site-text)]">
                                                {c.name}<span className="ml-1.5 font-medium opacity-60">{c.products.length}</span>
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            )}
                            <Link to="/menu" className={cardButton.accent}>Menüyü gör</Link>
                        </div>
                    </div>
                    {(address || site.phone || content.instagramUrl || content.whatsappPhone) && (
                        <div {...reveal(1)}>
                            <InfoCard label="Ziyaret ve iletişim" labelId={contactId} className={cn('h-full', cardPad)}>
                                {address && (
                                    <div {...nameX} className={cn('flex flex-col items-start gap-1', nameX.className)}>
                                        <span className={cn(serif, 'text-[28px] leading-[1.05]')}>{address}</span>
                                        <a href={directionsUrl(address)} target="_blank" rel="noopener noreferrer" className={cardLink}>Yol tarifi al →</a>
                                    </div>
                                )}
                                {(site.phone || content.instagramUrl || content.whatsappPhone) && (
                                    <div className="flex flex-col items-start gap-1">
                                        {site.phone && <a href={telHref(site.phone)} {...nameX} className={cn(textLink, nameX.className)}>{site.phone}</a>}
                                        {content.whatsappPhone && (
                                            <a href={whatsappHref(content.whatsappPhone)} target="_blank" rel="noopener noreferrer" {...contactT} className={cn(textLink, contactT.className)}>WhatsApp · {content.whatsappPhone}</a>
                                        )}
                                        {content.instagramUrl && (
                                            <a href={content.instagramUrl} target="_blank" rel="noopener noreferrer" {...contactT} className={cn(textLink, contactT.className)}>
                                                {instagramHandle(content.instagramUrl)}
                                            </a>
                                        )}
                                    </div>
                                )}
                            </InfoCard>
                        </div>
                    )}
                    {hasHours && (
                        <div {...reveal(2)}>
                            <EditableBlock target="hours" label="Çalışma saatleri" className="h-full rounded-[20px]">
                                <InfoCard label="Çalışma saatleri" labelId={hoursId} className={cn('h-full', cardPad)}
                                    action={site.isOpenNow !== null && <OpenBadge open={site.isOpenNow} />}>
                                    <HoursBlock site={site} compact weekHref="/iletisim#saatler" valueClassName="text-[28px]" />
                                    {content.hoursNote && <p className="m-0 text-sm text-[var(--site-sub)]">{content.hoursNote}</p>}
                                </InfoCard>
                            </EditableBlock>
                        </div>
                    )}
                </div>

                <div {...reveal(3)}>
                    <div className={cn('flex flex-wrap items-center justify-between gap-3 border-t pt-5 text-[13px] text-[var(--site-muted)]', line)}>
                        <span {...fixedX} className={fixedX.className}>© {new Date().getFullYear()} {name} · Sophram ile hazırlandı</span>
                        <nav aria-label="Alt menü" className="flex flex-wrap gap-x-[18px] gap-y-2">
                            {nav.map(item => <Link key={item.key} to={item.to} className={bottomLink}>{item.label}</Link>)}
                            {canReserve && <Link to={RESERVATION_PATH} className={bottomLink}>Rezervasyon</Link>}
                            {canReserve && <Link to={RESERVATION_LOOKUP_PATH} className={bottomLink}>Rezervasyon sorgula</Link>}
                            <Link to="/gizlilik-politikasi" {...fixedX} className={cn(bottomLink, fixedX.className)}>KVKK</Link>
                            <Link to="/login" {...fixedX} className={cn(bottomLink, fixedX.className)}>Personel girişi</Link>
                        </nav>
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
 * düğmelerini değiştirir (boş dizi: çubuk yok); verilmezse Ara · Yol tarifi · Masa ayırt.
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
    const showLastCall = lastCall && !inFlow && current !== 'rezervasyon-sorgula';
    return (
        <SiteShell accent={site.site.accentColor} theme={site.site.theme}>
            <link rel="stylesheet" href={FONTS_HREF} precedence="default" />
            <style>{MOTION_CSS}</style>
            <div className={cn('flex min-h-screen flex-col overflow-x-clip', className ?? cn(sans, 'bg-[var(--site-bg)] text-base leading-[1.55] text-[var(--site-text)]'))}>
                {/* Düzenleyicide yalnız burada değişen bölümler çizilir: başlık, son çağrı, alt bilgi ve alt çubuk yok. */}
                {!edit && <SiteHeader site={site} current={current} sticky={stickyHeader} />}
                {children}
                {!edit && showLastCall && <LastCallCard site={site} />}
                {!edit && <SiteFooter site={site} bottomBar={actions.length > 0} />}
                {!edit && <MobileActionBar actions={actions} />}
            </div>
        </SiteShell>
    );
}

// ── Kapak zemini ─────────────────────────────────────────────────────────────────────────────────

/**
 * Koyu kapakların arka planı: fotoğraf varsa fotoğraf + karartma; yoksa menüdeki fotoğraflardan kolaj (hazır görsel
 * varsa "Temsili görseller" notuyla); o da yoksa kategori adlarından soluk desen. Düz koyu blok hiç çizilmez.
 */
export function HeroBackdrop({ site, image, overlay }: { site: PublicSite; image?: string; overlay: string }) {
    if (image) {
        return (
            <>
                <img src={image} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover" />
                <div aria-hidden="true" className={cn('absolute inset-0', overlay)} />
            </>
        );
    }
    const all = collagePhotos(site, 6);
    if (all.length > 0) {
        // 6 → 3×2 (geniş ekranda 6 sütun), 4–5 → 2×2 (geniş ekranda 4 sütun), 1–3 → tek sıra: ızgara hep dolu.
        const count = all.length >= 6 ? 6 : all.length >= 4 ? 4 : all.length;
        const photos = all.slice(0, count);
        const cols = { 1: 'grid-cols-1', 2: 'grid-cols-2', 3: 'grid-cols-3', 4: 'grid-cols-2 md:grid-cols-4', 6: 'grid-cols-3 md:grid-cols-6' }[count];
        return (
            <>
                <div aria-hidden="true" className={cn('absolute inset-0 grid', cols)}>
                    {photos.map((p, i) => <img key={i} src={p.url} alt="" className="h-full min-h-0 w-full object-cover" />)}
                </div>
                <div aria-hidden="true" className={cn('absolute inset-0', overlay)} />
                {photos.some(p => p.isStock) && (
                    <span className="absolute right-4 top-[96px] z-[1] rounded bg-black/45 px-2 py-1 text-[11px] font-medium text-white/90 md:top-[118px]">Temsili görseller</span>
                )}
            </>
        );
    }
    const words = site.categories.map(c => c.name).join('  ·  ') || restaurantName(site);
    return (
        <div aria-hidden="true" className="absolute inset-0 overflow-hidden opacity-[0.08]">
            <div className={cn(serif, 'whitespace-nowrap text-[120px] italic leading-none text-white md:text-[150px]')}>
                {[0, 1, 2, 3].map(i => <div key={i} style={{ marginLeft: `${-i * 120}px` }}>{`${words}  ·  ${words}  ·  ${words}`}</div>)}
            </div>
        </div>
    );
}

/**
 * Alt sayfaların koyu girişi: kapak (ya da verilen) fotoğrafı karartılmış (yoksa kolaj ya da desen), üstte başlık
 * boşluğu, altta dev başlık. `compact` kısa kapak verir; `aside` geniş ekranda başlığın sağına, dar ekranda altına gelir.
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
        <section className={cn('relative flex flex-col overflow-hidden bg-[var(--site-hero)] text-white', !compact && 'min-h-[380px] md:min-h-[520px]')}>
            <HeroBackdrop site={site} image={src || undefined}
                overlay={compact
                    ? 'bg-[linear-gradient(180deg,rgba(20,16,12,0.55),rgba(20,16,12,0.74))]'
                    : 'bg-[linear-gradient(180deg,rgba(20,16,12,0.55),rgba(20,16,12,0.35)_45%,rgba(20,16,12,0.7))]'} />
            <HeaderSpacer />
            {compact ? (
                <div className="relative mx-auto flex w-full max-w-[1344px] flex-col gap-3 px-5 pb-7 pt-6 md:flex-row md:flex-wrap md:items-end md:justify-between md:gap-6 md:px-12 md:pb-12 md:pt-14">
                    <div className="flex min-w-0 max-w-[820px] flex-col gap-2.5">
                        {!edit && <span className="hidden text-xs font-medium uppercase tracking-[0.28em] text-white md:block">{label}</span>}
                        <h1 className={cn(serif, 'm-0 break-words text-[64px] italic leading-[0.95] md:text-[96px]', titleClassName)}>{title}</h1>
                        {children}
                    </div>
                    {aside}
                </div>
            ) : (
                <div className="relative mx-auto flex w-full max-w-[1344px] flex-1 flex-col justify-end gap-4 px-5 pb-12 pt-10 md:px-12 md:pb-16">
                    {!edit && <span className="text-xs font-medium uppercase tracking-[0.28em] text-white/80">{label}</span>}
                    <h1 className={cn(serif, 'm-0 break-words text-[64px] italic leading-[0.9] tracking-[-0.03em] md:text-[120px] lg:text-[150px]', titleClassName)}>{title}</h1>
                    {aside}
                    {children}
                </div>
            )}
        </section>
        </EditableBlock>
    );
}

/** İçeriği girilmemiş sayfa: kısa açıklama ve ana sayfaya/menüye dönüş. */
export function PageEmpty({ label = 'Yakında', text, children }: { label?: string; text: string; children?: ReactNode }) {
    return (
        <main className="mx-auto flex w-full max-w-[760px] flex-1 flex-col items-center gap-6 px-5 py-20 text-center md:py-28">
            <span className="text-xs font-medium uppercase tracking-[0.28em] text-[var(--site-muted)]">{label}</span>
            <p className={cn(serif, 'm-0 text-[40px] leading-[1.05] md:text-[56px]')}>{text}</p>
            {children}
            <div className="flex flex-wrap justify-center gap-3 pt-2">
                <Link to="/" className={cn('flex h-[50px] items-center rounded-full border bg-[var(--site-card)] px-6 font-semibold text-[var(--site-text)] hover:border-[var(--site-text)]', line)}>Ana sayfa</Link>
                <Link to="/menu" className="flex h-[50px] items-center rounded-full bg-[var(--site-accent)] px-6 font-semibold text-[var(--site-on-accent)]">Menüyü gör</Link>
            </div>
        </main>
    );
}
