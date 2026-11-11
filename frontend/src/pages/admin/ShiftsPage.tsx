import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Wallet } from 'lucide-react';
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { shiftService } from '@/features/cashier/api/shiftService';
import { userService } from '@/features/users/api/userService';
import { branchService } from '@/features/branches/api/branchService';
import { reportService } from '@/features/reports/api/reportService';
import { presetRange, type DatePreset } from '@/features/reports/hooks/useReportFilter';
import type { PaymentMethod, Shift, ShiftStartCandidate, ShiftSummary } from '@/features/cashier/types';
import type { ShiftReport } from '@/features/reports/types';
import { createHubConnection } from '@/lib/signalrConnection';
import { getApiErrorMessage } from '@/lib/apiError';
import { formatAmount } from '@/lib/format';
import { cn } from '@/lib/utils';
import CloseShiftModal from './components/CloseShiftModal';
import LateCountModal from './components/LateCountModal';
import ShiftDetailModal from './components/ShiftDetailModal';
import StartShiftModal from './components/StartShiftModal';

const METHOD_LABELS: Record<PaymentMethod, string> = { 1: 'Kart', 2: 'Nakit', 3: 'QR' };
const REVIEW_PENDING = 1;
const REVIEW_REJECTED = 3;
const COUNT_NOT_COUNTED = 2;
const PRESETS: { key: DatePreset; label: string }[] = [
    { key: 'today', label: 'Bugün' },
    { key: 'yesterday', label: 'Dün' },
    { key: 'week', label: 'Bu hafta' },
    { key: 'month', label: 'Bu ay' },
];

interface RegisterCard {
    candidate: ShiftStartCandidate;
    shift: Shift | null;
    summary: ShiftSummary | null;
}

type ReviewTarget = { shift: Shift; type: 'opening' | 'closing'; action: 'approve' | 'reject' };

const formatTL = (amount: number) => `₺${formatAmount(amount)}`;
const timeOf = (iso: string) => new Date(iso).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
const dayTimeOf = (iso: string) => {
    const d = new Date(iso);
    const today = new Date();
    const yesterday = new Date(); yesterday.setDate(today.getDate() - 1);
    const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
    const prefix = sameDay(d, today) ? 'bugün' : sameDay(d, yesterday) ? 'dün' : d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' });
    return `${prefix} ${timeOf(iso)}`;
};

// Gün Sonu'nun yerine: kasa başına açık vardiya, sayım ve fark onayı tek sayfada. Raporlar'daki
// Kasa & Vardiya sekmesi yalnızca okur. Tasarım: canvas "Vardiyalar".
export default function ShiftsPage() {
    const [cards, setCards] = useState<RegisterCard[]>([]);
    const [loading, setLoading] = useState(true);
    const [dayEndTime, setDayEndTime] = useState<string | null>(null);

    const [preset, setPreset] = useState<DatePreset>('today');
    const [report, setReport] = useState<ShiftReport | null>(null);
    const [reportLoading, setReportLoading] = useState(true);
    const [onlyPending, setOnlyPending] = useState(false);
    const [userNames, setUserNames] = useState<Record<string, string>>({});

    const [startTarget, setStartTarget] = useState<ShiftStartCandidate | null>(null);
    const [closeTarget, setCloseTarget] = useState<{ id: string; cashRegisterName: string } | null>(null);
    const [closeWithoutCountTarget, setCloseWithoutCountTarget] = useState<{ id: string; cashRegisterName: string } | null>(null);
    const [lateCountTarget, setLateCountTarget] = useState<Shift | null>(null);
    const [detailTarget, setDetailTarget] = useState<{ id: string; cashRegisterName: string } | null>(null);
    const [reviewTarget, setReviewTarget] = useState<ReviewTarget | null>(null);
    const [rejectNote, setRejectNote] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const refreshCards = useCallback(async () => {
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
            toast.error(getApiErrorMessage(err, 'Vardiya bilgileri alınamadı.'));
        } finally {
            setLoading(false);
        }
    }, []);

    const refreshReport = useCallback(async (range: DatePreset) => {
        setReportLoading(true);
        try {
            setReport(await reportService.getShiftReport(presetRange(range)));
        } catch (err) {
            toast.error(getApiErrorMessage(err, 'Geçmiş vardiyalar alınamadı.'));
        } finally {
            setReportLoading(false);
        }
    }, []);

    const refreshAll = useCallback(() => {
        refreshCards();
        refreshReport(preset);
    }, [refreshCards, refreshReport, preset]);

    // eslint-disable-next-line react-hooks/set-state-in-effect -- async yenileme; setState await sonrasında çalışır.
    useEffect(() => { refreshCards(); }, [refreshCards]);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- yükleniyor bayrağı istek başında bilinçli olarak set edilir.
    useEffect(() => { refreshReport(preset); }, [refreshReport, preset]);

    useEffect(() => {
        branchService.getMyBranch().then(b => setDayEndTime(b.dayEndTime?.slice(0, 5) ?? null)).catch(() => {});
        // Rapor satırlarındaki "kapatan" için ad sözlüğü; giriş yapan kullanıcı listede olmadığından ayrıca eklenir.
        Promise.all([userService.getUsersByRestaurantId(), userService.getCurrentUser()])
            .then(([users, me]) => setUserNames(Object.fromEntries([...users.map(u => [u.id, u.fullName] as const), [me.id, me.fullName]])))
            .catch(() => {});
    }, []);

    useEffect(() => {
        const { connection, stop } = createHubConnection('/cashier-hub');
        connection.on('ShiftAutoClosed', (cashRegisterName: string) => {
            toast.info(`${cashRegisterName} kasasındaki vardiya gün sonu saatinde sayımsız kapatıldı.`);
            refreshAll();
        });
        connection.start().catch((err: Error) => {
            if (!err.message.includes('stopped during negotiation')) console.error('SignalR Connection Error:', err);
        });
        return () => { stop(); };
    }, [refreshAll]);

    const handleCloseWithoutCount = async () => {
        if (!closeWithoutCountTarget) return;
        setSubmitting(true);
        try {
            await shiftService.closeShiftWithoutCount(closeWithoutCountTarget.id);
            toast.success('Vardiya sayımsız kapatıldı; sayım sonradan girilebilir.');
            setCloseWithoutCountTarget(null);
            refreshAll();
        } catch (err) {
            toast.error(getApiErrorMessage(err, 'Vardiya kapatılamadı.'));
        } finally {
            setSubmitting(false);
        }
    };

    const openLateCount = async (shiftId: string) => {
        try {
            setLateCountTarget(await shiftService.getById(shiftId));
        } catch (err) {
            toast.error(getApiErrorMessage(err, 'Vardiya bulunamadı.'));
        }
    };

    const handleConfirmReview = async () => {
        if (!reviewTarget) return;
        setSubmitting(true);
        try {
            const { shift, type, action } = reviewTarget;
            if (type === 'opening') {
                if (action === 'approve') await shiftService.approveOpeningDifference(shift.id);
                else await shiftService.rejectOpeningDifference(shift.id, rejectNote || undefined);
            } else {
                if (action === 'approve') await shiftService.approveDifference(shift.id);
                else await shiftService.rejectDifference(shift.id, rejectNote || undefined);
            }
            toast.success(action === 'approve' ? 'Fark onaylandı.' : 'Fark reddedildi.');
            setReviewTarget(null);
            refreshReport(preset);
        } catch (err) {
            toast.error(getApiErrorMessage(err, 'İşlem gerçekleştirilemedi.'));
        } finally {
            setSubmitting(false);
        }
    };

    const requiresOpeningReview = (s: Shift) => s.openingDifference !== 0 && s.openingDifferenceReviewStatus === REVIEW_PENDING;
    const requiresClosingReview = (s: Shift) => s.status === 2 && !!s.difference && s.difference !== 0 && s.closingDifferenceReviewStatus === REVIEW_PENDING;
    const requiresCount = (s: Shift) => s.status === 2 && s.countStatus === COUNT_NOT_COUNTED;
    const needsAttention = (s: Shift) => requiresOpeningReview(s) || requiresClosingReview(s) || requiresCount(s);

    const rows = (report?.shifts ?? []).filter(s => !onlyPending || needsAttention(s));
    const pendingCount = (report?.shifts ?? []).filter(needsAttention).length;

    return (
        <div className="space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-serif font-bold text-foreground">Vardiyalar</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">Kasa başına açık vardiya, sayım ve fark onayı</p>
                </div>
                {dayEndTime && (
                    <p className="text-xs text-muted-foreground">Gün sonu saati {dayEndTime} · sayılmayan vardiyalar o saatte sistem tarafından kapanır</p>
                )}
            </div>

            {/* Kasa kartları */}
            {loading ? (
                <p className="text-sm text-muted-foreground">Yükleniyor...</p>
            ) : cards.length === 0 ? (
                <EmptyState
                    icon={Wallet}
                    title="Kullanımda kasa yok"
                    description="Vardiya açmak için önce Kasalar sayfasından bir kasa ekle ya da devre dışı bir kasayı kullanıma al."
                    link={{ label: 'Kasalara git', to: '/admin/cash-registers' }}
                />
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                    {cards.map(({ candidate, shift, summary }) => {
                        const state: 'open' | 'empty' | 'uncounted' = candidate.hasOpenShift ? 'open' : candidate.requiresCount ? 'uncounted' : 'empty';
                        return (
                            <div
                                key={candidate.cashRegisterId}
                                className={cn(
                                    'rounded-xl bg-card p-5 flex flex-col gap-4',
                                    state === 'open' && 'border border-border',
                                    state === 'empty' && 'border-[1.5px] border-dashed border-rb-gold/40',
                                    state === 'uncounted' && 'border border-rb-amber/50'
                                )}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <h2 className="font-serif font-bold text-lg text-foreground">{candidate.cashRegisterName}</h2>
                                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                                            {state === 'open' && `${candidate.openShiftOwnerName || '—'} · ${candidate.openedAt ? timeOf(candidate.openedAt) : ''}'den beri`}
                                            {state === 'empty' && (candidate.lastClosedAt
                                                ? `Son vardiya ${dayTimeOf(candidate.lastClosedAt)}'de sayımla kapandı`
                                                : 'Bu kasada henüz vardiya açılmadı')}
                                            {state === 'uncounted' && `${candidate.lastShiftOwnerName || 'Önceki vardiya'} · ${candidate.lastClosedAt ? dayTimeOf(candidate.lastClosedAt) : ''}'de ${candidate.lastClosedBySystem ? 'sistem kapattı' : 'sayımsız kapandı'}`}
                                        </p>
                                    </div>
                                    <span className={cn(
                                        'inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full text-[10px] font-bold tracking-widest uppercase shrink-0',
                                        state === 'open' && 'bg-rb-green-bg text-rb-green',
                                        state === 'empty' && 'bg-muted text-muted-foreground',
                                        state === 'uncounted' && 'bg-rb-amber-bg text-rb-amber'
                                    )}>
                                        {state === 'open' && <span className="h-1.5 w-1.5 rounded-full bg-rb-green" />}
                                        {state === 'open' ? 'Vardiyada' : state === 'empty' ? 'Boş' : 'Sayım bekliyor'}
                                    </span>
                                </div>

                                {state === 'open' && shift && summary && (
                                    <>
                                        <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                                            <div>
                                                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Açılış</p>
                                                <p className="font-semibold text-foreground tabular-nums">{formatTL(shift.openingBalance)}</p>
                                            </div>
                                            <div>
                                                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">İşlem</p>
                                                <p className="font-semibold text-foreground tabular-nums">{summary.transactionCount}</p>
                                            </div>
                                            <div>
                                                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Nakit / Kart</p>
                                                <p className="font-semibold text-foreground tabular-nums">
                                                    {formatTL(summary.breakdown.find(b => b.method === 2)?.amount ?? 0)} / {formatTL(summary.breakdown.find(b => b.method === 1)?.amount ?? 0)}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Kasada olması gereken</p>
                                                <p className="font-semibold text-foreground tabular-nums">{formatTL(summary.expectedCashInRegister ?? 0)}</p>
                                            </div>
                                        </div>
                                        {summary.breakdown.some(b => b.method === 3 && b.amount > 0) && (
                                            <p className="text-xs text-muted-foreground">{METHOD_LABELS[3]} {formatTL(summary.breakdown.find(b => b.method === 3)!.amount)}</p>
                                        )}
                                        {summary.openTablesCount > 0 && (
                                            <p className="text-sm text-rb-amber">⚠ {summary.openTablesCount} masanın hesabı hâlâ açık</p>
                                        )}
                                        <div className="flex gap-2 mt-auto">
                                            <button onClick={() => setCloseTarget({ id: shift.id, cashRegisterName: candidate.cashRegisterName })} className="flex-1 rounded-lg bg-rb-gold text-rb-gold-foreground text-sm font-semibold py-2 hover:opacity-90 transition-opacity">Sayımla kapat</button>
                                            <button onClick={() => setCloseWithoutCountTarget({ id: shift.id, cashRegisterName: candidate.cashRegisterName })} className="rounded-lg border border-border px-3 text-sm font-medium text-foreground hover:bg-muted transition-colors">Sayımsız kapat</button>
                                            <button onClick={() => setDetailTarget({ id: shift.id, cashRegisterName: candidate.cashRegisterName })} className="rounded-lg border border-border px-3 text-sm font-medium text-foreground hover:bg-muted transition-colors">Detay</button>
                                        </div>
                                    </>
                                )}

                                {state === 'open' && (!shift || !summary) && <p className="text-sm text-muted-foreground">Yükleniyor...</p>}

                                {state === 'empty' && (
                                    <>
                                        <p className="text-sm leading-relaxed text-muted-foreground">Kasa hazır. Kendi vardiyanı başlatabilir ya da gelecek kasiyer için açabilirsin; kasiyer girince sayım istenmez.</p>
                                        <button onClick={() => setStartTarget(candidate)} className="mt-auto rounded-lg bg-rb-gold text-rb-gold-foreground text-sm font-semibold py-2 hover:opacity-90 transition-opacity">Vardiya başlat</button>
                                    </>
                                )}

                                {state === 'uncounted' && (
                                    <>
                                        <p className="text-sm leading-relaxed text-muted-foreground">
                                            Vardiya sayılmadan kapandı. Sayımı şimdi girersen fark {candidate.lastShiftOwnerName ? `${candidate.lastShiftOwnerName} adlı kişinin` : 'o'} vardiyasına yazılır; girmezsen sıradaki kişi açılışta sayar.
                                        </p>
                                        <div className="flex gap-2 mt-auto">
                                            <button onClick={() => candidate.lastClosedShiftId && openLateCount(candidate.lastClosedShiftId)} className="flex-1 rounded-lg bg-rb-gold text-rb-gold-foreground text-sm font-semibold py-2 hover:opacity-90 transition-opacity">Sayım gir</button>
                                            <button onClick={() => setStartTarget(candidate)} className="rounded-lg border border-border px-3 text-sm font-medium text-foreground hover:bg-muted transition-colors">Vardiya başlat</button>
                                        </div>
                                    </>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Geçmiş vardiyalar */}
            <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-border">
                    <div className="flex flex-wrap items-center gap-3">
                        <p className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground">Geçmiş vardiyalar</p>
                        <div className="inline-flex rounded-lg border border-border overflow-hidden text-xs font-semibold">
                            {PRESETS.map(p => (
                                <button
                                    key={p.key}
                                    onClick={() => setPreset(p.key)}
                                    className={cn('px-2.5 py-1.5 transition-colors', preset === p.key ? 'bg-rb-gold text-rb-gold-foreground' : 'text-muted-foreground hover:text-foreground')}
                                >
                                    {p.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer select-none">
                        <input type="checkbox" checked={onlyPending} onChange={e => setOnlyPending(e.target.checked)} className="rounded border-border accent-rb-gold" />
                        Sadece inceleme bekleyenler{pendingCount > 0 && <span className="rounded-full bg-rb-amber-bg px-1.5 text-[11px] font-bold text-rb-amber">{pendingCount}</span>}
                    </label>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border">
                                <th className="text-left text-[11px] font-semibold tracking-widest uppercase text-muted-foreground px-5 py-3">Kasa</th>
                                <th className="text-left text-[11px] font-semibold tracking-widest uppercase text-muted-foreground px-4 py-3">Açan / Kapatan</th>
                                <th className="text-left text-[11px] font-semibold tracking-widest uppercase text-muted-foreground px-4 py-3">Açıldı / Kapandı</th>
                                <th className="text-right text-[11px] font-semibold tracking-widest uppercase text-muted-foreground px-4 py-3">Beklenen</th>
                                <th className="text-right text-[11px] font-semibold tracking-widest uppercase text-muted-foreground px-4 py-3">Sayılan</th>
                                <th className="text-right text-[11px] font-semibold tracking-widest uppercase text-muted-foreground px-4 py-3">Fark</th>
                                <th className="text-left text-[11px] font-semibold tracking-widest uppercase text-muted-foreground px-4 py-3">Durum</th>
                                <th className="px-4 py-3" />
                            </tr>
                        </thead>
                        <tbody>
                            {reportLoading && !report ? (
                                <tr><td colSpan={8} className="px-5 py-10 text-center text-sm text-muted-foreground">Yükleniyor...</td></tr>
                            ) : rows.length === 0 ? (
                                <tr><td colSpan={8} className="px-5 py-10 text-center text-sm text-muted-foreground">{onlyPending ? 'İnceleme bekleyen vardiya yok.' : 'Bu aralıkta vardiya yok.'}</td></tr>
                            ) : rows.map(s => {
                                const isOpen = s.status === 1;
                                const expected = isOpen ? s.expectedOpeningBalance : s.expectedClosingBalance;
                                const counted = isOpen ? s.openingBalance : s.countedClosingBalance;
                                const diff = isOpen ? s.openingDifference : s.difference;
                                const hasDifference = diff !== null && diff !== undefined && diff !== 0;
                                const openingPending = requiresOpeningReview(s);
                                const closingPending = requiresClosingReview(s);
                                return (
                                    <tr key={s.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors align-top">
                                        <td className="px-5 py-3.5 font-medium text-foreground whitespace-nowrap">{s.cashRegisterName}</td>
                                        <td className="px-4 py-3.5 text-muted-foreground whitespace-nowrap">
                                            {s.openedByUserName || userNames[s.openedByUserId] || '—'}
                                            {s.closedByUserId && <><br /><span className="text-xs">→ {userNames[s.closedByUserId] ?? '—'}</span></>}
                                            {!s.closedByUserId && s.closedBySystem && <><br /><span className="text-xs">→ Sistem</span></>}
                                        </td>
                                        <td className="px-4 py-3.5 text-muted-foreground whitespace-nowrap">
                                            {dayTimeOf(s.openedAt)}
                                            <br /><span className="text-xs">→ {s.closedAt ? dayTimeOf(s.closedAt) : 'açık'}</span>
                                        </td>
                                        <td className="px-4 py-3.5 text-right font-serif text-foreground whitespace-nowrap">
                                            {formatTL(expected)}<br />
                                            <span className="text-[10px] font-sans uppercase tracking-wide text-muted-foreground">{isOpen ? 'açılış' : 'kapanış'}</span>
                                        </td>
                                        <td className="px-4 py-3.5 text-right font-serif text-foreground whitespace-nowrap">{counted != null ? formatTL(counted) : '—'}</td>
                                        <td className={cn('px-4 py-3.5 text-right font-serif whitespace-nowrap', !hasDifference ? 'text-muted-foreground' : diff! < 0 ? 'text-red-500' : 'text-rb-amber')}>
                                            {hasDifference ? formatTL(diff!) : '—'}
                                        </td>
                                        <td className="px-4 py-3.5">
                                            <div className="flex flex-col gap-1 items-start">
                                                <span className={cn('inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold', isOpen ? 'bg-rb-green-bg text-rb-green' : 'bg-rb-neutral-bg text-rb-neutral')}>
                                                    {isOpen ? 'Açık' : s.closedBySystem ? 'Sistem kapattı' : 'Kapalı'}
                                                </span>
                                                {requiresCount(s) && <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rb-amber-bg text-rb-amber">Sayım bekliyor</span>}
                                                {s.openingDifference !== 0 && (
                                                    <span className={cn('inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold',
                                                        s.openingDifferenceReviewStatus === REVIEW_PENDING ? 'bg-rb-amber-bg text-rb-amber' : s.openingDifferenceReviewStatus === REVIEW_REJECTED ? 'bg-rb-red-bg text-red-500' : 'bg-rb-neutral-bg text-rb-neutral')}>
                                                        Açılış {s.openingDifferenceReviewStatus === REVIEW_PENDING ? 'onayı bekliyor' : s.openingDifferenceReviewStatus === REVIEW_REJECTED ? 'reddedildi' : 'onaylandı'}
                                                    </span>
                                                )}
                                                {hasDifference && !isOpen && (
                                                    <span className={cn('inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold',
                                                        s.closingDifferenceReviewStatus === REVIEW_PENDING ? 'bg-rb-amber-bg text-rb-amber' : s.closingDifferenceReviewStatus === REVIEW_REJECTED ? 'bg-rb-red-bg text-red-500' : 'bg-rb-neutral-bg text-rb-neutral')}>
                                                        Kapanış {s.closingDifferenceReviewStatus === REVIEW_PENDING ? 'onayı bekliyor' : s.closingDifferenceReviewStatus === REVIEW_REJECTED ? 'reddedildi' : 'onaylandı'}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3.5 text-right">
                                            <div className="flex flex-col gap-1.5 items-end text-xs font-semibold">
                                                {openingPending && (
                                                    <div className="flex gap-2">
                                                        <button onClick={() => { setReviewTarget({ shift: s, type: 'opening', action: 'approve' }); setRejectNote(''); }} className="text-rb-amber hover:underline">Açılışı onayla</button>
                                                        <button onClick={() => { setReviewTarget({ shift: s, type: 'opening', action: 'reject' }); setRejectNote(''); }} className="text-red-500 hover:underline">Reddet</button>
                                                    </div>
                                                )}
                                                {closingPending && (
                                                    <div className="flex gap-2">
                                                        <button onClick={() => { setReviewTarget({ shift: s, type: 'closing', action: 'approve' }); setRejectNote(''); }} className="text-rb-amber hover:underline">Kapanışı onayla</button>
                                                        <button onClick={() => { setReviewTarget({ shift: s, type: 'closing', action: 'reject' }); setRejectNote(''); }} className="text-red-500 hover:underline">Reddet</button>
                                                    </div>
                                                )}
                                                {isOpen && <button onClick={() => setCloseTarget({ id: s.id, cashRegisterName: s.cashRegisterName })} className="text-rb-amber hover:underline">Sayımla kapat</button>}
                                                {requiresCount(s) && <button onClick={() => setLateCountTarget(s)} className="text-rb-amber hover:underline">Sayım gir</button>}
                                                <button onClick={() => setDetailTarget({ id: s.id, cashRegisterName: s.cashRegisterName })} className="text-muted-foreground hover:text-foreground">Detay</button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                <p className="px-5 py-2.5 text-xs text-muted-foreground border-t border-border">Raporlar › Kasa &amp; Vardiya yalnızca okur; onay ve sayım işleri bu sayfada.</p>
            </div>

            <AlertDialog open={reviewTarget !== null} onOpenChange={open => !open && !submitting && setReviewTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {reviewTarget?.action === 'approve'
                                ? (reviewTarget.type === 'opening' ? 'Açılış farkını onayla' : 'Kapanış farkını onayla')
                                : (reviewTarget?.type === 'opening' ? 'Açılış farkını reddet' : 'Kapanış farkını reddet')}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {reviewTarget && (
                                <>
                                    {reviewTarget.shift.cashRegisterName} kasasında {formatTL((reviewTarget.type === 'opening' ? reviewTarget.shift.openingDifference : reviewTarget.shift.difference) ?? 0)} tutarında {reviewTarget.type === 'opening' ? 'açılış' : 'kapanış'} farkı var; kasa bakiyesi sayım anında sayılan nakde eşitlendi.{' '}
                                    {reviewTarget.action === 'approve'
                                        ? 'Onaylarsanız fark kabul edilmiş olarak kaydedilir.'
                                        : 'Reddederseniz fark kabul edilmemiş olarak işaretlenir (örn. kasiyerden tahsil edilecek). Kasa bakiyesi değişmez.'}
                                </>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    {reviewTarget?.action === 'reject' && (
                        <div className="px-1">
                            <label className="text-xs text-muted-foreground uppercase tracking-wide mb-1.5 block">Not (isteğe bağlı)</label>
                            <textarea
                                value={rejectNote}
                                onChange={e => setRejectNote(e.target.value)}
                                placeholder="Örn: Kasiyerle konuşuldu, yanlış saymış."
                                rows={3}
                                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                            />
                        </div>
                    )}
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={submitting}>İptal</AlertDialogCancel>
                        <Button onClick={handleConfirmReview} disabled={submitting} variant={reviewTarget?.action === 'reject' ? 'destructive' : 'default'}>
                            {reviewTarget?.action === 'approve' ? 'Onayla' : 'Reddet'}
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={closeWithoutCountTarget !== null} onOpenChange={open => !open && !submitting && setCloseWithoutCountTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Sayımsız kapat</AlertDialogTitle>
                        <AlertDialogDescription>
                            {closeWithoutCountTarget?.cashRegisterName} kasasındaki vardiya sayım yapılmadan kapanır ve "Sayım bekliyor" olarak işaretlenir. Sayımı sonradan buradan girebilir ya da sıradaki kişinin açılışta saymasını bekleyebilirsin.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={submitting}>İptal</AlertDialogCancel>
                        <Button onClick={handleCloseWithoutCount} disabled={submitting}>Sayımsız kapat</Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {startTarget && <StartShiftModal candidate={startTarget} onClose={() => setStartTarget(null)} onStarted={() => { setStartTarget(null); refreshAll(); }} />}
            {closeTarget && <CloseShiftModal shift={closeTarget} onClose={() => setCloseTarget(null)} onClosed={() => { setCloseTarget(null); refreshAll(); }} />}
            {lateCountTarget && <LateCountModal shift={lateCountTarget} onClose={() => setLateCountTarget(null)} onCounted={() => { setLateCountTarget(null); refreshAll(); }} />}
            {detailTarget && <ShiftDetailModal shift={detailTarget} onClose={() => setDetailTarget(null)} />}
        </div>
    );
}
