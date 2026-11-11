import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { shiftService } from '@/features/cashier/api/shiftService';
import type { Shift, ShiftStartCandidate } from '@/features/cashier/types';
import { Button } from '@/components/ui/button';
import { useActiveShift } from '@/features/cashier/context/activeShiftStore';
import { getApiErrorMessage } from '@/lib/apiError';

interface ShiftStartGateProps {
    onResolved: () => void;
}

// Kör sayım: kasiyer sayarken "olması gereken" tutarı görmez, fark admin tarafında incelenir.
type CountMode = 'takeover' | 'opening';

function formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

function candidateStatus(c: ShiftStartCandidate): { text: string; className: string } {
    if (c.isMine) return { text: 'Sizin vardiyanız açık', className: 'text-rb-green' };
    if (c.hasOpenShift) {
        const since = c.openedAt ? ` · ${formatTime(c.openedAt)}'den beri` : '';
        return { text: `${c.openShiftOwnerName || 'Başka biri'} vardiyada${since}`, className: 'text-rb-orange' };
    }
    if (c.requiresCount) return { text: 'Önceki vardiya sayılmadan kapandı · açılışta sayım var', className: 'text-rb-amber' };
    return { text: c.lastClosedAt ? 'Boş · son vardiya sayımla kapandı' : 'Boş', className: 'text-muted-foreground' };
}

function candidateAction(c: ShiftStartCandidate): string {
    if (c.isMine) return 'Devam et →';
    if (c.hasOpenShift) return 'Devral →';
    if (c.requiresCount) return 'Say ve başlat →';
    return 'Vardiyayı başlat →';
}

export default function ShiftStartGate({ onResolved }: ShiftStartGateProps) {
    const { setShift } = useActiveShift();
    const [loading, setLoading] = useState(true);
    const [candidates, setCandidates] = useState<ShiftStartCandidate[]>([]);
    const [counting, setCounting] = useState<{ candidate: ShiftStartCandidate; mode: CountMode } | null>(null);
    const [countedAmount, setCountedAmount] = useState('');
    const [busyId, setBusyId] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        // Vardiya kişiye ait: kasiyerin açık bir vardiyası varsa kasa seçtirmeden devam edilir.
        shiftService.getMyCurrent()
            .then(shift => {
                if (cancelled) return;
                setShift(shift);
                onResolved();
            })
            .catch(() => {
                shiftService.getStartCandidates()
                    .then(data => { if (!cancelled) setCandidates(data); })
                    .catch(() => toast.error('Kasa bilgileri alınamadı.'))
                    .finally(() => { if (!cancelled) setLoading(false); });
            });

        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const resolveWith = (shift: Shift, message: string) => {
        setShift(shift);
        toast.success(message);
        onResolved();
    };

    const handlePick = async (candidate: ShiftStartCandidate) => {
        if (candidate.hasOpenShift && !candidate.isMine) {
            setCounting({ candidate, mode: 'takeover' });
            setCountedAmount('');
            return;
        }
        if (!candidate.hasOpenShift && candidate.requiresCount) {
            setCounting({ candidate, mode: 'opening' });
            setCountedAmount('');
            return;
        }

        setBusyId(candidate.cashRegisterId);
        try {
            if (candidate.isMine) {
                resolveWith(await shiftService.getCurrent(candidate.cashRegisterId), `${candidate.cashRegisterName} kasasındaki vardiyanıza döndünüz.`);
            } else {
                resolveWith(await shiftService.openShift(candidate.cashRegisterId), `${candidate.cashRegisterName} kasasında vardiyanız başladı.`);
            }
        } catch (err) {
            toast.error(getApiErrorMessage(err, 'Vardiya başlatılamadı.'));
        } finally {
            setBusyId(null);
        }
    };

    const handleSubmitCount = async () => {
        if (!counting) return;
        const amount = parseFloat(countedAmount.replace(',', '.'));
        if (countedAmount === '' || Number.isNaN(amount) || amount < 0) {
            toast.error('Geçerli bir tutar girin.');
            return;
        }

        const { candidate, mode } = counting;
        setBusyId(candidate.cashRegisterId);
        try {
            const shift = mode === 'takeover'
                ? await shiftService.takeOver(candidate.cashRegisterId, amount)
                : await shiftService.openShift(candidate.cashRegisterId, amount);
            resolveWith(shift, mode === 'takeover'
                ? `${candidate.cashRegisterName} kasasını devraldınız.`
                : `${candidate.cashRegisterName} kasasında vardiyanız başladı.`);
        } catch (err) {
            toast.error(getApiErrorMessage(err, mode === 'takeover' ? 'Kasa devralınamadı.' : 'Vardiya başlatılamadı.'));
        } finally {
            setBusyId(null);
        }
    };

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <p className="text-muted-foreground text-sm">Yükleniyor...</p>
            </div>
        );
    }

    const submitting = busyId !== null;

    return (
        <div className="flex-1 flex items-center justify-center p-6">
            <div className="w-full max-w-md bg-card border border-border rounded-xl shadow-lg p-6">
                {!counting ? (
                    <>
                        <h2 className="font-serif text-lg font-bold text-foreground mb-1">Hangi kasada çalışacaksınız?</h2>
                        <p className="text-sm text-muted-foreground mb-4">
                            Vardiya size ait olur; ödemeler bu kasaya işlenir, kapanışta nakdi siz sayarsınız. Kasa başkasındaysa sayım yapıp devralırsınız.
                            Yöneticiniz sizin için vardiya açtıysa bu ekranı görmezsiniz.
                        </p>
                        {candidates.length === 0 ? (
                            <p className="text-sm text-destructive">
                                Kullanımda kasa yok. Yöneticin Kasalar sayfasından bir kasa açmalı.
                            </p>
                        ) : (
                            <div className="flex flex-col gap-2">
                                {candidates.map(c => {
                                    const status = candidateStatus(c);
                                    return (
                                        <button
                                            key={c.cashRegisterId}
                                            onClick={() => handlePick(c)}
                                            disabled={submitting}
                                            className="flex items-center justify-between gap-3 rounded-lg border border-border px-4 py-3 min-h-14 text-left hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <div className="min-w-0">
                                                <span className="font-medium text-foreground block">{c.cashRegisterName}</span>
                                                <span className={`text-xs font-semibold ${status.className}`}>{status.text}</span>
                                            </div>
                                            <span className="text-sm font-semibold text-foreground shrink-0">
                                                {busyId === c.cashRegisterId ? 'Bekleyin...' : candidateAction(c)}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </>
                ) : (
                    <>
                        <h2 className="font-serif text-lg font-bold text-foreground mb-1">
                            {counting.mode === 'takeover' ? `${counting.candidate.cashRegisterName} kasasını devral` : counting.candidate.cashRegisterName}
                        </h2>
                        <p className="text-sm text-muted-foreground mb-4">
                            {counting.mode === 'takeover'
                                ? `Kasa ${counting.candidate.openShiftOwnerName || 'başka biri'} adına açık. Kasadaki nakdi sayın: bu sayım onun vardiyasını kapatır ve sizinkini başlatır.`
                                : 'Önceki vardiya sayılmadan kapandı. Kasadaki nakdi sayın: bu sayım o vardiyaya yazılır, sizin vardiyanız bu tutarla başlar.'}
                        </p>

                        <div className="flex flex-col gap-3">
                            <div>
                                <label htmlFor="shift-count" className="text-xs text-muted-foreground uppercase tracking-wide mb-1 block">
                                    Kasada Sayılan Nakit
                                </label>
                                <input
                                    id="shift-count"
                                    type="number"
                                    inputMode="decimal"
                                    value={countedAmount}
                                    onChange={e => setCountedAmount(e.target.value)}
                                    placeholder="0,00"
                                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground font-serif text-lg focus:outline-none focus:ring-2 focus:ring-rb-accent"
                                    autoFocus
                                />
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" onClick={() => setCounting(null)} disabled={submitting} className="flex-1">
                                    Vazgeç
                                </Button>
                                <Button onClick={handleSubmitCount} disabled={submitting} className="flex-1">
                                    {submitting ? 'Bekleyin...' : counting.mode === 'takeover' ? 'Sayımı Onayla, Devral' : 'Sayımı Onayla, Başlat'}
                                </Button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
