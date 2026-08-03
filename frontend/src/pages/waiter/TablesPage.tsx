import { useState, useEffect } from 'react';
import * as signalR from '@microsoft/signalr';
import { tableService } from '@/features/tables/api/tableService';
import type { Table } from '@/features/tables/types';
import TablePanel from './components/TablePanel';

type FilterType = 'all' | 'empty' | 'occupied' | 'reserved';

interface Counts {
    total: number;
    empty: number;
    occupied: number;
    reserved: number;
}

const FILTER_CONFIG = [
    { key: 'all'      as FilterType, label: (c: Counts) => `Tümü (${c.total})`,       activeClass: 'bg-rb-accent text-white' },
    { key: 'empty'    as FilterType, label: (c: Counts) => `Boş (${c.empty})`,         activeClass: 'bg-rb-green text-white' },
    { key: 'occupied' as FilterType, label: (c: Counts) => `Dolu (${c.occupied})`,     activeClass: 'bg-rb-orange text-white' },
    { key: 'reserved' as FilterType, label: (c: Counts) => `Rezerve (${c.reserved})`, activeClass: 'bg-rb-amber text-white' },
];

const STATUS_CARD = {
    1: {
        bg:     'bg-[#ECECE2] dark:bg-[rgba(69,200,122,0.05)]',
        border: 'border-[#b8e8cd] dark:border-rb-green/25',
        badge:  'bg-rb-green-bg text-rb-green',
        hint:   'text-rb-accent font-semibold',
        label:  'BOŞ',
    },
    2: {
        bg:     'bg-[#F3EAE0] dark:bg-[rgba(240,120,64,0.05)]',
        border: 'border-[#f5c5aa] dark:border-rb-orange/25',
        badge:  'bg-rb-orange-bg text-rb-orange',
        hint:   'text-muted-foreground',
        label:  'DOLU',
    },
    3: {
        bg:     'bg-[#F5EEDA] dark:bg-[rgba(232,184,53,0.05)]',
        border: 'border-[#f0d98a] dark:border-rb-amber/25',
        badge:  'bg-rb-amber-bg text-rb-amber',
        hint:   'text-rb-amber font-medium',
        label:  'REZERVE',
    },
} as const;

function formatElapsed(occupiedSince: string, now: number): string {
    const minutes = Math.max(0, Math.floor((now - new Date(occupiedSince).getTime()) / 60000));
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return hours > 0 ? `${hours}s ${remainingMinutes}dk` : `${remainingMinutes}dk`;
}

function TableCard({
    table,
    isSelected,
    now,
    onClick,
}: {
    table: Table;
    isSelected: boolean;
    now: number;
    onClick: () => void;
}) {
    const cfg = STATUS_CARD[table.status as 1 | 2 | 3] ?? STATUS_CARD[1];

    return (
        <button
            onClick={onClick}
            className={`text-left rounded-2xl border py-4 px-4 flex flex-col gap-1.5 cursor-pointer min-h-27
                transition-all duration-150 hover:-translate-y-0.75 hover:shadow-[0_10px_30px_rgba(0,0,0,0.1)]
                dark:hover:shadow-[0_10px_30px_rgba(0,0,0,0.35)] active:scale-[0.98]
                ${cfg.bg} ${cfg.border}
                ${isSelected ? 'ring-2 ring-rb-accent ring-offset-2 dark:ring-offset-background' : ''}
            `}
        >
            <div className="flex items-start justify-between gap-1">
                <span className="font-serif text-[21px] font-bold text-foreground leading-none">
                    {table.name}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-1.5 shrink-0 leading-tight tracking-[0.6px] uppercase ${cfg.badge}`}>
                    {cfg.label}
                </span>
            </div>

            <div className="flex-1 flex flex-col justify-end gap-1">
                {table.status === 1 && (
                    <span className={`text-[11px] tracking-[0.2px] mt-1 ${cfg.hint}`}>
                        ↑ Sipariş oluştur
                    </span>
                )}
                {table.status === 2 && (
                    <>
                        <div className="flex items-center justify-between mt-1">
                            <span className={`text-xs ${cfg.hint}`}>Aktif sipariş</span>
                            <span className="text-sm font-bold text-foreground">₺{table.activeOrderTotal.toFixed(0)}</span>
                        </div>
                        {table.occupiedSince && (
                            <div className="flex items-center justify-between text-[10px] text-muted-foreground/80">
                                <span>Açılış: {new Date(table.occupiedSince).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>
                                <span>{formatElapsed(table.occupiedSince, now)}</span>
                            </div>
                        )}
                        {table.createdByUserName && (
                            <div className="text-[10px] text-muted-foreground/80">
                                Alan: {table.createdByUserName}
                            </div>
                        )}
                    </>
                )}
                {table.status === 3 && (
                    <span className={`text-[11px] ${cfg.hint}`}>
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
    const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        tableService.getTables()
            .then(t => setTables(t))
            .catch(console.error)
            .finally(() => setLoading(false));

    }, []);

    useEffect(() => {
        const interval = setInterval(() => setNow(Date.now()), 30000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const conn = new signalR.HubConnectionBuilder()
            .withUrl(`${import.meta.env.VITE_API_URL ?? 'http://localhost:5077'}/table-hub`, {
                accessTokenFactory: () => localStorage.getItem('token') ?? '',
            })
            .withAutomaticReconnect()
            .configureLogging({
                log(level: signalR.LogLevel, msg: string) {
                    if (msg.includes('stopped during negotiation')) return;
                    if (level >= signalR.LogLevel.Error) console.error(msg);
                },
            })
            .build();

        conn.on('TableStatusChanged', (tableId: string, status: number) => {
            setTables(prev => prev.map(t => t.id === tableId
                ? { ...t, status, occupiedSince: status === 2 ? new Date().toISOString() : null }
                : t
            ));
        });

        conn.on('OrderUpdated', (tableId: string, totalPrice: number, createdByUserName: string) => {
            setTables(prev => prev.map(t => t.id === tableId ? { ...t, activeOrderTotal: totalPrice, createdByUserName } : t));
        });

        let cancelled = false;
        conn.start().catch(err => { if (!cancelled) console.error('SignalR:', err); });
        return () => { cancelled = true; conn.stop(); };
    }, []);

    const handleTableUpdated = (tableId: string, status: number) => {
        setTables(prev => prev.map(t => t.id === tableId
            ? { ...t, status, occupiedSince: status === 2 ? new Date().toISOString() : null }
            : t
        ));
    };

    const counts: Counts = {
        total:    tables.length,
        empty:    tables.filter(t => t.status === 1).length,
        occupied: tables.filter(t => t.status === 2).length,
        reserved: tables.filter(t => t.status === 3).length,
    };

    const filtered = tables.filter(t => {
        if (filter === 'empty')    return t.status === 1;
        if (filter === 'occupied') return t.status === 2;
        if (filter === 'reserved') return t.status === 3;
        return true;
    });

    const selectedTable = tables.find(t => t.id === selectedTableId) ?? null;

    if (loading) {
        return (
            <div className="p-6 grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-2.5">
                {[...Array(12)].map((_, i) => (
                    <div key={i} className="h-25 rounded-2xl bg-muted animate-pulse" />
                ))}
            </div>
        );
    }

    return (
        <div className="min-h-full">
            {/* Stats + Filter Bar */}
            <div className="sticky top-0 z-10 bg-[#F1ECE4]/95 dark:bg-background/95 backdrop-blur-sm border-b border-border px-6 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {/* Stats */}
                <div className="flex items-center gap-2 text-sm flex-wrap">
                    <div className="flex items-center gap-1.5">
                        <span className="font-serif text-xl font-bold leading-none text-foreground">{counts.total}</span>
                        <span className="text-xs text-muted-foreground">Toplam</span>
                    </div>
                    <div className="w-px h-4.5 bg-border mx-0.5" />
                    <div className="flex items-center gap-1.5">
                        <span className="font-serif text-xl font-bold leading-none text-rb-green">{counts.empty}</span>
                        <span className="text-xs text-muted-foreground">Boş</span>
                    </div>
                    <div className="w-px h-4.5 bg-border mx-0.5" />
                    <div className="flex items-center gap-1.5">
                        <span className="font-serif text-xl font-bold leading-none text-rb-orange">{counts.occupied}</span>
                        <span className="text-xs text-muted-foreground">Dolu</span>
                    </div>
                    <div className="w-px h-4.5 bg-border mx-0.5" />
                    <div className="flex items-center gap-1.5">
                        <span className="font-serif text-xl font-bold leading-none text-rb-amber">{counts.reserved}</span>
                        <span className="text-xs text-muted-foreground">Rezerve</span>
                    </div>
                </div>

                {/* Filtreler */}
                <div className="flex items-center gap-1.5 flex-wrap">
                    {FILTER_CONFIG.map(({ key, label, activeClass }) => (
                        <button
                            key={key}
                            onClick={() => setFilter(key)}
                            className={`px-3.25 py-1.25 rounded-full text-xs font-medium transition-all duration-150 ${
                                filter === key
                                    ? activeClass
                                    : 'text-rb-text-muted border border-border hover:border-[#c8b09a] dark:hover:border-[#5a4e40]'
                            }`}
                        >
                            {label(counts)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Masa Grid */}
            <div className="px-6 py-4.5">
                <div className="grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-2.5">
                    {filtered.map(table => (
                        <TableCard
                            key={table.id}
                            table={table}
                            isSelected={selectedTableId === table.id}
                            now={now}
                            onClick={() => setSelectedTableId(prev => prev === table.id ? null : table.id)}
                        />
                    ))}
                </div>
            </div>

            {/* Overlay + Panel */}
            {selectedTable && (
                <>
                    <div
                        className="fixed inset-0 z-20 bg-black/55 backdrop-blur-sm animate-in fade-in duration-200"
                        onClick={() => setSelectedTableId(null)}
                    />
                    <div className="fixed top-0 right-0 bottom-0 z-30 w-full sm:w-110 shadow-2xl animate-in slide-in-from-right duration-300">
                        <TablePanel
                            table={selectedTable}
                            onClose={() => setSelectedTableId(null)}
                            onTableUpdated={handleTableUpdated}
                        />
                    </div>
                </>
            )}
        </div>
    );
}
""