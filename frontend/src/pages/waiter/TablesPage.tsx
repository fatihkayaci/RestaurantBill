import { useState, useEffect } from 'react';
import * as signalR from "@microsoft/signalr";
import TableCard from '@/features/tables/components/TableCard';
import { tableService } from '@/features/tables/api/tableService';
import type { Table } from '@/features/tables/types';
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

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
            <div className="min-h-screen bg-background p-6 md:p-8">
                <Skeleton className="h-10 w-64 mb-2" />
                <Skeleton className="h-5 w-96 mb-8" />
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5 md:gap-6">
                    {[...Array(12)].map((_, i) => (
                        <Skeleton key={i} className="h-32 rounded-2xl shadow-sm" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 border-b pb-5 gap-4">
                <div>
                    <h1 className="text-4xl font-extrabold tracking-tight">
                        Salon Görünümü
                    </h1>
                    <p className="text-muted-foreground font-medium mt-2">
                        Masaların anlık durumunu buradan takip edebilirsiniz.
                    </p>
                </div>
                <div className="flex flex-wrap gap-3 items-center">
                    <Badge variant="outline" className="gap-2 px-3 py-1.5 text-green-600 border-green-500/30 bg-green-500/10 hover:bg-green-500/20">
                        <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
                        Boş
                    </Badge>
                    <Badge variant="outline" className="gap-2 px-3 py-1.5 text-red-600 border-red-500/30 bg-red-500/10 hover:bg-red-500/20">
                        <span className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]"></span>
                        Dolu
                    </Badge>
                    <Badge variant="outline" className="gap-2 px-3 py-1.5 text-amber-600 border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20">
                        <span className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]"></span>
                        Rezerve
                    </Badge>
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
