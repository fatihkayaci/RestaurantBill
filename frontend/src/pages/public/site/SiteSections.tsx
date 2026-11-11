import { Link } from 'react-router-dom';
import { Navigation, Phone } from 'lucide-react';
import {
    RESERVATION_CANCELLED, RESERVATION_CONFIRMED, RESERVATION_PENDING, RESERVATION_REJECTED,
    type ReservationStatusInfo,
} from '@/features/customerSite/types';
import { cn } from '@/lib/utils';
import { directionsUrl, formatDay, headingFont, initials, telHref } from './siteTheme';

// Restoran sitesinin bölümleri ("Ocak" görünümü). Verisi olmayan bölüm null döner;
// backend alanı eklenince kendiliğinden açılır.

export const accentButton =
    'inline-flex items-center justify-center gap-2 rounded-full bg-[var(--site-accent)] font-semibold text-[var(--site-on-accent)] no-underline transition-opacity hover:opacity-90';
export const outlineButton =
    'inline-flex items-center justify-center gap-2 rounded-full border border-[var(--site-border-strong)] font-semibold text-[var(--site-text)] no-underline transition-colors hover:border-[var(--site-text)]';

export const sectionWrap = 'mx-auto w-full max-w-[1200px] px-4 md:px-6';
const sectionTitle = cn(headingFont, 'text-[28px] font-bold leading-tight md:text-[44px]');
const eyebrow = 'text-sm font-semibold uppercase tracking-[0.08em] text-[var(--site-accent)]';

export function LogoBadge({ name, logoUrl, className }: { name: string; logoUrl?: string; className?: string }) {
    if (logoUrl) {
        return <img src={logoUrl} alt={`${name} logosu`} className={cn('rounded-[10px] object-cover', className)} />;
    }
    return (
        <span
            aria-hidden="true"
            className={cn('flex shrink-0 items-center justify-center rounded-[10px] bg-[var(--site-accent)] font-extrabold text-[var(--site-on-accent)]', headingFont, className)}
        >
            {initials(name)}
        </span>
    );
}

export function SiteHeader({ name, logoUrl, showLocation, onReserve }: { name: string; logoUrl?: string; showLocation: boolean; onReserve?: () => void }) {
    const navLink = 'flex min-h-11 items-center px-3 text-[15px] font-medium text-[var(--site-sub)] no-underline hover:text-[var(--site-text)]';
    return (
        <header className="border-b border-[var(--site-border)]">
            <div className={cn(sectionWrap, 'flex h-[72px] items-center justify-between gap-4 md:h-20')}>
                <a href="#ust" className="flex min-w-0 items-center gap-3 text-[var(--site-text)] no-underline">
                    <LogoBadge name={name} logoUrl={logoUrl} className="h-9 w-9 text-base md:h-10 md:w-10 md:text-lg" />
                    <span className={cn(headingFont, 'truncate text-[19px] font-bold md:text-[22px]')}>{name}</span>
                </a>
                <nav aria-label="Ana menü" className="hidden items-center gap-2 md:flex">
                    <a href="#menu" className={navLink}>Menü</a>
                    {onReserve && <a href="#rezervasyon" className={navLink}>Rezervasyon</a>}
                    {showLocation && <a href="#konum" className={navLink}>Konum</a>}
                    {onReserve && (
                        <button type="button" onClick={onReserve} className={cn(accentButton, 'ml-2 h-11 px-5 text-[15px]')}>
                            Masa ayırt
                        </button>
                    )}
                </nav>
            </div>
        </header>
    );
}

interface HeroProps {
    name: string;
    subtitle: string;
    coverUrl?: string;
    onReserve?: () => void;
}

export function SiteHero({ name, subtitle, coverUrl, onReserve }: HeroProps) {
    return (
        <section id="ust" className={cn(sectionWrap, 'grid items-center gap-8 pb-8 pt-6 md:gap-12 md:pb-10 md:pt-14', coverUrl && 'md:grid-cols-2')}>
            {coverUrl && (
                <img src={coverUrl} alt="" className="aspect-[4/3] w-full rounded-[20px] object-cover md:order-2 md:aspect-[4/5] md:rounded-3xl" />
            )}
            <div className="flex flex-col gap-5 md:gap-6">
                <h1 className={cn(headingFont, 'text-[46px] font-extrabold leading-[0.98] tracking-[-0.03em] md:text-[76px]')}>{name}</h1>
                {subtitle && <p className="max-w-[34ch] text-base text-[var(--site-sub)] md:text-[19px]">{subtitle}</p>}
                <div className="hidden flex-wrap gap-3 md:flex">
                    {onReserve && (
                        <button type="button" onClick={onReserve} className={cn(accentButton, 'h-14 px-7 text-base')}>Masa ayırt</button>
                    )}
                    <a href="#menu" className={cn(outlineButton, 'h-14 px-7 text-base')}>Menüye bak</a>
                </div>
            </div>
        </section>
    );
}

interface InfoStripProps {
    address: string;
    phone: string;
    regions: string[];
}

/** Adres, telefon ve oturma alanları. Olmayan bilgi kutusu çizilmez. */
export function InfoStrip({ address, phone, regions }: InfoStripProps) {
    const cell = 'flex min-h-[72px] flex-col justify-center gap-0.5 bg-[var(--site-band)] px-5 py-4 text-[var(--site-text)] no-underline md:px-6 md:py-5';
    const label = 'text-[13px] text-[var(--site-muted)]';
    const value = 'text-[15px] font-semibold md:text-base';
    const cells = [
        address && (
            <a key="adres" href={directionsUrl(address)} target="_blank" rel="noopener noreferrer" className={cn(cell, 'hover:bg-[var(--site-card)]')}>
                <span className={label}>Adres · yol tarifi</span>
                <span className={value}>{address}</span>
            </a>
        ),
        phone && (
            <a key="telefon" href={telHref(phone)} className={cn(cell, 'hover:bg-[var(--site-card)]')}>
                <span className={label}>Telefon</span>
                <span className={cn(value, 'tabular-nums')}>{phone}</span>
            </a>
        ),
        regions.length > 0 && (
            <div key="oturma" className={cell}>
                <span className={label}>Oturma</span>
                <span className={value}>{regions.join(' · ')}</span>
            </div>
        ),
    ].filter(Boolean);
    if (cells.length === 0) return null;
    return (
        <section aria-label="Restoran bilgileri" className={cn(sectionWrap, 'pb-14 md:pb-[72px]')}>
            <div className="grid grid-cols-1 gap-px overflow-hidden rounded-[20px] border border-[var(--site-border)] bg-[var(--site-border)] sm:grid-cols-[repeat(auto-fit,minmax(220px,1fr))]">
                {cells}
            </div>
        </section>
    );
}

export function AboutSection({ text }: { text?: string }) {
    if (!text) return null;
    return (
        <section className={cn(sectionWrap, 'flex flex-col gap-3 pb-14 md:pb-20')}>
            <span className={eyebrow}>Hakkımızda</span>
            <p className="max-w-[640px] text-base leading-relaxed text-[var(--site-sub)] md:text-[19px]">{text}</p>
        </section>
    );
}

export function MenuHeading() {
    return (
        <div className="flex flex-col gap-2 px-4 md:px-6">
            <span className={eyebrow}>Menü</span>
            <h2 id="menu-baslik" className={sectionTitle}>Ne yemek istersiniz?</h2>
        </div>
    );
}

export function HoursSection({ hours }: { hours?: { day: string; time: string }[] }) {
    if (!hours || hours.length === 0) return null;
    return (
        <section className={cn(sectionWrap, 'flex flex-col gap-4 py-14 md:py-20')}>
            <span className={eyebrow}>Çalışma saatleri</span>
            <dl className="md:max-w-[480px]">
                {hours.map(row => (
                    <div key={row.day} className="flex justify-between border-b border-[var(--site-border)] py-3 text-[15px] md:text-base">
                        <dt className="text-[var(--site-sub)]">{row.day}</dt>
                        <dd className="font-semibold tabular-nums">{row.time}</dd>
                    </div>
                ))}
            </dl>
        </section>
    );
}

/** Masaüstünde ana sayfanın rezervasyon tanıtımı; düğme rezervasyon akışını açar. */
export function ReservationTeaser({ onReserve }: { onReserve?: () => void }) {
    if (!onReserve) return null;
    const steps = ['Gün, saat ve kişi sayısı', 'Ad ve telefon', 'Restoran onaylar'];
    return (
        <section id="rezervasyon" className={cn(sectionWrap, 'py-14 md:py-[88px]')}>
            <div className="grid items-center gap-8 rounded-3xl bg-[var(--site-paper)] p-6 text-[var(--site-on-paper)] md:grid-cols-2 md:gap-12 md:p-12">
                <div className="flex flex-col gap-3">
                    <h2 className={cn(headingFont, 'text-[28px] font-bold leading-[1.05] md:text-[44px]')}>Masanız hazır olsun.</h2>
                    <p className="max-w-[38ch] text-[15px] text-[var(--site-on-paper-sub)] md:text-[17px]">
                        Talebinizi gönderin, restoran onayladığında rezervasyonunuz kesinleşir. Masa 2 saat boyunca sizin.
                    </p>
                </div>
                <div className="flex flex-col gap-5">
                    <ol className="m-0 flex list-none flex-col gap-3 p-0 text-[15px]">
                        {steps.map((step, i) => (
                            <li key={step} className="flex items-center gap-3">
                                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#CFC4B6] text-[13px] font-semibold">{i + 1}</span>
                                {step}
                            </li>
                        ))}
                    </ol>
                    <button
                        type="button"
                        onClick={onReserve}
                        className="inline-flex h-14 items-center justify-center rounded-full bg-[var(--site-on-paper)] text-[17px] font-semibold text-[var(--site-paper)] transition-opacity hover:opacity-90"
                    >
                        Masa ayırt
                    </button>
                </div>
            </div>
        </section>
    );
}

export function GallerySection({ images }: { images?: { url: string; alt: string }[] }) {
    if (!images || images.length === 0) return null;
    return (
        <section className={cn(sectionWrap, 'flex flex-col gap-4 pb-14 md:gap-7 md:pb-24')}>
            <span className={eyebrow}>Galeri</span>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-4">
                {images.map(image => (
                    <img key={image.url} src={image.url} alt={image.alt} loading="lazy" className="h-[130px] w-full rounded-xl object-cover md:h-[220px] md:rounded-2xl" />
                ))}
            </div>
        </section>
    );
}

function InstagramIcon() {
    return (
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="2" width="20" height="20" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" />
        </svg>
    );
}

function WhatsAppIcon() {
    return (
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 11.5a8.4 8.4 0 0 1-12.3 7.5L3 21l2-5.5A8.5 8.5 0 1 1 21 11.5z" />
        </svg>
    );
}

interface FooterProps {
    name: string;
    address: string;
    phone: string;
    instagramUrl?: string;
    whatsappUrl?: string;
}

/** Alt bilgi; adres varsa "Konum" bağlantısının hedefi de burası. */
export function SiteFooter({ name, address, phone, instagramUrl, whatsappUrl }: FooterProps) {
    const socialClass = 'flex h-11 w-11 items-center justify-center rounded-full border border-[var(--site-border-strong)] text-[var(--site-text)] hover:border-[var(--site-text)]';
    const label = 'text-[13px] text-[var(--site-muted)]';
    return (
        <footer id="konum" className="mt-auto scroll-mt-4 border-t border-[var(--site-border)]">
            <div className={cn(sectionWrap, 'grid gap-8 pb-8 pt-12 md:grid-cols-3 md:gap-10 md:pt-16')}>
                <div className="flex flex-col gap-3">
                    <p className={cn(headingFont, 'text-[24px] font-bold md:text-[26px]')}>{name}</p>
                    {address && <p className="text-[15px] text-[var(--site-sub)]">{address}</p>}
                    {address && (
                        <a href={directionsUrl(address)} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 self-start font-semibold text-[var(--site-accent)] no-underline hover:underline">
                            <Navigation className="h-4 w-4" aria-hidden="true" />
                            Yol tarifi al
                        </a>
                    )}
                </div>
                {(phone || instagramUrl || whatsappUrl) && (
                    <div className="flex flex-col gap-2">
                        <span className={label}>Bize ulaşın</span>
                        {phone && (
                            <a href={telHref(phone)} className="inline-flex min-h-11 items-center gap-2 self-start text-[15px] font-semibold tabular-nums text-[var(--site-text)] no-underline hover:underline">
                                <Phone className="h-4 w-4 text-[var(--site-muted)]" aria-hidden="true" />
                                {phone}
                            </a>
                        )}
                        {(instagramUrl || whatsappUrl) && (
                            <div className="flex gap-2.5">
                                {instagramUrl && <a href={instagramUrl} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className={socialClass}><InstagramIcon /></a>}
                                {whatsappUrl && <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" className={socialClass}><WhatsAppIcon /></a>}
                            </div>
                        )}
                    </div>
                )}
            </div>
            <div className={cn(sectionWrap, 'flex flex-wrap items-center justify-between gap-3 border-t border-[var(--site-border)] pb-8 pt-3 text-[13px] text-[var(--site-muted)]')}>
                <span>© {new Date().getFullYear()} {name} · Sophram ile hazırlandı</span>
                <Link to="/login" className="inline-flex min-h-11 items-center text-[var(--site-muted)] underline-offset-4 hover:underline">Personel girişi</Link>
            </div>
        </footer>
    );
}

/** Telefonda ekranın altına yapışan "Menü / Masa ayırt" çubuğu. */
export function PhoneActionBar({ onReserve }: { onReserve?: () => void }) {
    if (!onReserve) return null;
    return (
        <div className="fixed inset-x-0 bottom-0 z-30 flex gap-2 border-t border-[var(--site-border)] bg-[var(--site-bg)] px-4 pb-5 pt-3 md:hidden">
            <a href="#menu" className={cn(outlineButton, 'h-[52px] flex-1')}>Menü</a>
            <button type="button" onClick={onReserve} className={cn(accentButton, 'h-[52px] flex-[2]')}>Masa ayırt</button>
        </div>
    );
}

function statusBadge(status: number): { text: string; className: string } {
    if (status === RESERVATION_CONFIRMED) return { text: 'Onaylandı', className: 'bg-[#DCF2E3] text-[#14532D]' };
    if (status === RESERVATION_REJECTED) return { text: 'Onaylanmadı', className: 'bg-[#FBE1DC] text-[#7F1D1D]' };
    if (status === RESERVATION_CANCELLED) return { text: 'İptal edildi', className: 'bg-[var(--site-raised)] text-[var(--site-sub)]' };
    if (status === RESERVATION_PENDING) return { text: 'Onay bekliyor', className: 'bg-[#FCEBC7] text-[#713F12]' };
    return { text: 'Kayıtlı', className: 'bg-[var(--site-raised)] text-[var(--site-sub)]' };
}

/** Bu cihazdan gönderilen rezervasyon taleplerinin güncel durumu. */
export function MyReservations({ items, className }: { items: ReservationStatusInfo[]; className?: string }) {
    if (items.length === 0) return null;
    return (
        <section aria-label="Rezervasyon talepleriniz" className={cn('flex flex-col gap-2.5', className)}>
            <h2 className={cn(headingFont, 'text-[22px] font-bold')}>Rezervasyon talepleriniz</h2>
            <ul className="flex flex-col gap-2">
                {items.map(reservation => {
                    const badge = statusBadge(reservation.status);
                    return (
                        <li key={reservation.id} className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--site-border)] bg-[var(--site-card)] p-4">
                            <div className="min-w-0">
                                <p className="text-[15px] font-semibold">
                                    {formatDay(reservation.date)} · <span className="tabular-nums">{reservation.time}–{reservation.endTime}</span>
                                </p>
                                <p className="text-sm text-[var(--site-sub)]">{reservation.tableName} · {reservation.partySize} kişi</p>
                            </div>
                            <span className={cn('shrink-0 rounded-full px-3 py-1.5 text-xs font-bold', badge.className)}>{badge.text}</span>
                        </li>
                    );
                })}
            </ul>
        </section>
    );
}
