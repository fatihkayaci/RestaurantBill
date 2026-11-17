import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { canReserveOnline, type PublicProduct, type PublicSite } from '@/features/customerSite/types';
import type { OnlineSetMenu } from '@/features/delivery/types';
import { trackingStepIndex } from '@/features/delivery/deliveryStatus';
import { useActiveDeliveryOrder, useSiteCart, type SiteCart } from '@/features/delivery/useSiteCart';
import { cn } from '@/lib/utils';
import { StockImageLabel } from './components/StockImageLabel';
import { MyReservations, SiteShell, SiteStatus } from './site/SiteChrome';
import { SitePage, VisitSection } from './site/SiteFrame';
import { AddButton, PlusIcon } from './site/SiteMenuBoard';
import { InstagramIcon } from './site/SiteCards';
import { SlotsSummary } from './site/SiteSetMenus';
import { savingLabel } from './site/setMenuParts';
import {
    RESERVATION_PATH, averagePrepMinutes, cardButton, dativeSuffix, foldText, formatRating, hasAboutPage, instagramHandle, productCount,
    serif, sinceYear, untilTime,
} from './site/siteParts';
import { formatSitePrice, splitAccent, telHref } from './site/siteTheme';
import { useSiteDesign } from './site/siteDesign';
import { restaurantName, useMyReservations, useSite, weekSchedule } from './site/useSite';
import { AddCard, EditableBlock, EditableText, EmptySlot, ExternalHint, ListCard } from './site/siteEdit';
import { SITE_LIMITS, editExternal, editTarget, useSiteEdit, useSitePreview, useSiteWindow } from './site/siteEditContext';

// Restoranın müşteriye açık ana sayfası (tasarım: "Renkli ana sayfa"). Kum zeminde renkli, yuvarlak köşeli kutular:
// (1) kapak (temanın kapak rengi; fotoğraf varsa sağda, yoksa noktalı desen + iki daire ve italik kelime), süren sipariş
// hapı, üst satır, dev ad, alt başlık, hardal ve çizgili düğme, krem Google puanı kartı; altta koyu şerit (durum · paket
// sipariş · hazırlık · en az sipariş). (2) Zeytin "Bugünün menüsü": arama, kategori hapları, krem ürün kartları (online
// sipariş açıkken + düğmeleri). (3) Hardal başlık kutusu + kaydırılan hazır menüler. (4) Kiremit hikâye kutusu + krem
// yorumlar. Ardından alt bilgi (Footer B). Verisi olmayan hücre, kutu ya da satır çizilmez.

// Eski rezervasyon adresi (/?bolum=rezervasyon&tarih&saat&kisi) artık /rezervasyon sayfasına yönlenir.
const LEGACY_VIEW_PARAM = 'bolum';

/** Ana sayfanın açık kutuları: krem, yuvarlak köşe. */
const box = 'rounded-[24px] bg-[var(--site-card)] text-[var(--site-text)] md:rounded-[36px]';
/** Kapak ve menü kutusunun yazısı ve vurgusu (Renkli: koyu zeminde krem yazı, açık hardal vurgu; Sade: beyaz kutuda
 *  koyu yazı, vurgu yazısı). */
const cream = 'text-[var(--site-on-cover)]';
const mustard = 'text-[var(--site-cover-accent)]';

function timeOfDay(iso: string): string {
    return new Date(iso).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

export default function RestaurantSitePage() {
    const { site, error } = useSite();
    const { mine } = useMyReservations();
    const [params] = useSearchParams();
    const cart = useSiteCart();

    if (params.get(LEGACY_VIEW_PARAM) === 'rezervasyon') {
        const next = new URLSearchParams(params);
        next.delete(LEGACY_VIEW_PARAM);
        const query = next.toString();
        return <Navigate to={query ? `${RESERVATION_PATH}?${query}` : RESERVATION_PATH} replace />;
    }

    if (!site) {
        return <SiteShell><SiteStatus error={error} /></SiteShell>;
    }

    return (
        <SitePage site={site} current="home">
            <main className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col gap-4 px-2 pb-4 pt-4 sm:px-4">
                <HomeHero site={site} cart={cart} />
                {mine.length > 0 && <div className={cn(box, 'p-5 md:p-8')}><MyReservations items={mine} /></div>}
                <ExternalHint source="menu"><MenuBox site={site} cart={cart} /></ExternalHint>
                <ExternalHint source="setMenus"><SetMenusRow site={site} cart={cart} /></ExternalHint>
                <StoryReviewsRow site={site} />
                <EditorGallery site={site} />
                <EditorVisit site={site} />
            </main>
        </SitePage>
    );
}

// ── 1. Birleşik kapak ────────────────────────────────────────────────────────────────────────────

// Dev ad: uzun adlar kutuya sığsın diye en uzun satırın harf sayısına göre küçülür (Renkli: Fraunces kalın ≈ 0,6em/harf;
// Sade: Instrument Serif ≈ 0,46em/harf).
function heroNameStyle(lines: string[], sade: boolean): CSSProperties {
    const longest = Math.max(4, ...lines.map(l => l.length));
    return sade
        ? { fontSize: `min(100px, max(6.4vw, 52px), ${(80 / (longest * 0.46)).toFixed(2)}vw)` }
        : { fontSize: `min(104px, max(6.6vw, 48px), ${(82 / (longest * 0.6)).toFixed(2)}vw)` };
}

interface StripCell { key: string; node: ReactNode; wrap?: (node: ReactNode) => ReactNode }

function HomeHero({ site, cart }: { site: PublicSite; cart: SiteCart }) {
    const edit = useSiteEdit();
    const sade = useSiteDesign() === 'sade';
    const showEmpty = Boolean(edit?.showEmpty);
    const content = site.site;
    const name = restaurantName(site);
    const [first, accent] = splitAccent(name);
    const canReserve = canReserveOnline(site);
    const canOrder = cart.enabled;
    const place = site.district || site.city;
    const kicker = [content.foundedYear ? sinceYear(content.foundedYear) : null, place].filter(Boolean).join(' · ');
    const lead = content.tagline || content.headline;
    const hasMenu = productCount(site) > 0;
    const actionsX = editExternal(edit, 'heroActions');
    const cover = content.coverImageUrl;
    // Fotoğrafsız kapağın sağındaki italik kelime: menünün ilk kategorisi (yoksa yazılmaz).
    const panelWord = site.categories.find(c => c.products.length > 0)?.name.toLocaleLowerCase('tr-TR') ?? '';

    // İki düğme: ana düğme koyu. Sipariş > rezervasyon > menü; ikincisi kalanlardan ilki (yoksa telefon).
    const actions: { key: string; label: string; to?: string; href?: string }[] = [];
    if (canOrder) actions.push({ key: 'siparis', label: 'Sipariş ver', href: hasMenu ? '#menu' : undefined, to: hasMenu ? undefined : '/siparis' });
    if (canReserve) actions.push({ key: 'rez', label: 'Masa ayırt', to: RESERVATION_PATH });
    if (actions.length < 2) actions.push({ key: 'menu', label: 'Menüyü gör', to: '/menu' });
    if (actions.length < 2 && site.phone) actions.push({ key: 'ara', label: 'Hemen ara', href: telHref(site.phone) });

    // Alt şerit: durum + bugünün saatleri · paket sipariş · hazırlık · en az sipariş. Verisi olmayan hücre çizilmez.
    const cellLabel = cn('text-[11px] font-extrabold uppercase tracking-[0.16em]', mustard);
    const cellValue = cn(serif, 'text-2xl leading-[1.1]');
    const cells: StripCell[] = [];
    const today = weekSchedule(site)?.find(r => r.isToday) ?? null;
    const hoursWrap = (node: ReactNode) => <EditableBlock target="hours" label="Çalışma saatleri" className="h-full">{node}</EditableBlock>;
    if (site.isOpenNow !== null || today) {
        cells.push({
            key: 'durum', wrap: hoursWrap, node: (
                <div className="flex items-center gap-3">
                    {site.isOpenNow !== null && (
                        <span aria-hidden="true" className={cn('h-[9px] w-[9px] shrink-0 rounded-full', site.isOpenNow ? 'bg-[var(--site-dot-ok)] shadow-[0_0_0_4px_color-mix(in_srgb,var(--site-dot-ok)_20%,transparent)]' : 'bg-[var(--site-dot-bad)] shadow-[0_0_0_4px_color-mix(in_srgb,var(--site-dot-bad)_20%,transparent)]')} />
                    )}
                    <span className="flex flex-col">
                        {site.isOpenNow !== null && <span className="font-extrabold">{site.isOpenNow ? 'Şu an açık' : 'Şu an kapalı'}</span>}
                        {today && <span className={site.isOpenNow !== null ? 'text-[13px] text-[color-mix(in_srgb,var(--site-on-cover)_85%,transparent)]' : 'font-extrabold'}>Bugün {today.text}</span>}
                    </span>
                </div>
            ),
        });
    } else if (showEmpty) {
        cells.push({ key: 'durum', wrap: hoursWrap, node: <span className="font-bold">+ Saat ekle</span> });
    }
    const ordering = cart.ordering;
    if (canOrder && ordering && !edit) {
        const value = ordering.state === 'open'
            ? (ordering.lastOrderAt ? untilTime(timeOfDay(ordering.lastOrderAt)) : 'Sipariş alıyoruz')
            : ordering.state === 'paused' ? 'Kısa bir ara' : 'Şu an kapalı';
        cells.push({ key: 'paket', node: <><span className={cellLabel}>Paket sipariş</span><span className={cellValue}>{value}</span></> });
    }
    const prep = averagePrepMinutes(site);
    if (prep && !edit) cells.push({ key: 'hazirlik', node: <><span className={cellLabel}>Hazırlık</span><span className={cellValue}>~{prep} dakika</span></> });
    if (canOrder && ordering && !edit) {
        const active = ordering.zones.filter(z => z.isActive);
        const minimums = [...new Set(active.map(z => z.minOrderAmount))];
        if (active.length > 0 && minimums.some(m => m > 0)) {
            const value = minimums.length === 1 ? formatSitePrice(minimums[0]) : 'Mahalleye göre';
            cells.push({ key: 'min', node: <><span className={cellLabel}>Min. sipariş</span><span className={cellValue}>{value}</span></> });
        }
    }
    const mdCols = ({ 1: 'md:grid-cols-1', 2: 'md:grid-cols-2', 3: 'md:grid-cols-3', 4: 'md:grid-cols-4' } as Record<number, string>)[cells.length];

    return (
        <section id="ust" aria-labelledby="ev-ad"
            className={cn('relative flex flex-col overflow-hidden rounded-[24px] bg-[var(--site-cover-bg)] md:rounded-[36px]', cream)}>
            <div className="relative flex flex-col md:min-h-[600px] md:flex-row">
                {/* Zemin: kapak fotoğrafı sağda (kapak renginden geçişle; telefonda yazının arkasında koyu perde); yoksa noktalı desen ve daireler. */}
                <EditableBlock target="photo:cover" label="Kapak fotoğrafı" chip="Fotoğrafı değiştir" className="absolute inset-0">
                    {cover && sade ? (
                        <>
                            <img src={cover} alt="" className="absolute inset-0 h-full w-full object-cover object-[70%_40%]" />
                            <span aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.94)_0%,rgba(255,255,255,0.86)_70%,rgba(255,255,255,0.7)_100%)] md:bg-[linear-gradient(90deg,rgba(255,255,255,0.97)_0%,rgba(255,255,255,0.9)_30%,rgba(255,255,255,0.55)_48%,rgba(255,255,255,0)_66%)]" />
                            {cover.includes('/shared/stock/') && <StockImageLabel className="bottom-auto right-3 top-3" />}
                        </>
                    ) : cover ? (
                        <>
                            <img src={cover} alt="" className="absolute inset-0 h-full w-full object-cover object-[65%_40%] md:left-auto md:w-[58%]" />
                            <span aria-hidden="true" className="absolute inset-0 bg-[color-mix(in_srgb,var(--site-cover-bg)_86%,transparent)] md:left-auto md:w-[58%] md:bg-transparent md:bg-[linear-gradient(90deg,var(--site-cover-bg)_0%,transparent_38%)]" />
                            {cover.includes('/shared/stock/') && <StockImageLabel className="bottom-auto right-3 top-3" />}
                        </>
                    ) : sade ? (
                        <span aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
                            <span className="absolute -right-[140px] top-1/2 h-[760px] w-[760px] -translate-y-1/2 rounded-full border border-[rgba(30,26,22,0.07)]" />
                            <span className="absolute -right-5 top-1/2 h-[520px] w-[520px] -translate-y-1/2 rounded-full border border-[var(--site-accent-line)]" />
                            <span className="absolute right-[110px] top-1/2 hidden h-[260px] w-[260px] -translate-y-1/2 items-center justify-center rounded-full bg-[var(--site-accent-soft)] md:flex">
                                {panelWord && !edit && <span className={cn(serif, 'max-w-[230px] break-words px-2 text-center text-[60px] italic leading-none text-[var(--site-accent-text)]')}>{panelWord}</span>}
                            </span>
                        </span>
                    ) : (
                        <span aria-hidden="true" className="pointer-events-none absolute inset-0 hidden overflow-hidden md:block">
                            <span className="absolute inset-y-0 right-0 w-[46%] bg-[radial-gradient(color-mix(in_srgb,var(--site-on-cover)_16%,transparent)_2px,transparent_2.6px)] bg-[length:22px_22px]" />
                            <span className="absolute right-[7%] top-1/2 h-[420px] w-[420px] -translate-y-1/2 rounded-full bg-[var(--site-cover-deep)] bg-[repeating-conic-gradient(from_45deg,color-mix(in_srgb,var(--site-on-cover)_7%,transparent)_0_25%,transparent_0_50%)] bg-[length:34px_34px]" />
                            <span className="absolute right-[calc(7%+110px)] top-1/2 flex h-[200px] w-[200px] -translate-y-1/2 -rotate-[8deg] items-center justify-center rounded-full bg-[var(--site-mustard)]">
                                {panelWord && !edit && <span className={cn(serif, 'max-w-[180px] break-words px-2 text-center text-[40px] italic leading-none text-[var(--site-text)]')}>{panelWord}</span>}
                            </span>
                        </span>
                    )}
                    {edit && !cover && (
                        <span className="absolute right-6 top-6 whitespace-nowrap rounded-full border border-dashed border-[var(--site-border-strong)] bg-[var(--site-card)] px-4 py-2 font-[family-name:'DM_Sans',system-ui,sans-serif] text-[15px] font-semibold text-[var(--site-text)]">
                            + Kapak fotoğrafı ekle
                        </span>
                    )}
                </EditableBlock>

                {/* Yazı */}
                <div className="pointer-events-none relative z-[1] flex flex-1 flex-col justify-between gap-9 px-5 pb-8 pt-7 sm:px-10 md:px-[52px] md:pb-12 md:pt-10 [&_a]:pointer-events-auto [&_[data-edit-text]]:pointer-events-auto">
                    {!edit ? <ActiveOrderPill enabled={cart.enabled} /> : <span />}
                    <div className="flex max-w-[640px] flex-col gap-[22px] [--site-accent-text:var(--site-cover-accent)]">
                        {kicker && !edit && (
                            <span className={cn('inline-flex items-center gap-2.5 text-xs font-extrabold uppercase tracking-[0.24em]', mustard)}>
                                <span aria-hidden="true" className="h-0.5 w-7 shrink-0 bg-[var(--site-cover-accent)]" />{kicker}
                            </span>
                        )}
                        {/* Ad Ayarlar'dan gelir; kapak adsız boş görünmesin diye düzenleyicide de yazılır (tıklanmaz). */}
                        <h1 id="ev-ad" className={cn(serif, 'm-0 max-w-full break-words', sade ? 'leading-[0.92] tracking-[-0.015em]' : 'leading-[0.95] tracking-[-0.025em]')} style={heroNameStyle([first, accent], sade)}>
                            {first && <>{first}<br /></>}<em className="rb-accent italic">{accent}</em>
                        </h1>
                        {(lead || showEmpty) && (
                            <EditableText as="p" field="tagline" value={content.tagline} fallback={content.headline} placeholder="Alt başlık yazın"
                                className="m-0 max-w-[500px] text-base leading-[1.6] text-[color-mix(in_srgb,var(--site-on-cover)_90%,transparent)] md:text-lg" />
                        )}
                        {!edit && (
                            <div {...actionsX} className={cn('flex flex-wrap gap-2.5', actionsX.className)}>
                                {actions.slice(0, 2).map((a, i) => {
                                    const cls = cn('inline-flex h-[58px] flex-1 items-center justify-center gap-2.5 whitespace-nowrap rounded-full px-[30px] text-base font-extrabold no-underline transition-opacity hover:opacity-90 sm:flex-none',
                                        i === 0 ? 'bg-[var(--site-pop)] text-[var(--site-on-pop)]' : 'border-2 border-[color-mix(in_srgb,var(--site-on-cover)_55%,transparent)] text-[var(--site-on-cover)]');
                                    return a.to
                                        ? <Link key={a.key} to={a.to} className={cls}>{a.label}{i === 0 && <span aria-hidden="true">→</span>}</Link>
                                        : <a key={a.key} href={a.href} className={cls}>{a.label}{i === 0 && <span aria-hidden="true">→</span>}</a>;
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Google puanı: geniş ekranda sağ altta buzlu kart, telefonda yazının altında. */}
                {content.rating !== null ? (
                    <div className="relative z-[1] mx-5 mb-6 self-start sm:mx-10 md:absolute md:bottom-6 md:right-6 md:m-0">
                        <EditableBlock target="rating" label="Google puanı" className="rounded-[20px]">
                            <div className="flex items-center gap-3 rounded-[22px] bg-[var(--site-card)] py-3 pl-3.5 pr-[18px] text-[var(--site-text)] shadow-[0_10px_30px_rgba(0,0,0,0.2)]">
                                <span className={cn(serif, 'text-[40px] font-extrabold leading-[0.9]')}>{formatRating(content.rating)}</span>
                                <span className="flex flex-col gap-0.5">
                                    <span role="img" aria-label={`Google puanı 5 üzerinden ${formatRating(content.rating)}`} className="text-sm tracking-[2px] text-[var(--site-accent-text)]">
                                        {'★★★★★'.slice(0, Math.round(content.rating))}<span className="opacity-40">{'★★★★★'.slice(Math.round(content.rating))}</span>
                                    </span>
                                    <span className="text-xs font-extrabold">Google{content.reviewCount !== null && <> · {content.reviewCount.toLocaleString('tr-TR')} yorum</>}</span>
                                </span>
                            </div>
                        </EditableBlock>
                    </div>
                ) : showEmpty && (
                    <div className="relative z-[1] mx-5 mb-6 self-start sm:mx-10 md:absolute md:bottom-6 md:right-6 md:m-0">
                        <EmptySlot target="rating" title="+ Google puanı ekle" className="min-h-[64px] bg-[var(--site-card)]" />
                    </div>
                )}
            </div>

            {cells.length > 0 && (
                <div className={cn('relative z-[1] grid grid-cols-2 bg-[var(--site-cover-deep)]', sade && 'border-t border-[var(--site-line)]', mdCols)}>
                    {cells.map(c => {
                        const cell = <div className="flex h-full flex-col justify-center gap-0.5 px-5 py-4 sm:px-7 sm:py-5">{c.node}</div>;
                        return (
                            <div key={c.key} className={cn('min-w-0 border-[color-mix(in_srgb,var(--site-on-cover)_15%,transparent)] even:border-l [&:nth-child(n+3)]:border-t odd:last:col-span-2',
                                'md:border-l md:odd:last:col-span-1 md:[&:nth-child(n+3)]:border-t-0 md:first:border-l-0')}>
                                {c.wrap ? c.wrap(cell) : cell}
                            </div>
                        );
                    })}
                </div>
            )}
        </section>
    );
}

const ORDER_STEPS = 4;

/** Bu cihazdan verilmiş, henüz bitmemiş paket sipariş: kapağın üstünde hap (durum, numara, kalan süre, adımlar). */
function ActiveOrderPill({ enabled }: { enabled: boolean }) {
    const inPreview = useSitePreview() !== null;
    const active = useActiveDeliveryOrder(enabled && !inPreview);
    const [now] = useState(() => Date.now());
    if (!active) return <span />;
    const t = active.tracking;
    const raw = trackingStepIndex(t.status);
    const step = raw <= 1 ? 0 : raw <= 3 ? 1 : raw === 4 ? 2 : 3;
    const eta = t.estimatedDeliveryAt ? Math.round((new Date(t.estimatedDeliveryAt).getTime() - now) / 60000) : null;
    return (
        <Link to={`/siparis/takip/${encodeURIComponent(active.token)}`}
            className="inline-flex max-w-full flex-wrap items-center gap-3 self-start rounded-[24px] bg-[var(--site-menu-card)] py-2 pl-4 pr-2 text-sm text-[var(--site-text)] no-underline sm:rounded-full">
            <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-[var(--site-accent)] shadow-[0_0_0_4px_var(--site-accent-soft)]" />
            <span>
                <strong>Siparişiniz {t.statusLabel.toLocaleLowerCase('tr-TR')}</strong>{' '}
                <span className="text-[var(--site-muted)]">· #{active.number}{eta !== null && eta > 0 && <> · yaklaşık {eta} dk</>}</span>
            </span>
            <span aria-hidden="true" className="inline-flex gap-[3px]">
                {Array.from({ length: ORDER_STEPS }, (_, i) => (
                    <span key={i} className={cn('h-1 w-[18px] rounded-sm', i <= step ? 'bg-[var(--site-accent)]' : 'bg-[rgba(30,26,22,0.15)]')} />
                ))}
            </span>
            <span className="inline-flex h-11 items-center rounded-full bg-[var(--site-paper)] px-3.5 text-[13px] font-bold text-[var(--site-on-paper)]">Takip et</span>
        </Link>
    );
}

// ── 2. Bugünün menüsü ────────────────────────────────────────────────────────────────────────────

/** Ürün kartı (krem): varsa 76 px fotoğraf, serif ad, açıklama/süre ve italik etiket, fiyat, beyaz + düğmesi. */
function ProductCard({ product, cart, onAdded }: { product: PublicProduct; cart: SiteCart; onAdded: (name: string) => void }) {
    const meta = [product.description?.trim(), product.prepMinutes ? `~${product.prepMinutes} dk` : null].filter(Boolean).join(' · ');
    const tag = product.isOutOfStock ? 'şu an tükendi' : product.isFeatured ? 'ustanın seçimi' : null;
    return (
        <li className="flex min-w-0 items-center gap-3.5 rounded-[22px] bg-[var(--site-menu-card)] p-3.5 text-[var(--site-text)]">
            {product.imageUrl && (
                <span className="relative shrink-0">
                    <img src={product.imageUrl} alt={product.name} loading="lazy" className="block h-[78px] w-[78px] rounded-2xl bg-[var(--site-placeholder)] object-cover" />
                    {product.isStockImage && <StockImageLabel className="bottom-1 right-1 px-1 text-[9px]" />}
                </span>
            )}
            <div className="flex min-w-0 flex-1 flex-col gap-1">
                <h3 className={cn(serif, 'm-0 truncate text-[21px] leading-[1.15]', product.isOutOfStock && 'text-[var(--site-muted)]')}>{product.name}</h3>
                {(meta || tag) && (
                    <p className="m-0 line-clamp-2 text-[13px] leading-snug text-[var(--site-muted)]">
                        {meta}
                        {tag && <span className={cn(serif, 'text-base italic', product.isOutOfStock ? 'text-[var(--site-muted)]' : 'text-[var(--site-accent-text)]')}>{meta ? ' · ' : ''}{tag}</span>}
                    </p>
                )}
                <span className="text-base font-extrabold tabular-nums">{formatSitePrice(product.price)}</span>
            </div>
            <AddButton product={product} cart={cart} onAdded={onAdded} variant="accent" />
        </li>
    );
}

function MenuBox({ site, cart }: { site: PublicSite; cart: SiteCart }) {
    const categories = useMemo(() => site.categories.filter(c => c.products.length > 0), [site]);
    const [tab, setTab] = useState<string | null>(null);
    const [query, setQuery] = useState('');
    const [announce, setAnnounce] = useState('');
    if (categories.length === 0) return null;

    const selected = categories.find(c => c.id === tab) ?? categories[0];
    const q = foldText(query);
    const items = q
        ? categories.flatMap(c => c.products.filter(p => foldText(`${p.name} ${p.description} ${c.name}`).includes(q)))
        : selected.products;
    const onAdded = (name: string) => setAnnounce(`${name} sepete eklendi.`);

    return (
        <section id="menu" aria-labelledby="ev-menu"
            className="relative flex scroll-mt-24 flex-col gap-[26px] overflow-hidden rounded-[24px] bg-[var(--site-menu-box)] p-5 text-[var(--site-on-menu-box)] sm:p-11 md:rounded-[36px]">
            <span aria-hidden="true" className="pointer-events-none absolute -right-[60px] -top-[60px] h-[300px] w-[300px] rounded-full bg-[radial-gradient(color-mix(in_srgb,var(--site-on-menu-box)_16%,transparent)_2px,transparent_2.6px)] bg-[length:22px_22px]" />
            <div className="relative flex flex-wrap items-center justify-between gap-4">
                <h2 id="ev-menu" className={cn(serif, 'm-0 text-[42px] leading-[0.95] md:text-[clamp(42px,4.6vw,68px)] [--site-accent-text:var(--site-cover-accent)]')}>Bugünün <em className={cn('rb-accent italic', mustard)}>menüsü</em></h2>
                <label className="flex h-[52px] w-full items-center gap-2.5 rounded-full bg-[color-mix(in_srgb,var(--site-on-menu-box)_12%,transparent)] px-5 focus-within:ring-2 focus-within:ring-[var(--site-on-menu-box)] sm:w-[320px]">
                    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
                    <span className="sr-only">Menüde ara</span>
                    <input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Menüde ara…"
                        className="min-w-0 flex-1 border-0 bg-transparent text-[15px] text-[var(--site-on-menu-box)] outline-none placeholder:text-[var(--site-on-menu-box-sub)]" />
                </label>
            </div>
            {!q && categories.length > 1 && (
                <div role="group" aria-label="Kategoriler" className="relative flex max-w-full gap-1.5 self-start overflow-x-auto rounded-full bg-[color-mix(in_srgb,var(--site-on-menu-box)_10%,transparent)] p-[5px] [scrollbar-width:none]">
                    {categories.map(c => {
                        const on = c.id === selected.id;
                        return (
                            <button key={c.id} type="button" aria-pressed={on} onClick={() => setTab(c.id)}
                                className={cn('inline-flex h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-[18px] text-sm font-bold transition-colors',
                                    on ? 'bg-[var(--site-pop)] text-[var(--site-on-pop)]' : 'text-[var(--site-on-menu-box)] hover:bg-[color-mix(in_srgb,var(--site-on-menu-box)_10%,transparent)]')}>
                                {c.name}<span className="font-semibold opacity-75">{c.products.length}</span>
                            </button>
                        );
                    })}
                </div>
            )}
            {q && <p className="relative m-0 font-bold" aria-live="polite">“{query.trim()}” için {items.length} sonuç</p>}
            {items.length > 0 ? (
                <ul className="relative m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(min(100%,300px),1fr))] gap-2.5 p-0">
                    {items.map(p => <ProductCard key={p.id} product={p} cart={cart} onAdded={onAdded} />)}
                </ul>
            ) : (
                <p className="relative m-0 text-[var(--site-on-menu-box-sub)]">Bu aramayla eşleşen ürün yok. Başka bir şey deneyin.</p>
            )}
            <Link to="/menu" className="relative inline-flex h-[50px] items-center self-start rounded-full border-2 border-[color-mix(in_srgb,var(--site-on-menu-box)_40%,transparent)] px-6 font-extrabold text-[var(--site-on-menu-box)] no-underline transition-colors hover:border-[var(--site-on-menu-box)]">Tüm menü · {productCount(site)} ürün →</Link>
            <p className="sr-only" aria-live="polite">{announce}</p>
        </section>
    );
}

// ── 3. Hazır menüler ─────────────────────────────────────────────────────────────────────────────

function SetMenuAction({ menu, cart }: { menu: OnlineSetMenu; cart: SiteCart }) {
    if (!menu.isAvailable) return <span className="text-sm font-bold text-[var(--site-muted)]">Şu an tükendi</span>;
    if (!cart.enabled) return <Link to="/menu#menuler" className="inline-flex min-h-11 items-center text-sm font-bold underline underline-offset-4">Menüde gör →</Link>;
    const found = cart.setMenuFor(menu.id);
    if (!found || !found.menu.isAvailable) return null;
    if (found.needsChoice) {
        return <Link to="/siparis" aria-label={`${menu.name}: seçerek sepete ekle`} className="inline-flex h-12 items-center rounded-full bg-[var(--site-accent)] px-5 text-sm font-extrabold text-[var(--site-on-accent)] no-underline">Seç ve ekle</Link>;
    }
    return (
        <button type="button" onClick={() => cart.addSetMenu(menu.id)} aria-label={`${menu.name} sepete ekle`}
            className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full bg-[var(--site-accent)] text-[var(--site-on-accent)] transition-opacity hover:opacity-90">
            <PlusIcon size={20} />
        </button>
    );
}

function maxSavingPercent(menus: OnlineSetMenu[]): number {
    return menus.reduce((max, m) => {
        const diff = m.regularPrice - m.price;
        return diff > 0 && m.regularPrice > 0 ? Math.max(max, Math.floor((diff / m.regularPrice) * 100)) : max;
    }, 0);
}

function ArrowIcon({ dir }: { dir: 'left' | 'right' }) {
    return (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            {dir === 'left' ? <path d="M20 12H4M10 18l-6-6 6-6" /> : <path d="M4 12h16M14 6l6 6-6 6" />}
        </svg>
    );
}

/** Başlık kutusu + kaydırılan menü kartları (geniş ekranda 3 kart ve oklar; telefonda parmakla kaydırma). */
function SetMenusRow({ site, cart }: { site: PublicSite; cart: SiteCart }) {
    const menus = site.setMenus ?? [];
    const track = useRef<HTMLDivElement>(null);
    const win = useSiteWindow();
    const [pos, setPos] = useState({ index: 0, count: 1, canPrev: false, canNext: false });

    useEffect(() => {
        const el = track.current;
        if (!el) return;
        const update = () => {
            const card = el.firstElementChild as HTMLElement | null;
            const step = card ? card.offsetWidth + 16 : el.clientWidth;
            const visible = Math.max(1, Math.round((el.clientWidth + 16) / step));
            setPos({
                index: Math.round(el.scrollLeft / step),
                count: Math.max(1, menus.length - visible + 1),
                canPrev: el.scrollLeft > 4,
                canNext: el.scrollLeft + el.clientWidth < el.scrollWidth - 4,
            });
        };
        update();
        el.addEventListener('scroll', update, { passive: true });
        win.addEventListener('resize', update);
        return () => {
            el.removeEventListener('scroll', update);
            win.removeEventListener('resize', update);
        };
    }, [menus.length, win]);

    if (menus.length === 0) return null;
    const scroll = (dir: 1 | -1) => {
        const el = track.current;
        const card = el?.firstElementChild as HTMLElement | null;
        if (el && card) el.scrollBy({ left: dir * (card.offsetWidth + 16), behavior: 'smooth' });
    };
    const best = maxSavingPercent(menus);
    const line = [`${menus.length} hazır menü`, best >= 1 ? `%${best}'${dativeSuffix(best)} varan avantaj` : null].filter(Boolean).join(' · ');
    const fade = 'pointer-events-none absolute inset-y-0 z-[2] hidden w-[132px] items-center px-[18px] md:flex';
    const arrow = 'pointer-events-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--site-paper)] text-[var(--site-on-paper)] shadow-[0_12px_28px_rgba(36,24,15,0.25)]';

    return (
        <section id="menuler" aria-labelledby="ev-hazir" className="flex scroll-mt-24 flex-wrap gap-4">
            <div className="relative flex min-w-[260px] flex-[1_1_300px] flex-col justify-between gap-6 overflow-hidden rounded-[24px] bg-[var(--site-mustard)] p-7 text-[var(--site-text)] [--site-accent-text:currentColor] md:max-w-[300px] md:rounded-[36px] md:p-[34px]">
                <span aria-hidden="true" className="pointer-events-none absolute -bottom-10 -right-10 h-[200px] w-[200px] rounded-full border-2 border-dashed border-[rgba(36,24,15,0.25)]" />
                <h2 id="ev-hazir" className={cn(serif, 'relative m-0 text-[48px] font-extrabold leading-[0.92] md:text-[54px]')}>Hazır<br /><em className="rb-accent italic">menüler</em></h2>
                <div className="relative flex flex-col gap-3.5">
                    <span className="text-[15px] font-semibold leading-normal">{line}</span>
                    {pos.count > 1 && (
                        <div aria-hidden="true" className="flex gap-[5px]">
                            {Array.from({ length: pos.count }, (_, k) => (
                                <span key={k} className={cn('h-1.5 rounded-[3px] transition-[width] duration-300', k === pos.index ? 'w-[22px] bg-[var(--site-paper)]' : 'w-1.5 bg-[rgba(36,24,15,0.3)]')} />
                            ))}
                        </div>
                    )}
                </div>
            </div>
            <div className="relative min-w-0 flex-[999_1_560px]">
                {pos.canPrev && (
                    <div className={cn(fade, 'left-0 justify-start rounded-l-[36px] bg-[linear-gradient(270deg,transparent_0%,color-mix(in_srgb,var(--site-bg)_92%,transparent)_62%,var(--site-bg)_100%)]')}>
                        <button type="button" onClick={() => scroll(-1)} aria-label="Önceki menüler" className={arrow}><ArrowIcon dir="left" /></button>
                    </div>
                )}
                {pos.canNext && (
                    <div className={cn(fade, 'right-0 justify-end rounded-r-[36px] bg-[linear-gradient(90deg,transparent_0%,color-mix(in_srgb,var(--site-bg)_92%,transparent)_62%,var(--site-bg)_100%)]')}>
                        <button type="button" onClick={() => scroll(1)} aria-label="Sonraki menüler" className={arrow}><ArrowIcon dir="right" /></button>
                    </div>
                )}
                <div ref={track} className="flex h-full snap-x snap-mandatory gap-4 overflow-x-auto rounded-[24px] [scrollbar-width:none] md:rounded-[36px]">
                    {menus.map(menu => {
                        const saving = savingLabel(menu);
                        return (
                            <article key={menu.id}
                                className="flex min-h-[300px] shrink-0 basis-[86%] snap-start flex-col gap-3 rounded-[24px] bg-[var(--site-card)] p-6 sm:basis-[calc((100%-16px)/2)] md:min-h-[340px] md:rounded-[36px] md:p-7 xl:basis-[calc((100%-32px)/3)]">
                                {saving && <span className="self-start rounded-full bg-[var(--site-accent-text)] px-[13px] py-[7px] text-xs font-extrabold text-[var(--site-card)]">{saving}</span>}
                                <h3 className={cn(serif, 'm-0 break-words text-[28px] leading-[1.08]')}>{menu.name}</h3>
                                {menu.description && <p className="m-0 line-clamp-2 text-sm leading-relaxed text-[var(--site-sub)]">{menu.description}</p>}
                                <SlotsSummary menu={menu} className="line-clamp-4 text-sm leading-relaxed text-[var(--site-sub)]" />
                                <div className="mt-auto flex items-end justify-between gap-3 pt-3">
                                    <span className="flex flex-col">
                                        {saving && <s className="text-sm text-[var(--site-muted)]"><span className="sr-only">Normal fiyatı </span>{formatSitePrice(menu.regularPrice)}</s>}
                                        <span className={cn(serif, 'text-[36px] font-extrabold leading-none')}>{saving && <span className="sr-only">Menü fiyatı </span>}{formatSitePrice(menu.price)}</span>
                                    </span>
                                    <SetMenuAction menu={menu} cart={cart} />
                                </div>
                            </article>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}

// ── 4. Hikâye + yorumlar ─────────────────────────────────────────────────────────────────────────

function StoryReviewsRow({ site }: { site: PublicSite }) {
    const edit = useSiteEdit();
    const showEmpty = Boolean(edit?.showEmpty);
    const c = site.site;
    const hasStory = Boolean(c.storyTitle || c.about) || showEmpty;
    // Yorumlar: sitede ilk ikisi; düzenleyicide hepsi (en çok 3) yönetilir.
    const reviews = edit ? c.featuredReviews : c.featuredReviews.slice(0, 2);
    const canAdd = Boolean(edit) && c.featuredReviews.length < SITE_LIMITS.review.max;
    const hasReviews = reviews.length > 0 || canAdd;
    if (!hasStory && !hasReviews) return null;
    return (
        <div className="flex flex-wrap gap-4">
            {hasStory && <StoryBox site={site} />}
            {hasReviews && (
                <section aria-labelledby="ev-yorumlar" className="flex min-w-0 flex-[1_1_420px] flex-col gap-4">
                    <h2 id="ev-yorumlar" className="sr-only">Misafir yorumları</h2>
                    {reviews.map((r, i) => (
                        <ListCard key={i} list="reviews" index={i} count={c.featuredReviews.length} label="Yorum" className="flex flex-1 rounded-[24px] md:rounded-[36px]">
                            <figure className={cn(box, 'm-0 flex flex-1 flex-col gap-3.5 p-6 md:p-[30px]')}>
                                <span aria-hidden="true" className={cn(serif, 'h-6 text-[56px] leading-none text-[var(--site-accent-text)]')}>“</span>
                                {edit ? (
                                    <>
                                        <EditableText as="blockquote" field={`review:${i}:text`} value={r.text} multiline placeholder="Yorumun metni"
                                            className={cn(serif, 'm-0 text-[26px] leading-[1.25]')} />
                                        <figcaption className="mt-auto flex flex-wrap gap-x-1.5 text-[13px] text-[var(--site-muted)]">
                                            <EditableText field={`review:${i}:author`} value={r.author} placeholder="Yazan" />·
                                            <EditableText field={`review:${i}:source`} value={r.source} placeholder="Kaynak" />
                                        </figcaption>
                                    </>
                                ) : (
                                    <>
                                        <blockquote className={cn(serif, 'm-0 text-[22px] font-medium leading-[1.3] md:text-2xl')}>{r.text}</blockquote>
                                        {(r.author || r.source) && <figcaption className="mt-auto text-[13px] text-[var(--site-muted)]">{[r.author, r.source].filter(Boolean).join(' · ')}</figcaption>}
                                    </>
                                )}
                            </figure>
                        </ListCard>
                    ))}
                    <AddCard list="reviews" label="Yorum ekle" count={c.featuredReviews.length} max={SITE_LIMITS.review.max} className="bg-[var(--site-card)]" />
                    {!edit && c.reviewsUrl && (
                        <a href={c.reviewsUrl} target="_blank" rel="noopener noreferrer" className={cn(cardButton.outline, 'h-12 bg-[var(--site-card)] px-[22px] text-[15px]')}>Google'da tüm yorumlar</a>
                    )}
                </section>
            )}
        </div>
    );
}

/**
 * Hikâye kutusu: hikâye fotoğrafı varsa fotoğraf + koyu geçiş ve beyaz yazı, yoksa vurgu rengi zemin ve vurgunun
 * okunur yazı rengi. İçinde üst satır (kuruluş yılı), alıntı (slogan), usta, kısa hikâye ve "Hikâyenin devamı".
 */
function StoryBox({ site }: { site: PublicSite }) {
    const edit = useSiteEdit();
    const showEmpty = Boolean(edit?.showEmpty);
    const c = site.site;
    const photo = c.aboutImageUrl;
    const [quoteMain, quoteAccent] = splitAccent(c.storyTitle);
    const founder = [c.founderName, c.founderTitle].filter(Boolean).join(', ');
    // Koyu kiremit zeminde krem yazı; italik parça ve üst satır açık hardal.
    const tone = 'text-[var(--site-on-paper)] [--site-accent-text:var(--site-mustard-text)]';
    return (
        <EditableBlock target="photo:about" label="Hikâye fotoğrafı" chip="Fotoğrafı değiştir" className="flex min-w-0 flex-[1_1_560px] rounded-[24px] md:rounded-[32px]">
            <section aria-labelledby="ev-hikaye"
                className={cn('relative flex min-h-[420px] min-w-0 flex-1 flex-col justify-between gap-7 overflow-hidden rounded-[24px] bg-[var(--site-story)] p-6 sm:p-11 md:min-h-[460px] md:rounded-[36px]', tone)}>
                {photo ? (
                    <>
                        <img src={photo} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
                        <span aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(180deg,color-mix(in_srgb,var(--site-story)_60%,transparent)_0%,color-mix(in_srgb,var(--site-story)_40%,transparent)_30%,color-mix(in_srgb,var(--site-story)_94%,transparent)_80%)]" />
                    </>
                ) : (
                    <span aria-hidden="true" className="absolute inset-0 bg-[repeating-conic-gradient(from_45deg,color-mix(in_srgb,var(--site-on-paper)_7%,transparent)_0_25%,transparent_0_50%)] bg-[length:34px_34px]" />
                )}
                <div className="relative flex flex-wrap items-center justify-between gap-3">
                    <EditableBlock target="year" label="Kuruluş yılı" className="rounded-full">
                        <h2 id="ev-hikaye" className="m-0 text-xs font-extrabold uppercase tracking-[0.24em] text-[var(--site-mustard-text)]">{c.foundedYear ? `Hikâyemiz · ${sinceYear(c.foundedYear)}` : 'Hikâyemiz'}</h2>
                    </EditableBlock>
                    {edit && !photo && <span className="rounded-full bg-[var(--site-card)] px-3 py-1.5 font-[family-name:'DM_Sans',system-ui,sans-serif] text-sm font-semibold text-[var(--site-text)]">+ Hikâye fotoğrafı ekle</span>}
                </div>
                <div className="relative flex flex-col gap-4">
                    {edit ? (
                        (c.storyTitle || showEmpty) && (
                            <EditableText as="p" field="storyTitle" value={c.storyTitle} placeholder="Slogan yazın"
                                className={cn(serif, 'm-0 break-words text-[34px] leading-[1.06] md:text-[clamp(34px,3.4vw,50px)]')} />
                        )
                    ) : c.storyTitle && (
                        <blockquote className={cn(serif, 'm-0 break-words text-[32px] font-semibold leading-[1.08] md:text-[clamp(32px,3.2vw,48px)]')}>
                            “{quoteMain && <>{quoteMain} </>}<span className="italic">{quoteAccent}</span>”
                        </blockquote>
                    )}
                    {(c.about || showEmpty) && (
                        <EditableText as="p" field="about" value={c.about} multiline placeholder="Kısa hikâyenizi yazın"
                            className="m-0 line-clamp-4 max-w-[60ch] whitespace-pre-line text-[15px] leading-relaxed opacity-90" />
                    )}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        {founder ? (edit ? (
                            <span className="flex flex-wrap gap-x-1.5 text-[15px] font-bold">
                                — <EditableText field="founderName" value={c.founderName} placeholder="Ustanın adı" />
                                {(c.founderTitle || showEmpty) && <>, <EditableText field="founderTitle" value={c.founderTitle} placeholder="Unvanı" /></>}
                            </span>
                        ) : <span className="text-[15px] font-bold">— {founder}</span>) : <span />}
                        {!edit && hasAboutPage(site) && (
                            <Link to="/hakkimizda" className="inline-flex h-12 items-center rounded-full bg-[var(--site-mustard)] px-[22px] text-sm font-extrabold text-[var(--site-text)] no-underline transition-opacity hover:opacity-90">Hikâyenin devamı →</Link>
                        )}
                    </div>
                </div>
            </section>
        </EditableBlock>
    );
}

// ── Yalnız düzenleyicide ─────────────────────────────────────────────────────────────────────────

/**
 * Mekân fotoğrafları (galeri) ve Instagram bağlantısı yeni ana sayfa tasarımında yok; düzenleyicide yine buradan
 * değiştirilebilsinler diye yalnız düzenleme görünümünde kutu olarak çizilir. Müşteri görmez.
 */
function EditorGallery({ site }: { site: PublicSite }) {
    const edit = useSiteEdit();
    if (!edit) return null;
    const photos = site.site.galleryImageUrls.slice(0, 6);
    const instagram = site.site.instagramUrl;
    const igX = editTarget(edit, 'contact', 'Instagram');
    return (
        <section aria-label="Mekân fotoğrafları" className={cn(box, 'flex flex-col gap-4 p-5 sm:p-8')}>
            <p className="m-0 font-[family-name:'DM_Sans',system-ui,sans-serif] text-sm text-[var(--site-sub)]">Mekân fotoğrafları ve Instagram (ana sayfada görünmez; Mekân sayfasında ve paylaşımda kullanılır).</p>
            {photos.length > 0 ? (
                <div className="grid grid-cols-3 gap-2 md:grid-cols-6">
                    {photos.map((url, i) => {
                        const x = editTarget(edit, `gallery:${i}`, `Mekân fotoğrafı ${i + 1}`);
                        return <img key={i} src={url} alt="" {...x} className={cn('block aspect-square w-full rounded-[14px] object-cover', x.className)} />;
                    })}
                </div>
            ) : <EmptySlot target="gallery:add" title="+ Fotoğraf ekle" />}
            {instagram ? (
                <a href={instagram} target="_blank" rel="noopener noreferrer" {...igX}
                    className={cn('inline-flex h-12 items-center gap-2.5 self-start rounded-full bg-[var(--site-bg)] px-5 font-bold no-underline', igX.className)}>
                    <span aria-hidden="true" className="[&>svg]:h-5 [&>svg]:w-5"><InstagramIcon /></span>{instagramHandle(instagram)}
                </a>
            ) : <EmptySlot target="contact" title="+ Instagram ekle" className="min-h-[64px]" />}
        </section>
    );
}

// Adres · saatler · iletişim her sayfada alt bilgide durur. Düzenleyicide alt bilgi çizilmez; saatler ve iletişim
// orada da değiştirilebilsin diye yalnız düzenleme görünümünde sayfanın sonunda gösterilir.
function EditorVisit({ site }: { site: PublicSite }) {
    const edit = useSiteEdit();
    if (!edit) return null;
    return <div className={box}><VisitSection site={site} /></div>;
}
