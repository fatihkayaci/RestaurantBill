import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { canReserveOnline, type PublicSite } from '@/features/customerSite/types';
import { cn } from '@/lib/utils';
import { StockImageLabel } from '../../../components/StockImageLabel';
import { RESERVATION_PATH } from '../../siteParts';
import { telHref } from '../../siteTheme';
import { EditableBlock } from '../../siteEdit';
import { useSiteEdit } from '../../siteEditContext';
import { mhButton, mhTitle, tonightLine } from './meyhaneParts';

// Meyhane Gecesi'nin küçük parçaları: lamba dizisi (tasarımın imzası), gece kapağı zemini, "bu akşam" şeridi, süs
// ayracı, bölüm başlığı ve "Masa ayırt" bandı.

const BULBS = 13;

/**
 * Kapağın tepesinde sarkan lamba dizisi: tel bir kavis (SVG, genişliğe uzar), ampuller teldeki yerlerinde (yüzde
 * konumlu; telefonda tek tek seyrelir). Ampul rengi vurgu rengi; birkaçı hafifçe titrer (hareket azaltmada durur).
 */
export function LampString({ className, sag = 34 }: { className?: string; sag?: number }) {
    // Tel: (-20, 4) → (1020, 4), denetim noktası (500, 8 + 2·sag); ampulün tepesi telin 7 px altında (sapı ::before).
    const bulbs = Array.from({ length: BULBS }, (_, i) => {
        const x = (i + 0.5) / BULBS;
        const u = (1000 * x + 20) / 1040;
        return { x, y: 11 + u * (1 - u) * (8 + 4 * sag) };
    });
    return (
        <div aria-hidden="true" className={cn('pointer-events-none absolute inset-x-0 top-0', className)} style={{ height: sag + 40 }}>
            <svg className="absolute inset-0 h-full w-full overflow-visible" viewBox={`0 0 1000 ${sag + 40}`} preserveAspectRatio="none">
                <path d={`M-20 4 Q500 ${8 + sag * 2} 1020 4`} fill="none" stroke="var(--site-border-strong)" strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
            </svg>
            {bulbs.map((b, i) => (
                <span key={i} className={cn('rb-mh-bulb absolute', i % 2 === 1 && 'max-sm:hidden', i % 4 === 2 && 'rb-mh-flicker')}
                    style={{ left: `${b.x * 100}%`, top: b.y }} />
            ))}
        </div>
    );
}

/** Bölümler arası süs: iki ince çizgi arasında küçük lamba (vurgu rengi). */
export function Ornament({ className }: { className?: string }) {
    return (
        <span aria-hidden="true" className={cn('flex items-center justify-center gap-3 text-[var(--site-accent-text)]', className)}>
            <span className="h-px w-12 bg-[linear-gradient(90deg,transparent,var(--site-accent-line))] sm:w-20" />
            <svg width="18" height="22" viewBox="0 0 18 22" fill="none">
                <path d="M9 1v4" stroke="var(--site-border-strong)" strokeWidth="1.2" strokeLinecap="round" />
                <path d="M4 9a5 5 0 0 1 10 0v3a5 5 0 0 1-10 0z" fill="currentColor" opacity="0.9" />
                <path d="M6.5 6h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
            <span className="h-px w-12 bg-[linear-gradient(270deg,transparent,var(--site-accent-line))] sm:w-20" />
        </span>
    );
}

/** Ortalı bölüm başlığı: süs, başlık, isteğe bağlı kısa açıklama. */
export function MhHeading({ id, title, note, className }: { id: string; title: ReactNode; note?: ReactNode; className?: string }) {
    return (
        <div className={cn('flex flex-col items-center gap-3 text-center', className)}>
            <Ornament />
            <h2 id={id} className={mhTitle}>{title}</h2>
            {note && <p className="m-0 max-w-[52ch] text-base leading-relaxed text-[var(--site-sub)]">{note}</p>}
        </div>
    );
}

/**
 * Gece kapağının zemini: fotoğraf varsa tam genişlikte, üstünde kapak renginden sayfa zeminine inen koyu perde ve
 * ortada lamba ışığı; yoksa kapak renginde sıcak ışık halesi ve silik çini deseni. Düzenleyicide fotoğraf seçilir.
 */
export function NightBackdrop({ image, target, label, emptyHint }: { image?: string; target: string; label: string; emptyHint: string }) {
    const edit = useSiteEdit();
    return (
        <EditableBlock target={target} label={label} chip="Fotoğrafı değiştir" className="absolute inset-0">
            <span aria-hidden="true" className="absolute inset-0 bg-[var(--site-hero-bg)]" />
            {image ? (
                <>
                    <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover" />
                    <span aria-hidden="true" className="rb-mh-veil absolute inset-0" />
                    {image.includes('/shared/stock/') && <StockImageLabel className="bottom-auto right-3 top-24" />}
                </>
            ) : (
                <span aria-hidden="true" className="rb-mh-tiles absolute inset-0" />
            )}
            <span aria-hidden="true" className="rb-mh-glow absolute inset-0" />
            {edit && !image && (
                <span className="absolute left-1/2 top-24 -translate-x-1/2 whitespace-nowrap rounded-full border border-dashed border-[var(--site-border-strong)] bg-[var(--site-card)] px-4 py-2 font-[family-name:'DM_Sans',system-ui,sans-serif] text-[15px] font-semibold text-[var(--site-text)]">
                    {emptyHint}
                </span>
            )}
        </EditableBlock>
    );
}

/** "● Bu akşam açığız 18:00 – 02:00" şeridi (kapağın altı). Saat girilmemişse çizilmez. */
export function TonightStrip({ site, extra, className }: { site: PublicSite; extra?: ReactNode; className?: string }) {
    const line = tonightLine(site);
    const edit = useSiteEdit();
    if (!line) return edit?.showEmpty ? <EditableBlock target="hours" label="Çalışma saatleri"><p className="m-0 py-4 text-center font-bold">+ Çalışma saatlerini ekle</p></EditableBlock> : null;
    return (
        <EditableBlock target="hours" label="Çalışma saatleri">
            <p className={cn('m-0 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-center', className)}>
                <span className="inline-flex items-center gap-2.5">
                    <span aria-hidden="true" className={cn('h-2 w-2 shrink-0 rounded-full',
                        line.open ? 'bg-[var(--site-dot-ok)] shadow-[0_0_10px_2px_color-mix(in_srgb,var(--site-dot-ok)_55%,transparent)]'
                            : line.open === false ? 'bg-[var(--site-dot-bad)]' : 'bg-[var(--site-accent)] shadow-[0_0_10px_2px_color-mix(in_srgb,var(--site-accent)_55%,transparent)]')} />
                    <span className="font-[family-name:var(--site-serif)] text-[19px] leading-tight sm:text-[21px]">{line.label}</span>
                </span>
                {line.hours && <span className="text-[17px] font-bold tabular-nums text-[var(--site-accent-text)]">{line.hours}</span>}
                {extra}
            </p>
        </EditableBlock>
    );
}

/**
 * "Masa ayırt" bandı: kapak renginde gece bandı, tepesinde lamba dizisi, ortada davet ve düğmeler (rezervasyon açıksa
 * "Masa ayırt", telefon varsa "Ara"). İkisi de yoksa ya da düzenleyicide çizilmez.
 */
export function ReserveBand({ site, title = 'Bu akşam masanız hazır olsun.' }: { site: PublicSite; title?: string }) {
    const edit = useSiteEdit();
    const canReserve = canReserveOnline(site);
    if (edit || (!canReserve && !site.phone)) return null;
    return (
        <section aria-labelledby="mh-davet" className="rb-mh-band relative isolate overflow-hidden bg-[var(--site-hero-bg)] px-4 pb-16 pt-24 text-center sm:pb-20 sm:pt-28">
            <LampString sag={26} />
            <span aria-hidden="true" className="rb-mh-glow absolute inset-0 -z-[1]" />
            <div className="mx-auto flex max-w-[760px] flex-col items-center gap-5">
                <h2 id="mh-davet" className={cn(mhTitle, 'text-balance')}>{title}</h2>
                <p className="m-0 max-w-[46ch] text-base leading-relaxed text-[var(--site-sub)] sm:text-[17px]">
                    {canReserve ? 'Gününüzü, saatinizi ve kaç kişi olacağınızı seçin; onaylanınca masanız sizi bekler.' : 'Masa ayırtmak için arayın; size uygun saati birlikte bulun.'}
                </p>
                <div className="mt-2 flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row">
                    {canReserve && <Link to={RESERVATION_PATH} className={mhButton.lamp}>Masa ayırt</Link>}
                    {site.phone && <a href={telHref(site.phone)} className={canReserve ? mhButton.line : mhButton.lamp}>Ara: {site.phone}</a>}
                </div>
            </div>
        </section>
    );
}
