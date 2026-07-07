import { useEffect, useRef, useState } from "react";
import * as signalR from "@microsoft/signalr";
import { toast } from "sonner";
import type { Table, Reservation } from "@/features/tables/types";
import type { Order, OrderItem } from "@/features/orders/types";
import type { CashRegister } from "@/features/cashier/types";
import type { Product } from "@/features/products/types";
import type { Category } from "@/features/categories/types";
import { tableService } from "@/features/tables/api/tableService";
import { orderService } from "@/features/orders/api/orderService";
import { cashRegisterService } from "@/features/cashier/api/cashRegisterService";
import { productService } from "@/features/products/api/productService";
import { categoryService } from "@/features/categories/api/categoryService";
import { Button } from '@/components/ui/button';
import { Input } from "@/components/ui/input";
import { CheckCircle, Landmark, X, Pencil } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { cn } from "@/lib/utils";
import axios from "axios";

const TAX_RATE = 0.08;

type PanelTab = 'orders' | 'new-order' | 'reservation' | 'payment';

const ORDER_ITEM_STATUS_LABELS: Record<number, string> = {
    1: "Bekliyor", 2: "Hazırlanıyor", 3: "Hazır", 4: "Servis Edildi",
};
const ORDER_ITEM_STATUS_TEXT_COLOR: Record<number, string> = {
    1: "text-amber-500", 2: "text-blue-500", 3: "text-green-500", 4: "text-muted-foreground",
};

const statusBadge: Record<number, string> = {
    1: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
    2: "bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
    3: "bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400",
    4: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
};
const statusLabel: Record<number, string> = {
    1: "Boş", 2: "Dolu", 3: "Rezerve", 4: "Kapalı",
};

const PANEL_STATUS_CONFIG: Record<number, { label: string; cls: string }> = {
    1: { label: 'BOŞ', cls: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' },
    2: { label: 'DOLU', cls: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400' },
    3: { label: 'REZERVE', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' },
};

const inputClass = "w-full rounded-lg border border-border bg-[rgb(245,240,232)] dark:bg-[#2a2520] px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring";
const labelClass = "block text-[11px] font-semibold tracking-widest uppercase text-muted-foreground mb-1.5";

function formatTimeDigits(rawValue: string): string {
    let digits = rawValue.replace(/\D/g, '').slice(0, 4);

    if (digits.length >= 1 && Number(digits[0]) > 2) {
        digits = '2' + digits.slice(1);
    }
    if (digits.length >= 2 && digits[0] === '2' && Number(digits[1]) > 3) {
        digits = digits[0] + '3' + digits.slice(2);
    }
    if (digits.length >= 3 && Number(digits[2]) > 5) {
        digits = digits.slice(0, 2) + '5' + digits.slice(3);
    }

    return digits.length > 2 ? `${digits.slice(0, 2)}:${digits.slice(2)}` : digits;
}

export default function Tables() {
    const [tables, setTables] = useState<Table[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editTable, setEditTable] = useState<Table | null>(null);
    const [newTableName, setNewTableName] = useState('');
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);

    const [selectedTableId, setSelectedTableId] = useState<number | null>(null);
    const selectedTable = tables.find(t => t.id === selectedTableId) ?? null;
    const selectedTableIdRef = useRef<number | null>(null);
    useEffect(() => { selectedTableIdRef.current = selectedTableId; }, [selectedTableId]);

    const [activeTab, setActiveTab] = useState<PanelTab>('new-order');
    const [panelLoading, setPanelLoading] = useState(true);

    const [categories, setCategories] = useState<Category[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
    const [tableOrder, setTableOrder] = useState<Order | null>(null);
    const [newItems, setNewItems] = useState<OrderItem[]>([]);
    const [orderNote, setOrderNote] = useState('');
    const [isSendingOrder, setIsSendingOrder] = useState(false);

    const [cashRegisters, setCashRegisters] = useState<CashRegister[]>([]);
    const [tip, setTip] = useState<number>(0);
    const [selectedCashRegisterId, setSelectedCashRegisterId] = useState<string>('');
    const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
    const [completingPayment, setCompletingPayment] = useState(false);

    const [reservationName, setReservationName] = useState('');
    const [reservationContact, setReservationContact] = useState('');
    const [reservationTime, setReservationTime] = useState('');
    const [reservationNote, setReservationNote] = useState('');
    const [savingReservation, setSavingReservation] = useState(false);
    const [activeReservation, setActiveReservation] = useState<Reservation | null>(null);
    const [arriving, setArriving] = useState(false);
    const [cancelingReservation, setCancelingReservation] = useState(false);

    const refreshTables = async () => {
        const updated = await tableService.getTables();
        setTables(updated);
    };

    useEffect(() => {
        refreshTables().catch(console.error);
    }, []);

    useEffect(() => {
        const connection = new signalR.HubConnectionBuilder()
            .withUrl(`${import.meta.env.VITE_API_URL ?? 'http://localhost:5077'}/table-hub`, {
                accessTokenFactory: () => localStorage.getItem('token') ?? '',
            })
            .withAutomaticReconnect()
            .configureLogging({
                log(logLevel: signalR.LogLevel, message: string) {
                    if (message.includes("stopped during negotiation")) return;
                    if (logLevel >= signalR.LogLevel.Error) console.error(message);
                }
            })
            .build();

        connection.on("TableStatusChanged", (changedTableId: number, status: number) => {
            setTables(prev => prev.map(t => t.id === changedTableId ? { ...t, status } : t));
        });
        connection.on("OrderUpdated", (changedTableId: number) => {
            if (selectedTableIdRef.current === changedTableId) {
                orderService.getOrderByTableId(changedTableId.toString()).then(data => { if (data) setTableOrder(data); });
            }
        });
        connection.start().catch((err: Error) => {
            if (!err.message.includes("stopped during negotiation")) console.error("SignalR Connection Error:", err);
        });
        return () => { connection.stop(); };
    }, []);

    const openCreateModal = () => {
        setEditTable(null);
        setNewTableName('');
        setFieldErrors({});
        setIsModalOpen(true);
    };

    const openEditModal = (table: Table) => {
        setEditTable(table);
        setNewTableName(table.name);
        setFieldErrors({});
        setIsModalOpen(true);
    };

    const handleSubmit = async () => {
        const errors: Record<string, string> = {};
        if (!newTableName.trim()) errors.name = 'Masa adı boş olamaz.';
        else if (newTableName.length > 50) errors.name = 'En fazla 50 karakter.';
        if (Object.keys(errors).length > 0) { setFieldErrors(errors); return; }
        setFieldErrors({});

        try {
            if (editTable) {
                await tableService.updateTable(editTable.id, newTableName.trim());
            } else {
                await tableService.createTable(newTableName.trim());
            }
            await refreshTables();
            setIsModalOpen(false);
        } catch (err: unknown) {
            if (axios.isAxiosError(err)) {
                const backendErrors = err.response?.data?.errors as Record<string, string[]> | undefined;
                if (backendErrors) {
                    const mapped: Record<string, string> = {};
                    for (const key in backendErrors) mapped[key.charAt(0).toLowerCase() + key.slice(1)] = backendErrors[key][0];
                    setFieldErrors(mapped);
                }
            }
        }
    };

    const handleDelete = async () => {
        if (deleteTargetId === null) return;
        await tableService.deleteTable(deleteTargetId);
        setTables(prev => prev.filter(t => t.id !== deleteTargetId));
        setDeleteTargetId(null);
    };

    // Panel açıldığında (veya farklı bir masa seçildiğinde) menü/sipariş/rezervasyon verisini yükler.
    // Waiter panelindeki mantığın aynısı: sadece masa id'sine bağlı, durum geçişleri ilgili
    // handler'lar tarafından (ör. handleSendOrder) sekme değişimiyle birlikte yönetilir.
    useEffect(() => {
        if (!selectedTable) return;
        setNewItems([]);
        setOrderNote('');
        setTableOrder(null);
        setTip(0);
        setSelectedCashRegisterId('');
        setActiveTab(selectedTable.status === 3 ? 'reservation' : 'new-order');
        setReservationName('');
        setReservationContact('');
        setReservationTime('');
        setReservationNote('');
        setActiveReservation(null);
        setPanelLoading(true);

        (async () => {
            try {
                const [cats, prods] = await Promise.all([
                    categoryService.getCategories(),
                    productService.getProducts(),
                ]);
                setCategories(cats);
                setProducts(prods.filter(p => p.isActive));
                if (cats.length > 0) setSelectedCategoryId(cats[0].id);

                try {
                    const order = await orderService.getOrderByTableId(selectedTable.id.toString());
                    if (order) {
                        setTableOrder(order);
                        setOrderNote(order.note ?? '');
                        setActiveTab('orders');
                    }
                } catch {
                    // Aktif sipariş yok, "Yeni Sipariş" sekmesi açık kalır
                }

                const registers = await cashRegisterService.getCashRegisters();
                setCashRegisters(registers.filter(r => r.status === 1));

                if (selectedTable.status === 3) {
                    const reservation = await tableService.getActiveReservation(selectedTable.id.toString());
                    setActiveReservation(reservation);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setPanelLoading(false);
            }
        })();
    }, [selectedTableId]);

    const closePanel = () => {
        setSelectedTableId(null);
        setTableOrder(null);
        setNewItems([]);
        setOrderNote('');
        setTip(0);
        setSelectedCashRegisterId('');
        setProducts([]);
        setCategories([]);
        setActiveReservation(null);
    };

    const increaseNewItem = (product: Product) => {
        setNewItems(prev => {
            const existing = prev.find(i => i.productId === product.id);
            if (existing) return prev.map(i => i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i);
            return [...prev, { id: 0, productId: product.id, productName: product.name, unitPrice: product.price, quantity: 1, status: 1, is_load: false }];
        });
    };
    const decreaseNewItem = (productId: number) => {
        setNewItems(prev => {
            const item = prev.find(i => i.productId === productId);
            if (!item) return prev;
            if (item.quantity === 1) return prev.filter(i => i.productId !== productId);
            return prev.map(i => i.productId === productId ? { ...i, quantity: i.quantity - 1 } : i);
        });
    };

    const handleSendOrder = async () => {
        if (!selectedTable || newItems.length === 0) return;
        setIsSendingOrder(true);
        try {
            let order = tableOrder;
            if (!order) {
                await tableService.openTable(selectedTable.id.toString());
                await refreshTables();
                order = await orderService.getOrderByTableId(selectedTable.id.toString());
            }
            if (!order) {
                toast.error('Sipariş başlatılamadı.');
                return;
            }
            await orderService.addOrderItems({ ...order, note: orderNote, orderItems: newItems });
            toast.success('Sipariş gönderildi!');
            const refreshed = await orderService.getOrderByTableId(selectedTable.id.toString());
            setTableOrder(refreshed);
            setNewItems([]);
            setActiveTab('orders');
        } catch (err) {
            console.error(err);
            toast.error('Sipariş gönderilemedi.');
        } finally {
            setIsSendingOrder(false);
        }
    };

    const calculateTotal = () => !tableOrder ? 0 : tableOrder.totalPrice + tableOrder.totalPrice * TAX_RATE + tip;

    const handleCompletePayment = async () => {
        if (!tableOrder || !selectedCashRegisterId) return;
        setCompletingPayment(true);
        try {
            await cashRegisterService.addTransaction(Number(selectedCashRegisterId), 1, calculateTotal());
            await orderService.closeOrder(tableOrder.id);
            await refreshTables();
            toast.success('Ödeme tamamlandı.');
            closePanel();
        } catch (err) {
            console.error(err);
            toast.error('Ödeme tamamlanamadı.');
        } finally {
            setCompletingPayment(false);
        }
    };

    const handleCancelOrder = async () => {
        if (!tableOrder) return;
        try {
            await orderService.cancelOrder(tableOrder.id);
            await refreshTables();
            setCancelConfirmOpen(false);
            toast.success('Sipariş iptal edildi.');
            closePanel();
        } catch (err) {
            console.error(err);
            toast.error('Sipariş iptal edilemedi.');
        }
    };

    const handleSaveReservation = async () => {
        if (!selectedTable) return;
        if (!reservationName.trim() || !reservationTime) {
            toast.error('Ad soyad ve rezervasyon saati zorunludur.');
            return;
        }
        if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(reservationTime)) {
            toast.error('Rezervasyon saati SS:DD formatında olmalıdır (örn. 19:30).');
            return;
        }
        setSavingReservation(true);
        try {
            await tableService.reservationTable(selectedTable.id.toString(), reservationName, reservationContact, reservationTime, reservationNote);
            await refreshTables();
            toast.success('Rezervasyon kaydedildi.');
            closePanel();
        } catch (err) {
            console.error(err);
            toast.error('Rezervasyon kaydedilemedi.');
        } finally {
            setSavingReservation(false);
        }
    };

    const handleCustomerArrived = async () => {
        if (!selectedTable) return;
        setArriving(true);
        try {
            await tableService.cancelReservation(selectedTable.id.toString());
            await tableService.openTable(selectedTable.id.toString());
            await refreshTables();
            const newOrder = await orderService.getOrderByTableId(selectedTable.id.toString());
            setTableOrder(newOrder);
            setActiveTab('new-order');
            toast.success('Masa açıldı, müşteri karşılandı!');
        } catch (err) {
            console.error(err);
            toast.error('Masa açılamadı.');
        } finally {
            setArriving(false);
        }
    };

    const handleCancelReservation = async () => {
        if (!selectedTable) return;
        setCancelingReservation(true);
        try {
            await tableService.cancelReservation(selectedTable.id.toString());
            await refreshTables();
            toast.success('Rezervasyon iptal edildi.');
            closePanel();
        } catch (err) {
            console.error(err);
            toast.error('Rezervasyon iptal edilemedi.');
        } finally {
            setCancelingReservation(false);
        }
    };

    const handleTableClick = (table: Table) => {
        if (table.status === 1 || table.status === 2 || table.status === 3) setSelectedTableId(table.id);
    };

    const filteredProducts = selectedCategoryId ? products.filter(p => p.categoryId === selectedCategoryId) : products;

    const visibleTabs: PanelTab[] = !selectedTable
        ? []
        : selectedTable.status === 3
            ? ['reservation']
            : selectedTable.status === 1
                ? ['orders', 'new-order', 'reservation']
                : ['orders', 'new-order', 'payment'];

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-serif font-bold text-foreground">Masalar</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">{tables.length} masa</p>
                </div>
                <button
                    onClick={openCreateModal}
                    className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                >
                    + Masa Ekle
                </button>
            </div>

            {/* Table Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {tables.map(table => (
                    <div
                        key={table.id}
                        className="bg-card border border-border rounded-xl p-4 flex flex-col gap-2.5 hover:shadow-sm transition-shadow"
                    >
                        {/* Name + edit + status */}
                        <div className="flex items-start justify-between gap-1">
                            <button
                                className="text-lg font-serif font-bold text-foreground leading-tight text-left hover:underline"
                                onClick={() => handleTableClick(table)}
                            >
                                {table.name}
                            </button>
                            <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                    onClick={e => { e.stopPropagation(); openEditModal(table); }}
                                    className="text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    <Pencil className="h-3 w-3" />
                                </button>
                                <span className={cn("text-[10px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded", statusBadge[table.status] ?? statusBadge[4])}>
                                    {statusLabel[table.status] ?? 'Kapalı'}
                                </span>
                            </div>
                        </div>

                        {/* Delete */}
                        <button
                            onClick={() => setDeleteTargetId(table.id)}
                            className="mt-auto w-full py-1.5 text-xs border border-border rounded-lg text-muted-foreground hover:bg-muted transition-colors"
                        >
                            Masayı Sil
                        </button>
                    </div>
                ))}
            </div>

            {/* Masa Ekle / Düzenle Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
                    <div className="relative bg-white dark:bg-[#26221e] rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
                        <div className="px-6 pt-6 pb-4 border-b border-border flex items-center justify-between">
                            <h2 className="text-xl font-bold text-foreground">
                                {editTable ? 'Masayı Düzenle' : 'Masa Ekle'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="px-6 py-5">
                            <div>
                                <label className={labelClass}>Masa Adı</label>
                                <input
                                    className={cn(inputClass, fieldErrors.name && "border-destructive")}
                                    value={newTableName}
                                    onChange={e => setNewTableName(e.target.value)}
                                    placeholder="Masa 1"
                                    autoFocus
                                />
                                {fieldErrors.name && <p className="text-xs text-destructive mt-1">{fieldErrors.name}</p>}
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-3">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="px-4 py-2 text-sm rounded-lg border border-border text-foreground hover:bg-muted transition-colors"
                            >
                                İptal
                            </button>
                            <button
                                onClick={handleSubmit}
                                className="px-4 py-2 text-sm rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors"
                            >
                                Kaydet
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Masa Silme Onay */}
            <AlertDialog open={deleteTargetId !== null} onOpenChange={open => !open && setDeleteTargetId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Masayı sil</AlertDialogTitle>
                        <AlertDialogDescription>Bu masayı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>İptal</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Sil</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Masa Paneli — sağdan kayan panel, waiter panelindeki tasarım/mantığın aynısı */}
            {selectedTable && (
                <>
                    <div
                        className="fixed inset-0 z-20 bg-black/55 backdrop-blur-sm animate-in fade-in duration-200"
                        onClick={closePanel}
                    />
                    <div className="fixed top-0 right-0 bottom-0 z-30 w-full sm:w-110 shadow-2xl animate-in slide-in-from-right duration-300 bg-background flex flex-col">
                        {/* Header */}
                        <div className="px-6 pt-5 pb-4 border-b shrink-0">
                            <div className="flex items-start justify-between">
                                <div>
                                    <h2 className="text-2xl font-serif font-bold text-foreground">{selectedTable.name}</h2>
                                    <div className="mt-1.5">
                                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${(PANEL_STATUS_CONFIG[selectedTable.status] ?? PANEL_STATUS_CONFIG[1]).cls}`}>
                                            {(PANEL_STATUS_CONFIG[selectedTable.status] ?? PANEL_STATUS_CONFIG[1]).label}
                                        </span>
                                    </div>
                                </div>
                                <button onClick={closePanel} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className="flex border-b shrink-0">
                            {visibleTabs.map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`flex-1 py-3 text-sm font-medium transition-colors ${
                                        activeTab === tab
                                            ? 'text-foreground border-b-2 border-blue-500'
                                            : 'text-muted-foreground hover:text-foreground'
                                    }`}
                                >
                                    {tab === 'orders' ? 'Siparişler' : tab === 'new-order' ? 'Yeni Sipariş' : tab === 'payment' ? 'Ödeme' : 'Rezervasyon'}
                                </button>
                            ))}
                        </div>

                        {/* İçerik */}
                        {panelLoading ? (
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
                                            const qty = newItems.find(i => i.productId === product.id)?.quantity ?? 0;
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
                                                                    onClick={() => decreaseNewItem(product.id)}
                                                                    className="w-7 h-7 rounded-full border border-border flex items-center justify-center text-base font-bold text-muted-foreground hover:bg-muted transition-colors"
                                                                >
                                                                    −
                                                                </button>
                                                                <span className="w-5 text-center text-sm font-bold text-foreground">{qty}</span>
                                                            </>
                                                        )}
                                                        <button
                                                            onClick={() => increaseNewItem(product)}
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
                                {newItems.length > 0 && (
                                    <div className="shrink-0 px-4 py-4 border-t bg-background">
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="text-sm text-muted-foreground">Sepet ({newItems.reduce((s, i) => s + i.quantity, 0)} ürün)</span>
                                            <span className="font-bold text-foreground">₺{newItems.reduce((s, i) => s + i.unitPrice * i.quantity, 0).toFixed(0)}</span>
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
                                            disabled={isSendingOrder}
                                            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl h-11"
                                        >
                                            {isSendingOrder ? 'Gönderiliyor...' : 'Siparişi Gönder →'}
                                        </Button>
                                    </div>
                                )}
                            </div>
                        ) : activeTab === 'reservation' ? (
                            selectedTable.status === 3 ? (
                                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
                                    <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-xs px-4 py-3">
                                        Bu masa rezerve edilmiştir.
                                    </div>

                                    {activeReservation ? (
                                        <div className="rounded-xl border divide-y">
                                            <div className="flex justify-between items-center px-4 py-3">
                                                <span className="text-xs text-muted-foreground font-medium">Ad Soyad</span>
                                                <span className="text-sm font-bold text-foreground">{activeReservation.guestName || '—'}</span>
                                            </div>
                                            <div className="flex justify-between items-center px-4 py-3">
                                                <span className="text-xs text-muted-foreground font-medium">Saat</span>
                                                <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
                                                    {new Date(activeReservation.reservationTime).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center px-4 py-3">
                                                <span className="text-xs text-muted-foreground font-medium">İletişim</span>
                                                <span className="text-sm font-medium text-foreground">{activeReservation.contact || '—'}</span>
                                            </div>
                                            <div className="flex justify-between items-center px-4 py-3">
                                                <span className="text-xs text-muted-foreground font-medium">Not</span>
                                                <span className="text-sm font-medium text-foreground text-right">{activeReservation.note || '—'}</span>
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
                                        disabled={arriving || cancelingReservation}
                                        className="w-full border-destructive/30 text-destructive hover:bg-destructive/10 font-semibold rounded-xl h-11"
                                    >
                                        {cancelingReservation ? 'İptal ediliyor...' : 'Rezervasyonu İptal Et'}
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
                                        <label className="text-[11px] font-bold text-muted-foreground tracking-wide">İLETİŞİM</label>
                                        <input
                                            value={reservationContact}
                                            onChange={e => setReservationContact(e.target.value)}
                                            placeholder="Telefon numarası..."
                                            className="mt-1.5 w-full rounded-xl border bg-background px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-[11px] font-bold text-muted-foreground tracking-wide">REZERVASYON SAATİ</label>
                                        <input
                                            value={reservationTime}
                                            onChange={e => setReservationTime(formatTimeDigits(e.target.value))}
                                            placeholder="19:30"
                                            inputMode="numeric"
                                            maxLength={5}
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
                        ) : activeTab === 'payment' ? (
                            /* Ödeme tab */
                            <div className="flex-1 overflow-y-auto px-4 py-4">
                                {!tableOrder || tableOrder.orderItems.length === 0 ? (
                                    <p className="text-center text-muted-foreground text-sm py-10">Ödeme için aktif sipariş kalemi yok</p>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">Ara Toplam</span>
                                            <span>₺{tableOrder.totalPrice.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between text-sm text-muted-foreground">
                                            <span>KDV (%{(TAX_RATE * 100).toFixed(0)})</span>
                                            <span>₺{(tableOrder.totalPrice * TAX_RATE).toFixed(2)}</span>
                                        </div>
                                        <div>
                                            <p className="text-sm text-muted-foreground mb-2">Bahşiş Ekle</p>
                                            <div className="grid grid-cols-4 gap-2">
                                                {[0, 5, 10, 15].map(pct => (
                                                    <Button key={pct} variant={tip === tableOrder.totalPrice * (pct / 100) ? 'default' : 'outline'} size="sm" onClick={() => setTip(tableOrder.totalPrice * (pct / 100))}>%{pct}</Button>
                                                ))}
                                            </div>
                                            <div className="flex items-center gap-2 mt-2">
                                                <span className="text-sm text-muted-foreground">Özel:</span>
                                                <Input type="number" placeholder="0.00" className="w-24 h-8" value={tip || ''} onChange={e => setTip(Number(e.target.value) || 0)} />
                                                <span className="text-sm text-muted-foreground">₺</span>
                                            </div>
                                        </div>
                                        <div className="flex justify-between text-lg font-bold pt-2 border-t"><span>Toplam</span><span className="text-blue-500">₺{calculateTotal().toFixed(2)}</span></div>

                                        <div>
                                            <p className="text-sm text-muted-foreground mb-2">Kasa Seç</p>
                                            {cashRegisters.length === 0 ? (
                                                <p className="text-sm text-destructive">Açık kasa bulunamadı.</p>
                                            ) : (
                                                <div className="grid grid-cols-2 gap-2">
                                                    {cashRegisters.map(register => {
                                                        const isSelected = selectedCashRegisterId === String(register.id);
                                                        return (
                                                            <button key={register.id} onClick={() => setSelectedCashRegisterId(String(register.id))} className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${isSelected ? 'border-blue-500 bg-blue-500/10 ring-1 ring-blue-500' : 'border-border bg-card hover:bg-muted/50'}`}>
                                                                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${isSelected ? 'bg-blue-500 text-white' : 'bg-muted'}`}><Landmark className="h-4 w-4" /></div>
                                                                <div className="min-w-0">
                                                                    <p className={`text-sm font-semibold truncate ${isSelected ? 'text-blue-500' : ''}`}>{register.name}</p>
                                                                    <p className="text-xs text-muted-foreground">{register.balance.toFixed(2)} ₺</p>
                                                                </div>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>

                                        <Button className="w-full gap-2 bg-blue-500 hover:bg-blue-600" size="lg" disabled={!selectedCashRegisterId || completingPayment} onClick={handleCompletePayment}>
                                            <CheckCircle className="h-4 w-4" />{completingPayment ? 'Tamamlanıyor...' : 'Ödemeyi Tamamla'}
                                        </Button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            /* Siparişler tab */
                            <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col">
                                {!tableOrder || tableOrder.orderItems.length === 0 ? (
                                    <p className="text-center text-muted-foreground text-sm py-10">
                                        Aktif sipariş bulunmuyor
                                    </p>
                                ) : (
                                    <>
                                        {tableOrder.note && (
                                            <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-xs px-4 py-3 mb-3">
                                                <span className="font-bold">Not: </span>{tableOrder.note}
                                            </div>
                                        )}
                                        <div className="space-y-0 divide-y divide-border">
                                            {tableOrder.orderItems.map(item => (
                                                <div key={item.id} className="flex items-center justify-between py-3 gap-3">
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-medium text-foreground truncate">{item.productName}</p>
                                                        <p className={`text-xs mt-0.5 ${ORDER_ITEM_STATUS_TEXT_COLOR[item.status] ?? 'text-muted-foreground'}`}>
                                                            {item.quantity}x · {ORDER_ITEM_STATUS_LABELS[item.status] ?? ''}
                                                        </p>
                                                    </div>
                                                    <span className="text-sm font-semibold text-foreground shrink-0">₺{(item.unitPrice * item.quantity).toFixed(0)}</span>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="flex justify-between pt-4 mt-2 border-t font-bold text-foreground">
                                            <span>Ara Toplam</span>
                                            <span>₺{tableOrder.totalPrice.toFixed(0)}</span>
                                        </div>
                                    </>
                                )}

                                {/* Masayı Kapat — masa dolu olduğu sürece her zaman görünür */}
                                {selectedTable.status === 2 && tableOrder && (
                                    <div className={tableOrder.orderItems.length === 0 ? 'mt-4 pt-4 border-t' : 'mt-3'}>
                                        <button
                                            onClick={() => setCancelConfirmOpen(true)}
                                            className="w-full rounded-xl border border-destructive/30 text-destructive font-semibold text-sm py-2.5 hover:bg-destructive/10 transition-colors"
                                        >
                                            Masayı Kapat
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* Masayı Kapat Onay */}
            <AlertDialog open={cancelConfirmOpen} onOpenChange={setCancelConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Masayı kapat</AlertDialogTitle>
                        <AlertDialogDescription>{selectedTable?.name} için aktif sipariş iptal edilecek ve masa boşaltılacaktır. Emin misiniz?</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Vazgeç</AlertDialogCancel>
                        <AlertDialogAction onClick={handleCancelOrder} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Masayı Kapat</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
