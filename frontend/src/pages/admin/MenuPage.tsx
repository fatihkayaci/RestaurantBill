import { useEffect, useState } from "react";
import { productService } from "@/features/products/api/productService";
import { categoryService } from "@/features/categories/api/categoryService";
import type { Product } from "@/features/products/types";
import type { Category } from "@/features/categories/types";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { X, Pencil } from 'lucide-react';
import { cn } from "@/lib/utils";
import axios from "axios";

const inputClass = "w-full rounded-lg border border-border bg-[rgb(245,240,232)] dark:bg-[#2a2520] px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring";
const labelClass = "block text-[11px] font-semibold tracking-widest uppercase text-muted-foreground mb-1.5";

export default function Menu() {
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<number | 'all'>('all');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editProduct, setEditProduct] = useState<Product | null>(null);
    const [form, setForm] = useState({ name: '', price: 0, categoryId: 0, isActive: true, id: 0 });
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);

    const filteredProducts = products.filter(p =>
        selectedCategory === 'all' || p.categoryId === selectedCategory
    );
    const activeCount = products.filter(p => p.isActive).length;

    useEffect(() => {
        productService.getProducts().then(setProducts).catch(console.error);
        categoryService.getCategories().then(setCategories).catch(console.error);
    }, []);

    const openCreateModal = () => {
        setEditProduct(null);
        setForm({ name: '', price: 0, categoryId: 0, isActive: true, id: 0 });
        setFieldErrors({});
        setIsModalOpen(true);
    };

    const openEditModal = (product: Product) => {
        setEditProduct(product);
        setForm({ name: product.name, price: product.price, categoryId: product.categoryId, isActive: product.isActive, id: product.id });
        setFieldErrors({});
        setIsModalOpen(true);
    };

    const handleToggleActive = async (product: Product) => {
        try {
            await productService.updateProduct({ ...product, isActive: !product.isActive });
            setProducts(prev => prev.map(p => p.id === product.id ? { ...p, isActive: !p.isActive } : p));
        } catch (err) {
            console.error(err);
        }
    };

    const handleDelete = async () => {
        if (deleteTargetId === null) return;
        await productService.deleteProduct(deleteTargetId);
        setProducts(prev => prev.filter(p => p.id !== deleteTargetId));
        setDeleteTargetId(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const errors: Record<string, string> = {};
        if (!form.name.trim()) errors.name = 'Ürün ismi boş bırakılamaz.';
        if (form.price <= 0) errors.price = "Fiyat 0'dan büyük olmalıdır.";
        if (form.categoryId <= 0) errors.categoryId = 'Kategori seçiniz.';
        if (Object.keys(errors).length > 0) { setFieldErrors(errors); return; }
        setFieldErrors({});
        try {
            if (editProduct) {
                const currentIsActive = products.find(p => p.id === editProduct.id)?.isActive ?? form.isActive;
                await productService.updateProduct({ id: form.id, name: form.name, price: form.price, categoryId: form.categoryId, isActive: currentIsActive });
            } else {
                await productService.createProduct({ name: form.name, price: form.price, categoryId: form.categoryId, isActive: true });
            }
            const updated = await productService.getProducts();
            setProducts(updated);
            setIsModalOpen(false);
        } catch (err: unknown) {
            if (axios.isAxiosError(err)) {
                const errs = err.response?.data?.errors as Record<string, string[]> | undefined;
                if (errs) {
                    const mapped: Record<string, string> = {};
                    for (const key in errs) mapped[key.charAt(0).toLowerCase() + key.slice(1)] = errs[key][0];
                    setFieldErrors(mapped);
                }
            }
        }
    };

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-serif font-bold text-foreground">Menü Yönetimi</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">{activeCount} aktif ürün</p>
                </div>
                <button
                    onClick={openCreateModal}
                    className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                >
                    + Ürün Ekle
                </button>
            </div>

            {/* Category Pills */}
            <div className="flex gap-2 flex-wrap">
                <button
                    onClick={() => setSelectedCategory('all')}
                    className={cn(
                        "px-4 py-1.5 rounded-full text-sm font-medium transition-colors",
                        selectedCategory === 'all'
                            ? "bg-blue-600 text-white"
                            : "border border-border text-muted-foreground hover:text-foreground"
                    )}
                >
                    Tümü
                </button>
                {categories.map(cat => (
                    <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.id)}
                        className={cn(
                            "px-4 py-1.5 rounded-full text-sm font-medium transition-colors",
                            selectedCategory === cat.id
                                ? "bg-blue-600 text-white"
                                : "border border-border text-muted-foreground hover:text-foreground"
                        )}
                    >
                        {cat.name}
                    </button>
                ))}
            </div>

            {/* Table */}
            <div className="rounded-xl border border-border bg-card overflow-hidden">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-border">
                            <th className="text-left text-[11px] font-semibold tracking-widest uppercase text-muted-foreground px-5 py-3">Ürün</th>
                            <th className="text-right text-[11px] font-semibold tracking-widest uppercase text-muted-foreground px-5 py-3">Fiyat</th>
                            <th className="text-left text-[11px] font-semibold tracking-widest uppercase text-muted-foreground px-5 py-3">Durum</th>
                            <th className="text-left text-[11px] font-semibold tracking-widest uppercase text-muted-foreground px-5 py-3">İşlem</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredProducts.map(product => (
                            <tr key={product.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                                <td className="px-5 py-3.5">
                                    <p className="font-medium text-foreground">{product.name}</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">{product.categoryName}</p>
                                </td>
                                <td className="px-5 py-3.5 text-right font-medium text-foreground">
                                    ₺{product.price.toFixed(0)}
                                </td>
                                <td className="px-5 py-3.5">
                                    <button
                                        onClick={() => handleToggleActive(product)}
                                        className={cn(
                                            "relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 focus:outline-none",
                                            product.isActive ? "bg-emerald-500" : "bg-gray-300 dark:bg-gray-600"
                                        )}
                                    >
                                        <span className={cn(
                                            "inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform duration-200",
                                            product.isActive ? "translate-x-4" : "translate-x-0.5"
                                        )} />
                                    </button>
                                </td>
                                <td className="px-5 py-3.5">
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => openEditModal(product)}
                                            className="text-muted-foreground hover:text-foreground transition-colors"
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={() => setDeleteTargetId(product.id)}
                                            className="text-muted-foreground hover:text-destructive transition-colors"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {filteredProducts.length === 0 && (
                            <tr>
                                <td colSpan={4} className="px-5 py-10 text-center text-sm text-muted-foreground">
                                    Ürün bulunamadı.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
                    <div className="relative bg-white dark:bg-[#26221e] rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
                        <div className="px-6 pt-6 pb-4 border-b border-border flex items-center justify-between">
                            <h2 className="text-xl font-bold text-foreground">
                                {editProduct ? 'Ürünü Düzenle' : 'Ürün Ekle'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={labelClass}>Ad (Türkçe)</label>
                                    <input
                                        className={cn(inputClass, fieldErrors.name && "border-destructive")}
                                        placeholder="Izgara Köfte"
                                        value={form.name}
                                        onChange={e => setForm({ ...form, name: e.target.value })}
                                        autoFocus
                                    />
                                    {fieldErrors.name && <p className="text-xs text-destructive mt-1">{fieldErrors.name}</p>}
                                </div>
                                <div>
                                    <label className={labelClass}>Fiyat (₺)</label>
                                    <input
                                        type="number"
                                        min={0}
                                        className={cn(inputClass, fieldErrors.price && "border-destructive")}
                                        placeholder="₺"
                                        value={form.price || ''}
                                        onChange={e => setForm({ ...form, price: Number(e.target.value) })}
                                    />
                                    {fieldErrors.price && <p className="text-xs text-destructive mt-1">{fieldErrors.price}</p>}
                                </div>
                            </div>

                            <div>
                                <label className={labelClass}>Kategori</label>
                                <select
                                    className={cn(inputClass, fieldErrors.categoryId && "border-destructive")}
                                    value={form.categoryId}
                                    onChange={e => setForm({ ...form, categoryId: Number(e.target.value) })}
                                >
                                    <option value={0}>Kategori seçin</option>
                                    {categories.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                                {fieldErrors.categoryId && <p className="text-xs text-destructive mt-1">{fieldErrors.categoryId}</p>}
                            </div>
                        </form>

                        <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setIsModalOpen(false)}
                                className="px-4 py-2 text-sm rounded-lg border border-border text-foreground hover:bg-muted transition-colors"
                            >
                                İptal
                            </button>
                            <button
                                type="button"
                                onClick={handleSubmit}
                                className="px-4 py-2 text-sm rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors"
                            >
                                Kaydet
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirm */}
            <AlertDialog open={deleteTargetId !== null} onOpenChange={open => !open && setDeleteTargetId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Ürünü sil</AlertDialogTitle>
                        <AlertDialogDescription>Bu ürünü silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>İptal</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Sil</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
