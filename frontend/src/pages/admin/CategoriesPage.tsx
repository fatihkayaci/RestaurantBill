import { useEffect, useState } from "react";
import { categoryService } from "@/features/categories/api/categoryService";
import type { Category } from "@/features/categories/types";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { X, Pencil } from 'lucide-react';
import { cn } from "@/lib/utils";
import axios from "axios";

const inputClass = "w-full rounded-lg border border-border bg-[rgb(245,240,232)] dark:bg-[#2a2520] px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring";
const labelClass = "block text-[11px] font-semibold tracking-widest uppercase text-muted-foreground mb-1.5";

export default function CategoriesPanel() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editCategory, setEditCategory] = useState<Category | null>(null);
    const [name, setName] = useState('');
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    useEffect(() => {
        categoryService.getCategories().then(setCategories).catch(console.error);
    }, []);

    const openCreateModal = () => {
        setEditCategory(null);
        setName('');
        setFieldErrors({});
        setIsModalOpen(true);
    };

    const openEditModal = (category: Category) => {
        setEditCategory(category);
        setName(category.name);
        setFieldErrors({});
        setIsModalOpen(true);
    };

    const handleDelete = async () => {
        if (deleteTargetId === null) return;
        try {
            await categoryService.deleteCategory(deleteTargetId);
            setCategories(prev => prev.filter(c => c.id !== deleteTargetId));
            setDeleteTargetId(null);
        } catch (err: unknown) {
            if (axios.isAxiosError(err)) {
                setDeleteError(err.response?.data?.error ?? err.response?.data?.message ?? "Kategori silinemedi.");
            }
        }
    };

    const closeDeleteDialog = () => {
        setDeleteTargetId(null);
        setDeleteError(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const errors: Record<string, string> = {};
        if (!name.trim()) errors.name = 'Kategori adı boş olamaz.';
        else if (name.length > 50) errors.name = 'En fazla 50 karakter.';
        if (Object.keys(errors).length > 0) { setFieldErrors(errors); return; }
        setFieldErrors({});
        try {
            if (editCategory) {
                await categoryService.updateCategory({ id: editCategory.id, name });
            } else {
                await categoryService.createCategory(name);
            }
            const updated = await categoryService.getCategories();
            setCategories(updated);
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
                    <h1 className="text-2xl font-serif font-bold text-foreground">Kategoriler</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">{categories.length} kategori</p>
                </div>
                <button
                    onClick={openCreateModal}
                    className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                >
                    + Kategori Ekle
                </button>
            </div>

            {/* Table */}
            <div className="rounded-xl border border-border bg-card overflow-hidden">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-border">
                            <th className="text-left text-[11px] font-semibold tracking-widest uppercase text-muted-foreground px-5 py-3">Kategori</th>
                            <th className="text-left text-[11px] font-semibold tracking-widest uppercase text-muted-foreground px-5 py-3">İşlem</th>
                        </tr>
                    </thead>
                    <tbody>
                        {categories.map(category => (
                            <tr key={category.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                                <td className="px-5 py-3.5 font-medium text-foreground">
                                    {category.name}
                                </td>
                                <td className="px-5 py-3.5">
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => openEditModal(category)}
                                            className="text-muted-foreground hover:text-foreground transition-colors"
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={() => setDeleteTargetId(category.id)}
                                            className="text-muted-foreground hover:text-destructive transition-colors"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {categories.length === 0 && (
                            <tr>
                                <td colSpan={2} className="px-5 py-10 text-center text-sm text-muted-foreground">
                                    Kategori bulunamadı.
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
                    <div className="relative bg-white dark:bg-[#26221e] rounded-2xl shadow-xl w-full max-w-sm mx-4 overflow-hidden">
                        <div className="px-6 pt-6 pb-4 border-b border-border flex items-center justify-between">
                            <h2 className="text-xl font-bold text-foreground">
                                {editCategory ? 'Kategoriyi Düzenle' : 'Kategori Ekle'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="px-6 py-5">
                            <label className={labelClass}>Kategori Adı</label>
                            <input
                                className={cn(inputClass, fieldErrors.name && "border-destructive")}
                                placeholder="Ana Yemekler"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                autoFocus
                            />
                            {fieldErrors.name && <p className="text-xs text-destructive mt-1">{fieldErrors.name}</p>}
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
            <AlertDialog open={deleteTargetId !== null} onOpenChange={open => !open && closeDeleteDialog()}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Kategoriyi sil</AlertDialogTitle>
                        <AlertDialogDescription>
                            {deleteError ?? "Bu kategoriyi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz."}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>İptal</AlertDialogCancel>
                        {!deleteError && (
                            <Button variant="destructive" onClick={handleDelete}>Sil</Button>
                        )}
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
