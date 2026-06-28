import { useState, useEffect } from 'react';
import * as signalR from '@microsoft/signalr';
import { tableService } from '@/features/tables/api/tableService';
import type { Table } from '@/features/tables/types';
import TablePanel from './components/TablePanel';

type FilterType = 'all' | 'empty' | 'occupied' | 'reserved';

const FILTER_CONFIG = [
    { key: 'all' as FilterType, label: (counts: Counts) => `Tümü (${counts.total})` },
    { key: 'empty' as FilterType, label: (counts: Counts) => `Boş (${counts.empty})` },
    { key: 'occupied' as FilterType, label: (counts: Counts) => `Dolu (${counts.occupied})` },
    { key: 'reserved' as FilterType, label: (counts: Counts) => `Rezerve (${counts.reserved})` },
];

interface Counts {
    total: number;
    empty: number;
    occupied: number;
    reserved: number;
}

const STATUS_CARD = {
    1: {
        bg: 'bg-[#f0faf4] dark:bg-green-950/20',
        border: 'border-green-200 dark:border-green-800/60',
        badge: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400',
        label: 'BOŞ',
    },
    2: {
        bg: 'bg-[#fff5f5] dark:bg-red-950/20',
        border: 'border-red-200 dark:border-red-800/60',
        badge: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400',
        label: 'DOLU',
    },
    3: {
        bg: 'bg-[#fffbf0] dark:bg-amber-950/20',
        border: 'border-amber-200 dark:border-amber-800/60',
        badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400',
        label: 'REZERVE',
    },
} as const;

function TableCard({
    table,
    isSelected,
    onClick,
}: {
    table: Table;
    isSelected: boolean;
    onClick: () => void;
}) {
    const cfg = STATUS_CARD[table.status as 1 | 2 | 3] ?? STATUS_CARD[1];

    return (
        <button
            onClick={onClick}
            className={`text-left rounded-2xl border p-4 h-52 flex flex-col cursor-pointer transition-all duration-150
                hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98]
                ${cfg.bg} ${cfg.border}
                ${isSelected ? 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-background' : ''}
            `}
        >
            <div className="flex items-start justify-between gap-1 mb-2">
                <span className="text-xl font-serif font-bold text-foreground leading-tight">
                    {table.name}
                </span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md shrink-0 leading-tight ${cfg.badge}`}>
                    {cfg.label}
                </span>
            </div>

            <div className="flex-1 flex flex-col justify-end gap-1">
                {table.status === 1 && (
                    <span className="text-xs text-blue-500 font-medium">
                        ↑ Sipariş oluştur
                    </span>
                )}
                {table.status === 2 && (
                    <span className="text-xs text-muted-foreground">Aktif sipariş</span>
                )}
                {table.status === 3 && (
                    <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                        Rezervasyon mevcut
                    </span>
                )}
            </div>
        </button>
    );
}

export default function WaiterTablesPage() {
    const [tables, setTables] = useState<Table[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<FilterType>('all');
    const [selectedTableId, setSelectedTableId] = useState<number | null>(null);

    useEffect(() => {
        tableService.getTables()
            .then(t => setTables(t))
            .catch(console.error)
            .finally(() => setLoading(false));

    }, []);

    useEffect(() => {
        const conn = new signalR.HubConnectionBuilder()
            .withUrl(`${import.meta.env.VITE_API_URL ?? 'http://localhost:5077'}/table-hub`)
            .withAutomaticReconnect()
            .configureLogging({
                log(level: signalR.LogLevel, msg: string) {
                    if (msg.includes('stopped during negotiation')) return;
                    if (level >= signalR.LogLevel.Error) console.error(msg);
                },
            })
            .build();

        conn.on('TableStatusChanged', (tableId: number, status: number) => {
            setTables(prev => prev.map(t => t.id === tableId ? { ...t, status } : t));
        });

        let cancelled = false;
        conn.start().catch(err => { if (!cancelled) console.error('SignalR:', err); });
        return () => { cancelled = true; conn.stop(); };
    }, []);

    const handleTableUpdated = (tableId: number, status: number) => {
        setTables(prev => prev.map(t => t.id === tableId ? { ...t, status } : t));
    };

    const counts: Counts = {
        total: tables.length,
        empty: tables.filter(t => t.status === 1).length,
        occupied: tables.filter(t => t.status === 2).length,
        reserved: tables.filter(t => t.status === 3).length,
    };

    const filtered = tables.filter(t => {
        if (filter === 'empty') return t.status === 1;
        if (filter === 'occupied') return t.status === 2;
        if (filter === 'reserved') return t.status === 3;
        return true;
    });

    const selectedTable = tables.find(t => t.id === selectedTableId) ?? null;

    if (loading) {
        return (
            <div className="p-8 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {[...Array(12)].map((_, i) => (
                    <div key={i} className="h-52 rounded-2xl bg-muted animate-pulse" />
                ))}
            </div>
        );
    }

    return (
        <>
            {/* Stats + Filter Bar */}
            <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b px-6 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {/* Stats */}
                <div className="flex items-center gap-3 text-sm flex-wrap">
                    <span className="font-semibold text-foreground">{counts.total} Toplam</span>
                    <span className="text-border">·</span>
                    <span className="text-green-600 dark:text-green-400 font-medium">{counts.empty} Boş</span>
                    <span className="text-border">·</span>
                    <span className="text-red-500 font-medium">{counts.occupied} Dolu</span>
                    <span className="text-border">·</span>
                    <span className="text-amber-500 font-medium">{counts.reserved} Rezerve</span>
                </div>

                {/* Filtreler */}
                <div className="flex items-center gap-1.5 flex-wrap">
                    {FILTER_CONFIG.map(({ key, label }) => (
                        <button
                            key={key}
                            onClick={() => setFilter(key)}
                            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                                filter === key
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-muted text-muted-foreground hover:bg-muted/70'
                            }`}
                        >
                            {label(counts)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Masa Grid */}
            <div className="p-6">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-4">
                    {filtered.map(table => (
                        <TableCard
                            key={table.id}
                            table={table}
                            isSelected={selectedTableId === table.id}
                            onClick={() => setSelectedTableId(prev => prev === table.id ? null : table.id)}
                        />
                    ))}
                </div>
            </div>

            {/* Overlay + Panel */}
            {selectedTable && (
                <>
                    <div
                        className="fixed inset-0 z-20 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
                        onClick={() => setSelectedTableId(null)}
                    />
                    <div className="fixed top-0 right-0 bottom-0 z-30 w-full sm:w-96 shadow-2xl animate-in slide-in-from-right duration-300">
                        <TablePanel
                            table={selectedTable}
                            onClose={() => setSelectedTableId(null)}
                            onTableUpdated={handleTableUpdated}
                        />
                    </div>
                </>
            )}
        </>
    );
}
