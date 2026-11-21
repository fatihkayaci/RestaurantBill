import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, BellRing, Check, ClipboardList, Landmark, Minus, Moon, Plus, Receipt, UtensilsCrossed, X } from 'lucide-react';
import { publicService } from '@/features/customerSite/api/publicService';
import {
    ORDER_REQUEST_APPROVED, ORDER_REQUEST_PENDING, ORDER_REQUEST_REJECTED, TABLE_LOCKED_MESSAGE, canReserveOnline, type PublicProduct,
    type PublicSite, type PublicTableInfo,
} from '@/features/customerSite/types';
import {
    addLine, changeQuantity, defaultSelections, removeOneSetMenu, estimatedSubtotal, itemCount as countItems, productKey, pruneUnavailable,
    quantityOf as sumQuantity, selectionNames, setLineNote as setCartLineNote, setMenuKey, setMenuUnitPrice, toCartInput,
    type DeliveryCartLine,
} from '@/features/delivery/deliveryCart';
import type { OnlineSetMenu } from '@/features/delivery/types';
import type { TableIbanPayment } from '@/features/customerSite/tableIbanPayment';
import { getApiErrorMessage } from '@/lib/apiError';
import { formatPrice } from '@/lib/format';
import { cn } from '@/lib/utils';
import IbanPaySheet from './components/IbanPaySheet';
import MyOrdersSheet from './components/MyOrdersSheet';
import TableLanding, { TableActionConfirmation, type TableActionKind } from './components/TableLanding';
import { TableBadge } from './components/TableBadge';
import { customerFontsHref, customerRootStyle, opensText } from './customerTheme';
import DeliveryMenu from './delivery/DeliveryMenu';
import DeliverySetMenuSheet from './delivery/DeliverySetMenuSheet';
import { ImageSlot } from './site/SiteChrome';
import { serif } from './site/siteParts';
import { resolveDesign } from './site/siteTheme';
import { EliteFlowStyle } from './site/elite/EliteFlowStyle';
import {
    accentItalic, closeCircle, creamBox, displayTitle, eyebrowAccent, fieldClass, heroBox, heroEyebrow, heroPattern, pillAccent, pillDark,
    pillOutline, sheetBackdrop, sheetPanel, stepperMinus, stepperPlus, stepperWrap,
} from './table/tableUi';
import { useTableOrderRequests, type SentOrderRequest } from './useTableOrderRequests';
import { useTableAction } from './useTableAction';
import { useTableBill } from './useTableBill';

/** Seçim yapılacak bölümü yok (tüm bölümler tek seçenekli): pencere açılmadan doğrudan eklenir. */
const hasChoices = (menu: OnlineSetMenu) => menu.slots.some(slot => !slot.isFixed && slot.options.length > 1);

// Masadaki QR kodun açtığı sayfa (görünüm: "Renkli ve sıcak", sınıflar table/tableUi.ts). İlk ekran karşılama: sitenin kapağı, tek ana eylem (menü), garson + hesap.
// Menüde (?ekran=menu) paket sipariş menüsünün kartları (DeliveryMenu) kullanılır; menüler (set) de listelenir: seçimi
// olmayan menü doğrudan eklenir, seçimli menü paket siparişin seçim penceresini (DeliverySetMenuSheet) açar. Sepet satırları
// paket sepetiyle aynı biçimdedir (deliveryCart). Sepet garsona gönderilir, garson
// onaylayınca mutfağa gider. Gönderimden sonra tam ekran "Siparişiniz garsonda" onayı açılır ve talebin durumunu
// (useTableOrderRequests yoklaması) canlı gösterir. Restoran kapalıyken (isOpenNow=false) menü yalnız göz atmalıktır.
// Telefonun geri tuşu ve menüdeki geri düğmesi karşılamaya döner; sepet korunur.
// Masa sahibi telefon (useTableBill): QR'ı okutan herkes menüyü görür, garson çağırır ve hesap ister; ilk sipariş talebini
// gönderen telefon masayı tutar. Yalnız o telefon sipariş verir ve "Masanın hesabı"nı görür; diğerlerinde sepet kapalıdır.
export default function TableOrderPage() {
    const { tableId = '' } = useParams();
    const [params, setParams] = useSearchParams();
    const inMenu = params.get('ekran') === 'menu';
    const [table, setTable] = useState<(PublicTableInfo & { ibanPayment?: TableIbanPayment | null }) | null>(null);
    const [site, setSite] = useState<PublicSite | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [loadTick, setLoadTick] = useState(0);
    const [cart, setCart] = useState<DeliveryCartLine[]>([]);
    const [setMenuOpen, setSetMenuOpen] = useState<OnlineSetMenu | null>(null);
    const [orderNote, setOrderNote] = useState('');
    const [cartOpen, setCartOpen] = useState(false);
    const [sending, setSending] = useState(false);
    const [sendError, setSendError] = useState<string | null>(null);
    const [myOrdersOpen, setMyOrdersOpen] = useState(false);
    const [sentId, setSentId] = useState<string | null>(null);
    const [confirm, setConfirm] = useState<TableActionKind | null>(null);
    const [ibanOpen, setIbanOpen] = useState(false);
    const { requests, addRequest } = useTableOrderRequests(tableId);
    const tableBill = useTableBill(tableId, table?.orderLock);

    const callWaiterRun = useCallback(() => publicService.callWaiter(tableId), [tableId]);
    const billRequestRun = useCallback(() => publicService.requestBill(tableId), [tableId]);
    const callWaiter = useTableAction(callWaiterRun, 'Garson çağrılamadı. Lütfen tekrar deneyin.');
    const billRequest = useTableAction(billRequestRun, 'Hesap istenemedi. Lütfen tekrar deneyin ya da garsona haber verin.');
    // "IBAN ile öde"deki tutar: son "Hesap iste"nin bildirdiği masa toplamı (bekleme süresi bitince de hatırlanır).
    const [lastBillTotal, setLastBillTotal] = useState<number | null>(null);
    const reportedBillTotal = billRequest.state.status === 'done' ? billRequest.state.billTotal : null;
    if (reportedBillTotal != null && reportedBillTotal !== lastBillTotal) setLastBillTotal(reportedBillTotal);

    const showView = (menu: boolean) => {
        setParams(menu ? { ekran: 'menu' } : {});
        window.scrollTo(0, 0);
    };

    useEffect(() => {
        let cancelled = false;
        publicService.getTable(tableId)
            .then(async info => {
                const siteData = await publicService.getSite(info.branchId);
                if (cancelled) return;
                setTable(info);
                setSite(siteData);
                setLoadError(null);
            })
            .catch(err => {
                if (!cancelled) setLoadError(getApiErrorMessage(err, 'İnternet bağlantınızı kontrol edip tekrar deneyin. Sorun sürerse garsona haber verin.'));
            });
        return () => { cancelled = true; };
    }, [tableId, loadTick]);

    const retryLoad = () => { setLoadError(null); setLoadTick(t => t + 1); };

    const pendingCount = requests.filter(r => r.status === ORDER_REQUEST_PENDING).length;
    const lines = cart;
    const itemCount = countItems(lines);
    const total = estimatedSubtotal(lines);
    // Sepet satırlarının küçük görselleri: ürünün ya da menünün görseli.
    const images = useMemo(() => new Map<string, string>([
        ...(site?.categories ?? []).flatMap(c => c.products).map(p => [p.id, p.imageUrl] as [string, string]),
        ...(site?.setMenus ?? []).map(m => [m.id, m.imageUrl] as [string, string]),
    ]), [site]);

    const add = (product: PublicProduct) => {
        if (product.isOutOfStock) return;
        setCart(prev => addLine(prev, {
            key: productKey(product.id), kind: 'product', productId: product.id, name: product.name, unitPrice: product.price,
            note: '', selections: {}, selectionNames: [],
        }));
    };

    const remove = (product: PublicProduct) => setCart(prev => changeQuantity(prev, productKey(product.id), -1));

    // Paket siparişle aynı: aynı seçim ve notlu menüler tek satırda toplanır.
    const addSetMenu = (menu: OnlineSetMenu, selections: Record<string, string>, quantity: number, note: string) => {
        const key = setMenuKey(menu.id, selections) + (note ? `:${note}` : '');
        setCart(prev => addLine(prev, {
            key, kind: 'setMenu', setMenuId: menu.id, name: menu.name, unitPrice: setMenuUnitPrice(menu, selections),
            note, selections, selectionNames: selectionNames(menu, selections),
        }, quantity));
        setSetMenuOpen(null);
    };

    const openSetMenu = (menu: OnlineSetMenu) => {
        if (!menu.isAvailable) return;
        if (hasChoices(menu)) setSetMenuOpen(menu);
        else addSetMenu(menu, defaultSelections(menu), 1, '');
    };

    const setLineNote = (key: string, note: string) => setCart(prev => setCartLineNote(prev, key, note));

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
                toCartInput(lines).map(line => ({ ...line, note: line.note ?? '' })),
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
                })),
            });
            tableBill.markMine();
            setCart([]);
            setOrderNote('');
            setCartOpen(false);
            setSentId(result.id);
            window.scrollTo(0, 0);
        } catch (err) {
            const message = getApiErrorMessage(err, 'Sipariş gönderilemedi. Lütfen tekrar deneyin ya da garsona haber verin.');
            setSendError(message);
            // Masa bu arada başka telefona bağlanmış olabilir: durum yeniden sorulur, sepet kapanır.
            if (message === TABLE_LOCKED_MESSAGE) {
                setCartOpen(false);
                void tableBill.refreshLock();
            }
            void refreshMenu(table.branchId);
        } finally {
            setSending(false);
        }
    };

    const runAction = async (kind: TableActionKind) => {
        const action = kind === 'waiter' ? callWaiter : billRequest;
        if (await action.trigger()) setConfirm(kind);
    };

    const root = (children: ReactNode) => (
        // Elit: köşesiz, ince serif giydirme (rb-el-flow); koyu kapak ve krem kutular temanın değişkenlerinden.
        <div style={customerRootStyle(site?.site)} className={cn('min-h-screen overflow-x-clip bg-[var(--site-bg)] text-[var(--site-text)]', resolveDesign(site?.site.design) === 'elit' && 'rb-el-flow')}>
            <EliteFlowStyle design={site?.site.design} />
            <link rel="stylesheet" href={customerFontsHref(site?.site)} precedence="default" />
            {children}
        </div>
    );

    if (loadError) {
        return root(
            <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col justify-center px-2 py-6 sm:px-4">
                <div className={cn(creamBox, 'flex flex-col px-6 py-9 sm:px-9')}>
                    <span aria-hidden="true" className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--site-mustard)] text-[var(--site-text)]">
                        <UtensilsCrossed className="h-6 w-6" />
                    </span>
                    <h1 className={cn(displayTitle, 'mt-6 text-[48px]')}>Menü <em className={accentItalic}>açılamadı.</em></h1>
                    <p className="m-0 mt-3 text-base leading-relaxed text-[var(--site-sub)]">{loadError}</p>
                    <button type="button" onClick={retryLoad} className={cn(pillDark, 'mt-8 w-full')}>
                        Tekrar dene
                    </button>
                    <Link to="/menu" className="mt-3 flex min-h-11 items-center justify-center text-center text-sm font-bold text-[var(--site-sub)] underline underline-offset-4">
                        QR eski olabilir: restoranın menüsünü açın
                    </Link>
                </div>
            </main>
        );
    }

    if (!table || !site) {
        return root(
            <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col gap-2 px-2 pt-2 sm:gap-3 sm:px-4 sm:pt-4" aria-busy="true" aria-label="Menü yükleniyor">
                <div className="h-[340px] animate-pulse rounded-[24px] bg-[var(--site-hero-bg)] opacity-80 motion-reduce:animate-none" />
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                    <div className="h-[120px] animate-pulse rounded-[24px] bg-[var(--site-card)] motion-reduce:animate-none" />
                    <div className="h-[120px] animate-pulse rounded-[24px] bg-[var(--site-card)] motion-reduce:animate-none" />
                </div>
                <div className="h-[220px] animate-pulse rounded-[24px] bg-[var(--site-card)] motion-reduce:animate-none" />
            </main>
        );
    }

    const features = table.qrFeatures;
    const restaurant = site.companyName || site.branchName;
    const closed = site.isOpenNow === false;
    // Masa başka telefona bağlı: menü göz atmalık, sepet ve gönderim kapalı (sunucu da reddeder).
    const lockedOut = tableBill.lock === 'other';
    const canOrder = features.orderingEnabled && !closed && !lockedOut;
    const bill = tableBill.lock === 'mine' && tableBill.bill?.hasBill ? tableBill.bill : null;
    const waiterAction = features.callWaiterEnabled ? callWaiter : null;
    const billAction = features.billRequestEnabled ? billRequest : null;
    const myOrdersButton = requests.length > 0 || !!bill;
    const sent = sentId ? requests.find(r => r.id === sentId) ?? null : null;
    const ibanPayment = table.ibanPayment ?? null;
    const openIban = ibanPayment ? () => setIbanOpen(true) : null;

    const overlays = (
        <>
            {myOrdersOpen && (
                <MyOrdersSheet
                    requests={requests}
                    bill={bill}
                    onClose={() => setMyOrdersOpen(false)}
                    onBackToMenu={inMenu ? undefined : () => showView(true)}
                    onCallWaiter={waiterAction ? () => void runAction('waiter') : undefined}
                />
            )}
            {confirm && (
                <TableActionConfirmation
                    kind={confirm}
                    callWaiter={waiterAction}
                    billRequest={billAction}
                    regionName={table.regionName}
                    onClose={() => setConfirm(null)}
                    onOpenMenu={inMenu ? undefined : () => showView(true)}
                    onAction={kind => void runAction(kind)}
                    onPayByIban={openIban ?? undefined}
                />
            )}
            {ibanOpen && ibanPayment && (
                <IbanPaySheet payment={ibanPayment} tableName={table.name} amount={bill?.remaining ?? lastBillTotal} onClose={() => setIbanOpen(false)} />
            )}
        </>
    );

    if (sent) {
        return root(
            <>
                <SentConfirmation
                    request={sent}
                    site={site}
                    restaurant={restaurant}
                    tableName={table.name}
                    onBackToMenu={() => { setSentId(null); if (!inMenu) showView(true); }}
                    onMyOrders={() => { setSentId(null); setMyOrdersOpen(true); }}
                    onCallWaiter={waiterAction ? () => void runAction('waiter') : undefined}
                />
                {overlays}
            </>
        );
    }

    if (!inMenu) {
        return root(
            <>
                <TableLanding
                    site={site}
                    restaurantName={restaurant}
                    tableName={table.name}
                    regionName={table.regionName}
                    orderingEnabled={features.orderingEnabled && !lockedOut}
                    onOpenMenu={() => showView(true)}
                    callWaiter={waiterAction}
                    billRequest={billAction}
                    onPayByIban={openIban}
                    showDelivery={features.deliveryLinkEnabled && table.acceptsOnlineOrders}
                    deliveryHref={`/siparis?sube=${encodeURIComponent(table.branchId)}`}
                    showReservation={features.reservationLinkEnabled && canReserveOnline(site)}
                    myOrders={myOrdersButton ? { count: requests.length, pendingCount, open: () => setMyOrdersOpen(true), billRemaining: bill?.remaining ?? null } : null}
                    onAction={kind => void runAction(kind)}
                    onShowConfirmation={setConfirm}
                />
                {overlays}
            </>
        );
    }

    const quantityOf = (productId: string) => sumQuantity(cart, l => l.productId === productId);
    const setMenuQuantity = (setMenuId: string) => sumQuantity(cart, l => l.setMenuId === setMenuId);
    const reopen = opensText(site.site.opensAt);
    const showActionBar = !!(waiterAction || billAction || openIban);

    return root(
        <main className={cn('min-h-screen', (canOrder && itemCount > 0) || showActionBar ? 'pb-36' : 'pb-12')}>
            <header className="mx-auto flex w-full max-w-4xl items-center justify-between gap-2 px-3 pb-2 pt-3 sm:px-4 sm:pt-4">
                <div className="flex min-w-0 items-center gap-2.5">
                    <button
                        type="button"
                        onClick={() => showView(false)}
                        aria-label="Karşılama ekranına dön"
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[var(--site-border-mid)] bg-[var(--site-card)] text-[var(--site-text)] transition-colors hover:border-[var(--site-text)]"
                    >
                        <ArrowLeft className="h-5 w-5" aria-hidden="true" />
                    </button>
                    <p className={cn(serif, 'm-0 min-w-0 truncate text-[22px] italic leading-none')}>{restaurant}</p>
                </div>
                {myOrdersButton && (
                    <button
                        type="button"
                        onClick={() => setMyOrdersOpen(true)}
                        aria-label={`${bill ? 'Masanın hesabı' : 'Siparişlerim'}${pendingCount > 0 ? `, ${pendingCount} onay bekliyor` : ''}`}
                        className="flex h-11 shrink-0 items-center gap-2 rounded-full bg-[var(--site-paper)] pl-3.5 pr-2 text-sm font-bold text-[var(--site-on-paper)] transition-opacity hover:opacity-90"
                    >
                        <ClipboardList className="h-4 w-4" aria-hidden="true" />
                        <span className="hidden sm:inline">{bill ? 'Masanın hesabı' : 'Siparişlerim'}</span>
                        <span aria-hidden="true" className={cn('flex h-7 min-w-7 items-center justify-center rounded-full px-1.5 text-[13px] font-extrabold tabular-nums',
                            pendingCount > 0 ? 'bg-[var(--site-mustard)] text-[var(--site-text)]' : 'bg-[rgba(251,244,232,0.15)]')}>
                            {pendingCount > 0 ? pendingCount : bill ? `${formatPrice(bill.remaining)} ₺` : requests.length}
                        </span>
                    </button>
                )}
            </header>

            <div className="mx-auto w-full max-w-4xl px-2 sm:px-4">
                {/* Krem kutu (sticky kategori şeridi için overflow yok); üstünde kapak renginde "Menü" başlığı. */}
                <section aria-labelledby="masa-menu-baslik" className={creamBox}>
                    <div className="relative flex flex-col items-center gap-3 overflow-hidden rounded-t-[24px] bg-[var(--site-hero-bg)] px-5 pb-9 pt-9 text-center text-[var(--site-on-paper)] md:rounded-t-[32px] md:pb-12 md:pt-12">
                        <span aria-hidden="true" className={heroPattern} />
                        <TableBadge tableName={table.name} regionName={table.regionName} className="relative" />
                        <h1 id="masa-menu-baslik" className={cn(displayTitle, 'relative text-[80px] leading-[0.85] tracking-[-0.03em] md:text-[112px]')}>Menü</h1>
                        {canOrder && (
                            <p className="relative m-0 max-w-[340px] text-[15px] font-semibold leading-snug text-[rgba(251,244,232,0.92)]">
                                Seçin, sepete ekleyin; garson onaylayınca mutfağa gider.
                            </p>
                        )}
                    </div>

                    <div className="px-4 pb-4 md:px-6 md:pb-8 lg:px-8">
                        {closed && (
                            <p role="status" className="m-0 mt-4 flex items-start gap-3 rounded-[20px] bg-[var(--site-paper)] p-4 text-sm leading-relaxed text-[var(--site-on-paper-sub)]">
                                <Moon className="mt-0.5 h-4 w-4 shrink-0 text-[var(--site-mustard)]" aria-hidden="true" />
                                <span><b className="font-extrabold text-[var(--site-on-paper)]">Mutfak kapandı.</b> {reopen ? `${reopen} açılıyoruz. ` : ''}Menüye göz atabilirsiniz, sipariş şu an gönderilemez.</span>
                            </p>
                        )}
                        {!features.orderingEnabled && !closed && (
                            <p className="m-0 mt-4 rounded-[20px] bg-[var(--site-bg)] px-4 py-3 text-sm font-semibold">Siparişinizi garsonumuza verebilirsiniz.</p>
                        )}
                        {features.orderingEnabled && !closed && lockedOut && (
                            <p role="status" className="m-0 mt-4 rounded-[20px] bg-[var(--site-bg)] px-4 py-3 text-sm font-semibold leading-relaxed">{TABLE_LOCKED_MESSAGE}</p>
                        )}

                        <DeliveryMenu
                            categories={site.categories}
                            setMenus={site.setMenus ?? []}
                            restaurant={restaurant}
                            productQuantity={quantityOf}
                            setMenuQuantity={setMenuQuantity}
                            onAddProduct={add}
                            onRemoveProduct={remove}
                            onOpenSetMenu={openSetMenu}
                            onRemoveSetMenu={menu => setCart(prev => removeOneSetMenu(prev, menu.id))}
                            featuredSection
                            readOnly={!canOrder}
                            empty={(
                                <div className="flex flex-col items-center py-14 text-center">
                                    <span aria-hidden="true" className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--site-mustard)] text-[var(--site-text)]">
                                        <UtensilsCrossed className="h-6 w-6" />
                                    </span>
                                    <h2 className={cn(displayTitle, 'mt-5 text-[40px] leading-none')}>Menü <em className={accentItalic}>hazırlanıyor.</em></h2>
                                    <p className="m-0 mt-2 max-w-xs text-[15px] leading-relaxed text-[var(--site-sub)]">Online menümüz henüz hazır değil. Garsonumuz basılı menüyü getirsin.</p>
                                    {waiterAction && (
                                        <button type="button" onClick={() => void runAction('waiter')} className={cn(pillDark, 'mt-6 h-12 text-[15px]')}>
                                            <BellRing className="h-4 w-4" aria-hidden="true" />Garson çağır
                                        </button>
                                    )}
                                </div>
                            )}
                        />
                    </div>
                </section>
            </div>

            {((canOrder && itemCount > 0) || showActionBar) && (
                <div className="fixed inset-x-0 bottom-0 z-20 border-t border-[var(--site-border)] bg-[color-mix(in_srgb,var(--site-bg)_95%,transparent)] px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-[14px] sm:px-4">
                    <div className="mx-auto flex max-w-4xl items-center gap-2">
                        {canOrder && itemCount > 0 ? (
                            <>
                                {waiterAction && (
                                    <MenuActionButton label="Garson çağır" icon={<BellRing className="h-5 w-5" />} action={waiterAction}
                                        onClick={() => void runAction('waiter')} onReopen={() => setConfirm('waiter')} iconOnly />
                                )}
                                <button
                                    type="button"
                                    onClick={() => setCartOpen(true)}
                                    className="flex h-[60px] min-w-0 flex-1 items-center justify-between gap-3 rounded-full bg-[var(--site-paper)] pl-2 pr-6 text-[var(--site-on-paper)] shadow-[0_16px_40px_-12px_rgba(36,24,15,0.45)] transition-opacity hover:opacity-90"
                                >
                                    <span className="flex min-w-0 items-center gap-3 text-base font-bold">
                                        <span className="flex h-11 min-w-11 items-center justify-center rounded-full bg-[var(--site-mustard)] px-2 font-extrabold tabular-nums text-[var(--site-text)]">{itemCount}</span>
                                        <span className="truncate">Sepete git</span>
                                    </span>
                                    <span className={cn(serif, 'shrink-0 text-[22px] leading-none tabular-nums')}>{formatPrice(total)} ₺</span>
                                </button>
                            </>
                        ) : (
                            <>
                                {waiterAction && (
                                    <MenuActionButton label="Garson çağır" icon={<BellRing className="h-4 w-4" />} action={waiterAction}
                                        onClick={() => void runAction('waiter')} onReopen={() => setConfirm('waiter')} primary />
                                )}
                                {billAction && (
                                    <MenuActionButton label="Hesap iste" icon={<Receipt className="h-4 w-4" />} action={billAction}
                                        onClick={() => void runAction('bill')} onReopen={() => setConfirm('bill')} />
                                )}
                                {openIban && (
                                    <button
                                        type="button"
                                        onClick={openIban}
                                        aria-label={waiterAction || billAction ? 'IBAN ile öde' : undefined}
                                        className={cn('flex h-14 shrink-0 items-center justify-center gap-2 rounded-full border-2 border-[var(--site-border-mid)] bg-[var(--site-card)] text-[15px] font-extrabold text-[var(--site-text)] transition-colors hover:border-[var(--site-text)]',
                                            waiterAction || billAction ? 'w-14' : 'min-w-0 flex-1 px-4')}
                                    >
                                        <Landmark className="h-4 w-4" aria-hidden="true" />
                                        {!(waiterAction || billAction) && 'IBAN ile öde'}
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                    {(waiterAction?.state.status === 'error' || billAction?.state.status === 'error') && (
                        <p role="alert" className="mx-auto mt-2 max-w-4xl text-center text-sm font-semibold text-[var(--site-error)]">
                            {waiterAction?.state.status === 'error' ? waiterAction.state.message : billAction?.state.status === 'error' ? billAction.state.message : ''}
                        </p>
                    )}
                </div>
            )}

            {canOrder && setMenuOpen && (
                <DeliverySetMenuSheet
                    menu={setMenuOpen}
                    restaurant={restaurant}
                    onClose={() => setSetMenuOpen(null)}
                    onAdd={(selections, quantity, note) => addSetMenu(setMenuOpen, selections, quantity, note)}
                />
            )}

            {canOrder && cartOpen && (
                <CartSheet
                    lines={lines}
                    total={total}
                    restaurant={restaurant}
                    tableName={table.name}
                    images={images}
                    orderNote={orderNote}
                    onOrderNote={setOrderNote}
                    onChange={(key, delta) => setCart(prev => changeQuantity(prev, key, delta))}
                    onLineNote={setLineNote}
                    onSend={send}
                    sending={sending}
                    sendError={sendError}
                    onClose={() => setCartOpen(false)}
                />
            )}

            {overlays}
        </main>
    );
}

/** Menü ekranının alt çubuğundaki garson / hesap düğmesi; bekleme süresinde onayı yeniden açar. */
function MenuActionButton({ label, icon, action, onClick, onReopen, iconOnly = false, primary = false }: {
    label: string; icon: ReactNode; action: ReturnType<typeof useTableAction>; onClick: () => void; onReopen: () => void; iconOnly?: boolean;
    /** Koyu hap (garson çağır); yoksa krem. */
    primary?: boolean;
}) {
    const waiting = action.state.status === 'done' && action.remainingSeconds > 0;
    return (
        <button
            type="button"
            onClick={waiting ? onReopen : onClick}
            disabled={action.state.status === 'sending'}
            aria-label={iconOnly ? label : undefined}
            className={cn('flex shrink-0 items-center justify-center gap-2 rounded-full border-2 text-[15px] font-extrabold transition-colors disabled:opacity-60',
                iconOnly ? 'h-[60px] w-[60px]' : 'h-14 min-w-0 flex-1 px-4',
                waiting ? 'border-[var(--site-ok-line)] bg-[var(--site-ok-bg)] text-[var(--site-ok)]'
                    : primary ? 'border-[var(--site-paper)] bg-[var(--site-paper)] text-[var(--site-on-paper)] hover:opacity-90'
                        : 'border-[var(--site-border-mid)] bg-[var(--site-card)] text-[var(--site-text)] hover:border-[var(--site-text)]')}
        >
            <span aria-hidden="true">{waiting ? <Check className="h-4 w-4" strokeWidth={2.5} /> : icon}</span>
            {!iconOnly && (waiting ? `${label.split(' ')[0]} ${label.endsWith('çağır') ? 'çağrıldı' : 'istendi'}` : label)}
        </button>
    );
}

function CartSheet({ lines, total, restaurant, tableName, images, orderNote, onOrderNote, onChange, onLineNote, onSend, sending, sendError, onClose }: {
    lines: DeliveryCartLine[]; total: number; restaurant: string; tableName: string; images: Map<string, string>;
    orderNote: string; onOrderNote: (note: string) => void;
    onChange: (key: string, delta: number) => void;
    onLineNote: (key: string, note: string) => void;
    onSend: () => void; sending: boolean; sendError: string | null; onClose: () => void;
}) {
    // Satır notu satır başına değil, istenince açılır (yazılmış not açık kalır). Menü satırının notu seçim penceresinde
    // yazılır ve satırın anahtarındadır; sepette yalnız gösterilir.
    const [openNotes, setOpenNotes] = useState<Set<string>>(() => new Set(lines.filter(l => l.kind === 'product' && l.note).map(l => l.key)));
    const [orderNoteOpen, setOrderNoteOpen] = useState(!!orderNote);

    return (
        <div className={sheetBackdrop} onClick={onClose}>
            <div
                role="dialog"
                aria-modal="true"
                aria-label="Sepet"
                className={sheetPanel}
                onClick={e => e.stopPropagation()}
            >
                <div className="flex shrink-0 items-start justify-between gap-3 px-5 pb-3 pt-6">
                    <div className="min-w-0">
                        <p className={cn(eyebrowAccent, 'm-0 truncate')}>{tableName}</p>
                        <h2 className={cn(serif, 'm-0 mt-1 text-[34px] leading-none')}>Sepetiniz</h2>
                    </div>
                    <button type="button" onClick={onClose} aria-label="Sepeti kapat" className={closeCircle}>
                        <X className="h-5 w-5" aria-hidden="true" />
                    </button>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-3">
                    {lines.length === 0 ? (
                        <p className="py-8 text-center text-base text-[var(--site-sub)]">Sepetiniz boş.</p>
                    ) : (
                        <ul className="m-0 list-none divide-y divide-[var(--site-border)] p-0">
                            {lines.map(line => {
                                const isMenu = line.kind === 'setMenu';
                                const noteOpen = !isMenu && openNotes.has(line.key);
                                const imageId = (isMenu ? line.setMenuId : line.productId) ?? '';
                                return (
                                    <li key={line.key} className="py-3.5">
                                        <div className="flex items-center gap-3">
                                            <ImageSlot src={images.get(imageId)} alt="" restaurant={restaurant}
                                                logoTextClassName="text-[min(10px,12cqw)]" className="h-14 w-14 shrink-0 rounded-full border-2 border-[var(--site-mustard)]" />
                                            <div className="min-w-0 flex-1">
                                                <p className={cn(serif, 'm-0 break-words text-[18px] leading-tight')}>{line.name}</p>
                                                {line.selectionNames.length > 0 && (
                                                    <p className="m-0 mt-0.5 break-words text-sm leading-snug text-[var(--site-sub)]">{line.selectionNames.join(' · ')}</p>
                                                )}
                                                {isMenu && line.note && <p className="m-0 mt-0.5 break-words text-sm text-[var(--site-sub)]">Not: {line.note}</p>}
                                                <p className="m-0 mt-0.5 text-sm font-extrabold tabular-nums text-[var(--site-accent-text)]">{formatPrice(line.unitPrice * line.quantity)} ₺</p>
                                                {!isMenu && !noteOpen && (
                                                    <button type="button" onClick={() => setOpenNotes(prev => new Set(prev).add(line.key))}
                                                        className="min-h-11 text-sm font-bold text-[var(--site-sub)] underline underline-offset-4">
                                                        Not ekle
                                                    </button>
                                                )}
                                            </div>
                                            <div className={stepperWrap}>
                                                <button type="button" onClick={() => onChange(line.key, -1)} aria-label={`${line.name} bir azalt`} className={stepperMinus}>
                                                    <Minus className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
                                                </button>
                                                <span className="min-w-5 text-center text-base font-extrabold tabular-nums">{line.quantity}</span>
                                                <button type="button" onClick={() => onChange(line.key, 1)} aria-label={`${line.name} bir artır`} className={stepperPlus}>
                                                    <Plus className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
                                                </button>
                                            </div>
                                        </div>
                                        {noteOpen && (
                                            <>
                                                <label className="sr-only" htmlFor={`not-${line.key}`}>{line.name} için not</label>
                                                <input
                                                    id={`not-${line.key}`}
                                                    value={line.note}
                                                    onChange={e => onLineNote(line.key, e.target.value)}
                                                    maxLength={300}
                                                    autoFocus={!line.note}
                                                    placeholder="ör. az pişmiş, soğansız"
                                                    className={cn(fieldClass, 'mt-2 h-11')}
                                                />
                                            </>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    )}

                    {orderNoteOpen ? (
                        <>
                            <label htmlFor="siparis-notu" className="mt-3 block text-sm font-bold">Garsona not</label>
                            <textarea
                                id="siparis-notu"
                                value={orderNote}
                                onChange={e => onOrderNote(e.target.value)}
                                maxLength={500}
                                rows={2}
                                placeholder="ör. biri az acılı olsun"
                                className={cn(fieldClass, 'mt-1.5 py-2.5')}
                            />
                        </>
                    ) : (
                        <button type="button" onClick={() => setOrderNoteOpen(true)}
                            className="mt-2 flex min-h-12 w-full items-center rounded-2xl border-2 border-dashed border-[var(--site-border-mid)] px-3.5 text-left text-[15px] font-semibold text-[var(--site-sub)] transition-colors hover:border-[var(--site-text)]">
                            Garsona not: ör. biri az acılı olsun
                        </button>
                    )}
                </div>

                <div className="shrink-0 border-t border-dashed border-[var(--site-border-strong)] bg-[var(--site-alt)] px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
                    {sendError && <p role="alert" className="m-0 mb-3 rounded-2xl border border-[var(--site-error-line)] bg-[var(--site-error-bg)] p-3 text-sm font-semibold text-[var(--site-error)]">{sendError}</p>}
                    <p className="m-0 mb-3 flex items-baseline justify-between gap-3">
                        <span className="text-xs font-extrabold uppercase tracking-[0.18em] text-[var(--site-muted)]">Toplam</span>
                        <span className={cn(serif, 'text-[30px] leading-none tabular-nums')}>{formatPrice(total)} ₺</span>
                    </p>
                    <button
                        type="button"
                        onClick={onSend}
                        disabled={sending || lines.length === 0}
                        className={cn(pillAccent, 'h-[60px] w-full justify-between pl-6 pr-2 text-[17px]')}
                    >
                        <span>{sending ? 'Gönderiliyor…' : 'Garsona gönder'}</span>
                        <span aria-hidden="true" className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--site-paper)] text-[var(--site-on-paper)]">
                            <ArrowRight className="h-5 w-5" />
                        </span>
                    </button>
                    <p className="m-0 mt-2 text-center text-[13px] text-[var(--site-muted)]">Garson onayladıktan sonra hazırlanır. Ödeme kasada.</p>
                </div>
            </div>
        </div>
    );
}

const SENT_STEPS = ['Gönderildi', 'Garson onayı', 'Mutfakta'] as const;

// Gönderim sonrası tam ekran an: üç adım ORDER_REQUEST_* durumlarına karşılık gelir ve useTableOrderRequests'in
// yoklamasıyla kendiliğinden ilerler. Reddedilirse garsonun nedeni ve sonraki adım gösterilir.
function SentConfirmation({ request, site, restaurant, tableName, onBackToMenu, onMyOrders, onCallWaiter }: {
    request: SentOrderRequest; site: PublicSite; restaurant: string; tableName: string;
    onBackToMenu: () => void; onMyOrders: () => void; onCallWaiter?: () => void;
}) {
    const approved = request.status === ORDER_REQUEST_APPROVED;
    const rejected = request.status === ORDER_REQUEST_REJECTED;
    const sentAt = new Date(request.sentAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    const images = new Map<string, string>([
        ...site.categories.flatMap(c => c.products).map(p => [p.id, p.imageUrl] as [string, string]),
        ...(site.setMenus ?? []).map(m => [m.id, m.imageUrl] as [string, string]),
    ]);

    return (
        <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col gap-2 px-2 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-2 sm:gap-3 sm:px-4 sm:pt-4">
            {/* Kapak renginde durum kutusu: işaret, başlık, açıklama; reddedildiyse garsonun nedeni. */}
            <div role="status" aria-live="polite" className={cn(heroBox, 'px-5 pb-8 pt-6 sm:px-8 sm:pb-10')}>
                <span aria-hidden="true" className={heroPattern} />
                <p className={cn(heroEyebrow, 'relative m-0')}>
                    <span aria-hidden="true" className="h-0.5 w-7 shrink-0 bg-[var(--site-mustard)]" />
                    <span className="min-w-0 break-words">{tableName} · {sentAt}</span>
                </p>
                <span aria-hidden="true" className={cn('relative mt-8 flex h-16 w-16 items-center justify-center rounded-full',
                    rejected ? 'bg-[var(--site-card)] text-[var(--site-error)]' : 'bg-[var(--site-mustard)] text-[var(--site-text)]')}>
                    {rejected ? <X className="h-8 w-8" strokeWidth={2.75} /> : <Check className="h-8 w-8" strokeWidth={2.75} />}
                </span>
                <h1 className={cn(displayTitle, 'relative mt-6 text-[52px] sm:text-[64px]')}>
                    {rejected ? <>Siparişiniz <em className="font-semibold italic">onaylanmadı.</em></>
                        : approved ? <>Siparişiniz <em className="font-semibold italic">mutfakta.</em></>
                            : <>Siparişiniz <em className="font-semibold italic">garsonda.</em></>}
                </h1>
                <p className="relative m-0 mt-3 max-w-[420px] text-[15px] leading-relaxed text-[rgba(251,244,232,0.92)]">
                    {rejected ? 'Garsonumuz bu siparişi onaylayamadı. Menüden başka bir şey seçebilir ya da garsonu çağırabilirsiniz.'
                        : approved ? 'Garson onayladı, hazırlanıyor. Afiyet olsun.'
                            : 'Garson onaylayınca mutfağa gidecek. Bu ekran kendiliğinden güncellenir.'}
                </p>
                {rejected && request.rejectReason && (
                    <blockquote className={cn(serif, 'relative m-0 mt-5 rounded-[20px] bg-[var(--site-card)] px-4 py-3 text-[20px] font-semibold italic leading-snug text-[var(--site-text)]')}>
                        "{request.rejectReason}"
                    </blockquote>
                )}
            </div>

            {!rejected && (
                <ol aria-label="Sipariş adımları" className={cn(creamBox, 'm-0 flex list-none flex-col gap-0 px-5 py-4 sm:px-7')}>
                    {SENT_STEPS.map((label, i) => {
                        const step = i + 1;
                        // Bekliyor: gönderildi ✓, garson onayı sürüyor. Onaylandı: üçü de tamam.
                        const done = approved || step === 1;
                        const active = !approved && step === 2;
                        return (
                            <li key={label} className="relative flex items-center gap-3 py-2.5" aria-current={active ? 'step' : undefined}>
                                {i < SENT_STEPS.length - 1 && <span aria-hidden="true" className="absolute left-[17px] top-[calc(50%+18px)] h-[calc(100%-36px)] w-0.5 bg-[var(--site-border-mid)]" />}
                                <span aria-hidden="true" className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-sm font-extrabold',
                                    done ? 'border-[var(--site-ok)] bg-[var(--site-ok)] text-[var(--site-ok-bg)]'
                                        : active ? 'border-[var(--site-mustard)] bg-[var(--site-mustard)] text-[var(--site-text)]'
                                            : 'border-[var(--site-border-strong)] text-[var(--site-muted)]')}>
                                    {done ? <Check className="h-4 w-4" strokeWidth={3} /> : step}
                                </span>
                                <span className={cn('text-base', active ? 'font-extrabold' : done ? 'font-bold' : 'font-semibold text-[var(--site-sub)]')}>
                                    {active && label === 'Garson onayı' ? 'Garson onayı bekleniyor' : label}
                                    {active && <span aria-hidden="true" className="ml-2 inline-block h-2 w-2 animate-pulse rounded-full bg-[var(--site-accent)] motion-reduce:animate-none" />}
                                </span>
                            </li>
                        );
                    })}
                </ol>
            )}

            <section aria-label="Gönderilen sipariş" className={cn(creamBox, 'px-5 py-5 sm:px-7')}>
                <ul className="m-0 flex list-none flex-col gap-3 p-0">
                    {request.items.map((item, i) => (
                        <li key={`${item.productId ?? item.name}-${i}`} className="flex items-center gap-3">
                            <ImageSlot src={images.get(item.setMenuId ?? item.productId ?? '') ?? null} alt="" restaurant={restaurant}
                                logoTextClassName="text-[min(9px,12cqw)]" className="h-11 w-11 shrink-0 rounded-full border-2 border-[var(--site-mustard)]" />
                            <span className={cn(serif, 'min-w-0 flex-1 break-words text-[18px] leading-tight')}>
                                <span className="font-[family-name:var(--site-sans,Manrope,system-ui,sans-serif)] text-[15px] font-extrabold tabular-nums tracking-normal text-[var(--site-accent-text)]">{item.quantity}×</span> {item.name}
                            </span>
                        </li>
                    ))}
                </ul>
                <p className="m-0 mt-4 flex items-baseline justify-between gap-3 border-t border-dashed border-[var(--site-border-strong)] pt-4">
                    <span className="text-xs font-extrabold uppercase tracking-[0.18em] text-[var(--site-muted)]">Toplam</span>
                    <span className={cn(serif, 'text-[28px] leading-none tabular-nums')}>{formatPrice(request.total)} ₺</span>
                </p>
            </section>

            <div className="mt-auto flex flex-col gap-2.5 pt-6">
                <button type="button" onClick={onBackToMenu} className={cn(pillDark, 'w-full')}>
                    Menüye dön
                </button>
                {rejected && onCallWaiter ? (
                    <button type="button" onClick={onCallWaiter} className={cn(pillOutline, 'w-full')}>
                        <BellRing className="h-4 w-4" aria-hidden="true" />Garson çağır
                    </button>
                ) : (
                    <button type="button" onClick={onMyOrders} className={cn(pillOutline, 'w-full')}>
                        <ClipboardList className="h-4 w-4" aria-hidden="true" />Siparişlerim
                    </button>
                )}
            </div>
        </main>
    );
}
