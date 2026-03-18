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
    const [updateOrder, setUpdateOrder] = useState(false);
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
                    setActiveOrder(orderData);
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

    const handleSubmitOrder = async () => {
        try {
            setIsLoading(true);
            await orderService.addOrderItems(activeOrder);
            navigate(`/table/${tableId}`);
        } catch (error: any) {
            console.log(error.response.data);
        } finally{
            setIsLoading(false);
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
    
    /* To be looked at later.
    const handlePayment = async () => {
        try {
            // console.log(`Ödeme alındı: ${paymentMethod}`);
            if (!tableId)
                return;
            await orderService.closeOrder(tableId);
            
            const updatedTable = await tableService.getTableById(tableId);
            setTable(updatedTable);
            
            // İşlem bitince Pop-up'ı kapat
            setIsPaymentModalOpen(false); 
            
        } catch (error: any) {
            console.log(error.response?.data);
        }
    }*/

    const handleCancelOrder = async () => {
        try {
            if (!tableId || !activeOrder) return;

            const isConfirmed = window.confirm("Dikkat: İçerisinde ürün bulunan bu sipariş tamamen iptal edilecek ve masa boşaltılacaktır. Emin misiniz?"); 
            console.log(isConfirmed);
            console.log(activeOrder);
            if (isConfirmed) {
                await orderService.cancelOrder(activeOrder.id); 
                const updatedTable = await tableService.getTableById(tableId);
                setTable(updatedTable);
            }
        } catch (error: any) {
            console.log(error.response?.data);
        }
    }
    const addOrderItem = (productId: number) => {
        try {
            const clickedProduct = products.find(p => p.id === productId);
            if (!clickedProduct) return;

            setActiveOrder((prevOrder) => {
                const existingItem = prevOrder.orderItems.find(item => item.productId === productId);

                let updatedItems;
                if (existingItem) {
                    updatedItems = prevOrder.orderItems.map(item => 
                        item.productId === productId 
                            ? { ...item, quantity: item.quantity + 1 }
                            : item
                    );
                } else {
                    updatedItems = [...prevOrder.orderItems, { 
                        productId: clickedProduct.id, 
                        productName: clickedProduct.name, 
                        unitPrice: clickedProduct.price, 
                        quantity: 1 
                    }];
                }

                const newTotal = updatedItems.reduce((total, item) => total + (item.quantity * item.unitPrice), 0);

                return { ...prevOrder, orderItems: updatedItems, totalPrice: newTotal };
            });

        } catch (error) {
            console.error("Ürün eklenirken bir hata oluştu:", error);
        }
    };
    const filteredProducts = selectedCategoryId 
        ? products.filter(product => product.categoryId === selectedCategoryId) 
        : products;
    if (!table) return <div>Masa bulunamadı!</div>;

    // for Available
    if (table.status === 1) {
        return (
            <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl shadow-xl p-8 max-w-sm w-full flex flex-col items-center">
                    <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mb-6">
                        <div className="w-12 h-12 bg-green-500 rounded-full animate-pulse shadow-lg shadow-green-200"></div>
                    </div>
                    <h2 className="text-3xl font-extrabold text-slate-800 mb-2">
                        Masa {tableId}
                    </h2>
                    <p className="text-slate-500 mb-8 text-center font-medium">
                        Bu masa şu anda boş. Yeni bir adisyon açabilir veya rezerve edebilirsiniz.
                    </p>

                    <div className="w-full flex flex-col gap-4">
                        
                        <button
                            // TODO: onClick={handleOpenTable}
                            className="w-full bg-green-500 hover:bg-green-600 active:scale-95 text-white font-bold py-4 rounded-xl shadow-md transition-all text-xl"
                            onClick={handleOpenTable}
                        >
                            Masayı Aç
                        </button>
                        
                        <button 
                            // TODO: onClick={handleReservation}
                            className="w-full bg-white hover:bg-slate-50 active:scale-95 text-blue-600 font-bold py-3 rounded-xl border-2 border-blue-100 transition-all text-lg"
                            onClick={handleReservation}
                        >
                            Rezerve Et
                        </button>

                    </div>

                    <Link to="/" className="mt-8 text-slate-400 hover:text-slate-600 font-semibold underline transition-colors">
                        Vazgeç ve Masalara Dön
                    </Link>

                </div>
            </div>
        );
    }
    // for reservation
    if (table.status === 3) {
        return (
            <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
                
                <div className="bg-white rounded-3xl shadow-xl p-8 max-w-sm w-full flex flex-col items-center">
                    
                    <div className="w-24 h-24 bg-amber-50 rounded-full flex items-center justify-center mb-6">
                        <div className="w-12 h-12 bg-amber-500 rounded-full animate-pulse shadow-lg shadow-amber-200"></div>
                    </div>

                    <h2 className="text-3xl font-extrabold text-slate-800 mb-2">
                        Masa {tableId}
                    </h2>
                    <p className="text-amber-500 mb-6 text-center font-bold tracking-wide uppercase text-sm">
                        REZERVE EDİLMİŞTİR
                    </p>
                     {/* // TODO: will come data to api */}
                    <div className="w-full bg-slate-50 rounded-2xl p-5 mb-8 border border-slate-200 shadow-inner">
                        <div className="flex justify-between items-center border-b border-slate-200 pb-3 mb-3">
                            <span className="text-slate-500 font-medium text-sm">Müşteri:</span>
                            <span className="text-slate-800 font-bold text-lg">Ahmet Yılmaz</span>
                        </div>
                        <div className="flex justify-between items-center border-b border-slate-200 pb-3 mb-3">
                            <span className="text-slate-500 font-medium text-sm">Saat:</span>
                            <span className="text-amber-600 font-extrabold text-xl">19:30</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-slate-500 font-medium text-sm">Kişi Sayısı:</span>
                            <span className="text-slate-800 font-bold text-lg">4 Kişi</span>
                        </div>
                    </div>

                    <div className="w-full flex flex-col gap-4">
                        
                        <button 
                            // TODO: onClick={handleCustomerArrived}
                            className="w-full bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-bold py-4 rounded-xl shadow-md transition-all text-xl"
                            onClick={handleOpenTable}
                        >
                            Müşteri Geldi (Adisyon Aç)
                        </button>
                        
                        <button 
                            // TODO: onClick={handleCancelReservation}
                            className="w-full bg-white hover:bg-red-50 active:scale-95 text-red-500 font-bold py-3 rounded-xl border-2 border-red-100 transition-all text-lg"
                            onClick={handleCancelReservation}
                        >
                            Rezervasyonu İptal Et
                        </button>

                    </div>

                    <Link to="/" className="mt-6 text-slate-400 hover:text-slate-600 font-semibold underline transition-colors">
                        Vazgeç ve Masalara Dön
                    </Link>

                </div>
            </div>
        );
    }
    // for Occupied
    if (table.status === 2) {
        return (
            <div className="flex h-screen bg-slate-50 overflow-hidden text-slate-800">
                
                <div className="w-2/3 flex flex-col h-screen relative">
                    
                    <div className="bg-white px-6 py-4 shadow-sm flex items-center gap-4 overflow-x-auto z-10 sticky top-0 border-b border-slate-200">
                        <button 
                            onClick={() => setSelectedCategoryId(null)}
                            className={`px-6 py-3 rounded-xl font-bold whitespace-nowrap transition-all shadow-md active:scale-95
                                ${selectedCategoryId === null 
                                    ? "bg-orange-500 text-white shadow-orange-300 scale-105" 
                                    : "bg-white text-gray-600 hover:bg-gray-50"
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
                                <ProductCard key={product.id} product={product} onAdd={addOrderItem} />
                            ))}
                        </div>
                    </div>
                </div>

                <div className="w-1/3 bg-white shadow-[-10px_0_20px_-5px_rgba(0,0,0,0.05)] z-20 flex flex-col relative border-l border-slate-200">
                    
                    <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-white">
                        <h2 className="text-2xl font-extrabold text-slate-800">
                            Masa {tableId}
                        </h2>
                        <span className="bg-red-50 text-red-500 px-3 py-1 rounded-full text-xs font-bold border border-red-100 animate-pulse">
                            Aktif Sipariş
                        </span>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
                        {activeOrder.orderItems.map(item => (
                            <OrderCard key={item.productId} item={item} />
                        ))}
                    </div>
                    
                    <div className="p-6 bg-white border-t border-slate-200 shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.03)]">
                        
                        <div className="flex justify-between items-end mb-6">
                            <span className="text-slate-500 font-medium text-lg mb-1">Ara Toplam</span>
                            <div className="text-right">
                                <span className="text-4xl font-black text-green-500 tracking-tight">
                                    {activeOrder.totalPrice} <span className="text-2xl text-green-400">₺</span>
                                </span>
                            </div>
                        </div>
                        
                        <div className="flex flex-col gap-3">
                           
                           <button 
                                onClick={handleSubmitOrder}
                                disabled={isLoading} 
                                className={`w-full active:scale-95 transition-all text-white text-xl font-bold py-4 rounded-2xl shadow-lg flex justify-center items-center gap-2
                                    ${isLoading 
                                        ? "bg-gray-400 cursor-not-allowed shadow-none"
                                        : (updateOrder ? "bg-blue-500 hover:bg-blue-600 shadow-blue-200" : "bg-green-500 hover:bg-green-600 shadow-green-200")
                                    }`}
                            >
                                {isLoading ? (
                                    <svg className="animate-spin -ml-1 mr-3 h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                ) : updateOrder ? (
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                ) : (
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                                    </svg>
                                )}
                                
                                {isLoading ? "İşleniyor..." : (updateOrder ? "Siparişi Güncelle" : "Siparişi Onayla")}
                            </button>

                            <button 
                                className="w-full bg-red-50 hover:bg-red-100 active:scale-95 transition-all text-red-600 border border-red-200 text-lg font-bold py-3 rounded-2xl flex justify-center items-center gap-2"
                                onClick={() => setIsPaymentModalOpen(true)}
                            >
                                Masayı Kapat (Hesabı Al)
                            </button>

                            <button 
                                className="w-full bg-white hover:bg-slate-50 active:scale-95 transition-all text-slate-500 border border-slate-300 text-lg font-bold py-3 rounded-2xl flex justify-center items-center gap-2 shadow-sm"
                                onClick={handleCancelOrder}
                            >
                                İptal Et
                            </button>
                        </div>
                        
                        <Link to="/" className="text-slate-400 hover:text-slate-600 font-semibold transition-colors text-center block mt-5">
                            Kapat ve Masalara Dön
                        </Link>
                    </div>

                </div>

                {/* open modal for "masayı kapat" popup */}
                {isPaymentModalOpen && (
                    <div className="fixed inset-0 flex items-center justify-center z-50 backdrop-blur-sm transition-all">
                        <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl transform transition-all">
                            
                            <div className="text-center mb-8">
                                <h3 className="text-2xl font-bold text-gray-800">Ödeme Al</h3>
                                <p className="text-gray-500 mt-2">Lütfen ödeme yöntemini seçin</p>
                            </div>

                            <div className="flex flex-col gap-4">
                                <button 
                                    // onClick={() => handlePayment('Kredi Kartı')}
                                    className="w-full bg-blue-500 hover:bg-blue-600 active:scale-95 text-white text-xl font-bold py-4 rounded-2xl shadow-md transition-all flex justify-center items-center gap-2"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path></svg>
                                    Kredi Kartı
                                </button>

                                <button 
                                    // onClick={() => handlePayment('Nakit')}
                                    className="w-full bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white text-xl font-bold py-4 rounded-2xl shadow-md transition-all flex justify-center items-center gap-2"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                                    Nakit
                                </button>
                            </div>

                            <button 
                                onClick={() => setIsPaymentModalOpen(false)}
                                className="mt-6 w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 rounded-xl transition-all"
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