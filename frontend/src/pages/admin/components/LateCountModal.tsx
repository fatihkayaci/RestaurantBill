import { useState } from 'react';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { shiftService } from '@/features/cashier/api/shiftService';
import type { Shift } from '@/features/cashier/types';

interface Props {
    shift: Shift;
    onClose: () => void;
    onCounted: () => void;
}

function formatTL(amount: number): string {
    return `₺${amount.toLocaleString('tr-TR')}`;
}

export default function LateCountModal({ shift, onClose, onCounted }: Props) {
    const [countedAmount, setCountedAmount] = useState('');
    const [note, setNote] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const countedNum = parseFloat(countedAmount.replace(',', '.'));
    const hasValidCounted = countedAmount !== '' && !Number.isNaN(countedNum);
    const diff = hasValidCounted ? countedNum - shift.expectedClosingBalance : 0;

    const handleSubmit = async () => {
        if (!hasValidCounted || countedNum < 0) {
            toast.error('Geçerli bir sayım tutarı girin.');
            return;
        }
        setSubmitting(true);
        try {
            await shiftService.applyLateCount(shift.id, countedNum, note || undefined);
            toast.success('Sayım kaydedildi.');
            onCounted();
        } catch (err: any) {
            toast.error(err.response?.data?.error ?? 'Sayım kaydedilemedi.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[3px] p-4">
            <div className="w-full max-w-sm bg-card border border-border rounded-2xl shadow-2xl p-6">
                <div className="flex items-start justify-between mb-1">
                    <div>
                        <h2 className="font-serif text-xl font-bold text-foreground">Sayım Gir</h2>
                        <p className="text-sm text-muted-foreground mt-0.5">{shift.cashRegisterName} — sayımsız kapanmıştı</p>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={submitting}
                        className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="mt-4 rounded-lg bg-muted px-4 py-3 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground uppercase tracking-wide">Beklenen (Kapanış Anı)</span>
                    <span className="font-serif text-lg font-bold text-foreground tabular-nums">{formatTL(shift.expectedClosingBalance)}</span>
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

                <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="mt-5 w-full rounded-xl py-3.5 text-sm font-semibold text-white bg-rb-accent hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                    {submitting ? 'Kaydediliyor...' : 'Sayımı Kaydet'}
                </button>
            </div>
        </div>
    );
}
