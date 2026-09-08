import { useMemo, useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils';
import type { ProductReport } from '@/features/reports/types';

interface Props {
    data: ProductReport | null;
    loading: boolean;
}

type SortBy = 'sold' | 'revenue';

const formatCurrency = (value: number, decimals = 0) =>
    `₺${value.toLocaleString('tr-TR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;

const CATEGORY_COLORS = ['var(--rb-accent)', 'var(--rb-green)', 'var(--rb-gold)', 'var(--rb-orange)', 'var(--rb-purple)', 'var(--rb-red)'];

export default function ProductsTab({ data, loading }: Props) {
    const [sortBy, setSortBy] = useState<SortBy>('revenue');

    const sortedProducts = useMemo(() => {
        const products = data?.products ?? [];
        return [...products].sort((a, b) => sortBy === 'sold' ? b.sold - a.sold : b.revenue - a.revenue);
    }, [data, sortBy]);

    if (loading && !data) {
        return <div className="flex items-center justify-center h-64 text-sm text-muted-foreground">Yükleniyor...</div>;
    }

    return (
        <div className="space-y-4 mt-4">
            <div className="grid lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2 rounded-xl border border-border bg-card overflow-hidden">
                    <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
                        <p className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground">En Çok Satan Ürünler</p>
                        <div className="flex items-center gap-1 rounded-lg border border-border p-0.5">
                            <button
                                type="button"
                                onClick={() => setSortBy('revenue')}
                                className={cn('px-2.5 py-1 rounded-md text-xs font-medium transition-colors', sortBy === 'revenue' ? 'bg-rb-accent text-white' : 'text-muted-foreground hover:text-foreground')}
                            >
                                Ciro
                            </button>
                            <button
                                type="button"
                                onClick={() => setSortBy('sold')}
                                className={cn('px-2.5 py-1 rounded-md text-xs font-medium transition-colors', sortBy === 'sold' ? 'bg-rb-accent text-white' : 'text-muted-foreground hover:text-foreground')}
                            >
                                Adet
                            </button>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border">
                                    <th className="text-left text-[11px] font-semibold tracking-widest uppercase text-muted-foreground px-5 py-3">Ürün</th>
                                    <th className="text-left text-[11px] font-semibold tracking-widest uppercase text-muted-foreground px-4 py-3">Kategori</th>
                                    <th className="text-right text-[11px] font-semibold tracking-widest uppercase text-muted-foreground px-4 py-3">Adet</th>
                                    <th className="text-right text-[11px] font-semibold tracking-widest uppercase text-muted-foreground px-4 py-3">Ciro</th>
                                    <th className="text-right text-[11px] font-semibold tracking-widest uppercase text-muted-foreground px-5 py-3">Ort. Birim</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedProducts.length === 0 ? (
                                    <tr><td colSpan={5} className="px-5 py-10 text-center text-sm text-muted-foreground">Bu aralıkta satış yok.</td></tr>
                                ) : sortedProducts.map(p => (
                                    <tr key={p.productId} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                                        <td className="px-5 py-3 font-medium text-foreground whitespace-nowrap">{p.productName}</td>
                                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{p.categoryName}</td>
                                        <td className="px-4 py-3 text-right text-foreground">{p.sold}</td>
                                        <td className="px-4 py-3 text-right text-foreground whitespace-nowrap">{formatCurrency(p.revenue)}</td>
                                        <td className="px-5 py-3 text-right text-muted-foreground whitespace-nowrap">{formatCurrency(p.avgUnitPrice, 2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="rounded-xl border border-border bg-card p-5">
                    <p className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground mb-4">Kategori Kırılımı</p>
                    {(data?.categoryBreakdown.length ?? 0) === 0 ? (
                        <div className="h-56 flex items-center justify-center text-muted-foreground text-sm">Veri yok.</div>
                    ) : (
                        <>
                            <ResponsiveContainer width="100%" height={180}>
                                <PieChart>
                                    <Pie data={data!.categoryBreakdown} dataKey="revenue" nameKey="categoryName" innerRadius={50} outerRadius={72} paddingAngle={2}>
                                        {data!.categoryBreakdown.map((c, i) => <Cell key={c.categoryId} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />)}
                                    </Pie>
                                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="space-y-2.5 mt-2">
                                {data!.categoryBreakdown.map((c, i) => (
                                    <div key={c.categoryId} className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }} />
                                            <span className="text-foreground truncate">{c.categoryName}</span>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="text-foreground font-medium">{formatCurrency(c.revenue)}</p>
                                            <p className="text-xs text-muted-foreground">%{c.percent}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>

            <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="px-5 py-3.5 border-b border-border">
                    <p className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground">
                        Hiç Satmayan Aktif Ürünler ({(data?.neverSoldProducts ?? []).length})
                    </p>
                </div>
                {(data?.neverSoldProducts.length ?? 0) === 0 ? (
                    <p className="px-5 py-8 text-center text-sm text-muted-foreground">Bu aralıkta satmayan aktif ürün yok.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border">
                                    <th className="text-left text-[11px] font-semibold tracking-widest uppercase text-muted-foreground px-5 py-3">Ürün</th>
                                    <th className="text-left text-[11px] font-semibold tracking-widest uppercase text-muted-foreground px-4 py-3">Kategori</th>
                                    <th className="text-right text-[11px] font-semibold tracking-widest uppercase text-muted-foreground px-5 py-3">Fiyat</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data!.neverSoldProducts.map(p => (
                                    <tr key={p.productId} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                                        <td className="px-5 py-3 font-medium text-foreground whitespace-nowrap">{p.productName}</td>
                                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{p.categoryName}</td>
                                        <td className="px-5 py-3 text-right text-foreground whitespace-nowrap">{formatCurrency(p.price, 2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
