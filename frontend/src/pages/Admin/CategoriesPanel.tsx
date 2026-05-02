import { useEffect, useState } from "react";
import { categoryService } from "../../api/categoryService";
import type { Category } from "../../features/categories/types";

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Plus, Pencil, Trash2, Search, MoreHorizontal } from 'lucide-react'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export default function CategoriesPanel() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editCategory, setEditCategory] = useState<Category | null>(null);
    const [name, setName] = useState('');
    const [search, setSearch] = useState('');

    const filteredCategories = categories.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase())
    );

    useEffect(() => {
        categoryService.getCategories().then(setCategories).catch(console.error);
    }, []);

    const openCreateModal = () => {
        setEditCategory(null);
        setName('');
        setIsModalOpen(true);
    };

    const openEditModal = (category: Category) => {
        setEditCategory(category);
        setName(category.name);
        setIsModalOpen(true);
    };

    const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    const handleDelete = async () => {
        if (deleteTargetId === null) return;
        try {
            await categoryService.deleteCategory(deleteTargetId);
            setCategories(categories.filter(c => c.id !== deleteTargetId));
            setDeleteTargetId(null);
        } catch (err: unknown) {
            const axiosError = err as { response?: { data?: { message?: string } } };
            const message = axiosError.response?.data?.message ?? "Kategori silinemedi.";
            setDeleteError(message);
        }
    };

    const closeDeleteDialog = () => {
        setDeleteTargetId(null);
        setDeleteError(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name) return;

        if (editCategory) {
            await categoryService.updateCategory({ id: editCategory.id, name });
        } else {
            await categoryService.createCategory(name);
        }

        const updated = await categoryService.getCategories();
        setCategories(updated);
        setName('');
        setEditCategory(null);
        setIsModalOpen(false);
    };

    return (
        <>
            <div className="flex flex-col sm:flex-row justify-between gap-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search categories..."
                        className="pl-9"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <Button className="gap-2" onClick={openCreateModal}>
                    <Plus className="h-4 w-4" />
                    Add Category
                </Button>
            </div>

            {filteredCategories.length === 0 ? (
                <p className="text-center text-muted-foreground py-16">No categories found.</p>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredCategories.map(category => (
                        <Card key={category.id} className="flex flex-col">
                            <CardContent className="flex items-center justify-between p-4">
                                <p className="font-semibold">{category.name}</p>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon">
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem className="gap-2" onClick={() => openEditModal(category)}>
                                            <Pencil className="h-4 w-4" /> Edit
                                        </DropdownMenuItem>
                                        <DropdownMenuItem className="gap-2 text-destructive" onClick={() => setDeleteTargetId(category.id)}>
                                            <Trash2 className="h-4 w-4" /> Delete
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{editCategory ? 'Edit Category' : 'Add Category'}</DialogTitle>
                        <DialogDescription aria-describedby={undefined} />
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="name">Category Name</Label>
                            <Input
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Category name"
                            />
                        </div>
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

            <AlertDialog open={deleteTargetId !== null} onOpenChange={(open) => !open && closeDeleteDialog()}>
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
                            <Button variant="destructive" onClick={handleDelete}>
                                Sil
                            </Button>
                        )}
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
