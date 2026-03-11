import type { Product } from '../types';

interface ProductCardProps {
    product: Product;
    // Ürüne tıklandığında adisyona eklemek için dışarıdan bir fonksiyon alıyoruz
    //onAdd: (productId: number) => void; 
}

export default function ProductCard({ product/*, onAdd */}: ProductCardProps) {
    return (
        <button 
            // Sayfa yönlendirmesi değil, tıklama işlemi yapıyoruz
            //onClick={() => onAdd(product.id)}
            className="p-4 rounded-lg shadow-sm bg-white border-2 border-gray-200 flex flex-col items-center justify-center transition-all hover:scale-105 hover:border-blue-400 hover:bg-blue-50"
        >
            <span className="text-xl font-bold text-slate-800 text-center">
                {product.name}
            </span>
            <span className="text-lg font-semibold text-slate-500 mt-2">
                {product.price} ₺
            </span>
        </button>
    );
}