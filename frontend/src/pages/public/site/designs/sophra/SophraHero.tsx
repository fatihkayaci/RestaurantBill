import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { canReserveOnline, type PublicSite } from '@/features/customerSite/types';
import { cn } from '@/lib/utils';
import { StockImageLabel } from '../../../components/StockImageLabel';
import { RESERVATION_PATH, formatRating, serif, sinceYear } from '../../siteParts';
import { telHref } from '../../siteTheme';
import { restaurantName, weekSchedule } from '../../useSite';
import { EditableBlock, EditableText } from '../../siteEdit';
import { editExternal, useSiteEdit, useSiteWindow } from '../../siteEditContext';
import { ArrowGlyph, CalendarGlyph, MenuGlyph, StarGlyph } from './SophraIcons';
import { spButton, spWrap } from './sophraParts';

// Sophra kapağı: tam genişlik yemek fotoğrafı (kapak + ilk üç mekân fotoğrafı yavaşça geçer; tek fotoğrafta kaydırıcı
// yok), solda koyu perde üstünde başlık, alt başlık, "Menüyü incele" ve "Rezervasyon yap" (rezervasyon kapalıysa
// telefon). Gerçek veri varsa: Google puanı ve yorum sayısı, "Şu an açık" + bugünün saatleri. Alt kenar yumuşak dalga.
// Başlık ve alt başlık düzenleyicide yerinde yazılır; fotoğrafa tıklanınca kapak fotoğrafı değişir.

const SLIDE_MS = 7000;
const MAX_SLIDES = 4;

function slidesOf(site: PublicSite): string[] {
    const c = site.site;
    return [...new Set([c.coverImageUrl, ...c.galleryImageUrls].filter(Boolean))].slice(0, MAX_SLIDES);
}

export function SophraHero({ site, overlapNext }: { site: PublicSite; overlapNext: boolean }) {
    const edit = useSiteEdit();
    const win = useSiteWindow();
    const c = site.site;
    const name = restaurantName(site);
    const all = slidesOf(site);
    // Düzenleyicide yalnız kapak fotoğrafı (tıklanınca o değişir) ve kaydırıcı durur.
    const slides = edit ? all.slice(0, 1) : all;
    const [index, setIndex] = useState(0);
    const [paused, setPaused] = useState(false);
    const current = slides.length ? index % slides.length : 0;
    const many = slides.length > 1;

    useEffect(() => {
        if (!many || paused) return;
        if (win.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
        const id = win.setInterval(() => setIndex(i => i + 1), SLIDE_MS);
        return () => win.clearInterval(id);
    }, [many, paused, win]);

    const go = (dir: -1 | 1) => setIndex(i => (i + dir + slides.length) % slides.length);
    const lead = c.tagline;
    const eyebrow = [c.foundedYear ? sinceYear(c.foundedYear) : null, site.district || site.city].filter(Boolean).join(', ');
    const today = weekSchedule(site)?.find(r => r.isToday) ?? null;
    const canReserve = canReserveOnline(site);
    const actionsX = editExternal(edit, 'heroActions');
    // İkinci düğme: rezervasyon açıksa "Rezervasyon yap", değilse telefon. ("Sipariş ver" yok; sipariş Menü'den.)
    const second = canReserve ? { label: 'Rezervasyon yap', to: RESERVATION_PATH, icon: <CalendarGlyph className="h-[18px] w-[18px]" /> }
        : site.phone ? { label: 'Hemen ara', href: telHref(site.phone), icon: null } : null;
    const showStatus = !edit && (site.isOpenNow !== null || today);

    return (
        <section aria-labelledby="sp-kapak" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
            onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}
            className="relative isolate flex min-h-[600px] flex-col overflow-hidden bg-[var(--site-hero-deep)] text-[var(--site-on-paper)] sm:min-h-[640px] lg:h-[min(86svh,820px)] lg:min-h-[640px]">
            <EditableBlock target="photo:cover" label="Kapak fotoğrafı" chip="Fotoğrafı değiştir" className="!absolute inset-0 -z-10">
                <div className="absolute inset-0 -z-10">
                    {slides.length > 0 ? slides.map((src, i) => (
                        <img key={src} src={src} alt="" aria-hidden="true" fetchPriority={i === 0 ? 'high' : undefined} loading={i === 0 ? 'eager' : 'lazy'}
                            className={cn('sp-slide absolute inset-0 h-full w-full object-cover object-[center_40%]', i === current ? 'opacity-100' : 'opacity-0')} />
                    )) : (
                        // Fotoğraf yok: kapak renginde, çapraz ince çizgili sakin zemin.
                        <span className="absolute inset-0 bg-[var(--site-hero-bg)] bg-[repeating-linear-gradient(135deg,color-mix(in_srgb,var(--site-on-paper)_5%,transparent)_0_1px,transparent_1px_22px)]" />
                    )}
                    {/* Yazının okunduğu perde: telefonda alttan, geniş ekranda soldan. */}
                    <span className="absolute inset-0 bg-[linear-gradient(to_top,var(--site-hero-deep)_8%,color-mix(in_srgb,var(--site-hero-deep)_70%,transparent)_45%,color-mix(in_srgb,var(--site-hero-deep)_25%,transparent))] lg:bg-[linear-gradient(to_right,color-mix(in_srgb,var(--site-hero-deep)_92%,transparent)_0%,color-mix(in_srgb,var(--site-hero-deep)_60%,transparent)_42%,transparent_72%)]" />
                    <span className="absolute inset-x-0 top-0 h-40 bg-[linear-gradient(to_bottom,color-mix(in_srgb,var(--site-hero-deep)_55%,transparent),transparent)]" />
                    {slides[current]?.includes('/shared/stock/') && <StockImageLabel className="bottom-auto right-4 top-24" />}
                </div>
            </EditableBlock>
            {edit && slides.length === 0 && (
                <span className="relative mx-auto mt-24 rounded-full border border-dashed border-[var(--site-paper-line-strong)] px-4 py-2 text-[15px] font-semibold">+ Kapak fotoğrafı ekle</span>
            )}

            <div className={cn(spWrap, 'relative flex flex-1 flex-col justify-end pt-[104px] lg:justify-center lg:pt-[96px]',
                overlapNext ? 'pb-[124px] sm:pb-[136px] lg:pb-[148px]' : 'pb-20 sm:pb-24')}>
                <div className="flex max-w-[640px] flex-col items-start gap-5">
                    {eyebrow && (
                        <p {...editExternal(edit, 'eyebrow')} className={cn('m-0 text-[13px] font-bold uppercase tracking-[0.2em] text-[var(--site-mustard-text)]', editExternal(edit, 'eyebrow').className)}>{eyebrow}</p>
                    )}
                    <h1 id="sp-kapak" className={cn(serif, 'm-0 text-balance text-[44px] leading-[1.02] sm:text-[56px] lg:text-[clamp(56px,5.4vw,76px)]')}>
                        <EditableText field="headline" value={c.headline} fallback={name} placeholder="Büyük başlık yazın" />
                        <svg aria-hidden="true" viewBox="0 0 220 14" preserveAspectRatio="none" className="mt-2 block h-3 w-[min(220px,60%)] text-[var(--site-mustard-text)]">
                            <path d="M2 10c40-7 120-10 216-4" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                        </svg>
                    </h1>
                    {(lead || edit?.showEmpty) && (
                        <EditableText as="p" field="tagline" value={lead} placeholder="Kısa bir giriş cümlesi yazın"
                            className="m-0 max-w-[46ch] text-[17px] leading-relaxed text-[var(--site-on-paper-sub)] sm:text-[19px]" />
                    )}
                    {!edit && (
                        <div {...actionsX} className={cn(actionsX.className, 'mt-1 flex w-full flex-col gap-3 sm:w-auto sm:flex-row')}>
                            <Link to="/menu" className={cn(spButton.accent, 'min-h-[52px] px-7 ring-1 ring-[color-mix(in_srgb,var(--site-on-paper)_16%,transparent)]')}>
                                <MenuGlyph className="h-[18px] w-[18px]" />Menüyü incele
                            </Link>
                            {second && ('to' in second && second.to
                                ? <Link to={second.to} className={cn(spButton.light, 'min-h-[52px] px-7')}>{second.icon}{second.label}</Link>
                                : <a href={second.href} className={cn(spButton.light, 'min-h-[52px] px-7')}>{second.icon}{second.label}</a>)}
                        </div>
                    )}
                    {(c.rating !== null || showStatus) && (
                        <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-3 text-[15px]">
                            {c.rating !== null && (
                                <EditableBlock target="rating" label="Google puanı" className="rounded-full">
                                    <span className="inline-flex items-center gap-2.5">
                                        <span className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[var(--site-paper-line-strong)] px-3 font-bold tabular-nums">
                                            {formatRating(c.rating)}<StarGlyph className="h-4 w-4 text-[var(--site-mustard-text)]" />
                                        </span>
                                        <span className="text-[var(--site-on-paper-sub)]">
                                            Google{c.reviewCount !== null && <>, {c.reviewCount.toLocaleString('tr-TR')} yorum</>}
                                        </span>
                                    </span>
                                </EditableBlock>
                            )}
                            {c.rating !== null && showStatus && <span aria-hidden="true" className="hidden h-5 w-px bg-[var(--site-paper-line-strong)] sm:block" />}
                            {showStatus && (
                                <span className="inline-flex items-center gap-2">
                                    {site.isOpenNow !== null && (
                                        <span aria-hidden="true" className={cn('h-2.5 w-2.5 rounded-full', site.isOpenNow ? 'bg-[var(--site-dot-ok)]' : 'bg-[var(--site-dot-bad)]')} />
                                    )}
                                    {site.isOpenNow !== null && <span className="font-bold">{site.isOpenNow ? 'Şu an açık' : 'Şu an kapalı'}</span>}
                                    {today && <span className="tabular-nums text-[var(--site-on-paper-sub)]">{today.isOpen ? `Bugün ${today.text}` : 'Bugün kapalı'}</span>}
                                </span>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {many && (
                <div className={cn(spWrap, 'pointer-events-none absolute inset-x-0 hidden items-center justify-end gap-4 sm:flex', overlapNext ? 'bottom-[150px] sm:bottom-[160px]' : 'bottom-24')}>
                    <div className="pointer-events-auto hidden items-center gap-2 sm:flex">
                        <button type="button" onClick={() => go(-1)} aria-label="Önceki fotoğraf"
                            className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--site-on-paper)] text-[var(--site-paper)] transition-opacity hover:opacity-85"><ArrowGlyph dir="left" /></button>
                        <button type="button" onClick={() => go(1)} aria-label="Sonraki fotoğraf"
                            className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--site-on-paper)] text-[var(--site-paper)] transition-opacity hover:opacity-85"><ArrowGlyph /></button>
                    </div>
                    <div role="group" aria-label="Kapak fotoğrafları" className="pointer-events-auto flex items-center">
                        {slides.map((src, i) => (
                            <button key={src} type="button" onClick={() => setIndex(i)} aria-label={`${i + 1}. fotoğraf`} aria-current={i === current ? 'true' : undefined}
                                className="flex h-11 w-7 items-center justify-center">
                                <span className={cn('h-2 rounded-full transition-[width,background-color] duration-300', i === current ? 'w-5 bg-[var(--site-mustard-text)]' : 'w-2 bg-[color-mix(in_srgb,var(--site-on-paper)_55%,transparent)]')} />
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <svg aria-hidden="true" viewBox="0 0 1440 90" preserveAspectRatio="none" className="pointer-events-none absolute inset-x-0 -bottom-px h-[44px] w-full sm:h-[70px]">
                <path d="M0 58C200 90 420 92 700 66S1180 8 1440 30V90H0Z" fill="var(--site-bg)" />
            </svg>
        </section>
    );
}
