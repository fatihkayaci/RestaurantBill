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
            className={`px-6 py-3 rounded-xl font-bold whitespace-nowrap transition-all shadow-md active:scale-95
                ${isSelected 
                    ? "bg-orange-500 text-white shadow-[0_0_15px_rgba(249,115,22,0.5)] scale-105"
                    : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                }`}
        >
            {category.name}
        </button>
    );
}