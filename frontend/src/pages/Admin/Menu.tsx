import { useEffect, useState } from "react";
import { productService } from "../../api/productService";import { categoryService } from "../../api/categoryService";
import type { Product } from "../../features/products/types";
import type { Category } from "../../features/categories/types";

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { 
  Plus,
  Pencil,
  Trash2,
  Search,
  MoreHorizontal
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export default function Menu() {
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editProduct, setEditProduct] = useState<Product | null>(null);
    const [form, setForm] = useState({ name: '', price: 0, categoryId: 0, isActive: true, id: 0, categoryName: '' });

    const [menuSearch, setMenuSearch] = useState('')
    
    const filteredMenuItems = products.filter(item => {
        // const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory
        const matchesSearch = item.name.toLowerCase().includes(menuSearch.toLowerCase())
        return matchesSearch
    })

    useEffect(() => {
        productService.getProducts().then(setProducts).catch(console.error);
        categoryService.getCategories().then(setCategories).catch(console.error);
    }, []);

    const openCreateModal = () => {
        setEditProduct(null);
        setForm({ name: '', price: 0, categoryId: 0, isActive: true, id: 0, categoryName: '' });
        setIsModalOpen(true);
    };

    const openEditModal = (product: Product) => {
        setEditProduct(product);
        setForm({ name: product.name, price: product.price, categoryId: product.categoryId, isActive: product.isActive, id: product.id, categoryName: product.categoryName });
        setIsModalOpen(true);
    };

    const handleDelete = async (id: number) => {
        await productService.deleteProduct(id);
        setProducts(products.filter(p => p.id !== id));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name || !form.categoryId) return;

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
                        {/* TODO: will add select for category */}
                        {/* <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                            <SelectTrigger className="w-40">
                            <SelectValue placeholder="Category" />
                            </SelectTrigger>
                            <SelectContent>
                            <SelectItem value="all">All Categories</SelectItem>
                            {menuCategories.map(cat => (
                                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                            ))}
                            </SelectContent>
                        </Select> */}
                    </div>
                    <Button className="gap-2">
                        <Plus className="h-4 w-4" />
                        Add Item
                    </Button>
                </div>
            </div>
            <Card>
                <CardContent className="p-0">
                <div className="overflow-x-auto">
                    <table className="w-full">
                    <thead>
                        <tr className="border-b bg-muted/50">
                        <th className="text-left p-4 font-medium">Item</th>
                        <th className="text-left p-4 font-medium">Category</th>
                        <th className="text-left p-4 font-medium">Price</th>
                        <th className="text-left p-4 font-medium">Status</th>
                        <th className="text-right p-4 font-medium">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredMenuItems.map(item => (
                        <tr key={item.id} className="border-b last:border-0 hover:bg-muted/50">
                            <td className="p-4">
                            <div>
                                <p className="font-medium">{item.name}</p>
                                <p className="text-sm text-muted-foreground line-clamp-1">{item.description}</p>
                            </div>
                            </td>
                            <td className="p-4">
                                a
                            {/*<Badge variant="outline">
                                {menuCategories.find(c => c.id === item.category)?.name}
                            </Badge>*/}
                            </td> 
                            <td className="p-4 font-medium">${item.price.toFixed(2)}</td>
                            <td className="p-4">b
                            {/*<Badge variant={item.available ? 'default' : 'secondary'}>
                                {item.available ? 'Available' : 'Unavailable'}
                            </Badge>*/}
                            </td> 
                            <td className="p-4 text-right">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                <DropdownMenuItem className="gap-2">
                                    <Pencil className="h-4 w-4" /> Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem className="gap-2 text-destructive">
                                    <Trash2 className="h-4 w-4" /> Delete
                                </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                            </td>
                        </tr>
                        ))}
                    </tbody>
                    </table>
                </div>
                </CardContent>
            </Card>
        </>
        /*
        <div>
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">Ürünler</h2>
                <button onClick={openCreateModal} className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-lg">
                    + Yeni Ürün
                </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {products.map(product => (
                    <ProductCard key={product.id} product={product} onDelete={handleDelete} onUpdate={openEditModal} />
                ))}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
                    <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 w-96">
                        <h2 className="text-white text-lg font-bold mb-6">
                            {editProduct ? 'Ürünü Düzenle' : 'Yeni Ürün Ekle'}
                        </h2>
                        <form onSubmit={handleSubmit}>
                            <div className="mb-4">
                                <label className="block text-gray-400 text-sm mb-2">Ürün Adı</label>
                                <input
                                    type="text"
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white text-sm"
                                    placeholder="Ürün adı"
                                />
                            </div>
                            <div className="mb-4">
                                <label className="block text-gray-400 text-sm mb-2">Fiyat</label>
                                <input
                                    type="number"
                                    value={form.price}
                                    onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white text-sm"
                                    placeholder="0"
                                />
                            </div>
                            <div className="mb-6">
                                <label className="block text-gray-400 text-sm mb-2">Kategori</label>
                                <select
                                    value={form.categoryId}
                                    onChange={(e) => setForm({ ...form, categoryId: Number(e.target.value) })}
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white text-sm"
                                >
                                    <option value={0}>Kategori seç</option>
                                    {categories.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg text-sm"
                                >
                                    İptal
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg text-sm"
                                >
                                    Kaydet
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>*/
    );
}
