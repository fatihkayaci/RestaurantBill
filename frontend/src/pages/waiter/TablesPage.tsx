import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CalendarDays, LayoutGrid, QrCode, UserRound } from 'lucide-react';
import { tableService } from '@/features/tables/api/tableService';
import type { Table } from '@/features/tables/types';
import { customerRequestService } from '@/features/customerSite/api/customerRequestService';
import { RESERVATION_CONFIRMED, RESERVATION_PENDING, type OrderRequest, type StaffReservation } from '@/features/customerSite/types';
import { userService } from '@/features/users/api/userService';
import { ALL_WAITER_PERMISSIONS, waiterPermissionsOf, type User, type WaiterPermissions } from '@/features/users/types';
import { createHubConnection } from '@/lib/signalrConnection';
import { formatPrice } from '@/lib/format';
import { cn } from '@/lib/utils';
import CustomerOrderRequests from './components/CustomerOrderRequests';
import TableWorkspace, { type WorkspaceView } from './components/TableWorkspace';
import WaiterTableCard from './components/WaiterTableCard';
import WaiterReservations from './components/WaiterReservations';
import WaiterAccount from './components/WaiterAccount';
import { STATE_STYLE, tableState, useSplitLayout, type TableState } from './waiterUi';

type Tab = 'tables' | 'qr' | 'reservations' | 'account';
const TABS: Tab[] = ['tables', 'qr', 'reservations', 'account'];
type Filter = 'all' | TableState;

const FILTERS: { key: Filter; label: string }[] = [
    { key: 'all', label: 'Hepsi' },
    { key: 'free', label: 'Boş' },
    { key: 'occ', label: 'Dolu' },
    { key: 'bill', label: 'Hesap' },
    { key: 'res', label: 'Rezerve' },
];

function todayIso(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Garson ekranı: telefonda Masalar / QR talepleri / Rezervasyon / Hesabım sekmeleri ve tam ekran masa
// görünümü; 1024px ve üstünde solda masa ızgarası, sağda masa paneli.
export default function WaiterTablesPage() {
    const split = useSplitLayout();
    const [params, setParams] = useSearchParams();
    const tabParam = params.get('tab') as Tab | null;
    const tab: Tab = tabParam && TABS.includes(tabParam) ? tabParam : 'tables';
    const setTab = (next: Tab) => setParams(next === 'tables' ? {} : { tab: next }, { replace: true });

    const [tables, setTables] = useState<Table[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadFailed, setLoadFailed] = useState(false);
    const [user, setUser] = useState<User | null>(null);
    const [permissions, setPermissions] = useState<WaiterPermissions>(ALL_WAITER_PERMISSIONS);
    const [orderRequests, setOrderRequests] = useState<OrderRequest[]>([]);
    const [reservations, setReservations] = useState<StaffReservation[]>([]);
    const [reservationsLoading, setReservationsLoading] = useState(true);
    const [regionId, setRegionId] = useState<string>('all');
    const [filter, setFilter] = useState<Filter>('all');
    const [selected, setSelected] = useState<{ id: string; view: WorkspaceView } | null>(null);
    const [now, setNow] = useState(() => Date.now());

    const loadTables = useCallback(() => {
        tableService.getTables()
            .then(t => { setTables(t); setLoadFailed(false); })
            .catch(() => setLoadFailed(true))
            .finally(() => setLoading(false));
    }, []);

    const loadRequests = useCallback(() => {
        customerRequestService.getPendingOrderRequests().then(setOrderRequests).catch(console.error);
    }, []);

    const loadReservations = useCallback(() => {
        customerRequestService.getReservations()
            .then(setReservations)
            .catch(console.error)
            .finally(() => setReservationsLoading(false));
    }, []);

    useEffect(() => {
        loadTables();
        loadRequests();
        loadReservations();
        userService.getCurrentUser()
            .then(u => { setUser(u); setPermissions(waiterPermissionsOf(u)); })
            .catch(console.error);
    }, [loadTables, loadRequests, loadReservations]);

    // Süreler ve gecikme rozetleri için: saat her 30 sn, masalar her dakika tazelenir.
    useEffect(() => {
        const tick = setInterval(() => setNow(Date.now()), 30000);
        const refresh = setInterval(loadTables, 60000);
        return () => { clearInterval(tick); clearInterval(refresh); };
    }, [loadTables]);

    const reloadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const scheduleReload = useCallback(() => {
        if (reloadTimer.current) clearTimeout(reloadTimer.current);
        reloadTimer.current = setTimeout(loadTables, 400);
    }, [loadTables]);

    const patchTable = useCallback((tableId: string, patch: Partial<Table>) => {
        setTables(prev => prev.map(t => t.id === tableId ? { ...t, ...patch } : t));
    }, []);

    useEffect(() => {
        const { connection, stop } = createHubConnection('/table-hub');
        connection.on('TableStatusChanged', (tableId: string, status: number) => {
            patchTable(tableId, status === 2
                ? { status }
                : { status, billRequestedAt: null, activeOrderTotal: 0, occupiedSince: null, overdueItemCount: 0 });
            scheduleReload();
        });
        connection.on('OrderUpdated', (tableId: string, totalPrice: number, createdByUserName: string) => {
            patchTable(tableId, { activeOrderTotal: totalPrice, createdByUserName });
        });
        connection.on('OrderClosed', scheduleReload);
        connection.on('BillRequestChanged', (tableId: string, billRequestedAt: string | null) => {
            patchTable(tableId, { billRequestedAt });
        });
        connection.on('CustomerRequestsChanged', () => { loadRequests(); loadReservations(); });
        let cancelled = false;
        connection.start().catch(err => { if (!cancelled) console.error('SignalR:', err); });
        return () => {
            cancelled = true;
            stop();
            if (reloadTimer.current) clearTimeout(reloadTimer.current);
        };
    }, [patchTable, scheduleReload, loadRequests, loadReservations]);

    // ── Türetilmiş veriler ──
    const regions = useMemo(() => {
        const list: { id: string; name: string; count: number }[] = [];
        for (const t of tables) {
            const r = list.find(x => x.id === t.regionId);
            if (r) r.count++;
            else list.push({ id: t.regionId, name: t.regionName, count: 1 });
        }
        return list;
    }, [tables]);
    const activeRegion = regionId !== 'all' && regions.some(r => r.id === regionId) ? regionId : 'all';
    const inRegion = tables.filter(t => activeRegion === 'all' || t.regionId === activeRegion);
    const visible = inRegion.filter(t => filter === 'all' || tableState(t) === filter);

    const openTotal = tables.filter(t => t.status === 2).reduce((sum, t) => sum + t.activeOrderTotal, 0);
    const occupied = tables.filter(t => t.status === 2).length;
    const overdueCount = tables.reduce((sum, t) => sum + (t.overdueItemCount ?? 0), 0);

    const qrByTable = useMemo(() => {
        const map = new Map<string, number>();
        for (const r of orderRequests) map.set(r.tableId, (map.get(r.tableId) ?? 0) + 1);
        return map;
    }, [orderRequests]);

    const reservationLabel = useMemo(() => {
        const map = new Map<string, string>();
        const today = todayIso();
        for (const r of reservations) {
            if (r.status !== RESERVATION_CONFIRMED || r.date !== today || map.has(r.tableId)) continue;
            map.set(r.tableId, `${r.time} · ${r.guestName}${r.partySize ? `, ${r.partySize} kişi` : ''}`);
        }
        return map;
    }, [reservations]);

    const pendingReservations = reservations.filter(r => r.status === RESERVATION_PENDING).length;
    const selectedTable = selected ? tables.find(t => t.id === selected.id) ?? null : null;

    const openTable = (table: Table) => {
        // Boş masaya dokunmak (sipariş yetkisi varsa) doğrudan ürün eklemeyi açar; telefonda tam ekran,
        // tablette sağ panelde. Tablette seçili masaya tekrar dokunmak paneli kapatır.
        const view: WorkspaceView = table.status === 1 && permissions.canTakeOrders ? 'add' : 'detail';
        if (split) {
            setSelected(prev => (prev?.id === table.id ? null : { id: table.id, view }));
            return;
        }
        setSelected({ id: table.id, view });
    };

    const regionNames = (user?.regionIds ?? [])
        .map(id => regions.find(r => r.id === id)?.name)
        .filter((n): n is string => !!n);

    // ── Parçalar ──
    const regionTabs = regions.length > 1 && (
        <div role="tablist" aria-label="Bölge" className="flex gap-1 overflow-x-auto rounded-2xl bg-[#EBE3D5] p-1 dark:bg-muted" style={{ scrollbarWidth: 'none' }}>
            {[{ id: 'all', name: 'Tümü', count: tables.length }, ...regions].map(r => (
                <button
                    key={r.id}
                    type="button"
                    role="tab"
                    aria-selected={activeRegion === r.id}
                    onClick={() => setRegionId(r.id)}
                    className={cn(
                        'min-h-11 flex-1 shrink-0 rounded-xl px-4 text-[15px] font-semibold whitespace-nowrap',
                        activeRegion === r.id ? 'bg-card text-foreground shadow-[0_1px_3px_rgba(42,31,20,0.15)]' : 'text-rb-text-sub',
                    )}
                >
                    {r.name} <span className="font-medium opacity-70">{r.count}</span>
                </button>
            ))}
        </div>
    );

    const filterChips = (
        <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 lg:mx-0 lg:px-0" style={{ scrollbarWidth: 'none' }}>
            {FILTERS.map(f => {
                const count = f.key === 'all' ? inRegion.length : inRegion.filter(t => tableState(t) === f.key).length;
                const on = filter === f.key;
                return (
                    <button
                        key={f.key}
                        type="button"
                        aria-pressed={on}
                        onClick={() => setFilter(f.key)}
                        className={cn(
                            'inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-semibold',
                            on ? 'border-foreground bg-foreground text-background' : 'border-border bg-card text-foreground',
                        )}
                    >
                        {f.key !== 'all' && <span className={cn('size-2 rounded-full', STATE_STYLE[f.key].dot)} aria-hidden="true" />}
                        {f.label} {count}
                    </button>
                );
            })}
        </div>
    );

    const summaryTiles = (
        <div className="grid grid-cols-3 gap-2">
            <div className="flex flex-col rounded-[14px] bg-foreground px-3 py-2 text-background">
                <span className="text-lg font-bold tabular-nums">₺{formatPrice(openTotal)}</span>
                <span className="text-xs opacity-75">açık hesap</span>
            </div>
            <div className="flex flex-col rounded-[14px] border border-border bg-card px-3 py-2">
                <span className="text-lg font-bold tabular-nums text-foreground">{occupied}<span className="text-[13px] font-medium text-rb-text-sub"> / {tables.length}</span></span>
                <span className="text-xs text-rb-text-sub">dolu masa</span>
            </div>
            <div className={cn('flex flex-col rounded-[14px] border px-3 py-2', overdueCount > 0 ? 'border-rb-red/30 bg-rb-red-bg text-rb-red' : 'border-border bg-card text-rb-text-sub')}>
                <span className={cn('text-lg font-bold tabular-nums', overdueCount === 0 && 'text-foreground')}>{overdueCount}</span>
                <span className="text-xs">geciken ürün</span>
            </div>
        </div>
    );

    const emptyMessage = (
        <p className="py-12 text-center text-base text-rb-text-sub">
            {loadFailed && tables.length === 0
                ? 'Masalar yüklenemedi. Bağlantınızı kontrol edip sayfayı yenileyin.'
                : tables.length === 0 ? 'Size atanmış masa yok.' : 'Bu filtrede masa yok.'}
        </p>
    );

    const card = (t: Table) => (
        <WaiterTableCard
            key={t.id}
            table={t}
            now={now}
            large={split}
            selected={split && selected?.id === t.id}
            qrCount={qrByTable.get(t.id) ?? 0}
            reservationLabel={reservationLabel.get(t.id)}
            onClick={() => openTable(t)}
        />
    );

    const tablesBody = loading ? (
        <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-[repeat(auto-fill,minmax(190px,1fr))] lg:gap-3">
            {[...Array(8)].map((_, i) => <div key={i} className="h-32 animate-pulse rounded-[18px] bg-muted" />)}
        </div>
    ) : visible.length === 0 ? emptyMessage : split && activeRegion === 'all' && regions.length > 1 ? (
        <div className="flex flex-col gap-5">
            {regions.map(r => {
                const list = visible.filter(t => t.regionId === r.id);
                if (list.length === 0) return null;
                return (
                    <section key={r.id} className="flex flex-col gap-2.5">
                        <h2 className="font-serif text-[22px] font-bold text-foreground">{r.name}</h2>
                        <div className="grid grid-cols-[repeat(auto-fill,minmax(190px,1fr))] gap-3">{list.map(card)}</div>
                    </section>
                );
            })}
        </div>
    ) : (
        <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-[repeat(auto-fill,minmax(190px,1fr))] lg:gap-3">{visible.map(card)}</div>
    );

    const otherTab = (
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-4 pb-6 lg:px-8">
            {tab === 'qr' && (
                orderRequests.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 py-16 text-center">
                        <QrCode className="size-10 text-rb-text-muted" aria-hidden="true" />
                        <p className="font-serif text-[22px] font-bold text-foreground">Bekleyen QR sipariş yok</p>
                        <p className="text-sm text-rb-text-sub">Müşteri masadaki QR'dan sipariş verince burada onayınızı bekler.</p>
                    </div>
                ) : (
                    <CustomerOrderRequests
                        requests={orderRequests}
                        onChanged={() => { loadRequests(); loadTables(); }}
                        canDecide={permissions.canTransferAndReserve}
                    />
                )
            )}
            {tab === 'reservations' && (
                <WaiterReservations
                    reservations={reservations}
                    loading={reservationsLoading}
                    canDecide={permissions.canTransferAndReserve}
                    onChanged={() => { loadReservations(); loadTables(); }}
                />
            )}
            {tab === 'account' && <WaiterAccount user={user} permissions={permissions} regionNames={regionNames} />}
        </div>
    );

    const navItems: { key: Tab; label: string; icon: ReactNode; badge?: number }[] = [
        { key: 'tables', label: 'Masalar', icon: <LayoutGrid className="size-5.5" aria-hidden="true" /> },
        { key: 'qr', label: 'QR talepleri', icon: <QrCode className="size-5.5" aria-hidden="true" />, badge: orderRequests.length },
        { key: 'reservations', label: 'Rezervasyon', icon: <CalendarDays className="size-5.5" aria-hidden="true" />, badge: pendingReservations },
        { key: 'account', label: 'Hesabım', icon: <UserRound className="size-5.5" aria-hidden="true" /> },
    ];

    // ── Tablet ──
    if (split) {
        return (
            <div className="flex min-h-0 flex-1 flex-col">
                <div className="flex shrink-0 items-center gap-4 border-b border-border px-6 py-2.5">
                    <nav aria-label="Garson menüsü" className="flex gap-1">
                        {navItems.map(n => (
                            <button
                                key={n.key}
                                type="button"
                                aria-current={tab === n.key ? 'page' : undefined}
                                onClick={() => setTab(n.key)}
                                className={cn(
                                    'inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-[15px] font-semibold',
                                    tab === n.key ? 'bg-foreground text-background' : 'text-rb-text-sub hover:bg-muted',
                                )}
                            >
                                {n.label}
                                {!!n.badge && <span className="min-w-5 rounded-full bg-rb-red px-1.5 text-xs font-bold text-rb-red-foreground">{n.badge}</span>}
                            </button>
                        ))}
                    </nav>
                    <div className="ml-auto flex items-center gap-5 text-sm text-rb-text-sub">
                        <span><strong className="text-base text-foreground tabular-nums">₺{formatPrice(openTotal)}</strong> açık hesap</span>
                        <span><strong className="text-base text-foreground tabular-nums">{occupied}/{tables.length}</strong> dolu</span>
                        <span className={overdueCount > 0 ? 'text-rb-red' : ''}><strong className="text-base tabular-nums">{overdueCount}</strong> gecikme</span>
                    </div>
                </div>
                {tab === 'tables' ? (
                    <div className="flex min-h-0 flex-1">
                        <main className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-y-auto px-6 pt-4 pb-8">
                            <div className="flex flex-wrap items-center gap-3">
                                {regionTabs}
                                <div className="ml-auto">{filterChips}</div>
                            </div>
                            {tablesBody}
                        </main>
                        <aside aria-label="Masa paneli" className="flex w-[440px] shrink-0 flex-col border-l border-border xl:w-[480px]">
                            {selectedTable ? (
                                <TableWorkspace
                                    key={selectedTable.id}
                                    table={selectedTable}
                                    tables={tables}
                                    permissions={permissions}
                                    variant="panel"
                                    initialView={selected!.view}
                                    now={now}
                                    onClose={() => setSelected(null)}
                                    onTablePatch={patchTable}
                                    onRefreshTables={loadTables}
                                />
                            ) : (
                                <div className="flex flex-1 flex-col items-center justify-center gap-2 px-10 text-center">
                                    <LayoutGrid className="size-10 text-rb-text-muted" aria-hidden="true" />
                                    <p className="font-serif text-[22px] font-bold text-foreground">Masa seçin</p>
                                    <p className="text-sm text-rb-text-sub">Soldan bir masaya dokunun; sipariş, ödeme ve taşıma burada açılır.</p>
                                </div>
                            )}
                        </aside>
                    </div>
                ) : otherTab}
            </div>
        );
    }

    // ── Telefon ──
    return (
        <div className="flex min-h-0 flex-1 flex-col">
            {tab === 'tables' ? (
                <div className="flex min-h-0 flex-1 flex-col">
                    <header className="flex shrink-0 flex-col gap-2.5 px-4 pt-3 pb-2">
                        {summaryTiles}
                        {regionTabs}
                        {filterChips}
                    </header>
                    <main className="min-h-0 flex-1 overflow-y-auto px-4 pt-1 pb-4">{tablesBody}</main>
                </div>
            ) : otherTab}

            <nav aria-label="Garson menüsü" className="grid shrink-0 grid-cols-4 border-t border-border bg-card px-2 pt-1.5 pb-[max(10px,env(safe-area-inset-bottom))]">
                {navItems.map(n => {
                    const on = tab === n.key;
                    return (
                        <button
                            key={n.key}
                            type="button"
                            aria-current={on ? 'page' : undefined}
                            onClick={() => setTab(n.key)}
                            className={cn('flex min-h-13 flex-col items-center justify-center gap-0.5 text-xs', on ? 'font-bold text-foreground' : 'font-medium text-rb-text-sub')}
                        >
                            <span className={cn('relative flex rounded-full px-4.5 py-1', on && 'bg-rb-gold-bg')}>
                                {n.icon}
                                {!!n.badge && (
                                    <span className="absolute -top-0.5 right-1.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-rb-red px-1 text-[11px] font-bold text-rb-red-foreground">
                                        {n.badge}
                                    </span>
                                )}
                            </span>
                            {n.label}
                        </button>
                    );
                })}
            </nav>

            {selectedTable && (
                <div className="fixed inset-0 z-40 animate-in slide-in-from-right duration-200">
                    <TableWorkspace
                        key={selectedTable.id}
                        table={selectedTable}
                        tables={tables}
                        permissions={permissions}
                        variant="screen"
                        initialView={selected!.view}
                        now={now}
                        onClose={() => setSelected(null)}
                        onTablePatch={patchTable}
                        onRefreshTables={loadTables}
                    />
                </div>
            )}
        </div>
    );
}
