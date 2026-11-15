import type { ReactNode } from 'react';
import type { PublicSite } from '@/features/customerSite/types';
import { cn } from '@/lib/utils';
import { cardLabel, siteCard, siteCardDark } from './siteParts';
import { hoursText } from './useSite';

// Restoran sitesinin alt sayfalarındaki kart dili (İletişim'de başladı; Hakkımızda, Mekân, Menü de kullanacak):
// beyaz yuvarlak yüzey, ikon karesi + etiket + değer + eylem düğmesi olan bilgi kartı, koyu çağrı kartı,
// kapaktaki cam "şu an açık" hapı ve kart içindeki açık/kapalı rozeti.

/**
 * İkon karesi + etiket başlığı, altında değer ve isteğe bağlı eylem. `tone="dark"` koyu çağrı kartı (ikonsuz da olur).
 * `labelId` verilirse kart bir `section` olur ve etiket onun başlığıdır.
 */
export function InfoCard({ icon, label, labelId, tone = 'light', action, className, children }: {
    icon?: ReactNode; label: string; labelId?: string; tone?: 'light' | 'dark'; action?: ReactNode; className?: string; children?: ReactNode;
}) {
    const dark = tone === 'dark';
    return (
        <section aria-labelledby={labelId} className={cn('flex min-w-0 flex-col gap-3.5 p-5 md:p-6', dark ? siteCardDark : siteCard, className)}>
            <div className="flex items-center gap-3">
                {icon && (
                    <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F6E2D9] text-[#B8401A] [&>svg]:h-5 [&>svg]:w-5">
                        {icon}
                    </span>
                )}
                <h2 id={labelId} className={cn(cardLabel, 'm-0', dark && 'text-[#BDBDBD]')}>{label}</h2>
            </div>
            {children}
            {action}
        </section>
    );
}

/** Kapaktaki cam hap: "● Şu an açık · Her gün 08:00 – 23:00". `open` null ise nokta çizilmez. */
export function GlassStatusPill({ open, children, className }: { open: boolean | null; children: ReactNode; className?: string }) {
    return (
        <span className={cn('inline-flex items-center gap-2 self-start rounded-full border border-white/30 bg-white/15 px-3.5 py-2 text-[13px] text-white backdrop-blur-[10px] md:gap-2.5 md:px-[18px] md:self-auto md:py-2.5 md:text-sm', className)}>
            {open !== null && <span aria-hidden="true" className={cn('h-[7px] w-[7px] shrink-0 rounded-full md:h-2 md:w-2', open ? 'bg-[#5EE08F]' : 'bg-[#F4A28C]')} />}
            <span>{children}</span>
        </span>
    );
}

/**
 * Alt sayfa kapaklarının (İletişim, Hakkımızda, Mekân) cam hapı: "● Şu an açık · Her gün 08:00 – 23:00".
 * Saat girilmemişse çizilmez; dar ekranda açık/kapalı biliniyorsa "Her gün" kısaltılır.
 */
export function HeroStatusPill({ site }: { site: PublicSite }) {
    const hours = hoursText(site);
    if (!hours) return null;
    return (
        <GlassStatusPill open={site.isOpenNow}>
            {site.isOpenNow !== null && <>{site.isOpenNow ? 'Şu an açık' : 'Şu an kapalı'} · </>}
            <span className={cn(site.isOpenNow !== null && 'hidden md:inline')}>Her gün </span>{hours}
        </GlassStatusPill>
    );
}

/** Kart içindeki "● Şu an açık / kapalı" rozeti. */
export function OpenBadge({ open, className }: { open: boolean; className?: string }) {
    return (
        <span className={cn('inline-flex items-center gap-2 self-start rounded-full px-3 py-1.5 text-[13px] font-semibold',
            open ? 'bg-[var(--site-ok-bg)] text-[var(--site-ok)]' : 'bg-[var(--site-error-bg)] text-[var(--site-error)]', className)}>
            <span aria-hidden="true" className="h-[7px] w-[7px] rounded-full bg-current" />
            {open ? 'Şu an açık' : 'Şu an kapalı'}
        </span>
    );
}

// ── Kart ikonları (çizgi, currentColor) ──────────────────────────────────────────────────────────
const svgProps = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true } as const;

export function PhoneIcon() {
    return <svg {...svgProps}><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z" /></svg>;
}

export function ClockIcon() {
    return <svg {...svgProps}><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>;
}

export function InstagramIcon() {
    return <svg {...svgProps}><rect x="2" y="2" width="20" height="20" rx="5" /><circle cx="12" cy="12" r="4" /><line x1="17.5" y1="6.5" x2="17.5" y2="6.5" /></svg>;
}

export function MapPinIcon() {
    return <svg {...svgProps}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>;
}

/** Menü kartının fincan ikonu. */
export function CupIcon() {
    return <svg {...svgProps}><path d="M18 8h1a4 4 0 0 1 0 8h-1" /><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" /><line x1="6" y1="1" x2="6" y2="4" /><line x1="10" y1="1" x2="10" y2="4" /><line x1="14" y1="1" x2="14" y2="4" /></svg>;
}

/** Oturma bölümleri kartının kemer ikonu. */
export function SeatingIcon() {
    return <svg {...svgProps}><path d="M3 21V10a9 9 0 0 1 18 0v11" /><line x1="3" y1="21" x2="21" y2="21" /></svg>;
}

export function DirectionsIcon({ className }: { className?: string }) {
    return <svg {...svgProps} width="16" height="16" className={className}><polygon points="3 11 22 2 13 21 11 13 3 11" /></svg>;
}
