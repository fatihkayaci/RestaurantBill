import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Check, Clock, Minus, Plus, ShoppingBag, X } from 'lucide-react';
import { publicService } from '@/features/customerSite/api/publicService';
import {
    ORDER_REQUEST_APPROVED, ORDER_REQUEST_PENDING, ORDER_REQUEST_REJECTED,
    type PublicProduct, type PublicSite, type PublicTableInfo,
} from '@/features/customerSite/types';
import { getApiErrorMessage } from '@/lib/apiError';
import { formatPrice } from '@/lib/format';
import MenuBrowser from './components/MenuBrowser';

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

    if (loadError) {
        return (
            <main className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
                <h1 className="font-serif text-3xl font-bold text-foreground">Menü açılamadı</h1>
                <p className="mt-2 max-w-sm text-base text-rb-text-sub">{loadError}</p>
            </main>
        );
    }

    if (!table || !site) {
        return (
            <main className="min-h-screen bg-background px-4 py-6" aria-busy="true">
                <div className="h-8 w-40 animate-pulse rounded-lg bg-muted" />
                <div className="mt-6 space-y-3">
                    {[...Array(6)].map((_, i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-muted" />)}
                </div>
            </main>
        );
    }

    const header = (
        <header className="border-b border-border bg-card px-4 py-4">
            <p className="text-sm font-semibold text-rb-text-sub">{site.companyName}</p>
            <h1 className="font-serif text-[28px] font-bold leading-tight text-foreground">{table.name}</h1>
            <p className="text-sm text-rb-text-sub">{table.regionName}</p>
        </header>
    );

    // Talep gönderildi: durum ekranı.
    if (requestId) {
        const approved = requestStatus === ORDER_REQUEST_APPROVED;
        const rejected = requestStatus === ORDER_REQUEST_REJECTED;
        return (
            <main className="min-h-screen bg-background">
                {header}
                <div className="flex flex-col items-center px-6 py-12 text-center" role="status" aria-live="polite">
                    <span className={`flex h-16 w-16 items-center justify-center rounded-full ${approved ? 'bg-rb-green-bg' : rejected ? 'bg-rb-red-bg' : 'bg-rb-gold-bg'}`}>
                        {approved
                            ? <Check className="h-7 w-7 text-rb-green" strokeWidth={2.5} aria-hidden="true" />
                            : rejected
                                ? <X className="h-7 w-7 text-rb-red" strokeWidth={2.5} aria-hidden="true" />
                                : <Clock className="h-7 w-7 text-rb-amber" aria-hidden="true" />}
                    </span>
                    <h2 className="mt-5 font-serif text-[28px] font-bold leading-tight text-foreground">
                        {approved ? 'Siparişiniz onaylandı' : rejected ? 'Siparişiniz onaylanmadı' : 'Siparişiniz garsona iletildi'}
                    </h2>
                    <p className="mt-2 max-w-sm text-base leading-relaxed text-rb-text-sub">
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
                            className="mt-7 h-12 rounded-xl bg-rb-gold px-6 text-base font-semibold text-rb-gold-foreground transition-opacity hover:opacity-90"
                        >
                            {approved ? 'Yeni sipariş ver' : 'Tekrar sipariş ver'}
                        </button>
                    )}
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-background pb-28">
            {header}
            <MenuBrowser categories={site.categories} quantities={quantities} onAdd={add} onRemove={remove} />

            {itemCount > 0 && (
                <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-card p-3 shadow-[0_-8px_24px_rgba(0,0,0,0.08)]">
                    <button
                        type="button"
                        onClick={() => setCartOpen(true)}
                        className="flex h-14 w-full items-center justify-between rounded-2xl bg-rb-gold px-5 text-rb-gold-foreground transition-opacity hover:opacity-90"
                    >
                        <span className="flex items-center gap-2.5 text-base font-semibold">
                            <ShoppingBag className="h-5 w-5" aria-hidden="true" />
                            Sepeti gör · {itemCount} ürün
                        </span>
                        <span className="text-lg font-bold">{formatPrice(total)} ₺</span>
                    </button>
                </div>
            )}

            {cartOpen && (
                <div className="fixed inset-0 z-30 flex flex-col justify-end bg-black/50" onClick={() => setCartOpen(false)}>
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-label="Sepet"
                        className="flex max-h-[90vh] flex-col rounded-t-3xl bg-card animate-in slide-in-from-bottom duration-200"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between border-b border-border px-5 py-4">
                            <h2 className="font-serif text-2xl font-bold text-foreground">Sepetiniz</h2>
                            <button
                                type="button"
                                onClick={() => setCartOpen(false)}
                                aria-label="Sepeti kapat"
                                className="flex h-11 w-11 items-center justify-center rounded-full text-rb-text-sub hover:bg-muted"
                            >
                                <X className="h-5 w-5" aria-hidden="true" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto px-5 py-3">
                            {lines.length === 0 ? (
                                <p className="py-8 text-center text-base text-rb-text-sub">Sepetiniz boş.</p>
                            ) : (
                                <ul className="divide-y divide-border">
                                    {lines.map(line => (
                                        <li key={line.product.id} className="py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-[15px] font-semibold text-foreground">{line.product.name}</p>
                                                    <p className="text-sm text-rb-text-sub">{formatPrice(line.product.price * line.quantity)} ₺</p>
                                                </div>
                                                <div className="flex shrink-0 items-center rounded-full border border-border">
                                                    <button type="button" onClick={() => remove(line.product)} aria-label={`${line.product.name} bir azalt`} className="flex h-11 w-11 items-center justify-center rounded-full text-foreground">
                                                        <Minus className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
                                                    </button>
                                                    <span className="min-w-6 text-center text-base font-bold text-foreground">{line.quantity}</span>
                                                    <button type="button" onClick={() => add(line.product)} aria-label={`${line.product.name} bir artır`} className="flex h-11 w-11 items-center justify-center rounded-full text-foreground">
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
                                                className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 text-[15px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-rb-gold"
                                            />
                                        </li>
                                    ))}
                                </ul>
                            )}

                            <label htmlFor="siparis-notu" className="mt-3 block text-sm font-semibold text-foreground">Sipariş notu</label>
                            <textarea
                                id="siparis-notu"
                                value={orderNote}
                                onChange={e => setOrderNote(e.target.value)}
                                maxLength={500}
                                rows={2}
                                placeholder="Garsona iletmek istediğiniz bir şey var mı?"
                                className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-[15px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-rb-gold"
                            />
                        </div>

                        <div className="border-t border-border p-4">
                            {sendError && <p role="alert" className="mb-3 text-sm font-medium text-rb-red">{sendError}</p>}
                            <button
                                type="button"
                                onClick={send}
                                disabled={sending || lines.length === 0}
                                className="flex h-14 w-full items-center justify-between rounded-2xl bg-rb-gold px-5 text-rb-gold-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                            >
                                <span className="text-base font-semibold">{sending ? 'Gönderiliyor…' : 'Siparişi gönder'}</span>
                                <span className="text-lg font-bold">{formatPrice(total)} ₺</span>
                            </button>
                            <p className="mt-2 text-center text-xs text-rb-text-sub">Siparişiniz garson onayladıktan sonra hazırlanır. Ödeme kasada yapılır.</p>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}
