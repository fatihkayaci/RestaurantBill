import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as signalR from "@microsoft/signalr";
import TableCard from '../features/tables/components/TableCard';
import { tableService } from '../api/tableService';
import { authService } from '../api/authService';
import type { Table } from '../features/tables/types';

export default function TablesPage() {
    const navigate = useNavigate();
    const [tables, setTables] = useState<Table[]>([]);
    const [loading, setLoading] = useState(true);

    const handleLogout = () => {
        authService.logout();
        navigate('/login');
    };

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

    useEffect(() => {
        const connection = new signalR.HubConnectionBuilder()
            .withUrl(`${import.meta.env.VITE_API_URL ?? 'http://localhost:5077'}/table-hub`)
            .withAutomaticReconnect()
            .configureLogging({
                log(logLevel: signalR.LogLevel, message: string) {
                    if (message.includes("stopped during negotiation")) return;
                    if (logLevel >= signalR.LogLevel.Error) console.error(message);
                }
            })
            .build();

        connection.on("TableStatusChanged", (tableId: number, status: number) => {
            setTables((prev) =>
                prev.map((t) => t.id === tableId ? { ...t, status } : t)
            );
        });

        let isCancelled = false;

        connection.start()
            .catch((err) => { if (!isCancelled) console.error("SignalR Connection Error:", err); });

        return () => {
            isCancelled = true;
            connection.stop();
        };
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-900 p-6 md:p-8">
                <div className="h-10 w-48 bg-slate-800 rounded-lg animate-pulse mb-8"></div>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5 md:gap-6">
                    {[...Array(12)].map((_, i) => (
                        <div key={i} className="bg-slate-800 rounded-2xl h-32 animate-pulse shadow-md border border-slate-700/50"></div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900 p-6 md:p-8">
            
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 border-b border-slate-800 pb-5 gap-4">
                <div>
                    <h1 className="text-4xl font-extrabold text-white tracking-tight drop-shadow-sm">
                        Salon Görünümü
                    </h1>
                    <p className="text-slate-400 font-medium mt-2">
                        Masaların anlık durumunu buradan takip edebilirsiniz.
                    </p>
                </div>
                
                <div className="flex flex-wrap gap-3 text-sm font-semibold items-center">
                    <div className="flex items-center gap-2 bg-slate-800 px-4 py-2 rounded-full shadow-lg border border-slate-700 text-slate-200">
                        <span className="w-3 h-3 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
                        <span>Boş</span>
                    </div>
                    <div className="flex items-center gap-2 bg-slate-800 px-4 py-2 rounded-full shadow-lg border border-slate-700 text-slate-200">
                        <span className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]"></span>
                        <span>Dolu</span>
                    </div>
                    <div className="flex items-center gap-2 bg-slate-800 px-4 py-2 rounded-full shadow-lg border border-slate-700 text-slate-200">
                        <span className="w-3 h-3 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]"></span>
                        <span>Rezerve</span>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 px-4 py-2 rounded-full transition-colors font-semibold"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                        Çıkış
                    </button>
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