import type { ReactNode } from 'react';
import type { PublicSite } from '@/features/customerSite/types';
import { cn } from '@/lib/utils';
import { cardLabel, serif, siteCard, siteCardDark } from './siteParts';
import { hoursLine, weekSchedule } from './useSite';
import { editTarget, useSiteEdit } from './siteEditContext';

// Restoran sitesinin kart dili (ana sayfa, Menü, Hakkımızda, Mekân, İletişim): yuvarlak yüzey, ikon karesi + etiket +
// değer + eylem düğmesi olan bilgi kartı, koyu çağrı kartı, kapaktaki cam "şu an açık" hapı, açık/kapalı rozeti ve
// gün gün saat tablosu. Renkler temanın değişkenlerinden.

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
                {icon && <IconTile>{icon}</IconTile>}
                <h2 id={labelId} className={cn(cardLabel, 'm-0', dark && 'text-[var(--site-on-paper-sub)]')}>{label}</h2>
            </div>
            {children}
            {action}
        </section>
    );
}

/** Kart başlığındaki ikon karesi: vurgunun açık tonu üstünde vurgu renginde çizgi ikon. */
export function IconTile({ children, className }: { children: ReactNode; className?: string }) {
    return (
        <span aria-hidden="true" className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--site-accent-soft)] text-[var(--site-accent-text)] [&>svg]:h-5 [&>svg]:w-5', className)}>
            {children}
        </span>
    );
}

/** Kapaktaki cam hap: "● Şu an açık · Her gün 08:00 – 23:00". `open` null ise nokta çizilmez. */
export function GlassStatusPill({ open, children, className, ...rest }: { open: boolean | null; children: ReactNode; className?: string; 'data-edit-target'?: string; 'data-edit-label'?: string }) {
    return (
        <span {...rest} className={cn('inline-flex items-center gap-2 self-start rounded-full border border-white/30 bg-white/15 px-3.5 py-2 text-[13px] text-white backdrop-blur-[10px] md:gap-2.5 md:px-[18px] md:self-auto md:py-2.5 md:text-sm', className)}>
            {open !== null && <span aria-hidden="true" className={cn('h-[7px] w-[7px] shrink-0 rounded-full md:h-2 md:w-2', open ? 'bg-[#5EE08F]' : 'bg-[#F4A28C]')} />}
            <span>{children}</span>
        </span>
    );
}

/**
 * Kapakların cam hapı: "● Şu an açık · Her gün 08:00 – 23:00" (haftalık saatte "Bugün 12:00 – 23:30").
 * Saat girilmemişse çizilmez; dar ekranda açık/kapalı biliniyorsa saat kısaltılmaz ama "Her gün" düşer.
 */
export function HeroStatusPill({ site, className }: { site: PublicSite; className?: string }) {
    const edit = useSiteEdit();
    const line = hoursLine(site);
    // Düzenleyicide hap tıklanınca saat düzenleyicisi açılır; saat yokken (boş alanlar açıkken) yerini gösterir.
    const target = editTarget(edit, 'hours', 'Çalışma saatleri');
    if (!line) {
        if (!edit?.showEmpty) return null;
        return <GlassStatusPill open={null} {...target} className={cn(className, target.className, 'border-dashed')}>+ Saat ekle</GlassStatusPill>;
    }
    return (
        <GlassStatusPill open={site.isOpenNow} {...target} className={cn(className, target.className)}>
            {site.isOpenNow !== null && <>{site.isOpenNow ? 'Şu an açık' : 'Şu an kapalı'} · </>}
            {line}
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

/**
 * Saat kartının içi: her gün aynıysa "Her gün  09:00 – 23:30" tek satır; değilse gün gün tablo (bugün vurgulu).
 * `compact`: haftalık saatte yalnız bugünün satırı ve "Tüm hafta →" bağlantısı (dar ekran, ana sayfa kartı).
 */
export function HoursBlock({ site, compact = false, weekHref, valueClassName }: {
    site: PublicSite; compact?: boolean; weekHref?: string; valueClassName?: string;
}) {
    const rows = weekSchedule(site);
    if (!rows) return null;
    const uniform = rows.every(r => r.isOpen && r.text === rows[0].text);
    const value = cn(serif, 'leading-none tabular-nums', valueClassName ?? 'text-[26px] md:text-[32px]');

    if (uniform || compact) {
        const row = uniform ? rows[0] : rows.find(r => r.isToday) ?? rows[0];
        return (
            <div className="flex flex-col gap-1.5">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <span className="text-[15px] font-semibold">{uniform ? 'Her gün' : `Bugün · ${row.label}`}</span>
                    <span className={value}>{row.text}</span>
                </div>
                {!uniform && weekHref && <a href={weekHref} className="self-start text-sm font-semibold underline underline-offset-4">Tüm hafta →</a>}
            </div>
        );
    }

    return (
        <table className="w-full border-collapse text-[15px]">
            <caption className="sr-only">Haftalık çalışma saatleri</caption>
            <tbody>
                {rows.map(r => (
                    <tr key={r.day} className={cn('border-t border-[var(--site-border)] first:border-t-0', r.isToday && 'font-semibold')}>
                        <th scope="row" className={cn('py-2 pr-3 text-left font-[inherit]', r.isToday ? 'text-[var(--site-text)]' : 'text-[var(--site-sub)]')}>
                            {r.label}{r.isToday && <span className="ml-1.5 rounded-full bg-[var(--site-accent-soft)] px-2 py-0.5 text-[11px] font-bold text-[var(--site-accent-text)]">bugün</span>}
                        </th>
                        <td className={cn('py-2 text-right tabular-nums', !r.isOpen && 'text-[var(--site-muted)]')}>{r.text}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

/** Konum kartının süs haritası (gerçek harita değil; ızgara deseni ve iğne). Gerçek harita İletişim'de gömülü. */
export function MapStub({ className }: { className?: string }) {
    return (
        <div aria-hidden="true" className={cn('relative overflow-hidden bg-[var(--site-raised)]', className)}
            style={{
                backgroundImage: 'linear-gradient(var(--site-line) 1px, transparent 1px), linear-gradient(90deg, var(--site-line) 1px, transparent 1px), linear-gradient(115deg, transparent 46%, var(--site-border-strong) 46%, var(--site-border-strong) 54%, transparent 54%)',
                backgroundSize: '28px 28px, 28px 28px, 100% 100%',
            }}>
            <span style={{ transform: 'translate(-50%, -70%) rotate(-45deg)' }}
                className="absolute left-1/2 top-1/2 flex h-8 w-8 items-center justify-center rounded-full rounded-bl-none bg-[var(--site-accent)] shadow-[0_6px_16px_rgba(0,0,0,0.18)]">
                <span className="h-2.5 w-2.5 rounded-full bg-[var(--site-on-accent)]" />
            </span>
        </div>
    );
}

/** Beş yıldız (puana göre doluluk); ekran okuyucu "5 üzerinden 4,7" duyar. */
export function Stars({ value, className }: { value: number; className?: string }) {
    const full = Math.round(value);
    return (
        <span aria-hidden="true" className={cn('tracking-[0.12em] text-[#E8A33D]', className)}>
            {'★★★★★'.slice(0, full)}<span className="opacity-30">{'★★★★★'.slice(full)}</span>
        </span>
    );
}

// ── Kart ikonları (çizgi, currentColor) ──────────────────────────────────────────────────────────
const svgProps = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true } as const;

export function PhoneIcon({ className }: { className?: string }) {
    return <svg {...svgProps} className={className}><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z" /></svg>;
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

export function WhatsAppIcon({ className }: { className?: string }) {
    return <svg {...svgProps} className={className}><path d="M3 21l1.7-5A8.5 8.5 0 1 1 8 19.4L3 21z" /><path d="M9 9.5c.3 1.6 1.9 3.4 3.6 4.1l1.2-1 1.7.7c-.2 1-.9 1.7-1.9 1.7-3 0-5.8-2.8-5.8-5.8 0-1 .7-1.7 1.7-1.9l.7 1.7-1.2.5z" /></svg>;
}

export function StarIcon() {
    return <svg {...svgProps}><polygon points="12 2 15.1 8.3 22 9.3 17 14.1 18.2 21 12 17.8 5.8 21 7 14.1 2 9.3 8.9 8.3 12 2" /></svg>;
}

export function ClipboardIcon() {
    return <svg {...svgProps}><path d="M9 4h6l1 2h3v15H5V6h3l1-2z" /><path d="M9 12h6M9 16h4" /></svg>;
}

export function BagIcon({ className }: { className?: string }) {
    return <svg {...svgProps} className={className}><path d="M5 8h14l-1 13H6L5 8z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></svg>;
}

export function CalendarIcon({ className }: { className?: string }) {
    return <svg {...svgProps} className={className}><rect x="3" y="4" width="18" height="17" rx="3" /><path d="M8 2v4M16 2v4M3 10h18" /></svg>;
}

export function MenuBookIcon({ className }: { className?: string }) {
    return <svg {...svgProps} className={className}><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2V5z" /><path d="M8 7h7M8 11h7" /></svg>;
}
