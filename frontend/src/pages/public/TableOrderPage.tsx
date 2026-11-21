import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Info, Lock, Moon, UtensilsCrossed, WifiOff, X } from 'lucide-react';
import { publicService } from '@/features/customerSite/api/publicService';
import {
    ORDER_REQUEST_PENDING, TABLE_QR_LOCKED_MESSAGE, type PublicProduct, type PublicSite, type PublicTableInfo, type TableActionResult,
} from '@/features/customerSite/types';
import {
    addLine, changeQuantity, defaultSelections, estimatedSubtotal, itemCount as countItems, pruneUnavailable,
    quantityOf as sumQuantity, selectionNames, setLineNote as setCartLineNote, setMenuUnitPrice, toCartInput,
    type DeliveryCartLine,
} from '@/features/delivery/deliveryCart';
import type { OnlineSetMenu } from '@/features/delivery/types';
import type { TableIbanPayment } from '@/features/customerSite/tableIbanPayment';
import { getApiErrorMessage } from '@/lib/apiError';
import { cn } from '@/lib/utils';
import IbanPaySheet from './components/IbanPaySheet';
import { customerFontsHref, customerRootStyle, opensText } from './customerTheme';
import { resolveDesign } from './site/siteTheme';
import { EliteFlowStyle } from './site/elite/EliteFlowStyle';
import QrCart from './qrMenu/QrCart';
import QrFilterSheet from './qrMenu/QrFilterSheet';
import QrHome, { CATEGORY_STRIP_ANCHOR } from './qrMenu/QrHome';
import QrItemDetail from './qrMenu/QrItemDetail';
import { QrBrandContext } from './qrMenu/qrBrand';
import { clearTableCart, loadTableCart, saveTableCart, setLineTakeaway, tableLineKey } from './qrMenu/qrCartStore';
import {
    activeFilterCount, buildCategories, DEFAULT_FILTERS, featuredItems, popularItems, type BindItem, type QrFilters, type QrItem,
} from './qrMenu/qrModel';
import { buildPaymentMethods } from './qrMenu/qrPayments';
import { AccountTab, BottomBar, EmptyMenu, type BarToast, type QrTab } from './qrMenu/QrTabs';
import { formatPrice } from '@/lib/format';
import { column, displayTitle, focusRing, outlineButton, primaryButton } from './qrMenu/qrUi';
import { useTableOrderRequests } from './useTableOrderRequests';
import { useTableAction } from './useTableAction';
import { useDelayedAction } from './qrMenu/tableAction';
import { useTableBill } from './useTableBill';

// Adres çubuğundaki sekme adı (?sekme=sepet, ?sekme=hesap); menü sekmesinde parametre yok. Eski "Siparişlerim"
// bağlantısı (?sekme=siparislerim) Hesabım'ı, eski sepet katmanı (?sepet=1) Sepetim'i, eski "Masa İşlemleri"
// (?sekme=masa) menüyü açar.
const TAB_PARAMS: Record<Exclude<QrTab, 'menu'>, string> = { cart: 'sepet', account: 'hesap' };
const parseTab = (value: string | null, legacyCart: boolean): QrTab =>
    value === TAB_PARAMS.account || value === 'siparislerim' ? 'account'
        : value === TAB_PARAMS.cart || legacyCart ? 'cart' : 'menu';

/** "Sepete eklendi" şeridinin görünme süresi. */
const TOAST_MS = 1800;

// Tarayıcının bağlantı durumu (çevrimdışı uyarısı ve bağlantı gelince menüyü tazelemek için).
const subscribeOnline = (onChange: () => void) => {
    window.addEventListener('online', onChange);
    window.addEventListener('offline', onChange);
    return () => {
        window.removeEventListener('online', onChange);
        window.removeEventListener('offline', onChange);
    };
};
const useOnline = () => useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);

/** Saklanan sepet satırlarını güncel menüyle eşler: fiyat ve ad menüden; menüde olmayan ya da tükenenler düşer. */
function restoreLines(lines: DeliveryCartLine[], site: PublicSite): { lines: DeliveryCartLine[]; removed: number } {
    const pruned = pruneUnavailable(lines, site.categories, site.setMenus ?? []);
    const products = new Map(site.categories.flatMap(c => c.products).map(p => [p.id, p]));
    const menus = new Map((site.setMenus ?? []).map(m => [m.id, m]));
    return {
        removed: pruned.removed,
        lines: pruned.lines.map(line => {
            const product = line.productId ? products.get(line.productId) : undefined;
            if (line.kind === 'product' && product) return { ...line, name: product.name, unitPrice: product.price };
            const menu = line.setMenuId ? menus.get(line.setMenuId) : undefined;
            if (line.kind === 'setMenu' && menu) {
                return { ...line, name: menu.name, unitPrice: setMenuUnitPrice(menu, line.selections), selectionNames: selectionNames(menu, line.selections) };
            }
            return line;
        }),
    };
}

// Masadaki QR kodun açtığı sayfa (qrMenu/). Alt çubuk: Menü, Sepetim ve Hesabım sekmeleri, Garson Çağır düğmesi
// (admin'in QR ayarlarına göre; onay penceresi yok, sonuç düğmede ve kısa şeritte yazar). "Hesap iste" Hesabım'da. Menü: başlık
// (logo), arama + süzgeç ve kategori şeridi hep yerinde; "Tümü" "Öne Çıkanlar", "Popüler Lezzetler", hazır menüler ve
// kategorileri, bir kategori aynı sayfada yalnız kendi kalemlerini gösterir. Seçili kategori (?kategori=), ürün/menü
// ayrıntısı (?urun=) ve sekme (?sekme=sepet|hesap) adres çubuğunda durur, telefonun geri tuşu bir adım geri götürür. Hesabım:
// masanın ortak hesabı (useTableBill), Hesap iste, ödeme yöntemleri (qrPayments), bu telefondan gönderilen talepler ve
// garsonun kararı (useTableOrderRequests yoklaması). Kalem başına "Paket olsun" (ayrıntıda ve sepette): garson, kasa ve mutfakta "PAKET" yazar.
// Sepet telefonda saklanır (qrCartStore: yenileyince geri gelir), garsona gönderilir, garson onaylayınca mutfağa
// gider. Ekleme geri bildirimi pencere değil: "+" → "✓", sepet çubuğu nabzı ve alttan kısa "Sepete eklendi" şeridi.
// Restoran kapalıyken menü yalnız göz atmalıktır.
// Paylaşımlı masa: QR'ı okutan her telefon sipariş verir (garson onayıyla) ve masanın açık hesabını görür; "Gönderdiğim
// siparişler" telefona özeldir. Personel masada QR siparişini kilitleyebilir: menü, garson çağırma, hesap isteme ve hesap
// açık kalır, sepet ve gönderim kapanır.
// Renkler sitenin temasından (--site-*): vurgu düğmeler ve seçili çipler, kartlar ve zemin temanın açık tonları.
export default function TableOrderPage() {
    const { tableId = '' } = useParams();
    const [params, setParams] = useSearchParams();
    const navigate = useNavigate();
    const location = useLocation();
    const tab = parseTab(params.get('sekme'), params.get('sepet') === '1');
    const categoryId = tab === 'menu' ? params.get('kategori') : null;
    const itemKey = params.get('urun');

    const [table, setTable] = useState<(PublicTableInfo & { ibanPayment?: TableIbanPayment | null }) | null>(null);
    const [site, setSite] = useState<PublicSite | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [loadTick, setLoadTick] = useState(0);
    const [cart, setCart] = useState<DeliveryCartLine[]>([]);
    const [orderNote, setOrderNote] = useState('');
    const [sending, setSending] = useState(false);
    const [sendError, setSendError] = useState<string | null>(null);
    const [sentId, setSentId] = useState<string | null>(null);
    const [ibanOpen, setIbanOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [filters, setFilters] = useState<QrFilters>(DEFAULT_FILTERS);
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [toast, setToast] = useState<BarToast | null>(null);
    const toastTimer = useRef<number | undefined>(undefined);
    const showToast = useCallback((text: string, kind: BarToast['kind'] = 'cart') => {
        window.clearTimeout(toastTimer.current);
        setToast(prev => ({ id: (prev?.id ?? 0) + 1, text, kind }));
        toastTimer.current = window.setTimeout(() => setToast(null), kind === 'info' ? TOAST_MS * 2 : TOAST_MS);
    }, []);
    // Saklanan sepetten düşen kalemler için bir kerelik not.
    const [cartNote, setCartNote] = useState<string | null>(null);
    // Saklanan sepet ilk yüklemede bir kez okunur; okunmadan önce boş sepet depoya yazılmaz.
    const cartRestored = useRef(false);
    const online = useOnline();
    const { requests, addRequest } = useTableOrderRequests(tableId);
    const pendingRequests = requests.some(r => r.status === ORDER_REQUEST_PENDING);
    const tableBill = useTableBill(tableId, table?.qrOrderingLocked, pendingRequests);

    const callWaiterRun = useCallback(() => publicService.callWaiter(tableId), [tableId]);
    const billRequestRun = useCallback(() => publicService.requestBill(tableId), [tableId]);
    // Sonuç alt çubuğun üstündeki kısa şeritte: kime haber verildiği, hesapta masa toplamı.
    const regionName = table?.regionName ?? '';
    const onWaiterCalled = useCallback((result: TableActionResult) => showToast(result.sent
        ? `Garson çağrıldı${regionName ? ` · ${regionName} bölümüne haber verildi` : ''}`
        : 'Garson az önce çağrıldı, birazdan gelir', 'info'), [showToast, regionName]);
    const onBillRequested = useCallback((result: TableActionResult) => showToast(
        `${result.sent ? 'Hesap istendi' : 'Hesap az önce istendi'}${result.billTotal ? ` · Masa toplamı ${formatPrice(result.billTotal)} ₺` : ''}`,
        'info'), [showToast]);
    // Garson çağır 3 sn geri sayar (yanlışlıkla dokunmaya karşı); iptal edilmezse gönderilir. Hesap iste hemen gider.
    const callWaiter = useDelayedAction(useTableAction(callWaiterRun, 'Garson çağrılamadı. Lütfen tekrar deneyin.', onWaiterCalled));
    const billRequest = useTableAction(billRequestRun, 'Hesap istenemedi. Lütfen tekrar deneyin ya da garsona haber verin.', onBillRequested);
    // "IBAN ile öde"deki tutar: son "Hesap iste"nin bildirdiği masa toplamı (bekleme süresi bitince de hatırlanır).
    const [lastBillTotal, setLastBillTotal] = useState<number | null>(null);
    const reportedBillTotal = billRequest.state.status === 'done' ? billRequest.state.billTotal : null;
    if (reportedBillTotal != null && reportedBillTotal !== lastBillTotal) setLastBillTotal(reportedBillTotal);

    useEffect(() => {
        let cancelled = false;
        publicService.getTable(tableId)
            .then(async info => {
                const siteData = await publicService.getSite(info.branchId);
                if (cancelled) return;
                setTable(info);
                setSite(siteData);
                setLoadError(null);
                if (cartRestored.current) {
                    // Tazeleme: menüden kalkan ya da tükenen kalemler sepetten düşer.
                    setCart(prev => pruneUnavailable(prev, siteData.categories, siteData.setMenus ?? []).lines);
                } else {
                    cartRestored.current = true;
                    const stored = loadTableCart(tableId, info.branchId);
                    if (stored) {
                        const restored = restoreLines(stored.lines, siteData);
                        setCart(restored.lines);
                        setOrderNote(stored.note);
                        if (restored.removed > 0) {
                            setCartNote(restored.removed === 1
                                ? 'Sepetinizdeki bir ürün artık menüde yok ya da tükendi; sepetten çıkarıldı.'
                                : `Sepetinizdeki ${restored.removed} ürün artık menüde yok ya da tükendi; sepetten çıkarıldı.`);
                        }
                    }
                }
            })
            .catch(err => {
                if (!cancelled) setLoadError(getApiErrorMessage(err, 'İnternet bağlantınızı kontrol edip tekrar deneyin. Sorun sürerse garsona haber verin.'));
            });
        return () => { cancelled = true; };
    }, [tableId, loadTick]);

    // Sepet her değişince telefonda saklanır (boşalınca silinir).
    const branchId = table?.branchId;
    useEffect(() => {
        if (branchId && cartRestored.current) saveTableCart(tableId, branchId, cart, orderNote);
    }, [tableId, branchId, cart, orderNote]);

    useEffect(() => () => window.clearTimeout(toastTimer.current), []);

    const categories = useMemo(() => site ? buildCategories(site) : [], [site]);
    const itemsByKey = useMemo(() => new Map(categories.flatMap(c => c.items).map(item => [item.key, item])), [categories]);
    // Sepet satırlarının küçük görselleri ve yer tutucuları: ürün ya da menü kimliği → kalem.
    const itemsById = useMemo(() => new Map(categories.flatMap(c => c.items).map(item => [item.id, item])), [categories]);

    // ── Gezinme (adres çubuğu) ──────────────────────────────────────────────────────────────
    const homeScroll = useRef(0);

    const pushParams = (patch: Record<string, string | null>, replace = false, state?: unknown) => {
        const next = new URLSearchParams(params);
        next.delete('ekran'); // eski karşılama/menü ayrımı
        for (const [key, value] of Object.entries(patch)) {
            if (value == null) next.delete(key); else next.set(key, value);
        }
        setParams(next, { replace, state });
    };
    // Sekme menünün üstüne mi eklendi (geri: menü)? Doğrudan ?sekme= adresiyle açılan sekmede geçmişte menü yok;
    // orada "Menü" geri gitmez, adresi değiştirir (yoksa siteden çıkılırdı).
    const menuBelow = (location.state as { menuBelow?: boolean } | null)?.menuBelow === true;
    // Bir adım geri: sayfa içinde açıldıysa tarayıcı geçmişi, doğrudan bu adresle açıldıysa üst görünüm.
    const goBack = (fallback: Record<string, string | null>) => {
        if (location.key !== 'default') navigate(-1);
        else pushParams(fallback, true);
    };

    const rememberHomeScroll = () => { if (tab === 'menu' && !categoryId) homeScroll.current = window.scrollY; };
    // Kategori aynı sayfada süzülür. "Tümü"den bir kategoriye geçiş geçmişe eklenir (geri tuşu "Tümü"ne döner),
    // kategoriler arası geçiş yer değiştirir; "Tümü" bir adım geri gider.
    const selectCategory = (id: string | null) => {
        if (id === categoryId) return;
        if (id == null) goBack({ kategori: null });
        else if (categoryId) pushParams({ kategori: id }, true);
        else {
            rememberHomeScroll();
            pushParams({ kategori: id });
        }
    };
    const openItem = (item: QrItem) => pushParams({ urun: item.key });
    const closeItem = () => goBack({ urun: null });
    const selectTab = (next: QrTab) => {
        if (next === tab) {
            if (next === 'menu' && categoryId) goBack({ kategori: null });
            else window.scrollTo({ top: 0 });
            return;
        }
        rememberHomeScroll();
        // Sepetim'den ayrılınca gönderim onayı kapanır; dönünce yeniden sepet görünür.
        if (tab === 'cart') setSentId(null);
        // Menüden ayrılırken geçmişe eklenir (geri tuşu menüye döner); sekmeler arasında yer değiştirir.
        const patch = { sekme: next === 'menu' ? null : TAB_PARAMS[next], kategori: null, urun: null, sepet: null };
        if (next === 'menu' && menuBelow) navigate(-1);
        else if (tab === 'menu') pushParams(patch, false, { menuBelow: true });
        else pushParams(patch, true, menuBelow ? { menuBelow: true } : undefined);
    };

    // Başka sekmeye girince sayfa başı; "Tümü"ne dönünce kalınan yer. Kategori seçilince şerit üste yapışmışsa liste
    // şeridin hemen altından başlar, değilse sayfa yerinde kalır (başlık ve arama görünür).
    const firstView = useRef(true);
    useLayoutEffect(() => {
        if (firstView.current) { firstView.current = false; return; }
        if (tab !== 'menu') { window.scrollTo({ top: 0 }); return; }
        if (!categoryId) { window.scrollTo({ top: homeScroll.current }); return; }
        const anchor = document.getElementById(CATEGORY_STRIP_ANCHOR);
        if (!anchor) return;
        const stripTop = anchor.getBoundingClientRect().top + window.scrollY;
        if (window.scrollY > stripTop) window.scrollTo({ top: stripTop });
    }, [tab, categoryId]);

    const retryLoad = () => { setLoadError(null); setLoadTick(t => t + 1); };

    // Bağlantı geri gelince masa ve menü yeniden okunur: açılamadıysa ekran kendiliğinden açılır, açıksa eski menü
    // yerinde kalarak tazelenir (tükenenler güncellenir, sepetten düşer).
    useEffect(() => {
        const onOnline = () => { setLoadError(null); setLoadTick(t => t + 1); };
        window.addEventListener('online', onOnline);
        return () => window.removeEventListener('online', onOnline);
    }, []);

    // ── Sepet ───────────────────────────────────────────────────────────────────────────────
    const lines = cart;
    const itemCount = countItems(lines);
    const total = estimatedSubtotal(lines);
    const pendingCount = requests.filter(r => r.status === ORDER_REQUEST_PENDING).length;

    // Aynı ürün farklı notla ya da "Paket olsun"la ayrı satır olur (tableLineKey).
    const addProduct = (product: PublicProduct, quantity = 1, note = '', takeaway = false) => {
        if (product.isOutOfStock) return;
        const line = {
            kind: 'product' as const, productId: product.id, name: product.name, unitPrice: product.price, note, selections: {},
            selectionNames: [], takeaway,
        };
        setCart(prev => addLine(prev, { ...line, key: tableLineKey(line) }, quantity));
        setCartNote(null);
        showToast(`${quantity > 1 ? `${quantity} × ` : ''}${product.name}${takeaway ? ' (paket)' : ''} sepete eklendi`);
    };

    // Paket siparişle aynı: aynı seçim, not ve paket işaretli menüler tek satırda toplanır.
    const addSetMenu = (menu: OnlineSetMenu, selections: Record<string, string>, quantity: number, note: string, takeaway = false) => {
        if (!menu.isAvailable) return;
        const line = {
            kind: 'setMenu' as const, setMenuId: menu.id, name: menu.name, unitPrice: setMenuUnitPrice(menu, selections),
            note, selections, selectionNames: selectionNames(menu, selections), takeaway,
        };
        setCart(prev => addLine(prev, { ...line, key: tableLineKey(line) }, quantity));
        setCartNote(null);
        showToast(`${quantity > 1 ? `${quantity} × ` : ''}${menu.name}${takeaway ? ' (paket)' : ''} sepete eklendi`);
    };

    // Karttaki "+": ürün doğrudan eklenir; seçimli menü ayrıntıyı açar, seçimsiz menü varsayılanlarla eklenir.
    // false: eklenmedi (ayrıntı açıldı), "+" onay işaretine dönmez.
    const quickAdd = (item: QrItem): boolean => {
        if (item.product) {
            addProduct(item.product);
            return true;
        }
        if (!item.menu) return false;
        // "+" her zaman doğrudan ekler: seçimli menüde her bölümün varsayılan seçeneğiyle. Başka seçim için ürüne dokunup
        // detaydan eklenir (sepette de satır ayrı görünür).
        addSetMenu(item.menu, defaultSelections(item.menu), 1, '');
        return true;
    };

    // Gönderim "tükendi" gibi bir nedenle reddedilirse menü tazelenir; tükenen ürünler ve menüler sepetten düşer.
    const refreshMenu = async (branchId: string) => {
        try {
            const fresh = await publicService.getSite(branchId);
            setSite(fresh);
            setCart(prev => pruneUnavailable(prev, fresh.categories, fresh.setMenus ?? []).lines);
        } catch { /* eski menüyle devam */ }
    };

    const send = async () => {
        if (lines.length === 0 || sending || !table) return;
        setSending(true);
        setSendError(null);
        try {
            const result = await publicService.createOrderRequest(
                tableId,
                toCartInput(lines).map((line, i) => ({ ...line, note: line.note ?? '', isTakeaway: lines[i].takeaway === true })),
                orderNote.trim()
            );
            addRequest({
                id: result.id,
                status: result.status,
                total,
                items: lines.map(line => ({
                    name: line.selectionNames.length > 0 ? `${line.name} (${line.selectionNames.join(', ')})` : line.name,
                    quantity: line.quantity,
                    productId: line.productId,
                    setMenuId: line.setMenuId,
                    takeaway: line.takeaway === true,
                })),
            });
            tableBill.refresh();
            setCart([]);
            setOrderNote('');
            clearTableCart(tableId);
            setSentId(result.id);
        } catch (err) {
            const message = getApiErrorMessage(err, 'Sipariş gönderilemedi. Lütfen tekrar deneyin ya da garsona haber verin.');
            setSendError(message);
            // Personel bu arada masada QR siparişini kilitlemiş olabilir: durum yeniden sorulur.
            if (message === TABLE_QR_LOCKED_MESSAGE) tableBill.refresh();
            void refreshMenu(table.branchId);
        } finally {
            setSending(false);
        }
    };

    const root = (children: ReactNode) => (
        // Elit: köşesiz, ince serif giydirme (rb-el-flow); renkler temanın değişkenlerinden.
        <div style={customerRootStyle(site?.site)} data-site-design={resolveDesign(site?.site.design)}
            className={cn('min-h-screen overflow-x-clip bg-[var(--site-bg)] text-[var(--site-text)] selection:bg-[var(--site-accent-soft)]', resolveDesign(site?.site.design) === 'elit' && 'rb-el-flow')}>
            <EliteFlowStyle design={site?.site.design} />
            <link rel="stylesheet" href={customerFontsHref(site?.site)} precedence="default" />
            {children}
        </div>
    );

    if (loadError) {
        return root(
            <main className={cn(column, 'flex min-h-screen flex-col justify-center px-5 py-8')}>
                <span aria-hidden="true" className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--site-accent-soft)] text-[var(--site-accent-text)]">
                    {online ? <UtensilsCrossed className="h-6 w-6" /> : <WifiOff className="h-6 w-6" />}
                </span>
                <h1 className={cn(displayTitle, 'mt-5 text-[32px]')}>{online ? 'Menü açılamadı' : 'İnternet bağlantısı yok'}</h1>
                <p className="m-0 mt-2 text-base leading-relaxed text-[var(--site-sub)]">
                    {online ? loadError : 'Telefonunuzun internet bağlantısını açın; bağlantı gelince menü kendiliğinden açılır.'}
                </p>
                <button type="button" onClick={retryLoad} className={cn(primaryButton, 'mt-7 w-full')}>Tekrar dene</button>
                <Link to="/menu" className={cn(outlineButton, 'mt-3 w-full no-underline')}>Restoranın menüsünü aç</Link>
                <p className="m-0 mt-2 text-center text-[13px] text-[var(--site-muted)]">QR eski olabilir.</p>
            </main>
        );
    }

    if (!table || !site) {
        return root(
            <main className={cn(column, 'flex flex-col gap-4 px-4 pt-4')} aria-busy="true" aria-label="Menü yükleniyor">
                <div className="flex items-center gap-3">
                    <div className="h-12 w-12 animate-pulse rounded-full bg-[var(--site-alt)] motion-reduce:animate-none" />
                    <div className="h-5 w-40 animate-pulse rounded-full bg-[var(--site-alt)] motion-reduce:animate-none" />
                </div>
                <div className="h-12 animate-pulse rounded-2xl bg-[var(--site-alt)] motion-reduce:animate-none" />
                <div className="h-[168px] animate-pulse rounded-[20px] bg-[var(--site-alt)] motion-reduce:animate-none" />
                <div className="grid grid-cols-2 gap-3">
                    <div className="h-[190px] animate-pulse rounded-2xl bg-[var(--site-alt)] motion-reduce:animate-none" />
                    <div className="h-[190px] animate-pulse rounded-2xl bg-[var(--site-alt)] motion-reduce:animate-none" />
                </div>
            </main>
        );
    }

    const features = table.qrFeatures;
    const restaurant = site.companyName || site.branchName;
    const subtitle = site.companyName && site.branchName && site.branchName !== site.companyName
        ? site.branchName : [site.district, site.city].filter(Boolean).join(', ');
    const closed = site.isOpenNow === false;
    const reopen = opensText(site.site.opensAt);
    // Personel masada QR siparişini kilitledi: menü göz atmalık, sepet ve gönderim kapalı (sunucu da reddeder).
    const qrLocked = tableBill.locked;
    const canOrder = features.orderingEnabled && !closed && !qrLocked;
    const blockedReason = canOrder ? null
        : closed ? `Restoran şu an kapalı${reopen ? `, ${reopen} açılıyor` : ''}. Sipariş gönderilemez.`
            : !features.orderingEnabled ? 'Bu masadan telefonla sipariş kapalı. Siparişinizi garsona verebilirsiniz.'
                : TABLE_QR_LOCKED_MESSAGE;
    // Masanın ortak hesabı: açık hesap masadaki her telefonda; ödenen hesap yalnız ona sipariş veren telefonlarda (sunucu süzer).
    const bill = tableBill.bill?.hasBill ? tableBill.bill : null;
    const openBill = bill && !bill.isPaid ? bill : null;
    const waiterAction = features.callWaiterEnabled ? callWaiter : null;
    const billAction = features.billRequestEnabled ? billRequest : null;
    const sent = sentId ? requests.find(r => r.id === sentId) ?? null : null;
    const ibanPayment = table.ibanPayment ?? null;
    const paymentMethods = buildPaymentMethods({ onIban: ibanPayment ? () => setIbanOpen(true) : null });
    const tableLabel = table.regionName ? `${table.name} · ${table.regionName}` : table.name;
    const filterCount = activeFilterCount(filters);
    // Eski sunucu bu alanları göndermezse: öne çıkanlar açık (bugünkü davranış), popüler kapalı.
    const featured = features.featuredSectionEnabled !== false ? featuredItems(categories) : [];
    const popular = features.popularSectionEnabled ? popularItems(categories, table.popularProductIds) : [];
    const detailItem = itemKey ? itemsByKey.get(itemKey) ?? null : null;
    const category = categoryId ? categories.find(c => c.id === categoryId) ?? null : null;
    const showCartBar = tab === 'menu' && canOrder && itemCount > 0;

    const bind: BindItem = item => {
        const matches = (l: (typeof cart)[number]) => item.kind === 'product' ? l.productId === item.id : l.setMenuId === item.id;
        const quantity = sumQuantity(cart, matches);
        return {
            quantity,
            onOpen: () => openItem(item),
            onAdd: canOrder && !item.soldOut ? () => quickAdd(item) : null,
            // Kartta "−": aynı ürünün birden çok satırı olabilir (not, paket, menü seçimi); en son eklenenden bir düşer.
            onRemove: quantity > 0 ? () => setCart(prev => {
                const last = [...prev].reverse().find(matches);
                return last ? changeQuantity(prev, last.key, -1) : prev;
            }) : null,
        };
    };

    const statusNotice = !online ? (
        <Notice icon={<WifiOff className="h-4 w-4" />}>
            <b className="font-extrabold">Bağlantı yok.</b> Menüye göz atabilirsiniz; sipariş göndermek ve garson çağırmak için internet gerekir.
        </Notice>
    ) : closed ? (
        <Notice icon={<Moon className="h-4 w-4" />}>
            <b className="font-extrabold">Mutfak kapandı.</b> {reopen ? `Restoran ${reopen} açılıyor. ` : ''}Menüye göz atabilirsiniz, sipariş şu an gönderilemez.
        </Notice>
    ) : !features.orderingEnabled ? (
        <Notice icon={<UtensilsCrossed className="h-4 w-4" />}>Siparişinizi garsona verebilirsiniz; menü yalnız göz atmak için.</Notice>
    ) : qrLocked ? (
        <Notice icon={<Lock className="h-4 w-4" />}>{TABLE_QR_LOCKED_MESSAGE}</Notice>
    ) : null;
    const notice = (
        <>
            {statusNotice}
            {cartNote && (
                <Notice icon={<Info className="h-4 w-4" />} onDismiss={() => setCartNote(null)}>{cartNote}</Notice>
            )}
        </>
    );

    const content: ReactNode = tab === 'account' ? (
        <AccountTab tableName={table.name} regionName={table.regionName} bill={bill} requests={requests}
            onOpenMenu={() => selectTab('menu')} billRequest={billAction} callWaiter={waiterAction} paymentMethods={paymentMethods} />
    ) : tab === 'cart' ? (
        <QrCart
            tableLabel={tableLabel}
            lines={lines}
            total={total}
            itemsById={itemsById}
            orderNote={orderNote}
            onOrderNote={setOrderNote}
            onChange={(key, delta) => setCart(prev => changeQuantity(prev, key, delta))}
            onRemove={key => setCart(prev => prev.filter(l => l.key !== key))}
            onLineNote={(key, note) => setCart(prev => setCartLineNote(prev, key, note))}
            onLineTakeaway={(key, takeaway) => setCart(prev => setLineTakeaway(prev, key, takeaway))}
            onSend={send}
            sending={sending}
            sendError={sendError}
            blockedReason={blockedReason ?? (online ? null : 'Bağlantı yok. İnternet gelince siparişi gönderebilirsiniz.')}
            sent={sent}
            onBack={() => selectTab('menu')}
            onAccount={() => selectTab('account')}
            callWaiter={waiterAction}
        />
    ) : (
        <QrHome restaurant={restaurant} subtitle={subtitle} tableName={table.name} regionName={table.regionName} categories={categories}
            categoryId={category?.id ?? null} onSelectCategory={selectCategory}
            featured={featured} popular={popular}
            query={query} onQuery={setQuery} filters={filters} filterCount={filterCount} onOpenFilters={() => setFiltersOpen(true)}
            onClearFilters={() => setFilters(DEFAULT_FILTERS)} bind={bind} notice={notice}
            empty={<EmptyMenu callWaiter={waiterAction} />} />
    );

    return root(
        <QrBrandContext.Provider value={{ name: restaurant, logoUrl: site.site.logoUrl ?? '' }}>
            {/* Sepetim ve Hesabım alt boşluğunu kendi verir (yapışık panel alt çubuğun arkasına kadar iner). */}
            <main className={tab === 'cart' || tab === 'account' ? undefined : showCartBar ? 'pb-[calc(148px+env(safe-area-inset-bottom))]' : 'pb-[calc(96px+env(safe-area-inset-bottom))]'}>
                {content}
            </main>

            <BottomBar tab={tab} onTab={selectTab} cartCount={itemCount} pendingCount={pendingCount}
                cart={showCartBar ? { count: itemCount, total, onOpen: () => selectTab('cart') } : null} toast={toast}
                callWaiter={waiterAction} />

            {detailItem && (
                <QrItemDetail
                    key={detailItem.key}
                    item={detailItem}
                    onClose={closeItem}
                    blockedReason={blockedReason}
                    onAddProduct={(product, quantity, note, takeaway) => { addProduct(product, quantity, note, takeaway); closeItem(); }}
                    onAddSetMenu={(menu, selections, quantity, note, takeaway) => { addSetMenu(menu, selections, quantity, note, takeaway); closeItem(); }}
                />
            )}

            {filtersOpen && (
                <QrFilterSheet filters={filters} onChange={setFilters} onClose={() => setFiltersOpen(false)} />
            )}

            {ibanOpen && ibanPayment && (
                <IbanPaySheet payment={ibanPayment} tableName={table.name} amount={openBill?.remaining ?? (bill?.isPaid ? null : lastBillTotal)} onClose={() => setIbanOpen(false)} />
            )}
        </QrBrandContext.Provider>
    );
}

function Notice({ icon, children, onDismiss }: { icon: ReactNode; children: ReactNode; onDismiss?: () => void }) {
    return (
        <div role="status" className="mt-3 flex items-start gap-3 rounded-2xl bg-[var(--site-alt)] py-3 pl-4 pr-1 text-sm leading-relaxed text-[var(--site-text)]">
            <span aria-hidden="true" className="mt-0.5 shrink-0 text-[var(--site-accent-text)]">{icon}</span>
            <p className="m-0 min-w-0 flex-1 pr-3">{children}</p>
            {onDismiss && (
                <button type="button" onClick={onDismiss} aria-label="Bildirimi kapat"
                    className={cn('-my-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[var(--site-sub)]', focusRing)}>
                    <X className="h-4 w-4" aria-hidden="true" />
                </button>
            )}
        </div>
    );
}
