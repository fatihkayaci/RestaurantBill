import { useEffect, useState } from "react";
import { categoryService } from "../../api/categoryService";
import type { Category } from "../../features/categories/types";
import CategoryCard from "../../features/Admin/CategoryPanel/components/CategoryCard";

export default function CategoriesPanel() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editCategory, setEditCategory] = useState<Category | null>(null);
    const [name, setName] = useState('');

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

    const handleDelete = async (id: number) => {
        await categoryService.deleteCategory(id);
        setCategories(categories.filter(c => c.id !== id));
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
        <div>
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">Kategoriler</h2>
                <button onClick={openCreateModal} className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-lg">
                    + Yeni Kategori
                </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {categories.map(category => (
                    <CategoryCard key={category.id} category={category} onDelete={handleDelete} onUpdate={openEditModal} />
                ))}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
                    <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 w-96">
                        <h2 className="text-white text-lg font-bold mb-6">
                            {editCategory ? 'Kategoriyi Düzenle' : 'Yeni Kategori Ekle'}
                        </h2>
                        <form onSubmit={handleSubmit}>
                            <div className="mb-6">
                                <label className="block text-gray-400 text-sm mb-2">Kategori Adı</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white text-sm"
                                    placeholder="Kategori adı"
                                />
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
        </div>
    );
}
