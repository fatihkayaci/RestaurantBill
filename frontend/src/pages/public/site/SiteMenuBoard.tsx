import type { ReactNode, Ref } from 'react';
import { Link } from 'react-router-dom';
import type { PublicProduct, PublicSite } from '@/features/customerSite/types';
import { DoorPayment, type OnlineSetMenu } from '@/features/delivery/types';
import type { SiteCart } from '@/features/delivery/useSiteCart';
import { cn } from '@/lib/utils';
import { StockImageLabel } from '../components/StockImageLabel';
import { SlotsSummary } from './SiteSetMenus';
import { productPhotos, savingLabel, setMenuImage } from './setMenuParts';
import { cardButton, sectionTitle, sectionWrap, serif, siteCardDark } from './siteParts';
import { formatSitePrice } from './siteTheme';

// Tema 2 menü panosunun parçaları (ana sayfa "Bugünün menüsü" ve /menu): satır, kategori rayı, arama kutusu, + düğmesi,
// koyu sepet paneli ve hazır menüler. + düğmeleri ve sepet yalnız online sipariş açıkken çizilir (SiteCart.enabled).

export function PlusIcon({ size = 18 }: { size?: number }) {
    return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>;
}

/** Ürün satırının sağındaki + düğmesi: yalnız online sipariş açıkken ve ürün paket menüsündeyse. Sepetteyse adet yazar. */
export function AddButton({ product, cart, onAdded, variant = 'line' }: { product: PublicProduct; cart: SiteCart; onAdded: (name: string) => void; variant?: 'line' | 'card' }) {
    if (!cart.enabled) return null;
    const delivery = cart.productFor(product.id);
    if (!delivery || delivery.isOutOfStock || product.isOutOfStock) return <span aria-hidden="true" className="w-11 shrink-0" />;
    const qty = cart.lines.filter(l => l.kind === 'product' && l.productId === product.id).reduce((s, l) => s + l.quantity, 0);
    return (
        <button type="button" onClick={() => { cart.addProduct(product.id); onAdded(product.name); }}
            aria-label={qty > 0 ? `${product.name} sepete bir tane daha ekle (sepette ${qty})` : `${product.name} sepete ekle`}
            className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-full border text-[var(--site-text)] transition-colors',
                variant === 'card' && 'h-[46px] w-[46px] border-transparent',
                qty > 0 ? 'border-[var(--site-text)] bg-[var(--site-text)] text-[var(--site-bg)]'
                    : variant === 'card' ? 'bg-[var(--site-card)] hover:border-[var(--site-text)]' : 'border-[var(--site-border-strong)] hover:border-[var(--site-text)]')}>
            {qty > 0 ? <span className="text-sm font-extrabold tabular-nums">{qty}</span> : <PlusIcon />}
        </button>
    );
}

/** Menü satırı: varsa 84 px fotoğraf, serif ad · noktalı çizgi · fiyat, altında açıklama/süre ve italik etiket. */
export function MenuRow({ product, action }: { product: PublicProduct; action?: ReactNode }) {
    const meta = [product.description?.trim(), product.prepMinutes ? `~${product.prepMinutes} dk` : null].filter(Boolean).join(' · ');
    const tag = product.isOutOfStock ? 'şu an tükendi' : product.isFeatured ? 'ustanın seçimi' : null;
    return (
        <li className="flex items-center gap-4 border-b border-[var(--site-line)] py-[18px] md:gap-[18px]">
            {product.imageUrl && (
                <span className="relative shrink-0">
                    <img src={product.imageUrl} alt={product.name} loading="lazy" className="block h-[72px] w-[72px] rounded-[14px] bg-[var(--site-placeholder)] object-cover sm:h-[84px] sm:w-[84px]" />
                    {product.isStockImage && <StockImageLabel className="bottom-1 right-1 px-1 text-[9px]" />}
                </span>
            )}
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <div className="flex items-baseline gap-3">
                    <h3 className={cn(serif, 'm-0 min-w-0 text-[23px] leading-[1.1] sm:truncate sm:text-[27px]', product.isOutOfStock && 'text-[var(--site-muted)]')}>{product.name}</h3>
                    <span aria-hidden="true" className="min-w-6 flex-1 -translate-y-1.5 border-b border-dotted border-[var(--site-border-strong)]" />
                    <span className="shrink-0 whitespace-nowrap text-[17px] font-extrabold tabular-nums sm:text-lg">{formatSitePrice(product.price)}</span>
                </div>
                {(meta || tag) && (
                    <p className="m-0 text-sm leading-snug text-[var(--site-muted)]">
                        {meta && <span className="line-clamp-2 inline">{meta}</span>}
                        {tag && <span className={cn(serif, 'text-[17px] italic', product.isOutOfStock ? 'text-[var(--site-muted)]' : 'text-[var(--site-accent-text)]')}>{meta ? ' · ' : ''}{tag}</span>}
                    </p>
                )}
            </div>
            {action}
        </li>
    );
}

/** Kategori rayı: geniş ekranda solda dikey liste, dar ekranda yatay kayan çipler. Seçili olan koyu. */
export function CategoryRail({ items, selected, onSelect, linkMode = false, label = 'Kategoriler', className, innerRef }: {
    items: { id: string; label: string; count: number }[]; selected: string | null;
    /** Düğme kipi (ana sayfa): seçilen kategori listede görünür. */
    onSelect?: (id: string) => void;
    /** Bağlantı kipi (menü sayfası): her öğe sayfadaki bölüme (#id) gider; `selected` görünen bölümdür. */
    linkMode?: boolean;
    label?: string; className?: string; innerRef?: Ref<HTMLDivElement>;
}) {
    const item = (on: boolean) => cn('flex min-h-11 shrink-0 items-center justify-between gap-3 whitespace-nowrap rounded-full border px-4 text-left text-[15px] font-bold no-underline transition-colors lg:min-h-12 lg:w-full lg:rounded-xl lg:border-0 lg:text-base',
        on ? 'border-[var(--site-text)] bg-[var(--site-text)] text-[var(--site-bg)]' : 'border-[var(--site-border-mid)] bg-transparent text-[var(--site-sub)] hover:text-[var(--site-text)] lg:hover:bg-[var(--site-alt)]');
    const Wrap = linkMode ? 'nav' : 'div';
    return (
        <Wrap role={linkMode ? undefined : 'group'} aria-label={label} ref={innerRef}
            className={cn('-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:-mx-8 sm:px-8 lg:mx-0 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:px-0', className)}>
            {items.map(t => {
                const on = t.id === selected;
                const inner = <><span>{t.label}</span><span className="text-[13px] tabular-nums opacity-70">{t.count}</span></>;
                return linkMode
                    ? <a key={t.id} href={`#${t.id}`} data-chip={t.id} aria-current={on ? 'location' : undefined} className={item(on)}>{inner}</a>
                    : <button key={t.id} type="button" aria-pressed={on} onClick={() => onSelect?.(t.id)} className={item(on)}>{inner}</button>;
            })}
        </Wrap>
    );
}

/** Menüde arama kutusu (Tema 2: ince çizgili hap). */
export function MenuSearch({ value, onChange, className }: { value: string; onChange: (v: string) => void; className?: string }) {
    return (
        <label className={cn('flex h-12 w-full items-center gap-2.5 rounded-full border border-[var(--site-border-mid)] bg-[var(--site-card)] px-[18px] focus-within:border-[var(--site-text)] sm:w-[340px]', className)}>
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--site-muted)" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
            <span className="sr-only">Menüde ara</span>
            <input type="search" value={value} onChange={e => onChange(e.target.value)} placeholder="Menüde ara…"
                className="min-w-0 flex-1 border-0 bg-transparent text-[15px] text-[var(--site-text)] outline-none placeholder:text-[var(--site-muted)]" />
        </label>
    );
}

function paymentNote(methods: number[]): string | null {
    const card = methods.includes(DoorPayment.Kart);
    const cash = methods.includes(DoorPayment.Nakit);
    if (card && cash) return 'Kapıda nakit veya kartla ödeme';
    if (cash) return 'Kapıda nakit ödeme';
    if (card) return 'Kapıda kartla ödeme';
    return null;
}

/** Koyu sepet paneli (çok geniş ekranda sağda yapışık; daha dar ekranda listenin altında ve sepet boşken gizli). */
export function CartPanel({ cart }: { cart: SiteCart }) {
    const ordering = cart.ordering!;
    const zones = ordering.zones.filter(z => z.isActive);
    const fees = [...new Set(zones.map(z => z.fee))];
    const fixedFee = fees.length === 1 ? fees[0] : null;
    const feeText = zones.length === 0 ? null : fixedFee === null ? 'Mahalleye göre' : fixedFee === 0 ? 'Ücretsiz' : formatSitePrice(fixedFee);
    const total = cart.subtotal + (fixedFee ?? 0);
    const note = paymentNote(ordering.paymentMethods);
    const closed = ordering.state !== 'open';
    return (
        <aside id="sepet" aria-labelledby="sepet-baslik"
            className={cn(siteCardDark, 'scroll-mt-24 flex-col gap-4 p-6 lg:basis-full xl:sticky xl:top-28 xl:w-[340px] xl:shrink-0 xl:basis-auto', cart.count > 0 ? 'flex' : 'hidden xl:flex')}>
            <div className="flex items-baseline justify-between gap-3">
                <h3 id="sepet-baslik" className={cn(serif, 'm-0 text-[32px] leading-none')}>Sepetiniz</h3>
                <span className="text-[13px] font-bold text-[var(--site-on-paper-sub)]">{cart.count} ürün</span>
            </div>
            {closed && ordering.message && <p className="m-0 rounded-xl bg-white/10 px-3 py-2 text-sm">{ordering.message}</p>}
            {cart.lines.length === 0 ? (
                <p className="m-0 border-t border-[var(--site-paper-line)] pt-4 text-sm text-[var(--site-on-paper-sub)]">Sepetiniz boş. Menüden + ile ekleyin.</p>
            ) : (
                <ul className="m-0 flex list-none flex-col p-0">
                    {cart.lines.map(l => (
                        <li key={l.key} className="flex items-center gap-2.5 border-t border-[var(--site-paper-line)] py-3">
                            <span className="flex h-7 min-w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--site-on-paper)] px-1.5 text-[13px] font-extrabold tabular-nums text-[var(--site-paper)]">{l.quantity}×</span>
                            <span className="min-w-0 flex-1 text-[15px] font-semibold">
                                {l.name}
                                {l.selectionNames.length > 0 && <span className="block truncate text-xs font-medium text-[var(--site-on-paper-sub)]">{l.selectionNames.join(', ')}</span>}
                            </span>
                            <span className="shrink-0 text-[15px] font-extrabold tabular-nums">{formatSitePrice(l.unitPrice * l.quantity)}</span>
                        </li>
                    ))}
                </ul>
            )}
            {cart.lines.length > 0 && (
                <>
                    <dl className="m-0 flex flex-col gap-1.5 border-t border-dashed border-[var(--site-paper-line-strong)] pt-3 text-sm">
                        <div className="flex justify-between gap-3"><dt className="text-[var(--site-on-paper-sub)]">Ara toplam</dt><dd className="m-0 font-bold tabular-nums">{formatSitePrice(cart.subtotal)}</dd></div>
                        {feeText && <div className="flex justify-between gap-3"><dt className="text-[var(--site-on-paper-sub)]">Teslimat</dt><dd className="m-0 font-bold">{feeText}</dd></div>}
                    </dl>
                    <Link to="/siparis" className={cn(cardButton.light, 'h-14 w-full justify-between self-stretch px-[22px] text-base')}>
                        <span>Siparişi tamamla</span><span className="tabular-nums">{formatSitePrice(total)}</span>
                    </Link>
                </>
            )}
            {note && <span className="text-center text-xs text-[var(--site-on-paper-sub)]">{note}</span>}
        </aside>
    );
}


function SetMenuAction({ menu, cart }: { menu: OnlineSetMenu; cart: SiteCart }) {
    if (!menu.isAvailable) return <span className="text-sm font-bold text-[var(--site-muted)]">Şu an tükendi</span>;
    if (!cart.enabled) return <Link to="/menu#menuler" className="inline-flex min-h-11 items-center text-sm font-bold underline underline-offset-4">Menüde gör →</Link>;
    const found = cart.setMenuFor(menu.id);
    if (!found || !found.menu.isAvailable) return null;
    if (found.needsChoice) {
        return <Link to="/siparis" className={cn(cardButton.accent, 'h-12 self-auto')} aria-label={`${menu.name}: seçerek sepete ekle`}>Seç ve ekle</Link>;
    }
    return (
        <button type="button" onClick={() => cart.addSetMenu(menu.id)} aria-label={`${menu.name} sepete ekle`}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--site-accent)] text-[var(--site-on-accent)] transition-opacity hover:opacity-90">
            <PlusIcon size={20} />
        </button>
    );
}

/** Hazır menüler (Tema 2): ara bant zemininde, ince çizgiyle birleşik kartlar; online sipariş açıksa + ya da "Seç ve ekle". */
export function SetMenuSection({ site, cart, menus = site.setMenus ?? [] }: { site: PublicSite; cart: SiteCart; menus?: OnlineSetMenu[] }) {
    if (menus.length === 0) return null;
    const photoOf = productPhotos(site.categories.flatMap(c => c.products));
    // Tek menü: geniş ekranda görsel solda, yazı sağda (kart bütün genişliği kaplamasın diye).
    const single = menus.length === 1;
    return (
        <section id="menuler" aria-labelledby="ev-hazir" className="border-y border-[var(--site-line)] bg-[var(--site-alt)]">
            <div className={cn(sectionWrap, 'flex flex-col gap-8 py-16 md:gap-9 md:py-[88px]')}>
                <h2 id="ev-hazir" className={cn(sectionTitle, 'md:text-[clamp(44px,5vw,72px)]')}>Hazır <em className="rb-accent italic">menüler</em></h2>
                <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,270px),1fr))] overflow-hidden rounded-[24px] border border-[var(--site-border)]">
                    {menus.map(menu => {
                        const image = setMenuImage(menu, photoOf);
                        const saving = savingLabel(menu);
                        const kicker = [saving, menu.slots.length > 0 ? `${menu.slots.length} kalem` : null].filter(Boolean).join(' · ');
                        return (
                            <article key={menu.id} className={cn('flex min-w-0 flex-col gap-5 bg-[var(--site-alt)] p-6 [box-shadow:1px_0_0_0_var(--site-border),0_1px_0_0_var(--site-border)] md:p-7',
                                single && image && 'md:flex-row md:items-stretch md:gap-8')}>
                                {image && (
                                    <span className={cn('relative block shrink-0', single && 'md:w-[44%]')}>
                                        <img src={image.url} alt="" loading="lazy" className={cn('block h-[200px] w-full rounded-[16px] object-cover md:h-[220px]', single && 'md:h-full md:min-h-[260px]')} />
                                        {image.isStock && <StockImageLabel />}
                                    </span>
                                )}
                                <div className="flex min-w-0 flex-1 flex-col gap-3.5">
                                    {kicker && <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-[var(--site-accent-text)]">{kicker}</span>}
                                    <h3 className={cn(serif, 'm-0 break-words text-[32px] leading-[1.05]')}>{menu.name}</h3>
                                    {menu.description && <p className="m-0 line-clamp-3 text-sm leading-relaxed text-[var(--site-sub)]">{menu.description}</p>}
                                    <SlotsSummary menu={menu} className="text-sm leading-relaxed text-[var(--site-sub)]" />
                                    <div className="mt-auto flex items-end justify-between gap-3 pt-3.5">
                                        <span className="flex flex-col">
                                            {saving && <s className="text-sm text-[var(--site-muted)]"><span className="sr-only">Normal fiyatı </span>{formatSitePrice(menu.regularPrice)}</s>}
                                            <span className={cn(serif, 'text-[40px] leading-none')}>{saving && <span className="sr-only">Menü fiyatı </span>}{formatSitePrice(menu.price)}</span>
                                        </span>
                                        <SetMenuAction menu={menu} cart={cart} />
                                    </div>
                                </div>
                            </article>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
