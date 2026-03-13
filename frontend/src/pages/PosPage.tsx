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
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [table, setTable] = useState<Table>([]);
    const [activeOrder, setActiveOrder] = useState<Order>({
        id: 0,
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
            await orderService.createMultiplerOrderItems(activeOrder.id, activeOrder.id);   
            navigate("/");
        } catch (error) {
            console.log("Sipariş onaylanırken hata oluştu:", error);
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
                        >
                            Masayı Aç
                        </button>
                        
                        <button 
                            // TODO: onClick={handleReservation}
                            className="w-full bg-white hover:bg-slate-50 active:scale-95 text-blue-600 font-bold py-3 rounded-xl border-2 border-blue-100 transition-all text-lg"
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
                        >
                            Müşteri Geldi (Adisyon Aç)
                        </button>
                        
                        <button 
                            // TODO: onClick={handleCancelReservation}
                            className="w-full bg-white hover:bg-red-50 active:scale-95 text-red-500 font-bold py-3 rounded-xl border-2 border-red-100 transition-all text-lg"
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
                        {categories.map(category => (
                            <CategoryCard key={category.id} category={category} />
                        ))}
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-6">
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                            {products.map(product => (
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
                        
                        <button 
                            onClick={handleSubmitOrder}
                            className="w-full bg-green-500 hover:bg-green-600 active:scale-95 transition-all text-white text-xl font-bold py-5 rounded-2xl shadow-lg shadow-green-200 flex justify-center items-center gap-2"
                        >
                            Siparişi Onayla
                        </button>
                        
                        <Link to="/" className="text-slate-400 hover:text-slate-600 font-semibold transition-colors text-center block mt-5">
                            Kapat ve Masalara Dön
                        </Link>
                    </div>

                </div>
            </div>
        );
    }
    
}