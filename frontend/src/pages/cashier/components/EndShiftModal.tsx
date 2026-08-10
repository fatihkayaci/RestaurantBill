import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { shiftService } from '@/features/cashier/api/shiftService';
import type { PaymentMethod, ShiftSummary } from '@/features/cashier/types';

interface Props {
    onClose: () => void;
    onShiftClosed: () => void;
}

const METHOD_ORDER: PaymentMethod[] = [2, 1, 3];
const METHOD_LABELS: Record<PaymentMethod, string> = { 1: 'Kart', 2: 'Nakit', 3: 'QR' };

function formatTL(amount: number): string {
    return `₺${amount.toLocaleString('tr-TR')}`;
}

function formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

export default function EndShiftModal({ onClose, onShiftClosed }: Props) {
    const [countedAmount, setCountedAmount] = useState('');
    const [summary, setSummary] = useState<ShiftSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [now] = useState(() => new Date().toISOString());

    useEffect(() => {
        shiftService.getMyCurrentSummary()
            .then(setSummary)
            .catch(() => toast.error('Vardiya özeti alınamadı.'))
            .finally(() => setLoading(false));
    }, []);

    const handleCloseShift = async () => {
        if (!summary) return;
        const amount = parseFloat(countedAmount.replace(',', '.'));
        if (countedAmount === '' || Number.isNaN(amount) || amount < 0) {
            toast.error('Geçerli bir sayım tutarı girin.');
            return;
        }
        setSubmitting(true);
        try {
            await shiftService.closeShift(summary.shiftId, amount);
            toast.success('Vardiya kapatıldı.');
            onShiftClosed();
        } catch (err: any) {
            toast.error(err.response?.data?.error ?? 'Vardiya kapatılamadı.');
        } finally {
            setSubmitting(false);
        }
    };

    const orderedBreakdown = summary
        ? METHOD_ORDER
            .map(method => summary.breakdown.find(b => b.method === method))
            .filter((b): b is NonNullable<typeof b> => !!b)
        : [];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[3px] p-4">
            <div className="w-full max-w-sm bg-card border border-border rounded-2xl shadow-2xl p-6">
                <div className="flex items-start justify-between mb-1">
                    <div>
                        <h2 className="font-serif text-xl font-bold text-foreground">Vardiyayı Bitir</h2>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            {summary ? `${formatTime(summary.openedAt)} — ${formatTime(now)} · Kasiyer` : 'Kasiyer'}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {loading ? (
                    <p className="text-sm text-muted-foreground mt-6 text-center">Yükleniyor...</p>
                ) : !summary ? (
                    <p className="text-sm text-destructive mt-6 text-center">Açık bir vardiyanız bulunamadı.</p>
                ) : (
                    <>
                        {summary.openTablesCount > 0 && (
                            <div className="mt-4 rounded-lg bg-rb-amber-bg px-4 py-3">
                                <p className="text-sm text-rb-amber">
                                    {summary.openTablesCount} masanın hesabı hâlâ açık. Vardiyayı kapatmadan önce kapatmanız önerilir.
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
                            />
                        </div>

                        <button
                            onClick={handleCloseShift}
                            disabled={submitting}
                            className="mt-5 w-full rounded-xl py-3.5 text-sm font-semibold text-white bg-rb-red hover:opacity-90 transition-opacity disabled:opacity-50"
                        >
                            {submitting ? 'Kapatılıyor...' : 'Vardiyayı Kapat & Z Raporu Al'}
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
