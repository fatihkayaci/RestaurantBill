import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { canReserveOnline, type PublicSite } from '@/features/customerSite/types';
import { cn } from '@/lib/utils';
import { useOnlineOrderingAvailable } from '@/features/delivery/useOnlineOrderingAvailable';
import { RESERVATION_LOOKUP_PATH } from '@/features/customerSite/reservationCode';
import { SiteShell } from './SiteChrome';
import {
    FONTS_HREF, MOTION_CSS, RESERVATION_PATH, cardButton, cardLink, eyebrow, instagramHandle, line, sans, serif, siteCard,
    siteNav, underlineLink, type SitePageKey,
} from './siteParts';
import { InfoCard, OpenBadge } from './SiteCards';
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
    const canOrder = useOnlineOrderingAvailable();

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
                        <Link to={RESERVATION_LOOKUP_PATH} aria-current={current === 'rezervasyon-sorgula' ? 'page' : undefined}
                            className={cn(underlineLink, 'text-white', current === 'rezervasyon-sorgula' && 'bg-[length:100%_1px]')}>
                            Rezervasyon sorgula
                        </Link>
                    )}
                </nav>
                <Link to="/" onClick={toTop}
                    className={cn(serif, 'min-w-0 truncate normal-case italic leading-none tracking-normal text-white transition-[font-size] xl:max-w-full xl:justify-self-center', ease,
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
                        <Link to="/siparis"
                            className={cn('hidden items-center whitespace-nowrap rounded-full border px-4 transition-all sm:flex sm:px-5', ease,
                                compact
                                    ? 'h-10 border-white/40 text-white hover:bg-white/10'
                                    : 'h-11 border-white/40 bg-white/15 text-white backdrop-blur-[12px] hover:bg-white/25')}>
                            Paket sipariş
                        </Link>
                    )}
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
                        <Link to="/siparis" onClick={() => setOpen(false)}
                            className={cn(serif, 'rounded-2xl px-4 py-2.5 text-[30px] leading-tight text-white hover:bg-white/10')}>
                            Paket sipariş
                        </Link>
                    )}
                    {canReserve && (
                        <Link to={RESERVATION_LOOKUP_PATH} onClick={() => setOpen(false)} aria-current={current === 'rezervasyon-sorgula' ? 'page' : undefined}
                            className={cn(serif, 'rounded-2xl px-4 py-2.5 text-[30px] leading-tight text-white hover:bg-white/10', current === 'rezervasyon-sorgula' && 'italic')}>
                            Rezervasyon sorgula
                        </Link>
                    )}
                </nav>
            )}
        </div>
    );
}

// Görünür olunca bir kez açılır (alt bilgi kartlarının belirmesi). Öğe ekrana girmeden biraz önce açılır; IntersectionObserver
// yoksa, öğe ilk çizimde zaten ekrandaysa ya da sayfa yazdırılırsa hemen görünür (içerik hiçbir durumda gizli kalmaz).
function useReveal<T extends Element>() {
    const ref = useRef<T>(null);
    const [shown, setShown] = useState(() => typeof IntersectionObserver === 'undefined');
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

const MARQUEE_MIN_CHARS = 160; // 44px serifte bir kopyanın geniş ekranı doldurması için

/**
 * Açık alt bilgi: ince çizgiler arasında yavaşça kayan restoran adı, görününce sırayla beliren üç beyaz kart
 * (ad + menü, ziyaret ve iletişim, çalışma saatleri; dar ekranda alt alta), alt satırda telif ve sayfalar.
 * Verisi girilmemiş kart ya da satır çizilmez. Hareket azaltma tercihinde kayma ve belirme olmaz.
 */
export function SiteFooter({ site }: { site: PublicSite }) {
    const { ref, shown } = useReveal<HTMLDivElement>();
    const contactId = useId();
    const hoursId = useId();
    const name = restaurantName(site);
    const content = site.site;
    const address = fullAddress(site);
    const hours = hoursText(site);
    const nav = siteNav(site);
    const canReserve = canReserveOnline(site);

    const unit = `${name} ✦ `;
    const repeat = Math.max(2, Math.ceil(MARQUEE_MIN_CHARS / unit.length));
    const reveal = (step: number) => ({
        className: cn('transition-[opacity,transform] duration-700 ease-out motion-reduce:transition-none',
            shown ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0 motion-reduce:translate-y-0 motion-reduce:opacity-100'),
        style: { transitionDelay: shown ? `${step * 110}ms` : '0ms' },
    });
    // Arkada kapak fotoğrafı (kapaklarla aynı görsel), üstünde krem perde: yazılar ve kartlar okunur kalır. Fotoğraf yoksa düz bej.
    const photo = content.coverImageUrl;
    const photoStyle = photo ? {
        backgroundImage: `linear-gradient(180deg, rgba(245,242,237,0.92), rgba(245,242,237,0.78)), url(${JSON.stringify(photo)})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
    } : undefined;
    const textLink = 'self-start text-[15px] text-[#141414] transition-colors hover:text-[var(--site-accent)]';
    const bottomLink = cn(underlineLink, photo ? 'text-[#3F3A34]' : 'text-[#5E5850]');
    const cardPad = cn('md:p-[26px]', photo && 'shadow-[0_6px_24px_rgba(20,16,12,0.08)]');

    return (
        <footer id="iletisim" style={photoStyle} className={cn(sans, 'mt-auto border-t bg-[#F5F2ED] text-base leading-[1.55] text-[#141414]', line)}>
            {/* Kayan ad: süs; ekran okuyucu atlar */}
            <div aria-hidden="true" className={cn('overflow-hidden whitespace-nowrap border-b py-4 md:py-[22px]', line)}>
                <div className={cn(serif, 'rb-kay-yavas inline-flex text-[34px] leading-none md:text-[44px]')}>
                    {[0, 1].map(copy => (
                        <span key={copy} className="pr-4">
                            {Array.from({ length: repeat }, (_, i) => (
                                <span key={i}>
                                    {i % 2 === 1 ? <span className="italic">{name}</span> : name}{' '}
                                    <span className="text-[var(--site-accent)]">✦</span>{' '}
                                </span>
                            ))}
                        </span>
                    ))}
                </div>
            </div>

            <div ref={ref} className="mx-auto flex max-w-[1344px] flex-col gap-6 px-5 pb-7 pt-8 md:px-12 md:pt-10">
                <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,280px),1fr))] gap-4">
                    <div {...reveal(0)}>
                        <div className={cn(siteCard, 'flex h-full min-w-0 flex-col gap-3.5 p-5', cardPad)}>
                            <span className={cn(serif, 'break-words text-[40px] italic leading-[0.95] md:text-[44px]')}>
                                {name}<span className="text-[var(--site-accent)]">.</span>
                            </span>
                            {content.tagline && <p className="m-0 text-[15px] leading-normal text-[#5E5850]">{content.tagline}</p>}
                            <Link to="/menu" className={cardButton.accent}>Menüyü gör</Link>
                        </div>
                    </div>
                    {(address || site.phone || content.instagramUrl) && (
                        <div {...reveal(1)}>
                            <InfoCard label="Ziyaret ve iletişim" labelId={contactId} className={cn('h-full', cardPad)}>
                                {address && (
                                    <div className="flex flex-col items-start gap-1">
                                        <span className={cn(serif, 'text-[28px] leading-[1.05]')}>{address}</span>
                                        <a href={directionsUrl(address)} target="_blank" rel="noopener noreferrer" className={cardLink}>Yol tarifi al →</a>
                                    </div>
                                )}
                                {(site.phone || content.instagramUrl) && (
                                    <div className="flex flex-col items-start gap-1">
                                        {site.phone && <a href={telHref(site.phone)} className={textLink}>{site.phone}</a>}
                                        {content.instagramUrl && (
                                            <a href={content.instagramUrl} target="_blank" rel="noopener noreferrer" className={textLink}>
                                                {instagramHandle(content.instagramUrl)}
                                            </a>
                                        )}
                                    </div>
                                )}
                            </InfoCard>
                        </div>
                    )}
                    {hours && (
                        <div {...reveal(2)}>
                            <InfoCard label="Çalışma saatleri" labelId={hoursId} className={cn('h-full', cardPad)}
                                action={site.isOpenNow !== null && <OpenBadge open={site.isOpenNow} />}>
                                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                                    <span className="text-[15px] font-semibold">Her gün</span>
                                    <span className={cn(serif, 'text-[28px] leading-none tabular-nums')}>{hours}</span>
                                </div>
                                {content.hoursNote && <p className="m-0 text-sm text-[#5E5850]">{content.hoursNote}</p>}
                            </InfoCard>
                        </div>
                    )}
                </div>

                <div {...reveal(3)}>
                    <div className={cn('flex flex-wrap items-center justify-between gap-3 border-t pt-5 text-[13px]', line, photo ? 'text-[#45403A]' : 'text-[#6F6A63]')}>
                        <span>© {new Date().getFullYear()} {name} · Sophram ile hazırlandı</span>
                        <nav aria-label="Alt menü" className="flex flex-wrap gap-x-[18px] gap-y-2">
                            {nav.map(item => <Link key={item.key} to={item.to} className={bottomLink}>{item.label}</Link>)}
                            {canReserve && <Link to={RESERVATION_PATH} className={bottomLink}>Rezervasyon</Link>}
                            {canReserve && <Link to={RESERVATION_LOOKUP_PATH} className={bottomLink}>Rezervasyon sorgula</Link>}
                            <Link to="/gizlilik-politikasi" className={bottomLink}>KVKK</Link>
                            <Link to="/login" className={bottomLink}>Personel girişi</Link>
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

/**
 * Alt sayfaların koyu girişi: kapak (ya da verilen) fotoğrafı karartılmış, üstte başlık boşluğu, altta dev başlık.
 * `compact` kısa kapak verir (96px başlık, dar ekranda etiket gizli); `aside` geniş ekranda başlığın sağına,
 * dar ekranda altına gelir (ör. `HeroStatusPill`, menüde arama kutusu). `children` başlığın hemen altındadır
 * (kısa kapakta başlıkla aynı sütunda). `titleClassName` başlığın boyutunu değiştirir (Mekân'ın uzun başlığı).
 */
export function PageHero({ site, label, title, image, compact = false, aside, titleClassName, children }: {
    site: PublicSite; label: string; title: ReactNode; image?: string; compact?: boolean; aside?: ReactNode; titleClassName?: string; children?: ReactNode;
}) {
    const src = image ?? site.site.coverImageUrl;
    return (
        <section className={cn('relative flex flex-col overflow-hidden bg-[#2A2622] text-white', !compact && 'min-h-[380px] md:min-h-[520px]')}>
            {src && (
                <>
                    <img src={src} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover" />
                    <div aria-hidden="true" className={cn('absolute inset-0',
                        compact
                            ? 'bg-[linear-gradient(180deg,rgba(20,16,12,0.55),rgba(20,16,12,0.72))]'
                            : 'bg-[linear-gradient(180deg,rgba(20,16,12,0.55),rgba(20,16,12,0.35)_45%,rgba(20,16,12,0.7))]')} />
                </>
            )}
            <HeaderSpacer />
            {compact ? (
                <div className="relative mx-auto flex w-full max-w-[1344px] flex-col gap-3 px-5 pb-7 pt-6 md:flex-row md:flex-wrap md:items-end md:justify-between md:gap-6 md:px-12 md:pb-12 md:pt-14">
                    <div className="flex min-w-0 max-w-[820px] flex-col gap-2.5">
                        <span className="hidden text-xs font-medium uppercase tracking-[0.28em] text-white md:block">{label}</span>
                        <h1 className={cn(serif, 'm-0 break-words text-[64px] italic leading-[0.95] md:text-[96px]', titleClassName)}>{title}</h1>
                        {children}
                    </div>
                    {aside}
                </div>
            ) : (
                <div className="relative mx-auto flex w-full max-w-[1344px] flex-1 flex-col justify-end gap-4 px-5 pb-12 pt-10 md:px-12 md:pb-16">
                    <span className="text-xs font-medium uppercase tracking-[0.28em] text-white/80">{label}</span>
                    <h1 className={cn(serif, 'm-0 break-words text-[64px] italic leading-[0.9] tracking-[-0.03em] md:text-[120px] lg:text-[150px]', titleClassName)}>{title}</h1>
                    {aside}
                    {children}
                </div>
            )}
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
