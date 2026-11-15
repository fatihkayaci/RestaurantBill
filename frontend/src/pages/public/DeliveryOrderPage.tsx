import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
    AlertCircle, ArrowLeft, Bike, ChevronRight, Clock, MapPin, Minus, Plus, Receipt, ShoppingBag, Store, Wallet,
} from 'lucide-react';
import { publicService } from '@/features/customerSite/api/publicService';
import { publicDeliveryService } from '@/features/delivery/api/publicDeliveryService';
import {
    addLine, changeQuantity, clearCart, estimatedSubtotal, itemCount, loadBranchChoice, loadCart, loadRecentOrders,
    newClientRequestId, productKey, pruneUnavailable, quantityOf, rememberOrder, saveBranchChoice, saveCart, selectionNames,
    setLineNote, setMenuKey, setMenuUnitPrice, toCartInput, type DeliveryCartLine, type RecentDeliveryOrder,
} from '@/features/delivery/deliveryCart';
import type {
    CartLineInput, DeliveryQuote, OnlineMenuProduct, OnlineOrdering, OnlineSetMenu, SubmittedDeliveryOrder,
} from '@/features/delivery/types';
import { getApiErrorMessage } from '@/lib/apiError';
import { formatPrice } from '@/lib/format';
import { cn } from '@/lib/utils';
import DeliveryMenu from './delivery/DeliveryMenu';
import DeliverySetMenuSheet from './delivery/DeliverySetMenuSheet';
import DeliveryCheckout from './delivery/DeliveryCheckout';
import Sheet from './delivery/Sheet';
import { Wordmark } from './site/SiteChrome';
import { SITE_FONTS_HREF, glass, headingFont, siteRootStyle, telHref } from './site/siteTheme';

const QUOTE_DEBOUNCE_MS = 400;

function timeOfDay(iso: string): string {
    return new Date(iso).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

// Online paket sipariş sayfası (/siparis, restoranın alan adında). Sıra: şube (birden fazlaysa) → mahalle (ücret ve en az
// tutar) → menü → sepet → teslimat bilgileri. Sepet, mahalle ve gönderim anahtarı (clientRequestId) cihazda şube başına
// saklanır; gönderim anahtarı sipariş açılana kadar değişmez, bağlantı kopunca yeniden göndermek aynı siparişi döndürür.
// Gösterilen tutarlar sunucunun teklifidir (quote); kapalı/durdurulmuş restoranda menü görünür ama sipariş gönderilmez.
export default function DeliveryOrderPage() {
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const [data, setData] = useState<OnlineOrdering | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    // ?sube=<id>: masa QR'ının "Paket servis" bağlantısı şubeyi verir; yoksa bu cihazda son seçilen şube.
    const [branchId, setBranchId] = useState<string | null>(() => params.get('sube') || loadBranchChoice());
    const [pickingBranch, setPickingBranch] = useState(false);
    const [site, setSite] = useState<{ name: string; accent?: string; cover?: string; place?: string } | null>(null);

    const [lines, setLines] = useState<DeliveryCartLine[]>([]);
    const [zoneId, setZoneId] = useState<string | null>(null);
    const [clientRequestId, setClientRequestId] = useState<string>(() => newClientRequestId());
    const [cartReady, setCartReady] = useState(false);
    const [prunedCount, setPrunedCount] = useState(0);

    const [quote, setQuote] = useState<{ key: string; value: DeliveryQuote } | null>(null);
    const [quoteError, setQuoteError] = useState<string | null>(null);
    const [quoting, setQuoting] = useState(false);
    const quoteSeq = useRef(0);

    const [cartOpen, setCartOpen] = useState(false);
    const [checkoutOpen, setCheckoutOpen] = useState(false);
    const [setMenuOpen, setSetMenuOpen] = useState<OnlineSetMenu | null>(null);
    const [recent] = useState<RecentDeliveryOrder[]>(() => loadRecentOrders());

    // ── Yükleme ──
    // Yalnızca istek sonunda state yazar; yeniden yüklemeden önce ekranı sıfırlamak çağıranın işi (resetForLoad).
    const load = useCallback((requestedBranch: string | null) => {
        publicDeliveryService.getOnlineOrdering(requestedBranch ?? undefined)
            .then(result => {
                // Kayıtlı şube artık online sipariş almıyorsa varsayılana dönülür.
                if (requestedBranch && result.branches.length > 0 && !result.branches.some(b => b.id === requestedBranch)) {
                    setBranchId(null);
                    return;
                }
                setData(result);
                setLoadError(null);
                if (requestedBranch) saveBranchChoice(result.branchId);
                const stored = loadCart(result.branchId);
                const pruned = pruneUnavailable(stored?.lines ?? [], result.categories, result.setMenus);
                setLines(pruned.lines);
                setPrunedCount(pruned.removed);
                setClientRequestId(stored?.clientRequestId ?? newClientRequestId());
                const zones = result.zones;
                setZoneId(stored?.zoneId && zones.some(z => z.id === stored.zoneId) ? stored.zoneId : zones.length === 1 ? zones[0].id : null);
                setQuote(null);
                setCartReady(true);
            })
            .catch(err => setLoadError(getApiErrorMessage(err, 'Sipariş sayfası yüklenemedi. İnternet bağlantınızı kontrol edip yenileyin.')));
        publicService.getSite(requestedBranch ?? undefined)
            .then(s => setSite({
                name: s.companyName || s.branchName,
                accent: s.site.accentColor,
                cover: s.site.coverImageUrl,
                place: [s.district, s.city].filter(Boolean).join(', '),
            }))
            .catch(() => {});
    }, []);

    useEffect(() => { load(branchId); }, [branchId, load]);

    // Birden fazla şube varken müşteri henüz seçmediyse önce şube seçilir.
    const needsBranchChoice = !!data && data.branches.length > 1 && !branchId;

    // ── Sepeti sakla ──
    useEffect(() => {
        if (!data || !cartReady) return;
        saveCart(data.branchId, { lines, zoneId, clientRequestId });
    }, [data, cartReady, lines, zoneId, clientRequestId]);

    // ── Sunucu teklifi (fiyat, ücret, en az tutar) ──
    // Notlar fiyatı değiştirmez: not yazarken teklif yeniden istenmez.
    const quoteKey = useMemo(
        () => JSON.stringify({ zoneId, lines: toCartInput(lines).map(l => ({ ...l, note: undefined })) }),
        [zoneId, lines],
    );
    const hasLines = lines.length > 0;

    useEffect(() => {
        if (!data || !hasLines) return;
        const seq = ++quoteSeq.current;
        const request = JSON.parse(quoteKey) as { zoneId: string | null; lines: CartLineInput[] };
        const timer = setTimeout(() => {
            setQuoting(true);
            publicDeliveryService.quote(data.branchId, request.zoneId, request.lines)
                .then(value => {
                    if (seq !== quoteSeq.current) return;
                    setQuote({ key: quoteKey, value });
                    setQuoteError(null);
                })
                .catch(err => {
                    if (seq !== quoteSeq.current) return;
                    setQuote(null);
                    setQuoteError(getApiErrorMessage(err, 'Sepet tutarı hesaplanamadı. Bağlantınızı kontrol edin.'));
                })
                .finally(() => { if (seq === quoteSeq.current) setQuoting(false); });
        }, QUOTE_DEBOUNCE_MS);
        return () => clearTimeout(timer);
    }, [data, quoteKey, hasLines]);

    const currentQuote = quote && quote.key === quoteKey && lines.length > 0 ? quote.value : null;

    // ── Sepet işlemleri ──
    const addProduct = (product: OnlineMenuProduct) => {
        if (product.isOutOfStock) return;
        setLines(prev => addLine(prev, {
            key: productKey(product.id), kind: 'product', productId: product.id, name: product.name, unitPrice: product.price,
            note: '', selections: {}, selectionNames: [],
        }));
    };
    const removeProduct = (product: OnlineMenuProduct) => setLines(prev => changeQuantity(prev, productKey(product.id), -1));
    const addSetMenu = (menu: OnlineSetMenu, selections: Record<string, string>, quantity: number, note: string) => {
        const key = setMenuKey(menu.id, selections) + (note ? `:${note}` : '');
        setLines(prev => addLine(prev, {
            key, kind: 'setMenu', setMenuId: menu.id, name: menu.name, unitPrice: setMenuUnitPrice(menu, selections),
            note, selections, selectionNames: selectionNames(menu, selections),
        }, quantity));
        setSetMenuOpen(null);
    };

    const onSubmitted = (result: SubmittedDeliveryOrder) => {
        if (!data) return;
        rememberOrder({ token: result.token, number: result.number, createdAt: new Date().toISOString() });
        clearCart(data.branchId);
        setLines([]);
        setClientRequestId(newClientRequestId());
        setCheckoutOpen(false);
        setCartOpen(false);
        navigate(`/siparis/takip/${encodeURIComponent(result.token)}`);
    };

    const resetForLoad = () => {
        setData(null);
        setLoadError(null);
        setCartReady(false);
    };

    const chooseBranch = (id: string) => {
        saveBranchChoice(id);
        setPickingBranch(false);
        setCartOpen(false);
        if (id === branchId) return;
        resetForLoad();
        setBranchId(id);
    };


    // ── Görünüm ──
    const root = (children: ReactNode) => (
        <div style={siteRootStyle(site?.accent)} className="min-h-screen bg-[var(--site-bg)]">
            <link rel="stylesheet" href={SITE_FONTS_HREF} precedence="default" />
            {children}
        </div>
    );

    if (loadError) {
        return root(
            <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--site-error-bg)] text-[var(--site-error)]">
                    <AlertCircle className="h-7 w-7" aria-hidden="true" />
                </span>
                <h1 className={cn(headingFont, 'mt-5 text-3xl font-bold')}>Sipariş sayfası açılamadı</h1>
                <p className="mt-2 max-w-sm text-base text-[var(--site-sub)]">{loadError}</p>
                <button type="button" onClick={() => { resetForLoad(); load(branchId); }} className="mt-6 h-12 rounded-full bg-[var(--site-paper)] px-6 font-semibold text-[var(--site-on-paper)] transition-opacity hover:opacity-90">Tekrar dene</button>
                <Link to="/" className="mt-3 flex h-11 items-center text-sm font-semibold text-[var(--site-sub)] underline">Ana sayfa</Link>
            </main>
        );
    }

    if (!data) {
        return root(<LoadingSkeleton />);
    }

    const restaurant = site?.name || data.branchName;
    const multiBranch = data.branches.length > 1;

    if (needsBranchChoice || pickingBranch) {
        return root(
            <main className="min-h-screen pb-12">
                <Hero restaurant={restaurant} cover={site?.cover} subtitle={site?.place ?? ''} />
                <div className="relative mx-auto -mt-6 max-w-xl px-4">
                    <div className="rounded-[22px] border border-[var(--site-border)] bg-[var(--site-card)] p-4 shadow-[0_12px_32px_-16px_rgba(0,0,0,0.25)] md:p-5">
                        <h2 className={cn(headingFont, 'text-2xl font-bold')}>Hangi şubeden sipariş vermek istersiniz?</h2>
                        <ul className="mt-4 flex flex-col gap-2.5">
                            {data.branches.map(b => (
                                <li key={b.id}>
                                    <button type="button" onClick={() => chooseBranch(b.id)}
                                        className={cn('flex min-h-16 w-full items-center gap-3 rounded-2xl border px-4 text-left transition-colors hover:border-[var(--site-accent)]',
                                            b.id === data.branchId && !needsBranchChoice ? 'border-[var(--site-accent)] bg-[var(--site-raised)]' : 'border-[var(--site-border-strong)]')}>
                                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--site-raised)]">
                                            <Store className="h-5 w-5 text-[var(--site-text)]" aria-hidden="true" />
                                        </span>
                                        <span className="min-w-0 flex-1">
                                            <span className="block text-base font-semibold">{b.name}</span>
                                            {b.district && <span className="block text-sm text-[var(--site-sub)]">{b.district}</span>}
                                        </span>
                                        <ChevronRight className="h-5 w-5 shrink-0 text-[var(--site-sub)]" aria-hidden="true" />
                                    </button>
                                </li>
                            ))}
                        </ul>
                        {pickingBranch && (
                            <button type="button" onClick={() => setPickingBranch(false)} className="mt-3 h-11 text-sm font-semibold text-[var(--site-sub)] underline">Vazgeç</button>
                        )}
                    </div>
                </div>
            </main>
        );
    }

    const open = data.state === 'open';
    const zone = data.zones.find(z => z.id === zoneId) ?? null;
    const count = itemCount(lines);
    const estimate = estimatedSubtotal(lines);
    const subtotal = currentQuote?.subtotal ?? estimate;
    const fee = currentQuote?.deliveryFee ?? zone?.fee ?? 0;
    const total = currentQuote?.total ?? subtotal + fee;
    const amountToMinimum = currentQuote ? currentQuote.amountToMinimum : zone ? Math.max(0, zone.minOrderAmount - estimate) : 0;
    const canCheckout = open && !!zone && !!currentQuote && currentQuote.meetsMinimum && !quoteError;

    const checkoutHint = !open ? 'Restoran şu an sipariş almıyor.'
        : !zone ? 'Devam etmek için teslimat mahallenizi seçin.'
            : amountToMinimum > 0 ? `Minimum sepet tutarına ${formatPrice(amountToMinimum)} ₺ kaldı.`
                : quoteError ?? (quoting || !currentQuote ? 'Tutar hesaplanıyor…' : null);

    const goToCheckout = () => { setCartOpen(false); setCheckoutOpen(true); };
    const cartLines = (
        <CartLines lines={lines} quote={currentQuote}
            onChange={(key, delta) => setLines(prev => changeQuantity(prev, key, delta))}
            onNote={(key, note) => setLines(prev => setLineNote(prev, key, note))} />
    );
    const cartTotals = (
        <CartTotals subtotal={subtotal} fee={fee} total={total} zoneName={zone?.name ?? null}
            hint={checkoutHint} hintIsError={!!quoteError} canCheckout={canCheckout} onCheckout={goToCheckout} />
    );

    // Başlıktaki bilgi çipleri: durum, bugünün son sipariş saati, seçili mahallenin ücreti / en az tutarı / süresi.
    // Mahalle seçilmeden süre aralığı gösterilir.
    const etas = data.zones.map(z => z.estimatedMinutes).filter(m => m > 0);
    const etaRange = etas.length === 0 ? null
        : Math.min(...etas) === Math.max(...etas) ? `~${Math.min(...etas)} dk` : `${Math.min(...etas)}–${Math.max(...etas)} dk`;
    const chips: { icon: ReactNode; text: string }[] = [];
    if (open && data.lastOrderAt) chips.push({ icon: <Clock className="h-3.5 w-3.5" aria-hidden="true" />, text: `Son sipariş ${timeOfDay(data.lastOrderAt)}` });
    if (zone) {
        chips.push({ icon: <Bike className="h-3.5 w-3.5" aria-hidden="true" />, text: zone.fee > 0 ? `Teslimat ${formatPrice(zone.fee)} ₺` : 'Teslimat ücretsiz' });
        if (zone.minOrderAmount > 0) chips.push({ icon: <Wallet className="h-3.5 w-3.5" aria-hidden="true" />, text: `En az ${formatPrice(zone.minOrderAmount)} ₺` });
        if (zone.estimatedMinutes > 0) chips.push({ icon: <Clock className="h-3.5 w-3.5" aria-hidden="true" />, text: `~${zone.estimatedMinutes} dk` });
    } else if (etaRange && data.state !== 'disabled') {
        chips.push({ icon: <Clock className="h-3.5 w-3.5" aria-hidden="true" />, text: etaRange });
    }

    return root(
        <main className={cn('min-h-screen lg:pb-16', count > 0 ? 'pb-40' : 'pb-12')}>
            <Hero
                restaurant={restaurant}
                cover={site?.cover}
                subtitle={[multiBranch ? data.branchName : null, site?.place].filter(Boolean).join(' · ')}
                action={multiBranch ? (
                    <button type="button" onClick={() => setPickingBranch(true)}
                        className={cn(glass, 'flex h-11 items-center gap-1.5 rounded-full px-4 text-sm font-semibold text-white transition-colors hover:bg-white/25')}>
                        <Store className="h-4 w-4" aria-hidden="true" />Şube değiştir
                    </button>
                ) : null}
            >
                <ul className="mt-5 flex flex-wrap gap-2" aria-label="Sipariş bilgileri">
                    <li><StatusChip state={data.state} /></li>
                    {chips.map(chip => (
                        <li key={chip.text} className={cn(glass, 'flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold text-white')}>
                            {chip.icon}{chip.text}
                        </li>
                    ))}
                </ul>
            </Hero>

            <div className="relative mx-auto -mt-6 max-w-6xl px-4 md:px-6 lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-8">
                <div className="min-w-0">
                    <div className="flex flex-col gap-3">
                        {data.state !== 'disabled' && (
                            <section aria-label="Teslimat mahallesi"
                                className="rounded-[22px] border border-[var(--site-border)] bg-[var(--site-card)] p-4 shadow-[0_12px_32px_-16px_rgba(0,0,0,0.25)]">
                                <label htmlFor="mahalle" className="flex items-center gap-2 text-sm font-semibold">
                                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--site-raised)]">
                                        <MapPin className="h-4 w-4 text-[var(--site-accent)]" aria-hidden="true" />
                                    </span>
                                    Nereye gelsin?
                                </label>
                                {data.zones.length === 0 ? (
                                    <p className="mt-2 text-sm text-[var(--site-sub)]">Restoran henüz teslimat bölgesi tanımlamadı.</p>
                                ) : (
                                    <>
                                        <select
                                            id="mahalle"
                                            value={zoneId ?? ''}
                                            onChange={e => setZoneId(e.target.value || null)}
                                            className="mt-2 h-12 w-full rounded-xl border border-[var(--site-border-strong)] bg-[var(--site-bg)] px-3 text-[15px] font-medium focus:outline-none focus:ring-2 focus:ring-[var(--site-accent)]"
                                        >
                                            <option value="">Mahallenizi seçin</option>
                                            {data.zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                                        </select>
                                        <p className="mt-2 text-sm text-[var(--site-sub)]">
                                            {zone
                                                ? `${zone.name} için teslimat ${zone.fee > 0 ? `${formatPrice(zone.fee)} ₺` : 'ücretsiz'}${zone.minOrderAmount > 0 ? `, en az sepet ${formatPrice(zone.minOrderAmount)} ₺` : ''}.`
                                                : 'Listede olmayan mahalleye teslimat yapılmıyor.'}
                                        </p>
                                    </>
                                )}
                            </section>
                        )}

                        {!open && <StateBanner data={data} />}

                        {prunedCount > 0 && (
                            <p role="status" className="rounded-2xl bg-[var(--site-raised)] px-4 py-3 text-sm">
                                Sepetinizdeki {prunedCount} ürün artık sipariş verilemediği için çıkarıldı.
                            </p>
                        )}

                        {recent.length > 0 && (
                            <nav aria-label="Son siparişleriniz" className="flex items-center gap-2 overflow-x-auto rounded-2xl bg-[var(--site-raised)] px-3 py-2.5 text-sm [scrollbar-width:none]">
                                <Receipt className="h-4 w-4 shrink-0 text-[var(--site-sub)]" aria-hidden="true" />
                                <span className="shrink-0 font-medium text-[var(--site-sub)]">Siparişleriniz:</span>
                                {recent.map(o => (
                                    <Link key={o.token} to={`/siparis/takip/${encodeURIComponent(o.token)}`}
                                        className="flex h-9 shrink-0 items-center rounded-full border border-[var(--site-border-strong)] bg-[var(--site-card)] px-3 font-semibold text-[var(--site-text)] no-underline hover:border-[var(--site-accent)]">
                                        #{o.number} takip →
                                    </Link>
                                ))}
                            </nav>
                        )}
                    </div>

                    {data.state !== 'disabled' && (
                        <DeliveryMenu
                            categories={data.categories}
                            setMenus={data.setMenus}
                            restaurant={restaurant}
                            productQuantity={id => quantityOf(lines, l => l.productId === id && l.kind === 'product')}
                            setMenuQuantity={id => quantityOf(lines, l => l.setMenuId === id)}
                            onAddProduct={addProduct}
                            onRemoveProduct={removeProduct}
                            onOpenSetMenu={setSetMenuOpen}
                        />
                    )}
                </div>

                {/* Masaüstü: sağda yapışkan sepet. Telefonda yerine alttaki sepet çubuğu ve pencere. */}
                {data.state !== 'disabled' && (
                    <aside aria-label="Sepetiniz" className="sticky top-4 mt-0 hidden max-h-[calc(100dvh-2rem)] flex-col overflow-hidden rounded-[22px] border border-[var(--site-border)] bg-[var(--site-card)] shadow-[0_12px_32px_-16px_rgba(0,0,0,0.25)] lg:flex">
                        <div className="flex items-center justify-between gap-3 border-b border-[var(--site-border)] px-5 py-4">
                            <h2 className={cn(headingFont, 'text-2xl font-bold')}>Sepetiniz</h2>
                            {count > 0 && <span className="rounded-full bg-[var(--site-raised)] px-2.5 py-1 text-sm font-semibold tabular-nums">{count} ürün</span>}
                        </div>
                        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-2">
                            {lines.length === 0 ? <EmptyCart /> : cartLines}
                        </div>
                        {lines.length > 0 && <div className="border-t border-[var(--site-border)] p-4">{cartTotals}</div>}
                    </aside>
                )}
            </div>

            {count > 0 && (
                <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--site-border)] bg-[rgba(255,255,255,0.95)] px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-[14px] lg:hidden">
                    <div className="mx-auto max-w-3xl">
                        {checkoutHint && <p className="mb-2 text-center text-[13px] font-medium text-[var(--site-muted)]">{checkoutHint}</p>}
                        <button type="button" onClick={() => setCartOpen(true)}
                            className="flex h-14 w-full items-center justify-between gap-3 rounded-full bg-[var(--site-accent)] pl-2 pr-6 text-[var(--site-on-accent)] shadow-[0_10px_24px_-10px_rgba(0,0,0,0.45)] transition-opacity hover:opacity-90">
                            <span className="flex items-center gap-3 text-base font-semibold">
                                <span className="flex h-10 min-w-10 items-center justify-center rounded-full bg-white/20 px-2 text-base font-bold tabular-nums">{count}</span>
                                Sepete git
                            </span>
                            <span className={cn(headingFont, 'text-lg font-bold tabular-nums')}>{formatPrice(total)} ₺</span>
                        </button>
                    </div>
                </div>
            )}

            {cartOpen && (
                <Sheet title="Sepetiniz" onClose={() => setCartOpen(false)} footer={cartTotals}>
                    {lines.length === 0 ? <EmptyCart /> : cartLines}
                </Sheet>
            )}

            {checkoutOpen && zone && currentQuote && (
                <DeliveryCheckout
                    data={data}
                    zone={zone}
                    lines={lines}
                    quote={currentQuote}
                    clientRequestId={clientRequestId}
                    onQuoteChanged={value => setQuote({ key: quoteKey, value })}
                    onSubmitted={onSubmitted}
                    onClose={() => setCheckoutOpen(false)}
                />
            )}

            {setMenuOpen && (
                <DeliverySetMenuSheet
                    menu={setMenuOpen}
                    restaurant={restaurant}
                    onClose={() => setSetMenuOpen(null)}
                    onAdd={(selections, quantity, note) => addSetMenu(setMenuOpen, selections, quantity, note)}
                />
            )}
        </main>
    );
}

/** Sayfanın başı: kapak fotoğrafı (yoksa sitenin koyu zemini), geri bağlantısı, restoran adı ve bilgi çipleri. */
function Hero({ restaurant, subtitle, cover, action, children }: {
    restaurant: string; subtitle: string; cover?: string; action?: ReactNode; children?: ReactNode;
}) {
    return (
        <header className="relative overflow-hidden bg-[var(--site-ink)] text-white">
            {cover && <img src={cover} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover" />}
            {cover && <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-b from-[rgba(17,17,17,0.55)] via-[rgba(17,17,17,0.6)] to-[rgba(17,17,17,0.85)]" />}
            <div className="relative mx-auto max-w-6xl px-4 pb-12 pt-4 md:px-6 md:pb-16 md:pt-6">
                <div className="flex items-center justify-between gap-3">
                    <Link to="/" aria-label="Restoranın ana sayfası"
                        className={cn(glass, 'flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white transition-colors hover:bg-white/25')}>
                        <ArrowLeft className="h-5 w-5" aria-hidden="true" />
                    </Link>
                    {action}
                </div>
                <p className="mt-6 flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.14em] text-white/75 md:mt-10">
                    <ShoppingBag className="h-3.5 w-3.5" aria-hidden="true" />Paket sipariş
                </p>
                <h1 className="mt-1.5 text-[40px] font-bold leading-[0.95] tracking-[-0.05em] md:text-[64px]">
                    <Wordmark name={restaurant} className="font-bold" />
                </h1>
                {subtitle && <p className="mt-2 text-base text-white/85">{subtitle}</p>}
                {children}
            </div>
        </header>
    );
}

const STATE_CHIP: Record<OnlineOrdering['state'], { text: string; dot: string }> = {
    open: { text: 'Sipariş alıyoruz', dot: 'bg-[#4ADE80]' },
    paused: { text: 'Siparişe ara verdik', dot: 'bg-[#FBBF24]' },
    closed: { text: 'Şu an kapalı', dot: 'bg-[#F87171]' },
    disabled: { text: 'Online sipariş kapalı', dot: 'bg-[#F87171]' },
};

function StatusChip({ state }: { state: OnlineOrdering['state'] }) {
    const chip = STATE_CHIP[state];
    return (
        <span className="flex h-8 items-center gap-2 rounded-full bg-white px-3 text-[13px] font-bold text-[#111111]">
            <span aria-hidden="true" className={cn('h-2 w-2 rounded-full', chip.dot, state === 'open' && 'shadow-[0_0_0_3px_rgba(74,222,128,0.3)]')} />
            {chip.text}
        </span>
    );
}

function EmptyCart() {
    return (
        <div className="flex flex-col items-center py-10 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--site-raised)] text-[var(--site-sub)]">
                <ShoppingBag className="h-6 w-6" aria-hidden="true" />
            </span>
            <p className="mt-3 text-base font-semibold">Sepetiniz boş</p>
            <p className="mt-0.5 text-sm text-[var(--site-sub)]">Menüden beğendiklerinizi ekleyin.</p>
        </div>
    );
}

function CartLines({ lines, quote, onChange, onNote }: {
    lines: DeliveryCartLine[];
    quote: DeliveryQuote | null;
    onChange: (key: string, delta: number) => void;
    onNote: (key: string, note: string) => void;
}) {
    return (
        <ul className="divide-y divide-[var(--site-border)]">
            {lines.map((line, i) => {
                const quoted = quote && quote.lines.length === lines.length ? quote.lines[i] : null;
                return (
                    <li key={line.key} className="py-3">
                        <div className="flex items-center gap-3">
                            <div className="min-w-0 flex-1">
                                <p className="text-[15px] font-semibold leading-snug">{line.name}</p>
                                {line.selectionNames.length > 0 && <p className="text-sm text-[var(--site-sub)]">{line.selectionNames.join(', ')}</p>}
                                <p className="text-sm font-semibold tabular-nums">{formatPrice(quoted?.lineTotal ?? line.unitPrice * line.quantity)} ₺</p>
                            </div>
                            <div className="flex shrink-0 items-center gap-1 rounded-full bg-[var(--site-raised)] p-0.5">
                                <button type="button" onClick={() => onChange(line.key, -1)} aria-label={`${line.name} bir azalt`}
                                    className="flex h-11 w-11 items-center justify-center rounded-full"><Minus className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" /></button>
                                <span className="min-w-5 text-center text-base font-bold tabular-nums">{line.quantity}</span>
                                <button type="button" onClick={() => onChange(line.key, 1)} aria-label={`${line.name} bir artır`}
                                    className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--site-accent)] text-[var(--site-on-accent)]"><Plus className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" /></button>
                            </div>
                        </div>
                        {line.kind === 'product' && (
                            <input
                                value={line.note}
                                onChange={e => onNote(line.key, e.target.value)}
                                maxLength={300}
                                placeholder="Not ekle (ör. acısız)"
                                aria-label={`${line.name} için not`}
                                className="mt-2 h-11 w-full rounded-xl border border-[var(--site-border-strong)] bg-[var(--site-bg)] px-3 text-[15px] focus:outline-none focus:ring-2 focus:ring-[var(--site-accent)]"
                            />
                        )}
                        {line.kind === 'setMenu' && line.note && <p className="mt-1 text-sm text-[var(--site-sub)]">Not: {line.note}</p>}
                    </li>
                );
            })}
        </ul>
    );
}

function CartTotals({ subtotal, fee, total, zoneName, hint, hintIsError, canCheckout, onCheckout }: {
    subtotal: number; fee: number; total: number; zoneName: string | null;
    hint: string | null; hintIsError: boolean; canCheckout: boolean; onCheckout: () => void;
}) {
    return (
        <>
            <dl className="mb-3 space-y-1 text-[15px]">
                <div className="flex justify-between"><dt className="text-[var(--site-sub)]">Ara toplam</dt><dd className="tabular-nums">{formatPrice(subtotal)} ₺</dd></div>
                <div className="flex justify-between"><dt className="text-[var(--site-sub)]">Teslimat{zoneName ? ` (${zoneName})` : ''}</dt><dd className="tabular-nums">{zoneName ? `${formatPrice(fee)} ₺` : '—'}</dd></div>
                <div className={cn(headingFont, 'flex justify-between pt-1 text-xl font-bold')}><dt>Toplam</dt><dd className="tabular-nums">{formatPrice(total)} ₺</dd></div>
            </dl>
            {hint && (
                <p className={cn('mb-3 rounded-xl px-3 py-2.5 text-sm font-medium',
                    hintIsError ? 'border border-[var(--site-error-line)] bg-[var(--site-error-bg)] text-[var(--site-error)]' : 'bg-[var(--site-raised)]')}>
                    {hint}
                </p>
            )}
            <button type="button" disabled={!canCheckout} onClick={onCheckout}
                className="flex h-14 w-full items-center justify-center rounded-full bg-[var(--site-accent)] text-base font-semibold text-[var(--site-on-accent)] transition-opacity hover:opacity-90 disabled:opacity-50">
                Devam et
            </button>
        </>
    );
}

/** Yüklenirken sayfanın iskeleti: başlık, mahalle kutusu, kategori şeridi ve ürün kartları (masaüstünde sepet). */
function LoadingSkeleton() {
    const block = 'animate-pulse rounded-2xl bg-[var(--site-raised)]';
    return (
        <main className="min-h-screen pb-12" aria-busy="true" aria-label="Sipariş sayfası yükleniyor">
            <div className="bg-[var(--site-ink)]">
                <div className="mx-auto max-w-6xl px-4 pb-12 pt-4 md:px-6 md:pb-16 md:pt-6">
                    <div className="h-11 w-11 animate-pulse rounded-full bg-white/15" />
                    <div className="mt-6 h-3 w-24 animate-pulse rounded bg-white/15 md:mt-10" />
                    <div className="mt-3 h-10 w-64 max-w-full animate-pulse rounded-xl bg-white/15 md:h-14 md:w-96" />
                    <div className="mt-5 flex gap-2">
                        {[120, 96, 80].map(w => <div key={w} style={{ width: w }} className="h-8 animate-pulse rounded-full bg-white/15" />)}
                    </div>
                </div>
            </div>
            <div className="relative mx-auto -mt-6 max-w-6xl px-4 md:px-6 lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-8">
                <div>
                    <div className="h-[118px] rounded-[22px] border border-[var(--site-border)] bg-[var(--site-card)] p-4">
                        <div className={cn(block, 'h-5 w-32')} />
                        <div className={cn(block, 'mt-3 h-12 rounded-xl')} />
                    </div>
                    <div className="mt-4 flex gap-2 overflow-hidden">
                        {[88, 112, 76, 104, 92].map(w => <div key={w} style={{ width: w }} className="h-10 shrink-0 animate-pulse rounded-full bg-[var(--site-raised)]" />)}
                    </div>
                    <div className={cn(block, 'mt-7 h-7 w-40')} />
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="flex gap-3 rounded-[22px] border border-[var(--site-border)] p-3">
                                <div className="flex flex-1 flex-col gap-2">
                                    <div className={cn(block, 'h-4 w-3/4 rounded-md')} />
                                    <div className={cn(block, 'h-3 w-full rounded-md')} />
                                    <div className={cn(block, 'h-3 w-2/3 rounded-md')} />
                                    <div className={cn(block, 'mt-auto h-5 w-16 rounded-md')} />
                                </div>
                                <div className={cn(block, 'h-[104px] w-[104px] shrink-0 md:h-28 md:w-28')} />
                            </div>
                        ))}
                    </div>
                </div>
                <div className={cn(block, 'hidden h-72 rounded-[22px] lg:block')} />
            </div>
        </main>
    );
}

/** Kapalı / durdurulmuş / online sipariş almıyor. Mesaj sunucudan gelir ve şubenin yerel saatiyle yazılmıştır. */
function StateBanner({ data }: { data: OnlineOrdering }) {
    const title = data.state === 'paused' ? 'Şu an sipariş alamıyoruz'
        : data.state === 'closed' ? 'Şu an kapalıyız'
            : 'Online sipariş kapalı';
    return (
        <div role="status" className="flex gap-3 rounded-2xl border border-[var(--site-error-line)] bg-[var(--site-error-bg)] px-4 py-3 text-[var(--site-error)]">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <div className="min-w-0">
                <p className="font-semibold">{title}</p>
                {data.message && <p className="mt-0.5 text-sm">{data.message}</p>}
                {data.state !== 'disabled' && <p className="mt-0.5 text-sm">Menüye göz atabilirsiniz; sipariş açılınca sepetiniz burada bekler.</p>}
                {data.restaurantPhone && (
                    <p className="mt-1 text-sm">Telefonla sipariş: <a className="font-semibold underline" href={telHref(data.restaurantPhone)}>{data.restaurantPhone}</a></p>
                )}
            </div>
        </div>
    );
}
