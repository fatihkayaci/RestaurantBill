import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
    AlertCircle, ArrowLeft, Bike, ChevronRight, Clock, MapPin, Minus, Phone, Plus, Receipt, Search, ShoppingBag, Store, Wallet,
} from 'lucide-react';
import { publicService } from '@/features/customerSite/api/publicService';
import { publicDeliveryService } from '@/features/delivery/api/publicDeliveryService';
import {
    addLine, changeQuantity, clearCart, moveLineToEnd, removeOneSetMenu, estimatedSubtotal, itemCount, loadBranchChoice, loadCart, loadOrderSnapshot, loadRecentOrders,
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
import { ImageSlot } from './site/SiteChrome';
import { FlowSiteHeader } from './site/SiteFrame';
import { serif, siteCardDark } from './site/siteParts';
import { headingFont, lineMenuVariant, resolveDesign, telHref } from './site/siteTheme';
import { EliteFlowStyle } from './site/elite/EliteFlowStyle';
import { isSicak, scCard, scDarkTone, scLine, scPageBg, scQtyTone } from './site/sicak/sicakParts';
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

// Online paket sipariş sayfası (/siparis, restoranın alan adında). Sıra: şube (birden fazlaysa) → teslimat şekli (restoran
// gel al'ı açtıysa "Adrese teslim" / "Gel al") → mahalle (ücret ve en az tutar; gel al'da yok) → menü → sepet → bilgiler. Düzen: solda üstte sepetteki ürünler, altında menü; sağda (masaüstünde
// yapışkan) "Siparişiniz": teslimat mahallesi, ara toplam, teslimat ücreti, toplam ve "Devam et". Telefonda mahalle sepetin
// altında, toplamlar alttaki çubuğun açtığı pencerede. Sepet, mahalle ve gönderim anahtarı (clientRequestId) cihazda şube başına
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
    // Sıcak: şeftali degrade zemin, çerçeveli yarı saydam kutular, yuvarlak tabak fotoğrafları, koyu "Siparişiniz".
    const sicak = isSicak(siteData?.site.design);
    // Elit: solda yalnız ürünler (üstte teslimat bilgi şeridi); sepetteki ürünler sağdaki "Siparişiniz"de mahalleyle birlikte.
    const cartInPanel = resolveDesign(siteData?.site.design) === 'elit';
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
    // Gel al: mahalle, adres ve teslimat ücreti yok; müşteri restorandan alır.
    const [pickup, setPickup] = useState(false);
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
                // Gel al kapalıysa hep adrese teslim; açıksa son seçim, teslimat bölgesi yoksa gel al.
                const wantsPickup = snapshot?.pickup ?? stored?.pickup ?? zones.length === 0;
                setPickup(!!result.pickupEnabled && wantsPickup);
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
        saveCart(data.branchId, { lines, zoneId, pickup, clientRequestId });
    }, [data, cartReady, lines, zoneId, pickup, clientRequestId]);

    // ── Sunucu teklifi (fiyat, ücret, en az tutar) ──
    // Notlar fiyatı değiştirmez: not yazarken teklif yeniden istenmez.
    const quoteKey = useMemo(
        () => JSON.stringify({ zoneId: pickup ? null : zoneId, pickup, lines: toCartInput(lines).map(l => ({ ...l, note: undefined })) }),
        [zoneId, pickup, lines],
    );
    const hasLines = lines.length > 0;

    useEffect(() => {
        if (!data || !hasLines) return;
        const seq = ++quoteSeq.current;
        const request = JSON.parse(quoteKey) as { zoneId: string | null; pickup: boolean; lines: CartLineInput[] };
        const timer = setTimeout(() => {
            setQuoting(true);
            publicDeliveryService.quote(data.branchId, request.zoneId, request.lines, request.pickup)
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
    // Menüden eklenen satır listenin sonuna taşınır: "Siparişiniz" panelinde son eklenen en üstte görünür.
    const toEnd = moveLineToEnd;
    const addProduct = (product: OnlineMenuProduct) => {
        if (product.isOutOfStock) return;
        setLines(prev => toEnd(addLine(prev, {
            key: productKey(product.id), kind: 'product', productId: product.id, name: product.name, unitPrice: product.price,
            note: '', selections: {}, selectionNames: [],
        }), productKey(product.id)));
    };
    const removeProduct = (product: OnlineMenuProduct) => setLines(prev => changeQuantity(prev, productKey(product.id), -1));
    const addSetMenu = (menu: OnlineSetMenu, selections: Record<string, string>, quantity: number, note: string) => {
        const key = setMenuKey(menu.id, selections) + (note ? `:${note}` : '');
        setLines(prev => toEnd(addLine(prev, {
            key, kind: 'setMenu', setMenuId: menu.id, name: menu.name, unitPrice: setMenuUnitPrice(menu, selections),
            note, selections, selectionNames: selectionNames(menu, selections),
        }, quantity), key));
        setSetMenuOpen(null);
    };

    const onSubmitted = (result: SubmittedDeliveryOrder) => {
        if (!data) return;
        rememberOrder({ token: result.token, number: result.number, createdAt: new Date().toISOString() });
        saveOrderSnapshot(result.token, data.branchId, lines, zoneId, pickup);
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
        <div style={{ ...customerRootStyle({ accentColor: site?.accent, theme: site?.theme, design: site?.design, font: site?.font }), ...(sicak ? scPageBg : {}) }}
            data-site-design={resolveDesign(site?.design)} className={cn('min-h-screen overflow-x-clip bg-[var(--site-bg)]', resolveDesign(site?.design) === 'elit' && 'rb-el-flow')}>
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
    // Gel al seçiliyken mahalle yok sayılır: ücret 0, en az tutar yok.
    const isPickup = pickup && !!data.pickupEnabled;
    const zone = isPickup ? null : data.zones.find(z => z.id === zoneId) ?? null;
    const count = itemCount(lines);
    const estimate = estimatedSubtotal(lines);
    const subtotal = currentQuote?.subtotal ?? estimate;
    const fee = isPickup ? 0 : currentQuote?.deliveryFee ?? zone?.fee ?? 0;
    const total = currentQuote?.total ?? subtotal + fee;
    const amountToMinimum = isPickup ? 0 : currentQuote ? currentQuote.amountToMinimum : zone ? Math.max(0, zone.minOrderAmount - estimate) : 0;
    const canCheckout = open && (isPickup || !!zone) && !!currentQuote && (isPickup || currentQuote.meetsMinimum) && !quoteError;

    // En az tutar kalmışsa metin yerine ilerleme çubuğu gösterilir.
    const minimum = open && zone && zone.minOrderAmount > 0 && amountToMinimum > 0
        ? { subtotal: Math.max(0, zone.minOrderAmount - amountToMinimum), target: zone.minOrderAmount, left: amountToMinimum }
        : null;
    const checkoutHint = !open ? 'Restoran şu an sipariş almıyor.'
        : !isPickup && !zone ? 'Devam etmek için teslimat mahallenizi seçin.'
        : lines.length === 0 ? 'Sepetiniz boş. Menüden ürün ekleyin.'
            : amountToMinimum > 0 ? null
                : quoteError ?? (quoting || !currentQuote ? 'Tutar hesaplanıyor…' : null);

    const goToCheckout = () => { setCartOpen(false); setCheckoutOpen(true); };
    const fulfillment = (opts: { onPick: () => void; flat?: boolean; compact?: boolean }) => (
        <FulfillmentCard data={data} pickup={isPickup} onPickupChange={setPickup} zone={zone} {...opts} />
    );
    // Sepet satırının görseli menüden (ürün ya da hazır menü); görseli yoksa restoranın yazı logosu.
    const productImages = new Map(data.categories.flatMap(c => c.products).map(p => [p.id, { src: p.imageUrl, stock: p.isStockImage }]));
    const menuImages = new Map((data.setMenus ?? []).map(m => [m.id, { src: m.imageUrl, stock: m.isStockImage }]));
    const lineImage = (line: DeliveryCartLine) =>
        (line.kind === 'product' ? productImages.get(line.productId ?? '') : menuImages.get(line.setMenuId ?? '')) ?? { src: '', stock: false };
    const renderCartLines = (limit?: number) => (
        <CartLines limit={limit} lines={lines} quote={currentQuote} restaurant={restaurant} imageOf={lineImage} round={sicak}
            onChange={(key, delta) => setLines(prev => changeQuantity(prev, key, delta))}
            onNote={(key, note) => setLines(prev => setLineNote(prev, key, note))} />
    );
    const cartLines = renderCartLines();
    // Boş sepet önerileri: ustanın seçimi (yoksa ilk ürünler), tükenmemiş, en fazla 3.
    const available = data.categories.flatMap(c => c.products).filter(p => !p.isOutOfStock);
    const suggestions = (available.some(p => p.isFeatured) ? available.filter(p => p.isFeatured) : available).slice(0, 3);
    const cartTotals = (
        <CartTotals subtotal={subtotal} fee={fee} total={total} zoneName={zone?.name ?? null} pickup={isPickup} minimum={minimum}
            hint={checkoutHint} hintIsError={!!quoteError} canCheckout={canCheckout} onCheckout={goToCheckout}
            closedLabel={open ? null : data.nextOpensAt ? `${opensText(data.nextOpensAt)}'da açılıyor` : 'Şu an sipariş alınmıyor'} />
    );

    const pillText = data.state === 'open'
        ? (data.lastOrderAt ? `Sipariş alıyoruz · ${timeOfDay(data.lastOrderAt)}'a kadar` : 'Sipariş alıyoruz')
        : STATE_PILL[data.state];
    const scrollToMenu = () => document.getElementById(MENU_ANCHOR)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

    return root(
        <main className={cn('min-h-screen lg:pb-16', count > 0 ? 'pb-40' : 'pb-12')}>
            {!cartInPanel && <Hero
                nav={nav}
                sicak={sicak}
                restaurant={restaurant}
                cover={site?.cover}
                eyebrow={['Paket sipariş', isPickup ? 'Gel al' : zone?.name ?? (multiBranch ? data.branchName : site?.place)].filter(Boolean).join(' · ')}
                status={<GlassStatusPill tone="light" open={data.state === 'open'} className="border-0">{pillText}</GlassStatusPill>}
                action={multiBranch ? (
                    <button type="button" onClick={() => setPickingBranch(true)}
                        className="flex h-11 items-center gap-1.5 rounded-full bg-[var(--site-card)] px-4 text-sm font-bold text-[var(--site-text)] transition-opacity hover:opacity-85">
                        <Store className="h-4 w-4" aria-hidden="true" />Şube değiştir
                    </button>
                ) : null}
            />}

            <div className={cn('relative mx-auto max-w-[1408px] px-2 sm:px-4 lg:grid lg:items-start lg:gap-4', cartInPanel && 'pt-4 md:pt-6',
                cartInPanel ? 'lg:grid-cols-[minmax(0,1fr)_420px] xl:grid-cols-[minmax(0,1fr)_460px]' : 'lg:grid-cols-[minmax(0,1fr)_380px]')}>
                <div className={cn('min-w-0', cartInPanel && 'flex flex-col gap-4')}>
                {cartInPanel && (
                    <EliteBanner nav={nav} restaurant={restaurant} cover={site?.cover}
                        eyebrow={['Paket sipariş', isPickup ? 'Gel al' : zone?.name ?? (multiBranch ? data.branchName : site?.place)].filter(Boolean).join(' · ')}
                        status={<GlassStatusPill tone="glass" open={data.state === 'open'}>{pillText}</GlassStatusPill>}
                        action={multiBranch ? (
                            <button type="button" onClick={() => setPickingBranch(true)}
                                className="flex h-11 items-center gap-1.5 rounded-full border border-white/30 px-4 text-sm font-semibold text-[var(--site-on-paper)] transition-colors hover:bg-white/10">
                                <Store className="h-4 w-4" aria-hidden="true" />Şube değiştir
                            </button>
                        ) : null} />
                )}
                <div className={cn('min-w-0 p-4 sm:p-8 lg:p-12', sicak
                    ? cn('rounded-[28px] border', scLine, 'bg-[color-mix(in_srgb,#FFFFFF_42%,transparent)]')
                    : 'rounded-[24px] bg-[var(--site-card)] md:rounded-[32px]')}>
                    {/* Sol üst: sepetteki ürünler (adet, not). Boşsa kısa bir çağrı. Elit'te sepet sağdaki panelde. */}
                    {data.state !== 'disabled' && !cartInPanel && (
                        <section aria-labelledby="sepet-baslik" className={cn('p-4 md:p-6', sicak ? cn(scCard, scQtyTone, 'bg-[#FFF9F2]') : 'rounded-[20px] bg-[var(--site-bg)]')}>
                            <div className="flex items-center justify-between gap-3">
                                <h2 id="sepet-baslik" className={cn(headingFont, 'text-[26px] leading-none md:text-[32px]')}>Sepetiniz</h2>
                                {count > 0 && <span className={cn('px-2.5 py-1 text-sm font-extrabold tabular-nums', sicak ? 'rounded-lg bg-[var(--site-accent)] text-[var(--site-on-accent)]' : 'rounded-full bg-[var(--site-mustard)] text-[#24180F]')}>{count} ürün</span>}
                            </div>
                            {lines.length === 0
                                ? <p className="mt-2 text-sm text-[var(--site-sub)]">Sepetiniz boş. Aşağıdaki menüden beğendiklerinizi ekleyin.</p>
                                : <div className="mt-1">{cartLines}</div>}
                        </section>
                    )}

                    {/* Elit, masaüstü: teslimat bilgi şeridi (süre, ücret, en az tutar, bölge). Telefonda yerine mahalle kartı. */}
                    {data.state !== 'disabled' && cartInPanel && (
                        <DeliveryInfoStrip zone={zone} hasZones={data.zones.length > 0} onPick={() => setZonePickerOpen(true)}
                            pickup={isPickup ? data : null} />
                    )}

                    <div className={cn('flex flex-col gap-3 empty:hidden', cartInPanel ? 'lg:mt-3' : 'mt-3')}>
                        {/* Telefonda mahalle burada; masaüstünde sağdaki "Siparişiniz" kutusunda. */}
                        {data.state !== 'disabled' && (
                            <div className="lg:hidden">
                                {fulfillment({ onPick: () => setZonePickerOpen(true) })}
                            </div>
                        )}

                        {!open && <ClosedCard data={data} onBrowse={scrollToMenu} slim={cartInPanel} />}

                        {prunedNames.length > 0 && (
                            <p role="status" className="rounded-2xl bg-[var(--site-raised)] px-4 py-3 text-sm">
                                <span className="font-semibold">Sepetinizden {prunedNames.length} ürün çıkardık.</span>{' '}
                                {listNames(prunedNames)} bugünlük tükendi ya da artık menüde yok.
                            </p>
                        )}

                        {/* Elit: son siparişler üst menüdeki "Siparişim"de; burada yer kaplamasın. */}
                        {recent.length > 0 && !cartInPanel && (
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

                    {/* Sol alt: menünün kalanı. */}
                    {data.state !== 'disabled' && (
                        <div id={MENU_ANCHOR} className="mt-6 scroll-mt-4">
                        <DeliveryMenu
                            categories={data.categories}
                            setMenus={data.setMenus}
                            restaurant={restaurant}
                            productQuantity={id => quantityOf(lines, l => l.productId === id && l.kind === 'product')}
                            setMenuQuantity={id => quantityOf(lines, l => l.setMenuId === id)}
                            onAddProduct={addProduct}
                            onRemoveProduct={removeProduct}
                            onOpenSetMenu={setSetMenuOpen}
                            onRemoveSetMenu={menu => setLines(prev => removeOneSetMenu(prev, menu.id))}
                            variant={sicak ? 'sicak' : lineMenuVariant(site?.design)}
                        />
                        </div>
                    )}
                </div>
                </div>

                {/* Masaüstü: sağda yapışkan "Siparişiniz" (mahalle + tutarlar). Telefonda yerine alttaki çubuk ve pencere. */}
                {data.state !== 'disabled' && cartInPanel && (
                    // Elit: koyu panelde tek parça açık kart (mahalle, sepetteki ürünler, tutarlar ve "Devam et"); kart bütün
                    // olarak kayar.
                    <div className="sticky top-4 hidden max-h-[calc(100dvh-2rem)] flex-col gap-3 lg:flex">
                    <OrderSteps className="flex justify-center py-2" />
                    <aside aria-label="Siparişiniz"
                        className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[32px] bg-[var(--site-menu-box)] p-4">
                        <div className="flex items-center justify-between gap-3 px-3 pb-4 pt-3">
                            <h2 className={cn(headingFont, 'text-[38px] leading-none text-[var(--site-on-menu-box)]')}>Siparişiniz</h2>
                            {count > 0 && <span className="rounded-full bg-[var(--site-mustard)] px-2.5 py-1 text-sm font-extrabold tabular-nums text-[#24180F]">{count} ürün</span>}
                        </div>
                        <div className="min-h-0 flex-1 overflow-y-auto rounded-[24px] bg-[var(--site-card)] text-[var(--site-text)]">
                            <div className="border-b border-[var(--site-border)] px-5 pb-4 pt-5">
                                {fulfillment({ onPick: () => setZonePickerOpen(true), flat: true, compact: true })}
                            </div>
                            <div className="px-5">{lines.length === 0
                                ? <EmptyCart suggestions={suggestions} restaurant={restaurant} onAdd={addProduct} />
                                : renderCartLines(CART_PANEL_LIMIT)}</div>
                            <div className="border-t border-dashed border-[var(--site-border-strong)] px-5 pb-5 pt-4">{cartTotals}</div>
                        </div>
                    </aside>
                    </div>
                )}
                {data.state !== 'disabled' && !cartInPanel && (
                    <aside aria-label="Siparişiniz" className={cn(sicak ? cn(scDarkTone, 'rounded-[24px] bg-[#1E1915] shadow-[0_24px_50px_-28px_rgba(30,25,21,0.7)]')
                        : sadeDesign ? 'rounded-[32px] border border-[var(--site-border)] bg-[var(--site-card)]' : cn(summaryTone, 'rounded-[32px] bg-[var(--site-menu-box)]'),
                        'sticky top-4 mt-0 hidden max-h-[calc(100dvh-2rem)] flex-col overflow-hidden text-[var(--site-text)] lg:flex')}>
                        <div className="flex items-center justify-between gap-3 px-7 pb-3 pt-7">
                            <h2 className={cn(headingFont, 'text-[38px] leading-none')}>Siparişiniz</h2>
                            {count > 0 && <span className={cn('px-2.5 py-1 text-sm font-extrabold tabular-nums', sicak ? 'rounded-lg bg-[var(--site-accent)] text-[var(--site-on-accent)]' : 'rounded-full bg-[var(--site-mustard)] text-[#24180F]')}>{count} ürün</span>}
                        </div>
                        <div className="min-h-0 flex-1 overflow-y-auto px-7 py-2">
                            {fulfillment({ onPick: () => setZonePickerOpen(true) })}
                        </div>
                        <div className="border-t border-dashed border-[var(--site-border-strong)] px-7 pb-7 pt-4">{cartTotals}</div>
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
                <Sheet title="Siparişiniz" onClose={() => setCartOpen(false)} footer={cartTotals}>
                    {fulfillment({ onPick: () => { setCartOpen(false); setZonePickerOpen(true); } })}
                    <div className="mt-3">{lines.length === 0 ? <EmptyCart /> : cartLines}</div>
                </Sheet>
            )}

            {checkoutOpen && (zone || isPickup) && currentQuote && (
                <DeliveryCheckout
                    data={data}
                    zone={zone}
                    pickup={isPickup}
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
function Hero({ restaurant, eyebrow, action, status, nav, sicak = false }: {
    restaurant: string; eyebrow: string; cover?: string; action?: ReactNode; status?: ReactNode; nav: boolean;
    /** Sıcak: kalın düz başlık, "sipariş" turuncu (italik değil), turuncu adım. */
    sicak?: boolean;
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
                    {sicak ? (
                        <h1 className={cn(headingFont, 'm-0 break-words text-[44px] leading-[1.02] tracking-[-0.02em] md:text-[clamp(52px,5.2vw,80px)]')}>
                            Paket <span className="text-[var(--site-accent-text)]">sipariş</span>
                        </h1>
                    ) : (
                        <h1 className={cn(serif, 'm-0 break-words text-[52px] font-extrabold leading-[0.9] md:text-[clamp(60px,6.4vw,100px)]')}>
                            Paket <em className="rb-accent font-semibold italic text-[var(--site-accent-text)]">sipariş</em>
                        </h1>
                    )}
                    {status && <div className="mt-1 flex flex-wrap items-center gap-2">{status}{action}</div>}
                    {!status && action}
                </div>
                <OrderSteps sicak={sicak} className="hidden md:flex" />
            </div>
        </header>
    );
}

/** Sipariş adımları (bilgi amaçlı): bu sayfa ilk adım (Sepet). */
function OrderSteps({ sicak = false, onDark = false, className }: { sicak?: boolean; onDark?: boolean; className?: string }) {
    return (
        <ol aria-label="Sipariş adımları" className={cn('m-0 list-none flex-wrap items-center gap-2.5 p-0 text-sm font-bold', className)}>
            {ORDER_STEPS.map((label, i) => (
                <li key={label} className="flex items-center gap-2.5" aria-current={i === 0 ? 'step' : undefined}>
                    {i > 0 && <span aria-hidden="true" className={cn('h-px w-6', onDark ? 'bg-[var(--site-on-paper-sub)]' : 'bg-[var(--site-border-strong)]')} />}
                    <span className={cn('inline-flex items-center gap-2', i > 0 && 'text-[var(--site-muted)]')}>
                        <span aria-hidden="true" className={cn('flex h-7 w-7 items-center justify-center rounded-full text-[13px]',
                            i === 0 ? (sicak ? 'bg-[var(--site-accent)] text-[var(--site-on-accent)]' : 'bg-[var(--site-accent-text)] text-[var(--site-card)]') : 'border border-[var(--site-border-strong)]')}>{i === ORDER_STEPS.length - 1 ? '✓' : i + 1}</span>
                        {label}
                    </span>
                </li>
            ))}
        </ol>
    );
}

/**
 * Elit'in sipariş başlığı: restoranın kapak fotoğrafı üstünde koyu degrade, krem yazıyla "Paket sipariş", bölge satırı ve
 * durum hapı (ekran görüntüsündeki afiş). Kapak yoksa koyu panel rengi.
 */
function EliteBanner({ cover, eyebrow, status, action, nav, restaurant }: {
    cover?: string | null; eyebrow: string; status: ReactNode; action?: ReactNode; nav: boolean; restaurant: string;
}) {
    return (
        <header className="relative isolate overflow-hidden rounded-[28px] bg-[var(--site-paper)] text-[var(--site-on-paper)]">
            {cover && <img src={cover} alt="" aria-hidden="true" className="absolute inset-0 -z-10 h-full w-full object-cover" />}
            <span aria-hidden="true" className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(30,22,16,0.92)_0%,rgba(30,22,16,0.72)_45%,rgba(30,22,16,0.25)_100%)]" />
            <div className="flex min-h-[260px] flex-col justify-between gap-6 p-6 sm:p-9 md:min-h-[300px]">
                <Link to="/" className="inline-flex min-h-11 items-center gap-1.5 self-start text-sm font-semibold text-[var(--site-on-paper-sub)] no-underline hover:text-[var(--site-on-paper)]">
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" />{nav ? 'Ana sayfa' : restaurant}
                </Link>
                <div className="flex max-w-[560px] flex-col gap-3">
                    <p className="m-0 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--site-accent-on-dark)]">
                        <ShoppingBag className="h-3.5 w-3.5" aria-hidden="true" />{eyebrow}
                    </p>
                    <h1 className={cn(serif, 'm-0 break-words text-[48px] leading-[0.95] md:text-[clamp(56px,5.6vw,84px)]')}>
                        Paket <em className="italic text-[var(--site-accent-on-dark)]">sipariş</em>
                    </h1>
                    <div className="mt-1 flex flex-wrap items-center gap-2">{status}{action}</div>
                </div>
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

/** Elit "Siparişiniz" panelinde ilk görünen sepet satırı sayısı (son eklenenler); kalanı "Tüm siparişleri gör". */
const CART_PANEL_LIMIT = 2;

const zoneShellBox = 'rounded-[20px] bg-[var(--site-bg)] p-4 md:p-5';

/**
 * Elit sipariş sayfasının sol üstündeki teslimat bilgi şeridi (yalnız masaüstü): ortalama teslimat, teslimat ücreti, en az
 * sipariş ve teslimat bölgesi. Mahalle seçilmemişse bölge hücresi seçim düğmesidir.
 */
function DeliveryInfoStrip({ zone, hasZones, onPick, pickup }: {
    zone: DeliveryZone | null; hasZones: boolean; onPick: () => void;
    /** Gel al seçiliyse sayfanın verisi: süre, ücret yok, restoranın adresi. */
    pickup: OnlineOrdering | null;
}) {
    if (pickup) {
        const cells = [
            { icon: <Clock className="h-5 w-5" aria-hidden="true" />, label: 'Hazır olma', value: pickupEtaText(pickup) },
            { icon: <Store className="h-5 w-5" aria-hidden="true" />, label: 'Teslimat ücreti', value: 'Yok (gel al)' },
            { icon: <MapPin className="h-5 w-5" aria-hidden="true" />, label: 'Alacağınız yer', value: pickup.pickupAddress || pickup.branchName },
        ];
        return (
            <section aria-label="Gel al bilgileri" className="hidden grid-cols-[1fr_1fr_2fr] divide-x divide-[var(--site-border)] rounded-[20px] bg-[var(--site-bg)] py-3 lg:grid">
                {cells.map(cell => (
                    <div key={cell.label} className="flex min-w-0 items-center gap-3 px-4">
                        <span className="shrink-0 text-[var(--site-sub)]">{cell.icon}</span>
                        <span className="min-w-0">
                            <span className="block text-xs text-[var(--site-sub)]">{cell.label}</span>
                            <span className="block truncate text-[15px] font-semibold tabular-nums" title={cell.value}>{cell.value}</span>
                        </span>
                    </div>
                ))}
            </section>
        );
    }
    const facts = zone ? zoneFacts(zone) : null;
    const cells = [
        { icon: <Clock className="h-5 w-5" aria-hidden="true" />, label: 'Ortalama teslimat', value: facts?.time ?? '—' },
        { icon: <Bike className="h-5 w-5" aria-hidden="true" />, label: 'Teslimat ücreti', value: facts?.fee ?? '—' },
        { icon: <Wallet className="h-5 w-5" aria-hidden="true" />, label: 'En az sipariş', value: facts?.minimum ?? '—' },
    ];
    return (
        <section aria-label="Teslimat bilgileri" className="hidden grid-cols-4 divide-x divide-[var(--site-border)] rounded-[20px] bg-[var(--site-bg)] py-3 lg:grid">
            {cells.map(cell => (
                <div key={cell.label} className="flex min-w-0 items-center gap-3 px-4">
                    <span className="shrink-0 text-[var(--site-sub)]">{cell.icon}</span>
                    <span className="min-w-0">
                        <span className="block text-xs text-[var(--site-sub)]">{cell.label}</span>
                        <span className="block truncate text-[15px] font-semibold tabular-nums">{cell.value}</span>
                    </span>
                </div>
            ))}
            <div className="flex min-w-0 items-center gap-3 px-4">
                <MapPin className="h-5 w-5 shrink-0 text-[var(--site-sub)]" aria-hidden="true" />
                <span className="min-w-0">
                    <span className="block text-xs text-[var(--site-sub)]">Teslimat bölgesi</span>
                    {zone ? <span className="block truncate text-[15px] font-semibold" title={zone.name}>{zone.name}</span>
                        : hasZones ? <button type="button" onClick={onPick} className="block min-h-6 text-[15px] font-semibold text-[var(--site-accent-text)] underline">Mahalle seçin</button>
                            : <span className="block text-[15px] font-semibold">—</span>}
                </span>
            </div>
        </section>
    );
}

function pickupEtaText(data: OnlineOrdering): string {
    return data.pickupEtaMinutes ? `~${data.pickupEtaMinutes} dk` : '—';
}

/**
 * Teslimat şekli: restoran gel al'ı açtıysa üstte "Adrese teslim / Gel al" seçimi, altında mahalle kartı ya da gel al kartı
 * (restoranın adresi, yol tarifi, yaklaşık hazır olma süresi). Gel al kapalıysa yalnızca mahalle kartı.
 */
function FulfillmentCard({ data, pickup, onPickupChange, zone, onPick, flat = false, compact = false }: {
    data: OnlineOrdering; pickup: boolean; onPickupChange: (pickup: boolean) => void;
    zone: DeliveryZone | null; onPick: () => void; flat?: boolean; compact?: boolean;
}) {
    if (!data.pickupEnabled) return <ZoneCard zones={data.zones} zone={zone} onPick={onPick} flat={flat} compact={compact} />;
    const options = [
        { value: false, label: 'Adrese teslim', icon: Bike },
        { value: true, label: 'Gel al', icon: Store },
    ];
    return (
        <div className={cn('flex flex-col gap-4', !flat && zoneShellBox)}>
            <div role="radiogroup" aria-label="Teslimat şekli" className="grid grid-cols-2 gap-1 rounded-full border border-[var(--site-border-strong)] p-1">
                {options.map(option => {
                    const checked = pickup === option.value;
                    const Icon = option.icon;
                    return (
                        <button key={option.label} type="button" role="radio" aria-checked={checked} onClick={() => onPickupChange(option.value)}
                            className={cn('flex min-h-11 items-center justify-center gap-2 rounded-full text-sm font-semibold transition-colors',
                                checked ? 'bg-[var(--site-paper)] text-[var(--site-on-paper)]' : 'text-[var(--site-text)] hover:bg-[var(--site-raised)]')}>
                            <Icon className="h-4 w-4" aria-hidden="true" />{option.label}
                        </button>
                    );
                })}
            </div>
            {pickup ? <PickupCard data={data} compact={compact} /> : <ZoneCard zones={data.zones} zone={zone} onPick={onPick} flat compact={compact} />}
        </div>
    );
}

/** Gel al kartı: siparişi alacağı yer (şube adı, adres, yol tarifi) ve yaklaşık hazır olma süresi. */
function PickupCard({ data, compact }: { data: OnlineOrdering; compact: boolean }) {
    const address = data.pickupAddress ?? '';
    return (
        <section aria-label="Gel al">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--site-sub)]">Gel al · restorandan teslim</p>
            <p className={cn(serif, 'm-0 mt-0.5 break-words leading-[1.05]', compact ? 'text-[24px]' : 'text-[28px] md:text-[30px]')}>{data.branchName}</p>
            {address && (
                <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`} target="_blank" rel="noreferrer"
                    className="mt-1.5 flex items-start gap-1.5 text-sm text-[var(--site-sub)] underline-offset-2 hover:underline">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    <span className="min-w-0 break-words">{address}</span>
                </a>
            )}
            {data.pickupDirections && <p className="mt-1 text-sm text-[var(--site-sub)]">{data.pickupDirections}</p>}
            <p className="mt-2 flex items-center gap-1.5 text-sm font-semibold">
                <Clock className="h-4 w-4 shrink-0 text-[var(--site-sub)]" aria-hidden="true" />
                {data.pickupEtaMinutes ? `Onaydan sonra yaklaşık ${data.pickupEtaMinutes} dk'da hazır` : 'Hazır olunca takip sayfasında görürsünüz'}
            </p>
            <p className="mt-1 text-sm text-[var(--site-sub)]">Teslimat ücreti yok. Ödemeyi siparişi alırken restoranda yaparsınız.</p>
        </section>
    );
}

/** Mahalle kartı: seçimden önce "Mahallenizi seçin", sonra süre, ücret ve en az tutar hep görünür. */
function ZoneCard({ zones, zone, onPick, flat = false, compact = false }: {
    zones: DeliveryZone[]; zone: DeliveryZone | null; onPick: () => void;
    /** true: kendi zemini ve iç boşluğu yok (içinde durduğu kartın parçası). */
    flat?: boolean;
    /** true: yalnız mahalle adı ve "Değiştir" (süre/ücret/en az başka yerde gösteriliyor). */
    compact?: boolean;
}) {
    const zoneShell = flat ? '' : zoneShellBox;
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
                    <p className={cn(serif, 'm-0 mt-0.5 break-words leading-[1.05]', compact ? 'text-[24px]' : 'text-[28px] md:text-[30px]')}>{zone.name}</p>
                    <p className={cn('mt-1.5 text-sm text-[var(--site-sub)] md:hidden', compact && 'hidden')}>
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
            <dl className={cn('mt-4 hidden grid-cols-3 gap-3 border-t border-[var(--site-border)] pt-4', !compact && 'md:grid')}>
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

function EmptyCart({ suggestions = [], restaurant = '', onAdd }: {
    /** Boş sepette önerilen ürünler (ustanın seçimi; yoksa ilk ürünler), tek dokunuşla eklenir. */
    suggestions?: OnlineMenuProduct[]; restaurant?: string; onAdd?: (product: OnlineMenuProduct) => void;
}) {
    return (
        <div className="py-8">
            <div className="flex flex-col items-center text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--site-raised)] text-[var(--site-sub)]">
                    <ShoppingBag className="h-6 w-6" aria-hidden="true" />
                </span>
                <p className="mt-3 text-base font-semibold">Sepetiniz boş</p>
                <p className="mt-0.5 text-sm text-[var(--site-sub)]">Menüden beğendiklerinizi ekleyin.</p>
            </div>
            {onAdd && suggestions.length > 0 && (
                <div className="mt-6">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--site-sub)]">Ustanın önerileri</p>
                    <ul className="mt-2 divide-y divide-[var(--site-border)]">
                        {suggestions.map(product => (
                            <li key={product.id} className="flex items-center gap-3 py-2.5">
                                <span className="relative h-12 w-12 shrink-0">
                                    <ImageSlot src={product.imageUrl} alt={product.name} restaurant={restaurant} logoTextClassName="text-[min(9px,14cqw)]" className="h-full rounded-xl" />
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate text-[15px] font-semibold">{product.name}</span>
                                    <span className="block text-sm tabular-nums text-[var(--site-sub)]">{formatPrice(product.price)} ₺</span>
                                </span>
                                <button type="button" onClick={() => onAdd(product)} aria-label={`${product.name} sepete ekle`}
                                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--site-paper)] text-[var(--site-on-paper)] transition-opacity hover:opacity-90">
                                    <Plus className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}

function CartLines({ lines, quote, restaurant, imageOf, round = false, limit, onChange, onNote }: {
    lines: DeliveryCartLine[];
    quote: DeliveryQuote | null;
    restaurant: string;
    /** Satırın görseli (menüden); hazır kütüphane görseliyse üzerine gelince "Temsili görsel". */
    imageOf: (line: DeliveryCartLine) => { src: string; stock: boolean };
    /** Sıcak tasarım: koyu kenarlı yuvarlak "tabak" görsel. */
    round?: boolean;
    /**
     * Verilirse son eklenen en üstte ve yalnız ilk `limit` satır görünür; kalanı "Tüm siparişleri gör" ile açılır
     * (Elit'in "Siparişiniz" paneli).
     */
    limit?: number;
    onChange: (key: string, delta: number) => void;
    onNote: (key: string, note: string) => void;
}) {
    const [expanded, setExpanded] = useState(false);
    // Not kutusu yalnız istenince (ya da not yazılmışsa) açılır; yoksa küçük "Not ekle" bağlantısı.
    const [noteOpen, setNoteOpen] = useState<ReadonlySet<string>>(() => new Set());
    // Satırın sunucu teklifindeki karşılığı sıraya göredir; ters çevirirken asıl sırası korunur.
    const ordered = lines.map((line, index) => ({ line, index }));
    if (limit) ordered.reverse();
    const hidden = limit && !expanded ? Math.max(0, ordered.length - limit) : 0;
    const visible = hidden > 0 ? ordered.slice(0, limit) : ordered;
    return (
        <>
        <ul className="divide-y divide-[var(--site-border)]">
            {visible.map(({ line, index: i }) => {
                const quoted = quote && quote.lines.length === lines.length ? quote.lines[i] : null;
                const image = imageOf(line);
                return (
                    <li key={line.key} className="py-3">
                        <div className="flex items-center gap-3">
                            <span className={cn('relative h-16 w-16 shrink-0 md:h-[72px] md:w-[72px]', round && 'rounded-full bg-[#1E1915] p-[3px]')}
                                title={image.src && image.stock ? 'Temsili görsel' : undefined}>
                                <ImageSlot src={image.src} alt={line.name} restaurant={restaurant} logoTextClassName="text-[min(11px,14cqw)]"
                                    className={cn('h-full', round ? 'rounded-full' : 'rounded-2xl')} />
                                {image.src && image.stock && <span className="sr-only"> (temsili görsel)</span>}
                            </span>
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
                        {line.kind === 'product' && !line.note && !noteOpen.has(line.key) && (
                            <button type="button" onClick={() => setNoteOpen(prev => new Set(prev).add(line.key))}
                                className="mt-1 inline-flex min-h-9 items-center gap-1 text-[13px] font-semibold text-[var(--site-sub)] underline-offset-2 hover:text-[var(--site-text)] hover:underline">
                                <Plus className="h-3.5 w-3.5" aria-hidden="true" />Not ekle<span className="sr-only">: {line.name}</span>
                            </button>
                        )}
                        {line.kind === 'product' && (line.note || noteOpen.has(line.key)) && (
                            <input
                                autoFocus={!line.note}
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
        {limit && ordered.length > limit && (
            <button type="button" onClick={() => setExpanded(v => !v)} aria-expanded={expanded}
                className="mb-3 flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-[var(--site-border-strong)] text-sm font-semibold text-[var(--site-text)] transition-colors hover:border-[var(--site-text)]">
                {expanded ? 'Daha az göster' : `Tüm siparişleri gör (${ordered.length})`}
                <ChevronRight className={cn('h-4 w-4 transition-transform', expanded ? '-rotate-90' : 'rotate-90')} aria-hidden="true" />
            </button>
        )}
        </>
    );
}

function CartTotals({ subtotal, fee, total, zoneName, pickup = false, minimum, hint, hintIsError, canCheckout, onCheckout, closedLabel }: {
    subtotal: number; fee: number; total: number; zoneName: string | null;
    /** Gel al: teslimat satırında "Gel al · ücretsiz". */
    pickup?: boolean;
    minimum: { subtotal: number; target: number; left: number } | null;
    hint: string | null; hintIsError: boolean; canCheckout: boolean; onCheckout: () => void;
    /** Restoran sipariş almıyorken soluk düğme yerine net durum ("Yarın 09:00'da açılıyor"). */
    closedLabel?: string | null;
}) {
    return (
        <>
            <dl className="mb-3 space-y-1 text-[15px]">
                <div className="flex justify-between"><dt className="text-[var(--site-sub)]">Ara toplam</dt><dd className="tabular-nums">{formatPrice(subtotal)} ₺</dd></div>
                {pickup
                    ? <div className="flex justify-between"><dt className="text-[var(--site-sub)]">Gel al</dt><dd>Teslimat ücreti yok</dd></div>
                    : <div className="flex justify-between"><dt className="text-[var(--site-sub)]">Teslimat{zoneName ? ` (${zoneName})` : ''}</dt><dd className="tabular-nums">{zoneName ? `${formatPrice(fee)} ₺` : '—'}</dd></div>}
                <div className="flex items-baseline justify-between border-t border-dashed border-[var(--site-border-strong)] pt-3"><dt className="font-bold">Toplam</dt><dd className={cn(headingFont, 'text-[36px] font-semibold! leading-none tabular-nums')}>{formatPrice(total)} ₺</dd></div>
            </dl>
            {minimum && <MinimumProgress {...minimum} className="mb-3" />}
            {hint && !closedLabel && (
                <p className={cn('mb-3 rounded-xl px-3 py-2.5 text-sm font-medium',
                    hintIsError ? 'border border-[var(--site-error-line)] bg-[var(--site-error-bg)] text-[var(--site-error)]' : 'bg-[var(--site-raised)]')}>
                    {hint}
                </p>
            )}
            {closedLabel ? (
                <div role="status" className="flex min-h-[60px] w-full items-center justify-center gap-2 rounded-full border border-dashed border-[var(--site-border-strong)] px-4 text-center text-[15px] font-semibold">
                    <Clock className="h-4 w-4 shrink-0 text-[var(--site-sub)]" aria-hidden="true" />{closedLabel}
                </div>
            ) : (
                <button type="button" disabled={!canCheckout} onClick={onCheckout}
                    className="flex h-[60px] w-full items-center justify-center rounded-full bg-[var(--site-accent)] text-base font-extrabold text-[var(--site-on-accent)] transition-opacity hover:opacity-90 disabled:opacity-50">
                    Devam et
                </button>
            )}
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
function ClosedCard({ data, onBrowse, slim = false }: { data: OnlineOrdering; onBrowse: () => void; slim?: boolean }) {
    const opens = data.nextOpensAt ? opensText(data.nextOpensAt) : null;
    const eyebrow = data.state === 'paused' ? 'Kısa bir ara' : data.state === 'closed' ? 'Mutfak dinleniyor' : 'Online sipariş';
    const title = data.state === 'disabled' ? 'Online sipariş şu an kapalı.'
        : opens ? `${opens}'de açılıyoruz.`
            : data.state === 'paused' ? 'Kısa bir ara verdik.' : 'Şu an kapalıyız.';
    // İnce şerit (Elit): menü hemen görünsün; ayrıntı sağdaki panelin durum satırında.
    if (slim) {
        return (
            <section role="status" aria-label="Sipariş durumu" className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl bg-[var(--site-paper)] px-4 py-3 text-[var(--site-on-paper)]">
                <Clock className="h-4 w-4 shrink-0 text-[var(--site-accent-on-dark)]" aria-hidden="true" />
                <p className="m-0 min-w-0 flex-1 text-[15px]">
                    <span className="font-semibold">{title}</span>{' '}
                    <span className="text-[var(--site-on-paper-sub)]">{data.state !== 'disabled' ? 'Sepetinizi şimdiden hazırlayabilirsiniz.' : (!opens && data.message) || ''}</span>
                </p>
                {data.restaurantPhone && (
                    <a href={telHref(data.restaurantPhone)}
                        className="flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-white/30 px-3.5 text-sm font-semibold text-[var(--site-on-paper)] no-underline transition-colors hover:bg-white/10">
                        <Phone className="h-3.5 w-3.5" aria-hidden="true" />Ara
                    </a>
                )}
            </section>
        );
    }
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
