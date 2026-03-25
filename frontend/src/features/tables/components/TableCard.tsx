import { Link } from 'react-router-dom';
import type { Table } from '../types';

interface TableCardProps {
    table: Table;
}

export default function TableCard({ table }: TableCardProps) {
    
    const getStyles = (status: number) => {
        switch (status) {
            case 1:
                return "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700/80 hover:border-green-500/50 hover:text-green-400 hover:shadow-[0_0_20px_rgba(34,197,94,0.15)]";
            
            case 2:
                return "bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20 hover:border-red-500/60 hover:shadow-[0_0_20px_rgba(239,68,68,0.25)]";
            
            case 3:
                return "bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20 hover:border-amber-500/60 hover:shadow-[0_0_20px_rgba(245,158,11,0.25)]";
            
            default:
                return "bg-slate-800 border-slate-700 text-slate-500";
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
                h-32 sm:h-36 rounded-2xl border 
                transition-all duration-300 ease-out 
                hover:-translate-y-1 active:scale-95 
                ${getStyles(table.status)}
            `}
        >
            <span className="text-4xl font-black tracking-tight mb-1 drop-shadow-md">
                {table.name}
            </span>
            
            <span className="text-xs font-bold uppercase tracking-[0.2em] opacity-80">
                {getStatusText(table.status)}
            </span>

            {(table.status === 2 || table.status === 3) && (
                <span className="absolute top-4 right-4 flex h-3 w-3">
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${table.status === 2 ? 'bg-red-500' : 'bg-amber-500'}`}></span>
                    <span className={`relative inline-flex rounded-full h-3 w-3 shadow-[0_0_8px_currentColor] ${table.status === 2 ? 'bg-red-500' : 'bg-amber-500'}`}></span>
                </span>
            )}
        </Link>
    );
}