import type { TaxReport } from '@/features/reports/types';

interface Props {
    data: TaxReport | null;
    loading: boolean;
}

const formatCurrency = (value: number, decimals = 2) =>
    `₺${value.toLocaleString('tr-TR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;

export default function TaxTab({ data, loading }: Props) {
    if (loading && !data) {
        return <div className="flex items-center justify-center h-64 text-sm text-muted-foreground">Yükleniyor...</div>;
    }

    return (
        <div className="space-y-4 mt-4">
            <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="px-5 py-3.5 border-b border-border">
                    <p className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground">KDV Oranı Bazlı Döküm</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border">
                                <th className="text-left text-[11px] font-semibold tracking-widest uppercase text-muted-foreground px-5 py-3">KDV Oranı</th>
                                <th className="text-right text-[11px] font-semibold tracking-widest uppercase text-muted-foreground px-4 py-3">Matrah</th>
                                <th className="text-right text-[11px] font-semibold tracking-widest uppercase text-muted-foreground px-4 py-3">KDV</th>
                                <th className="text-right text-[11px] font-semibold tracking-widest uppercase text-muted-foreground px-5 py-3">Toplam</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(data?.rates.length ?? 0) === 0 ? (
                                <tr><td colSpan={4} className="px-5 py-10 text-center text-sm text-muted-foreground">Bu aralıkta veri yok.</td></tr>
                            ) : data!.rates.map(r => (
                                <tr key={r.taxRatePercent} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                                    <td className="px-5 py-3.5 font-medium text-foreground whitespace-nowrap">%{r.taxRatePercent}</td>
                                    <td className="px-4 py-3.5 text-right text-foreground whitespace-nowrap">{formatCurrency(r.matrah)}</td>
                                    <td className="px-4 py-3.5 text-right text-foreground whitespace-nowrap">{formatCurrency(r.tax)}</td>
                                    <td className="px-5 py-3.5 text-right text-foreground font-medium whitespace-nowrap">{formatCurrency(r.total)}</td>
                                </tr>
                            ))}
                        </tbody>
                        {data && data.rates.length > 0 && (
                            <tfoot>
                                <tr className="border-t-2 border-border">
                                    <td className="px-5 py-3.5 font-semibold text-foreground">Toplam</td>
                                    <td className="px-4 py-3.5 text-right font-semibold text-foreground whitespace-nowrap">{formatCurrency(data.totalMatrah)}</td>
                                    <td className="px-4 py-3.5 text-right font-semibold text-foreground whitespace-nowrap">{formatCurrency(data.totalTax)}</td>
                                    <td className="px-5 py-3.5 text-right font-semibold text-foreground whitespace-nowrap">{formatCurrency(data.totalAmount)}</td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>
        </div>
    );
}
