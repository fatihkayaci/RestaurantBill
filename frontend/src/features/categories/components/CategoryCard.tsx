import type { Category } from '../types';

interface CategoryCardProps {
    category: Category;
    isSelected: boolean;
    onClick: () => void;
}

export default function CategoryCard({ category, isSelected, onClick }: CategoryCardProps) {
    return (
        <button
            onClick={onClick}
            className={`px-6 py-3 rounded-lg font-bold whitespace-nowrap transition-all shadow-md active:scale-95
                ${isSelected 
                    ? "bg-orange-500 text-white shadow-orange-300 scale-105"
                    : "bg-white text-gray-600 hover:bg-gray-50"
                }`}
        >
            {category.name}
        </button>
    );
}