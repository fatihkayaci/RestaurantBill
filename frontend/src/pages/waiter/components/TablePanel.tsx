import { useState, useEffect } from 'react';
import * as signalR from '@microsoft/signalr';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { productService } from '@/features/products/api/productService';
import { categoryService } from '@/features/categories/api/categoryService';
import { orderService } from '@/features/orders/api/orderService';
import { tableService } from '@/features/tables/api/tableService';
import type { Table } from '@/features/tables/types';
import type { Product } from '@/features/products/types';
import type { Category } from '@/features/categories/types';
import type { Order } from '@/features/orders/types';

type PanelTab = 'orders' | 'new-order' | 'reservation';

export interface ReservationInfo {
    name: string;
    time: string;
    note: string;
}

interface CartItem {
    productId: number;
    productName: string;
    unitPrice: number;
    quantity: number;
}

const STATUS_CONFIG = {
    1: { label: 'BOŞ', cls: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' },
    2: { label: 'DOLU', cls: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400' },
    3: { label: 'REZERVE', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' },
} as const;

interface Props {
    table: Table;
    onClose: () => void;
    onTableUpdated?: (tableId: number, status: number) => void;
    reservationInfo?: ReservationInfo;
    onReservationSaved?: (tableId: number, info: ReservationInfo) => void;
}

export default function TablePanel({ table, onClose, onTableUpdated, reservationInfo, onReservationSaved }: Props) {
    const [activeTab, setActiveTab] = useState<PanelTab>('new-order');
    const [categories, setCategories] = useState<Category[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
    const [activeOrder, setActiveOrder] = useState<Order | null>(null);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [reservationName, setReservationName] = useState('');
    const [reservationTime, setReservationTime] = useState('');
    const [reservationNote, setReservationNote] = useState('');
    const [savingReservation, setSavingReservation] = useState(false);
    const [servingItemId, setServingItemId] = useState<number | null>(null);
    const [servingAll, setServingAll] = useState(false);
    const [orderNote, setOrderNote] = useState('');
    const [arriving, setArriving] = useState(false);

    useEffect(() => {
        setCart([]);
        setActiveOrder(null);
        setActiveTab(table.status === 3 ? 'reservation' : 'new-order');
        setLoading(true);
        setReservationName('');
        setReservationTime('');
        setReservationNote('');
        setOrderNote('');

        const fetchData = async () => {
            try {
                const [cats, prods] = await Promise.all([
                    categoryService.getCategories(),
                    productService.getProducts(),
                ]);
                setCategories(cats);
                setProducts(prods);
                if (cats.length > 0) setSelectedCategoryId(cats[0].id);

                try {
                    const order = await orderService.getOrderByTableId(String(table.id));
                    if (order) {
                        setActiveOrder({
                            ...order,
                            orderItems: order.orderItems.map(i => ({ ...i, is_load: true })),
                        });
                        setOrderNote(order.note ?? '');
                        setActiveTab('orders');
                    }
                } catch {
                    // Sipariş yok, yeni sipariş sekmesi açık kalır
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [table.id]);

    useEffect(() => {
        const connection = new signalR.HubConnectionBuilder()
            .withUrl(`${import.meta.env.VITE_API_URL ?? 'http://localhost:5077'}/table-hub`)
            .withAutomaticReconnect()
            .configureLogging({
                log(logLevel: signalR.LogLevel, message: string) {
                    if (message.includes('stopped during negotiation')) return;
                    if (logLevel >= signalR.LogLevel.Error) console.error(message);
                },
            })
            .build();

        const refreshOrder = () => {
            orderService.getOrderByTableId(String(table.id)).then(data => {
                if (data) {
                    setActiveOrder({
                        ...data,
                        orderItems: data.orderItems.map(i => ({ ...i, is_load: true })),
                    });
                }
            }).catch(() => {});
        };

        connection.on('OrderUpdated', (changedTableId: number) => {
            if (changedTableId === table.id) refreshOrder();
        });

        connection.on('OrderClosed', (changedTableId: number) => {
            if (changedTableId === table.id) setActiveOrder(null);
        });

        connection.start().catch((err: Error) => {
            if (!err.message.includes('stopped during negotiation')) {
                console.error('SignalR Connection Error:', err);
            }
        });

        return () => {
            connection.stop();
        };
    }, [table.id]);

    const filteredProducts = products.filter(p =>
        p.isActive && (selectedCategoryId === null || p.categoryId === selectedCategoryId)
    );

    const getCartQty = (productId: number) =>
        cart.find(c => c.productId === productId)?.quantity ?? 0;

    const addToCart = (product: Product) => {
        setCart(prev => {
            const existing = prev.find(c => c.productId === product.id);
            if (existing) return prev.map(c => c.productId === product.id ? { ...c, quantity: c.quantity + 1 } : c);
            return [...prev, { productId: product.id, productName: product.name, unitPrice: product.price, quantity: 1 }];
        });
    };

    const decreaseCart = (productId: number) => {
        setCart(prev => {
            const existing = prev.find(c => c.productId === productId);
            if (!existing) return prev;
            if (existing.quantity <= 1) return prev.filter(c => c.productId !== productId);
            return prev.map(c => c.productId === productId ? { ...c, quantity: c.quantity - 1 } : c);
        });
    };

    const cartTotal = cart.reduce((sum, c) => sum + c.unitPrice * c.quantity, 0);
    const cartCount = cart.reduce((sum, c) => sum + c.quantity, 0);

    const handleSendOrder = async () => {
        if (cart.length === 0) return;
        try {
            setSubmitting(true);

            let orderId = activeOrder?.id ?? 0;

            if (!orderId) {
                // Masa kapalıysa aç (yeni sipariş oluşturur backend tarafında)
                await tableService.openTable(String(table.id));
                onTableUpdated?.(table.id, 2);

                const newOrder = await orderService.getOrderByTableId(String(table.id));
                if (newOrder) orderId = newOrder.id;
            }

            if (!orderId) {
                toast.error('Sipariş başlatılamadı.');
                return;
            }

            const payload: Order = {
                id: orderId,
                tableId: table.id,
                note: orderNote,
                totalPrice: cartTotal,
                status: 1,
                orderItems: cart.map(c => ({
                    id: 0,
                    productId: c.productId,
                    productName: c.productName,
                    unitPrice: c.unitPrice,
                    quantity: c.quantity,
                    status: 1,
                    is_load: false,
                })),
            };

            await orderService.addOrderItems(payload);
            toast.success('Sipariş gönderildi!');
            setCart([]);

            const refreshed = await orderService.getOrderByTableId(String(table.id));
            if (refreshed) {
                setActiveOrder({
                    ...refreshed,
                    orderItems: refreshed.orderItems.map(i => ({ ...i, is_load: true })),
                });
            }
            setActiveTab('orders');
        } catch (err: any) {
            toast.error(err.response?.data?.message ?? 'Sipariş gönderilemedi.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleCloseTable = async () => {
        if (!activeOrder) return;
        const confirmed = window.confirm('Dikkat: Bu siparişin tamamı iptal edilecek ve masa boşaltılacaktır. Emin misiniz?');
        if (!confirmed) return;

        try {
            await orderService.cancelOrder(activeOrder.id);
            onTableUpdated?.(table.id, 1);
            toast.success('Masa kapatıldı.');
            onClose();
        } catch (err: any) {
            toast.error(err.response?.data?.message ?? 'Masa kapatılamadı.');
        }
    };

    const handleSaveReservation = async () => {
        try {
            setSavingReservation(true);
            await tableService.reservationTable(String(table.id));
            onReservationSaved?.(table.id, { name: reservationName, time: reservationTime, note: reservationNote });
            onTableUpdated?.(table.id, 3);
            toast.success('Rezervasyon kaydedildi.');
            onClose();
        } catch (err: any) {
            toast.error(err.response?.data?.message ?? 'Rezervasyon kaydedilemedi.');
        } finally {
            setSavingReservation(false);
        }
    };

    const handleMarkServed = async (itemId: number) => {
        try {
            setServingItemId(itemId);
            await orderService.updateOrderItemStatus(activeOrder!.id, itemId, 4);
            setActiveOrder(prev => prev ? {
                ...prev,
                orderItems: prev.orderItems.map(i => i.id === itemId ? { ...i, status: 4 } : i),
            } : prev);
        } catch (err: any) {
            toast.error(err.response?.data?.message ?? 'Servis edildi olarak işaretlenemedi.');
        } finally {
            setServingItemId(null);
        }
    };

    const handleServeAll = async () => {
        if (!activeOrder) return;
        try {
            setServingAll(true);
            await orderService.updateOrderStatus(activeOrder.id, 5);
            setActiveOrder(prev => prev ? {
                ...prev,
                orderItems: prev.orderItems.map(i => i.status === 3 ? { ...i, status: 4 } : i),
            } : prev);
            toast.success('Ürünler servis edildi olarak işaretlendi.');
        } catch (err: any) {
            toast.error(err.response?.data?.message ?? 'Servis edilemedi.');
        } finally {
            setServingAll(false);
        }
    };

    const handleCustomerArrived = async () => {
        try {
            setArriving(true);
            await tableService.cancelReservation(String(table.id));
            await tableService.openTable(String(table.id));
            onTableUpdated?.(table.id, 2);

            const newOrder = await orderService.getOrderByTableId(String(table.id));
            if (newOrder) {
                setActiveOrder({
                    ...newOrder,
                    orderItems: newOrder.orderItems.map(i => ({ ...i, is_load: true })),
                });
            }
            setActiveTab('new-order');
            toast.success('Masa açıldı, müşteri karşılandı!');
        } catch (err: any) {
            toast.error(err.response?.data?.message ?? 'Masa açılamadı.');
        } finally {
            setArriving(false);
        }
    };

    const handleCancelReservation = async () => {
        try {
            await tableService.cancelReservation(String(table.id));
            onTableUpdated?.(table.id, 1);
            toast.success('Rezervasyon iptal edildi.');
            onClose();
        } catch (err: any) {
            toast.error(err.response?.data?.message ?? 'Rezervasyon iptal edilemedi.');
        }
    };

    const statusCfg = STATUS_CONFIG[table.status as 1 | 2 | 3] ?? { label: '', cls: '' };

    return (
        <div className="flex flex-col h-full bg-background">
            {/* Header */}
            <div className="px-6 pt-5 pb-4 border-b shrink-0">
                <div className="flex items-start justify-between">
                    <div>
                        <h2 className="text-2xl font-serif font-bold text-foreground">{table.name}</h2>
                        <div className="mt-1.5">
                            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${statusCfg.cls}`}>
                                {statusCfg.label}
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b shrink-0">
                {(
                    table.status === 1 || table.status === 3
                        ? (['orders', 'new-order', 'reservation'] as PanelTab[])
                        : (['orders', 'new-order'] as PanelTab[])
                ).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`flex-1 py-3 text-sm font-medium transition-colors ${
                            activeTab === tab
                                ? 'text-foreground border-b-2 border-blue-500'
                                : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        {tab === 'orders' ? 'Siparişler' : tab === 'new-order' ? 'Yeni Sipariş' : 'Rezervasyon'}
                    </button>
                ))}
            </div>

            {/* İçerik */}
            {loading ? (
                <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                    Yükleniyor...
                </div>
            ) : activeTab === 'new-order' ? (
                <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Kategori pilleri */}
                    <div className="flex gap-2 px-4 py-3 overflow-x-auto shrink-0 border-b" style={{ scrollbarWidth: 'none' }}>
                        {categories.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setSelectedCategoryId(cat.id)}
                                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                                    selectedCategoryId === cat.id
                                        ? 'bg-blue-500 text-white'
                                        : 'bg-muted text-muted-foreground hover:bg-muted/70'
                                }`}
                            >
                                {cat.name}
                            </button>
                        ))}
                    </div>

                    {/* Ürün listesi */}
                    <div className="flex-1 overflow-y-auto px-4">
                        {filteredProducts.length === 0 ? (
                            <p className="text-center text-muted-foreground text-sm py-8">Ürün bulunamadı</p>
                        ) : (
                            filteredProducts.map(product => {
                                const qty = getCartQty(product.id);
                                return (
                                    <div key={product.id} className="flex items-center justify-between py-3.5 border-b last:border-0">
                                        <div>
                                            <p className="text-sm font-medium text-foreground">{product.name}</p>
                                            <p className="text-xs text-muted-foreground mt-0.5">₺{product.price}</p>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            {qty > 0 && (
                                                <>
                                                    <button
                                                        onClick={() => decreaseCart(product.id)}
                                                        className="w-7 h-7 rounded-full border border-border flex items-center justify-center text-base font-bold text-muted-foreground hover:bg-muted transition-colors"
                                                    >
                                                        −
                                                    </button>
                                                    <span className="w-5 text-center text-sm font-bold text-foreground">{qty}</span>
                                                </>
                                            )}
                                            <button
                                                onClick={() => addToCart(product)}
                                                className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center text-white text-xl font-bold hover:bg-blue-600 transition-colors"
                                            >
                                                +
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Sepet özeti */}
                    {cart.length > 0 && (
                        <div className="shrink-0 px-4 py-4 border-t bg-background">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-sm text-muted-foreground">Sepet ({cartCount} ürün)</span>
                                <span className="font-bold text-foreground">₺{cartTotal.toFixed(0)}</span>
                            </div>
                            <textarea
                                value={orderNote}
                                onChange={e => setOrderNote(e.target.value)}
                                placeholder="Sipariş notu (isteğe bağlı) — örn. acısız, az pişmiş..."
                                rows={2}
                                className="w-full mb-3 rounded-xl border bg-background px-3.5 py-2.5 text-sm outline-none resize-none focus:ring-2 focus:ring-blue-500"
                            />
                            <Button
                                onClick={handleSendOrder}
                                disabled={submitting}
                                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl h-11"
                            >
                                {submitting ? 'Gönderiliyor...' : 'Siparişi Gönder →'}
                            </Button>
                        </div>
                    )}
                </div>
            ) : activeTab === 'reservation' ? (
                table.status === 3 ? (
                    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
                        <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-xs px-4 py-3">
                            Bu masa rezerve edilmiştir.
                        </div>

                        {reservationInfo ? (
                            <div className="rounded-xl border divide-y">
                                <div className="flex justify-between items-center px-4 py-3">
                                    <span className="text-xs text-muted-foreground font-medium">Ad Soyad</span>
                                    <span className="text-sm font-bold text-foreground">{reservationInfo.name || '—'}</span>
                                </div>
                                <div className="flex justify-between items-center px-4 py-3">
                                    <span className="text-xs text-muted-foreground font-medium">Saat</span>
                                    <span className="text-sm font-bold text-amber-600 dark:text-amber-400">{reservationInfo.time || '—'}</span>
                                </div>
                                <div className="flex justify-between items-center px-4 py-3">
                                    <span className="text-xs text-muted-foreground font-medium">Not</span>
                                    <span className="text-sm font-medium text-foreground text-right">{reservationInfo.note || '—'}</span>
                                </div>
                            </div>
                        ) : (
                            <p className="text-center text-muted-foreground text-sm py-6">
                                Bu rezervasyon için detay girilmemiş.
                            </p>
                        )}

                        <Button
                            onClick={handleCustomerArrived}
                            disabled={arriving}
                            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl h-11 disabled:opacity-60"
                        >
                            {arriving ? 'Açılıyor...' : 'Müşteri Geldi (Masayı Aç)'}
                        </Button>

                        <Button
                            onClick={handleCancelReservation}
                            variant="outline"
                            disabled={arriving}
                            className="w-full border-destructive/30 text-destructive hover:bg-destructive/10 font-semibold rounded-xl h-11"
                        >
                            Rezervasyonu İptal Et
                        </Button>
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
                        <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-xs px-4 py-3">
                            Bu masayı belirli bir saat için ayırın. Rezervasyon kaydedildiğinde masa durumu "Rezerve" olarak güncellenir.
                        </div>

                        <div>
                            <label className="text-[11px] font-bold text-muted-foreground tracking-wide">AD SOYAD</label>
                            <input
                                value={reservationName}
                                onChange={e => setReservationName(e.target.value)}
                                placeholder="Misafir adı..."
                                className="mt-1.5 w-full rounded-xl border bg-background px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="text-[11px] font-bold text-muted-foreground tracking-wide">REZERVASYON SAATİ</label>
                            <input
                                type="time"
                                value={reservationTime}
                                onChange={e => setReservationTime(e.target.value)}
                                className="mt-1.5 w-full rounded-xl border bg-background px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="text-[11px] font-bold text-muted-foreground tracking-wide">NOT (İSTEĞE BAĞLI)</label>
                            <input
                                value={reservationNote}
                                onChange={e => setReservationNote(e.target.value)}
                                placeholder="Doğum günü, özel istek..."
                                className="mt-1.5 w-full rounded-xl border bg-background px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <Button
                            onClick={handleSaveReservation}
                            disabled={savingReservation}
                            className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl h-11"
                        >
                            {savingReservation ? 'Kaydediliyor...' : 'Rezervasyonu Kaydet'}
                        </Button>
                    </div>
                )
            ) : (
                /* Siparişler tab */
                <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col">
                    {!activeOrder || activeOrder.orderItems.length === 0 ? (
                        <p className="text-center text-muted-foreground text-sm py-10">
                            Aktif sipariş bulunmuyor
                        </p>
                    ) : (
                        <>
                            {activeOrder.note && (
                                <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-xs px-4 py-3 mb-3">
                                    <span className="font-bold">Not: </span>{activeOrder.note}
                                </div>
                            )}
                            <div className="space-y-0 divide-y divide-border">
                                {activeOrder.orderItems.map((item) => {
                                    const statusLabel = item.status === 1 ? 'Bekliyor' : item.status === 2 ? 'Hazırlanıyor' : item.status === 3 ? 'Hazır' : 'Servis Edildi';
                                    const statusColor = item.status === 1
                                        ? 'text-amber-500'
                                        : item.status === 2
                                        ? 'text-blue-500'
                                        : item.status === 3
                                        ? 'text-green-500'
                                        : 'text-muted-foreground';
                                    return (
                                        <div key={item.id} className="flex items-center justify-between py-3 gap-3">
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-foreground truncate">{item.productName}</p>
                                                <p className={`text-xs mt-0.5 ${statusColor}`}>{item.quantity}x · {statusLabel}</p>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                {item.status === 3 && (
                                                    <button
                                                        onClick={() => handleMarkServed(item.id)}
                                                        disabled={servingItemId === item.id}
                                                        className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-60 transition-colors"
                                                    >
                                                        {servingItemId === item.id ? '...' : 'Servis Et'}
                                                    </button>
                                                )}
                                                <span className="text-sm font-semibold text-foreground">
                                                    ₺{(item.unitPrice * item.quantity).toFixed(0)}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="flex justify-between pt-4 mt-2 border-t font-bold text-foreground">
                                <span>Toplam</span>
                                <span>₺{activeOrder.totalPrice.toFixed(0)}</span>
                            </div>
                        </>
                    )}
                    {table.status === 2 && activeOrder && (
                        <div className={`flex items-center gap-2 mt-4 ${activeOrder.orderItems.length === 0 ? 'pt-4 border-t' : ''}`}>
                            {activeOrder.orderItems.some(i => i.status === 3) && (
                                <button
                                    onClick={handleServeAll}
                                    disabled={servingAll}
                                    className="flex-1 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-sm py-2.5 disabled:opacity-60 transition-colors"
                                >
                                    {servingAll ? 'İşleniyor...' : 'Servis Et'}
                                </button>
                            )}
                            <button
                                onClick={handleCloseTable}
                                className="flex-1 rounded-xl border border-destructive/30 text-destructive font-semibold text-sm py-2.5 hover:bg-destructive/10 transition-colors"
                            >
                                Masayı Kapat (İptal)
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
