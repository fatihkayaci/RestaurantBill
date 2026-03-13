import { useState, useEffect } from 'react';
import TableCard from '../features/tables/components/TableCard';
import { tableService } from '../api/tableService';
import type { Table } from '../features/tables/types';

export default function TablesPage() {
    const [tables, setTables] = useState<Table[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        tableService.getTables()
            .then((data) => {
                setTables(data);
                setLoading(false);
            })
            .catch((error) => {
                console.error("Masalar çekilirken hata oluştu:", error);
                setLoading(false);
            });
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 p-6 md:p-8">
                <div className="h-10 w-48 bg-slate-200 rounded-lg animate-pulse mb-8"></div>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5 md:gap-6">
                    {[...Array(12)].map((_, i) => (
                        <div key={i} className="bg-slate-200 rounded-2xl h-32 animate-pulse shadow-sm"></div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 p-6 md:p-8">
            
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 border-b border-slate-200 pb-5 gap-4">
                <div>
                    <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">
                        Salon Görünümü
                    </h1>
                    <p className="text-slate-500 font-medium mt-1">
                        Masaların anlık durumunu buradan takip edebilirsiniz.
                    </p>
                </div>
                
                <div className="flex flex-wrap gap-3 text-sm font-semibold">
                    <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full shadow-sm border border-slate-100">
                        <span className="w-3 h-3 rounded-full bg-green-500 shadow-sm shadow-green-200"></span>
                        <span className="text-slate-600">Boş</span>
                    </div>
                    <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full shadow-sm border border-slate-100">
                        <span className="w-3 h-3 rounded-full bg-red-500 shadow-sm shadow-red-200"></span>
                        <span className="text-slate-600">Dolu</span>
                    </div>
                    <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full shadow-sm border border-slate-100">
                        <span className="w-3 h-3 rounded-full bg-amber-500 shadow-sm shadow-amber-200"></span>
                        <span className="text-slate-600">Rezerve</span>
                    </div>
                </div>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5 md:gap-6">
                {tables.map(table => (
                    <TableCard key={table.id} table={table} />
                ))}
            </div>
            
        </div>
    );
}