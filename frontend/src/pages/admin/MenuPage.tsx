import { useEffect, useState } from "react";
import { toast } from "sonner";
import { productService } from "@/features/products/api/productService";
import { categoryService } from "@/features/categories/api/categoryService";
import type { Product } from "@/features/products/types";
import type { Category } from "@/features/categories/types";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { X, Check, Pencil, Image as ImageIcon } from 'lucide-react';
import { cn } from "@/lib/utils";
import axios from "axios";

const inputClass = "w-full rounded-lg border border-border bg-[rgb(245,240,232)] dark:bg-[#2a2520] px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring";
const labelClass = "block text-[11px] font-semibold tracking-widest uppercase text-muted-foreground mb-1.5";

export default function Menu() {
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string | 'all'>('all');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editProduct, setEditProduct] = useState<Product | null>(null);
    const [form, setForm] = useState({ name: '', price: 0, categoryId: '', isActive: true, id: '' });
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
    const [productDeleteError, setProductDeleteError] = useState<string | null>(null);

    const [isAddingCategory, setIsAddingCategory] = useState(false);
    const [editCategory, setEditCategory] = useState<Category | null>(null);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [savingCategory, setSavingCategory] = useState(false);
    const [categoryDeleteTargetId, setCategoryDeleteTargetId] = useState<string | null>(null);
    const [categoryDeleteError, setCategoryDeleteError] = useState<string | null>(null);

    const [isEditingBannerTaxRate, setIsEditingBannerTaxRate] = useState(false);
    const [bannerTaxRateInput, setBannerTaxRateInput] = useState('');
    const [bannerUseGeneralTaxRate, setBannerUseGeneralTaxRate] = useState(false);
    const [bannerTaxRateSaving, setBannerTaxRateSaving] = useState(false);

    const filteredProducts = products.filter(p =>
        selectedCategory === 'all' || p.categoryId === selectedCategory
    );
    const activeCount = products.filter(p => p.isActive).length;
    const categoryCounts = categories.map(cat => ({
        category: cat,
        count: products.filter(p => p.categoryId === cat.id).length,
    }));

    useEffect(() => {
        productService.getProducts().then(setProducts).catch(console.error);
        categoryService.getCategories().then(setCategories).catch(console.error);
    }, []);

    useEffect(() => {
        setIsEditingBannerTaxRate(false);
    }, [selectedCategory]);

    const startBannerTaxRateEdit = (cat: Category) => {
        setBannerUseGeneralTaxRate(cat.taxRate === null);
        setBannerTaxRateInput(cat.taxRate !== null ? String(cat.taxRate) : '');
        setIsEditingBannerTaxRate(true);
    };

    const cancelBannerTaxRateEdit = () => {
        setIsEditingBannerTaxRate(false);
        setBannerTaxRateInput('');
    };

    const saveBannerTaxRate = async (cat: Category) => {
        let taxRateValue: number | null = null;
        if (!bannerUseGeneralTaxRate) {
            const parsed = Number(bannerTaxRateInput);
            if (bannerTaxRateInput.trim() === '' || Number.isNaN(parsed) || parsed < 0 || parsed > 100) {
                toast.error('KDV oranı 0 ile 100 arasında olmalıdır.');
                return;
            }
            taxRateValue = parsed;
        }
        setBannerTaxRateSaving(true);
        try {
            await categoryService.updateCategory({ ...cat, taxRate: taxRateValue });
            const updated = await categoryService.getCategories();
            setCategories(updated);
            setIsEditingBannerTaxRate(false);
        } catch (err: unknown) {
            if (axios.isAxiosError(err)) {
                toast.error(err.response?.data?.error ?? err.response?.data?.message ?? 'KDV oranı kaydedilemedi.');
            }
        } finally {
            setBannerTaxRateSaving(false);
        }
    };

    const openCreateModal = () => {
        setEditProduct(null);
        setForm({ name: '', price: 0, categoryId: '', isActive: true, id: '' });
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

    const closeProductDeleteDialog = () => {
        setDeleteTargetId(null);
        setProductDeleteError(null);
    };

    const handleDelete = async () => {
        if (deleteTargetId === null) return;
        try {
            await productService.deleteProduct(deleteTargetId);
            setProducts(prev => prev.filter(p => p.id !== deleteTargetId));
            setDeleteTargetId(null);
        } catch (err: unknown) {
            if (axios.isAxiosError(err)) {
                setProductDeleteError(err.response?.data?.error ?? err.response?.data?.message ?? 'Ürün silinemedi.');
            }
        }
    };

    const branchTaxRate = categories.find(c => c.taxRate === null)?.effectiveTaxRate ?? null;

    const startEditCategory = (category: Category) => {
        setIsAddingCategory(false);
        setEditCategory(category);
        setNewCategoryName(category.name);
    };

    const startAddCategory = () => {
        setEditCategory(null);
        setNewCategoryName('');
        setIsAddingCategory(true);
    };

    const cancelCategoryEdit = () => {
        setIsAddingCategory(false);
        setEditCategory(null);
        setNewCategoryName('');
    };

    const handleSaveCategory = async () => {
        if (!newCategoryName.trim()) {
            toast.error('Kategori adı boş olamaz.');
            return;
        }

        setSavingCategory(true);
        try {
            if (editCategory) {
                await categoryService.updateCategory({ ...editCategory, name: newCategoryName.trim() });
            } else {
                await categoryService.createCategory(newCategoryName.trim(), null);
            }
            const updated = await categoryService.getCategories();
            setCategories(updated);
            cancelCategoryEdit();
        } catch (err: unknown) {
            if (axios.isAxiosError(err)) {
                toast.error(err.response?.data?.error ?? err.response?.data?.message ?? 'Kategori kaydedilemedi.');
            }
        } finally {
            setSavingCategory(false);
        }
    };

    const closeCategoryDeleteDialog = () => {
        setCategoryDeleteTargetId(null);
        setCategoryDeleteError(null);
    };

    const handleDeleteCategory = async () => {
        if (categoryDeleteTargetId === null) return;
        try {
            await categoryService.deleteCategory(categoryDeleteTargetId);
            setCategories(prev => prev.filter(c => c.id !== categoryDeleteTargetId));
            if (selectedCategory === categoryDeleteTargetId) setSelectedCategory('all');
            setCategoryDeleteTargetId(null);
        } catch (err: unknown) {
            if (axios.isAxiosError(err)) {
                setCategoryDeleteError(err.response?.data?.error ?? err.response?.data?.message ?? 'Kategori silinemedi.');
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const errors: Record<string, string> = {};
        if (!form.name.trim()) errors.name = 'Ürün ismi boş bırakılamaz.';
        if (form.price <= 0) errors.price = "Fiyat 0'dan büyük olmalıdır.";
        if (!form.categoryId) errors.categoryId = 'Kategori seçiniz.';
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
                setFieldErrors({ name: err.response?.data?.error ?? err.response?.data?.message ?? 'Ürün kaydedilemedi.' });
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
                    className="flex items-center gap-1.5 bg-rb-accent hover:opacity-90 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                >
                    + Ürün Ekle
                </button>
            </div>

            {/* Applied Tax Rate Info */}
            {(() => {
                const activeCat = selectedCategory !== 'all' ? categories.find(c => c.id === selectedCategory) : null;
                const rate = activeCat ? activeCat.effectiveTaxRate : branchTaxRate;
                if (rate === null || rate === undefined) return null;
                const isInherited = activeCat ? activeCat.taxRate === null : true;
                return (
                    <div className="flex items-center gap-3 flex-wrap rounded-xl border border-border bg-card px-5 py-3.5">
                        <span className="text-sm text-foreground">
                            {activeCat ? `"${activeCat.name}" için KDV:` : 'Genel KDV Oranı:'}
                        </span>
                        {activeCat && isEditingBannerTaxRate ? (
                            <>
                                <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none whitespace-nowrap">
                                    <input
                                        type="checkbox"
                                        checked={bannerUseGeneralTaxRate}
                                        onChange={e => setBannerUseGeneralTaxRate(e.target.checked)}
                                        className="h-3.5 w-3.5 rounded border-border"
                                    />
                                    Genel KDV'i kullan
                                </label>
                                {!bannerUseGeneralTaxRate && (
                                    <input
                                        type="number"
                                        min={0}
                                        max={100}
                                        step="0.01"
                                        autoFocus
                                        value={bannerTaxRateInput}
                                        onChange={e => setBannerTaxRateInput(e.target.value)}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') saveBannerTaxRate(activeCat);
                                            if (e.key === 'Escape') cancelBannerTaxRateEdit();
                                        }}
                                        className="w-24 px-3 py-1.5 rounded-full text-sm border border-rb-accent bg-background text-foreground focus:outline-none"
                                    />
                                )}
                                <button
                                    onClick={() => saveBannerTaxRate(activeCat)}
                                    disabled={bannerTaxRateSaving}
                                    className="p-1.5 rounded-full bg-rb-green-bg text-rb-green hover:opacity-80 transition-colors disabled:opacity-50"
                                >
                                    <Check className="h-4 w-4" />
                                </button>
                                <button
                                    onClick={cancelBannerTaxRateEdit}
                                    className="p-1.5 rounded-full bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </>
                        ) : (
                            <>
                                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rb-green-bg text-rb-green">
                                    %{rate} — {isInherited ? 'Genel Orandan' : 'Kategoriye Özel'}
                                </span>
                                {activeCat && (
                                    <button
                                        onClick={() => startBannerTaxRateEdit(activeCat)}
                                        className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-foreground hover:bg-muted transition-colors"
                                    >
                                        {isInherited ? 'Bu Kategori İçin Özel KDV' : "KDV'yi Düzenle"}
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                );
            })()}

            {/* Category Pills */}
            <div className="flex gap-2 flex-wrap">
                <button
                    onClick={() => setSelectedCategory('all')}
                    className={cn(
                        "px-4 py-1.5 rounded-full text-sm font-medium transition-colors",
                        selectedCategory === 'all'
                            ? "bg-rb-accent text-white"
                            : "border border-border text-muted-foreground hover:text-foreground"
                    )}
                >
                    Tümü ({products.length})
                </button>
                {categoryCounts.map(({ category: cat, count }) => (
                    editCategory?.id === cat.id ? (
                        <div key={cat.id} className="flex items-center gap-1.5">
                            <input
                                autoFocus
                                value={newCategoryName}
                                onChange={e => setNewCategoryName(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter') handleSaveCategory();
                                    if (e.key === 'Escape') cancelCategoryEdit();
                                }}
                                className="px-4 py-1.5 rounded-full text-sm border border-rb-accent bg-background text-foreground focus:outline-none w-40"
                            />
                            <button
                                onClick={handleSaveCategory}
                                disabled={savingCategory}
                                className="p-1.5 rounded-full bg-rb-green-bg text-rb-green hover:opacity-80 transition-colors disabled:opacity-50"
                            >
                                <Check className="h-4 w-4" />
                            </button>
                            <button
                                onClick={cancelCategoryEdit}
                                className="p-1.5 rounded-full bg-muted text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    ) : (
                        <div
                            key={cat.id}
                            className={cn(
                                "flex items-center gap-1 pl-4 pr-1.5 py-1 rounded-full text-sm font-medium transition-colors",
                                selectedCategory === cat.id
                                    ? "bg-rb-accent text-white"
                                    : "border border-border text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <button onClick={() => setSelectedCategory(cat.id)} className="py-0.5">
                                {cat.name} ({count})
                            </button>
                            <button
                                onClick={() => startEditCategory(cat)}
                                className={cn(
                                    "p-1 rounded-full transition-colors",
                                    selectedCategory === cat.id ? "hover:bg-white/20" : "hover:bg-muted"
                                )}
                            >
                                <Pencil className="h-3 w-3" />
                            </button>
                            <button
                                onClick={() => setCategoryDeleteTargetId(cat.id)}
                                className={cn(
                                    "p-1 rounded-full transition-colors",
                                    selectedCategory === cat.id ? "hover:bg-white/20" : "hover:bg-muted"
                                )}
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </div>
                    )
                ))}
                {isAddingCategory ? (
                    <div className="flex items-center gap-1.5">
                        <input
                            autoFocus
                            value={newCategoryName}
                            onChange={e => setNewCategoryName(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter') handleSaveCategory();
                                if (e.key === 'Escape') cancelCategoryEdit();
                            }}
                            placeholder="Kategori adı..."
                            className="px-4 py-1.5 rounded-full text-sm border border-rb-accent bg-background text-foreground focus:outline-none w-40"
                        />
                        <button
                            onClick={handleSaveCategory}
                            disabled={savingCategory}
                            className="p-1.5 rounded-full bg-rb-green-bg text-rb-green hover:opacity-80 transition-colors disabled:opacity-50"
                        >
                            <Check className="h-4 w-4" />
                        </button>
                        <button
                            onClick={cancelCategoryEdit}
                            className="p-1.5 rounded-full bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={startAddCategory}
                        className="px-4 py-1.5 rounded-full text-sm font-medium border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors"
                    >
                        + Kategori Ekle
                    </button>
                )}
            </div>

            {/* Kartlar */}
            {filteredProducts.length === 0 ? (
                <div className="rounded-xl border border-border bg-card px-5 py-10 text-center text-sm text-muted-foreground">
                    Ürün bulunamadı.
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredProducts.map(product => (
                        <div key={product.id} className="rounded-xl border border-border bg-card p-4 space-y-3">
                            <div className="aspect-video rounded-lg bg-muted flex items-center justify-center">
                                <ImageIcon className="h-6 w-6 text-muted-foreground/40" />
                            </div>

                            <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                    <p className="font-semibold text-foreground text-sm">{product.name}</p>
                                    <p className="text-xs text-muted-foreground truncate">{product.categoryName}</p>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                    <span className={cn(
                                        "px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase",
                                        product.isActive ? "bg-rb-green-bg text-rb-green" : "bg-muted text-muted-foreground"
                                    )}>
                                        {product.isActive ? 'Aktif' : 'Pasif'}
                                    </span>
                                    <button
                                        onClick={() => openEditModal(product)}
                                        className="text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        <Pencil className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            </div>

                            <p className="text-lg font-bold text-foreground">₺{product.price.toFixed(0)}</p>

                            <div className="border-t border-border pt-3 flex items-center justify-between gap-2">
                                <button
                                    onClick={() => handleToggleActive(product)}
                                    className="flex items-center gap-2"
                                >
                                    <span className={cn(
                                        "relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 focus:outline-none shrink-0",
                                        product.isActive ? "bg-rb-green" : "bg-gray-300 dark:bg-gray-600"
                                    )}>
                                        <span className={cn(
                                            "inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform duration-200",
                                            product.isActive ? "translate-x-4" : "translate-x-0.5"
                                        )} />
                                    </span>
                                    <span className="text-xs text-muted-foreground">{product.isActive ? 'Satışta' : 'Satış dışı'}</span>
                                </button>
                                <button
                                    onClick={() => setDeleteTargetId(product.id)}
                                    className="text-xs px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:text-destructive hover:border-destructive/40 transition-colors shrink-0"
                                >
                                    Kaldır
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

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
                            <div>
                                <label className={labelClass}>Ürün Görseli</label>
                                <button
                                    type="button"
                                    disabled
                                    className="w-full aspect-video rounded-lg border border-dashed border-border bg-muted/50 flex flex-col items-center justify-center gap-1.5 text-muted-foreground cursor-not-allowed"
                                >
                                    <ImageIcon className="h-6 w-6" />
                                    <span className="text-xs">Yakında eklenecek</span>
                                </button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                                    onChange={e => setForm({ ...form, categoryId: e.target.value })}
                                >
                                    <option value="">Kategori seçin</option>
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
                                className="px-4 py-2 text-sm rounded-lg bg-rb-accent hover:opacity-90 text-white font-medium transition-colors"
                            >
                                Kaydet
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirm */}
            <AlertDialog open={deleteTargetId !== null} onOpenChange={open => !open && closeProductDeleteDialog()}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Ürünü sil</AlertDialogTitle>
                        <AlertDialogDescription>
                            {productDeleteError ?? "Bu ürünü silmek istediğinizden emin misiniz? Bu işlem geri alınamaz."}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>İptal</AlertDialogCancel>
                        {!productDeleteError && (
                            <Button variant="destructive" onClick={handleDelete}>Sil</Button>
                        )}
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Kategori Silme Onay */}
            <AlertDialog open={categoryDeleteTargetId !== null} onOpenChange={open => !open && closeCategoryDeleteDialog()}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Kategoriyi sil</AlertDialogTitle>
                        <AlertDialogDescription>
                            {categoryDeleteError ?? "Bu kategoriyi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz."}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>İptal</AlertDialogCancel>
                        {!categoryDeleteError && (
                            <Button variant="destructive" onClick={handleDeleteCategory}>Sil</Button>
                        )}
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
