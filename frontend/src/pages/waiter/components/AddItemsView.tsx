import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, Coffee, Image as ImageIcon, Minus, Plus, Search } from 'lucide-react';
import { toast } from 'sonner';
import { productService } from '@/features/products/api/productService';
import { categoryService } from '@/features/categories/api/categoryService';
import { orderService } from '@/features/orders/api/orderService';
import { tableService } from '@/features/tables/api/tableService';
import type { Product } from '@/features/products/types';
import type { Category } from '@/features/categories/types';
import type { Order } from '@/features/orders/types';
import type { Table } from '@/features/tables/types';
import { getApiErrorMessage } from '@/lib/apiError';
import { formatPrice } from '@/lib/format';
import { cn } from '@/lib/utils';
import { quickNotesFor } from '../waiterUi';

interface Props {
    table: Table;
    order: Order | null;
    onBack: () => void;
    /** Geri düğmesinin erişilebilir adı; varsayılan "<masa> masasına dön". */
    backLabel?: string;
    /** Boş masa doğrudan buradan açıldıysa rezervasyona geçiş (yetki varsa). */
    onReserve?: () => void;
    /** Sipariş gönderildi (gerekirse masa açıldı); detay yenilenir. */
    onSent: () => void;
    /** Masa bu ekrandan açıldıysa liste hemen "Dolu" görsün. */
    onTableOpened: () => void;
}

interface LineNote {
    chips: string[];
    text: string;
}

function noteText(note: LineNote | undefined): string {
    if (!note) return '';
    return [...note.chips, note.text.trim()].filter(Boolean).join(', ');
}

// Telefon · Ürün ekleme: ara, kategori seç, adet ver, hızlı not ekle, "Mutfağa gönder".
export default function AddItemsView({ table, order, onBack, backLabel, onReserve, onSent, onTableOpened }: Props) {
    const [categories, setCategories] = useState<Category[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [categoryId, setCategoryId] = useState<string>('all');
    const [query, setQuery] = useState('');
    const [quantities, setQuantities] = useState<Record<string, number>>({});
    const [notes, setNotes] = useState<Record<string, LineNote>>({});
    const [noteEditorFor, setNoteEditorFor] = useState<string | null>(null);
    const [orderNote, setOrderNote] = useState(order?.note ?? '');
    const [sending, setSending] = useState(false);

    useEffect(() => {
        Promise.all([categoryService.getCategories(), productService.getProducts()])
            .then(([cats, prods]) => { setCategories(cats); setProducts(prods.filter(p => p.isActive)); })
            .catch(err => toast.error(getApiErrorMessage(err, 'Menü yüklenemedi.')))
            .finally(() => setLoading(false));
    }, []);

    const categoryName = useMemo(() => new Map(categories.map(c => [c.id, c.name])), [categories]);

    const visible = useMemo(() => {
        const q = query.trim().toLocaleLowerCase('tr-TR');
        return products.filter(p =>
            (q ? p.name.toLocaleLowerCase('tr-TR').includes(q) : categoryId === 'all' || p.categoryId === categoryId));
    }, [products, query, categoryId]);

    const setQty = (productId: string, delta: number) => {
        setQuantities(prev => {
            const next = Math.max(0, (prev[productId] ?? 0) + delta);
            return { ...prev, [productId]: next };
        });
    };

    const toggleChip = (productId: string, chip: string) => {
        setNotes(prev => {
            const current = prev[productId] ?? { chips: [], text: '' };
            const chips = current.chips.includes(chip) ? current.chips.filter(c => c !== chip) : [...current.chips, chip];
            return { ...prev, [productId]: { ...current, chips } };
        });
    };

    const setFreeNote = (productId: string, text: string) => {
        setNotes(prev => ({ ...prev, [productId]: { chips: prev[productId]?.chips ?? [], text } }));
    };

    const cart = products.filter(p => (quantities[p.id] ?? 0) > 0);
    const cartCount = cart.reduce((sum, p) => sum + quantities[p.id], 0);
    const cartTotal = cart.reduce((sum, p) => sum + quantities[p.id] * p.price, 0);
    const noteCount = cart.filter(p => noteText(notes[p.id])).length;

    const send = async () => {
        if (cart.length === 0 || sending) return;
        setSending(true);
        try {
            let orderId = order?.id;
            if (!orderId) {
                await tableService.openTable(String(table.id));
                onTableOpened();
                const opened = await orderService.getOrderByTableId(String(table.id));
                orderId = opened?.id;
            }
            if (!orderId) {
                toast.error('Sipariş başlatılamadı.');
                return;
            }
            await orderService.addOrderItems({
                id: orderId,
                tableId: table.id,
                tableName: table.name,
                note: orderNote,
                totalPrice: cartTotal,
                status: 1,
                createdAt: new Date().toISOString(),
                createdByUserName: '',
                orderItems: cart.map(p => ({
                    id: 0,
                    productId: p.id,
                    productName: p.name,
                    unitPrice: p.price,
                    quantity: quantities[p.id],
                    status: 1,
                    is_load: false,
                    categoryName: '',
                    taxRate: 0,
                    note: noteText(notes[p.id]),
                    createdAt: new Date().toISOString(),
                    prepMinutes: null,
                })),
            });
            toast.success(`${cartCount} ürün mutfağa gönderildi.`);
            onSent();
        } catch (err) {
            toast.error(getApiErrorMessage(err, 'Sipariş gönderilemedi.'));
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="flex h-full min-h-0 flex-col bg-[#F5F0E8] dark:bg-background">
            <header className="flex shrink-0 flex-col gap-3 px-4 pt-3 pb-2.5">
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={onBack}
                        aria-label={backLabel ?? `${table.name} masasına dön`}
                        className="-ml-2 flex size-12 items-center justify-center rounded-full text-foreground hover:bg-muted"
                    >
                        <ChevronLeft className="size-6" aria-hidden="true" />
                    </button>
                    <div className="flex min-w-0 flex-col">
                        <span className="truncate text-[13px] font-medium text-rb-text-sub">{table.name} · {table.regionName}</span>
                        <h2 className="font-serif text-[28px] font-bold leading-none text-foreground">Ürün ekle</h2>
                    </div>
                    {onReserve && (
                        <button
                            type="button"
                            onClick={onReserve}
                            className="ml-auto inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border border-border bg-card px-3.5 text-sm font-semibold text-foreground hover:bg-muted"
                        >
                            <CalendarDays className="size-4.5" aria-hidden="true" />
                            Rezerve et
                        </button>
                    )}
                </div>
                <label className="relative block">
                    <span className="sr-only">Ürün ara</span>
                    <Search className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-rb-text-sub" aria-hidden="true" />
                    <input
                        type="search"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder="Ürün ara (ör. latte)"
                        className="h-12 w-full rounded-2xl border border-border bg-card pr-3 pl-11 text-base text-foreground outline-none placeholder:text-rb-text-muted focus:ring-2 focus:ring-rb-gold"
                    />
                </label>
                {!query && (
                    <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-0.5" style={{ scrollbarWidth: 'none' }}>
                        {[{ id: 'all', name: 'Tümü' }, ...categories].map(c => (
                            <button
                                key={c.id}
                                type="button"
                                aria-pressed={categoryId === c.id}
                                onClick={() => setCategoryId(c.id)}
                                className={cn(
                                    'min-h-10 shrink-0 rounded-full border px-3.5 text-sm font-semibold whitespace-nowrap transition-colors',
                                    categoryId === c.id ? 'border-foreground bg-foreground text-background' : 'border-border bg-card text-foreground',
                                )}
                            >
                                {c.name}
                            </button>
                        ))}
                    </div>
                )}
            </header>

            <main className="min-h-0 flex-1 overflow-y-auto px-4 pt-1 pb-4">
                {loading ? (
                    <div className="flex flex-col gap-2">
                        {[...Array(6)].map((_, i) => <div key={i} className="h-18 animate-pulse rounded-2xl bg-muted" />)}
                    </div>
                ) : visible.length === 0 ? (
                    <p className="py-10 text-center text-sm text-rb-text-sub">{query ? `"${query}" için ürün bulunamadı.` : 'Bu kategoride ürün yok.'}</p>
                ) : (
                    <ul className="flex flex-col gap-2">
                        {visible.map(p => {
                            const qty = quantities[p.id] ?? 0;
                            const chips = quickNotesFor(categoryName.get(p.categoryId) ?? p.categoryName ?? '');
                            const note = notes[p.id];
                            return (
                                <li
                                    key={p.id}
                                    className={cn(
                                        'flex flex-col gap-2 rounded-2xl bg-card p-2.5',
                                        qty > 0 ? 'border-[1.5px] border-rb-gold' : 'border border-border',
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        {p.imageUrl ? (
                                            <img src={p.imageUrl} alt="" loading="lazy" className="size-13 shrink-0 rounded-[14px] object-cover" />
                                        ) : (
                                            <span className="flex size-13 shrink-0 items-center justify-center rounded-[14px] bg-rb-gold-bg text-rb-gold" aria-hidden="true">
                                                {/içecek|kahve|çay/i.test(p.categoryName ?? '') ? <Coffee className="size-6" /> : <ImageIcon className="size-6" />}
                                            </span>
                                        )}
                                        <div className="flex min-w-0 flex-1 flex-col">
                                            <span className="truncate text-base font-semibold text-foreground">{p.name}</span>
                                            <span className="text-sm text-rb-text-sub">
                                                <span className="font-bold text-foreground">₺{formatPrice(p.price)}</span>
                                                {p.prepMinutes != null && <> · ~{p.prepMinutes} dk</>}
                                            </span>
                                        </div>
                                        {qty === 0 ? (
                                            <button
                                                type="button"
                                                onClick={() => setQty(p.id, 1)}
                                                aria-label={`${p.name} ekle`}
                                                className="flex size-12 shrink-0 items-center justify-center rounded-full bg-rb-gold text-rb-gold-foreground hover:opacity-90"
                                            >
                                                <Plus className="size-5.5" strokeWidth={2.4} aria-hidden="true" />
                                            </button>
                                        ) : (
                                            <div className="flex shrink-0 items-center gap-1 rounded-full bg-muted p-1">
                                                <button
                                                    type="button"
                                                    onClick={() => setQty(p.id, -1)}
                                                    aria-label={`${p.name} azalt`}
                                                    className="flex size-10 items-center justify-center rounded-full bg-card text-foreground"
                                                >
                                                    <Minus className="size-4.5" strokeWidth={2.4} aria-hidden="true" />
                                                </button>
                                                <span aria-live="polite" className="w-6 text-center text-base font-bold tabular-nums">{qty}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => setQty(p.id, 1)}
                                                    aria-label={`${p.name} ekle`}
                                                    className="flex size-10 items-center justify-center rounded-full bg-foreground text-background"
                                                >
                                                    <Plus className="size-4.5" strokeWidth={2.4} aria-hidden="true" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    {qty > 0 && (
                                        <div className="flex flex-wrap gap-1.5 pl-16">
                                            {chips.map(chip => {
                                                const on = note?.chips.includes(chip) ?? false;
                                                return (
                                                    <button
                                                        key={chip}
                                                        type="button"
                                                        aria-pressed={on}
                                                        onClick={() => toggleChip(p.id, chip)}
                                                        className={cn(
                                                            'min-h-9 rounded-full border px-3 text-[13px] font-semibold',
                                                            on ? 'border-rb-gold bg-rb-gold-bg text-foreground' : 'border-border bg-background text-rb-text-sub',
                                                        )}
                                                    >
                                                        {chip}
                                                    </button>
                                                );
                                            })}
                                            {noteEditorFor === p.id ? (
                                                <input
                                                    autoFocus
                                                    value={note?.text ?? ''}
                                                    onChange={e => setFreeNote(p.id, e.target.value)}
                                                    onBlur={() => setNoteEditorFor(null)}
                                                    onKeyDown={e => { if (e.key === 'Enter') setNoteEditorFor(null); }}
                                                    placeholder="Ürün notu"
                                                    aria-label={`${p.name} notu`}
                                                    className="h-9 min-w-40 flex-1 rounded-full border border-border bg-background px-3 text-[13px] outline-none focus:ring-2 focus:ring-rb-gold"
                                                />
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={() => setNoteEditorFor(p.id)}
                                                    className="min-h-9 rounded-full border border-dashed border-border px-3 text-[13px] font-semibold text-rb-text-sub"
                                                >
                                                    {note?.text ? `Not: ${note.text}` : '+ Not yaz'}
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                )}
                {cartCount > 0 && (
                    <label className="mt-4 block">
                        <span className="mb-1.5 block text-[13px] font-semibold text-rb-text-sub">Sipariş notu (isteğe bağlı)</span>
                        <textarea
                            value={orderNote}
                            onChange={e => setOrderNote(e.target.value)}
                            rows={2}
                            placeholder="Tüm masa için, ör. çocuk sandalyesi"
                            className="w-full resize-none rounded-2xl border border-border bg-card px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-rb-gold"
                        />
                    </label>
                )}
            </main>

            <div className="shrink-0 border-t border-border bg-card px-4 pt-3 pb-[max(14px,env(safe-area-inset-bottom))]">
                {cartCount === 0 ? (
                    <div className="flex h-14 items-center justify-center rounded-2xl bg-muted text-base font-semibold text-rb-text-sub">Ürün seçin</div>
                ) : (
                    <button
                        type="button"
                        onClick={send}
                        disabled={sending}
                        className="flex h-16 w-full items-center justify-between rounded-2xl bg-foreground px-5 text-background disabled:opacity-60"
                    >
                        <span className="flex flex-col items-start">
                            <span className="text-[17px] font-bold">{sending ? 'Gönderiliyor…' : 'Mutfağa gönder'}</span>
                            <span className="text-[13px] opacity-75">{cartCount} ürün{noteCount > 0 ? ` · ${noteCount} notlu` : ''}</span>
                        </span>
                        <span className="text-xl font-bold">₺{formatPrice(cartTotal)}</span>
                    </button>
                )}
            </div>
        </div>
    );
}
