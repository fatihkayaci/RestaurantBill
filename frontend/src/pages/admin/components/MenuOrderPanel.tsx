import { useState } from 'react';
import { toast } from 'sonner';
import { Image as ImageIcon } from 'lucide-react';
import { SortableList, SortableRow } from '@/components/dnd/SortableList';
import { SortModeBanner } from '@/components/dnd/SortMode';
import { categoryService } from '@/features/categories/api/categoryService';
import { productService } from '@/features/products/api/productService';
import type { Category } from '@/features/categories/types';
import type { ProductWithCost } from '@/features/products/types';
import { getApiErrorMessage } from '@/lib/apiError';
import { formatPrice } from '@/lib/format';
import { cn } from '@/lib/utils';

interface Props {
    categories: Category[];
    products: ProductWithCost[];
    initialCategoryId: string | null;
    onCategoriesChange: (next: Category[]) => void;
    onProductsChange: (next: ProductWithCost[]) => void;
}

/** Bir kategorinin ürünlerini verilen sıraya dizer; diğer kategorilerin ürünleri yerinde kalır. */
function applyCategoryOrder(all: ProductWithCost[], categoryId: string, ordered: ProductWithCost[]): ProductWithCost[] {
    let i = 0;
    return all.map(p => (p.categoryId === categoryId ? ordered[i++] ?? p : p));
}

// Yemeklerimiz · Sıralama modu: kategorileri ve seçili kategorinin ürünlerini sürükleyerek dizer.
// Her bırakışta sıra hemen kaydedilir; hata olursa eski sıra geri yüklenir.
export default function MenuOrderPanel({ categories, products, initialCategoryId, onCategoriesChange, onProductsChange }: Props) {
    const [categoryId, setCategoryId] = useState<string | null>(initialCategoryId ?? categories[0]?.id ?? null);
    const activeCategory = categories.find(c => c.id === categoryId) ?? null;
    const categoryProducts = activeCategory ? products.filter(p => p.categoryId === activeCategory.id) : [];

    const reorderCategories = async (next: Category[]) => {
        const previous = categories;
        onCategoriesChange(next);
        try {
            await categoryService.reorderCategories(next.map(c => c.id));
            toast.success('Kategori sırası kaydedildi.');
            // "Tümü" görünümü kategori sırasını izler: ürünler de yeni sırayla alınır.
            onProductsChange(await productService.getProductsWithCost());
        } catch (err) {
            onCategoriesChange(previous);
            toast.error(getApiErrorMessage(err, 'Kategori sırası kaydedilemedi.'));
        }
    };

    const reorderProducts = async (next: ProductWithCost[]) => {
        if (!activeCategory) return;
        const previous = products;
        onProductsChange(applyCategoryOrder(products, activeCategory.id, next));
        try {
            await productService.reorderProducts(activeCategory.id, next.map(p => p.id));
            toast.success('Ürün sırası kaydedildi.');
        } catch (err) {
            onProductsChange(previous);
            toast.error(getApiErrorMessage(err, 'Ürün sırası kaydedilemedi.'));
        }
    };

    return (
        <div className="space-y-5">
            <SortModeBanner>
                Kategorileri ve ürünleri tutamaktan tutup sürükleyin (telefonda basılı tutun). Bırakınca sıra kaydedilir;
                menüde, garson ekranında, restoran sitesinde, QR menüde ve online siparişte bu sırayla görünür.
            </SortModeBanner>

            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
                <section className="space-y-2" aria-labelledby="order-categories-title">
                    <h2 id="order-categories-title" className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">
                        Kategoriler
                    </h2>
                    {categories.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Henüz kategori yok.</p>
                    ) : (
                        <SortableList
                            items={categories}
                            getName={c => c.name}
                            onReorder={next => void reorderCategories(next)}
                            className="flex flex-col gap-2"
                            renderItem={(category, state) => {
                                const count = products.filter(p => p.categoryId === category.id).length;
                                const selected = category.id === categoryId;
                                return (
                                    <SortableRow
                                        state={state}
                                        label={`${category.name} kategorisini taşı`}
                                        className={cn(selected && 'border-rb-accent bg-rb-accent-bg')}
                                    >
                                        <button
                                            type="button"
                                            onClick={() => setCategoryId(category.id)}
                                            aria-pressed={selected}
                                            className="flex min-h-10 min-w-0 flex-1 items-center justify-between gap-2 text-left"
                                        >
                                            <span className="truncate text-sm font-semibold text-foreground">{category.name}</span>
                                            <span className="shrink-0 text-xs text-muted-foreground">{count} ürün</span>
                                        </button>
                                    </SortableRow>
                                );
                            }}
                        />
                    )}
                </section>

                <section className="space-y-2" aria-labelledby="order-products-title">
                    <h2 id="order-products-title" className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">
                        {activeCategory ? `${activeCategory.name} · ürünler` : 'Ürünler'}
                    </h2>
                    {!activeCategory ? (
                        <p className="text-sm text-muted-foreground">Ürünlerini sıralamak için soldan bir kategori seçin.</p>
                    ) : categoryProducts.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Bu kategoride ürün yok.</p>
                    ) : (
                        <SortableList
                            key={activeCategory.id}
                            items={categoryProducts}
                            getName={p => p.name}
                            onReorder={next => void reorderProducts(next)}
                            className="flex flex-col gap-2"
                            renderItem={(product, state) => (
                                <SortableRow state={state} label={`${product.name} ürününü taşı`}>
                                    <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
                                        {product.imageUrl
                                            ? <img src={product.imageUrl} alt="" className="size-full object-cover" loading="lazy" draggable={false} />
                                            : <ImageIcon className="size-4 text-muted-foreground" aria-hidden="true" />}
                                    </div>
                                    <div className="flex min-w-0 flex-1 flex-col">
                                        <span className={cn('truncate text-sm font-semibold', product.isActive ? 'text-foreground' : 'text-muted-foreground line-through')}>
                                            {product.name}
                                        </span>
                                        {!product.isActive && <span className="text-xs text-muted-foreground">Pasif</span>}
                                    </div>
                                    <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">{formatPrice(product.price)} ₺</span>
                                </SortableRow>
                            )}
                        />
                    )}
                </section>
            </div>
        </div>
    );
}
