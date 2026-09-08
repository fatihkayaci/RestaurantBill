import type { StaffReport } from '@/features/reports/types';

interface Props {
    data: StaffReport | null;
    loading: boolean;
}

const formatCurrency = (value: number, decimals = 0) =>
    `₺${value.toLocaleString('tr-TR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;

const METHOD_LABELS: Record<number, string> = { 1: 'Kart', 2: 'Nakit', 3: 'QR' };

export default function StaffTab({ data, loading }: Props) {
    if (loading && !data) {
        return <div className="flex items-center justify-center h-64 text-sm text-muted-foreground">Yükleniyor...</div>;
    }

    return (
        <div className="space-y-4 mt-4">
            <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="px-5 py-3.5 border-b border-border">
                    <p className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground">Garson Bazlı</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border">
                                <th className="text-left text-[11px] font-semibold tracking-widest uppercase text-muted-foreground px-5 py-3">Garson</th>
                                <th className="text-right text-[11px] font-semibold tracking-widest uppercase text-muted-foreground px-4 py-3">Sipariş</th>
                                <th className="text-right text-[11px] font-semibold tracking-widest uppercase text-muted-foreground px-4 py-3">Ciro</th>
                                <th className="text-right text-[11px] font-semibold tracking-widest uppercase text-muted-foreground px-5 py-3">Ort. Sepet</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(data?.waiters.length ?? 0) === 0 ? (
                                <tr><td colSpan={4} className="px-5 py-10 text-center text-sm text-muted-foreground">Bu aralıkta veri yok.</td></tr>
                            ) : data!.waiters.map(w => (
                                <tr key={w.userId} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                                    <td className="px-5 py-3 font-medium text-foreground whitespace-nowrap">{w.userName}</td>
                                    <td className="px-4 py-3 text-right text-foreground">{w.orderCount}</td>
                                    <td className="px-4 py-3 text-right text-foreground whitespace-nowrap">{formatCurrency(w.revenue)}</td>
                                    <td className="px-5 py-3 text-right text-muted-foreground whitespace-nowrap">{formatCurrency(w.avgBasket, 2)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="px-5 py-3.5 border-b border-border">
                    <p className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground">Kasiyer Bazlı</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border">
                                <th className="text-left text-[11px] font-semibold tracking-widest uppercase text-muted-foreground px-5 py-3">Kasiyer</th>
                                <th className="text-right text-[11px] font-semibold tracking-widest uppercase text-muted-foreground px-4 py-3">İşlem</th>
                                <th className="text-right text-[11px] font-semibold tracking-widest uppercase text-muted-foreground px-4 py-3">Tahsilat</th>
                                <th className="text-left text-[11px] font-semibold tracking-widest uppercase text-muted-foreground px-5 py-3">Yöntem Kırılımı</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(data?.cashiers.length ?? 0) === 0 ? (
                                <tr><td colSpan={4} className="px-5 py-10 text-center text-sm text-muted-foreground">Bu aralıkta veri yok.</td></tr>
                            ) : data!.cashiers.map(c => (
                                <tr key={c.userId} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                                    <td className="px-5 py-3 font-medium text-foreground whitespace-nowrap">{c.userName}</td>
                                    <td className="px-4 py-3 text-right text-foreground">{c.transactionCount}</td>
                                    <td className="px-4 py-3 text-right text-foreground whitespace-nowrap">{formatCurrency(c.revenue)}</td>
                                    <td className="px-5 py-3 text-muted-foreground">
                                        {c.paymentMethods.map(m => `${METHOD_LABELS[m.method]} %${m.percent}`).join(' · ')}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
