import type { Product } from '../../../products/types';

interface ProductCardProps {
    product: Product;
    onDelete: (id: number) => void;
    onUpdate: (product: Product) => void;
}

export default function ProductCard({ product, onDelete, onUpdate }: ProductCardProps) {
    return (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between">
                <p className="text-white font-medium">{product.name}</p>
                <span className="text-indigo-400 text-sm font-bold">{product.price}₺</span>
            </div>
            <p className="text-gray-500 text-xs">{product.categoryName}</p>
            <div className="flex gap-2 mt-2">
                <button
                    onClick={() => onUpdate(product)}
                    className="flex-1 text-indigo-400 hover:text-indigo-300 text-xs border border-indigo-400/30 rounded-lg py-1"
                >
                    Düzenle
                </button>
                <button
                    onClick={() => onDelete(product.id)}
                    className="flex-1 text-red-400 hover:text-red-300 text-xs border border-red-400/30 rounded-lg py-1"
                >
                    Sil
                </button>
            </div>
        </div>
    );
}
