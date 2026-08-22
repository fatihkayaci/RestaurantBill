import { useEffect, useState } from 'react';
import { Search, SlidersHorizontal, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from 'lucide-react';
import { auditLogService } from '@/features/auditLogs/api/auditLogService';
import type { AuditLog } from '@/features/auditLogs/types';
import { branchService } from '@/features/branches/api/branchService';
import type { Branch } from '@/features/branches/types';
import { CATEGORY_LABELS, CATEGORY_STYLE, SEVERITY_LABELS, SEVERITY_STYLE } from '@/features/auditLogs/constants';
import { cn } from '@/lib/utils';

const getToday = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

export default function AuditLogPage() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [categoryFilter, setCategoryFilter] = useState<number | 'all'>('all');
    const [severityFilter, setSeverityFilter] = useState<number | 'all'>('all');
    const [branchFilter, setBranchFilter] = useState<string | 'all'>('all');
    const [userFilter, setUserFilter] = useState<string | 'all'>('all');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [draftCategoryFilter, setDraftCategoryFilter] = useState<number | 'all'>('all');
    const [draftSeverityFilter, setDraftSeverityFilter] = useState<number | 'all'>('all');
    const [draftBranchFilter, setDraftBranchFilter] = useState<string | 'all'>('all');
    const [draftUserFilter, setDraftUserFilter] = useState<string | 'all'>('all');
    const [draftDateFrom, setDraftDateFrom] = useState('');
    const [draftDateTo, setDraftDateTo] = useState('');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalCount, setTotalCount] = useState(0);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [actors, setActors] = useState<string[]>([]);

    useEffect(() => {
        const handle = setTimeout(() => setDebouncedSearch(search), 400);
        return () => clearTimeout(handle);
    }, [search]);

    useEffect(() => {
        branchService.getMyBranches().then(setBranches).catch(console.error);
        auditLogService.getActors().then(setActors).catch(console.error);
    }, []);

    useEffect(() => {
        setLoading(true);
        auditLogService.getAll({
            pageNumber: page,
            pageSize,
            search: debouncedSearch || undefined,
            category: categoryFilter === 'all' ? undefined : categoryFilter,
            severity: severityFilter === 'all' ? undefined : severityFilter,
            branchId: branchFilter === 'all' ? undefined : branchFilter,
            actorName: userFilter === 'all' ? undefined : userFilter,
            dateFrom: dateFrom || undefined,
            dateTo: dateTo || undefined,
        })
            .then(result => {
                setLogs(result.items);
                setTotalCount(result.totalCount);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [page, pageSize, debouncedSearch, categoryFilter, severityFilter, branchFilter, userFilter, dateFrom, dateTo]);

    const activeFilterCount = [
        categoryFilter !== 'all',
        severityFilter !== 'all',
        branchFilter !== 'all',
        userFilter !== 'all',
        dateFrom !== '',
        dateTo !== '',
    ].filter(Boolean).length;

    const applyFilters = () => {
        setCategoryFilter(draftCategoryFilter);
        setSeverityFilter(draftSeverityFilter);
        setBranchFilter(draftBranchFilter);
        setUserFilter(draftUserFilter);
        setDateFrom(draftDateFrom);
        setDateTo(draftDateTo);
        setPage(1);
    };

    const clearFilters = () => {
        setCategoryFilter('all');
        setSeverityFilter('all');
        setBranchFilter('all');
        setUserFilter('all');
        setDateFrom('');
        setDateTo('');
        setDraftCategoryFilter('all');
        setDraftSeverityFilter('all');
        setDraftBranchFilter('all');
        setDraftUserFilter('all');
        setDraftDateFrom('');
        setDraftDateTo('');
        setPage(1);
    };

    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
    const currentPage = page;

    return (
        <div className="space-y-5">
            <div>
                <h1 className="text-2xl font-serif font-bold text-foreground">Denetim Kaydı</h1>
                <p className="text-sm text-muted-foreground mt-0.5">{totalCount} kayıt</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
                <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                        className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-border bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                        placeholder="Kullanıcı veya mesaj ara..."
                        value={search}
                        onChange={e => {
                            setSearch(e.target.value);
                            setPage(1);
                        }}
                    />
                </div>

                <button
                    type="button"
                    onClick={() => {
                        if (!filtersOpen) {
                            setDraftCategoryFilter(categoryFilter);
                            setDraftSeverityFilter(severityFilter);
                            setDraftBranchFilter(branchFilter);
                            setDraftUserFilter(userFilter);
                            setDraftDateFrom(dateFrom);
                            setDraftDateTo(dateTo);
                        }
                        setFiltersOpen(open => !open);
                    }}
                    className={cn(
                        'flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
                        filtersOpen || activeFilterCount > 0
                            ? 'border-rb-accent bg-rb-accent-bg text-rb-accent'
                            : 'border-border bg-background text-foreground hover:bg-muted/50'
                    )}
                >
                    <SlidersHorizontal className="h-4 w-4" />
                    Filtrele
                    {activeFilterCount > 0 && (
                        <span className="flex items-center justify-center h-4 w-4 rounded-full bg-rb-accent text-white text-[10px] font-semibold">
                            {activeFilterCount}
                        </span>
                    )}
                </button>

                {activeFilterCount > 0 && (
                    <button
                        type="button"
                        onClick={clearFilters}
                        className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
                    >
                        Filtreleri temizle
                    </button>
                )}
            </div>

            {filtersOpen && (
                <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4">
                    <div className="flex flex-col gap-1">
                        <label className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground">Başlangıç</label>
                        <input
                            type="date"
                            max={getToday()}
                            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                            value={draftDateFrom}
                            onChange={e => setDraftDateFrom(e.target.value)}
                        />
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground">Bitiş</label>
                        <input
                            type="date"
                            max={getToday()}
                            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                            value={draftDateTo}
                            onChange={e => setDraftDateTo(e.target.value)}
                        />
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground">Şube</label>
                        <select
                            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                            value={draftBranchFilter}
                            onChange={e => setDraftBranchFilter(e.target.value)}
                        >
                            <option value="all">Tüm Şubeler</option>
                            {branches.map(branch => (
                                <option key={branch.id} value={branch.id}>{branch.branchName}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground">Kategori</label>
                        <select
                            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                            value={draftCategoryFilter}
                            onChange={e => setDraftCategoryFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                        >
                            <option value="all">Tüm Kategoriler</option>
                            {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                                <option key={value} value={value}>{label}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground">Önem</label>
                        <select
                            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                            value={draftSeverityFilter}
                            onChange={e => setDraftSeverityFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                        >
                            <option value="all">Tüm Önem Dereceleri</option>
                            {Object.entries(SEVERITY_LABELS).map(([value, label]) => (
                                <option key={value} value={value}>{label}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground">Kullanıcı</label>
                        <select
                            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                            value={draftUserFilter}
                            onChange={e => setDraftUserFilter(e.target.value)}
                        >
                            <option value="all">Tüm Kullanıcılar</option>
                            {actors.map(name => (
                                <option key={name} value={name}>{name}</option>
                            ))}
                        </select>
                    </div>

                    <button
                        type="button"
                        onClick={applyFilters}
                        className="rounded-lg bg-rb-accent px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
                    >
                        Filtrele
                    </button>
                </div>
            )}

            <div className="rounded-xl border border-border bg-card overflow-hidden">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-border">
                            <th className="text-left text-[11px] font-semibold tracking-widest uppercase text-muted-foreground px-5 py-3">Zaman</th>
                            <th className="text-left text-[11px] font-semibold tracking-widest uppercase text-muted-foreground px-4 py-3">Şube</th>
                            <th className="text-left text-[11px] font-semibold tracking-widest uppercase text-muted-foreground px-4 py-3">Kategori</th>
                            <th className="text-left text-[11px] font-semibold tracking-widest uppercase text-muted-foreground px-4 py-3">Önem</th>
                            <th className="text-left text-[11px] font-semibold tracking-widest uppercase text-muted-foreground px-4 py-3">Kullanıcı</th>
                            <th className="text-left text-[11px] font-semibold tracking-widest uppercase text-muted-foreground px-4 py-3">Detay</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={6} className="px-5 py-10 text-center text-sm text-muted-foreground">
                                    Yükleniyor...
                                </td>
                            </tr>
                        ) : logs.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-5 py-10 text-center text-sm text-muted-foreground">
                                    Kayıt bulunamadı.
                                </td>
                            </tr>
                        ) : (
                            logs.map(log => (
                                <tr key={log.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors align-top">
                                    <td className="px-5 py-3.5 text-muted-foreground whitespace-nowrap">
                                        {new Date(log.createdAt).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </td>
                                    <td className="px-4 py-3.5 text-muted-foreground">{log.branchName ?? '—'}</td>
                                    <td className="px-4 py-3.5">
                                        <span className={cn('inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold', CATEGORY_STYLE[log.category] ?? CATEGORY_STYLE[6])}>
                                            {CATEGORY_LABELS[log.category] ?? 'Bilinmiyor'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3.5">
                                        <span className={cn('inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold', SEVERITY_STYLE[log.severity] ?? SEVERITY_STYLE[1])}>
                                            {SEVERITY_LABELS[log.severity] ?? 'Bilgi'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3.5 font-medium text-foreground whitespace-nowrap">{log.actorName || '—'}</td>
                                    <td className="px-4 py-3.5">
                                        <p className="text-foreground">{log.message}</p>
                                        <p className="text-xs text-muted-foreground mt-0.5">{log.action}</p>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-3">
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>
                            {totalCount === 0
                                ? '0 kayıt'
                                : `${(currentPage - 1) * pageSize + 1}-${Math.min(currentPage * pageSize, totalCount)} / ${totalCount} kayıt`}
                        </span>
                        <select
                            className="rounded-lg border border-border bg-background px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                            value={pageSize}
                            onChange={e => {
                                setPageSize(Number(e.target.value));
                                setPage(1);
                            }}
                        >
                            {[10, 25, 50, 100].map(size => (
                                <option key={size} value={size}>{size} / sayfa</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex items-center gap-1">
                        <button
                            type="button"
                            disabled={currentPage === 1}
                            onClick={() => setPage(1)}
                            className="rounded-lg border border-border p-1.5 text-muted-foreground hover:bg-muted/50 disabled:opacity-40 disabled:hover:bg-transparent"
                        >
                            <ChevronsLeft className="h-4 w-4" />
                        </button>
                        <button
                            type="button"
                            disabled={currentPage === 1}
                            onClick={() => setPage(Math.max(1, currentPage - 1))}
                            className="rounded-lg border border-border p-1.5 text-muted-foreground hover:bg-muted/50 disabled:opacity-40 disabled:hover:bg-transparent"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        <span className="px-2 text-xs text-muted-foreground whitespace-nowrap">
                            Sayfa {currentPage} / {totalPages}
                        </span>
                        <button
                            type="button"
                            disabled={currentPage === totalPages}
                            onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
                            className="rounded-lg border border-border p-1.5 text-muted-foreground hover:bg-muted/50 disabled:opacity-40 disabled:hover:bg-transparent"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </button>
                        <button
                            type="button"
                            disabled={currentPage === totalPages}
                            onClick={() => setPage(totalPages)}
                            className="rounded-lg border border-border p-1.5 text-muted-foreground hover:bg-muted/50 disabled:opacity-40 disabled:hover:bg-transparent"
                        >
                            <ChevronsRight className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
