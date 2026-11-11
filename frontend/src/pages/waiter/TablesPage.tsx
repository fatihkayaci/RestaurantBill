import { useState, useEffect, useCallback } from 'react';
import { tableService } from '@/features/tables/api/tableService';
import type { Table } from '@/features/tables/types';
import TablePanel from './components/TablePanel';
import CustomerOrderRequests from './components/CustomerOrderRequests';
import { customerRequestService } from '@/features/customerSite/api/customerRequestService';
import type { OrderRequest } from '@/features/customerSite/types';
import { createHubConnection } from '@/lib/signalrConnection';
import { formatPrice, formatMinutes } from '@/lib/format';
import { Clock, Plus, User } from 'lucide-react';

type FilterType = 'all' | 'empty' | 'occupied' | 'reserved';

interface Counts {
    total: number;
    empty: number;
    occupied: number;
    reserved: number;
}

const FILTER_CONFIG = [
    { key: 'all'      as FilterType, label: 'Tümü',    count: (c: Counts) => c.total,    dot: 'bg-foreground' },
    { key: 'empty'    as FilterType, label: 'Boş',     count: (c: Counts) => c.empty,    dot: 'bg-rb-green' },
    { key: 'occupied' as FilterType, label: 'Dolu',    count: (c: Counts) => c.occupied, dot: 'bg-rb-orange' },
    { key: 'reserved' as FilterType, label: 'Rezerve', count: (c: Counts) => c.reserved, dot: 'bg-rb-amber' },
];

const STATUS_CARD = {
    1: {
        bg:     'bg-white dark:bg-[rgba(69,200,122,0.05)]',
        border: 'border-[#BFDCC9] dark:border-rb-green/25',
        badge:  'bg-[#E3F1E8] text-[#1F6E44] dark:bg-rb-green-bg dark:text-rb-green',
        label:  'Boş',
    },
    2: {
        bg:     'bg-[#FBEEE4] dark:bg-[rgba(240,120,64,0.05)]',
        border: 'border-[#EDC3A6] dark:border-rb-orange/25',
        badge:  'bg-[#F6DCCB] text-[#A3420D] dark:bg-rb-orange-bg dark:text-rb-orange',
        label:  'Dolu',
    },
    3: {
        bg:     'bg-[#FAF2DC] dark:bg-[rgba(232,184,53,0.05)]',
        border: 'border-[#E6D08E] dark:border-rb-amber/25',
        badge:  'bg-[#F2E4B8] text-[#7A5A08] dark:bg-rb-amber-bg dark:text-rb-amber',
        label:  'Rezerve',
    },
} as const;

// Bu süreyi geçen dolu masanın süresi vurgulanır.
const LONG_STAY_MINUTES = 60;

function elapsedMinutes(occupiedSince: string, now: number): number {
    return Math.max(0, Math.floor((now - new Date(occupiedSince).getTime()) / 60000));
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
    const minutes = table.occupiedSince ? elapsedMinutes(table.occupiedSince, now) : null;

    return (
        <button
            onClick={onClick}
            aria-label={`${table.name}, ${cfg.label}`}
            className={`text-left rounded-[18px] sm:rounded-[20px] border-[1.5px] p-3.5 sm:px-5.5 sm:py-5 flex flex-col gap-2 sm:gap-3 cursor-pointer min-h-39 sm:min-h-46
                transition-all duration-150 hover:-translate-y-0.75 hover:shadow-[0_10px_30px_rgba(0,0,0,0.1)]
                dark:hover:shadow-[0_10px_30px_rgba(0,0,0,0.35)] active:scale-[0.98]
                ${cfg.bg} ${isSelected ? 'border-foreground ring-[3px] ring-rb-gold' : cfg.border}
            `}
        >
            <div className="flex flex-col-reverse items-start gap-2 sm:flex-row sm:justify-between sm:gap-2.5 w-full">
                <span className="font-serif text-[32px] sm:text-[38px] font-bold text-foreground leading-none">
                    {table.name}
                </span>
                <span className={`inline-flex items-center gap-1.5 text-[11px] sm:text-[13px] font-bold px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-full shrink-0 leading-none tracking-[0.6px] uppercase ${cfg.badge}`}>
                    <span className="size-1.75 sm:size-2 rounded-full bg-current" />
                    {cfg.label}
                </span>
            </div>

            <div className="mt-auto w-full">
                {table.status === 1 && (
                    <span className="flex items-center gap-1.5 sm:gap-2 text-[15px] sm:text-base font-semibold text-[#1F6E44] dark:text-rb-green">
                        <Plus className="size-4.5 sm:size-5" strokeWidth={2.2} />
                        Sipariş aç
                    </span>
                )}
                {table.status === 2 && (
                    <div className="flex flex-col gap-1.5 sm:gap-2.5">
                        <span className="text-[22px] sm:text-[30px] font-bold text-foreground leading-none tracking-[-0.5px]">
                            ₺{formatPrice(table.activeOrderTotal)}
                        </span>
                        <div className="flex items-center justify-between gap-2 text-[13px] sm:text-[15px] text-rb-text-sub">
                            {minutes !== null && (
                                <span className={`flex items-center gap-1.5 ${minutes >= LONG_STAY_MINUTES ? 'font-bold text-[#A3420D] dark:text-rb-orange' : ''}`}>
                                    <Clock className="size-3.5 sm:size-4" />
                                    {formatMinutes(minutes)}
                                </span>
                            )}
                            {table.createdByUserName && (
                                <span className="hidden sm:flex items-center gap-1.5 min-w-0">
                                    <User className="size-4 shrink-0" />
                                    <span className="truncate">{table.createdByUserName}</span>
                                </span>
                            )}
                        </div>
                    </div>
                )}
                {table.status === 3 && (
                    <span className="text-sm sm:text-base font-semibold text-[#7A5A08] dark:text-rb-amber">
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
    const [loadFailed, setLoadFailed] = useState(false);
    const [filter, setFilter] = useState<FilterType>('all');
    const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
    const [now, setNow] = useState(() => Date.now());
    // Müşterilerin masa QR'ından gönderdiği, onay bekleyen siparişler.
    const [orderRequests, setOrderRequests] = useState<OrderRequest[]>([]);

    const loadOrderRequests = useCallback(() => {
        customerRequestService.getPendingOrderRequests()
            .then(setOrderRequests)
            .catch(console.error);
    }, []);

    useEffect(() => {
        tableService.getTables()
            .then(t => { setTables(t); setLoadFailed(false); })
            .catch(() => setLoadFailed(true))
            .finally(() => setLoading(false));
        loadOrderRequests();
    }, [loadOrderRequests]);

    useEffect(() => {
        const interval = setInterval(() => setNow(Date.now()), 30000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const { connection: conn, stop } = createHubConnection('/table-hub');

        conn.on('TableStatusChanged', (tableId: string, status: number) => {
            setTables(prev => prev.map(t => t.id === tableId
                ? { ...t, status, occupiedSince: status === 2 ? new Date().toISOString() : null }
                : t
            ));
        });

        conn.on('OrderUpdated', (tableId: string, totalPrice: number, createdByUserName: string) => {
            setTables(prev => prev.map(t => t.id === tableId ? { ...t, activeOrderTotal: totalPrice, createdByUserName } : t));
        });

        conn.on('CustomerRequestsChanged', loadOrderRequests);

        let cancelled = false;
        conn.start().catch(err => { if (!cancelled) console.error('SignalR:', err); });
        return () => { cancelled = true; stop(); };
    }, [loadOrderRequests]);

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

    // Bölge sırası, masaların API'den geliş sırasını izler.
    const regions: { id: string; name: string; total: number; occupied: number; tables: Table[] }[] = [];
    for (const table of tables) {
        let region = regions.find(r => r.id === table.regionId);
        if (!region) {
            region = { id: table.regionId, name: table.regionName, total: 0, occupied: 0, tables: [] };
            regions.push(region);
        }
        region.total++;
        if (table.status === 2) region.occupied++;
        if (filtered.includes(table)) region.tables.push(table);
    }
    const visibleRegions = regions.filter(r => r.tables.length > 0);

    const selectedTable = tables.find(t => t.id === selectedTableId) ?? null;

    if (loading) {
        return (
            <div className="px-4 sm:px-8 py-6 grid grid-cols-2 sm:grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-2.5 sm:gap-4">
                {[...Array(12)].map((_, i) => (
                    <div key={i} className="h-39 sm:h-46 rounded-[20px] bg-muted animate-pulse" />
                ))}
            </div>
        );
    }

    return (
        <div className="min-h-full">
            {/* Filtreler (sayılar da burada) */}
            <div className="sticky top-0 z-10 bg-[#F1ECE4]/95 dark:bg-background/95 backdrop-blur-sm border-b border-border px-4 sm:px-8 py-3 sm:py-3.5 grid grid-cols-4 sm:flex sm:flex-wrap sm:items-center gap-1.5 sm:gap-2.5">
                {FILTER_CONFIG.map(({ key, label, count, dot }) => (
                    <button
                        key={key}
                        onClick={() => setFilter(key)}
                        aria-pressed={filter === key}
                        className={`min-h-14 sm:min-h-12 px-1 sm:px-5 rounded-[14px] sm:rounded-full border-[1.5px] font-semibold
                            flex flex-col-reverse sm:flex-row items-center justify-center gap-0.5 sm:gap-2.5 transition-colors duration-150 ${
                            filter === key
                                ? 'bg-foreground text-background border-foreground'
                                : 'bg-white dark:bg-rb-surface2 text-foreground border-[#E0D6C4] dark:border-border hover:border-[#c8b09a] dark:hover:border-[#5a4e40]'
                        }`}
                    >
                        <span className={`hidden sm:block size-2.5 rounded-full ${dot}`} />
                        <span className="text-xs sm:text-base">{label}</span>
                        <span className="font-serif text-[22px] font-bold leading-none">{count(counts)}</span>
                    </button>
                ))}
            </div>

            {/* Bölgelere göre masalar */}
            <div className="px-4 sm:px-8 pt-4.5 sm:pt-6 pb-8 sm:pb-12 flex flex-col gap-6 sm:gap-8">
                <CustomerOrderRequests requests={orderRequests} onChanged={loadOrderRequests} />
                {visibleRegions.map(region => (
                    <section key={region.id} className="flex flex-col gap-2.5 sm:gap-3.5">
                        <div className="flex items-baseline gap-2.5 sm:gap-3">
                            <h2 className="font-serif text-[26px] sm:text-[30px] font-bold leading-tight text-foreground">{region.name}</h2>
                            <span className="text-[13px] sm:text-sm text-rb-text-sub">
                                {region.total} masa · {region.occupied} dolu
                            </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-2.5 sm:gap-4">
                            {region.tables.map(table => (
                                <TableCard
                                    key={table.id}
                                    table={table}
                                    isSelected={selectedTableId === table.id}
                                    now={now}
                                    onClick={() => setSelectedTableId(prev => prev === table.id ? null : table.id)}
                                />
                            ))}
                        </div>
                    </section>
                ))}
                {visibleRegions.length === 0 && (
                    <p className="my-10 text-center text-base text-rb-text-sub">
                        {loadFailed && tables.length === 0
                            ? 'Masalar yüklenemedi. Bağlantınızı kontrol edip sayfayı yenileyin.'
                            : tables.length === 0 ? 'Henüz masa eklenmemiş.' : 'Bu filtrede masa yok.'}
                    </p>
                )}
            </div>

            {/* Overlay + Panel */}
            {selectedTable && (
                <>
                    <div
                        className="fixed inset-0 z-20 bg-black/55 backdrop-blur-sm animate-in fade-in duration-200"
                        onClick={() => setSelectedTableId(null)}
                    />
                    <div className="fixed top-0 right-0 bottom-0 z-30 w-full md:w-190 shadow-2xl animate-in slide-in-from-right duration-300">
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
