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

export default function PosPage() {
    const { tableId } = useParams();
    const navigate = useNavigate();
    
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [orderTab, setOrderTab] = useState<number>(1);
    const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
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
                console.log(orderData);
            } catch (error) {
                console.error("Veriler çekilirken hata:", error);
            } finally {
                setIsLoading(false);
            }
        };
        
        fetchAllData();
    }, [tableId, navigate]);

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
            console.log(error.response.data);
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

    if (isLoading) {
        return (
            <div className="flex h-screen bg-slate-900 overflow-hidden">
                <div className="w-2/3 flex flex-col h-screen p-6">
                    <div className="flex gap-4 mb-8">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="h-12 w-28 bg-slate-800 rounded-xl animate-pulse border border-slate-700/50"></div>
                        ))}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                            <div key={i} className="h-32 bg-slate-800 rounded-2xl animate-pulse border border-slate-700/50"></div>
                        ))}
                    </div>
                </div>

                <div className="w-1/3 bg-slate-800 border-l border-slate-700 flex flex-col">
                    <div className="h-20 border-b border-slate-700 p-6 flex items-center justify-between">
                        <div className="h-8 w-32 bg-slate-700 rounded-lg animate-pulse"></div>
                        <div className="h-6 w-24 bg-slate-700 rounded-full animate-pulse"></div>
                    </div>
                    <div className="flex-1 p-4 space-y-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-20 bg-slate-700/50 rounded-xl animate-pulse"></div>
                        ))}
                    </div>
                    <div className="h-64 border-t border-slate-700 p-6 flex flex-col gap-4">
                        <div className="h-8 w-full bg-slate-700 rounded-lg animate-pulse mb-2"></div>
                        <div className="h-14 w-full bg-slate-700 rounded-2xl animate-pulse"></div>
                        <div className="h-12 w-full bg-slate-700 rounded-2xl animate-pulse"></div>
                    </div>
                </div>
            </div>
        );
    }

    if (!table) {
        return (
            <div className="h-screen flex flex-col items-center justify-center bg-slate-900 text-slate-200">
                <svg className="w-20 h-20 text-slate-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                <h2 className="text-2xl font-bold">Masa Bulunamadı</h2>
                <p className="text-slate-400 mt-2">Aradığınız masa sistemde kayıtlı değil veya silinmiş olabilir.</p>
            </div>
        );
    }


    // for Available
    if (table.status === 1) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
                <div className="bg-slate-800 rounded-3xl shadow-2xl shadow-slate-900/50 p-8 max-w-sm w-full flex flex-col items-center border border-slate-700">
                    <div className="w-24 h-24 bg-slate-700/50 rounded-full flex items-center justify-center mb-6">
                        <div className="w-12 h-12 bg-green-500 rounded-full animate-pulse shadow-[0_0_20px_rgba(34,197,94,0.6)]"></div>
                    </div>
                    <h2 className="text-3xl font-extrabold text-white mb-2 tracking-tight">
                        Masa {tableId}
                    </h2>
                    <p className="text-slate-400 mb-8 text-center font-medium">
                        Bu masa şu anda boş. Yeni bir adisyon açabilir veya rezerve edebilirsiniz.
                    </p>

                    <div className="w-full flex flex-col gap-4">
                        <button
                            onClick={handleOpenTable}
                            className="w-full bg-green-500 hover:bg-green-600 active:scale-95 text-white font-bold py-4 rounded-xl shadow-[0_4px_14px_0_rgba(34,197,94,0.39)] transition-all text-xl"
                        >
                            Masayı Aç
                        </button>
                        
                        <button 
                            onClick={handleReservation}
                            className="w-full bg-slate-800 hover:bg-slate-700 active:scale-95 text-blue-400 font-bold py-3 rounded-xl border-2 border-slate-700 hover:border-blue-500/50 transition-all text-lg"
                        >
                            Rezerve Et
                        </button>
                    </div>

                    <Link to="/" className="mt-8 text-slate-500 hover:text-slate-300 font-semibold underline transition-colors">
                        Vazgeç ve Masalara Dön
                    </Link>
                </div>
            </div>
        );
    }
    // for reservation
    if (table.status === 3) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
                
                <div className="bg-slate-800 rounded-3xl shadow-2xl shadow-slate-900/50 p-8 max-w-sm w-full flex flex-col items-center border border-slate-700">
                    
                    <div className="w-24 h-24 bg-slate-700/50 rounded-full flex items-center justify-center mb-6">
                        <div className="w-12 h-12 bg-amber-500 rounded-full animate-pulse shadow-[0_0_20px_rgba(245,158,11,0.6)]"></div>
                    </div>

                    <h2 className="text-3xl font-extrabold text-white mb-2 tracking-tight">
                        Masa {tableId}
                    </h2>
                    <p className="text-amber-500 mb-6 text-center font-bold tracking-wide uppercase text-sm drop-shadow-sm">
                        REZERVE EDİLMİŞTİR
                    </p>
                    
                     {/* // TODO: will come data to api */}
                    <div className="w-full bg-slate-900/50 rounded-2xl p-5 mb-8 border border-slate-700 shadow-inner">
                        <div className="flex justify-between items-center border-b border-slate-700 pb-3 mb-3">
                            <span className="text-slate-400 font-medium text-sm">Müşteri:</span>
                            <span className="text-slate-200 font-bold text-lg">Ahmet Yılmaz</span>
                        </div>
                        <div className="flex justify-between items-center border-b border-slate-700 pb-3 mb-3">
                            <span className="text-slate-400 font-medium text-sm">Saat:</span>
                            <span className="text-amber-500 font-extrabold text-xl">19:30</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-slate-400 font-medium text-sm">Kişi Sayısı:</span>
                            <span className="text-slate-200 font-bold text-lg">4 Kişi</span>
                        </div>
                    </div>

                    <div className="w-full flex flex-col gap-4">
                        
                        <button
                            className="w-full bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-bold py-4 rounded-xl shadow-[0_4px_14px_0_rgba(245,158,11,0.39)] transition-all text-xl"
                            onClick={handleOpenTable}
                        >
                            Müşteri Geldi (Adisyon Aç)
                        </button>
                        
                        <button
                            className="w-full bg-slate-800 hover:bg-slate-700 active:scale-95 text-red-400 font-bold py-3 rounded-xl border-2 border-slate-700 hover:border-red-500/50 transition-all text-lg"
                            onClick={handleCancelReservation}
                        >
                            Rezervasyonu İptal Et
                        </button>

                    </div>

                    <Link to="/" className="mt-6 text-slate-500 hover:text-slate-300 font-semibold underline transition-colors">
                        Vazgeç ve Masalara Dön
                    </Link>

                </div>
            </div>
        );
    }
    // for Occupied
    if (table.status === 2) {
        return (
            <div className="flex h-screen bg-slate-900 overflow-hidden text-slate-200">
                
                <div className="w-2/3 flex flex-col h-screen relative">
                    
                    <div className="bg-slate-900 px-6 py-4 shadow-sm flex items-center gap-4 overflow-x-auto z-10 sticky top-0 border-b border-slate-800">
                        <button 
                            onClick={() => setSelectedCategoryId(null)}
                            className={`px-6 py-3 rounded-xl font-bold whitespace-nowrap transition-all shadow-md active:scale-95
                                ${selectedCategoryId === null 
                                    ? "bg-orange-500 text-white shadow-[0_0_15px_rgba(249,115,22,0.5)] scale-105" 
                                    : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                                }`}
                        >
                            Tümü
                        </button>
                        {categories.map(category => (
                            <CategoryCard 
                            key={category.id} 
                            category={category} 
                            isSelected={selectedCategoryId === category.id}
                            onClick={() => setSelectedCategoryId(category.id)}/>
                        ))}
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-6">
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                            {filteredProducts.map(product => (
                                <ProductCard key={product.id} product={product} onAdd={increaseQuantity} />
                            ))}
                        </div>
                    </div>
                </div>

                <div className="w-1/3 bg-slate-800 shadow-[-10px_0_30px_-5px_rgba(0,0,0,0.5)] z-20 flex flex-col relative border-l border-slate-700">
                    
                    <div className="px-6 py-5 border-b border-slate-700 flex justify-between items-center bg-slate-800">
                        <h2 className="text-2xl font-extrabold text-white">
                            Masa {tableId}
                        </h2>
                        <span className="bg-red-500/10 text-red-400 px-3 py-1 rounded-full text-xs font-bold border border-red-500/20 animate-pulse">
                            Aktif Sipariş
                        </span>
                    </div>
                    <div className="px-4 pt-4 pb-2 bg-slate-800">
                        <div className="flex gap-2 p-1 bg-slate-900/80 rounded-xl overflow-x-auto scrollbar-hide border border-slate-700/50">
                            {[
                                { id: 1, label: "Yeni" },
                                { id: 2, label: "Onaylı" },
                                { id: 3, label: "Mutfakta" },
                                { id: 4, label: "Hazır" }
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setOrderTab(tab.id)}
                                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-bold whitespace-nowrap transition-all
                                        ${orderTab === tab.id
                                            ? "bg-slate-700 text-white shadow-md shadow-slate-900/50"
                                            : "text-slate-400 hover:text-slate-300 hover:bg-slate-700/50"
                                        }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-900/50">
                        {filteredOrderItems.length === 0 ? (
                            <div className="text-center text-slate-500 mt-10 font-medium flex flex-col items-center gap-3">
                                <svg className="w-12 h-12 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
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
                    
                    <div className="p-6 bg-slate-800 border-t border-slate-700 shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.2)]">
                        
                        <div className="flex justify-between items-end mb-6">
                            <span className="text-slate-400 font-medium text-lg mb-1">Ara Toplam</span>
                            <div className="text-right">
                                <span className="text-4xl font-black text-green-400 tracking-tight">
                                    {activeOrder.totalPrice} <span className="text-2xl text-green-500">₺</span>
                                </span>
                            </div>
                        </div>
                        
                        <div className="border-t border-slate-700 p-4 bg-slate-800 flex items-center gap-2">
    
                                <button 
                                    type="button"
                                    title="İptal Et"
                                    onClick={handleCancelOrder}
                                    className="p-3.5 rounded-xl bg-slate-700/50 text-slate-400 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 border border-transparent transition-all active:scale-95 flex-shrink-0"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                </button>

                                <button 
                                    type="button"
                                    title="Masayı Kapat (Hesabı Al)"
                                    onClick={() => setIsPaymentModalOpen(true)}
                                    className="p-3.5 rounded-xl bg-slate-700/50 text-slate-400 hover:bg-amber-500/10 hover:text-amber-400 hover:border-amber-500/30 border border-transparent transition-all active:scale-95 flex-shrink-0"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                                </button>

                                <button
                                    type="button"
                                    onClick={(e) => orderTab === 2 ? handleSubmitUpdate(e) : handleSubmitOrder(e)}
                                    disabled={isSubmitting}
                                    className={`flex-1 active:scale-95 transition-all text-white font-bold py-3.5 px-4 rounded-xl flex justify-center items-center gap-2
                                        ${isSubmitting
                                            ? "bg-slate-600 cursor-not-allowed shadow-none"
                                            : (orderTab === 2 ? "bg-blue-600 hover:bg-blue-500" : "bg-emerald-600 hover:bg-emerald-500")
                                        }`}
                                >
                                    {isSubmitting ? (
                                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                    ) : orderTab === 2 ? (
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                        </svg>
                                    ) : (
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                                        </svg>
                                    )}

                                    <span className="text-sm tracking-wide">
                                        {isSubmitting ? "İşleniyor..." : (orderTab === 2 ? "Güncelle" : "Siparişi Onayla")}
                                    </span>
                                </button>
                            </div>
                        
                        <Link to="/" className="text-slate-500 hover:text-slate-300 font-semibold transition-colors text-center block mt-5">
                            Kapat ve Masalara Dön
                        </Link>
                    </div>

                </div>

                {isPaymentModalOpen && (
                    <div className="fixed inset-0 flex items-center justify-center z-50 bg-slate-900/80 backdrop-blur-sm transition-all">
                        <div className="bg-slate-800 border border-slate-700 rounded-3xl p-8 w-full max-w-md shadow-2xl transform transition-all">
                            
                            <div className="text-center mb-8">
                                <h3 className="text-2xl font-bold text-white">Ödeme Al</h3>
                                <p className="text-slate-400 mt-2">Lütfen ödeme yöntemini seçin</p>
                            </div>

                            <div className="flex flex-col gap-4">
                                <button 
                                    onClick={() => handlePayment()}
                                    className="w-full bg-blue-500 hover:bg-blue-600 active:scale-95 text-white text-xl font-bold py-4 rounded-2xl shadow-[0_4px_14px_0_rgba(59,130,246,0.39)] transition-all flex justify-center items-center gap-2"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path></svg>
                                    Kredi Kartı
                                </button>

                                <button 
                                    onClick={() => handlePayment()}
                                    className="w-full bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white text-xl font-bold py-4 rounded-2xl shadow-[0_4px_14px_0_rgba(16,185,129,0.39)] transition-all flex justify-center items-center gap-2"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                                    Nakit
                                </button>
                            </div>

                            <button 
                                onClick={() => setIsPaymentModalOpen(false)}
                                className="mt-6 w-full bg-slate-700 hover:bg-slate-600 text-slate-300 font-semibold py-3 rounded-xl transition-all"
                            >
                                Vazgeç
                            </button>
                        </div>
                    </div>
                )}
            </div>
        );
    }
    
}