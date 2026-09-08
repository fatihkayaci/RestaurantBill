import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { shiftService } from '@/features/cashier/api/shiftService';
import type { PaymentMethod, Shift, ShiftStartCandidate, ShiftSummary } from '@/features/cashier/types';
import { cn } from '@/lib/utils';
import CloseShiftModal from './components/CloseShiftModal';
import ShiftDetailModal from './components/ShiftDetailModal';

const METHOD_ORDER: PaymentMethod[] = [2, 1, 3];
const METHOD_LABELS: Record<PaymentMethod, string> = { 1: 'Kart', 2: 'Nakit', 3: 'QR' };

interface RegisterCard {
    candidate: ShiftStartCandidate;
    shift: Shift | null;
    summary: ShiftSummary | null;
}

function formatTL(amount: number): string {
    return `₺${amount.toLocaleString('tr-TR')}`;
}

export default function DayEndPage() {
    const [cards, setCards] = useState<RegisterCard[]>([]);
    const [loading, setLoading] = useState(true);
    const [startingId, setStartingId] = useState<string | null>(null);
    const [closeTarget, setCloseTarget] = useState<{ id: string; cashRegisterName: string } | null>(null);
    const [detailTarget, setDetailTarget] = useState<{ id: string; cashRegisterName: string } | null>(null);

    const refresh = async () => {
        try {
            const candidates = await shiftService.getStartCandidates();
            const withDetail = await Promise.all(candidates.map(async (candidate): Promise<RegisterCard> => {
                if (!candidate.hasOpenShift) return { candidate, shift: null, summary: null };
                const [shift, summary] = await Promise.all([
                    shiftService.getCurrent(candidate.cashRegisterId),
                    shiftService.getShiftSummary(candidate.openShiftId!),
                ]);
                return { candidate, shift, summary };
            }));
            setCards(withDetail);
        } catch (err) {
            console.error(err);
            toast.error('Gün sonu verileri alınamadı.');
        } finally {
            setLoading(false);
        }
    };

    // eslint-disable-next-line react-hooks/set-state-in-effect -- refresh() is async; its setState calls happen after the await, not synchronously.
    useEffect(() => { refresh(); }, []);

    const handleStartShift = async (candidate: ShiftStartCandidate) => {
        setStartingId(candidate.cashRegisterId);
        try {
            await shiftService.ensureOpen(candidate.cashRegisterId);
            toast.success(`${candidate.cashRegisterName} kasasında gün başlatıldı.`);
            await refresh();
        } catch (err: any) {
            toast.error(err.response?.data?.error ?? 'Gün başlatılamadı.');
        } finally {
            setStartingId(null);
        }
    };

    return (
        <div className="space-y-5">
            <div>
                <h1 className="text-2xl font-serif font-bold text-foreground">Gün Sonu</h1>
                <p className="text-sm text-muted-foreground mt-0.5">Kasa bazında günün özeti</p>
            </div>

            {loading ? (
                <p className="text-sm text-muted-foreground">Yükleniyor...</p>
            ) : cards.length === 0 ? (
                <div className="rounded-xl border border-border bg-card p-8 text-sm text-muted-foreground text-center">
                    Açık kasa bulunamadı.
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                    {cards.map(({ candidate, shift, summary }) => (
                        <div key={candidate.cashRegisterId} className="rounded-xl border border-border bg-card p-5 flex flex-col gap-4">
                            <div className="flex items-center justify-between">
                                <h2 className="font-serif font-bold text-lg text-foreground">{candidate.cashRegisterName}</h2>
                                <span className={cn(
                                    "text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded",
                                    candidate.hasOpenShift ? "bg-rb-green-bg text-rb-green" : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                                )}>
                                    {candidate.hasOpenShift ? 'Gün Açık' : 'Gün Kapalı'}
                                </span>
                            </div>

                            {!candidate.hasOpenShift ? (
                                <>
                                    {candidate.previousShiftUncounted && (
                                        <p className="text-xs font-semibold text-rb-amber">
                                            ⚠ Önceki gün sayılmadı, Vardiyalar sayfasından sayım girin.
                                        </p>
                                    )}
                                    <button
                                        onClick={() => handleStartShift(candidate)}
                                        disabled={startingId === candidate.cashRegisterId}
                                        className="mt-1 rounded-lg bg-rb-accent text-white text-sm font-semibold py-2.5 hover:opacity-90 disabled:opacity-60 transition-opacity"
                                    >
                                        {startingId === candidate.cashRegisterId ? 'Başlatılıyor...' : 'Günü Başlat'}
                                    </button>
                                </>
                            ) : shift && summary ? (
                                <>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground">Açılış</span>
                                        <span className="font-medium text-foreground tabular-nums">
                                            {new Date(shift.openedAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })} · {formatTL(shift.openingBalance)}
                                        </span>
                                    </div>

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

                                    <div className="flex gap-2 mt-1">
                                        <button
                                            onClick={() => setCloseTarget({ id: shift.id, cashRegisterName: candidate.cashRegisterName })}
                                            className="flex-1 rounded-lg border border-border text-sm font-semibold py-2 text-rb-red hover:bg-rb-red-bg transition-colors"
                                        >
                                            Günü Kapat
                                        </button>
                                        <button
                                            onClick={() => setDetailTarget({ id: shift.id, cashRegisterName: candidate.cashRegisterName })}
                                            className="flex-1 rounded-lg border border-border text-sm font-semibold py-2 text-foreground hover:bg-muted transition-colors"
                                        >
                                            Detay
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <p className="text-sm text-muted-foreground">Yükleniyor...</p>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {closeTarget && (
                <CloseShiftModal
                    shift={closeTarget}
                    onClose={() => setCloseTarget(null)}
                    onClosed={() => { setCloseTarget(null); refresh(); }}
                />
            )}

            {detailTarget && (
                <ShiftDetailModal
                    shift={detailTarget}
                    onClose={() => setDetailTarget(null)}
                />
            )}
        </div>
    );
}
