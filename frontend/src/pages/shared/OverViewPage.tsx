import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { statsService } from '@/features/stats/api/statsService';
import type { OverviewStats } from '@/features/stats/types';

export default function OverViewPage() {
    const [stats, setStats] = useState<OverviewStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        statsService.getOverview()
            .then(setStats)
            .finally(() => setLoading(false));
    }, []);

    const chartData = stats?.topProducts.map(p => ({ name: p.name, adet: p.sold })) ?? [];
    const occupiedPercent = stats && stats.totalTables > 0
        ? Math.round((stats.occupiedTables / stats.totalTables) * 100)
        : 0;

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div>
                <h1 className="text-2xl font-serif font-bold text-foreground">Genel Bakış</h1>
                <p className="text-sm text-muted-foreground mt-0.5">Bugünün özeti</p>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Toplam Gelir */}
                <div className="rounded-xl border border-rb-amber/30 bg-rb-amber-bg p-5">
                    <p className="text-[11px] font-semibold tracking-widest uppercase text-rb-amber">
                        Toplam Gelir
                    </p>
                    <p className="text-3xl font-bold text-foreground mt-2">
                        {loading ? '—' : `₺${stats!.totalRevenue.toFixed(0)}`}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">tüm zamanlar</p>
                </div>

                {/* Toplam Sipariş */}
                <div className="rounded-xl border border-rb-accent/30 bg-rb-accent-bg p-5">
                    <p className="text-[11px] font-semibold tracking-widest uppercase text-rb-accent">
                        Toplam Sipariş
                    </p>
                    <p className="text-3xl font-bold text-foreground mt-2">
                        {loading ? '—' : stats!.totalOrders}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">tamamlanan</p>
                </div>

                {/* Ort. Sipariş */}
                <div className="rounded-xl border border-rb-green/30 bg-rb-green-bg p-5">
                    <p className="text-[11px] font-semibold tracking-widest uppercase text-rb-green">
                        Ort. Sipariş
                    </p>
                    <p className="text-3xl font-bold text-foreground mt-2">
                        {loading ? '—' : `₺${stats!.avgOrderValue.toFixed(0)}`}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">sipariş başına</p>
                </div>

                {/* Dolu Masalar */}
                <div className="rounded-xl border border-gray-200 dark:border-gray-700/40 bg-gray-100 dark:bg-gray-800/40 p-5">
                    <p className="text-[11px] font-semibold tracking-widest uppercase text-gray-500 dark:text-gray-400">
                        Dolu Masa
                    </p>
                    <p className="text-3xl font-bold text-foreground mt-2">
                        {loading ? '—' : `${stats!.occupiedTables}/${stats!.totalTables}`}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                        {loading ? '' : `%${occupiedPercent} doluluk`}
                    </p>
                </div>
            </div>

            {/* Bottom Sections */}
            <div className="grid lg:grid-cols-2 gap-4">
                {/* En Çok Satan Ürünler */}
                <div className="rounded-xl border border-border bg-card p-5">
                    <p className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground mb-4">
                        En Çok Satan Ürünler
                    </p>
                    {loading ? (
                        <div className="h-56 flex items-center justify-center text-muted-foreground text-sm">
                            Yükleniyor...
                        </div>
                    ) : chartData.length === 0 ? (
                        <div className="h-56 flex items-center justify-center text-muted-foreground text-sm">
                            Henüz sipariş verisi yok.
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height={224}>
                            <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-30} textAnchor="end" height={60} />
                                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                                <Tooltip formatter={(value) => [value, 'Satış Adedi']} />
                                <Bar dataKey="adet" fill="var(--rb-amber)" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>

                {/* Popüler Ürünler */}
                <div className="rounded-xl border border-border bg-card p-5">
                    <p className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground mb-4">
                        Popüler Ürünler
                    </p>
                    {loading ? (
                        <p className="text-muted-foreground text-sm">Yükleniyor...</p>
                    ) : !stats || stats.topProducts.length === 0 ? (
                        <p className="text-muted-foreground text-sm">Henüz sipariş verisi yok.</p>
                    ) : (
                        <div className="space-y-3">
                            {stats.topProducts.map((item, idx) => (
                                <div key={item.name} className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-rb-amber-bg text-rb-amber text-xs font-bold">
                                            {idx + 1}
                                        </span>
                                        <span className="text-sm font-medium text-foreground">{item.name}</span>
                                    </div>
                                    <span className="text-sm font-semibold text-muted-foreground">{item.sold} adet</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
