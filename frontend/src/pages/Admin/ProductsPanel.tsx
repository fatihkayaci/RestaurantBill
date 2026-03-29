import { useEffect, useState } from "react";
import { productService } from "../../api/productService";
import type { Product } from "../../features/products/types";
import ProductCard from "../../features/Admin/ProductionPanel/components/ProductionCard";

export default function ProductsPanel() {
    const [products, setProducts] = useState<Product[]>([]);
    useEffect(() => {
        productService.getProducts()
            .then((data) => {
                setProducts(data);
            })
            .catch((error) => {
                console.error("Masalar çekilirken hata oluştu:", error);
            });
    }, []);
    
    const handleDelete = async (id: number) => {
        await productService.deleteProduct(id);
        setProducts(products.filter(p => p.id !== id));
    };
    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">Ürünler</h2>
                <button className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-lg">
                    + Yeni Ürün
                </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {products.map(product => (
                    <ProductCard product={product} onDelete={handleDelete}/>
                ))}
            </div>
        </div>
    );
}
