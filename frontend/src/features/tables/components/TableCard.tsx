import { Link } from 'react-router-dom';
import type { Table } from '../types'; // Kendi yoluna göre ayarla

interface TableCardProps {
    table: Table;
}

export default function TableCard({ table }: TableCardProps) {
    
    const getStyles = (status: number) => {
        switch (status) {
            case 1:
                return "bg-white border-green-400 text-green-600 hover:bg-green-50 shadow-sm hover:shadow-green-100/50";
            
            case 2:
                return "bg-red-500 border-red-600 text-white hover:bg-red-600 shadow-md shadow-red-200";
            
            case 3:
                return "bg-amber-400 border-amber-500 text-amber-950 hover:bg-amber-500 shadow-md shadow-amber-200";
            
            default:
                return "bg-slate-200 border-slate-300 text-slate-500";
        }
    };

    const getStatusText = (status: number) => {
        if (status === 1) return "Müsait";
        if (status === 2) return "Dolu";
        if (status === 3) return "Rezerve";
        return "Bilinmiyor";
    };

    return (
        <Link 
            to={`/table/${table.id}`}
            className={`
                relative flex flex-col items-center justify-center 
                h-32 sm:h-36 rounded-2xl border-2 
                transition-all duration-200 ease-out 
                hover:-translate-y-1 active:scale-95 
                ${getStyles(table.status)}
            `}
        >
            <span className="text-4xl font-extrabold tracking-tight mb-1">
                {table.name}
            </span>
            
            <span className="text-sm font-bold uppercase tracking-widest opacity-90">
                {getStatusText(table.status)}
            </span>

            {(table.status === 2 || table.status === 3) && (
                <span className="absolute top-3 right-3 flex h-3 w-3">
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${table.status === 2 ? 'bg-white' : 'bg-amber-100'}`}></span>
                    <span className={`relative inline-flex rounded-full h-3 w-3 ${table.status === 2 ? 'bg-white' : 'bg-amber-100'}`}></span>
                </span>
            )}
        </Link>
    );
}