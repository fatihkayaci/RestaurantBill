import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { canReserveOnline, type PublicSite } from '@/features/customerSite/types';
import { cn } from '@/lib/utils';
import { SiteShell } from './SiteChrome';
import {
    FONTS_HREF, MOTION_CSS, RESERVATION_PATH, eyebrow, footLabel, instagramHandle, line, moreArrow, moreLink, sans, serif,
    siteNav, underlineLink, type SitePageKey,
} from './siteParts';
import { directionsUrl, telHref } from './siteTheme';
import { fullAddress, hoursText, restaurantName } from './useSite';

// Restoran sitesinin ortak çerçevesi (ana sayfa, menü, Hakkımızda, Mekân, İletişim, Rezervasyon):
// sayfanın üstüne sabitlenen ve kaydırınca küçülüp cam bir hapa dönüşen başlık, hareketli beyaz alt bilgi.

const SCROLL_THRESHOLD = 24;
const ease = 'duration-500 ease-[cubic-bezier(0.2,0.7,0.2,1)] motion-reduce:transition-none';

function useScrolled(enabled = true): boolean {
    const [scrolled, setScrolled] = useState(() => enabled && window.scrollY > SCROLL_THRESHOLD);
    useEffect(() => {
        if (!enabled) return;
        let frame = 0;
        const onScroll = () => {
            if (frame) return;
            frame = requestAnimationFrame(() => {
                frame = 0;
                setScrolled(window.scrollY > SCROLL_THRESHOLD);
            });
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        onScroll();
        return () => {
            window.removeEventListener('scroll', onScroll);
            if (frame) cancelAnimationFrame(frame);
        };
    }, [enabled]);
    return enabled && scrolled;
}

/** Başlık sayfanın üstüne bindiğinden (fixed ya da absolute) sayfanın en üstünde onun yüksekliği kadar boşluk bırakılır; kaydırınca sayfa kaymaz. */
export function HeaderSpacer() {
    return <div aria-hidden="true" className="h-[86px] shrink-0 md:h-[106px]" />;
}

/**
 * Sitenin başlığı. En üstte koyu giriş görselinin üstünde şeffaf ve geniş; sayfa kaydırılınca üstte sabit kalır,
 * küçülür ve koyu cam bir hapa dönüşür (açık bölümlerin üstünde de okunur). Dar ekranda bağlantılar açılır menüde.
 * `sticky={false}` ise (menü sayfası) başlık sayfayla birlikte yukarı kayıp gider, hapa dönüşmez.
 */
export function SiteHeader({ site, current, sticky = true }: { site: PublicSite; current: SitePageKey; sticky?: boolean }) {
    const scrolled = useScrolled(sticky);
    const [open, setOpen] = useState(false);
    const panelId = useId();
    const name = restaurantName(site);
    const nav = siteNav(site);
    const canReserve = canReserveOnline(site);

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open]);

    const toTop = () => { if (current === 'home') window.scrollTo({ top: 0, behavior: 'smooth' }); };
    const compact = scrolled || open;

    return (
        <div className={cn(sticky ? 'fixed' : 'absolute', 'inset-x-0 top-0 z-50 transition-[padding]', ease, compact ? 'px-3 pt-3 md:px-6 md:pt-4' : 'px-0 pt-0')}>
            <header className={cn(sans,
                'mx-auto grid grid-cols-[minmax(0,1fr)_auto] items-center border text-[13px] font-medium uppercase text-white transition-all lg:grid-cols-[1fr_auto_1fr]',
                ease,
                compact
                    ? 'max-w-[1120px] gap-3 rounded-[36px] border-white/15 bg-[rgba(26,22,19,0.82)] py-2 pl-5 pr-2 tracking-[0.12em] shadow-[0_12px_32px_rgba(0,0,0,0.22)] backdrop-blur-[14px] md:pl-7'
                    : 'max-w-[2560px] gap-4 rounded-[0px] border-transparent bg-transparent px-5 py-5 tracking-[0.14em] md:px-12 md:py-7')}
            >
                <nav aria-label="Ana menü" className={cn('hidden flex-wrap items-center transition-[gap] lg:flex', ease, compact ? 'gap-5' : 'gap-7')}>
                    {nav.map(item => (
                        <Link key={item.key} to={item.to} aria-current={current === item.key ? 'page' : undefined}
                            className={cn(underlineLink, 'text-white', current === item.key && 'bg-[length:100%_1px]')}>
                            {item.label}
                        </Link>
                    ))}
                </nav>
                <Link to="/" onClick={toTop}
                    className={cn(serif, 'min-w-0 truncate normal-case italic leading-none tracking-normal text-white transition-[font-size] lg:justify-self-center', ease,
                        compact ? 'text-[22px] md:text-[24px]' : 'text-[22px] sm:text-[26px] md:text-[30px]')}>
                    {name}
                </Link>
                <div className="flex items-center gap-2 justify-self-end">
                    <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open} aria-controls={panelId}
                        aria-label={open ? 'Menüyü kapat' : 'Menüyü aç'}
                        className={cn('flex items-center justify-center rounded-full border border-white/35 text-white transition-all lg:hidden', ease, compact ? 'h-10 w-10' : 'h-11 w-11')}>
                        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                            {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 8h16M4 16h16" />}
                        </svg>
                    </button>
                    {canReserve && (
                        <Link to={RESERVATION_PATH} aria-current={current === 'rezervasyon' ? 'page' : undefined}
                            className={cn('flex items-center whitespace-nowrap rounded-full border px-4 transition-all sm:px-5', ease,
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
                    className="mx-auto mt-2 flex max-w-[1120px] flex-col rounded-[28px] border border-white/15 bg-[rgba(26,22,19,0.94)] p-3 text-white shadow-[0_16px_40px_rgba(0,0,0,0.28)] backdrop-blur-[14px] lg:hidden">
                    <Link to="/" onClick={() => setOpen(false)} aria-current={current === 'home' ? 'page' : undefined}
                        className={cn(serif, 'rounded-2xl px-4 py-2.5 text-[30px] italic leading-tight text-white hover:bg-white/10')}>Ana sayfa</Link>
                    {nav.map(item => (
                        <Link key={item.key} to={item.to} onClick={() => setOpen(false)} aria-current={current === item.key ? 'page' : undefined}
                            className={cn(serif, 'rounded-2xl px-4 py-2.5 text-[30px] leading-tight text-white hover:bg-white/10', current === item.key && 'italic')}>
                            {item.label}
                        </Link>
                    ))}
                </nav>
            )}
        </div>
    );
}

// Görünür olunca bir kez açılır (alt bilgi sütunlarının belirmesi). IntersectionObserver yoksa hemen görünür.
function useReveal<T extends Element>() {
    const ref = useRef<T>(null);
    const [shown, setShown] = useState(() => typeof IntersectionObserver === 'undefined');
    useEffect(() => {
        const el = ref.current;
        if (!el || shown) return;
        const observer = new IntersectionObserver(entries => {
            if (entries.some(e => e.isIntersecting)) {
                setShown(true);
                observer.disconnect();
            }
        }, { threshold: 0.12 });
        observer.observe(el);
        return () => observer.disconnect();
    }, [shown]);
    return { ref, shown };
}

/** "Her gün · şu an açık  08:00 – 23:00" satırı (+ restoranın notu). Saat girilmemişse çizilmez. */
export function HoursTable({ site, className }: { site: PublicSite; className?: string }) {
    const hours = hoursText(site);
    if (!hours) return null;
    return (
        <div className={cn('flex min-w-0 flex-col gap-2.5', className)}>
            <table className="w-full border-collapse text-[15px]">
                <tbody>
                    <tr className="border-b border-[#ECE7DF] font-semibold text-[#141414]">
                        <td className="py-2.5">
                            <span className="flex items-center gap-2">
                                {site.isOpenNow !== null && (
                                    <span aria-hidden="true" className={cn('h-[7px] w-[7px] rounded-full', site.isOpenNow ? 'bg-[#2E9E57]' : 'bg-[#C0573A]')} />
                                )}
                                Her gün{site.isOpenNow !== null && <span className="font-normal text-[#6F6A63]"> · {site.isOpenNow ? 'şu an açık' : 'şu an kapalı'}</span>}
                            </span>
                        </td>
                        <td className="py-2.5 text-right tabular-nums">{hours}</td>
                    </tr>
                </tbody>
            </table>
            {site.site.hoursNote && <p className="m-0 text-sm text-[#6F6A63]">{site.site.hoursNote}</p>}
        </div>
    );
}

const MARQUEE_MIN_CHARS = 60; // 120px italik serifte bir kopyanın geniş ekranı doldurması için

/**
 * Beyaz alt bilgi: yavaşça kayan restoran adı, görününce sırayla beliren dört sütun (ad, ziyaret/iletişim,
 * çalışma saatleri), alt satırda sayfalar. Bağlantıların alt çizgisi üstüne gelince çizilir. Hareket azaltma
 * tercihinde kayma ve belirme olmaz.
 */
export function SiteFooter({ site }: { site: PublicSite }) {
    const { ref, shown } = useReveal<HTMLDivElement>();
    const name = restaurantName(site);
    const content = site.site;
    const address = fullAddress(site);
    const hours = hoursText(site);
    const nav = siteNav(site);
    const canReserve = canReserveOnline(site);
    const hasContactPage = nav.some(item => item.key === 'iletisim');

    const unit = `${name} ✦ `;
    const repeat = Math.max(2, Math.ceil(MARQUEE_MIN_CHARS / unit.length));
    const reveal = (step: number) => ({
        className: cn('transition-[opacity,transform] duration-700 ease-out motion-reduce:transition-none',
            shown ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0 motion-reduce:translate-y-0 motion-reduce:opacity-100'),
        style: { transitionDelay: shown ? `${step * 110}ms` : '0ms' },
    });
    const link = cn(underlineLink, 'text-[#141414]');
    const hasContactColumn = Boolean(address || site.phone || content.instagramUrl);
    const contactLink = (
        <Link to="/iletisim" className={cn(moreLink, 'mt-3')}>
            İletişim sayfası <span aria-hidden="true" className={moreArrow}>→</span>
        </Link>
    );

    return (
        <footer id="iletisim" className={cn(sans, 'mt-auto border-t bg-white text-base leading-[1.55] text-[#141414]', line)}>
            {/* Kayan ad: süs; ekran okuyucu atlar */}
            <div aria-hidden="true" className={cn('overflow-hidden whitespace-nowrap border-b py-5 md:py-7', line)}>
                <div className={cn(serif, 'rb-kay-yavas inline-flex text-[64px] italic leading-none tracking-[-0.03em] md:text-[120px]')}>
                    {[0, 1].map(copy => (
                        <span key={copy} className="pr-8">
                            {Array.from({ length: repeat }, (_, i) => (
                                <span key={i}>
                                    {i % 2 === 1 ? <span className="not-italic">{name}</span> : name}{' '}
                                    <span className="text-[var(--site-accent)]">✦</span>{' '}
                                </span>
                            ))}
                        </span>
                    ))}
                </div>
            </div>

            <div ref={ref} className="mx-auto flex max-w-[1344px] flex-col gap-16 px-5 pb-8 pt-16 md:px-12 md:pt-20">
                <div className="grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-4">
                    <div {...reveal(0)}>
                        <div className="flex min-w-0 flex-col gap-4">
                            <span className={cn(serif, 'break-words text-[52px] italic leading-[0.85] lg:text-[64px]')}>
                                {name}<span className="text-[var(--site-accent)]">.</span>
                            </span>
                            {content.tagline && <p className="m-0 max-w-[26ch] text-[#4A4640]">{content.tagline}</p>}
                            <Link to="/menu" className="flex h-[50px] items-center self-start rounded-full bg-[var(--site-accent)] px-6 font-semibold text-[var(--site-on-accent)] transition-transform duration-300 hover:-translate-y-0.5 motion-reduce:transition-none">Menüyü gör</Link>
                        </div>
                    </div>
                    {hasContactColumn && (
                        <div {...reveal(1)}>
                            <div className="flex min-w-0 flex-col items-start gap-2.5">
                                {address && (
                                    <>
                                        <span className={footLabel}>Ziyaret</span>
                                        <span className={cn(serif, 'text-[26px] leading-[1.15]')}>{address}</span>
                                        <a href={directionsUrl(address)} target="_blank" rel="noopener noreferrer" className={cn(link, 'text-sm font-semibold')}>Yol tarifi al →</a>
                                    </>
                                )}
                                {(site.phone || content.instagramUrl) && (
                                    <>
                                        <span className={cn(footLabel, address && 'pt-2.5')}>İletişim</span>
                                        {site.phone && <a href={telHref(site.phone)} className={link}>{site.phone}</a>}
                                        {content.instagramUrl && (
                                            <a href={content.instagramUrl} target="_blank" rel="noopener noreferrer" className={cn(link, 'text-sm font-semibold')}>
                                                {instagramHandle(content.instagramUrl)} →
                                            </a>
                                        )}
                                    </>
                                )}
                                {hasContactPage && contactLink}
                            </div>
                        </div>
                    )}
                    {hours && (
                        <div className={cn(reveal(2).className, 'md:col-span-2')} style={reveal(2).style}>
                            <div className="flex min-w-0 flex-col gap-2.5">
                                <span className={footLabel}>Çalışma saatleri</span>
                                <HoursTable site={site} />
                                {hasContactPage && !hasContactColumn && contactLink}
                            </div>
                        </div>
                    )}
                </div>

                <div {...reveal(3)}>
                    <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[#E6E1D9] pt-[22px] text-sm text-[#6F6A63]">
                        <span>© {new Date().getFullYear()} {name} · Sophram ile hazırlandı</span>
                        <nav aria-label="Alt menü" className="flex flex-wrap gap-x-6 gap-y-2">
                            {nav.map(item => <Link key={item.key} to={item.to} className={cn(underlineLink, 'text-[#6F6A63]')}>{item.label}</Link>)}
                            {canReserve && <Link to={RESERVATION_PATH} className={cn(underlineLink, 'text-[#6F6A63]')}>Rezervasyon</Link>}
                            <Link to="/gizlilik-politikasi" className={cn(underlineLink, 'text-[#6F6A63]')}>KVKK</Link>
                            <Link to="/login" className={cn(underlineLink, 'text-[#6F6A63]')}>Personel girişi</Link>
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
    useEffect(() => {
        if (hash) {
            document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView();
            return;
        }
        window.scrollTo({ top: 0 });
    }, [pathname, hash]);
}

/**
 * Sitenin bir sayfası: ortak başlık + içerik + alt bilgi. `className` içerik sarmalayıcısının görünümünü değiştirir;
 * `stickyHeader={false}` başlığı kaydırınca peşinden gelmeyen (sayfayla kayan) hâle getirir.
 */
export function SitePage({ site, current, className, stickyHeader = true, children }: {
    site: PublicSite; current: SitePageKey; className?: string; stickyHeader?: boolean; children: ReactNode;
}) {
    useScrollOnEnter();
    return (
        <SiteShell accent={site.site.accentColor}>
            <link rel="stylesheet" href={FONTS_HREF} precedence="default" />
            <style>{MOTION_CSS}</style>
            <div className={cn('flex min-h-screen flex-col overflow-x-clip', className ?? cn(sans, 'bg-[#F5F2ED] text-base leading-[1.55] text-[#141414]'))}>
                <SiteHeader site={site} current={current} sticky={stickyHeader} />
                {children}
                <SiteFooter site={site} />
            </div>
        </SiteShell>
    );
}

/** Alt sayfaların koyu girişi: kapak (ya da verilen) fotoğrafı karartılmış, üstte başlık boşluğu, altta dev başlık. */
export function PageHero({ site, label, title, image, children }: {
    site: PublicSite; label: string; title: ReactNode; image?: string; children?: ReactNode;
}) {
    const src = image ?? site.site.coverImageUrl;
    return (
        <section className="relative flex min-h-[380px] flex-col overflow-hidden bg-[#2A2622] text-white md:min-h-[520px]">
            {src && (
                <>
                    <img src={src} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover" />
                    <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(180deg,rgba(20,16,12,0.55),rgba(20,16,12,0.35)_45%,rgba(20,16,12,0.7))]" />
                </>
            )}
            <HeaderSpacer />
            <div className="relative mx-auto flex w-full max-w-[1344px] flex-1 flex-col justify-end gap-4 px-5 pb-12 pt-10 md:px-12 md:pb-16">
                <span className="text-xs font-medium uppercase tracking-[0.28em] text-white/80">{label}</span>
                <h1 className={cn(serif, 'm-0 break-words text-[64px] italic leading-[0.9] tracking-[-0.03em] md:text-[120px] lg:text-[150px]')}>{title}</h1>
                {children}
            </div>
        </section>
    );
}

/** İçeriği girilmemiş sayfa: kısa açıklama ve ana sayfaya/menüye dönüş. */
export function PageEmpty({ label = 'Yakında', text, children }: { label?: string; text: string; children?: ReactNode }) {
    return (
        <main className="mx-auto flex w-full max-w-[760px] flex-1 flex-col items-center gap-6 px-5 py-24 text-center md:py-32">
            <span className={eyebrow}>{label}</span>
            <p className={cn(serif, 'm-0 text-[40px] leading-[1.05] md:text-[56px]')}>{text}</p>
            {children}
            <div className="flex flex-wrap justify-center gap-3 pt-2">
                <Link to="/" className={cn('flex h-[50px] items-center rounded-full border bg-white px-6 font-semibold text-[#141414] hover:border-[#141414]', line)}>Ana sayfa</Link>
                <Link to="/menu" className="flex h-[50px] items-center rounded-full bg-[var(--site-accent)] px-6 font-semibold text-[var(--site-on-accent)]">Menüyü gör</Link>
            </div>
        </main>
    );
}
