import { Link } from 'react-router-dom';
import type { Table } from '../types';

interface TableCardProps {
    table: Table;
}

export default function TableCard({ table }: TableCardProps) {
    return (
        <Link 
            to={`/table/${table.id}`}
            // Temel beyaz tasarım ve border-2 ekledik
            className={`p-6 rounded-lg shadow flex items-center justify-center text-2xl font-bold transition-all hover:scale-105 border-2 ${
                table.isOccupied 
                    ? 'bg-white border-red-500 text-red-600 hover:bg-red-50 shadow-sm' 
                    : 'bg-white border-green-500 text-green-600 hover:bg-green-50 shadow-sm'
            }`}
        >
            {table.name}
        </Link>
    );
}