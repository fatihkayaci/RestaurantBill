import type { Product } from '../types';

interface ProductCardProps {
    product: Product;
    onAdd: (productId: number) => void;
}

export default function ProductCard({ product, onAdd }: ProductCardProps) {
    return (
        <button
            onClick={() => onAdd(product.id)}
            className="p-5 rounded-2xl shadow-lg bg-slate-800 border border-slate-700 flex flex-col items-center justify-center transition-all hover:-translate-y-1 hover:border-emerald-500/50 hover:bg-slate-700/50 hover:shadow-[0_10px_20px_-10px_rgba(16,185,129,0.4)] active:scale-95 group"
        >
            <span className="text-xl font-bold text-slate-200 text-center group-hover:text-white transition-colors">
                {product.name}
            </span>
            <span className="text-lg font-black text-emerald-500 mt-3 group-hover:text-emerald-400 transition-colors">
                {product.price} ₺
            </span>
        </button>
    );
}