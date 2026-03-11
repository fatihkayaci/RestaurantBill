import type { Category } from '../types';

interface CategoryCardProps {
    category: Category;
}

export default function CategoryCard({ category }: CategoryCardProps) {
    return (
        <button
            // onClick={() => setSelectedCategoryId(category.id)}
            className={`px-6 py-3 rounded-lg font-bold whitespace-nowrap transition-colors `}
        >
            {category.name}
        </button>
    );
}

// ${
//                 // selectedCategoryId === category.id 
//                 ? 'bg-blue-600 text-white'
//                 : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
//             }