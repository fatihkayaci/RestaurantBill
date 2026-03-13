import { Link } from 'react-router-dom';
import type { Table } from '../types'; // Kendi yoluna göre ayarla

interface TableCardProps {
    table: Table;
}

export default function TableCard({ table }: TableCardProps) {
    
    // Sadece arka planı değil, yazı rengini ve kenarlıkları da duruma göre ayarlayan gelişmiş fonksiyon
    const getStyles = (status: number) => {
        switch (status) {
            case 1: // BOŞ - Davetkâr, ferah, beyaz ağırlıklı ama yeşil detaylı
                return "bg-white border-green-400 text-green-600 hover:bg-green-50 shadow-sm hover:shadow-green-100/50";
            
            case 2: // DOLU - Dikkat çekici, solid kırmızı
                return "bg-red-500 border-red-600 text-white hover:bg-red-600 shadow-md shadow-red-200";
            
            case 3: // REZERVE - Beklemede olduğunu hissettiren turuncu/sarı tonları
                return "bg-amber-400 border-amber-500 text-amber-950 hover:bg-amber-500 shadow-md shadow-amber-200";
            
            default: // BİLİNMEYEN
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
            to={`/table/${table.id}`} // URL yapın pos/id ise burayı `/pos/${table.id}` olarak güncelleyebilirsin
            className={`
                relative flex flex-col items-center justify-center 
                h-32 sm:h-36 rounded-2xl border-2 
                transition-all duration-200 ease-out 
                hover:-translate-y-1 active:scale-95 
                ${getStyles(table.status)}
            `}
        >
            {/* Masa Adı / Numarası */}
            <span className="text-4xl font-extrabold tracking-tight mb-1">
                {table.name}
            </span>
            
            {/* Alt Bilgi (Müsait, Dolu, Rezerve) */}
            <span className="text-sm font-bold uppercase tracking-widest opacity-90">
                {getStatusText(table.status)}
            </span>

            {/* Dolu veya Rezerve ise sağ üstte yanan ufak bir bildirim ışığı (Animasyonlu) */}
            {(table.status === 2 || table.status === 3) && (
                <span className="absolute top-3 right-3 flex h-3 w-3">
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${table.status === 2 ? 'bg-white' : 'bg-amber-100'}`}></span>
                    <span className={`relative inline-flex rounded-full h-3 w-3 ${table.status === 2 ? 'bg-white' : 'bg-amber-100'}`}></span>
                </span>
            )}
        </Link>
    );
}