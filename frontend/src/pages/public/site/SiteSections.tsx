import { Link } from 'react-router-dom';
import { BookOpen, CalendarCheck, MapPin, Navigation, Phone } from 'lucide-react';
import {
    RESERVATION_CANCELLED, RESERVATION_CONFIRMED, RESERVATION_PENDING, RESERVATION_REJECTED,
    type ReservationStatusInfo,
} from '@/features/customerSite/types';
import { cn } from '@/lib/utils';
import { directionsUrl, formatDay, headingFont, initials, telHref } from './siteTheme';

// Restoran sitesinin bölümleri. Verisi olmayan bölüm null döner; backend alanı eklenince kendiliğinden açılır.

const accentButton =
    'flex items-center justify-center gap-2 rounded-[14px] bg-[var(--site-accent)] font-semibold text-[var(--site-on-accent)] no-underline transition-opacity hover:opacity-90';
const lightButton =
    'flex items-center justify-center gap-2 rounded-[14px] border border-[var(--site-border)] bg-[var(--site-card)] font-semibold text-[var(--site-text)] no-underline transition-colors hover:border-[var(--site-accent)]';
const darkOutlineButton =
    'flex items-center justify-center gap-2 rounded-xl border border-[var(--site-muted)] px-5 font-semibold text-[var(--site-on-dark)] no-underline transition-colors hover:border-[var(--site-on-dark)]';

export function LogoBadge({ name, logoUrl, className }: { name: string; logoUrl?: string; className?: string }) {
    if (logoUrl) {
        return <img src={logoUrl} alt={`${name} logosu`} className={cn('rounded-full bg-[var(--site-card)] object-cover', className)} />;
    }
    return (
        <span
            aria-hidden="true"
            className={cn('flex items-center justify-center rounded-full bg-[var(--site-card)] font-bold text-[var(--site-accent)]', headingFont, className)}
        >
            {initials(name)}
        </span>
    );
}

interface ActionProps {
    onReserve?: () => void;
    phone: string;
    address: string;
}

function secondaryActions({ phone, address }: ActionProps) {
    const items: { key: string; label: string; href: string; icon: typeof Phone; external?: boolean }[] = [
        { key: 'menu', label: 'Menü', href: '#menu', icon: BookOpen },
    ];
    if (phone) items.push({ key: 'call', label: 'Ara', href: telHref(phone), icon: Phone });
    if (address) items.push({ key: 'directions', label: 'Yol tarifi', href: directionsUrl(address), icon: Navigation, external: true });
    return items;
}

/** Telefon: Rezervasyon tam genişlik, diğerleri ikişerli; tek kalan tam genişlik. */
export function QuickActionsPhone(props: ActionProps) {
    const items = secondaryActions(props);
    return (
        <nav aria-label="Hızlı eylemler" className="grid grid-cols-2 gap-2.5 px-5 py-5">
            {props.onReserve && (
                <button type="button" onClick={props.onReserve} className={cn(accentButton, 'col-span-2 h-[52px] text-base')}>
                    <CalendarCheck className="h-[18px] w-[18px]" aria-hidden="true" />
                    Rezervasyon yap
                </button>
            )}
            {items.map(({ key, label, href, icon: Icon, external }, index) => (
                <a
                    key={key}
                    href={href}
                    {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                    className={cn(lightButton, 'h-12 text-[15px]', index === items.length - 1 && items.length % 2 === 1 && 'col-span-2')}
                >
                    <Icon className="h-[17px] w-[17px]" aria-hidden="true" />
                    {label}
                </a>
            ))}
        </nav>
    );
}

/** Masaüstü: kapak üstündeki koyu kartta yan yana. */
function QuickActionsDesktop(props: ActionProps) {
    const items = secondaryActions(props).map(item => item.key === 'menu' ? { ...item, label: 'Menüyü gör' } : item);
    return (
        <div className="mt-3 flex flex-wrap gap-2.5">
            {props.onReserve && (
                <button type="button" onClick={props.onReserve} className={cn(accentButton, 'h-[52px] rounded-xl px-6 text-base')}>
                    Rezervasyon yap
                </button>
            )}
            {items.map(({ key, label, href, external }) => (
                <a key={key} href={href} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})} className={cn(darkOutlineButton, 'h-[52px] text-base')}>
                    {label}
                </a>
            ))}
        </div>
    );
}

interface HeroProps extends ActionProps {
    name: string;
    subtitle: string;
    coverUrl?: string;
    logoUrl?: string;
}

export function SiteHero({ name, subtitle, coverUrl, logoUrl, ...actions }: HeroProps) {
    return (
        <>
            {/* Telefon */}
            <header className="md:hidden">
                <div className="relative">
                    {coverUrl
                        ? <img src={coverUrl} alt="" className="h-[300px] w-full object-cover" />
                        : <div className="h-[150px] bg-[var(--site-accent)]" />}
                    <LogoBadge name={name} logoUrl={logoUrl} className="absolute -bottom-10 left-5 h-[84px] w-[84px] border-4 border-[var(--site-bg)] text-[28px]" />
                </div>
                <div className="flex flex-col gap-2 px-5 pt-[52px]">
                    <h1 className={cn(headingFont, 'text-[36px] font-bold leading-[1.05]')}>{name}</h1>
                    {subtitle && <p className="text-base text-[var(--site-sub)]">{subtitle}</p>}
                </div>
                <QuickActionsPhone {...actions} />
            </header>

            {/* Masaüstü */}
            <section className="relative hidden h-[560px] md:block">
                {coverUrl
                    ? <img src={coverUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
                    : <div className="absolute inset-0 bg-[var(--site-accent)]" />}
                <div className="relative mx-auto flex h-full max-w-[1280px] items-end px-10 pb-16 lg:px-20">
                    <div className="flex w-full max-w-[560px] flex-col gap-3 rounded-[20px] bg-[var(--site-dark)] px-10 py-9 text-[var(--site-on-dark)]">
                        <h1 className={cn(headingFont, 'text-[56px] font-bold leading-none')}>{name}</h1>
                        {subtitle && <p className="text-[19px] text-[var(--site-on-dark-sub)]">{subtitle}</p>}
                        <QuickActionsDesktop {...actions} />
                    </div>
                </div>
            </section>
        </>
    );
}

export function SiteHeaderDesktop({ name, logoUrl, showLocation, onReserve }: { name: string; logoUrl?: string; showLocation: boolean; onReserve?: () => void }) {
    return (
        <header className="hidden border-b border-[var(--site-border)] md:block">
            <div className="mx-auto flex h-20 max-w-[1280px] items-center justify-between px-10 lg:px-20">
                <div className="flex items-center gap-3.5">
                    <LogoBadge name={name} logoUrl={logoUrl} className="h-12 w-12 border border-[var(--site-border)] text-lg" />
                    <span className={cn(headingFont, 'text-2xl font-bold')}>{name}</span>
                </div>
                <nav aria-label="Ana menü" className="flex items-center gap-2 text-[15px] font-medium">
                    <a href="#menu" className="px-3.5 py-3 text-[var(--site-text)] no-underline hover:text-[var(--site-accent)]">Menü</a>
                    {showLocation && <a href="#konum" className="px-3.5 py-3 text-[var(--site-text)] no-underline hover:text-[var(--site-accent)]">Konum</a>}
                    {onReserve && (
                        <button type="button" onClick={onReserve} className={cn(accentButton, 'ml-2 h-[46px] rounded-xl px-5')}>
                            Rezervasyon yap
                        </button>
                    )}
                </nav>
            </div>
        </header>
    );
}

const sectionWrap = 'mx-auto w-full max-w-[1280px] px-5 md:px-10 lg:px-20';
const sectionTitle = cn(headingFont, 'text-2xl font-bold md:text-[40px]');

export function AboutSection({ text }: { text?: string }) {
    if (!text) return null;
    return (
        <section className={cn(sectionWrap, 'flex flex-col gap-2.5 py-7 md:py-20')}>
            <h2 className={sectionTitle}>Hakkımızda</h2>
            <p className="max-w-[620px] text-base leading-relaxed text-[var(--site-sub)] md:text-[19px]">{text}</p>
        </section>
    );
}

export function HoursSection({ hours }: { hours?: { day: string; time: string }[] }) {
    if (!hours || hours.length === 0) return null;
    return (
        <section className={cn(sectionWrap, 'flex flex-col gap-3 py-7 md:py-16')}>
            <h2 className={sectionTitle}>Çalışma saatleri</h2>
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

export function LocationSection({ address, location, phone }: { address: string; location: string; phone: string }) {
    if (!address && !location && !phone) return null;
    const fullAddress = [address, location].filter(Boolean).join(', ');
    return (
        <section id="konum" className={cn(sectionWrap, 'scroll-mt-4 py-7 md:py-20')}>
            <div className="flex flex-col gap-3 md:max-w-[560px]">
                <h2 className={sectionTitle}>Konum</h2>
                {fullAddress && (
                    <p className="flex items-start gap-2 text-[15px] leading-relaxed md:text-lg">
                        <MapPin className="mt-1 h-4 w-4 shrink-0 text-[var(--site-muted)]" aria-hidden="true" />
                        <span>
                            {address && <>{address}<br /></>}
                            {location}
                        </span>
                    </p>
                )}
                <div className="grid grid-cols-2 gap-2.5 md:flex">
                    {fullAddress && (
                        <a href={directionsUrl(fullAddress)} target="_blank" rel="noopener noreferrer" className={cn(lightButton, 'h-12 px-5 text-[15px]', !phone && 'col-span-2')}>
                            <Navigation className="h-4 w-4" aria-hidden="true" />
                            Yol tarifi
                        </a>
                    )}
                    {phone && (
                        <a href={telHref(phone)} className={cn(lightButton, 'h-12 px-5 text-[15px] tabular-nums', !fullAddress && 'col-span-2')}>
                            <Phone className="h-4 w-4" aria-hidden="true" />
                            {phone}
                        </a>
                    )}
                </div>
            </div>
        </section>
    );
}

export function GallerySection({ images }: { images?: { url: string; alt: string }[] }) {
    if (!images || images.length === 0) return null;
    return (
        <section className={cn(sectionWrap, 'flex flex-col gap-3 pb-8 md:gap-7 md:pb-24')}>
            <h2 className={sectionTitle}>Galeri</h2>
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

export function SiteFooter({ name, instagramUrl, whatsappUrl }: { name: string; instagramUrl?: string; whatsappUrl?: string }) {
    const socialClass = 'flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--site-dark-line)] text-[var(--site-on-dark)] hover:border-[var(--site-on-dark)]';
    return (
        <footer className="mt-auto bg-[var(--site-dark)] text-[var(--site-on-dark)]">
            <div className={cn(sectionWrap, 'flex flex-col gap-5 pb-6 pt-7 md:pb-8 md:pt-12')}>
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <p className={cn(headingFont, 'text-[22px] font-bold md:text-[28px]')}>{name}</p>
                    {(instagramUrl || whatsappUrl) && (
                        <div className="flex gap-2.5">
                            {instagramUrl && <a href={instagramUrl} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className={socialClass}><InstagramIcon /></a>}
                            {whatsappUrl && <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" className={socialClass}><WhatsAppIcon /></a>}
                        </div>
                    )}
                </div>
                <div className="flex items-center justify-between border-t border-[var(--site-dark-line)] pt-3.5 text-[13px] text-[var(--site-on-dark-sub)] md:text-sm">
                    <span>Sophram ile</span>
                    <Link to="/login" className="py-3 text-[var(--site-on-dark-sub)] underline-offset-4 hover:underline">Personel girişi</Link>
                </div>
            </div>
        </footer>
    );
}

function statusBadge(status: number): { text: string; className: string } {
    if (status === RESERVATION_CONFIRMED) return { text: 'Onaylandı', className: 'bg-[#DCF2E3] text-[#14532D]' };
    if (status === RESERVATION_REJECTED) return { text: 'Onaylanmadı', className: 'bg-[#FBE1DC] text-[#7F1D1D]' };
    if (status === RESERVATION_CANCELLED) return { text: 'İptal edildi', className: 'bg-[var(--site-disabled)] text-[var(--site-sub)]' };
    if (status === RESERVATION_PENDING) return { text: 'Onay bekliyor', className: 'bg-[#FCEBC7] text-[#713F12]' };
    return { text: 'Kayıtlı', className: 'bg-[var(--site-disabled)] text-[var(--site-sub)]' };
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
                        <li key={reservation.id} className="flex items-center justify-between gap-3 rounded-[14px] border border-[var(--site-border)] bg-[var(--site-card)] p-3.5">
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
