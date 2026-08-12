import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { shiftService } from '@/features/cashier/api/shiftService';
import type { ShiftStartCandidate } from '@/features/cashier/types';
import { Button } from '@/components/ui/button';

interface ShiftStartGateProps {
    onResolved: () => void;
}

export default function ShiftStartGate({ onResolved }: ShiftStartGateProps) {
    const [loading, setLoading] = useState(true);
    const [candidates, setCandidates] = useState<ShiftStartCandidate[]>([]);
    const [selected, setSelected] = useState<ShiftStartCandidate | null>(null);
    const [reportingDifference, setReportingDifference] = useState(false);
    const [countedAmount, setCountedAmount] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        shiftService.getStartCandidates()
            .then(data => {
                setCandidates(data);
                if (data.length === 0) {
                    onResolved();
                } else if (data.length === 1) {
                    setSelected(data[0]);
                }
            })
            .catch(() => toast.error('Kasa bilgileri alınamadı.'))
            .finally(() => setLoading(false));
    }, [onResolved]);

    const handleSelect = (candidate: ShiftStartCandidate) => {
        setSelected(candidate);
        setReportingDifference(false);
        setCountedAmount('');
    };

    const submitOpen = async (openingBalance: number) => {
        if (!selected) return;
        setSubmitting(true);
        try {
            await shiftService.openShift(selected.cashRegisterId, openingBalance);
            toast.success(`${selected.cashRegisterName} kasasında vardiya açıldı.`);
            onResolved();
        } catch (err: any) {
            toast.error(err.response?.data?.error ?? 'Vardiya açılamadı.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleConfirmExact = () => submitOpen(selected!.expectedOpeningBalance);

    const handleConfirmWithDifference = () => {
        const amount = parseFloat(countedAmount.replace(',', '.'));
        if (Number.isNaN(amount) || amount < 0) {
            toast.error('Geçerli bir tutar girin.');
            return;
        }
        submitOpen(amount);
    };

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <p className="text-muted-foreground text-sm">Yükleniyor...</p>
            </div>
        );
    }

    const parsedCounted = parseFloat(countedAmount);
    const hasValidCountedAmount = countedAmount !== '' && !Number.isNaN(parsedCounted);
    const difference = hasValidCountedAmount ? parsedCounted - selected!.expectedOpeningBalance : 0;

    return (
        <div className="flex-1 flex items-center justify-center p-6">
            <div className="w-full max-w-md bg-card border border-border rounded-xl shadow-lg p-6">
                {!selected ? (
                    <>
                        <h2 className="font-serif text-lg font-bold text-foreground mb-1">Kasa Seçin</h2>
                        <p className="text-sm text-muted-foreground mb-4">
                            Vardiyası başlamamış birden fazla kasa var. Devam etmek için birini seçin.
                        </p>
                        <div className="flex flex-col gap-2">
                            {candidates.map(c => (
                                <button
                                    key={c.cashRegisterId}
                                    onClick={() => handleSelect(c)}
                                    className="flex items-center justify-between rounded-lg border border-border px-4 py-3 text-left hover:bg-muted transition-colors"
                                >
                                    <span className="font-medium text-foreground">{c.cashRegisterName}</span>
                                    <span className="text-sm text-muted-foreground font-serif">₺{c.expectedOpeningBalance.toFixed(2)}</span>
                                </button>
                            ))}
                        </div>
                    </>
                ) : (
                    <>
                        <h2 className="font-serif text-lg font-bold text-foreground mb-1">{selected.cashRegisterName}</h2>
                        <p className="text-sm text-muted-foreground mb-4">Vardiyayı açmadan önce kasadaki nakti sayın.</p>

                        <div className="rounded-lg bg-muted px-4 py-3 mb-4">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Beklenen Açılış Bakiyesi</p>
                            <p className="font-serif text-2xl font-bold text-foreground">₺{selected.expectedOpeningBalance.toFixed(2)}</p>
                        </div>

                        {!reportingDifference ? (
                            <div className="flex flex-col gap-2">
                                <Button onClick={handleConfirmExact} disabled={submitting} className="w-full">
                                    Beklenen Tutar Doğru, Onayla
                                </Button>
                                <button
                                    onClick={() => setReportingDifference(true)}
                                    disabled={submitting}
                                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    Kasada fark var
                                </button>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-3">
                                <div>
                                    <label className="text-xs text-muted-foreground uppercase tracking-wide mb-1 block">
                                        Sayılan Tutar
                                    </label>
                                    <input
                                        type="number"
                                        inputMode="decimal"
                                        value={countedAmount}
                                        onChange={e => setCountedAmount(e.target.value)}
                                        placeholder="0.00"
                                        className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground font-serif text-lg focus:outline-none focus:ring-2 focus:ring-rb-accent"
                                        autoFocus
                                    />
                                </div>
                                {hasValidCountedAmount && (
                                    <p className={`text-sm font-medium ${difference < 0 ? 'text-red-500' : difference > 0 ? 'text-rb-amber' : 'text-rb-green'}`}>
                                        {difference === 0
                                            ? 'Fark yok.'
                                            : difference < 0
                                                ? `₺${Math.abs(difference).toFixed(2)} eksik`
                                                : `₺${difference.toFixed(2)} fazla`}
                                    </p>
                                )}
                                <div className="flex gap-2">
                                    <Button variant="outline" onClick={() => setReportingDifference(false)} disabled={submitting} className="flex-1">
                                        Vazgeç
                                    </Button>
                                    <Button onClick={handleConfirmWithDifference} disabled={submitting} className="flex-1">
                                        Devam Et
                                    </Button>
                                </div>
                            </div>
                        )}

                        {candidates.length > 1 && (
                            <button
                                onClick={() => setSelected(null)}
                                disabled={submitting}
                                className="mt-4 text-xs text-muted-foreground hover:text-foreground transition-colors"
                            >
                                ← Farklı kasa seç
                            </button>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
