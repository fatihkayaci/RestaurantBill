import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import ProductCard from '../features/products/components/ProductCard';
import type { Product } from '../features/products/types';
import { productService } from '../api/productService';
import { categoryService } from '../api/categoryService';
import type { Category } from '../features/categories/types';
import CategoryCard from '../features/categories/components/CategoryCard';
import OrderCard from '../features/order/components/OrderCard';
import { orderService } from '../api/orderService';
import type { Order } from '../features/order/types';
import type { Table } from '../features/tables/types';
import { tableService } from '../api/tableService';
import * as signalR from "@microsoft/signalr";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
// import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { /*CreditCard, Banknote, */X, Check, Utensils, AlertCircle, ShoppingCart } from "lucide-react";

export default function PosPage() {
    const { tableId } = useParams();
    const navigate = useNavigate();
    
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [orderTab, setOrderTab] = useState<number>(1);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
    // const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [table, setTable] = useState<Table>();
    const [activeOrder, setActiveOrder] = useState<Order>({
        id: 0,
        tableId: 0,
        note: "",
        totalPrice: 0,
        status: 0,
        orderItems: []
    });

    useEffect(() => {
        if (!tableId || !/^\d+$/.test(tableId)) {
            console.warn("Kullanıcı URL ile oynamaya çalıştı, engellendi!");
            navigate('/');
            return;
        }

        const fetchAllData = async () => {
            try {
                setIsLoading(true);
                
                const [productsData, categoriesData, orderData, tableData] = await Promise.all([
                    productService.getProducts(),
                    categoryService.getCategories(),
                    orderService.getOrderByTableId(tableId),
                    tableService.getTableById(tableId),
                ]);
                setProducts(productsData);
                setCategories(categoriesData);
                setTable(tableData);
                if (orderData) {
                    setActiveOrder({
                        ...orderData,
                        orderItems: orderData.orderItems.map(item => ({
                            ...item,
                            is_load: true
                        }))
                    });
                }
            } catch (error) {
                console.error("Veriler çekilirken hata:", error);
            } finally {
                setIsLoading(false);
            }
        };
        
        fetchAllData();
    }, [tableId, navigate]);
    
    useEffect(() => {
        const connection = new signalR.HubConnectionBuilder()
            .withUrl(`${import.meta.env.VITE_API_URL ?? 'http://localhost:5077'}/table-hub`)
            .withAutomaticReconnect()
            .configureLogging({
                log(logLevel: signalR.LogLevel, message: string) {
                    if (message.includes("stopped during negotiation")) return;
                    if (logLevel >= signalR.LogLevel.Error) console.error(message);
                }
            })
            .build();

        connection.on("TableStatusChanged", (changedTableId: number, status: number) => {
            if (changedTableId === Number(tableId)) {
                setTable((prev) => prev ? { ...prev, status } : prev);
            }
        });

        connection.on("OrderUpdated", (changedTableId: number) => {
            console.log("OrderUpdated geldi:", changedTableId, "bu masa:", tableId);
            if (changedTableId === Number(tableId)) {
                orderService.getOrderByTableId(tableId!).then((data) => {
                    if (data) {
                        setActiveOrder({
                            ...data,
                            orderItems: data.orderItems.map(item => ({ ...item, is_load: true }))
                        });
                    }
                });
            }
        });

        connection.start().catch((err: Error) => {
            if (!err.message.includes("stopped during negotiation")) {
                console.error("SignalR Connection Error:", err);
            }
        });

        return () => {
            connection.stop();
        };
    }, [tableId]);
    
    const handleSubmitOrder = async (e: any) => {
        e.preventDefault();
        try {
            setIsSubmitting(true);

            const onlyNewItems = activeOrder.orderItems.filter(item => item.is_load === false);

            if (onlyNewItems.length === 0) {
                alert("Siparişe eklenmiş yeni bir ürün bulunmuyor.");
                return;
            }

            const payload = {
                ...activeOrder,
                orderItems: onlyNewItems
            };

            await orderService.addOrderItems(payload);

            const refreshedOrder = await orderService.getOrderByTableId(tableId!);
            if (refreshedOrder) {
                setActiveOrder({
                    ...refreshedOrder,
                    orderItems: refreshedOrder.orderItems.map(item => ({
                        ...item,
                        is_load: true
                    }))
                });
            }

        } catch (error: any) {
            console.log(error.response?.data || "Bilinmeyen bir hata oluştu");
        } finally {
            setIsSubmitting(false);
        }
    }
    /* changes status methods */
    const handleOpenTable = async () => {
        try {
            if (!tableId) return;
            await tableService.openTable(tableId);
            const updatedTable = await tableService.getTableById(tableId);
            setTable(updatedTable);

            const newOrderData = await orderService.getOrderByTableId(tableId);
            if (newOrderData) {
                setActiveOrder(newOrderData);
            }
        } catch (error: any) {
            console.log(error.response?.data);
        }
    }
    const handleReservation = async () => {
        try {
            if (!tableId) return;
            await tableService.reservationTable(tableId);

            const updatedTable = await tableService.getTableById(tableId);
            setTable(updatedTable);
            
        } catch (error: any) {
            console.log(error.response.data);
        }
    }
    const handleCancelReservation = async () => {
        try {
            if (!tableId) return;
            await tableService.cancelReservation(tableId);
            const updatedTable = await tableService.getTableById(tableId);
            setTable(updatedTable);
            
        } catch (error: any) {
            console.log(error.response.data);
        }
    }
    /* changes status methods */
    /* methods for order */
    /*Pay method 
    const handlePayment = async () => {
        try {

            const orderId = activeOrder.id;
            if (!orderId || !tableId)
                return;
            
            await orderService.closeOrder(orderId);
            let updatedTable = await tableService.getTableById(tableId)
            
            setTable(updatedTable);
            setIsPaymentModalOpen(false); 
            
        } catch (error: any) {
            console.log(error.response?.data);
        }
    };
    */
    
    const handleCancelOrder = async () => {
        try {
            if (!tableId || !activeOrder) return;

            const isConfirmed = window.confirm("Dikkat: İçerisinde ürün bulunan bu sipariş tamamen iptal edilecek ve masa boşaltılacaktır Emin misiniz?"); 
            if (isConfirmed) {
                await orderService.cancelOrder(activeOrder.id); 
                const updatedTable = await tableService.getTableById(tableId);
                setTable(updatedTable);
            }
        } catch (error: any) {
            console.log(error.response?.data);
        }
    };
    
    const increaseQuantity = (productId: number) => {
        const clickedProduct = products.find(p => p.id === productId);
        if (!clickedProduct) return;

        setActiveOrder((prevOrder) => {
            const existingNewItem = prevOrder.orderItems.find(item => 
                item.productId === productId && item.is_load === false
            );

            let updatedItems;
            if (existingNewItem) {
                updatedItems = prevOrder.orderItems.map(item =>
                    (item.productId === productId && item.is_load === false)
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                );
            } else {
                updatedItems = [...prevOrder.orderItems, { 
                    productId: clickedProduct.id, 
                    productName: clickedProduct.name, 
                    unitPrice: clickedProduct.price, 
                    quantity: 1,
                    status: 1,
                    is_load: false,
                }];
            }

            const newTotal = updatedItems.reduce((total, item) => total + (item.quantity * item.unitPrice), 0);
            setOrderTab(1);
            return { ...prevOrder, orderItems: updatedItems, totalPrice: newTotal };
        });
    };

    const decreaseQuantity = (productId: number) => {
        setActiveOrder((prevOrder) => {
            const itemIndex = prevOrder.orderItems.findIndex(
                item => item.productId === productId && item.is_load === false
            );

            if (itemIndex === -1) return prevOrder;

            let updatedItems = [...prevOrder.orderItems];
            const targetItem = updatedItems[itemIndex];

            if (targetItem.quantity > 1) {
                updatedItems[itemIndex] = { ...targetItem, quantity: targetItem.quantity - 1 };
            } else {
                updatedItems.splice(itemIndex, 1);
            }

            const newTotal = updatedItems.reduce((total, item) => total + (item.quantity * item.unitPrice), 0);
            return { ...prevOrder, orderItems: updatedItems, totalPrice: newTotal };
        });
    };
    const handleRemoveItem = async (productId: number) => {
        try {
            const orderId = activeOrder.id;
            if (!tableId || !productId || !orderId)
                return;

            const isConfirmed = window.confirm("Dikkat: Bu ürünü silmek istediğinize Emin misiniz?");
            if (isConfirmed) {
                await orderService.removeOrderItem(productId, orderId);
                const newOrderData = await orderService.getOrderByTableId(tableId);
                if (newOrderData) {
                    setActiveOrder({
                        ...newOrderData,
                        orderItems: newOrderData.orderItems.map(item => ({
                            ...item,
                            is_load: true
                        }))
                    });
                }
            }
        } catch (error: any) {
            console.log(error.response?.data);
        }
        
    }
    const handleUpdateQuantity = (productId: number, quantity: number) => {
        setActiveOrder((prevOrder) => {
            const updatedItems = prevOrder.orderItems.map(item =>
                (item.productId === productId && item.is_load === true && item.status === 1)
                    ? { ...item, quantity }
                    : item
            );
            const newTotal = updatedItems.reduce((total, item) => total + (item.quantity * item.unitPrice), 0);
            return { ...prevOrder, orderItems: updatedItems, totalPrice: newTotal };
        });
    };

    const handleSubmitUpdate = async (e: any) => {
        e.preventDefault();
        try {
            setIsSubmitting(true);
            const pendingItems = activeOrder.orderItems.filter(item => item.is_load === true && item.status === 1);

            if (pendingItems.length === 0) {
                alert("Güncellenecek ürün bulunmuyor.");
                return;
            }

            for (const item of pendingItems) {
                await orderService.updateOrderItemQuantity(activeOrder.id, item.productId, item.quantity);
            }

            const refreshedOrder = await orderService.getOrderByTableId(tableId!);
            if (refreshedOrder) {
                setActiveOrder({
                    ...refreshedOrder,
                    orderItems: refreshedOrder.orderItems.map(item => ({
                        ...item,
                        is_load: true
                    }))
                });
            }
        } catch (error: any) {
            console.log(error.response?.data || "Bilinmeyen bir hata oluştu");
        } finally {
            setIsSubmitting(false);
        }
    };


    const filteredProducts = selectedCategoryId 
        ? products.filter(product => product.categoryId === selectedCategoryId) 
        : products;

    const filteredOrderItems =
        orderTab === 1 ? activeOrder.orderItems.filter(item => item.is_load === false) :
        orderTab === 2 ? activeOrder.orderItems.filter(item => item.is_load === true && item.status === 1) :
        orderTab === 3 ? activeOrder.orderItems.filter(item => item.is_load === true && item.status === 2) :
        orderTab === 4 ? activeOrder.orderItems.filter(item => item.is_load === true && item.status === 3) :
        [];

    // --- YÜKLENİYOR (LOADING) DURUMU ---
    if (isLoading) {
        return (
            <div className="flex flex-col lg:flex-row h-screen bg-background overflow-hidden">
                <div className="w-full lg:w-2/3 flex flex-col p-4 lg:p-6">
                    <div className="flex gap-4 mb-6 lg:mb-8 overflow-x-hidden">
                        {[1, 2, 3, 4].map(i => (
                            <Skeleton key={i} className="h-12 w-28 rounded-xl shrink-0" />
                        ))}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                            <Skeleton key={i} className="h-32 rounded-2xl" />
                        ))}
                    </div>
                </div>

                <div className="hidden lg:flex w-1/3 bg-card border-l flex-col">
                    <div className="h-20 border-b p-6 flex items-center justify-between">
                        <Skeleton className="h-8 w-32 rounded-lg" />
                        <Skeleton className="h-6 w-24 rounded-full" />
                    </div>
                    <div className="flex-1 p-4 space-y-4">
                        {[1, 2, 3].map(i => (
                            <Skeleton key={i} className="h-20 rounded-xl" />
                        ))}
                    </div>
                    <div className="h-64 border-t p-6 flex flex-col gap-4">
                        <Skeleton className="h-8 w-full rounded-lg mb-2" />
                        <Skeleton className="h-14 w-full rounded-2xl" />
                        <Skeleton className="h-12 w-full rounded-2xl" />
                    </div>
                </div>
            </div>
        );
    }

    // --- MASA BULUNAMADI ---
    if (!table) {
        return (
            <div className="h-screen flex flex-col items-center justify-center bg-background text-foreground">
                <AlertCircle className="w-20 h-20 text-muted-foreground mb-4" />
                <h2 className="text-2xl font-bold">Masa Bulunamadı</h2>
                <p className="text-muted-foreground mt-2">Aradığınız masa sistemde kayıtlı değil veya silinmiş olabilir.</p>
            </div>
        );
    }

    // --- MASA MÜSAİT (BOŞ) DURUMU ---
    if (table.status === 1) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <div className="bg-card rounded-3xl shadow-xl p-8 max-w-sm w-full flex flex-col items-center border">
                    <div className="w-24 h-24 bg-green-500/10 rounded-full flex items-center justify-center mb-6">
                        <div className="w-12 h-12 bg-green-500 rounded-full animate-pulse shadow-[0_0_20px_rgba(34,197,94,0.6)]"></div>
                    </div>
                    <h2 className="text-3xl font-extrabold mb-2 tracking-tight">
                        Masa {tableId}
                    </h2>
                    <p className="text-muted-foreground mb-8 text-center font-medium">
                        Bu masa şu anda boş. Yeni bir adisyon açabilir veya rezerve edebilirsiniz.
                    </p>

                    <div className="w-full flex flex-col gap-4">
                        <Button 
                            size="lg" 
                            className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-6 text-xl shadow-[0_4px_14px_0_rgba(34,197,94,0.39)]"
                            onClick={handleOpenTable}
                        >
                            Masayı Aç
                        </Button>
                        
                        <Button 
                            variant="outline" 
                            size="lg" 
                            className="w-full font-bold py-6 text-lg border-2 text-blue-500 hover:text-blue-600"
                            onClick={handleReservation}
                        >
                            Rezerve Et
                        </Button>
                    </div>

                    <Link to="/" className="mt-8 text-muted-foreground hover:text-foreground font-semibold underline transition-colors">
                        Vazgeç ve Masalara Dön
                    </Link>
                </div>
            </div>
        );
    }

    // --- MASA REZERVE DURUMU ---
    if (table.status === 3) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <div className="bg-card rounded-3xl shadow-xl p-8 max-w-sm w-full flex flex-col items-center border">
                    <div className="w-24 h-24 bg-amber-500/10 rounded-full flex items-center justify-center mb-6">
                        <div className="w-12 h-12 bg-amber-500 rounded-full animate-pulse shadow-[0_0_20px_rgba(245,158,11,0.6)]"></div>
                    </div>

                    <h2 className="text-3xl font-extrabold mb-2 tracking-tight">
                        Masa {tableId}
                    </h2>
                    <p className="text-amber-500 mb-6 text-center font-bold tracking-wide uppercase text-sm">
                        REZERVE EDİLMİŞTİR
                    </p>
                    
                    {/* TODO: API'den gerçek veriler gelecek */}
                    <div className="w-full bg-muted/50 rounded-2xl p-5 mb-8 border shadow-inner">
                        <div className="flex justify-between items-center border-b pb-3 mb-3">
                            <span className="text-muted-foreground font-medium text-sm">Müşteri:</span>
                            <span className="font-bold text-lg">Ahmet Yılmaz</span>
                        </div>
                        <div className="flex justify-between items-center border-b pb-3 mb-3">
                            <span className="text-muted-foreground font-medium text-sm">Saat:</span>
                            <span className="text-amber-500 font-extrabold text-xl">19:30</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground font-medium text-sm">Kişi Sayısı:</span>
                            <span className="font-bold text-lg">4 Kişi</span>
                        </div>
                    </div>

                    <div className="w-full flex flex-col gap-4">
                        <Button 
                            size="lg" 
                            className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-6 text-lg shadow-[0_4px_14px_0_rgba(245,158,11,0.39)]"
                            onClick={handleOpenTable}
                        >
                            Müşteri Geldi (Masayı Aç)
                        </Button>
                        
                        <Button 
                            variant="outline" 
                            size="lg" 
                            className="w-full font-bold py-6 text-lg border-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={handleCancelReservation}
                        >
                            Rezervasyonu İptal Et
                        </Button>
                    </div>

                    <Link to="/" className="mt-6 text-muted-foreground hover:text-foreground font-semibold underline transition-colors">
                        Vazgeç ve Masalara Dön
                    </Link>
                </div>
            </div>
        );
    }

    // --- MASA DOLU (AKTİF SİPARİŞ) DURUMU ---
    if (table.status === 2) {
        return (
            <div className="flex h-screen bg-background overflow-hidden text-foreground">
                
                {/* SOL TARAF: Menü ve Kategoriler */}
                <div className="w-full lg:w-2/3 flex flex-col h-screen relative">
                    <div className="bg-card px-4 lg:px-6 py-3 lg:py-4 shadow-sm flex items-center gap-3 lg:gap-4 overflow-x-auto z-10 sticky top-0 border-b">
                        <Button 
                            variant={selectedCategoryId === null ? "default" : "secondary"}
                            size="lg"
                            className={`rounded-xl font-bold transition-all shadow-md active:scale-95 ${selectedCategoryId === null ? "bg-orange-500 hover:bg-orange-600 shadow-[0_0_15px_rgba(249,115,22,0.5)] scale-105" : ""}`}
                            onClick={() => setSelectedCategoryId(null)}
                        >
                            Tümü
                        </Button>
                        {categories.map(category => (
                            <CategoryCard 
                                key={category.id} 
                                category={category} 
                                isSelected={selectedCategoryId === category.id}
                                onClick={() => setSelectedCategoryId(category.id)}
                            />
                        ))}
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-2 lg:p-6 bg-muted/20 pb-28 lg:pb-6">
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 lg:gap-6">
                            {filteredProducts.map(product => (
                                <ProductCard key={product.id} product={product} onAdd={increaseQuantity} />
                            ))}
                        </div>
                    </div>
                </div>

                {/* Mobil: Floating Sepet Butonu */}
                <button
                    onClick={() => setIsCartOpen(true)}
                    className="lg:hidden fixed bottom-4 right-4 z-30 bg-orange-500 hover:bg-orange-600 text-white rounded-full shadow-2xl px-5 py-4 flex items-center gap-3 active:scale-95 transition-transform"
                >
                    <ShoppingCart className="w-6 h-6" />
                    <div className="flex flex-col items-start leading-tight">
                        <span className="text-xs font-medium opacity-90">{activeOrder.orderItems.length} ürün</span>
                        <span className="text-base font-extrabold">{activeOrder.totalPrice} ₺</span>
                    </div>
                </button>

                {/* Mobil: Backdrop */}
                {isCartOpen && (
                    <div
                        onClick={() => setIsCartOpen(false)}
                        className="lg:hidden fixed inset-0 bg-black/50 z-40 transition-opacity"
                    />
                )}

                {/* SAĞ TARAF: Adisyon ve Ödeme Alanı */}
                <div className={`bg-card shadow-[-10px_0_30px_-5px_rgba(0,0,0,0.1)] flex flex-col border-l
                    fixed inset-x-0 bottom-0 top-0 z-50 transition-transform duration-300
                    ${isCartOpen ? 'translate-y-0' : 'translate-y-full'}
                    lg:static lg:translate-y-0 lg:w-1/3 lg:z-20`}>

                    <div className="px-3 lg:px-6 py-2 lg:py-4 border-b flex justify-between items-center bg-card">
                        <div className="flex items-center gap-2">
                            <h2 className="text-base lg:text-xl font-extrabold">Masa {tableId}</h2>
                            <Badge variant="destructive" className="animate-pulse text-[10px] lg:text-xs px-1.5 py-0">Aktif</Badge>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="lg:hidden h-8 w-8"
                            onClick={() => setIsCartOpen(false)}
                        >
                            <X className="w-4 h-4" />
                        </Button>
                    </div>
                    
                    <div className="px-4 pt-4 pb-2 bg-card">
                        <div className="flex gap-2 p-1 bg-muted rounded-xl overflow-x-auto scrollbar-hide border">
                            {[
                                { id: 1, label: "Yeni" },
                                { id: 2, label: "Onaylı" },
                                { id: 3, label: "Mutfakta" },
                                { id: 4, label: "Hazır" }
                            ].map(tab => (
                                <Button
                                    key={tab.id}
                                    variant={orderTab === tab.id ? "default" : "ghost"}
                                    size="sm"
                                    onClick={() => setOrderTab(tab.id)}
                                    className={`flex-1 rounded-lg font-bold ${orderTab === tab.id ? "shadow-md" : "text-muted-foreground"}`}
                                >
                                    {tab.label}
                                </Button>
                            ))}
                        </div>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/10">
                        {filteredOrderItems.length === 0 ? (
                            <div className="text-center text-muted-foreground mt-10 font-medium flex flex-col items-center gap-3">
                                <Utensils className="w-12 h-12 opacity-20" />
                                Bu statüde ürün bulunmuyor.
                            </div>
                        ) : (
                            filteredOrderItems.map(item => (
                                <OrderCard
                                    key={`${item.productId}-${item.is_load}`}
                                    item={item}
                                    decreaseQuantity={decreaseQuantity}
                                    increaseQuantity={increaseQuantity}
                                    onUpdateQuantity={handleUpdateQuantity}
                                    removeItem={handleRemoveItem}
                                />
                            ))
                        )}
                    </div>
                    
                    {/* Alt Kısım: Ara Toplam ve Butonlar */}
                    <div className="p-3 lg:p-4 bg-card border-t flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-12 w-12 shrink-0 rounded-xl text-destructive hover:bg-destructive/10"
                            onClick={handleCancelOrder}
                            title="İptal Et"
                        >
                            <X className="w-5 h-5" />
                        </Button>

                        <Button
                            asChild
                            variant="ghost"
                            size="icon"
                            className="h-12 w-12 shrink-0 rounded-xl text-muted-foreground hover:text-foreground"
                            title="Masalara Dön"
                        >
                            <Link to="/"><Utensils className="w-5 h-5" /></Link>
                        </Button>

                        <Button
                            disabled={isSubmitting}
                            onClick={(e) => orderTab === 2 ? handleSubmitUpdate(e) : handleSubmitOrder(e)}
                            className={`flex-1 h-12 rounded-xl font-bold flex items-center justify-between px-4 ${orderTab === 2 ? "bg-blue-600 hover:bg-blue-700" : "bg-emerald-600 hover:bg-emerald-700"}`}
                        >
                            {isSubmitting ? (
                                <span className="mx-auto">İşleniyor...</span>
                            ) : (
                                <>
                                    <span className="flex items-center gap-2 text-base">
                                        <Check className="w-5 h-5" strokeWidth={3} />
                                        {orderTab === 2 ? "Güncelle" : "Onayla"}
                                    </span>
                                    <span className="text-base font-black tracking-tight">
                                        {activeOrder.totalPrice} ₺
                                    </span>
                                </>
                            )}
                        </Button>
                    </div>
                </div>

                {/* --- PAY MODALI (SHADCN DIALOG) --- */}
                {/* <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
                    <DialogContent className="sm:max-w-md border-none shadow-2xl p-0 overflow-hidden rounded-3xl bg-card">
                        <div className="p-8">
                            <DialogHeader className="text-center mb-8">
                                <DialogTitle className="text-3xl font-bold text-center">Ödeme Al</DialogTitle>
                                <DialogDescription className="text-center text-base mt-2">
                                    Lütfen ödeme yöntemini seçin
                                </DialogDescription>
                            </DialogHeader>

                            <div className="flex flex-col gap-4">
                                <Button 
                                    size="lg"
                                    onClick={() => handlePayment()}
                                    className="w-full bg-blue-500 hover:bg-blue-600 text-white text-xl font-bold py-8 rounded-2xl shadow-[0_4px_14px_0_rgba(59,130,246,0.39)] gap-3"
                                >
                                    <CreditCard className="w-7 h-7" />
                                    Kredi Kartı
                                </Button>

                                <Button 
                                    size="lg"
                                    onClick={() => handlePayment()}
                                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-white text-xl font-bold py-8 rounded-2xl shadow-[0_4px_14px_0_rgba(16,185,129,0.39)] gap-3"
                                >
                                    <Banknote className="w-7 h-7" />
                                    Nakit
                                </Button>
                            </div>

                            <Button 
                                variant="ghost"
                                onClick={() => setIsPaymentModalOpen(false)}
                                className="mt-6 w-full text-muted-foreground font-semibold py-6 rounded-2xl text-lg hover:bg-muted"
                            >
                                Vazgeç
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog> */}

            </div>
        );
    }
}