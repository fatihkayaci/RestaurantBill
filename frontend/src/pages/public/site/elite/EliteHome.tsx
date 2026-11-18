import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { canReserveOnline, type PublicProduct, type PublicSite, type ReservationStatusInfo } from '@/features/customerSite/types';
import type { OnlineSetMenu } from '@/features/delivery/types';
import { trackingStepIndex } from '@/features/delivery/deliveryStatus';
import { useActiveDeliveryOrder, useSiteCart, type SiteCart } from '@/features/delivery/useSiteCart';
import { cn } from '@/lib/utils';
import { MyReservations } from '../SiteChrome';
import { SitePage } from '../SiteFrame';
import { EditorGallery, EditorVisit } from '../EditorExtras';
import { SlotsSummary } from '../SiteSetMenus';
import { savingLabel } from '../setMenuParts';
import { aboutStats } from '../aboutStats';
import { photoTarget } from '../venueData';
import { formatRating, hasAboutPage, productCount, sinceYear } from '../siteParts';
import { formatSitePrice, splitAccent, telHref, whatsappHref } from '../siteTheme';
import { restaurantName, weekSchedule } from '../useSite';
import { AddCard, EditableBlock, EditableText, EmptySlot, ExternalHint, ListCard } from '../siteEdit';
import { SITE_LIMITS, editExternal, editTarget, useSiteEdit, useSitePreview, useSiteWindow } from '../siteEditContext';
import { EliteAddButton, EliteDishLine, EliteHero, EliteKicker, EliteRoundButton } from './EliteBits';
import EliteReserve from './EliteReserve';
import { elButton, elItalic, elLabel, elPattern, elSection, elSerif, elTextLink, elTitle, elWrap, heroLead, onDark, roman } from './eliteParts';
import { StockImageLabel } from '../../components/StockImageLabel';

// Ana sayfa, Elit (tasarım: EliteAnaSayfa). (1) Ekran yüksekliğinde fotoğraf kapağı: üst satır (semt · kuruluş yılı),
// iki satır ad, italik alt başlık, altın ve çizgili düğme; altta durum · Keşfet · konum. (2) Hikâye özeti: altın
// çerçeveli fotoğraf, slogan, kısa hikâye, usta ve gerçek rakamlar. (3) Koyu "Şefin imzası": ustanın seçtiği ürünler
// (seçilenin fotoğrafı büyük). (4) Ara bantta sekmeli menü (+ düğmeleri online sipariş açıkken). (5) "Özel geceler"
// (yalnız "Grup ve özel gün" olanağı seçiliyse). (6) Yorumlar. (7) Rezervasyon (gün, saat, kişi → rezervasyon sayfası).
// Verisi olmayan bölüm çizilmez; restoranın girmediği bilgi uydurulmaz.

const MENU_PREVIEW = 8;
const SET_TAB = 'hazir';

export default function EliteHome({ site, mine }: { site: PublicSite; mine: ReservationStatusInfo[] }) {
    const cart = useSiteCart();
    const edit = useSiteEdit();
    return (
        <SitePage site={site} current="home" overlayHeader>
            <main className="flex flex-1 flex-col bg-[var(--site-bg)] text-[var(--site-text)]">
                <HomeHero site={site} cart={cart} />
                {mine.length > 0 && (
                    <section className={cn(elWrap, 'py-14')}><MyReservations items={mine} /></section>
                )}
                <div id="kesfet" className="scroll-mt-24 lg:scroll-mt-28">
                    <StorySummary site={site} />
                </div>
                <ExternalHint source="menu"><Signature site={site} cart={cart} /></ExternalHint>
                <ExternalHint source="menu"><MenuTabs site={site} cart={cart} /></ExternalHint>
                <Occasions site={site} />
                <Reviews site={site} />
                {!edit && canReserveOnline(site) && <ExternalHint source="reservation"><ReserveSection site={site} /></ExternalHint>}
                {edit && (
                    <div className={cn(elWrap, 'flex flex-col gap-4 py-10')}>
                        <EditorGallery site={site} />
                        <EditorVisit site={site} />
                    </div>
                )}
            </main>
        </SitePage>
    );
}

// ── 1. Kapak ─────────────────────────────────────────────────────────────────────────────────────

function HomeHero({ site, cart }: { site: PublicSite; cart: SiteCart }) {
    const edit = useSiteEdit();
    const showEmpty = Boolean(edit?.showEmpty);
    const c = site.site;
    const name = restaurantName(site);
    const [first, accent] = splitAccent(name);
    const canReserve = canReserveOnline(site);
    const hasMenu = productCount(site) > 0;
    const kicker = [site.district || site.city, c.foundedYear ? sinceYear(c.foundedYear) : null].filter(Boolean).join(' · ');
    const place = [site.district, site.city].filter(Boolean).join(' · ');
    const today = weekSchedule(site)?.find(r => r.isToday) ?? null;
    const actionsX = editExternal(edit, 'heroActions');

    // İki düğme: sipariş > rezervasyon > menü; ikincisi kalanlardan ilki (yoksa telefon).
    const actions: { key: string; label: string; to?: string; href?: string }[] = [];
    if (cart.enabled) actions.push({ key: 'siparis', label: 'Sipariş ver', href: hasMenu ? '#menu' : undefined, to: hasMenu ? undefined : '/siparis' });
    if (canReserve) actions.push({ key: 'rez', label: 'Rezervasyon yaptır', href: '#rezervasyon' });
    if (actions.length < 2) actions.push({ key: 'menu', label: 'Menüyü gör', href: hasMenu ? '#menu' : undefined, to: hasMenu ? undefined : '/menu' });
    if (actions.length < 2 && site.phone) actions.push({ key: 'ara', label: 'Hemen ara', href: telHref(site.phone) });

    const lead = c.tagline || c.headline || showEmpty
        ? <EditableText as="p" field="tagline" value={c.tagline} fallback={c.headline} placeholder="Alt başlık yazın" className={heroLead} />
        : null;
    const status = site.isOpenNow !== null || today ? (
        <span className="inline-flex items-center gap-2.5">
            {site.isOpenNow !== null && <span aria-hidden="true" className={cn('h-1.5 w-1.5 shrink-0 rounded-full', site.isOpenNow ? 'bg-[var(--site-dot-ok)]' : 'bg-[var(--site-dot-bad)]')} />}
            {[site.isOpenNow === null ? null : site.isOpenNow ? 'Şu an açık' : 'Şu an kapalı', today ? `Bugün ${today.text}` : null].filter(Boolean).join(' · ')}
        </span>
    ) : showEmpty ? <span>+ Saat ekle</span> : null;

    const bottom = (
        <div className="relative z-[1] grid grid-cols-1 items-end gap-3 px-4 pb-7 text-[11px] uppercase tracking-[0.2em] sm:grid-cols-[1fr_auto_1fr] sm:px-8 md:pb-[34px] md:text-xs lg:px-14">
            <div className="justify-self-center sm:justify-self-start">
                {status && <EditableBlock target="hours" label="Çalışma saatleri">{status}</EditableBlock>}
            </div>
            {!edit && (
                <a href="#kesfet" className="hidden flex-col items-center gap-3 tracking-[0.3em] text-[var(--site-on-cover)] no-underline sm:flex">
                    Keşfet
                    <span aria-hidden="true" className="relative h-14 w-px overflow-hidden bg-[color-mix(in_srgb,var(--site-on-cover)_25%,transparent)]">
                        <span className="rb-el-inis absolute inset-0 bg-[var(--site-accent-on-dark)]" />
                    </span>
                </a>
            )}
            {place && <span className="hidden justify-self-end sm:block">{place}</span>}
        </div>
    );

    return (
        <EliteHero tall titleId="ev-ad" image={c.coverImageUrl} ownImage={Boolean(c.coverImageUrl)} imageTarget="photo:cover" imageLabel="Kapak fotoğrafı"
            emptyHint="+ Kapak fotoğrafı ekle" label={!edit && kicker ? kicker : undefined} lead={lead} bottom={bottom}
            title={<>{first && <>{first}<br /></>}<em className="italic">{accent}</em></>}>
            {!edit && <ActiveOrder enabled={cart.enabled} />}
            {!edit && (
                <div {...actionsX} className={cn(actionsX.className, 'mt-2.5 flex w-full flex-col items-stretch justify-center gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:gap-4')}>
                    {actions.slice(0, 2).map((a, i) => {
                        const cls = cn(i === 0 ? elButton.gold : elButton.ghost, 'md:min-h-[58px] md:px-10');
                        return a.to
                            ? <Link key={a.key} to={a.to} className={cls}>{a.label}</Link>
                            : <a key={a.key} href={a.href} className={cls}>{a.label}</a>;
                    })}
                </div>
            )}
        </EliteHero>
    );
}

const ORDER_STEPS = 4;

/** Bu cihazdan verilmiş, henüz bitmemiş paket sipariş: kapakta ince çizgili şerit (durum, numara, kalan süre, adımlar). */
function ActiveOrder({ enabled }: { enabled: boolean }) {
    const inPreview = useSitePreview() !== null;
    const active = useActiveDeliveryOrder(enabled && !inPreview);
    const [now] = useState(() => Date.now());
    if (!active) return null;
    const t = active.tracking;
    const raw = trackingStepIndex(t.status);
    const step = raw <= 1 ? 0 : raw <= 3 ? 1 : raw === 4 ? 2 : 3;
    const eta = t.estimatedDeliveryAt ? Math.round((new Date(t.estimatedDeliveryAt).getTime() - now) / 60000) : null;
    return (
        <Link to={`/siparis/takip/${encodeURIComponent(active.token)}`}
            className="inline-flex max-w-full flex-wrap items-center justify-center gap-x-4 gap-y-2 border border-[color-mix(in_srgb,var(--site-accent-on-dark)_50%,transparent)] bg-[color-mix(in_srgb,var(--site-cover-bg)_60%,transparent)] px-4 py-2.5 text-xs uppercase tracking-[0.18em] text-[var(--site-on-cover)] no-underline">
            <span>Siparişiniz {t.statusLabel.toLocaleLowerCase('tr-TR')} · #{active.number}{eta !== null && eta > 0 && <> · yaklaşık {eta} dk</>}</span>
            <span aria-hidden="true" className="inline-flex gap-[3px]">
                {Array.from({ length: ORDER_STEPS }, (_, i) => (
                    <span key={i} className={cn('h-0.5 w-[18px]', i <= step ? 'bg-[var(--site-accent-on-dark)]' : 'bg-[color-mix(in_srgb,var(--site-on-cover)_25%,transparent)]')} />
                ))}
            </span>
            <span className="inline-flex min-h-11 items-center font-medium text-[var(--site-accent-on-dark)]">Takip et →</span>
        </Link>
    );
}

// ── 2. Hikâye özeti ──────────────────────────────────────────────────────────────────────────────

const STAT_ORDER = ['yil', 'urun', 'puan', 'kapasite'];

function StorySummary({ site }: { site: PublicSite }) {
    const edit = useSiteEdit();
    const showEmpty = Boolean(edit?.showEmpty);
    const c = site.site;
    if (!(c.storyTitle || c.about || showEmpty)) return null;
    const photo = c.aboutImageUrl;
    const [main, accent] = c.storyTitle ? splitAccent(c.storyTitle) : ['', restaurantName(site)];
    const facts = aboutStats(site).sort((a, b) => STAT_ORDER.indexOf(a.key) - STAT_ORDER.indexOf(b.key)).slice(0, 3);
    const showPhoto = Boolean(photo) || showEmpty;

    return (
        <section aria-labelledby="ev-hikaye" className="bg-[var(--site-bg)]">
            <div className={cn(elWrap, 'flex flex-wrap items-center gap-x-24 gap-y-14 py-20 md:pb-[110px] md:pt-[140px]')}>
                {showPhoto && (
                    <div className="relative min-w-0 flex-[1_1_480px] pb-5 pr-5 sm:pb-7 sm:pr-7">
                        <span aria-hidden="true" className="absolute bottom-0 right-0 h-[calc(100%-20px)] w-[calc(100%-20px)] border border-[var(--site-accent)] sm:h-[calc(100%-28px)] sm:w-[calc(100%-28px)]" />
                        <EditableBlock target="photo:about" label="Hikâye fotoğrafı" chip="Fotoğrafı değiştir" className="relative">
                            <div className="rb-el-zoom relative h-[420px] overflow-hidden bg-[var(--site-placeholder)] md:h-[640px]">
                                {photo
                                    ? <img src={photo} alt="" loading="lazy" className="h-full w-full object-cover" />
                                    : <span className="flex h-full items-center justify-center font-[family-name:'DM_Sans',system-ui,sans-serif] text-[15px] font-semibold text-[var(--site-muted)]">+ Hikâye fotoğrafı ekle</span>}
                                {photo?.includes('/shared/stock/') && <StockImageLabel className="bottom-auto right-3 top-3" />}
                            </div>
                        </EditableBlock>
                        {c.foundedYear && (
                            <EditableBlock target="year" label="Kuruluş yılı" className="absolute bottom-12 left-5 sm:bottom-14 sm:left-7">
                                <span className={cn(elItalic, 'block bg-[var(--site-paper)] px-5 py-3.5 text-xl text-[var(--site-on-paper)] md:text-[22px]')}>{sinceYear(c.foundedYear)}</span>
                            </EditableBlock>
                        )}
                    </div>
                )}
                <div className="flex min-w-0 flex-[1_1_420px] flex-col gap-7">
                    <EliteKicker>Hikâyemiz</EliteKicker>
                    {edit ? (
                        <EditableText as="h2" id="ev-hikaye" field="storyTitle" value={c.storyTitle} placeholder="Slogan yazın"
                            className={cn(elSerif, 'm-0 break-words text-[40px] leading-[1.02] md:text-[clamp(44px,4.4vw,68px)]')} />
                    ) : (
                        <h2 id="ev-hikaye" className={cn(elSerif, 'm-0 break-words text-[40px] leading-[1.02] md:text-[clamp(44px,4.4vw,68px)]')}>
                            {main && <>{main} </>}<em className="italic">{accent}</em>
                        </h2>
                    )}
                    {(c.about || showEmpty) && (
                        <EditableText as="p" field="about" value={c.about} multiline placeholder="Kısa hikâyenizi yazın"
                            className="m-0 line-clamp-6 whitespace-pre-line text-[17px] leading-[1.85] text-[var(--site-sub)] md:text-lg" />
                    )}
                    {(c.founderName || showEmpty) && (
                        <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1">
                            <EditableText field="founderName" value={c.founderName} placeholder="Ustanın adı" className={cn(elItalic, 'text-[30px] leading-tight md:text-[34px]')} />
                            {(c.founderTitle || showEmpty) && (
                                <EditableText field="founderTitle" value={c.founderTitle} placeholder="Unvanı" className="text-[11px] uppercase tracking-[0.3em] text-[var(--site-muted)]" />
                            )}
                        </div>
                    )}
                    {facts.length > 0 && (
                        <dl className={cn('m-0 grid border-t border-[color-mix(in_srgb,var(--site-text)_18%,transparent)]', facts.length === 1 ? 'grid-cols-1' : facts.length === 2 ? 'grid-cols-2' : 'grid-cols-3')}>
                            {facts.map((f, i) => {
                                const cell = (
                                    <div className={cn('flex h-full flex-col gap-1.5 py-6', i > 0 && 'border-l border-[color-mix(in_srgb,var(--site-text)_18%,transparent)] pl-4 sm:pl-6')}>
                                        <dd className={cn(elSerif, 'order-1 m-0 text-[38px] leading-none md:text-[48px]')}>{f.value}</dd>
                                        <dt className="order-2 text-[11px] uppercase tracking-[0.2em] text-[var(--site-muted)] sm:tracking-[0.26em]">{f.label}</dt>
                                    </div>
                                );
                                return <div key={f.key} className="min-w-0">{f.wrap ? f.wrap(cell) : cell}</div>;
                            })}
                        </dl>
                    )}
                    {!edit && hasAboutPage(site) && <Link to="/hakkimizda" className={cn(elTextLink, 'text-[var(--site-text)]')}>Hikâyenin tamamı <span aria-hidden="true">→</span></Link>}
                </div>
            </div>
        </section>
    );
}

// ── 3. Şefin imzası (ustanın seçtikleri) ─────────────────────────────────────────────────────────

/** "Ustanın seçtikleri" satırı: öne çıkan ürün ya da hazır menü (set). */
interface SignatureDish {
    id: string;
    name: string;
    price: number;
    imageUrl: string;
    isStockImage: boolean;
    description: string;
    product?: PublicProduct;
    menu?: OnlineSetMenu;
}

const MAX_SIGNATURE = 5;

// Öne çıkan menüler önce (tükenenler yok), ardından öne çıkan ürünler; toplam beş satır.
function signatureDishes(site: PublicSite): SignatureDish[] {
    const menus: SignatureDish[] = (site.setMenus ?? []).filter(m => m.isFeatured && m.isAvailable).map(m => ({
        id: `menu-${m.id}`, name: m.name, price: m.price, imageUrl: m.imageUrl, isStockImage: m.isStockImage,
        description: m.description?.trim() ?? '', menu: m,
    }));
    const products: SignatureDish[] = site.categories.flatMap(c => c.products).filter(p => p.isFeatured).map(p => ({
        id: p.id, name: p.name, price: p.price, imageUrl: p.imageUrl, isStockImage: p.isStockImage,
        description: p.description?.trim() ?? '', product: p,
    }));
    return [...menus, ...products].slice(0, MAX_SIGNATURE);
}

function Signature({ site, cart }: { site: PublicSite; cart: SiteCart }) {
    const dishes = useMemo(() => signatureDishes(site), [site]);
    const [sel, setSel] = useState(0);
    const [announce, setAnnounce] = useState('');
    if (dishes.length === 0) return null;
    const index = Math.min(sel, dishes.length - 1);
    const current = dishes[index];
    const hasPhotos = dishes.some(d => d.imageUrl);

    return (
        <section aria-labelledby="ev-imza" className={onDark}>
            <div className={cn(elWrap, elSection, 'flex max-w-[1320px] flex-col gap-14 md:gap-16')}>
                <div className="flex flex-wrap items-end justify-between gap-7">
                    <div className="flex flex-col gap-[22px]">
                        <EliteKicker dark>Şefin imzası</EliteKicker>
                        <h2 id="ev-imza" className={cn(elTitle, 'md:text-[clamp(48px,5vw,84px)]')}>Ustanın <em className="italic">seçtikleri</em></h2>
                    </div>
                    <a href="#menu" className={elButton.goldLine}>Menüyü gör <span aria-hidden="true">→</span></a>
                </div>
                <div className="flex flex-wrap items-stretch gap-x-20 gap-y-12">
                    <ul className="m-0 flex min-w-0 flex-[1_1_460px] list-none flex-col p-0">
                        {dishes.map((d, i) => {
                            const on = i === index;
                            return (
                                <li key={d.id} className={cn('border-b border-[color-mix(in_srgb,var(--site-on-paper)_12%,transparent)]', i === 0 && 'border-t')}>
                                    <button type="button" aria-expanded={on} onClick={() => setSel(i)} onMouseEnter={() => setSel(i)}
                                        className={cn('flex w-full gap-3 bg-transparent py-6 text-left text-[var(--site-on-paper)] transition-all duration-300 md:py-7', on ? 'items-start' : 'items-center')}>
                                        <span aria-hidden="true" className={cn(elItalic, 'w-12 shrink-0 text-[22px] text-[var(--site-accent-on-dark)] md:w-[54px]')}>{roman(i + 1)}</span>
                                        <span className={cn(elSerif, 'min-w-0 flex-1 break-words leading-[1.05] transition-all duration-300',
                                            on ? 'text-[34px] italic md:text-[46px]' : 'text-[26px] text-[var(--site-on-paper-sub)] md:text-[30px]')}>{d.name}</span>
                                        <span className={cn(elSerif, 'shrink-0 whitespace-nowrap text-[22px] md:text-[26px]', on ? 'text-[var(--site-accent-on-dark)]' : 'text-[var(--site-on-paper-sub)]')}>{formatSitePrice(d.price)}</span>
                                    </button>
                                    {on && (d.description || d.menu || cart.enabled) && (
                                        <div className="rb-el-belir-hizli -mt-2 flex flex-wrap items-center justify-between gap-4 pb-7 pl-[60px] md:pl-[66px]">
                                            {(d.description || d.menu) && (
                                                <div className="flex max-w-[46ch] flex-col gap-1.5 text-[15px] leading-[1.7] text-[var(--site-on-paper-sub)] [--site-muted:var(--site-on-paper-sub)] [--site-accent-text:var(--site-accent-on-dark)]">
                                                    {d.menu && <span className={cn(elLabel, 'text-[10px] tracking-[0.22em] text-[var(--site-accent-on-dark)]')}>Hazır menü</span>}
                                                    {d.description && <p className="m-0">{d.description}</p>}
                                                    {d.menu && <SlotsSummary menu={d.menu} />}
                                                </div>
                                            )}
                                            {d.product && <SignatureAdd product={d.product} cart={cart} onAdded={n => setAnnounce(`${n} sepete eklendi.`)} />}
                                            {d.menu && <SignatureMenuAdd menu={d.menu} cart={cart} onAdded={n => setAnnounce(`${n} sepete eklendi.`)} />}
                                        </div>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                    {hasPhotos && (
                        <div className="relative min-h-[380px] min-w-0 flex-[1_1_480px] overflow-hidden bg-[var(--site-olive)] md:min-h-[620px]">
                            {dishes.map((d, i) => d.imageUrl ? (
                                <img key={d.id} src={d.imageUrl} alt={i === index ? d.name : ''} aria-hidden={i !== index}
                                    className={cn('absolute inset-0 h-full w-full object-cover transition-[opacity,transform] duration-700 ease-out motion-reduce:transition-none',
                                        i === index ? 'scale-100 opacity-100' : 'scale-[1.06] opacity-0')} />
                            ) : null)}
                            {!current.imageUrl && <span aria-hidden="true" className={cn('absolute inset-0', elPattern)} />}
                            {current.isStockImage && current.imageUrl && <span className="absolute right-3 top-3 bg-black/45 px-1.5 py-0.5 text-[10px] text-white/90">Temsili görsel</span>}
                            <span aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(180deg,transparent_55%,color-mix(in_srgb,var(--site-paper)_88%,transparent)_100%)]" />
                            <div className="absolute inset-x-6 bottom-6 flex items-end justify-between gap-4 md:inset-x-8 md:bottom-[30px]">
                                <span className={cn(elItalic, 'text-[26px] leading-[1.1] md:text-[30px]')}>{current.name}</span>
                                <span className="shrink-0 text-xs tracking-[0.3em] text-[var(--site-accent-on-dark)]">{roman(index + 1)} / {roman(dishes.length)}</span>
                            </div>
                        </div>
                    )}
                </div>
                <p className="sr-only" aria-live="polite">{announce}</p>
            </div>
        </section>
    );
}

/** Seçili imza tabağının "Sepete ekle" düğmesi: yalnız online sipariş açıkken ve ürün paket menüsündeyse. */
function SignatureAdd({ product, cart, onAdded }: { product: PublicProduct; cart: SiteCart; onAdded: (name: string) => void }) {
    if (!cart.enabled) return null;
    const delivery = cart.productFor(product.id);
    if (!delivery || delivery.isOutOfStock || product.isOutOfStock) return null;
    const qty = cart.lines.filter(l => l.kind === 'product' && l.productId === product.id).reduce((s, l) => s + l.quantity, 0);
    return (
        <button type="button" onClick={() => { cart.addProduct(product.id); onAdded(product.name); }}
            className={cn(elButton.goldLine, 'min-h-11 px-5 md:min-h-11')}>
            {qty > 0 ? `Sepette ${qty} · bir tane daha` : 'Sepete ekle'}
        </button>
    );
}

// Öne çıkan hazır menü: seçimi olan menü paket sipariş sayfasında seçilir, seçimsiz menü doğrudan sepete girer.
function SignatureMenuAdd({ menu, cart, onAdded }: { menu: OnlineSetMenu; cart: SiteCart; onAdded: (name: string) => void }) {
    if (!cart.enabled) return null;
    const found = cart.setMenuFor(menu.id);
    if (!found?.menu.isAvailable || !menu.isAvailable) return null;
    if (found.needsChoice) {
        return <Link to="/siparis" aria-label={`${menu.name}: seçerek sepete ekle`} className={cn(elButton.goldLine, 'min-h-11 px-5 md:min-h-11')}>Menüyü seç</Link>;
    }
    const qty = cart.lines.filter(l => l.kind === 'setMenu' && l.setMenuId === menu.id).reduce((s, l) => s + l.quantity, 0);
    return (
        <button type="button" onClick={() => { cart.addSetMenu(menu.id); onAdded(menu.name); }}
            className={cn(elButton.goldLine, 'min-h-11 px-5 md:min-h-11')}>
            {qty > 0 ? `Sepette ${qty} · bir tane daha` : 'Sepete ekle'}
        </button>
    );
}

// ── 4. Menü (sekmeli) ────────────────────────────────────────────────────────────────────────────

function MenuTabs({ site, cart }: { site: PublicSite; cart: SiteCart }) {
    const categories = useMemo(() => site.categories.filter(c => c.products.length > 0), [site]);
    const menus = site.setMenus ?? [];
    const [tab, setTab] = useState<string | null>(null);
    const [announce, setAnnounce] = useState('');
    const tabs = [...categories.map(c => ({ id: c.id, label: c.name })), ...(menus.length > 0 ? [{ id: SET_TAB, label: 'Hazır menüler' }] : [])];
    if (tabs.length === 0) return null;
    const selected = tabs.find(t => t.id === tab) ?? tabs[0];
    const category = categories.find(c => c.id === selected.id);
    const onAdded = (name: string) => setAnnounce(`${name} sepete eklendi.`);

    return (
        <section id="menu" aria-labelledby="ev-menu" className="scroll-mt-24 bg-[var(--site-alt)] text-[var(--site-text)] lg:scroll-mt-28">
            <div className={cn(elWrap, 'flex max-w-[1240px] flex-col items-center gap-12 py-20 md:py-[130px]')}>
                <div className="flex flex-col items-center gap-5 text-center">
                    <EliteKicker centered>Menü</EliteKicker>
                    <h2 id="ev-menu" className={cn(elTitle, 'md:text-[clamp(48px,5vw,84px)]')}>Sofranın <em className="italic">tamamı</em></h2>
                </div>
                {tabs.length > 1 && (
                    <div role="group" aria-label="Menü kategorileri" className="flex max-w-full flex-wrap justify-center gap-x-[38px] border-b border-[color-mix(in_srgb,var(--site-text)_15%,transparent)]">
                        {tabs.map(t => {
                            const on = t.id === selected.id;
                            return (
                                <button key={t.id} type="button" aria-pressed={on} onClick={() => setTab(t.id)}
                                    className={cn('min-h-12 border-b-2 bg-transparent px-0.5 text-[11px] font-medium uppercase tracking-[0.26em] transition-colors md:text-xs',
                                        on ? 'border-[var(--site-accent-text)] text-[var(--site-text)]' : 'border-transparent text-[var(--site-muted)] hover:text-[var(--site-text)]')}>
                                    {t.label}
                                </button>
                            );
                        })}
                    </div>
                )}
                <ul key={selected.id} className="m-0 grid w-full list-none grid-cols-[repeat(auto-fill,minmax(min(100%,460px),1fr))] gap-x-20 gap-y-[30px] p-0">
                    {category
                        ? category.products.slice(0, MENU_PREVIEW).map((p, i) => (
                            <li key={p.id} className="rb-el-belir-hizli min-w-0" style={{ animationDelay: `${i * 0.05}s` }}>
                                <EliteDishLine name={p.name} price={formatSitePrice(p.price)} size="lg" out={p.isOutOfStock}
                                    meta={[p.description?.trim(), p.prepMinutes ? `~${p.prepMinutes} dk` : null].filter(Boolean).join(' · ')}
                                    tag={p.isOutOfStock ? 'şu an tükendi' : null}
                                    action={<EliteAddButton product={p} cart={cart} onAdded={onAdded} />} />
                            </li>
                        ))
                        : menus.slice(0, MENU_PREVIEW).map(m => (
                            <li key={m.id} className="rb-el-belir-hizli min-w-0"><SetMenuItem menu={m} cart={cart} /></li>
                        ))}
                </ul>
                <Link to={category ? '/menu' : '/menu#kat-hazir'} className={elButton.dark}>Tüm menüyü gör <span aria-hidden="true">→</span></Link>
                <p className="sr-only" aria-live="polite">{announce}</p>
            </div>
        </section>
    );
}

function SetMenuItem({ menu, cart }: { menu: OnlineSetMenu; cart: SiteCart }) {
    const saving = savingLabel(menu);
    const found = cart.enabled ? cart.setMenuFor(menu.id) : undefined;
    const qty = cart.lines.filter(l => l.kind === 'setMenu' && l.setMenuId === menu.id).reduce((s, l) => s + l.quantity, 0);
    let action: ReactNode = null;
    if (!menu.isAvailable) action = <span className="shrink-0 text-[11px] uppercase tracking-[0.22em] text-[var(--site-muted)]">Tükendi</span>;
    else if (found?.menu.isAvailable) {
        action = found.needsChoice
            ? <Link to="/siparis" aria-label={`${menu.name}: seçerek sepete ekle`} className={cn(elButton.line, 'min-h-11 shrink-0 px-4 md:min-h-11')}>Seç</Link>
            : <EliteRoundButton qty={qty} label={`${menu.name} sepete ekle`} onClick={() => cart.addSetMenu(menu.id)} />;
    }
    return (
        <div className="flex flex-col gap-2">
            <EliteDishLine name={menu.name} size="lg" action={action}
                price={<>{saving && <s className="mr-2 text-base font-normal text-[var(--site-muted)]"><span className="sr-only">Normal fiyatı </span>{formatSitePrice(menu.regularPrice)}</s>}{formatSitePrice(menu.price)}</>} />
            <div className="text-[13px] leading-relaxed tracking-[0.03em] text-[var(--site-muted)]">
                {saving && <span className={cn(elLabel, 'mr-2 text-[10px] tracking-[0.22em] text-[var(--site-accent-text)]')}>{saving}</span>}
                <SlotsSummary menu={menu} className="inline" />
            </div>
        </div>
    );
}

// ── 5. Özel geceler ──────────────────────────────────────────────────────────────────────────────

function Occasions({ site }: { site: PublicSite }) {
    const edit = useSiteEdit();
    const showEmpty = Boolean(edit?.showEmpty);
    const c = site.site;
    const events = c.amenities.includes('ozel-gun');
    const whatsapp = c.whatsappPhone;
    const show = events && (edit ? Boolean(whatsapp) : Boolean(whatsapp || site.phone));
    if (!show) {
        if (!showEmpty) return null;
        return (
            <div className={cn(elWrap, 'py-10')}>
                {events
                    ? <EmptySlot target="contact" title="+ Özel geceler için WhatsApp numarası ekle" className="min-h-[120px]" />
                    : <EmptySlot target="amenities" title="+ “Grup ve özel gün organizasyonu” olanağını seçin (Özel geceler bölümü)" className="min-h-[120px]" />}
            </div>
        );
    }
    const photo = c.galleryImageUrls[0] || c.aboutImageUrl;
    const photoT = photo ? photoTarget(site, photo) : null;
    const maxParty = canReserveOnline(site) && site.reservation.maxPartySize > 0 ? site.reservation.maxPartySize : null;
    const waT = editTarget(edit, 'contact', 'WhatsApp');

    return (
        <section aria-labelledby="ev-ozel" className={cn('rb-el-zoom relative flex min-h-[520px] items-center overflow-hidden md:min-h-[620px]', onDark)}>
            {photo && photoT ? (
                <EditableBlock target={photoT.target} label={photoT.label} chip="Fotoğrafı değiştir" className="absolute inset-0">
                    <img src={photo} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover grayscale-[0.35]" />
                    <span aria-hidden="true" className="absolute inset-0 bg-[color-mix(in_srgb,var(--site-paper)_70%,transparent)]" />
                    {photo.includes('/shared/stock/') && <StockImageLabel className="bottom-auto right-3 top-3" />}
                </EditableBlock>
            ) : <span aria-hidden="true" className={cn('absolute inset-0', elPattern)} />}
            <div className={cn(elWrap, 'pointer-events-none relative flex max-w-[1240px] flex-wrap items-end justify-between gap-10 py-20 [&_a]:pointer-events-auto')}>
                <div className="flex max-w-[640px] flex-col gap-[22px]">
                    <EliteKicker dark>Özel geceler</EliteKicker>
                    <h2 id="ev-ozel" className={cn(elTitle, 'md:text-[clamp(44px,4.6vw,76px)] md:leading-none')}>Doğum günü, nişan,<br /><em className="italic">unutulmayacak bir akşam.</em></h2>
                    <p className="m-0 max-w-[480px] text-[17px] leading-[1.8] text-[var(--site-on-paper-sub)]">
                        {maxParty ? `Online rezervasyon ${maxParty} kişiye kadar; daha kalabalık gruplar ve özel günler için bize yazın ya da arayın.` : 'Kalabalık gruplar ve özel günler için bize yazın ya da arayın.'}
                    </p>
                </div>
                {whatsapp ? (
                    <a href={whatsappHref(whatsapp)} target="_blank" rel="noopener noreferrer" {...waT} className={cn(elButton.gold, waT.className)}>Özel etkinlik planla <span aria-hidden="true">→</span></a>
                ) : site.phone && (
                    <ExternalHint source="restaurant"><a href={telHref(site.phone)} className={elButton.gold}>Arayın · {site.phone}</a></ExternalHint>
                )}
            </div>
        </section>
    );
}

// ── 6. Yorumlar ──────────────────────────────────────────────────────────────────────────────────

function Stars({ rating }: { rating: number }) {
    const full = Math.round(rating);
    return (
        <span role="img" aria-label={`Google puanı 5 üzerinden ${formatRating(rating)}`} className="text-lg tracking-[10px] text-[var(--site-accent-text)]">
            {'★★★★★'.slice(0, full)}<span className="opacity-30">{'★★★★★'.slice(full)}</span>
        </span>
    );
}

function Reviews({ site }: { site: PublicSite }) {
    const edit = useSiteEdit();
    const showEmpty = Boolean(edit?.showEmpty);
    const win = useSiteWindow();
    const c = site.site;
    const reviews = c.featuredReviews;
    const [index, setIndex] = useState(0);
    const [paused, setPaused] = useState(false);
    const count = reviews.length;

    useEffect(() => {
        if (edit || paused || count < 2 || win.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        const id = win.setInterval(() => setIndex(i => (i + 1) % count), 6000);
        return () => win.clearInterval(id);
    }, [edit, paused, count, win]);

    const canAdd = Boolean(edit) && count < SITE_LIMITS.review.max;
    if (count === 0 && c.rating === null && !canAdd) return null;
    const current = Math.min(index, Math.max(0, count - 1));
    const go = (dir: 1 | -1) => { setPaused(true); setIndex(i => (i + dir + count) % count); };
    const arrow = 'flex h-14 w-14 items-center justify-center rounded-full border border-[color-mix(in_srgb,var(--site-text)_30%,transparent)] bg-transparent text-[var(--site-text)] transition-colors hover:border-[var(--site-text)]';
    const ratingLine = c.rating !== null ? (
        <EditableBlock target="rating" label="Google puanı">
            <span className="text-xs uppercase tracking-[0.2em] text-[var(--site-muted)]">
                Google · {formatRating(c.rating)}{c.reviewCount !== null && <> · {c.reviewCount.toLocaleString('tr-TR')} değerlendirme</>}
            </span>
        </EditableBlock>
    ) : showEmpty ? <EmptySlot target="rating" title="+ Google puanı ekle" className="min-h-[64px] w-full max-w-[320px]" /> : null;

    return (
        <section aria-labelledby="ev-yorumlar" className="bg-[var(--site-bg)] text-[var(--site-text)]">
            <div className={cn(elWrap, elSection, 'flex max-w-[1040px] flex-col items-center gap-9 text-center md:py-[140px]')}>
                <h2 id="ev-yorumlar" className="sr-only">Misafir yorumları</h2>
                {c.rating !== null && <Stars rating={c.rating} />}
                {edit ? (
                    <div className="flex w-full flex-col gap-6">
                        {reviews.map((r, i) => (
                            <ListCard key={i} list="reviews" index={i} count={count} label="Yorum" className="rounded-none">
                                <figure className="m-0 flex flex-col items-center gap-4 border-b border-[var(--site-line)] pb-6">
                                    <EditableText as="blockquote" field={`review:${i}:text`} value={r.text} multiline placeholder="Yorumun metni"
                                        className={cn(elSerif, 'm-0 text-[30px] leading-[1.25]')} />
                                    <figcaption className="flex flex-wrap justify-center gap-x-1.5 text-xs uppercase tracking-[0.3em] text-[var(--site-muted)]">
                                        <EditableText field={`review:${i}:author`} value={r.author} placeholder="Yazan" />·
                                        <EditableText field={`review:${i}:source`} value={r.source} placeholder="Kaynak" />
                                    </figcaption>
                                </figure>
                            </ListCard>
                        ))}
                        <AddCard list="reviews" label="Yorum ekle" count={count} max={SITE_LIMITS.review.max} />
                    </div>
                ) : count > 0 && (
                    <>
                        <div className="grid w-full" aria-live={paused ? 'polite' : 'off'}>
                            {reviews.map((r, i) => (
                                <figure key={i} aria-hidden={i !== current}
                                    className={cn('col-start-1 row-start-1 m-0 flex flex-col items-center justify-center transition-[opacity,transform] duration-700 motion-reduce:transition-none',
                                        i === current ? 'opacity-100' : 'pointer-events-none translate-y-3.5 opacity-0')}>
                                    <blockquote className={cn(elSerif, 'm-0 break-words text-[28px] leading-[1.25] md:text-[clamp(32px,3.4vw,50px)] md:leading-[1.22]')}>“{r.text}”</blockquote>
                                    {(r.author || r.source) && <figcaption className="mt-[26px] text-xs uppercase tracking-[0.3em] text-[var(--site-muted)]">{[r.author, r.source].filter(Boolean).join(' · ')}</figcaption>}
                                </figure>
                            ))}
                        </div>
                        {count > 1 && (
                            <div className="flex items-center gap-7">
                                <button type="button" onClick={() => go(-1)} aria-label="Önceki yorum" className={arrow}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 12H4M10 18l-6-6 6-6" /></svg>
                                </button>
                                <span aria-hidden="true" className="flex gap-2.5">
                                    {reviews.map((_, i) => <span key={i} className={cn('h-0.5 transition-all duration-300', i === current ? 'w-[34px] bg-[var(--site-text)]' : 'w-3.5 bg-[color-mix(in_srgb,var(--site-text)_25%,transparent)]')} />)}
                                </span>
                                <button type="button" onClick={() => go(1)} aria-label="Sonraki yorum" className={arrow}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 12h16M14 6l6 6-6 6" /></svg>
                                </button>
                            </div>
                        )}
                    </>
                )}
                {ratingLine}
                {!edit && c.reviewsUrl && (
                    <a href={c.reviewsUrl} target="_blank" rel="noopener noreferrer" className={cn(elTextLink, 'self-center text-[var(--site-text)]')}>Google'da tüm yorumlar</a>
                )}
            </div>
        </section>
    );
}

// ── 7. Rezervasyon ───────────────────────────────────────────────────────────────────────────────

function ReserveSection({ site }: { site: PublicSite }) {
    const c = site.site;
    const photo = c.reservationHeroUrl || c.coverImageUrl;
    return (
        <section id="rezervasyon" aria-labelledby="ev-rez" className="flex scroll-mt-24 flex-wrap bg-[var(--site-alt)] text-[var(--site-text)] md:min-h-[820px] lg:scroll-mt-28">
            <div className={cn('rb-el-zoom relative min-h-[420px] min-w-0 flex-[1_1_520px] overflow-hidden md:min-h-[520px]', onDark)}>
                {photo
                    ? <img src={photo} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
                    : <span aria-hidden="true" className={cn('absolute inset-0', elPattern)} />}
                <span aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(180deg,color-mix(in_srgb,var(--site-paper)_15%,transparent)_30%,color-mix(in_srgb,var(--site-paper)_85%,transparent)_100%)]" />
                {photo?.includes('/shared/stock/') && <StockImageLabel className="bottom-auto right-3 top-3" />}
                <div className="absolute inset-x-5 bottom-10 flex flex-col gap-[18px] sm:inset-x-10 md:inset-x-14 md:bottom-14">
                    <EliteKicker dark>Rezervasyon</EliteKicker>
                    <h2 id="ev-rez" className={cn(elTitle, 'md:text-[clamp(44px,4.4vw,72px)] md:leading-none')}>Masanız<br /><em className="italic">sizi bekliyor.</em></h2>
                    <p className="m-0 max-w-[380px] text-[15px] leading-[1.7] text-[var(--site-on-paper-sub)]">Gün, saat ve kişi sayısını seçin; bir sonraki adımda bilgilerinizi alıp talebinizi iletelim.</p>
                </div>
            </div>
            <div className="flex min-w-0 flex-[1_1_560px] flex-col justify-center px-4 py-14 sm:px-10 md:px-[72px] md:py-[88px]">
                <EliteReserve site={site} />
            </div>
        </section>
    );
}

