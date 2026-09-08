import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { shiftService } from '@/features/cashier/api/shiftService';
import type { PaymentMethod, ShiftSummary, ShiftTransaction } from '@/features/cashier/types';

interface Props {
    shift: { id: string; cashRegisterName: string };
    onClose: () => void;
}

const METHOD_ORDER: PaymentMethod[] = [2, 1, 3];
const METHOD_LABELS: Record<PaymentMethod, string> = { 1: 'Kart', 2: 'Nakit', 3: 'QR' };

function formatTL(amount: number): string {
    return `₺${amount.toLocaleString('tr-TR')}`;
}

function formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

export default function ShiftDetailModal({ shift, onClose }: Props) {
    const [summary, setSummary] = useState<ShiftSummary | null>(null);
    const [transactions, setTransactions] = useState<ShiftTransaction[] | null>(null);
    const [loadFailed, setLoadFailed] = useState(false);

    useEffect(() => {
        Promise.all([
            shiftService.getShiftSummary(shift.id),
            shiftService.getShiftTransactions(shift.id),
        ])
            .then(([summaryData, transactionsData]) => {
                setSummary(summaryData);
                setTransactions(transactionsData);
            })
            .catch(() => {
                setLoadFailed(true);
                toast.error('Vardiya detayı alınamadı.');
            });
    }, [shift.id]);

    // Kasiyer bazlı kırılım: ödemeyi kim aldıysa ona göre grupla (Payment.UserId'den gelir).
    const byCashier = useMemo(() => {
        if (!transactions) return [];
        const map = new Map<string, { name: string; count: number; amount: number }>();
        for (const t of transactions) {
            const name = t.paidByUserName || 'Bilinmiyor';
            const entry = map.get(name) ?? { name, count: 0, amount: 0 };
            entry.count += 1;
            entry.amount += t.amount;
            map.set(name, entry);
        }
        return Array.from(map.values()).sort((a, b) => b.amount - a.amount);
    }, [transactions]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[3px] p-4">
            <div className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl p-6 max-h-[85vh] flex flex-col">
                <div className="flex items-start justify-between mb-1 shrink-0">
                    <div>
                        <h2 className="font-serif text-xl font-bold text-foreground">Vardiya Detayı</h2>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            {shift.cashRegisterName}{summary ? ` · ${formatTime(summary.openedAt)}'den beri` : ''}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="overflow-y-auto mt-4 space-y-5">
                    {loadFailed ? (
                        <p className="text-sm text-destructive text-center py-6">Vardiya detayı alınamadı.</p>
                    ) : !summary || !transactions ? (
                        <p className="text-sm text-muted-foreground text-center py-6">Yükleniyor...</p>
                    ) : (
                        <>
                            <div className="flex flex-col gap-1.5">
                                {METHOD_ORDER.map(method => {
                                    const item = summary.breakdown.find(b => b.method === method);
                                    return (
                                        <div key={method} className="flex items-center justify-between text-sm">
                                            <span className="text-muted-foreground">
                                                {METHOD_LABELS[method]}{item ? ` · ${item.count} işlem` : ''}
                                            </span>
                                            <span className="font-medium text-foreground tabular-nums">{formatTL(item?.amount ?? 0)}</span>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="pt-3 border-t border-dashed border-border flex items-center justify-between">
                                <span className="font-semibold text-foreground">Toplam Ciro</span>
                                <span className="font-serif text-xl font-bold text-foreground tabular-nums">{formatTL(summary.total)}</span>
                            </div>

                            <div className="rounded-lg bg-muted px-4 py-3 flex items-center justify-between">
                                <span className="text-xs text-muted-foreground uppercase tracking-wide">Kasada Olması Gereken Nakit</span>
                                <span className="font-serif text-lg font-bold text-foreground tabular-nums">{formatTL(summary.expectedCashInRegister)}</span>
                            </div>

                            {summary.openTablesCount > 0 && (
                                <p className="text-sm text-rb-amber">⚠ {summary.openTablesCount} masanın hesabı hâlâ açık</p>
                            )}

                            <div>
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Kasiyer Bazlı Kırılım</p>
                                {byCashier.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">Henüz işlem yok.</p>
                                ) : (
                                    <div className="divide-y divide-border rounded-lg border border-border overflow-hidden">
                                        {byCashier.map(c => (
                                            <div key={c.name} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                                                <span className="text-foreground truncate">{c.name}</span>
                                                <span className="text-muted-foreground shrink-0">{c.count} işlem</span>
                                                <span className="font-semibold text-foreground tabular-nums shrink-0">{formatTL(c.amount)}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div>
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">İşlemler ({transactions.length})</p>
                                {transactions.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">Henüz işlem yok.</p>
                                ) : (
                                    <div className="divide-y divide-border">
                                        {transactions.map(t => (
                                            <div key={t.id} className="py-2.5 flex items-center justify-between gap-3 text-sm">
                                                <div className="min-w-0">
                                                    <p className="font-medium text-foreground truncate">{t.tableName ? `Masa ${t.tableName}` : 'Masa —'}</p>
                                                    <p className="text-xs text-muted-foreground truncate">
                                                        {new Date(t.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })} · {METHOD_LABELS[t.method]} · {t.paidByUserName || '—'}
                                                    </p>
                                                </div>
                                                <span className="font-semibold text-foreground tabular-nums shrink-0">{formatTL(t.amount)}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
