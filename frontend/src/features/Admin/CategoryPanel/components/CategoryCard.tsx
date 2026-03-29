import type { Category } from '../../../categories/types';

interface CategoryCardProps {
    category: Category;
    onDelete: (id: number) => void;
    onUpdate: (category: Category) => void;
}

export default function CategoryCard({ category, onDelete, onUpdate }: CategoryCardProps) {
    return (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 flex flex-col gap-3">
            <p className="text-white font-medium">{category.name}</p>
            <div className="flex gap-2">
                <button
                    onClick={() => onUpdate(category)}
                    className="flex-1 text-indigo-400 hover:text-indigo-300 text-xs border border-indigo-400/30 rounded-lg py-1"
                >
                    Düzenle
                </button>
                <button
                    onClick={() => onDelete(category.id)}
                    className="flex-1 text-red-400 hover:text-red-300 text-xs border border-red-400/30 rounded-lg py-1"
                >
                    Sil
                </button>
            </div>
        </div>
    );
}
