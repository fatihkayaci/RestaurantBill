import type { Product } from '../types';
import { Card, CardContent } from '@/components/ui/card';

interface ProductCardProps {
    product: Product;
    onAdd: (productId: number) => void;
}

export default function ProductCard({ product, onAdd }: ProductCardProps) {
    return (
        <Card
            onClick={() => onAdd(product.id)}
            role="button"
            tabIndex={0}
            className="group cursor-pointer flex flex-col justify-center transition-all hover:-translate-y-1 hover:border-emerald-500/50 hover:bg-muted/50 hover:shadow-[0_10px_20px_-10px_rgba(16,185,129,0.4)] active:scale-95"
        >
            <CardContent className="p-3 lg:p-5 min-h-27.5 lg:min-h-0 flex flex-col items-center justify-center gap-2 lg:gap-3">
                <span className="text-base lg:text-xl font-bold text-center text-foreground group-hover:text-primary transition-colors line-clamp-2">
                    {product.name}
                </span>
                <span className="text-base lg:text-lg font-black text-emerald-600 dark:text-emerald-400 group-hover:text-emerald-500 transition-colors">
                    {product.price} ₺
                </span>
            </CardContent>
        </Card>
    );
}
