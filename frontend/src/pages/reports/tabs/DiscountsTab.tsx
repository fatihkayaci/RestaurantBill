import { Percent, TrendingDown, FileText } from 'lucide-react';
import type { DiscountReport } from '@/features/reports/types';

interface Props {
    data: DiscountReport | null;
    loading: boolean;
}

const formatCurrency = (value: number, decimals = 0) =>
    `₺${value.toLocaleString('tr-TR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;

export default function DiscountsTab({ data, loading }: Props) {
    if (loading && !data) {
        return <div className="flex items-center justify-center h-64 text-sm text-muted-foreground">Yükleniyor...</div>;
    }

    const maxBucket = Math.max(1, ...(data?.percentDistribution.map(b => b.count) ?? [0]));

    return (
        <div className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-xl border border-border bg-card p-5">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-lg bg-rb-red-bg flex items-center justify-center shrink-0">
                            <TrendingDown className="w-5 h-5 text-rb-red" />
                        </div>
                        <p className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground">Toplam İndirim</p>
                    </div>
                    <p className="text-2xl font-bold text-foreground mt-3">{formatCurrency(data?.totalDiscountAmount ?? 0, 2)}</p>
                    <p className="text-xs text-muted-foreground mt-1">{data?.discountedPaymentCount ?? 0} işlemde uygulandı</p>
                </div>
                <div className="rounded-xl border border-border bg-card p-5">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-lg bg-rb-amber-bg flex items-center justify-center shrink-0">
                            <Percent className="w-5 h-5 text-rb-amber" />
                        </div>
                        <p className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground">Ciroya Oranı</p>
                    </div>
                    <p className="text-2xl font-bold text-foreground mt-3">%{data?.discountToRevenuePercent ?? 0}</p>
                    <p className="text-xs text-muted-foreground mt-1">Brüt ciro {formatCurrency(data?.grossRevenue ?? 0)}</p>
                </div>
                <div className="rounded-xl border border-border bg-card p-5">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-lg bg-rb-accent-bg flex items-center justify-center shrink-0">
                            <FileText className="w-5 h-5 text-rb-accent" />
                        </div>
                        <p className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground">Not Doldurulma Oranı</p>
                    </div>
                    <p className="text-2xl font-bold text-foreground mt-3">%{data?.noteFilledPercent ?? 0}</p>
                    <p className="text-xs text-muted-foreground mt-1">İndirimli işlemlerde açıklama girilme oranı</p>
                </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-4">
                <div className="rounded-xl border border-border bg-card overflow-hidden">
                    <div className="px-5 py-3.5 border-b border-border">
                        <p className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground">Kullanıcı Bazlı İndirim</p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border">
                                    <th className="text-left text-[11px] font-semibold tracking-widest uppercase text-muted-foreground px-5 py-3">Kullanıcı</th>
                                    <th className="text-right text-[11px] font-semibold tracking-widest uppercase text-muted-foreground px-4 py-3">Adet</th>
                                    <th className="text-right text-[11px] font-semibold tracking-widest uppercase text-muted-foreground px-5 py-3">Toplam</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(data?.userBreakdown.length ?? 0) === 0 ? (
                                    <tr><td colSpan={3} className="px-5 py-8 text-center text-sm text-muted-foreground">İndirim yok.</td></tr>
                                ) : data!.userBreakdown.map(u => (
                                    <tr key={u.userId} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                                        <td className="px-5 py-3 font-medium text-foreground whitespace-nowrap">{u.userName}</td>
                                        <td className="px-4 py-3 text-right text-foreground">{u.count}</td>
                                        <td className="px-5 py-3 text-right text-foreground whitespace-nowrap">{formatCurrency(u.totalAmount, 2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="rounded-xl border border-border bg-card p-5">
                    <p className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground mb-4">İndirim Oranı Dağılımı</p>
                    <div className="space-y-3">
                        {(data?.percentDistribution ?? []).map(b => (
                            <div key={b.label} className="flex items-center gap-3">
                                <span className="w-16 text-xs text-muted-foreground shrink-0">%{b.label}</span>
                                <div className="flex-1 h-3 rounded-full bg-muted overflow-hidden">
                                    <div
                                        className={b.label === '50-100' ? 'h-full bg-rb-red' : 'h-full bg-rb-amber'}
                                        style={{ width: `${(b.count / maxBucket) * 100}%` }}
                                    />
                                </div>
                                <span className="w-10 text-xs text-foreground text-right shrink-0">{b.count}</span>
                            </div>
                        ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-4">Yüksek oranlı (%50+) indirimler suistimal açısından incelenmeli.</p>
                </div>
            </div>

            <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="px-5 py-3.5 border-b border-border">
                    <p className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground">İptal Edilen Siparişler ({(data?.cancelledOrders ?? []).length})</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border">
                                <th className="text-left text-[11px] font-semibold tracking-widest uppercase text-muted-foreground px-5 py-3">Masa</th>
                                <th className="text-left text-[11px] font-semibold tracking-widest uppercase text-muted-foreground px-4 py-3">İptal Eden</th>
                                <th className="text-left text-[11px] font-semibold tracking-widest uppercase text-muted-foreground px-4 py-3">Ne Zaman</th>
                                <th className="text-right text-[11px] font-semibold tracking-widest uppercase text-muted-foreground px-5 py-3">Tutar</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(data?.cancelledOrders.length ?? 0) === 0 ? (
                                <tr><td colSpan={4} className="px-5 py-8 text-center text-sm text-muted-foreground">İptal edilen sipariş yok.</td></tr>
                            ) : data!.cancelledOrders.map(o => (
                                <tr key={o.orderId} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                                    <td className="px-5 py-3 font-medium text-foreground whitespace-nowrap">{o.tableName}</td>
                                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{o.actorName}</td>
                                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                                        {new Date(o.cancelledAt).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                    </td>
                                    <td className="px-5 py-3 text-right text-foreground whitespace-nowrap">{formatCurrency(o.amount, 2)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
