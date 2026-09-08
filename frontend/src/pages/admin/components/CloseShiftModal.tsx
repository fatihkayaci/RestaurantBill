import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { shiftService } from '@/features/cashier/api/shiftService';
import type { PaymentMethod, ShiftSummary } from '@/features/cashier/types';

interface Props {
    shift: { id: string; cashRegisterName: string };
    onClose: () => void;
    onClosed: () => void;
}

const METHOD_ORDER: PaymentMethod[] = [2, 1, 3];
const METHOD_LABELS: Record<PaymentMethod, string> = { 1: 'Kart', 2: 'Nakit', 3: 'QR' };

function formatTL(amount: number): string {
    return `₺${amount.toLocaleString('tr-TR')}`;
}

function formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

export default function CloseShiftModal({ shift, onClose, onClosed }: Props) {
    const [countedAmount, setCountedAmount] = useState('');
    const [note, setNote] = useState('');
    const [summary, setSummary] = useState<ShiftSummary | null>(null);
    const [loadFailed, setLoadFailed] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        shiftService.getShiftSummary(shift.id)
            .then(setSummary)
            .catch(() => {
                setLoadFailed(true);
                toast.error('Vardiya özeti alınamadı.');
            });
    }, [shift.id]);

    const orderedBreakdown = summary
        ? METHOD_ORDER
            .map(method => summary.breakdown.find(b => b.method === method))
            .filter((b): b is NonNullable<typeof b> => !!b)
        : [];

    const countedNum = parseFloat(countedAmount.replace(',', '.'));
    const hasValidCounted = countedAmount !== '' && !Number.isNaN(countedNum);
    const diff = summary && hasValidCounted ? countedNum - summary.expectedCashInRegister : 0;

    const handleCloseWithCount = async () => {
        if (!summary) return;
        if (!hasValidCounted || countedNum < 0) {
            toast.error('Geçerli bir sayım tutarı girin.');
            return;
        }
        setSubmitting(true);
        try {
            await shiftService.closeShift(summary.shiftId, countedNum, note || undefined);
            toast.success('Gün kapatıldı.');
            onClosed();
        } catch (err: any) {
            toast.error(err.response?.data?.error ?? 'Gün kapatılamadı.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleCloseWithoutCount = async () => {
        setSubmitting(true);
        try {
            await shiftService.closeShiftWithoutCount(shift.id);
            toast.success('Gün sayım yapılmadan kapatıldı, sayım sonradan girilebilir.');
            onClosed();
        } catch (err: any) {
            toast.error(err.response?.data?.error ?? 'Gün kapatılamadı.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[3px] p-4">
            <div className="w-full max-w-sm bg-card border border-border rounded-2xl shadow-2xl p-6">
                <div className="flex items-start justify-between mb-1">
                    <div>
                        <h2 className="font-serif text-xl font-bold text-foreground">Günü Kapat</h2>
                        <p className="text-sm text-muted-foreground mt-0.5">{shift.cashRegisterName}</p>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={submitting}
                        className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {loadFailed ? (
                    <p className="text-sm text-destructive mt-6 text-center">Vardiya özeti alınamadı.</p>
                ) : !summary ? (
                    <p className="text-sm text-muted-foreground mt-6 text-center">Yükleniyor...</p>
                ) : (
                    <>
                        {summary.openTablesCount > 0 && (
                            <div className="mt-4 rounded-lg bg-rb-amber-bg px-4 py-3">
                                <p className="text-sm text-rb-amber">
                                    {summary.openTablesCount} masanın hesabı hâlâ açık. Kapatmadan önce kontrol etmeniz önerilir.
                                </p>
                            </div>
                        )}

                        <div className="mt-4 flex flex-col gap-2.5">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Vardiya Başlangıcı</span>
                                <span className="font-medium text-foreground tabular-nums">{formatTime(summary.openedAt)}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">İşlem Sayısı</span>
                                <span className="font-medium text-foreground tabular-nums">{summary.transactionCount}</span>
                            </div>
                            {orderedBreakdown.map(item => (
                                <div key={item.method} className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">{METHOD_LABELS[item.method]} ({item.count})</span>
                                    <span className="font-medium text-foreground tabular-nums">{formatTL(item.amount)}</span>
                                </div>
                            ))}
                        </div>

                        <div className="mt-4 pt-4 border-t border-dashed border-border flex items-center justify-between">
                            <span className="font-semibold text-foreground">Vardiya Toplamı</span>
                            <span className="font-serif text-2xl font-bold text-foreground tabular-nums">{formatTL(summary.total)}</span>
                        </div>

                        <div className="mt-2 rounded-lg bg-muted px-4 py-3 flex items-center justify-between">
                            <span className="text-xs text-muted-foreground uppercase tracking-wide">Kasada Olması Gereken Nakit</span>
                            <span className="font-serif text-lg font-bold text-foreground tabular-nums">{formatTL(summary.expectedCashInRegister)}</span>
                        </div>

                        <div className="mt-5">
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
                                Kasada Sayılan Nakit
                            </label>
                            <input
                                type="number"
                                inputMode="decimal"
                                value={countedAmount}
                                onChange={e => setCountedAmount(e.target.value)}
                                placeholder="Sayım tutarı..."
                                className="w-full rounded-lg border border-border bg-muted/50 px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-rb-accent"
                                autoFocus
                            />
                            {hasValidCounted && (
                                <p className={`mt-1.5 text-sm font-medium ${diff < 0 ? 'text-red-500' : diff > 0 ? 'text-rb-amber' : 'text-rb-green'}`}>
                                    {diff === 0 ? 'Fark yok.' : diff < 0 ? `${formatTL(Math.abs(diff))} eksik` : `${formatTL(diff)} fazla`}
                                </p>
                            )}
                            <input
                                type="text"
                                value={note}
                                onChange={e => setNote(e.target.value)}
                                placeholder="Not (opsiyonel)"
                                className="mt-2 w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-rb-accent"
                            />
                        </div>

                        <div className="mt-5 flex flex-col gap-2">
                            <button
                                onClick={handleCloseWithCount}
                                disabled={submitting}
                                className="w-full rounded-xl py-3.5 text-sm font-semibold text-white bg-rb-red hover:opacity-90 transition-opacity disabled:opacity-50"
                            >
                                {submitting ? 'Kapatılıyor...' : 'Sayarak Kapat'}
                            </button>
                            <button
                                onClick={handleCloseWithoutCount}
                                disabled={submitting}
                                className="w-full rounded-xl py-3.5 text-sm font-semibold text-foreground border border-border hover:bg-muted transition-colors disabled:opacity-50"
                            >
                                {submitting ? 'Kapatılıyor...' : 'Saymadan Kapat (sayım sonra girilir)'}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
