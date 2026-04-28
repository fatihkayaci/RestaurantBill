import type { Category } from '../types';
import { Button } from '@/components/ui/button';

interface CategoryCardProps {
    category: Category;
    isSelected: boolean;
    onClick: () => void;
}

export default function CategoryCard({ category, isSelected, onClick }: CategoryCardProps) {
    return (
        <Button
            variant={isSelected ? "default" : "secondary"}
            size="lg"
            onClick={onClick}
            className={`rounded-xl font-bold whitespace-nowrap transition-all shadow-md active:scale-95
                ${isSelected 
                    ? "bg-orange-500 hover:bg-orange-600 text-white shadow-[0_0_15px_rgba(249,115,22,0.5)] scale-105"
                    : "text-muted-foreground"
                }`}
        >
            {category.name}
        </Button>
    );
}