import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingUp, ShoppingCart, Clock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { statsService } from '@/features/admin/api/statsService';
import type { OverviewStats } from '@/features/admin/types';

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
        <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="flex items-center gap-3 p-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100">
                            <DollarSign className="h-6 w-6 text-green-600" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Toplam Gelir</p>
                            <p className="text-2xl font-bold">
                                {loading ? '—' : `₺${stats!.totalRevenue.toFixed(2)}`}
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="flex items-center gap-3 p-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
                            <ShoppingCart className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Toplam Sipariş</p>
                            <p className="text-2xl font-bold">
                                {loading ? '—' : stats!.totalOrders}
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="flex items-center gap-3 p-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100">
                            <TrendingUp className="h-6 w-6 text-purple-600" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Ort. Sipariş Tutarı</p>
                            <p className="text-2xl font-bold">
                                {loading ? '—' : `₺${stats!.avgOrderValue.toFixed(2)}`}
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="flex items-center gap-3 p-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-100">
                            <Clock className="h-6 w-6 text-amber-600" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Dolu Masalar</p>
                            <p className="text-2xl font-bold">
                                {loading ? '—' : `${stats!.occupiedTables}/${stats!.totalTables}`}
                            </p>
                            {!loading && (
                                <p className="text-xs text-amber-600">%{occupiedPercent} doluluk</p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid lg:grid-cols-2 gap-6 mt-6">
                <Card>
                    <CardHeader>
                        <CardTitle>En Çok Satan Ürünler</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">Yükleniyor...</div>
                        ) : chartData.length === 0 ? (
                            <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">Henüz sipariş verisi yok.</div>
                        ) : (
                            <ResponsiveContainer width="100%" height={256}>
                                <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                    <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-30} textAnchor="end" height={60} />
                                    <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                                    <Tooltip formatter={(value) => [value, 'Satış Adedi']} />
                                    <Bar dataKey="adet" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Popüler Ürünler</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <p className="text-muted-foreground text-sm">Yükleniyor...</p>
                        ) : !stats || stats.topProducts.length === 0 ? (
                            <p className="text-muted-foreground text-sm">Henüz sipariş verisi yok.</p>
                        ) : (
                            <div className="space-y-3">
                                {stats.topProducts.map((item, idx) => (
                                    <div key={item.name} className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold">
                                                {idx + 1}
                                            </span>
                                            <span className="font-medium">{item.name}</span>
                                        </div>
                                        <p className="font-semibold">{item.sold} adet</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </>
    );
}
