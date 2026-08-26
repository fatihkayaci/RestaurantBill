import { imageFocusToObjectPosition } from '../types';
import type { Product } from '../types';
import { Card, CardContent } from '@/components/ui/card';
import { Image as ImageIcon } from 'lucide-react';

interface ProductCardProps {
    product: Product;
    onAdd: (productId: string) => void;
}

export default function ProductCard({ product, onAdd }: ProductCardProps) {
    return (
        <Card
            onClick={() => onAdd(product.id)}
            role="button"
            tabIndex={0}
            className="group cursor-pointer flex flex-col justify-center transition-all hover:-translate-y-1 hover:border-rb-green/50 hover:bg-muted/50 hover:shadow-[0_10px_20px_-10px_rgba(16,185,129,0.4)] active:scale-95"
        >
            <CardContent className="p-3 lg:p-5 min-h-27.5 lg:min-h-0 flex flex-col items-center justify-center gap-2 lg:gap-3">
                {product.imageUrl ? (
                    <img
                        src={product.imageUrl}
                        alt={product.name}
                        loading="lazy"
                        className="h-16 w-16 lg:h-20 lg:w-20 rounded-lg object-cover"
                        style={{ objectPosition: imageFocusToObjectPosition[product.imageFocus] }}
                    />
                ) : (
                    <div className="h-16 w-16 lg:h-20 lg:w-20 rounded-lg bg-muted flex items-center justify-center">
                        <ImageIcon className="h-6 w-6 text-muted-foreground/40" />
                    </div>
                )}
                <span className="text-base lg:text-xl font-bold text-center text-foreground group-hover:text-primary transition-colors line-clamp-2">
                    {product.name}
                </span>
                <span className="text-base lg:text-lg font-black text-rb-green group-hover:opacity-80 transition-colors">
                    {product.price} ₺
                </span>
            </CardContent>
        </Card>
    );
}
