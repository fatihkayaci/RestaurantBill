import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
    AlertCircle, ArrowLeft, Bike, ChevronRight, Clock, MapPin, Minus, Phone, Plus, Receipt, Search, ShoppingBag, Store, Wallet,
} from 'lucide-react';
import { publicService } from '@/features/customerSite/api/publicService';
import { publicDeliveryService } from '@/features/delivery/api/publicDeliveryService';
import {
    addLine, changeQuantity, clearCart, estimatedSubtotal, itemCount, loadBranchChoice, loadCart, loadOrderSnapshot, loadRecentOrders,
    newClientRequestId, productKey, pruneUnavailable, quantityOf, rememberOrder, saveBranchChoice, saveCart, saveOrderSnapshot,
    selectionNames, setLineNote, setMenuKey, setMenuUnitPrice, toCartInput, type DeliveryCartLine, type OrderSnapshot,
    type RecentDeliveryOrder,
} from '@/features/delivery/deliveryCart';
import type {
    CartLineInput, DeliveryQuote, DeliveryZone, OnlineMenuProduct, OnlineOrdering, OnlineSetMenu, SubmittedDeliveryOrder,
} from '@/features/delivery/types';
import { getApiErrorMessage } from '@/lib/apiError';
import { formatPrice } from '@/lib/format';
import { cn } from '@/lib/utils';
import DeliveryMenu from './delivery/DeliveryMenu';
import DeliverySetMenuSheet from './delivery/DeliverySetMenuSheet';
import DeliveryCheckout from './delivery/DeliveryCheckout';
import Sheet from './delivery/Sheet';
import { customerFontsHref, customerRootStyle } from './customerTheme';
import type { PublicSite } from '@/features/customerSite/types';
import { GlassStatusPill } from './site/SiteCards';
import { FlowSiteHeader } from './site/SiteFrame';
import { serif, siteCardDark } from './site/siteParts';
import { headingFont, resolveDesign, telHref } from './site/siteTheme';
import { EliteFlowStyle } from './site/elite/EliteFlowStyle';
import { normalizeSite } from './site/useSite';

const QUOTE_DEBOUNCE_MS = 400;

/** Sağdaki zeytin "Sepetiniz" özeti: içindeki ortak parçalar (satırlar, toplamlar) krem yazıyla okunsun diye yerel renkler. */
const summaryTone = '[--site-text:#FBF4E8] [--site-sub:#D4CBB6] [--site-muted:#D4CBB6] [--site-border:rgba(243,231,211,0.15)] [--site-border-strong:rgba(243,231,211,0.3)] [--site-raised:rgba(243,231,211,0.1)] [--site-bg:rgba(243,231,211,0.1)] [--site-qty-bg:rgba(243,231,211,0.12)] [--site-qty-minus:#FBF4E8] [--site-qty-plus:var(--site-mustard)] [--site-qty-plus-text:#24180F]';

function timeOfDay(iso: string): string {
    return new Date(iso).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

/** "Bugün 11:00", "Yarın 08:00", "Cuma 11:00" (tarayıcının saatiyle; şube ile aynı saat diliminde kabul edilir). */
function opensText(iso: string): string {
    const at = new Date(iso);
    const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const days = Math.round((startOf(at) - startOf(new Date())) / 86_400_000);
    const day = days <= 0 ? 'Bugün' : days === 1 ? 'Yarın' : at.toLocaleDateString('tr-TR', { weekday: 'long' });
    return `${day} ${timeOfDay(iso)}`;
}

/** Arama için: küçük harf, aksanlar ve Türkçe harfler sadeleşir ("Kadıköy" → "kadikoy"). */
function fold(text: string): string {
    return text.toLocaleLowerCase('tr-TR').replace(/ı/g, 'i').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

const MENU_ANCHOR = 'paket-menu';

// Online paket sipariş sayfası (/siparis, restoranın alan adında). Sıra: şube (birden fazlaysa) → mahalle (ücret ve en az
// tutar) → menü → sepet → teslimat bilgileri. Sepet, mahalle ve gönderim anahtarı (clientRequestId) cihazda şube başına
// saklanır; gönderim anahtarı sipariş açılana kadar değişmez, bağlantı kopunca yeniden göndermek aynı siparişi döndürür.
// Gösterilen tutarlar sunucunun teklifidir (quote); kapalı/durdurulmuş restoranda menü görünür ama sipariş gönderilmez.
export default function DeliveryOrderPage() {
    const navigate = useNavigate();
    const [params, setParams] = useSearchParams();
    // ?tekrar=<takip anahtarı>: "Tekrar sipariş ver" / "Sepete dön". Gönderilen sepetin kopyası bir kez yüklenir.
    const [reorderSnapshot] = useState<OrderSnapshot | null>(() => {
        const token = params.get('tekrar');
        return token ? loadOrderSnapshot(token) : null;
    });
    const reorder = useRef<OrderSnapshot | null>(reorderSnapshot);
    const [data, setData] = useState<OnlineOrdering | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    // ?sube=<id>: masa QR'ının "Paket servis" bağlantısı şubeyi verir; yoksa bu cihazda son seçilen şube.
    const [branchId, setBranchId] = useState<string | null>(() => params.get('sube') || reorderSnapshot?.branchId || loadBranchChoice());
    const [pickingBranch, setPickingBranch] = useState(false);
    // Sitenin bilgisi: üst menü (FlowSiteHeader), tema, kapak. Alınamazsa menü yerine kapakta geri bağlantısı çizilir.
    const [siteData, setSiteData] = useState<PublicSite | null>(null);
    const [siteFailed, setSiteFailed] = useState(false);
    // Sade tasarımda menü kutusu beyaz: sağdaki sepet özeti krem yazılı zeytin kutu değil, beyaz kutu olur.
    const sadeDesign = resolveDesign(siteData?.site.design) === 'sade';
    const site = siteData && {
        name: siteData.companyName || siteData.branchName,
        accent: siteData.site.accentColor,
        theme: siteData.site.theme,
        design: siteData.site.design,
        font: siteData.site.font,
        cover: siteData.site.coverImageUrl,
        place: [siteData.district, siteData.city].filter(Boolean).join(', '),
    };

    const [lines, setLines] = useState<DeliveryCartLine[]>([]);
    const [zoneId, setZoneId] = useState<string | null>(null);
    const [clientRequestId, setClientRequestId] = useState<string>(() => newClientRequestId());
    const [cartReady, setCartReady] = useState(false);
    const [prunedNames, setPrunedNames] = useState<string[]>([]);
    const [zonePickerOpen, setZonePickerOpen] = useState(false);

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
                // Tekrar sipariş: gönderilmiş sepetin kopyası mevcut sepete eklenir (sepet boşsa onun yerine geçer).
                const snapshot = reorder.current && reorder.current.branchId === result.branchId ? reorder.current : null;
                reorder.current = null;
                let source = stored?.lines ?? [];
                if (snapshot) for (const line of snapshot.lines) source = addLine(source, line, line.quantity);
                const pruned = pruneUnavailable(source, result.categories, result.setMenus);
                const kept = new Set(pruned.lines.map(l => l.key));
                setLines(pruned.lines);
                setPrunedNames([...new Set(source.filter(l => !kept.has(l.key)).map(l => l.name))]);
                setClientRequestId(stored?.clientRequestId ?? newClientRequestId());
                const zones = result.zones;
                const preferred = snapshot?.zoneId ?? stored?.zoneId;
                setZoneId(preferred && zones.some(z => z.id === preferred) ? preferred : zones.length === 1 ? zones[0].id : null);
                setQuote(null);
                setCartReady(true);
            })
            .catch(err => setLoadError(getApiErrorMessage(err, 'Sipariş sayfası yüklenemedi. İnternet bağlantınızı kontrol edip yenileyin.')));
        publicService.getSite(requestedBranch ?? undefined)
            .then(s => { setSiteData(normalizeSite(s)); setSiteFailed(false); })
            .catch(() => setSiteFailed(true));
    }, []);

    useEffect(() => { load(branchId); }, [branchId, load]);

    // ?tekrar yalnız bir kez işlenir; adres çubuğundan kaldırılır (yenileyince sepet ikinci kez eklenmesin).
    useEffect(() => {
        if (!cartReady || !params.has('tekrar')) return;
        const next = new URLSearchParams(params);
        next.delete('tekrar');
        setParams(next, { replace: true });
    }, [cartReady, params, setParams]);

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
        saveOrderSnapshot(result.token, data.branchId, lines, zoneId);
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
    // Üst menü koyu kapağın üstünde durur; kapağı olmayan hata ekranında çizilmez (orada "Ana sayfa" bağlantısı var).
    const nav = !siteFailed;
    const root = (children: ReactNode, withNav = true) => (
        // Elit: köşesiz, ince serif giydirme (rb-el-flow); düzen ve mantık aynı.
        <div style={customerRootStyle({ accentColor: site?.accent, theme: site?.theme, design: site?.design, font: site?.font })}
            className={cn('min-h-screen overflow-x-clip bg-[var(--site-bg)]', resolveDesign(site?.design) === 'elit' && 'rb-el-flow')}>
            <EliteFlowStyle design={site?.design} />
            <link rel="stylesheet" href={customerFontsHref(site)} precedence="default" />
            {withNav && siteData && <FlowSiteHeader site={siteData} current="siparis" />}
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
            </main>,
            false,
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
                <Hero nav={nav} restaurant={restaurant} cover={site?.cover} eyebrow={['Paket sipariş', site?.place].filter(Boolean).join(' · ')} />
                <div className="relative mx-auto max-w-xl px-2 sm:px-4">
                    <div className="rounded-[24px] bg-[var(--site-card)] p-5 md:rounded-[32px] md:p-8">
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

    // En az tutar kalmışsa metin yerine ilerleme çubuğu gösterilir.
    const minimum = open && zone && zone.minOrderAmount > 0 && amountToMinimum > 0
        ? { subtotal: Math.max(0, zone.minOrderAmount - amountToMinimum), target: zone.minOrderAmount, left: amountToMinimum }
        : null;
    const checkoutHint = !open ? 'Restoran şu an sipariş almıyor.'
        : !zone ? 'Devam etmek için teslimat mahallenizi seçin.'
            : amountToMinimum > 0 ? null
                : quoteError ?? (quoting || !currentQuote ? 'Tutar hesaplanıyor…' : null);

    const goToCheckout = () => { setCartOpen(false); setCheckoutOpen(true); };
    const cartLines = (
        <CartLines lines={lines} quote={currentQuote}
            onChange={(key, delta) => setLines(prev => changeQuantity(prev, key, delta))}
            onNote={(key, note) => setLines(prev => setLineNote(prev, key, note))} />
    );
    const cartTotals = (
        <CartTotals subtotal={subtotal} fee={fee} total={total} zoneName={zone?.name ?? null} minimum={minimum}
            hint={checkoutHint} hintIsError={!!quoteError} canCheckout={canCheckout} onCheckout={goToCheckout} />
    );

    const pillText = data.state === 'open'
        ? (data.lastOrderAt ? `Sipariş alıyoruz · ${timeOfDay(data.lastOrderAt)}'a kadar` : 'Sipariş alıyoruz')
        : STATE_PILL[data.state];
    const scrollToMenu = () => document.getElementById(MENU_ANCHOR)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

    return root(
        <main className={cn('min-h-screen lg:pb-16', count > 0 ? 'pb-40' : 'pb-12')}>
            <Hero
                nav={nav}
                restaurant={restaurant}
                cover={site?.cover}
                eyebrow={['Paket sipariş', zone?.name ?? (multiBranch ? data.branchName : site?.place)].filter(Boolean).join(' · ')}
                status={<GlassStatusPill tone="light" open={data.state === 'open'} className="border-0">{pillText}</GlassStatusPill>}
                action={multiBranch ? (
                    <button type="button" onClick={() => setPickingBranch(true)}
                        className="flex h-11 items-center gap-1.5 rounded-full bg-[var(--site-card)] px-4 text-sm font-bold text-[var(--site-text)] transition-opacity hover:opacity-85">
                        <Store className="h-4 w-4" aria-hidden="true" />Şube değiştir
                    </button>
                ) : null}
            />

            <div className="relative mx-auto max-w-[1408px] px-2 sm:px-4 lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start lg:gap-4">
                <div className="min-w-0 rounded-[24px] bg-[var(--site-card)] p-4 sm:p-8 md:rounded-[32px] lg:p-12">
                    <div className="flex flex-col gap-3">
                        {data.state !== 'disabled' && (
                            <ZoneCard zones={data.zones} zone={zone} onPick={() => setZonePickerOpen(true)} />
                        )}

                        {!open && <ClosedCard data={data} onBrowse={scrollToMenu} />}

                        {prunedNames.length > 0 && (
                            <p role="status" className="rounded-2xl bg-[var(--site-raised)] px-4 py-3 text-sm">
                                <span className="font-semibold">Sepetinizden {prunedNames.length} ürün çıkardık.</span>{' '}
                                {listNames(prunedNames)} bugünlük tükendi ya da artık menüde yok.
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
                        <div id={MENU_ANCHOR} className="scroll-mt-4">
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
                        </div>
                    )}
                </div>

                {/* Masaüstü: sağda yapışkan sepet. Telefonda yerine alttaki sepet çubuğu ve pencere. */}
                {data.state !== 'disabled' && (
                    <aside aria-label="Sepetiniz" className={cn(sadeDesign ? 'border border-[var(--site-border)] bg-[var(--site-card)]' : cn(summaryTone, 'bg-[var(--site-menu-box)]'),
                        'sticky top-4 mt-0 hidden max-h-[calc(100dvh-2rem)] flex-col overflow-hidden rounded-[32px] text-[var(--site-text)] lg:flex')}>
                        <div className="flex items-center justify-between gap-3 px-7 pb-3 pt-7">
                            <h2 className={cn(headingFont, 'text-[38px] leading-none')}>Sepetiniz</h2>
                            {count > 0 && <span className="rounded-full bg-[var(--site-mustard)] px-2.5 py-1 text-sm font-extrabold tabular-nums text-[#24180F]">{count} ürün</span>}
                        </div>
                        <div className="min-h-0 flex-1 overflow-y-auto px-7 py-2">
                            {lines.length === 0 ? <EmptyCart /> : cartLines}
                        </div>
                        {lines.length > 0 && <div className="border-t border-dashed border-[var(--site-border-strong)] px-7 pb-7 pt-4">{cartTotals}</div>}
                    </aside>
                )}
            </div>

            {count > 0 && (
                <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--site-border)] bg-[color-mix(in_srgb,var(--site-bg)_95%,transparent)] px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-[14px] lg:hidden">
                    <div className="mx-auto max-w-3xl">
                        {minimum && <MinimumProgress {...minimum} className="mb-2.5" />}
                        {checkoutHint && <p className="mb-2 text-center text-[13px] font-medium text-[var(--site-muted)]">{checkoutHint}</p>}
                        <button type="button" onClick={() => setCartOpen(true)}
                            className="flex h-14 w-full items-center justify-between gap-3 rounded-full bg-[var(--site-paper)] pl-2 pr-6 text-[var(--site-on-paper)] shadow-[0_10px_24px_-10px_rgba(0,0,0,0.45)] transition-opacity hover:opacity-90">
                            <span className="flex items-center gap-3 text-base font-semibold">
                                <span className="flex h-10 min-w-10 items-center justify-center rounded-full bg-[var(--site-mustard)] px-2 text-base font-extrabold tabular-nums text-[#24180F]">{count}</span>
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

            {zonePickerOpen && (
                <ZonePicker zones={data.zones} selectedId={zoneId} phone={data.restaurantPhone}
                    onSelect={id => { setZoneId(id); setZonePickerOpen(false); }}
                    onBrowse={() => { setZonePickerOpen(false); scrollToMenu(); }}
                    onClose={() => setZonePickerOpen(false)} />
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

/** Sipariş adımları (bilgi amaçlı): Sepet → Teslimat → Ödeme → Onay; bu sayfa ilk adımdır. */
const ORDER_STEPS = ['Sepet', 'Teslimat', 'Ödeme', 'Onay'];

/**
 * Sayfanın başı (Renkli: kum zeminde başlık satırı): ana sayfaya dönüş, büyük "Paket sipariş" başlığı, restoran ve mahalle
 * satırı, durum hapı ve sağda adımlar. `nav` yoksa (site bilgisi alınamadı) yalnız dönüş bağlantısı ve başlık.
 */
function Hero({ restaurant, eyebrow, action, status, nav }: {
    restaurant: string; eyebrow: string; cover?: string; action?: ReactNode; status?: ReactNode; nav: boolean;
}) {
    return (
        <header className="mx-auto max-w-[1408px] px-3 pb-4 pt-5 sm:px-6 md:pb-6 md:pt-7">
            <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
                <div className="flex min-w-0 flex-col gap-2.5">
                    <Link to="/" className="inline-flex min-h-11 items-center gap-1.5 self-start text-sm font-bold text-[var(--site-sub)] no-underline hover:text-[var(--site-text)]">
                        <ArrowLeft className="h-4 w-4" aria-hidden="true" />{nav ? 'Ana sayfa' : restaurant}
                    </Link>
                    <p className="m-0 flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-[0.22em] text-[var(--site-accent-text)]">
                        <ShoppingBag className="h-3.5 w-3.5" aria-hidden="true" />{eyebrow}
                    </p>
                    <h1 className={cn(serif, 'm-0 break-words text-[52px] font-extrabold leading-[0.9] md:text-[clamp(60px,6.4vw,100px)]')}>
                        Paket <em className="rb-accent font-semibold italic text-[var(--site-accent-text)]">sipariş</em>
                    </h1>
                    {status && <div className="mt-1 flex flex-wrap items-center gap-2">{status}{action}</div>}
                    {!status && action}
                </div>
                <ol aria-label="Sipariş adımları" className="m-0 hidden list-none flex-wrap items-center gap-2.5 p-0 text-sm font-bold md:flex">
                    {ORDER_STEPS.map((label, i) => (
                        <li key={label} className="flex items-center gap-2.5" aria-current={i === 0 ? 'step' : undefined}>
                            {i > 0 && <span aria-hidden="true" className="h-px w-7 bg-[var(--site-border-strong)]" />}
                            <span className={cn('inline-flex items-center gap-2', i > 0 && 'text-[var(--site-muted)]')}>
                                <span aria-hidden="true" className={cn('flex h-7 w-7 items-center justify-center rounded-full text-[13px]',
                                    i === 0 ? 'bg-[var(--site-accent-text)] text-[var(--site-card)]' : 'border border-[var(--site-border-strong)]')}>{i === ORDER_STEPS.length - 1 ? '✓' : i + 1}</span>
                                {label}
                            </span>
                        </li>
                    ))}
                </ol>
            </div>
        </header>
    );
}

const STATE_PILL: Record<OnlineOrdering['state'], string> = {
    open: 'Sipariş alıyoruz',
    paused: 'Siparişe ara verdik',
    closed: 'Şu an kapalı',
    disabled: 'Online sipariş kapalı',
};

/** "Künefe", "Künefe ve Ayran", "Künefe, Ayran ve Sütlaç". */
function listNames(names: string[]): string {
    return names.length <= 1 ? (names[0] ?? '') : `${names.slice(0, -1).join(', ')} ve ${names[names.length - 1]}`;
}

function zoneFacts(zone: DeliveryZone) {
    return {
        time: zone.estimatedMinutes > 0 ? `~${zone.estimatedMinutes} dk` : '—',
        fee: zone.fee > 0 ? `${formatPrice(zone.fee)} ₺` : 'Ücretsiz',
        minimum: zone.minOrderAmount > 0 ? `${formatPrice(zone.minOrderAmount)} ₺` : 'Yok',
    };
}

const zoneShell = 'rounded-[20px] bg-[var(--site-bg)] p-4 md:p-5';

/** Mahalle kartı: seçimden önce "Mahallenizi seçin", sonra süre, ücret ve en az tutar hep görünür. */
function ZoneCard({ zones, zone, onPick }: { zones: DeliveryZone[]; zone: DeliveryZone | null; onPick: () => void }) {
    if (zones.length === 0) {
        return (
            <section aria-label="Teslimat mahallesi" className={zoneShell}>
                <p className="flex items-center gap-2 text-sm font-semibold"><MapPin className="h-4 w-4 text-[var(--site-accent)]" aria-hidden="true" />Teslimat</p>
                <p className="mt-2 text-sm text-[var(--site-sub)]">Restoran henüz teslimat bölgesi tanımlamadı.</p>
            </section>
        );
    }
    if (!zone) {
        return (
            <section aria-label="Teslimat mahallesi" className={zoneShell}>
                <button type="button" onClick={onPick}
                    className="flex min-h-14 w-full items-center gap-3 rounded-2xl border border-dashed border-[var(--site-border-strong)] px-4 py-2 text-left transition-colors hover:border-[var(--site-accent)]">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--site-raised)]">
                        <MapPin className="h-5 w-5 text-[var(--site-accent)]" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                        <span className="block text-base font-semibold">Nereye gelsin?</span>
                        <span className="block text-sm text-[var(--site-sub)]">Mahallenizi seçin; ücret, süre ve en az tutarı görün.</span>
                    </span>
                    <ChevronRight className="h-5 w-5 shrink-0 text-[var(--site-sub)]" aria-hidden="true" />
                </button>
            </section>
        );
    }
    const facts = zoneFacts(zone);
    return (
        <section aria-label="Teslimat mahallesi" className={zoneShell}>
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--site-sub)]">Teslimat</p>
                    <p className={cn(serif, 'm-0 mt-0.5 truncate text-[30px] leading-none md:text-[34px]')}>{zone.name}</p>
                    <p className="mt-1.5 text-sm text-[var(--site-sub)] md:hidden">
                        {facts.time} · Teslimat {facts.fee}{zone.minOrderAmount > 0 ? ` · En az ${facts.minimum}` : ''}
                    </p>
                </div>
                {zones.length > 1 && (
                    <button type="button" onClick={onPick}
                        className="flex h-11 shrink-0 items-center rounded-full border border-[var(--site-border-strong)] px-4 text-sm font-semibold transition-colors hover:border-[var(--site-text)]">
                        Değiştir
                    </button>
                )}
            </div>
            <dl className="mt-4 hidden grid-cols-3 gap-3 border-t border-[var(--site-border)] pt-4 md:grid">
                {[
                    { icon: <Clock className="h-4 w-4" aria-hidden="true" />, label: 'Süre', value: facts.time },
                    { icon: <Bike className="h-4 w-4" aria-hidden="true" />, label: 'Ücret', value: facts.fee },
                    { icon: <Wallet className="h-4 w-4" aria-hidden="true" />, label: 'En az', value: facts.minimum },
                ].map(item => (
                    <div key={item.label} className="min-w-0">
                        <dt className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--site-sub)]">{item.icon}{item.label}</dt>
                        <dd className={cn(serif, 'm-0 mt-1 text-[24px] leading-none tabular-nums')}>{item.value}</dd>
                    </div>
                ))}
            </dl>
        </section>
    );
}

/** Mahalle seçimi: arama + karşılaştırmalı liste. Eşleşme yoksa "henüz gelemiyoruz" ve sonraki adımlar. */
function ZonePicker({ zones, selectedId, phone, onSelect, onBrowse, onClose }: {
    zones: DeliveryZone[]; selectedId: string | null; phone: string;
    onSelect: (id: string) => void; onBrowse: () => void; onClose: () => void;
}) {
    const [query, setQuery] = useState('');
    const q = fold(query);
    const matches = q ? zones.filter(z => fold(z.name).includes(q)) : zones;
    // Yazım hatası için: ilk üç harfi tutan mahalleler önerilir.
    const head = q.slice(0, 3);
    const similar = q && matches.length === 0 ? zones.filter(z => fold(z.name).startsWith(head) || q.startsWith(fold(z.name).slice(0, 3))) : [];
    const typed = query.trim();

    return (
        <Sheet title="Nereye gelsin?" onClose={onClose}>
            <div className="pb-3 pt-1">
                <label htmlFor="mahalle-ara" className="sr-only">Mahallenizi arayın</label>
                <div className="relative">
                    <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--site-sub)]" aria-hidden="true" />
                    <input id="mahalle-ara" value={query} onChange={e => setQuery(e.target.value)} placeholder="Mahallenizi arayın"
                        autoComplete="off" enterKeyHint="search"
                        className="h-12 w-full rounded-xl border border-[var(--site-border-strong)] bg-[var(--site-bg)] pl-10 pr-3 text-[15px] focus:outline-none focus:ring-2 focus:ring-[var(--site-accent)]" />
                </div>
            </div>

            {matches.length > 0 ? (
                <ul className="flex flex-col gap-2 pb-4">
                    {matches.map(z => {
                        const facts = zoneFacts(z);
                        const on = z.id === selectedId;
                        return (
                            <li key={z.id}>
                                <button type="button" onClick={() => onSelect(z.id)} aria-pressed={on}
                                    className={cn('flex min-h-16 w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-colors hover:border-[var(--site-accent)]',
                                        on ? 'border-[var(--site-accent)] shadow-[0_0_0_1px_var(--site-accent)]' : 'border-[var(--site-border)]')}>
                                    <span className="min-w-0 flex-1">
                                        <span className="block text-base font-semibold">{z.name}</span>
                                        <span className="block text-sm text-[var(--site-sub)]">En az {facts.minimum}</span>
                                    </span>
                                    <span className="shrink-0 text-right">
                                        <span className="block text-sm font-semibold tabular-nums">{facts.time}</span>
                                        <span className="block text-sm tabular-nums text-[var(--site-sub)]">{facts.fee}</span>
                                    </span>
                                </button>
                            </li>
                        );
                    })}
                </ul>
            ) : (
                <div role="status" className="flex flex-col gap-3 pb-5">
                    <p className={cn(serif, 'm-0 text-[30px] leading-[1.05]')}>{typed}&apos;ya henüz gelemiyoruz.</p>
                    {similar.length > 0 && (
                        <div>
                            <p className="text-sm text-[var(--site-sub)]">Bunu mu demek istediniz?</p>
                            <div className="mt-2 flex flex-wrap gap-2">
                                {similar.map(z => (
                                    <button key={z.id} type="button" onClick={() => onSelect(z.id)}
                                        className="flex h-11 items-center rounded-full border border-[var(--site-border-strong)] px-4 text-sm font-semibold hover:border-[var(--site-accent)]">
                                        {z.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                    <p className="text-[15px] leading-relaxed text-[var(--site-sub)]">
                        {listNames(zones.map(z => z.name))} mahallelerine teslimat yapıyoruz. Yakınsanız telefonla sorun, belki yolumuzun üstündesiniz.
                    </p>
                    {phone && (
                        <a href={telHref(phone)}
                            className="flex h-12 items-center justify-center gap-2 rounded-full bg-[var(--site-paper)] text-[15px] font-semibold text-[var(--site-on-paper)] no-underline">
                            <Phone className="h-4 w-4" aria-hidden="true" />{phone}
                        </a>
                    )}
                    <button type="button" onClick={onBrowse}
                        className="flex h-12 items-center justify-center rounded-full border border-[var(--site-border-strong)] text-[15px] font-semibold">
                        Menüye yine de göz at
                    </button>
                </div>
            )}
        </Sheet>
    );
}

/** En az sepet tutarı çubuğu: "En az sepete 80 ₺ kaldı · 220 / 300 ₺". */
function MinimumProgress({ subtotal, target, left, className }: { subtotal: number; target: number; left: number; className?: string }) {
    const percent = Math.min(100, Math.max(0, (subtotal / target) * 100));
    return (
        <div className={className}>
            <div className="flex items-baseline justify-between gap-3 text-[13px]">
                <span className="font-semibold">En az sepete {formatPrice(left)} ₺ kaldı</span>
                <span className="tabular-nums text-[var(--site-sub)]">{formatPrice(subtotal)} / {formatPrice(target)} ₺</span>
            </div>
            <div role="progressbar" aria-label="En az sepet tutarı" aria-valuemin={0} aria-valuemax={target} aria-valuenow={Math.round(subtotal)}
                className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[var(--site-raised)]">
                <div className="h-full rounded-full bg-[var(--site-accent)] transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${percent}%` }} />
            </div>
        </div>
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
                                <p className={cn(serif, 'm-0 text-[19px] font-semibold leading-tight')}>{line.name}</p>
                                {line.selectionNames.length > 0 && <p className="text-sm text-[var(--site-sub)]">{line.selectionNames.join(', ')}</p>}
                                <p className="text-sm font-extrabold tabular-nums">{formatPrice(quoted?.lineTotal ?? line.unitPrice * line.quantity)} ₺</p>
                            </div>
                            <div className="flex shrink-0 items-center gap-1 rounded-full bg-[var(--site-qty-bg,var(--site-bg))] p-1">
                                <button type="button" onClick={() => onChange(line.key, -1)} aria-label={`${line.name} bir azalt`}
                                    className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--site-qty-minus,var(--site-card))] text-[#24180F]"><Minus className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" /></button>
                                <span className="min-w-5 text-center text-base font-bold tabular-nums">{line.quantity}</span>
                                <button type="button" onClick={() => onChange(line.key, 1)} aria-label={`${line.name} bir artır`}
                                    className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--site-qty-plus,var(--site-paper))] text-[var(--site-qty-plus-text,var(--site-on-paper))]"><Plus className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" /></button>
                            </div>
                        </div>
                        {line.kind === 'product' && (
                            <input
                                value={line.note}
                                onChange={e => onNote(line.key, e.target.value)}
                                maxLength={300}
                                placeholder="Not ekle (ör. acısız)"
                                aria-label={`${line.name} için not`}
                                className="mt-2 h-11 w-full rounded-2xl border border-[var(--site-border)] bg-[var(--site-bg)] px-3.5 text-[15px] text-[var(--site-text)] placeholder:text-[var(--site-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--site-accent)]"
                            />
                        )}
                        {line.kind === 'setMenu' && line.note && <p className="mt-1 text-sm text-[var(--site-sub)]">Not: {line.note}</p>}
                    </li>
                );
            })}
        </ul>
    );
}

function CartTotals({ subtotal, fee, total, zoneName, minimum, hint, hintIsError, canCheckout, onCheckout }: {
    subtotal: number; fee: number; total: number; zoneName: string | null;
    minimum: { subtotal: number; target: number; left: number } | null;
    hint: string | null; hintIsError: boolean; canCheckout: boolean; onCheckout: () => void;
}) {
    return (
        <>
            <dl className="mb-3 space-y-1 text-[15px]">
                <div className="flex justify-between"><dt className="text-[var(--site-sub)]">Ara toplam</dt><dd className="tabular-nums">{formatPrice(subtotal)} ₺</dd></div>
                <div className="flex justify-between"><dt className="text-[var(--site-sub)]">Teslimat{zoneName ? ` (${zoneName})` : ''}</dt><dd className="tabular-nums">{zoneName ? `${formatPrice(fee)} ₺` : '—'}</dd></div>
                <div className="flex items-baseline justify-between border-t border-dashed border-[var(--site-border-strong)] pt-3"><dt className="font-bold">Toplam</dt><dd className={cn(headingFont, 'text-[36px] font-semibold! leading-none tabular-nums')}>{formatPrice(total)} ₺</dd></div>
            </dl>
            {minimum && <MinimumProgress {...minimum} className="mb-3" />}
            {hint && (
                <p className={cn('mb-3 rounded-xl px-3 py-2.5 text-sm font-medium',
                    hintIsError ? 'border border-[var(--site-error-line)] bg-[var(--site-error-bg)] text-[var(--site-error)]' : 'bg-[var(--site-raised)]')}>
                    {hint}
                </p>
            )}
            <button type="button" disabled={!canCheckout} onClick={onCheckout}
                className="flex h-[60px] w-full items-center justify-center rounded-full bg-[var(--site-accent)] text-base font-extrabold text-[var(--site-on-accent)] transition-opacity hover:opacity-90 disabled:opacity-50">
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
            <div className="mx-auto max-w-[1408px] px-3 pb-6 pt-7 sm:px-6">
                <div className="h-4 w-24 animate-pulse rounded bg-[var(--site-raised)]" />
                <div className="mt-4 h-14 w-72 max-w-full animate-pulse rounded-xl bg-[var(--site-raised)] md:h-20 md:w-[28rem]" />
                <div className="mt-4 flex gap-2">
                    {[120, 96].map(w => <div key={w} style={{ width: w }} className="h-9 animate-pulse rounded-full bg-[var(--site-raised)]" />)}
                </div>
            </div>
            <div className="relative mx-auto max-w-[1408px] px-2 sm:px-4 lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-4">
                <div>
                    <div className="h-[118px] rounded-[22px] bg-[var(--site-card)] p-4">
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

/**
 * Kapalı / ara verildi / online sipariş kapalı: hata değil bilgi, sitenin koyu çağrı kartıyla. Açılış saati (nextOpensAt)
 * biliniyorsa başlıkta; bilinmiyorsa sunucunun mesajı (şubenin yerel saatiyle yazılmış).
 */
function ClosedCard({ data, onBrowse }: { data: OnlineOrdering; onBrowse: () => void }) {
    const opens = data.nextOpensAt ? opensText(data.nextOpensAt) : null;
    const eyebrow = data.state === 'paused' ? 'Kısa bir ara' : data.state === 'closed' ? 'Mutfak dinleniyor' : 'Online sipariş';
    const title = data.state === 'disabled' ? 'Online sipariş şu an kapalı.'
        : opens ? `${opens}'de açılıyoruz.`
            : data.state === 'paused' ? 'Kısa bir ara verdik.' : 'Şu an kapalıyız.';
    return (
        <section role="status" aria-label="Sipariş durumu" className={cn(siteCardDark, 'flex flex-col gap-3 p-5 md:p-6')}>
            <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--site-on-paper-sub)]">
                <Clock className="h-3.5 w-3.5" aria-hidden="true" />{eyebrow}
            </p>
            <p className={cn(serif, 'm-0 text-[32px] leading-[1.02] md:text-[40px]')}>{title}</p>
            {!opens && data.message && <p className="text-[15px] text-[var(--site-on-paper-sub)]">{data.message}</p>}
            {data.state !== 'disabled'
                ? <p className="text-[15px] leading-relaxed text-[var(--site-on-paper-sub)]">Menüye göz atın, sepetiniz burada bekler. Açılınca tek dokunuşla gönderirsiniz.</p>
                : data.restaurantPhone && <p className="text-[15px] leading-relaxed text-[var(--site-on-paper-sub)]">Telefonla sipariş verebilirsiniz.</p>}
            <div className="mt-1 flex flex-wrap gap-2.5">
                {data.state !== 'disabled' && (
                    <button type="button" onClick={onBrowse}
                        className="flex h-11 items-center rounded-full bg-[var(--site-on-paper)] px-5 text-sm font-semibold text-[var(--site-paper)] transition-opacity hover:opacity-90">
                        Menüye göz at
                    </button>
                )}
                {data.restaurantPhone && (
                    <a href={telHref(data.restaurantPhone)}
                        className="flex h-11 items-center gap-2 rounded-full border border-white/30 px-5 text-sm font-semibold text-[var(--site-on-paper)] no-underline transition-colors hover:bg-white/10">
                        <Phone className="h-4 w-4" aria-hidden="true" />{data.state === 'disabled' ? data.restaurantPhone : 'Ara'}
                    </a>
                )}
            </div>
        </section>
    );
}
