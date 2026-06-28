import { useEffect, useState } from "react";
import { productService } from "@/features/products/api/productService";import { categoryService } from "@/features/categories/api/categoryService";
import type { Product } from "@/features/products/types";
import type { Category } from "@/features/categories/types";

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Plus, Pencil, Trash2, Search, MoreHorizontal } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import axios from "axios";
export default function Menu() {
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editProduct, setEditProduct] = useState<Product | null>(null);
    const [form, setForm] = useState({ name: '', price: 0, categoryId: 0, isActive: true, id: 0});
    const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);

    const [selectedCategory, setSelectedCategory] = useState<string>('all')

    const [menuSearch, setMenuSearch] = useState('')
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
    
    const filteredMenuItems = products.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(menuSearch.toLowerCase())
        const matchesCategory = selectedCategory === 'all' || item.categoryId === Number(selectedCategory)
        return matchesSearch && matchesCategory
    })

    useEffect(() => {
        productService.getProducts().then(setProducts).catch(console.error);
        categoryService.getCategories().then(setCategories).catch(console.error);
    }, []);

    const openCreateModal = () => {
        setEditProduct(null);
        setForm({ name: '', price: 0, categoryId: 0, isActive: true, id: 0});
        setFieldErrors({});
        setIsModalOpen(true);
    };

    const openEditModal = (product: Product) => {
        setEditProduct(product);
        setForm({ name: product.name, price: product.price, categoryId: product.categoryId, isActive: product.isActive, id: product.id });
        setFieldErrors({});
        setIsModalOpen(true);
    };

    const handleDelete = async () => {
        if (deleteTargetId === null) return;
        await productService.deleteProduct(deleteTargetId);
        setProducts(products.filter(p => p.id !== deleteTargetId));
        setDeleteTargetId(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
    
        const errors: Record<string, string> = {};
        if (!form.name.trim()) errors.name = 'Ürün ismi boş bırakılamaz.';
        if (form.price <= 0) errors.price = "Fiyat 0'dan büyük olmalıdır.";
        if (form.categoryId <= 0) errors.categoryId = 'Geçersiz bir kategori seçtiniz.';
        
        if (Object.keys(errors).length > 0) {
            setFieldErrors(errors);
            return;
        }
        
        setFieldErrors({});
        try {
            if (editProduct) {
                await productService.updateProduct(form);
            } else {
                await productService.createProduct(form);
            }
            const updated = await productService.getProducts();
            setProducts(updated);
            setIsModalOpen(false);
        } catch (err: unknown) {
            if (axios.isAxiosError(err)) {
                const errors = err.response?.data?.errors as Record<string, string[]> | undefined;
                if (errors) {
                    const mapped: Record<string, string> = {};
                    for (const key in errors) {
                        mapped[key.charAt(0).toLowerCase() + key.slice(1)] = errors[key][0];
                    }
                    setFieldErrors(mapped);
                }
            }
        }
    };

    return (
        <>
            <div className="flex flex-col sm:flex-row justify-between gap-4">
                <div className="flex gap-2 flex-1">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Menüde ara..."
                            className="pl-9"
                            value={menuSearch}
                            onChange={(e) => setMenuSearch(e.target.value)}
                        />
                    </div>
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                        <SelectTrigger className="w-40">
                            <SelectValue placeholder="Kategori" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Tüm Kategoriler</SelectItem>
                            {categories.map(cat => (
                                <SelectItem key={cat.id} value={String(cat.id)}>{cat.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <Button className="gap-2" onClick={openCreateModal}>
                    <Plus className="h-4 w-4" />
                    Ürün Ekle
                </Button>
            </div>

            {filteredMenuItems.length === 0 ? (
                <p className="text-center text-muted-foreground py-16">Ürün bulunamadı.</p>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredMenuItems.map(item => (
                        <Card key={item.id} className="flex flex-col">
                            <CardContent className="flex flex-col flex-1 p-4 gap-3">
                                <div className="flex items-start justify-between gap-2">
                                    <p className="font-semibold leading-tight">{item.name}</p>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="shrink-0 -mt-1 -mr-2">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem className="gap-2" onClick={() => openEditModal(item)}>
                                                <Pencil className="h-4 w-4" /> Düzenle
                                            </DropdownMenuItem>
                                            <DropdownMenuItem className="gap-2 text-destructive" onClick={() => setDeleteTargetId(item.id)}>
                                                <Trash2 className="h-4 w-4" /> Sil
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                                <div className="flex items-center justify-between mt-auto">
                                    <span className="text-sm text-muted-foreground">{item.categoryName}</span>
                                    <span className="font-bold">₺{item.price.toFixed(2)}</span>
                                </div>
                                <div>
                                    {item.isActive ? (
                                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-600">
                                            <span className="h-2 w-2 rounded-full bg-green-500" /> Aktif
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                                            <span className="h-2 w-2 rounded-full bg-gray-400" /> Pasif
                                        </span>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{editProduct ? 'Ürünü Düzenle' : 'Ürün Ekle'}</DialogTitle>
                        <DialogDescription aria-describedby={undefined} />
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="name">Ürün Adı</Label>
                            <Input
                                id="name"
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                placeholder="Ürün adı"
                            />
                            {fieldErrors.name && <p className="text-sm text-destructive">{fieldErrors.name}</p>}
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="price">Fiyat</Label>
                            <Input
                                id="price"
                                type="number"
                                value={form.price}
                                onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                                placeholder="0"
                            />
                            {fieldErrors.price && <p className="text-sm text-destructive">{fieldErrors.price}</p>}
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="category">Kategori</Label>
                            <select
                                id="category"
                                value={form.categoryId}
                                onChange={(e) => setForm({ ...form, categoryId: Number(e.target.value) })}
                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                            >
                                <option value={0}>Kategori seçin</option>
                                {categories.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                            {fieldErrors.categoryId && <p className="text-sm text-destructive">{fieldErrors.categoryId}</p>}
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="status">Durum</Label>
                            <select
                                id="status"
                                value={form.isActive ? 'true' : 'false'}
                                onChange={(e) => setForm({ ...form, isActive: e.target.value === 'true' })}
                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                            >
                                <option value="true">Aktif</option>
                                <option value="false">Pasif</option>
                            </select>
                        </div>
                        <div className="flex gap-3 pt-2">
                            <Button type="button" variant="outline" className="flex-1" onClick={() => setIsModalOpen(false)}>
                                İptal
                            </Button>
                            <Button type="submit" className="flex-1">
                                Kaydet
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            <AlertDialog open={deleteTargetId !== null} onOpenChange={(open) => !open && setDeleteTargetId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Ürünü sil</AlertDialogTitle>
                        <AlertDialogDescription>Bu ürünü silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>İptal</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Sil
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}

