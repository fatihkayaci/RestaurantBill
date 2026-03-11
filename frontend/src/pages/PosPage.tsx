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

export default function PosPage() {
    const { tableId } = useParams();
    const navigate = useNavigate();
    
    const [isLoading, setIsLoading] = useState(true);
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
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
                
                const [productsData, categoriesData, orderData] = await Promise.all([
                    productService.getProducts(),
                    categoryService.getCategories(),
                    orderService.getOrderByTableId(tableId)
                ]);

                setProducts(productsData);
                setCategories(categoriesData);
                
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

    return (
        <div className="flex h-screen">
            <div className="w-2/3 flex flex-col h-screen border-r border-gray-300">
                
                <div className="bg-white p-4 shadow-sm flex items-center gap-4 overflow-x-auto min-h-25">
                    {categories.map(category => (
                        <CategoryCard key={category.id} category = {category}/>
                    ))}
                </div>
                <div className="w-1/3 flex">
                    {products.map(product => (
                        <ProductCard key={product.id} product={product} /*onAdd={() => addOrderItem()}*//>
                    ))}
                </div>
                
            </div>
            <div className="w-1/3 bg-gray-200 p-6 flex flex-col">
                <h2 className="text-2xl font-bold mb-4 border-b border-gray-400 pb-2">
                    Masa {tableId} Adisyonu
                </h2>

                <div className="flex-1">
                    {activeOrder.orderItems.map(item => (
                        <OrderCard key={item.productId} item = {item}/>
                    ))}
                    {/* order buraya gelecek */}
                </div>
                
                <Link to="/" className="text-blue-500 underline text-center block mt-4">
                    Masa Ekranına Git
                </Link>
            </div>
        </div>
    );
}