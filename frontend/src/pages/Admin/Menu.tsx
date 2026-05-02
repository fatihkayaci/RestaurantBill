import { useEffect, useState } from "react";
import { productService } from "../../api/productService";import { categoryService } from "../../api/categoryService";
import type { Product } from "../../features/products/types";
import type { Category } from "../../features/categories/types";

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Plus, Pencil, Trash2, Search, MoreHorizontal } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
export default function Menu() {
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editProduct, setEditProduct] = useState<Product | null>(null);
    const [form, setForm] = useState({ name: '', price: 0, categoryId: 0, isActive: true, id: 0});
    const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);

    const [selectedCategory, setSelectedCategory] = useState<string>('all')

    const [menuSearch, setMenuSearch] = useState('')
    const [formError, setFormError] = useState('')
    
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
        setFormError('');
        setIsModalOpen(true);
    };

    const openEditModal = (product: Product) => {
        setEditProduct(product);
        setForm({ name: product.name, price: product.price, categoryId: product.categoryId, isActive: product.isActive, id: product.id });
        setFormError('');
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
        if (!form.name || !form.categoryId) {
            setFormError(!form.name ? 'Product name is required.' : 'Please select a category.');
            return;
        }
        setFormError('');
        if (editProduct) {
            await productService.updateProduct(form);
        } else {
            await productService.createProduct(form);
        }

        const updated = await productService.getProducts();
        setProducts(updated);
        setIsModalOpen(false);
    };

    return (
        <>
            <div className="flex flex-col sm:flex-row justify-between gap-4">
                <div className="flex gap-2 flex-1">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search menu items..."
                            className="pl-9"
                            value={menuSearch}
                            onChange={(e) => setMenuSearch(e.target.value)}
                        />
                    </div>
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                        <SelectTrigger className="w-40">
                            <SelectValue placeholder="Category" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Categories</SelectItem>
                            {categories.map(cat => (
                                <SelectItem key={cat.id} value={String(cat.id)}>{cat.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <Button className="gap-2" onClick={openCreateModal}>
                    <Plus className="h-4 w-4" />
                    Add Item
                </Button>
            </div>

            {filteredMenuItems.length === 0 ? (
                <p className="text-center text-muted-foreground py-16">No menu items found.</p>
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
                                                <Pencil className="h-4 w-4" /> Edit
                                            </DropdownMenuItem>
                                            <DropdownMenuItem className="gap-2 text-destructive" onClick={() => setDeleteTargetId(item.id)}>
                                                <Trash2 className="h-4 w-4" /> Delete
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
                                            <span className="h-2 w-2 rounded-full bg-green-500" /> Active
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                                            <span className="h-2 w-2 rounded-full bg-gray-400" /> Inactive
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
                        <DialogTitle>{editProduct ? 'Edit Item' : 'Add Item'}</DialogTitle>
                        <DialogDescription aria-describedby={undefined} />
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="name">Product Name</Label>
                            <Input
                                id="name"
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                placeholder="Product name"
                            />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="price">Price</Label>
                            <Input
                                id="price"
                                type="number"
                                value={form.price}
                                onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                                placeholder="0"
                            />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="category">Category</Label>
                            <select
                                id="category"
                                value={form.categoryId}
                                onChange={(e) => setForm({ ...form, categoryId: Number(e.target.value) })}
                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                            >
                                <option value={0}>Select category</option>
                                {categories.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="status">Status</Label>
                            <select
                                id="status"
                                value={form.isActive ? 'true' : 'false'}
                                onChange={(e) => setForm({ ...form, isActive: e.target.value === 'true' })}
                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                            >
                                <option value="true">Active</option>
                                <option value="false">Inactive</option>
                            </select>
                        </div>
                        {formError && (
                            <p className="text-sm text-destructive">{formError}</p>
                        )}
                        <div className="flex gap-3 pt-2">
                            <Button type="button" variant="outline" className="flex-1" onClick={() => setIsModalOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" className="flex-1">
                                Save
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
