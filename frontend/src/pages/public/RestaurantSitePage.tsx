import { useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { canReserveOnline, type PublicSite } from '@/features/customerSite/types';
import { trackingStepIndex } from '@/features/delivery/deliveryStatus';
import { useActiveDeliveryOrder, useSiteCart, type SiteCart } from '@/features/delivery/useSiteCart';
import { cn } from '@/lib/utils';
import { StockImageLabel } from './components/StockImageLabel';
import { MyReservations, SiteShell, SiteStatus } from './site/SiteChrome';
import { HeroBackdrop, Kicker, SitePage, VisitSection } from './site/SiteFrame';
import { AddButton, CartPanel, CategoryRail, MenuRow, MenuSearch, SetMenuSection } from './site/SiteMenuBoard';
import { collagePhotos } from './site/siteMedia';
import { InstagramIcon, Stars } from './site/SiteCards';
import {
    RESERVATION_PATH, averagePrepMinutes, cardButton, eyebrow, foldText, formatRating, hasAboutPage, heroAccentButton,
    heroOutlineButton, instagramHandle, productCount, sectionTitle, sectionWrap, serif, siteCard, sinceYear, untilTime,
} from './site/siteParts';
import { splitAccent, telHref } from './site/siteTheme';
import { hoursLine, restaurantName, useMyReservations, useSite } from './site/useSite';
import { AddCard, EditableBlock, EditableText, EmptySlot, ExternalHint, ListCard } from './site/siteEdit';
import { SITE_LIMITS, editExternal, editTarget, useSiteEdit, useSitePreview } from './site/siteEditContext';

// Restoranın müşteriye açık ana sayfası (tasarım: "Tema 2 · Açık"). Sıra: kapak (fotoğraf varsa açık perdeyle, yoksa
// halkalar; üst satır, dev serif ad, alt başlık, iki düğme, dört hücreli bilgi şeridi), bu cihazın süren paket siparişi,
// "Bugünün menüsü" panosu (arama, kategori rayı, satır satır ürünler; online sipariş açıksa + düğmeleri ve sağda koyu
// sepet), hazır menüler, hikâye, fotoğraflar, yorumlar ve ziyaret bilgileri. Fotoğraf yoksa satırlar yalnız yazıdır.
// Verisi girilmemiş hücre, satır ya da bölüm çizilmez; restoranın girmediği veri uydurulmaz.

// Eski rezervasyon adresi (/?bolum=rezervasyon&tarih&saat&kisi) artık /rezervasyon sayfasına yönlenir.
const LEGACY_VIEW_PARAM = 'bolum';

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
            <HomeHero site={site} cart={cart} />
            <main className="flex flex-1 flex-col">
                <ActiveOrderBanner enabled={cart.enabled} />
                {mine.length > 0 && (
                    <section className={cn(sectionWrap, 'pt-8')}>
                        <div className={cn(siteCard, 'p-5 md:p-7')}><MyReservations items={mine} /></div>
                    </section>
                )}
                <ExternalHint source="menu"><MenuBoard site={site} cart={cart} /></ExternalHint>
                <ExternalHint source="setMenus"><SetMenuSection site={site} cart={cart} /></ExternalHint>
                <HomeStory site={site} />
                <PhotoStrip site={site} />
                <HomeReviews site={site} />
                <div className="border-t border-[var(--site-line)]"><VisitSection site={site} /></div>
            </main>
        </SitePage>
    );
}

// ── Kapak ────────────────────────────────────────────────────────────────────────────────────────

// Dev ad: uzun adlar ekrana sığsın diye en uzun satırın harf sayısına göre küçülür (serif ≈ 0,46em/harf).
function heroNameStyle(lines: string[]): CSSProperties {
    const longest = Math.max(4, ...lines.map(l => l.length));
    return { fontSize: `min(148px, max(9vw, 60px), ${(92 / (longest * 0.46)).toFixed(2)}vw)` };
}

interface StripCell { key: string; label: string; value: ReactNode; wrap?: (node: ReactNode) => ReactNode }

function HomeHero({ site, cart }: { site: PublicSite; cart: SiteCart }) {
    const edit = useSiteEdit();
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

    // İki düğme: ana düğme vurgu renginde. Sipariş > rezervasyon > menü; ikincisi kalanlardan ilki (yoksa telefon).
    const actions: { key: string; label: string; to?: string; href?: string }[] = [];
    if (canOrder) actions.push({ key: 'siparis', label: 'Sipariş ver', href: hasMenu ? '#menu' : undefined, to: hasMenu ? undefined : '/siparis' });
    if (canReserve) actions.push({ key: 'rez', label: 'Masa ayırt', to: RESERVATION_PATH });
    if (actions.length < 2) actions.push({ key: 'menu', label: 'Menüyü gör', to: '/menu' });
    if (actions.length < 2 && site.phone) actions.push({ key: 'ara', label: 'Hemen ara', href: telHref(site.phone) });

    // Bilgi şeridi: durum · paket sipariş · hazırlık · Google. Verisi olmayan hücre çizilmez.
    const cells: StripCell[] = [];
    const hours = hoursLine(site);
    if (site.isOpenNow !== null || hours) {
        cells.push({
            key: 'durum', label: site.isOpenNow !== null ? 'Durum' : 'Saatler',
            value: site.isOpenNow !== null ? (
                <span className="inline-flex items-center gap-2">
                    <span aria-hidden="true" className={cn('h-[7px] w-[7px] rounded-full', site.isOpenNow ? 'bg-[#2FA866]' : 'bg-[#C8472C]')} />
                    {site.isOpenNow ? 'Şu an açık' : 'Şu an kapalı'}
                </span>
            ) : hours,
            wrap: node => <EditableBlock target="hours" label="Çalışma saatleri" className="h-full">{node}</EditableBlock>,
        });
    } else if (showEmpty) {
        cells.push({ key: 'durum', label: 'Saatler', value: '+ Saat ekle', wrap: node => <EditableBlock target="hours" label="Çalışma saatleri" className="h-full opacity-70">{node}</EditableBlock> });
    }
    const ordering = cart.ordering;
    if (canOrder && ordering && !edit) {
        const value = ordering.state === 'open'
            ? (ordering.lastOrderAt ? untilTime(timeOfDay(ordering.lastOrderAt)) : 'Sipariş alıyoruz')
            : ordering.state === 'paused' ? 'Kısa bir ara' : 'Şu an kapalı';
        cells.push({ key: 'paket', label: 'Paket sipariş', value });
    }
    const prep = averagePrepMinutes(site);
    if (prep && !edit) cells.push({ key: 'hazirlik', label: 'Hazırlık', value: `~${prep} dakika` });
    if (content.rating !== null) {
        cells.push({
            key: 'google', label: 'Google',
            value: (
                <span>
                    <span aria-hidden="true" className="text-[var(--site-accent-text)]">★</span> {formatRating(content.rating)}
                    <span className="sr-only"> / 5 puan</span>
                    {content.reviewCount !== null && <> · {content.reviewCount.toLocaleString('tr-TR')} yorum</>}
                </span>
            ),
            wrap: node => <EditableBlock target="rating" label="Google puanı" className="h-full">{node}</EditableBlock>,
        });
    } else if (showEmpty) {
        cells.push({ key: 'google', label: 'Google', value: '+ Puan ekle', wrap: node => <EditableBlock target="rating" label="Google puanı" className="h-full opacity-70">{node}</EditableBlock> });
    }
    const mdCols = ({ 1: 'md:grid-cols-1', 2: 'md:grid-cols-2', 3: 'md:grid-cols-3', 4: 'md:grid-cols-4' } as Record<number, string>)[cells.length];

    return (
        <EditableBlock target="photo:cover" label="Kapak fotoğrafı" chip="Fotoğrafı değiştir" className="outline-offset-[-4px]">
        <section id="ust" aria-labelledby="ev-ad" className="relative overflow-hidden border-b border-[var(--site-line)]">
            <HeroBackdrop image={content.coverImageUrl || undefined} />
            {edit && !content.coverImageUrl && (
                <span className="relative mx-auto mt-4 flex w-fit rounded-full border border-dashed border-[var(--site-border-strong)] bg-[var(--site-card)] px-4 py-2 font-[family-name:'DM_Sans',system-ui,sans-serif] text-[15px] font-semibold">
                    + Kapak fotoğrafı ekle
                </span>
            )}
            <div className="relative mx-auto flex max-w-[1100px] flex-col items-center gap-6 px-4 pb-12 pt-16 text-center sm:px-8 md:gap-[26px] md:pb-[72px] md:pt-[120px]">
                {kicker && !edit && <Kicker centered>{kicker}</Kicker>}
                {/* Ad Ayarlar'dan gelir; kapak adsız boş görünmesin diye düzenleyicide de yazılır (tıklanmaz). */}
                <h1 id="ev-ad" className={cn(serif, 'm-0 max-w-full break-words leading-[0.92] tracking-[-0.02em]')} style={heroNameStyle([first, accent])}>
                    {first && <>{first}<br /></>}<em className="rb-accent italic">{accent}</em>
                </h1>
                {(lead || showEmpty) && (
                    <EditableText as="p" field="tagline" value={content.tagline} fallback={content.headline} placeholder="Alt başlık yazın"
                        className="m-0 max-w-[560px] text-base leading-[1.65] text-[var(--site-sub)] md:text-lg" />
                )}
                {!edit && (
                    <div {...actionsX} className={cn('flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row sm:flex-wrap', actionsX.className)}>
                        {actions.slice(0, 2).map((a, i) => {
                            const cls = i === 0 ? heroAccentButton : heroOutlineButton;
                            return a.to
                                ? <Link key={a.key} to={a.to} className={cls}>{a.label}</Link>
                                : <a key={a.key} href={a.href} className={cls}>{a.label}</a>;
                        })}
                    </div>
                )}
            </div>
            {cells.length > 0 && (
                <div className="relative mx-auto max-w-[1100px] px-4 pb-10 sm:px-8 md:pb-14">
                    <dl className={cn('m-0 grid grid-cols-2 border-y border-[rgba(30,26,22,0.14)]', mdCols)}>
                        {cells.map(c => {
                            const cell = (
                                <div className="flex h-full flex-col items-center gap-1 px-3 py-4 text-center md:p-5">
                                    <dt className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--site-muted)]">{c.label}</dt>
                                    <dd className="m-0 font-bold">{c.value}</dd>
                                </div>
                            );
                            return (
                                <div key={c.key} className={cn('min-w-0 border-[rgba(30,26,22,0.14)] even:border-l [&:nth-child(n+3)]:border-t odd:last:col-span-2',
                                    'md:border-l md:odd:last:col-span-1 md:[&:nth-child(n+3)]:border-t-0 md:first:border-l-0')}>
                                    {c.wrap ? c.wrap(cell) : cell}
                                </div>
                            );
                        })}
                    </dl>
                </div>
            )}
        </section>
        </EditableBlock>
    );
}

// ── Süren paket sipariş ──────────────────────────────────────────────────────────────────────────

const ORDER_STEPS = ['Alındı', 'Hazırlanıyor', 'Yolda', 'Teslim'];

/** Bu cihazdan verilmiş, henüz bitmemiş paket sipariş: durum, kalan süre ve adımlar; takip sayfasına gider. */
function ActiveOrderBanner({ enabled }: { enabled: boolean }) {
    const inPreview = useSitePreview() !== null;
    const active = useActiveDeliveryOrder(enabled && !inPreview);
    const [now] = useState(() => Date.now());
    if (!active) return null;
    const t = active.tracking;
    const raw = trackingStepIndex(t.status);
    const step = raw <= 1 ? 0 : raw <= 3 ? 1 : raw === 4 ? 2 : 3;
    const eta = t.estimatedDeliveryAt ? Math.round((new Date(t.estimatedDeliveryAt).getTime() - now) / 60000) : null;
    return (
        <section aria-label="Süren siparişiniz" className={cn(sectionWrap, 'pt-8')}>
            <Link to={`/siparis/takip/${encodeURIComponent(active.token)}`}
                className="flex flex-wrap items-center justify-between gap-x-8 gap-y-4 rounded-[18px] border border-[var(--site-accent-line)] bg-[var(--site-card)] px-5 py-[18px] text-[var(--site-text)] no-underline md:px-6">
                <span className="flex flex-wrap items-baseline gap-x-3.5 gap-y-1">
                    <span className="text-[13px] text-[var(--site-muted)]">Siparişiniz #{active.number}</span>
                    <span className={cn(serif, 'text-[26px] leading-tight md:text-[28px]')}>
                        {t.statusLabel.toLocaleLowerCase('tr-TR')}
                        {eta !== null && eta > 0 && <> — <em className="rb-accent italic">yaklaşık {eta} dk</em></>}
                    </span>
                </span>
                <ol aria-label="Sipariş adımları" className="m-0 flex list-none flex-wrap items-center gap-2.5 p-0 text-[13px] font-bold">
                    {ORDER_STEPS.map((label, i) => (
                        <li key={label} className="flex items-center gap-2.5" aria-current={i === step ? 'step' : undefined}>
                            {i > 0 && <span aria-hidden="true" className={cn('h-px w-5 md:w-7', i <= step ? 'bg-[var(--site-accent)]' : 'bg-[var(--site-border-mid)]')} />}
                            <span className={i <= step ? 'text-[var(--site-accent-text)]' : 'text-[var(--site-muted)]'}>{label}</span>
                        </li>
                    ))}
                </ol>
                <span className="text-sm font-bold">Takip et →</span>
            </Link>
        </section>
    );
}

// ── Bugünün menüsü ───────────────────────────────────────────────────────────────────────────────


function MenuBoard({ site, cart }: { site: PublicSite; cart: SiteCart }) {
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
    const total = productCount(site);
    const onAdded = (name: string) => setAnnounce(`${name} sepete eklendi.`);

    return (
        <section id="menu" aria-labelledby="ev-menu" className={cn(sectionWrap, 'flex scroll-mt-24 flex-col gap-8 py-16 md:gap-9 md:py-[88px]')}>
            <div className="flex flex-wrap items-end justify-between gap-4">
                <h2 id="ev-menu" className={sectionTitle}>Bugünün <em className="rb-accent italic">menüsü</em></h2>
                <MenuSearch value={query} onChange={setQuery} />
            </div>
            <div className="flex flex-col gap-6 lg:flex-row lg:flex-wrap lg:items-start lg:gap-10 xl:flex-nowrap">
                {!q && (
                    <CategoryRail className="lg:sticky lg:top-28 lg:w-[220px] lg:shrink-0"
                        items={categories.map(c => ({ id: c.id, label: c.name, count: c.products.length }))}
                        selected={selected.id} onSelect={setTab} />
                )}
                <div className="flex min-w-0 flex-1 flex-col">
                    <h3 className={cn(serif, 'm-0 mb-2 text-[30px] italic leading-tight text-[var(--site-accent-text)] md:text-[34px]')} aria-live="polite">
                        {q ? `“${query.trim()}” için ${items.length} sonuç` : selected.name}
                    </h3>
                    {items.length > 0 ? (
                        <ul className="m-0 list-none p-0">
                            {items.map(p => <MenuRow key={p.id} product={p} action={<AddButton product={p} cart={cart} onAdded={onAdded} />} />)}
                        </ul>
                    ) : (
                        <p className="m-0 py-6 text-[var(--site-muted)]">Bu aramayla eşleşen ürün yok. Başka bir şey deneyin.</p>
                    )}
                    <Link to="/menu" className="mt-5 inline-flex min-h-11 items-center self-start font-bold underline underline-offset-4">Tüm menü · {total} ürün →</Link>
                </div>
                {cart.enabled && <CartPanel cart={cart} />}
            </div>
            <p className="sr-only" aria-live="polite">{announce}</p>
        </section>
    );
}


// ── Hikâye ───────────────────────────────────────────────────────────────────────────────────────

function HomeStory({ site }: { site: PublicSite }) {
    const edit = useSiteEdit();
    const showEmpty = Boolean(edit?.showEmpty);
    const c = site.site;
    if (!c.storyTitle && !c.about && !showEmpty) return null;
    const photo = c.aboutImageUrl || c.galleryImageUrls[0] || site.categories.flatMap(x => x.products).find(p => p.imageUrl && !p.isStockImage)?.imageUrl;
    const [quoteMain, quoteAccent] = splitAccent(c.storyTitle);
    const founder = [c.founderName, c.founderTitle].filter(Boolean).join(', ');
    return (
        <section aria-labelledby="ev-hikaye" className="relative overflow-hidden">
            {photo ? (
                <div className={cn(sectionWrap, 'pt-16 md:pt-[88px]')}>
                    <EditableBlock target="photo:about" label="Hikâye fotoğrafı" chip="Fotoğrafı değiştir" className="rounded-[28px]">
                        <div className="relative h-[240px] overflow-hidden rounded-[28px] sm:h-[320px] md:h-[420px]">
                            <img src={photo} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
                        </div>
                    </EditableBlock>
                </div>
            ) : showEmpty && (
                <div className={cn(sectionWrap, 'pt-16')}><EmptySlot target="photo:about" title="+ Hikâye fotoğrafı ekle" /></div>
            )}
            <div className="mx-auto flex max-w-[980px] flex-col items-center gap-6 px-4 py-16 text-center sm:px-8 md:gap-7 md:py-[88px]">
                <EditableBlock target="year" label="Kuruluş yılı" className="rounded-full">
                    <h2 id="ev-hikaye" className={cn(eyebrow, 'm-0')}>{c.foundedYear ? `Hikâyemiz · ${sinceYear(c.foundedYear)}` : 'Hikâyemiz'}</h2>
                </EditableBlock>
                {edit ? (
                    (c.storyTitle || showEmpty) && (
                        <EditableText as="p" field="storyTitle" value={c.storyTitle} placeholder="Slogan yazın"
                            className={cn(serif, 'm-0 break-words text-[36px] leading-[1.08] md:text-[clamp(36px,4.4vw,62px)]')} />
                    )
                ) : c.storyTitle && (
                    <blockquote className={cn(serif, 'm-0 break-words text-[36px] leading-[1.08] md:text-[clamp(36px,4.4vw,62px)]')}>
                        “{quoteMain && <>{quoteMain} </>}<span className="italic">{quoteAccent}</span>”
                    </blockquote>
                )}
                {founder && (edit ? (
                    <span className="flex flex-wrap justify-center gap-x-1.5 text-[15px] text-[var(--site-muted)]">
                        — <EditableText field="founderName" value={c.founderName} placeholder="Ustanın adı" />
                        {(c.founderTitle || showEmpty) && <>, <EditableText field="founderTitle" value={c.founderTitle} placeholder="Unvanı" /></>}
                    </span>
                ) : <span className="text-[15px] text-[var(--site-muted)]">— {founder}</span>)}
                {(c.about || showEmpty) && (
                    <EditableText as="p" field="about" value={c.about} multiline placeholder="Kısa hikâyenizi yazın"
                        className="m-0 max-w-[620px] whitespace-pre-line text-base leading-[1.75] text-[var(--site-sub)]" />
                )}
                {!edit && hasAboutPage(site) && (
                    <Link to="/hakkimizda" className="inline-flex min-h-11 items-center font-bold underline underline-offset-4">Hikâyenin devamı →</Link>
                )}
            </div>
        </section>
    );
}

// ── Fotoğraflar ──────────────────────────────────────────────────────────────────────────────────

/** Mekân ve menü fotoğrafları: 3 → 3'lü, 4–5 → 4'lü, 6 ve üstü → 6'lı (yuvarlak köşeli kareler). 3'ten azsa çizilmez. */
function PhotoStrip({ site }: { site: PublicSite }) {
    const edit = useSiteEdit();
    // Düzenleyicide yalnız galeri fotoğrafları (menü fotoğrafları Yemeklerimiz'den gelir).
    const all = edit ? site.site.galleryImageUrls.slice(0, 6).map(url => ({ url, isStock: url.includes('/shared/stock/'), alt: '' })) : collagePhotos(site, 6);
    if (all.length < (edit ? 1 : 3)) {
        if (!edit?.showEmpty) return null;
        return (
            <div className={cn(sectionWrap, 'pb-16')}>
                <EmptySlot target="gallery:add" title="+ Fotoğraf ekle" />
            </div>
        );
    }
    const count = all.length >= 6 ? 6 : all.length >= 4 ? 4 : edit ? all.length : 3;
    const photos = all.slice(0, count);
    const cols = ({ 1: 'grid-cols-1', 2: 'grid-cols-2', 3: 'grid-cols-3', 4: 'grid-cols-2 sm:grid-cols-4', 6: 'grid-cols-3 md:grid-cols-6' } as Record<number, string>)[count];
    const instagram = site.site.instagramUrl;
    const galleryCount = site.site.galleryImageUrls.length;
    const igX = editTarget(edit, 'contact', 'Instagram');
    return (
        <section aria-label="Fotoğraflar" className={cn(sectionWrap, 'relative pb-16 md:pb-[88px]')}>
            <div className={cn('grid gap-2 md:gap-3', cols)}>
                {photos.map((p, i) => {
                    // Galeriden gelen kare galeri fotoğrafıdır; sonrakiler menüdeki ürün fotoğrafları.
                    const x = i < galleryCount ? editTarget(edit, `gallery:${i}`, `Mekân fotoğrafı ${i + 1}`) : { className: '' };
                    return (
                        <div key={i} {...x} className={cn('relative overflow-hidden rounded-[18px]', x.className)}>
                            <img src={p.url} alt={p.alt} loading="lazy" className="block aspect-square w-full object-cover" />
                            {p.isStock && <StockImageLabel />}
                        </div>
                    );
                })}
            </div>
            {instagram && (
                <a href={instagram} target="_blank" rel="noopener noreferrer" {...igX}
                    className={cn('absolute left-1/2 top-[calc(50%-32px)] flex h-14 max-w-[calc(100%-48px)] -translate-x-1/2 -translate-y-1/2 items-center gap-2.5 rounded-full bg-[var(--site-card)] px-7 font-bold text-[var(--site-text)] no-underline shadow-[0_12px_30px_rgba(30,26,22,0.18)] md:top-[calc(50%-44px)]', igX.className)}>
                    <span aria-hidden="true" className="shrink-0 [&>svg]:h-5 [&>svg]:w-5"><InstagramIcon /></span>
                    <span className="truncate">{instagramHandle(instagram)}</span>
                </a>
            )}
        </section>
    );
}

// ── Yorumlar ─────────────────────────────────────────────────────────────────────────────────────

/** Google puanı ve restoranın seçtiği yorumlar (en çok 3). Puan da yorum da yoksa bölüm çizilmez. */
function HomeReviews({ site }: { site: PublicSite }) {
    const edit = useSiteEdit();
    const showEmpty = Boolean(edit?.showEmpty);
    const c = site.site;
    const reviews = c.featuredReviews;
    const max = SITE_LIMITS.review.max;
    const canAdd = Boolean(edit) && reviews.length < max;
    if (c.rating === null && reviews.length === 0 && !showEmpty) return null;
    return (
        <section aria-labelledby="ev-yorumlar" className="border-t border-[var(--site-line)] bg-[var(--site-alt)]">
            <div className={cn(sectionWrap, 'flex flex-col gap-8 py-16 md:gap-9 md:py-[88px]')}>
                <div className="flex flex-wrap items-end justify-between gap-5">
                    {c.rating !== null ? (
                        <EditableBlock target="rating" label="Google puanı" className="rounded-[16px]">
                            <div className="flex flex-wrap items-baseline gap-x-[18px] gap-y-2">
                                <h2 id="ev-yorumlar" className="sr-only">Misafir yorumları</h2>
                                <span className={cn(serif, 'text-[88px] leading-[0.85] md:text-[112px]')}>{formatRating(c.rating)}</span>
                                <span className="flex flex-col gap-1.5">
                                    <span role="img" aria-label={`5 üzerinden ${formatRating(c.rating)} puan`}><Stars value={c.rating} className="text-xl tracking-[3px]" /></span>
                                    <span className="text-sm text-[var(--site-muted)]">{c.reviewCount !== null ? `Google'da ${c.reviewCount.toLocaleString('tr-TR')} yorum` : 'Google puanı'}</span>
                                </span>
                            </div>
                        </EditableBlock>
                    ) : (
                        <div className="flex flex-col gap-3">
                            <h2 id="ev-yorumlar" className={sectionTitle}>Misafirlerimiz <em className="rb-accent italic">ne diyor?</em></h2>
                            {showEmpty && <EmptySlot target="rating" title="+ Google puanı ekle" className="min-h-[64px]" />}
                        </div>
                    )}
                    {c.reviewsUrl && !edit && (
                        <a href={c.reviewsUrl} target="_blank" rel="noopener noreferrer" className={cn(cardButton.outline, 'h-12 px-[22px] text-[15px]')}>Google'da tüm yorumlar</a>
                    )}
                </div>
                {(reviews.length > 0 || canAdd) && (
                    <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,280px),1fr))] gap-4">
                        {reviews.map((r, i) => (
                            <ListCard key={i} list="reviews" index={i} count={reviews.length} label="Yorum" className="flex rounded-[22px]">
                                <figure className="m-0 flex flex-1 flex-col gap-[18px] rounded-[22px] border border-[var(--site-border)] p-[26px]">
                                    <span aria-hidden="true" className={cn(serif, 'h-6 text-[56px] leading-none text-[var(--site-accent-text)]')}>“</span>
                                    {edit ? (
                                        <>
                                            <EditableText as="blockquote" field={`review:${i}:text`} value={r.text} multiline placeholder="Yorumun metni"
                                                className={cn(serif, 'm-0 text-[24px] leading-[1.3]')} />
                                            <figcaption className="mt-auto flex flex-wrap gap-x-1.5 text-[13px] text-[var(--site-muted)]">
                                                <EditableText field={`review:${i}:author`} value={r.author} placeholder="Yazan" />·
                                                <EditableText field={`review:${i}:source`} value={r.source} placeholder="Kaynak" />
                                            </figcaption>
                                        </>
                                    ) : (
                                        <>
                                            <blockquote className={cn(serif, 'm-0 text-[24px] leading-[1.3]')}>{r.text}</blockquote>
                                            {(r.author || r.source) && <figcaption className="mt-auto text-[13px] text-[var(--site-muted)]">{[r.author, r.source].filter(Boolean).join(' · ')}</figcaption>}
                                        </>
                                    )}
                                </figure>
                            </ListCard>
                        ))}
                        <AddCard list="reviews" label="Yorum ekle" count={reviews.length} max={max} />
                    </div>
                )}
            </div>
        </section>
    );
}
