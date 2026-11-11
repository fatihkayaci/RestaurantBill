import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { Check, Clock, Minus, Plus, ShoppingBag, X } from 'lucide-react';
import { publicService } from '@/features/customerSite/api/publicService';
import {
    ORDER_REQUEST_APPROVED, ORDER_REQUEST_PENDING, ORDER_REQUEST_REJECTED,
    type PublicProduct, type PublicSite, type PublicTableInfo,
} from '@/features/customerSite/types';
import { getApiErrorMessage } from '@/lib/apiError';
import { formatPrice } from '@/lib/format';
import { cn } from '@/lib/utils';
import MenuBrowser from './components/MenuBrowser';
import { SITE_FONTS_HREF, headingFont, siteRootStyle } from './site/siteTheme';

interface CartLine {
    product: PublicProduct;
    quantity: number;
    note: string;
}

const MAX_QUANTITY = 50;
const POLL_MS = 5000;

const requestKey = (tableId: string) => `rb:order-request:${tableId}`;

function readSavedRequest(tableId: string): string | null {
    try { return localStorage.getItem(requestKey(tableId)); } catch { return null; }
}

function saveRequest(tableId: string, id: string | null) {
    try {
        if (id) localStorage.setItem(requestKey(tableId), id);
        else localStorage.removeItem(requestKey(tableId));
    } catch { /* özel pencere: durum yalnızca bu oturumda tutulur */ }
}

// Masadaki QR kodun açtığı sayfa: menüden seç, sepeti gönder. Talep garson onaylayınca mutfağa gider.
export default function TableOrderPage() {
    const { tableId = '' } = useParams();
    const [table, setTable] = useState<PublicTableInfo | null>(null);
    const [site, setSite] = useState<PublicSite | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [cart, setCart] = useState<Record<string, CartLine>>({});
    const [orderNote, setOrderNote] = useState('');
    const [cartOpen, setCartOpen] = useState(false);
    const [sending, setSending] = useState(false);
    const [sendError, setSendError] = useState<string | null>(null);
    const [requestId, setRequestId] = useState<string | null>(() => readSavedRequest(tableId));
    const [requestStatus, setRequestStatus] = useState<number>(ORDER_REQUEST_PENDING);

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

    // Gönderilen talep bekledikçe durumunu sorgula; onay ya da red gelince dur.
    useEffect(() => {
        if (!requestId) return;
        let cancelled = false;
        let timer: ReturnType<typeof setTimeout> | undefined;

        const check = async () => {
            try {
                const result = await publicService.getOrderRequestStatus(requestId);
                if (cancelled) return;
                setRequestStatus(result.status);
                if (result.status !== ORDER_REQUEST_PENDING) return;
            } catch { /* geçici bağlantı hatası: bir sonraki turda tekrar dene */ }
            if (!cancelled) timer = setTimeout(check, POLL_MS);
        };
        void check();

        return () => { cancelled = true; if (timer) clearTimeout(timer); };
    }, [requestId]);

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
            saveRequest(tableId, result.id);
            setRequestStatus(result.status);
            setRequestId(result.id);
            setCart({});
            setOrderNote('');
            setCartOpen(false);
        } catch (err) {
            setSendError(getApiErrorMessage(err, 'Sipariş gönderilemedi. Lütfen tekrar deneyin ya da garsona haber verin.'));
        } finally {
            setSending(false);
        }
    };

    const startNewOrder = () => {
        saveRequest(tableId, null);
        setRequestId(null);
        setRequestStatus(ORDER_REQUEST_PENDING);
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

    const header = (
        <header className="flex items-center justify-between gap-3 border-b border-[var(--site-border)] px-4 py-4">
            <div className="min-w-0">
                <p className={cn(headingFont, 'truncate text-lg font-bold')}>{site.companyName}</p>
                {table.regionName && <p className="text-sm text-[var(--site-sub)]">{table.regionName}</p>}
            </div>
            <h1 className="shrink-0 rounded-full bg-[var(--site-paper)] px-3.5 py-1.5 text-sm font-semibold text-[var(--site-on-paper)]">
                <span className="sr-only">Masa: </span>{table.name}
            </h1>
        </header>
    );

    // Talep gönderildi: durum ekranı.
    if (requestId) {
        const approved = requestStatus === ORDER_REQUEST_APPROVED;
        const rejected = requestStatus === ORDER_REQUEST_REJECTED;
        return root(
            <main className="min-h-screen">
                {header}
                <div className="flex flex-col items-center px-6 py-12 text-center" role="status" aria-live="polite">
                    <span className={cn(
                        'flex h-16 w-16 items-center justify-center rounded-full border',
                        approved ? 'border-[var(--site-ok-line)] bg-[var(--site-ok-bg)]'
                            : rejected ? 'border-[var(--site-error-line)] bg-[var(--site-error-bg)]'
                                : 'border-[var(--site-border-strong)] bg-[var(--site-raised)]',
                    )}>
                        {approved
                            ? <Check className="h-7 w-7 text-[var(--site-ok)]" strokeWidth={2.5} aria-hidden="true" />
                            : rejected
                                ? <X className="h-7 w-7 text-[var(--site-error)]" strokeWidth={2.5} aria-hidden="true" />
                                : <Clock className="h-7 w-7 text-[var(--site-accent)]" aria-hidden="true" />}
                    </span>
                    <h2 className={cn(headingFont, 'mt-5 text-[28px] font-bold leading-tight')}>
                        {approved ? 'Siparişiniz onaylandı' : rejected ? 'Siparişiniz onaylanmadı' : 'Siparişiniz garsona iletildi'}
                    </h2>
                    <p className="mt-2 max-w-sm text-base leading-relaxed text-[var(--site-sub)]">
                        {approved
                            ? 'Siparişiniz mutfağa gönderildi, hazırlanıyor.'
                            : rejected
                                ? 'Garson bu siparişi onaylamadı. Lütfen garsona danışın ya da yeniden sipariş verin.'
                                : 'Garson onayladığında siparişiniz mutfağa gidecek. Bu sayfa kendiliğinden güncellenir.'}
                    </p>
                    {(approved || rejected) && (
                        <button
                            type="button"
                            onClick={startNewOrder}
                            className="mt-7 h-12 rounded-full bg-[var(--site-accent)] px-6 text-base font-semibold text-[var(--site-on-accent)] transition-opacity hover:opacity-90"
                        >
                            {approved ? 'Yeni sipariş ver' : 'Tekrar sipariş ver'}
                        </button>
                    )}
                </div>
            </main>
        );
    }

    const fieldClass = 'w-full rounded-xl border border-[var(--site-border-strong)] bg-[var(--site-bg)] px-3 text-[15px] text-[var(--site-text)] placeholder:text-[var(--site-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--site-accent)]';

    return root(
        <main className="min-h-screen pb-36">
            {header}
            <MenuBrowser categories={site.categories} quantities={quantities} onAdd={add} onRemove={remove} stickyBgClass="bg-[var(--site-bg)]/95" />

            {itemCount > 0 && (
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

            {cartOpen && (
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
        </main>
    );
}
