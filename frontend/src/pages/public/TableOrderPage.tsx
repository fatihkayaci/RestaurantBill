import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ClipboardList, Minus, Plus, ShoppingBag, X } from 'lucide-react';
import { toast } from 'sonner';
import { publicService } from '@/features/customerSite/api/publicService';
import {
    ORDER_REQUEST_PENDING, canReserveOnline, type PublicProduct, type PublicSite, type PublicTableInfo,
} from '@/features/customerSite/types';
import { getApiErrorMessage } from '@/lib/apiError';
import { formatPrice } from '@/lib/format';
import { cn } from '@/lib/utils';
import MenuBrowser from './components/MenuBrowser';
import MyOrdersSheet from './components/MyOrdersSheet';
import TableLanding from './components/TableLanding';
import { SITE_FONTS_HREF, headingFont, siteRootStyle } from './site/siteTheme';
import { useTableOrderRequests } from './useTableOrderRequests';
import { useTableAction } from './useTableAction';

interface CartLine {
    product: PublicProduct;
    quantity: number;
    note: string;
}

const MAX_QUANTITY = 50;

// Masadaki QR kodun açtığı sayfa. İlk ekran karşılama: masa adı ve büyük düğmeler (menü/sipariş, garson çağır,
// hesap iste, paket servis, rezervasyon; admin'in kapattıkları görünmez). Menüde (?ekran=menu) sepeti gönderir;
// talep garson onaylayınca mutfağa gider. Gönderimden sonra müşteri menüde kalır; gönderdikleri "Siparişlerim"de
// durumlarıyla görünür. Telefonun geri tuşu ve menüdeki geri düğmesi karşılamaya döner; sepet korunur.
export default function TableOrderPage() {
    const { tableId = '' } = useParams();
    const [params, setParams] = useSearchParams();
    const inMenu = params.get('ekran') === 'menu';
    const [table, setTable] = useState<PublicTableInfo | null>(null);
    const [site, setSite] = useState<PublicSite | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [cart, setCart] = useState<Record<string, CartLine>>({});
    const [orderNote, setOrderNote] = useState('');
    const [cartOpen, setCartOpen] = useState(false);
    const [sending, setSending] = useState(false);
    const [sendError, setSendError] = useState<string | null>(null);
    const [myOrdersOpen, setMyOrdersOpen] = useState(false);
    const { requests, addRequest } = useTableOrderRequests(tableId);

    const callWaiterRun = useCallback(() => publicService.callWaiter(tableId), [tableId]);
    const billRequestRun = useCallback(() => publicService.requestBill(tableId), [tableId]);
    const callWaiter = useTableAction(callWaiterRun, 'Garson çağrılamadı. Lütfen tekrar deneyin.');
    const billRequest = useTableAction(billRequestRun, 'Hesap istenemedi. Lütfen tekrar deneyin ya da garsona haber verin.');

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
            })
            .catch(err => {
                if (!cancelled) setLoadError(getApiErrorMessage(err, 'Menü yüklenemedi. İnternet bağlantınızı kontrol edip sayfayı yenileyin.'));
            });
        return () => { cancelled = true; };
    }, [tableId]);

    const pendingCount = requests.filter(r => r.status === ORDER_REQUEST_PENDING).length;
    const lines = useMemo(() => Object.values(cart), [cart]);
    const itemCount = lines.reduce((sum, line) => sum + line.quantity, 0);
    const total = lines.reduce((sum, line) => sum + line.quantity * line.product.price, 0);
    const quantities = useMemo(
        () => Object.fromEntries(lines.map(line => [line.product.id, line.quantity])),
        [lines]
    );

    const add = (product: PublicProduct) => {
        setCart(prev => {
            const current = prev[product.id];
            const quantity = Math.min(MAX_QUANTITY, (current?.quantity ?? 0) + 1);
            return { ...prev, [product.id]: { product, quantity, note: current?.note ?? '' } };
        });
    };

    const remove = (product: PublicProduct) => {
        setCart(prev => {
            const current = prev[product.id];
            if (!current) return prev;
            if (current.quantity <= 1) {
                const next = { ...prev };
                delete next[product.id];
                return next;
            }
            return { ...prev, [product.id]: { ...current, quantity: current.quantity - 1 } };
        });
    };

    const setLineNote = (productId: string, note: string) => {
        setCart(prev => prev[productId] ? { ...prev, [productId]: { ...prev[productId], note } } : prev);
    };

    const send = async () => {
        if (lines.length === 0 || sending) return;
        setSending(true);
        setSendError(null);
        try {
            const result = await publicService.createOrderRequest(
                tableId,
                lines.map(line => ({ productId: line.product.id, quantity: line.quantity, note: line.note.trim() })),
                orderNote.trim()
            );
            addRequest({
                id: result.id,
                status: result.status,
                total,
                items: lines.map(line => ({ name: line.product.name, quantity: line.quantity })),
            });
            toast.success('Siparişiniz garsona iletildi', {
                description: 'Garson onaylayınca mutfağa gidecek. Durumunu "Siparişlerim"den izleyebilirsiniz.',
            });
            setCart({});
            setOrderNote('');
            setCartOpen(false);
        } catch (err) {
            setSendError(getApiErrorMessage(err, 'Sipariş gönderilemedi. Lütfen tekrar deneyin ya da garsona haber verin.'));
        } finally {
            setSending(false);
        }
    };

    const root = (children: ReactNode) => (
        <div style={siteRootStyle()} className="min-h-screen">
            <link rel="stylesheet" href={SITE_FONTS_HREF} precedence="default" />
            {children}
        </div>
    );

    if (loadError) {
        return root(
            <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
                <h1 className={cn(headingFont, 'text-3xl font-bold')}>Menü açılamadı</h1>
                <p className="mt-2 max-w-sm text-base text-[var(--site-sub)]">{loadError}</p>
            </main>
        );
    }

    if (!table || !site) {
        return root(
            <main className="min-h-screen px-4 py-6" aria-busy="true">
                <div className="h-8 w-40 animate-pulse rounded-lg bg-[var(--site-card)]" />
                <div className="mt-6 space-y-3">
                    {[...Array(6)].map((_, i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-[var(--site-card)]" />)}
                </div>
            </main>
        );
    }

    const features = table.qrFeatures;
    const myOrdersButton = requests.length > 0;

    if (!inMenu) {
        return root(
            <>
                <TableLanding
                    restaurantName={site.companyName || site.branchName}
                    tableName={table.name}
                    regionName={table.regionName}
                    orderingEnabled={features.orderingEnabled}
                    onOpenMenu={() => showView(true)}
                    callWaiter={features.callWaiterEnabled ? callWaiter : null}
                    billRequest={features.billRequestEnabled ? billRequest : null}
                    showDelivery={features.deliveryLinkEnabled && table.acceptsOnlineOrders}
                    deliveryHref={`/siparis?sube=${encodeURIComponent(table.branchId)}`}
                    showReservation={features.reservationLinkEnabled && canReserveOnline(site)}
                    myOrders={myOrdersButton ? { count: requests.length, pendingCount, open: () => setMyOrdersOpen(true) } : null}
                />
                {myOrdersOpen && <MyOrdersSheet requests={requests} onClose={() => setMyOrdersOpen(false)} />}
            </>
        );
    }

    const header = (
        <header className="flex items-center justify-between gap-3 border-b border-[var(--site-border)] px-4 py-4">
            <div className="flex min-w-0 items-center gap-2">
                <button
                    type="button"
                    onClick={() => showView(false)}
                    aria-label="Karşılama ekranına dön"
                    className="-ml-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-[var(--site-raised)]"
                >
                    <ArrowLeft className="h-5 w-5" aria-hidden="true" />
                </button>
                <div className="min-w-0">
                    <p className={cn(headingFont, 'truncate text-lg font-bold')}>{site.companyName}</p>
                    {table.regionName && <p className="text-sm text-[var(--site-sub)]">{table.regionName}</p>}
                </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
                {myOrdersButton && (
                    <button
                        type="button"
                        onClick={() => setMyOrdersOpen(true)}
                        className="flex h-11 items-center gap-1.5 rounded-full border border-[var(--site-border-strong)] px-3.5 text-sm font-semibold hover:bg-[var(--site-raised)]"
                    >
                        <ClipboardList className="h-4 w-4" aria-hidden="true" />
                        Siparişlerim
                        {pendingCount > 0 && (
                            <span className="rounded-full bg-[var(--site-accent)] px-1.5 text-xs text-[var(--site-on-accent)]">
                                <span className="sr-only">, onay bekleyen: </span>{pendingCount}
                            </span>
                        )}
                    </button>
                )}
                <h1 className="rounded-full bg-[var(--site-paper)] px-3.5 py-1.5 text-sm font-semibold text-[var(--site-on-paper)]">
                    <span className="sr-only">Masa: </span>{table.name}
                </h1>
            </div>
        </header>
    );

    const fieldClass = 'w-full rounded-xl border border-[var(--site-border-strong)] bg-[var(--site-bg)] px-3 text-[15px] text-[var(--site-text)] placeholder:text-[var(--site-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--site-accent)]';

    return root(
        <main className="min-h-screen pb-36">
            {header}
            {features.orderingEnabled
                ? <MenuBrowser categories={site.categories} quantities={quantities} onAdd={add} onRemove={remove} stickyBgClass="bg-[var(--site-bg)]/95" />
                : <MenuBrowser categories={site.categories} stickyBgClass="bg-[var(--site-bg)]/95" />}

            {features.orderingEnabled && itemCount > 0 && (
                <div className="fixed inset-x-0 bottom-0 z-20 border-t border-[var(--site-border)] bg-[var(--site-bg)] px-4 pb-5 pt-3">
                    <p className="mb-2.5 text-center text-[13px] text-[var(--site-muted)]">Siparişiniz garson onaylayınca mutfağa iletilir.</p>
                    <button
                        type="button"
                        onClick={() => setCartOpen(true)}
                        className="flex h-14 w-full items-center justify-between rounded-full bg-[var(--site-accent)] px-6 text-[var(--site-on-accent)] transition-opacity hover:opacity-90"
                    >
                        <span className="flex items-center gap-2.5 text-base font-semibold">
                            <ShoppingBag className="h-5 w-5" aria-hidden="true" />
                            Sepeti gör · {itemCount} ürün
                        </span>
                        <span className={cn(headingFont, 'text-lg font-bold')}>{formatPrice(total)} ₺</span>
                    </button>
                </div>
            )}

            {features.orderingEnabled && cartOpen && (
                <div className="fixed inset-0 z-30 flex flex-col justify-end bg-black/60" onClick={() => setCartOpen(false)}>
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-label="Sepet"
                        className="flex max-h-[90vh] flex-col rounded-t-3xl border-t border-[var(--site-border)] bg-[var(--site-card)] animate-in slide-in-from-bottom duration-200"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between border-b border-[var(--site-border)] px-5 py-4">
                            <h2 className={cn(headingFont, 'text-2xl font-bold')}>Sepetiniz</h2>
                            <button
                                type="button"
                                onClick={() => setCartOpen(false)}
                                aria-label="Sepeti kapat"
                                className="flex h-11 w-11 items-center justify-center rounded-full text-[var(--site-sub)] hover:bg-[var(--site-raised)]"
                            >
                                <X className="h-5 w-5" aria-hidden="true" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto px-5 py-3">
                            {lines.length === 0 ? (
                                <p className="py-8 text-center text-base text-[var(--site-sub)]">Sepetiniz boş.</p>
                            ) : (
                                <ul className="divide-y divide-[var(--site-border)]">
                                    {lines.map(line => (
                                        <li key={line.product.id} className="py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-[15px] font-semibold">{line.product.name}</p>
                                                    <p className="text-sm tabular-nums text-[var(--site-sub)]">{formatPrice(line.product.price * line.quantity)} ₺</p>
                                                </div>
                                                <div className="flex shrink-0 items-center gap-1 rounded-full bg-[var(--site-raised)] p-0.5">
                                                    <button type="button" onClick={() => remove(line.product)} aria-label={`${line.product.name} bir azalt`} className="flex h-11 w-11 items-center justify-center rounded-full text-[var(--site-text)]">
                                                        <Minus className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
                                                    </button>
                                                    <span className="min-w-5 text-center text-base font-bold">{line.quantity}</span>
                                                    <button type="button" onClick={() => add(line.product)} aria-label={`${line.product.name} bir artır`} className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--site-accent)] text-[var(--site-on-accent)]">
                                                        <Plus className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
                                                    </button>
                                                </div>
                                            </div>
                                            <label className="sr-only" htmlFor={`not-${line.product.id}`}>{line.product.name} için not</label>
                                            <input
                                                id={`not-${line.product.id}`}
                                                value={line.note}
                                                onChange={e => setLineNote(line.product.id, e.target.value)}
                                                maxLength={300}
                                                placeholder="Not ekle (ör. az pişmiş, soğansız)"
                                                className={cn(fieldClass, 'mt-2 h-11')}
                                            />
                                        </li>
                                    ))}
                                </ul>
                            )}

                            <label htmlFor="siparis-notu" className="mt-3 block text-sm font-semibold">Sipariş notu</label>
                            <textarea
                                id="siparis-notu"
                                value={orderNote}
                                onChange={e => setOrderNote(e.target.value)}
                                maxLength={500}
                                rows={2}
                                placeholder="Garsona iletmek istediğiniz bir şey var mı?"
                                className={cn(fieldClass, 'mt-1.5 py-2.5')}
                            />
                        </div>

                        <div className="border-t border-[var(--site-border)] p-4">
                            {sendError && <p role="alert" className="mb-3 rounded-xl border border-[var(--site-error-line)] bg-[var(--site-error-bg)] p-3 text-sm font-medium text-[var(--site-error)]">{sendError}</p>}
                            <button
                                type="button"
                                onClick={send}
                                disabled={sending || lines.length === 0}
                                className="flex h-14 w-full items-center justify-between rounded-full bg-[var(--site-accent)] px-6 text-[var(--site-on-accent)] transition-opacity hover:opacity-90 disabled:opacity-50"
                            >
                                <span className="text-base font-semibold">{sending ? 'Gönderiliyor…' : 'Garsona gönder'}</span>
                                <span className={cn(headingFont, 'text-lg font-bold')}>{formatPrice(total)} ₺</span>
                            </button>
                            <p className="mt-2 text-center text-xs text-[var(--site-muted)]">Siparişiniz garson onayladıktan sonra hazırlanır. Ödeme kasada yapılır.</p>
                        </div>
                    </div>
                </div>
            )}

            {myOrdersOpen && <MyOrdersSheet requests={requests} onClose={() => setMyOrdersOpen(false)} />}
        </main>
    );
}
