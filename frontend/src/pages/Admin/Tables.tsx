import { useEffect, useState } from "react";
import type { Table } from "../../features/tables/types";
import type { Order, OrderItem } from "../../features/order/types";
import type { CashRegister } from "../../features/cashRegisters/types";
import type { Product } from "../../features/products/types";
import type { Category } from "../../features/categories/types";
import { tableService } from "../../api/tableService";
import { orderService } from "../../api/orderService";
import { cashRegisterService } from "../../api/cashRegisterService";
import { productService } from "../../api/productService";
import { categoryService } from "../../api/categoryService";
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Minus, MoreHorizontal, Pencil, Trash2, CheckCircle, Landmark, X, Ban } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import axios from "axios";

const TAX_RATE = 0.08;

const ORDER_ITEM_STATUS_LABELS: Record<number, string> = {
    1: "Bekliyor",
    2: "Hazırlanıyor",
    3: "Hazır",
    4: "Servis Edildi",
};

const ORDER_ITEM_STATUS_STYLES: Record<number, string> = {
    1: "bg-amber-50 text-amber-700 border-amber-200",
    2: "bg-blue-50 text-blue-700 border-blue-200",
    3: "bg-green-50 text-green-700 border-green-200",
    4: "bg-gray-50 text-gray-600 border-gray-200",
};

export default function Tables() {
    const [tables, setTables] = useState<Table[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newTableName, setNewTableName] = useState('');
    const [editTable, setEditTable] = useState<Table | null>(null);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);

    // Status action dialog (available / reserved)
    const [statusDialogTable, setStatusDialogTable] = useState<Table | null>(null);
    const [statusActionLoading, setStatusActionLoading] = useState(false);

    // Order dialog (occupied)
    const [orderDialogTable, setOrderDialogTable] = useState<Table | null>(null);
    const [tableOrder, setTableOrder] = useState<Order | null>(null);
    const [orderLoading, setOrderLoading] = useState(false);
    const [cashRegisters, setCashRegisters] = useState<CashRegister[]>([]);
    const [tip, setTip] = useState<number>(0);
    const [selectedCashRegisterId, setSelectedCashRegisterId] = useState<string>('');
    const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);

    // Product panel state (inside order dialog)
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
    const [newItems, setNewItems] = useState<OrderItem[]>([]);
    const [isAddingItems, setIsAddingItems] = useState(false);

    const tableStatusMap: Record<number, string> = {
        1: "Müsait",
        2: "Dolu",
        3: "Rezerve",
        4: "Servis Dışı"
    };

    const refreshTables = async () => {
        const updated = await tableService.getTables();
        setTables(updated);
    };

    useEffect(() => {
        refreshTables().catch((err) => console.error("Masalar çekilirken hata:", err));
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

    const handleDelete = async () => {
        if (deleteTargetId === null) return;
        await tableService.deleteTable(deleteTargetId);
        setTables(tables.filter(t => t.id !== deleteTargetId));
        setDeleteTargetId(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const errors: Record<string, string> = {};
        if (!newTableName.trim()) errors.name = 'Masa adı boş olamaz.';
        else if (newTableName.length > 50) errors.name = 'Masa adı en fazla 50 karakter olabilir.';
        if (Object.keys(errors).length > 0) { setFieldErrors(errors); return; }

        setFieldErrors({});
        try {
            if (editTable) {
                await tableService.updateTable(editTable.id, newTableName);
            } else {
                await tableService.createTable(newTableName);
            }
            await refreshTables();
            setNewTableName('');
            setEditTable(null);
            setIsModalOpen(false);
        } catch (err: unknown) {
            if (axios.isAxiosError(err)) {
                const backendErrors = err.response?.data?.errors as Record<string, string[]> | undefined;
                if (backendErrors) {
                    const mapped: Record<string, string> = {};
                    for (const key in backendErrors) {
                        mapped[key.charAt(0).toLowerCase() + key.slice(1)] = backendErrors[key][0];
                    }
                    setFieldErrors(mapped);
                }
            }
        }
    };

    // --- Status dialog handlers ---
    const handleOpenTable = async () => {
        if (!statusDialogTable) return;
        setStatusActionLoading(true);
        try {
            await tableService.openTable(statusDialogTable.id.toString());
            await refreshTables();
            setStatusDialogTable(null);
        } catch (err) {
            console.error("Masa açılırken hata:", err);
        } finally {
            setStatusActionLoading(false);
        }
    };

    const handleReservation = async () => {
        if (!statusDialogTable) return;
        setStatusActionLoading(true);
        try {
            await tableService.reservationTable(statusDialogTable.id.toString());
            await refreshTables();
            setStatusDialogTable(null);
        } catch (err) {
            console.error("Rezervasyon yapılırken hata:", err);
        } finally {
            setStatusActionLoading(false);
        }
    };

    const handleCancelReservation = async () => {
        if (!statusDialogTable) return;
        setStatusActionLoading(true);
        try {
            await tableService.cancelReservation(statusDialogTable.id.toString());
            await refreshTables();
            setStatusDialogTable(null);
        } catch (err) {
            console.error("Rezervasyon iptal edilirken hata:", err);
        } finally {
            setStatusActionLoading(false);
        }
    };

    // --- Order dialog handlers ---
    const openOrderDialog = async (table: Table) => {
        setOrderDialogTable(table);
        setTableOrder(null);
        setTip(0);
        setSelectedCashRegisterId('');
        setNewItems([]);
        setSelectedCategoryId(null);
        setOrderLoading(true);
        try {
            const [order, registers, prods, cats] = await Promise.all([
                orderService.getOrderByTableId(table.id.toString()),
                cashRegisterService.getCashRegisters(),
                productService.getProducts(),
                categoryService.getCategories(),
            ]);
            setTableOrder(order);
            setCashRegisters(registers.filter(r => r.status === 1));
            setProducts(prods.filter(p => p.isActive));
            setCategories(cats);
        } catch {
            setTableOrder(null);
        } finally {
            setOrderLoading(false);
        }
    };

    const closeOrderDialog = () => {
        setOrderDialogTable(null);
        setTableOrder(null);
        setTip(0);
        setSelectedCashRegisterId('');
        setNewItems([]);
        setProducts([]);
        setCategories([]);
    };

    const increaseNewItem = (product: Product) => {
        setNewItems(prev => {
            const existing = prev.find(i => i.productId === product.id);
            if (existing) {
                return prev.map(i => i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i);
            }
            return [...prev, {
                id: 0,
                productId: product.id,
                productName: product.name,
                unitPrice: product.price,
                quantity: 1,
                status: 1,
                is_load: false,
            }];
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

    const handleAddItems = async () => {
        if (!tableOrder || newItems.length === 0) return;
        setIsAddingItems(true);
        try {
            await orderService.addOrderItems({ ...tableOrder, orderItems: newItems });
            const refreshed = await orderService.getOrderByTableId(orderDialogTable!.id.toString());
            setTableOrder(refreshed);
            setNewItems([]);
        } catch (err) {
            console.error('Ürünler eklenirken hata:', err);
        } finally {
            setIsAddingItems(false);
        }
    };

    const calculateTotal = () => {
        if (!tableOrder) return 0;
        return tableOrder.totalPrice + tableOrder.totalPrice * TAX_RATE + tip;
    };

    const handleCompletePayment = async () => {
        if (!tableOrder || !selectedCashRegisterId) return;
        try {
            await cashRegisterService.addTransaction(Number(selectedCashRegisterId), 1, calculateTotal());
            await orderService.closeOrder(tableOrder.id);
            await refreshTables();
            closeOrderDialog();
        } catch (err) {
            console.error('Ödeme tamamlanırken hata:', err);
        }
    };

    const handleCancelOrder = async () => {
        if (!tableOrder) return;
        try {
            await orderService.cancelOrder(tableOrder.id);
            await refreshTables();
            setCancelConfirmOpen(false);
            closeOrderDialog();
        } catch (err) {
            console.error('Sipariş iptal edilirken hata:', err);
        }
    };

    const handleTableClick = (table: Table) => {
        if (table.status === 1 || table.status === 3) {
            setStatusDialogTable(table);
        } else if (table.status === 2) {
            openOrderDialog(table);
        }
    };

    const filteredProducts = selectedCategoryId
        ? products.filter(p => p.categoryId === selectedCategoryId)
        : products;

    return (
        <>
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Masa Yönetimi</h2>
                <Button className="gap-2" onClick={openCreateModal}>
                    <Plus className="h-4 w-4" />
                    Masa Ekle
                </Button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {tables.map(table => (
                    <Card
                        key={table.id}
                        className={`transition-shadow cursor-pointer hover:shadow-md ${
                            table.status === 1 ? 'border-green-300 bg-green-50' :
                            table.status === 2 ? 'border-red-300 bg-red-50' :
                            table.status === 3 ? 'border-amber-300 bg-amber-50' :
                            'border-gray-300 bg-gray-50'
                        }`}
                        onClick={() => handleTableClick(table)}
                    >
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-2xl font-bold">#{table.name}</span>
                                <div onClick={(e) => e.stopPropagation()}>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem
                                                className="gap-2 cursor-pointer"
                                                onSelect={() => openEditModal(table)}
                                            >
                                                <Pencil className="h-4 w-4" /> Düzenle
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                className="gap-2 text-destructive cursor-pointer"
                                                onSelect={() => setDeleteTargetId(table.id)}
                                            >
                                                <Trash2 className="h-4 w-4" /> Sil
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </div>
                            <Badge
                                variant="outline"
                                className={`capitalize ${
                                    table.status === 1 ? 'bg-green-50 text-green-700 border-green-200' :
                                    table.status === 2 ? 'bg-red-50 text-red-700 border-red-200' :
                                    table.status === 3 ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                    'bg-gray-50 text-gray-700 border-gray-200'
                                }`}
                            >
                                {tableStatusMap[table.status]}
                            </Badge>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Masa Oluştur / Düzenle Dialog */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editTable ? 'Masayı Düzenle' : 'Yeni Masa Ekle'}</DialogTitle>
                        <DialogDescription aria-describedby={undefined} />
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="flex flex-col gap-4 py-4">
                        <div className="flex flex-col gap-2">
                            <Label>Masa Adı</Label>
                            <Input
                                value={newTableName}
                                onChange={(e) => setNewTableName(e.target.value)}
                                placeholder="Masa 1"
                            />
                            {fieldErrors.name && <p className="text-sm text-destructive">{fieldErrors.name}</p>}
                        </div>
                        <div className="flex justify-end gap-2 mt-4">
                            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>İptal</Button>
                            <Button type="submit">Kaydet</Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Masa Silme Onay */}
            <AlertDialog open={deleteTargetId !== null} onOpenChange={(open) => !open && setDeleteTargetId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Masayı sil</AlertDialogTitle>
                        <AlertDialogDescription>Bu masayı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>İptal</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Sil
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Müsait / Rezerve Masa Dialog */}
            <Dialog open={statusDialogTable !== null} onOpenChange={(open) => !open && setStatusDialogTable(null)}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogDescription aria-describedby={undefined} />
                    </DialogHeader>

                    {statusDialogTable?.status === 1 && (
                        <div className="flex flex-col items-center py-4 gap-6">
                            <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center">
                                <div className="w-10 h-10 bg-green-500 rounded-full animate-pulse shadow-[0_0_20px_rgba(34,197,94,0.6)]" />
                            </div>
                            <div className="text-center">
                                <h2 className="text-2xl font-extrabold">Masa #{statusDialogTable.name}</h2>
                                <p className="text-muted-foreground mt-1">Bu masa şu anda boş.</p>
                            </div>
                            <div className="w-full flex flex-col gap-3">
                                <Button
                                    size="lg"
                                    className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-5 shadow-[0_4px_14px_0_rgba(34,197,94,0.39)]"
                                    disabled={statusActionLoading}
                                    onClick={handleOpenTable}
                                >
                                    Masayı Aç
                                </Button>
                                <Button
                                    variant="outline"
                                    size="lg"
                                    className="w-full font-bold py-5 border-2 text-blue-500 hover:text-blue-600"
                                    disabled={statusActionLoading}
                                    onClick={handleReservation}
                                >
                                    Rezerve Et
                                </Button>
                            </div>
                        </div>
                    )}

                    {statusDialogTable?.status === 3 && (
                        <div className="flex flex-col items-center py-4 gap-6">
                            <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center">
                                <div className="w-10 h-10 bg-amber-500 rounded-full animate-pulse shadow-[0_0_20px_rgba(245,158,11,0.6)]" />
                            </div>
                            <div className="text-center">
                                <h2 className="text-2xl font-extrabold">Masa #{statusDialogTable.name}</h2>
                                <p className="text-amber-500 font-bold text-sm uppercase tracking-wide mt-1">Rezerve Edilmiş</p>
                            </div>
                            <div className="w-full flex flex-col gap-3">
                                <Button
                                    size="lg"
                                    className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-5 shadow-[0_4px_14px_0_rgba(245,158,11,0.39)]"
                                    disabled={statusActionLoading}
                                    onClick={handleOpenTable}
                                >
                                    Müşteri Geldi — Masayı Aç
                                </Button>
                                <Button
                                    variant="outline"
                                    size="lg"
                                    className="w-full font-bold py-5 border-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                                    disabled={statusActionLoading}
                                    onClick={handleCancelReservation}
                                >
                                    Rezervasyonu İptal Et
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Dolu Masa — Sipariş + Ürün Ekleme Dialog */}
            <Dialog open={orderDialogTable !== null} onOpenChange={(open) => !open && closeOrderDialog()}>
                <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
                    <DialogHeader className="shrink-0">
                        <DialogTitle>Masa #{orderDialogTable?.name} — Sipariş</DialogTitle>
                        <DialogDescription aria-describedby={undefined} />
                    </DialogHeader>

                    {orderLoading && (
                        <p className="text-sm text-muted-foreground text-center py-16">Yükleniyor...</p>
                    )}

                    {!orderLoading && tableOrder && (
                        <Tabs defaultValue="add" className="flex flex-col flex-1 overflow-hidden">
                            <TabsList className="grid grid-cols-2 shrink-0">
                                <TabsTrigger value="add">
                                    Ürün Ekle
                                    {newItems.length > 0 && (
                                        <span className="ml-1.5 bg-primary text-primary-foreground text-xs rounded-full w-4 h-4 flex items-center justify-center">
                                            {newItems.reduce((s, i) => s + i.quantity, 0)}
                                        </span>
                                    )}
                                </TabsTrigger>
                                <TabsTrigger value="payment">Sipariş & Ödeme</TabsTrigger>
                            </TabsList>

                            {/* --- Ürün Ekle sekmesi --- */}
                            <TabsContent value="add" className="flex flex-col flex-1 overflow-hidden mt-4">
                                {/* Kategori filtreleri */}
                                <div className="flex gap-2 pb-3 overflow-x-auto shrink-0">
                                    <Button
                                        size="sm"
                                        variant={selectedCategoryId === null ? 'default' : 'outline'}
                                        className="shrink-0"
                                        onClick={() => setSelectedCategoryId(null)}
                                    >
                                        Tümü
                                    </Button>
                                    {categories.map(cat => (
                                        <Button
                                            key={cat.id}
                                            size="sm"
                                            variant={selectedCategoryId === cat.id ? 'default' : 'outline'}
                                            className="shrink-0"
                                            onClick={() => setSelectedCategoryId(cat.id)}
                                        >
                                            {cat.name}
                                        </Button>
                                    ))}
                                </div>

                                {/* Ürün listesi */}
                                <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
                                    {filteredProducts.map(product => {
                                        const qty = newItems.find(i => i.productId === product.id)?.quantity ?? 0;
                                        return (
                                            <div
                                                key={product.id}
                                                className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${qty > 0 ? 'border-primary bg-primary/5' : 'bg-card'}`}
                                            >
                                                <div className="min-w-0">
                                                    <p className="text-sm font-semibold truncate">{product.name}</p>
                                                    <p className="text-xs text-muted-foreground">{product.price.toFixed(2)} ₺</p>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0 ml-3">
                                                    {qty > 0 && (
                                                        <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => decreaseNewItem(product.id)}>
                                                            <Minus className="h-3 w-3" />
                                                        </Button>
                                                    )}
                                                    {qty > 0 && <span className="font-bold text-primary w-4 text-center">{qty}</span>}
                                                    <Button size="icon" variant={qty > 0 ? 'outline' : 'default'} className="h-7 w-7" onClick={() => increaseNewItem(product)}>
                                                        <Plus className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Siparişe Ekle butonu */}
                                {newItems.length > 0 && (
                                    <div className="pt-3 border-t mt-3 shrink-0">
                                        <Button className="w-full" disabled={isAddingItems} onClick={handleAddItems}>
                                            {isAddingItems ? 'Ekleniyor...' : `${newItems.reduce((s, i) => s + i.quantity, 0)} ürünü siparişe ekle`}
                                        </Button>
                                    </div>
                                )}
                            </TabsContent>

                            {/* --- Sipariş & Ödeme sekmesi --- */}
                            <TabsContent value="payment" className="flex-1 overflow-y-auto mt-4 space-y-4">
                                {/* Sipariş kalemleri */}
                                <div className="space-y-1.5">
                                    {tableOrder.orderItems.length === 0 ? (
                                        <p className="text-sm text-muted-foreground text-center py-4">Henüz sipariş kalemi yok.</p>
                                    ) : (
                                        tableOrder.orderItems.map(item => (
                                            <div key={item.id} className="flex items-center justify-between text-sm p-2.5 rounded-lg border">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <span className="font-bold text-muted-foreground shrink-0">{item.quantity}x</span>
                                                    <span className="truncate font-medium">{item.productName}</span>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0 ml-2">
                                                    <Badge variant="outline" className={`text-xs ${ORDER_ITEM_STATUS_STYLES[item.status]}`}>
                                                        {ORDER_ITEM_STATUS_LABELS[item.status]}
                                                    </Badge>
                                                    <span className="font-semibold">{(item.unitPrice * item.quantity).toFixed(2)} ₺</span>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>

                                {/* Fiyat özeti */}
                                <div className="space-y-2 border-t pt-3">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Ara Toplam</span>
                                        <span>{tableOrder.totalPrice.toFixed(2)} ₺</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">KDV (%{(TAX_RATE * 100).toFixed(0)})</span>
                                        <span>{(tableOrder.totalPrice * TAX_RATE).toFixed(2)} ₺</span>
                                    </div>

                                    {/* Bahşiş */}
                                    <div className="pt-1">
                                        <p className="text-sm text-muted-foreground mb-2">Bahşiş Ekle</p>
                                        <div className="grid grid-cols-4 gap-2">
                                            {[0, 5, 10, 15].map(pct => (
                                                <Button
                                                    key={pct}
                                                    variant={tip === tableOrder.totalPrice * (pct / 100) ? 'default' : 'outline'}
                                                    size="sm"
                                                    onClick={() => setTip(tableOrder.totalPrice * (pct / 100))}
                                                >
                                                    %{pct}
                                                </Button>
                                            ))}
                                        </div>
                                        <div className="flex items-center gap-2 mt-2">
                                            <span className="text-sm text-muted-foreground">Özel:</span>
                                            <Input
                                                type="number"
                                                placeholder="0.00"
                                                className="w-24 h-8"
                                                value={tip || ''}
                                                onChange={(e) => setTip(Number(e.target.value) || 0)}
                                            />
                                            <span className="text-sm text-muted-foreground">₺</span>
                                        </div>
                                    </div>

                                    {tip > 0 && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">Bahşiş</span>
                                            <span>{tip.toFixed(2)} ₺</span>
                                        </div>
                                    )}

                                    <div className="flex justify-between text-lg font-bold pt-2 border-t">
                                        <span>Toplam</span>
                                        <span className="text-primary">{calculateTotal().toFixed(2)} ₺</span>
                                    </div>
                                </div>

                                {/* Kasa seçimi */}
                                <div>
                                    <p className="text-sm text-muted-foreground mb-2">Kasa Seç</p>
                                    {cashRegisters.length === 0 ? (
                                        <p className="text-sm text-destructive">Açık kasa bulunamadı.</p>
                                    ) : (
                                        <div className="grid grid-cols-2 gap-2">
                                            {cashRegisters.map(register => {
                                                const isSelected = selectedCashRegisterId === String(register.id);
                                                return (
                                                    <button
                                                        key={register.id}
                                                        onClick={() => setSelectedCashRegisterId(String(register.id))}
                                                        className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                                                            isSelected
                                                                ? 'border-primary bg-primary/10 ring-1 ring-primary'
                                                                : 'border-border bg-card hover:bg-muted/50'
                                                        }`}
                                                    >
                                                        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                                                            <Landmark className="h-4 w-4" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className={`text-sm font-semibold truncate ${isSelected ? 'text-primary' : ''}`}>{register.name}</p>
                                                            <p className="text-xs text-muted-foreground">{register.balance.toFixed(2)} ₺</p>
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                {/* Butonlar */}
                                <div className="flex flex-col gap-2 pt-2">
                                    <Button
                                        className="w-full gap-2"
                                        size="lg"
                                        disabled={!selectedCashRegisterId}
                                        onClick={handleCompletePayment}
                                    >
                                        <CheckCircle className="h-4 w-4" />
                                        Ödemeyi Tamamla
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className="w-full gap-2 text-destructive hover:text-destructive"
                                        onClick={() => setCancelConfirmOpen(true)}
                                    >
                                        <Ban className="h-4 w-4" />
                                        Siparişi İptal Et
                                    </Button>
                                </div>
                            </TabsContent>
                        </Tabs>
                    )}
                </DialogContent>
            </Dialog>

            {/* Sipariş İptal Onay */}
            <AlertDialog open={cancelConfirmOpen} onOpenChange={setCancelConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Siparişi iptal et</AlertDialogTitle>
                        <AlertDialogDescription>
                            Masa #{orderDialogTable?.name} için siparişi iptal etmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Vazgeç</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleCancelOrder}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            İptal Et
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
