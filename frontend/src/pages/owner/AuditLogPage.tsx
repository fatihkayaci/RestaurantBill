import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { auditLogService } from '@/features/auditLogs/api/auditLogService';
import type { AuditLog } from '@/features/auditLogs/types';
import { cn } from '@/lib/utils';

const CATEGORY_LABELS: Record<number, string> = {
    1: 'Giriş', 2: 'Sipariş', 3: 'Ödeme', 4: 'Personel', 5: 'Ürün', 6: 'Sistem',
};

const CATEGORY_STYLE: Record<number, string> = {
    1: 'bg-rb-purple-bg text-rb-purple',
    2: 'bg-rb-accent-bg text-rb-accent',
    3: 'bg-rb-green-bg text-rb-green',
    4: 'bg-rb-gold-bg text-rb-gold',
    5: 'bg-rb-orange-bg text-rb-orange',
    6: 'bg-rb-neutral-bg text-rb-neutral',
};

const SEVERITY_LABELS: Record<number, string> = { 1: 'Bilgi', 2: 'Uyarı', 3: 'Kritik' };

const SEVERITY_STYLE: Record<number, string> = {
    1: 'bg-rb-neutral-bg text-rb-neutral',
    2: 'bg-rb-amber-bg text-rb-amber',
    3: 'bg-rb-red-bg text-rb-red',
};

export default function AuditLogPage() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<number | 'all'>('all');
    const [severityFilter, setSeverityFilter] = useState<number | 'all'>('all');

    useEffect(() => {
        auditLogService.getAll()
            .then(setLogs)
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const filtered = logs.filter(log => {
        if (categoryFilter !== 'all' && log.category !== categoryFilter) return false;
        if (severityFilter !== 'all' && log.severity !== severityFilter) return false;
        if (search && !`${log.actorName} ${log.message} ${log.action}`.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
    });

    return (
        <div className="space-y-5">
            <div>
                <h1 className="text-2xl font-serif font-bold text-foreground">Denetim Kaydı</h1>
                <p className="text-sm text-muted-foreground mt-0.5">{logs.length} kayıt</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
                <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                        className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-border bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                        placeholder="Kullanıcı veya mesaj ara..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>

                <select
                    className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    value={categoryFilter}
                    onChange={e => setCategoryFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                >
                    <option value="all">Tüm Kategoriler</option>
                    {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                    ))}
                </select>

                <select
                    className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    value={severityFilter}
                    onChange={e => setSeverityFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                >
                    <option value="all">Tüm Önem Dereceleri</option>
                    {Object.entries(SEVERITY_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                    ))}
                </select>
            </div>

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
                        ) : filtered.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-5 py-10 text-center text-sm text-muted-foreground">
                                    Kayıt bulunamadı.
                                </td>
                            </tr>
                        ) : (
                            filtered.map(log => (
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
            </div>
        </div>
    );
}
