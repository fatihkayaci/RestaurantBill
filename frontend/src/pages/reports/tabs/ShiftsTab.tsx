import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import axios from 'axios';
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { shiftService } from '@/features/cashier/api/shiftService';
import { userService } from '@/features/users/api/userService';
import type { Shift } from '@/features/cashier/types';
import type { ShiftReport } from '@/features/reports/types';
import { cn } from '@/lib/utils';
import CloseShiftModal from '@/pages/admin/components/CloseShiftModal';
import LateCountModal from '@/pages/admin/components/LateCountModal';
import ShiftDetailModal from '@/pages/admin/components/ShiftDetailModal';

interface Props {
    data: ShiftReport | null;
    loading: boolean;
    role: 'admin' | 'owner';
    showBranchSummary: boolean;
    onChanged: () => void;
}

type ReviewTarget = { shift: Shift; type: 'opening' | 'closing'; action: 'approve' | 'reject' };

const REVIEW_PENDING = 1;
const REVIEW_REJECTED = 3;
const COUNT_NOT_COUNTED = 2;

const formatTL = (amount: number) => `₺${amount.toLocaleString('tr-TR')}`;

export default function ShiftsTab({ data, loading, showBranchSummary, onChanged }: Props) {
    const [userNames, setUserNames] = useState<Record<string, string>>({});
    const [onlyPending, setOnlyPending] = useState(false);
    const [onlyUncounted, setOnlyUncounted] = useState(false);
    const [reviewTarget, setReviewTarget] = useState<ReviewTarget | null>(null);
    const [rejectNote, setRejectNote] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [closeTarget, setCloseTarget] = useState<Shift | null>(null);
    const [lateCountTarget, setLateCountTarget] = useState<Shift | null>(null);
    const [detailTarget, setDetailTarget] = useState<Shift | null>(null);

    useEffect(() => {
        // getUsersByRestaurantId giriş yapan kullanıcıyı listeden hariç tutuyor (StaffPage'in "diğer
        // çalışanlar" listesi için doğru); vardiyayı kendisi açıp kapatmış olabileceğinden ayrıca ekleniyor.
        Promise.all([userService.getUsersByRestaurantId(), userService.getCurrentUser()])
            .then(([users, currentUser]) => {
                const entries = users.map(u => [u.id, u.fullName] as const);
                entries.push([currentUser.id, currentUser.fullName]);
                setUserNames(Object.fromEntries(entries));
            })
            .catch(console.error);
    }, []);

    const requiresOpeningReview = (s: Shift) => s.openingDifference !== 0 && s.openingDifferenceReviewStatus === REVIEW_PENDING;
    const requiresClosingReview = (s: Shift) => s.status === 2 && !!s.difference && s.difference !== 0 && s.closingDifferenceReviewStatus === REVIEW_PENDING;
    const requiresAnyReview = (s: Shift) => requiresOpeningReview(s) || requiresClosingReview(s);
    const requiresCount = (s: Shift) => s.status === 2 && s.countStatus === COUNT_NOT_COUNTED;

    const shifts = data?.shifts ?? [];
    const filtered = shifts.filter(s => (!onlyPending || requiresAnyReview(s)) && (!onlyUncounted || requiresCount(s)));

    const openReviewDialog = (shift: Shift, type: 'opening' | 'closing', action: 'approve' | 'reject') => {
        setReviewTarget({ shift, type, action });
        setRejectNote('');
    };

    const handleConfirmReview = async () => {
        if (!reviewTarget) return;
        setSubmitting(true);
        try {
            const { shift, type, action } = reviewTarget;
            if (type === 'opening') {
                if (action === 'approve') {
                    await shiftService.approveOpeningDifference(shift.id);
                    toast.success('Açılış farkı onaylandı.');
                } else {
                    await shiftService.rejectOpeningDifference(shift.id, rejectNote || undefined);
                    toast.success('Açılış farkı reddedildi, kasa bakiyesi geri alındı.');
                }
            } else {
                if (action === 'approve') {
                    await shiftService.approveDifference(shift.id);
                    toast.success('Kapanış farkı onaylandı.');
                } else {
                    await shiftService.rejectDifference(shift.id, rejectNote || undefined);
                    toast.success('Kapanış farkı reddedildi, kasa bakiyesi geri alındı.');
                }
            }
            setReviewTarget(null);
            onChanged();
        } catch (err: unknown) {
            if (axios.isAxiosError(err)) {
                toast.error(err.response?.data?.error ?? 'İşlem gerçekleştirilemedi.');
            }
        } finally {
            setSubmitting(false);
        }
    };

    if (loading && !data) {
        return <div className="flex items-center justify-center h-64 text-sm text-muted-foreground">Yükleniyor...</div>;
    }

    return (
        <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-xl border border-border bg-card p-4">
                    <p className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground">Toplam Fark</p>
                    <p className={cn(
                        'text-2xl font-bold mt-2 font-serif',
                        (data?.totalDifference ?? 0) === 0 ? 'text-foreground' : (data?.totalDifference ?? 0) < 0 ? 'text-red-500' : 'text-rb-amber'
                    )}>
                        {formatTL(data?.totalDifference ?? 0)}
                    </p>
                </div>
                <div className="rounded-xl border border-border bg-card p-4">
                    <p className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground">Sayım Bekleyen</p>
                    <p className="text-2xl font-bold mt-2 font-serif text-foreground">{data?.uncountedCount ?? 0}</p>
                </div>
                <div className="rounded-xl border border-border bg-card p-4">
                    <p className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground">Otomatik Kapanan</p>
                    <p className="text-2xl font-bold mt-2 font-serif text-foreground">{data?.autoClosedCount ?? 0}</p>
                </div>
                <div className="rounded-xl border border-border bg-card p-4">
                    <p className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground">Onay Bekleyen</p>
                    <p className="text-2xl font-bold mt-2 font-serif text-foreground">{data?.pendingReviewCount ?? 0}</p>
                </div>
            </div>

            {showBranchSummary ? (
                <div className="rounded-xl border border-border bg-card overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border">
                                <th className="text-left text-[11px] font-semibold tracking-widest uppercase text-muted-foreground px-5 py-3">Şube</th>
                                <th className="text-left text-[11px] font-semibold tracking-widest uppercase text-muted-foreground px-4 py-3">Vardiya Sayısı</th>
                                <th className="text-left text-[11px] font-semibold tracking-widest uppercase text-muted-foreground px-4 py-3">Toplam Fark</th>
                                <th className="text-left text-[11px] font-semibold tracking-widest uppercase text-muted-foreground px-4 py-3">Sayım Bekleyen</th>
                                <th className="text-left text-[11px] font-semibold tracking-widest uppercase text-muted-foreground px-4 py-3">Otomatik Kapanan</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(data?.branchSummaries ?? []).length === 0 ? (
                                <tr><td colSpan={5} className="px-5 py-10 text-center text-sm text-muted-foreground">Vardiya bulunamadı.</td></tr>
                            ) : data!.branchSummaries.map(row => (
                                <tr key={row.branchId} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                                    <td className="px-5 py-3.5 font-medium text-foreground whitespace-nowrap">{row.branchName}</td>
                                    <td className="px-4 py-3.5 text-foreground">{row.shiftCount}</td>
                                    <td className={cn('px-4 py-3.5 font-serif', row.totalDifference === 0 ? 'text-muted-foreground' : row.totalDifference < 0 ? 'text-red-500' : 'text-rb-amber')}>
                                        {formatTL(row.totalDifference)}
                                    </td>
                                    <td className="px-4 py-3.5 text-foreground">{row.uncountedCount}</td>
                                    <td className="px-4 py-3.5 text-foreground">{row.autoClosedCount}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <>
                    <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer select-none">
                            <input type="checkbox" checked={onlyPending} onChange={e => setOnlyPending(e.target.checked)} className="rounded border-border" />
                            Sadece inceleme bekleyenler
                        </label>
                        <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer select-none">
                            <input type="checkbox" checked={onlyUncounted} onChange={e => setOnlyUncounted(e.target.checked)} className="rounded border-border" />
                            Sayım bekleyenler
                        </label>
                    </div>

                    <div className="rounded-xl border border-border bg-card overflow-hidden">
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
                                {filtered.length === 0 ? (
                                    <tr><td colSpan={8} className="px-5 py-10 text-center text-sm text-muted-foreground">Vardiya bulunamadı.</td></tr>
                                ) : (
                                    filtered.map(s => {
                                        const openingPending = requiresOpeningReview(s);
                                        const closingPending = requiresClosingReview(s);
                                        const isOpen = s.status === 1;
                                        const expected = isOpen ? s.expectedOpeningBalance : s.expectedClosingBalance;
                                        const counted = isOpen ? s.openingBalance : s.countedClosingBalance;
                                        const diff = isOpen ? s.openingDifference : s.difference;
                                        const hasDifference = diff !== null && diff !== undefined && diff !== 0;
                                        return (
                                            <tr key={s.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors align-top">
                                                <td className="px-5 py-3.5 font-medium text-foreground whitespace-nowrap">{s.cashRegisterName}</td>
                                                <td className="px-4 py-3.5 text-muted-foreground whitespace-nowrap">
                                                    {userNames[s.openedByUserId] ?? '—'}
                                                    {s.closedByUserId && (<><br /><span className="text-xs">→ {userNames[s.closedByUserId] ?? '—'}</span></>)}
                                                </td>
                                                <td className="px-4 py-3.5 text-muted-foreground whitespace-nowrap">
                                                    {new Date(s.openedAt).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                                    {s.closedAt && (<><br /><span className="text-xs">→ {new Date(s.closedAt).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span></>)}
                                                </td>
                                                <td className="px-4 py-3.5 text-right font-serif text-foreground whitespace-nowrap">
                                                    ₺{expected.toFixed(2)}
                                                    <br />
                                                    <span className="text-[10px] font-sans uppercase tracking-wide text-muted-foreground">{isOpen ? 'açılış' : 'kapanış'}</span>
                                                </td>
                                                <td className="px-4 py-3.5 text-right font-serif text-foreground whitespace-nowrap">
                                                    {counted != null ? `₺${counted.toFixed(2)}` : '—'}
                                                </td>
                                                <td className={cn('px-4 py-3.5 text-right font-serif whitespace-nowrap', !hasDifference ? 'text-muted-foreground' : diff! < 0 ? 'text-red-500' : 'text-rb-amber')}>
                                                    {hasDifference ? `₺${diff!.toFixed(2)}` : '—'}
                                                </td>
                                                <td className="px-4 py-3.5">
                                                    <div className="flex flex-col gap-1 items-start">
                                                        <span className={cn('inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold', isOpen ? 'bg-rb-green-bg text-rb-green' : 'bg-rb-neutral-bg text-rb-neutral')}>
                                                            {isOpen ? 'Açık' : 'Kapalı'}
                                                        </span>
                                                        {!isOpen && s.countStatus === COUNT_NOT_COUNTED && (
                                                            <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rb-amber-bg text-rb-amber">Sayım Bekliyor</span>
                                                        )}
                                                        {!isOpen && s.closedBySystem && (
                                                            <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rb-neutral-bg text-rb-neutral">Otomatik Kapandı</span>
                                                        )}
                                                        {s.openingDifference !== 0 && (
                                                            <span className={cn(
                                                                'inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold',
                                                                s.openingDifferenceReviewStatus === REVIEW_PENDING ? 'bg-rb-amber-bg text-rb-amber'
                                                                    : s.openingDifferenceReviewStatus === REVIEW_REJECTED ? 'bg-rb-red-bg text-red-500'
                                                                        : 'bg-rb-neutral-bg text-rb-neutral'
                                                            )}>
                                                                Açılış {s.openingDifferenceReviewStatus === REVIEW_PENDING ? 'Onayı Bekliyor' : s.openingDifferenceReviewStatus === REVIEW_REJECTED ? 'Reddedildi' : 'Onaylandı'}
                                                            </span>
                                                        )}
                                                        {hasDifference && !isOpen && (
                                                            <span className={cn(
                                                                'inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold',
                                                                s.closingDifferenceReviewStatus === REVIEW_PENDING ? 'bg-rb-amber-bg text-rb-amber'
                                                                    : s.closingDifferenceReviewStatus === REVIEW_REJECTED ? 'bg-rb-red-bg text-red-500'
                                                                        : 'bg-rb-neutral-bg text-rb-neutral'
                                                            )}>
                                                                Kapanış {s.closingDifferenceReviewStatus === REVIEW_PENDING ? 'Onayı Bekliyor' : s.closingDifferenceReviewStatus === REVIEW_REJECTED ? 'Reddedildi' : 'Onaylandı'}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3.5 text-right">
                                                    <div className="flex flex-col gap-1.5 items-end">
                                                        {openingPending && (
                                                            <div className="flex gap-2">
                                                                <button onClick={() => openReviewDialog(s, 'opening', 'approve')} className="text-xs font-semibold text-rb-accent hover:opacity-80 transition-colors">Açılışı Onayla</button>
                                                                <button onClick={() => openReviewDialog(s, 'opening', 'reject')} className="text-xs font-semibold text-red-500 hover:opacity-80 transition-colors">Reddet</button>
                                                            </div>
                                                        )}
                                                        {closingPending && (
                                                            <div className="flex gap-2">
                                                                <button onClick={() => openReviewDialog(s, 'closing', 'approve')} className="text-xs font-semibold text-rb-accent hover:opacity-80 transition-colors">Kapanışı Onayla</button>
                                                                <button onClick={() => openReviewDialog(s, 'closing', 'reject')} className="text-xs font-semibold text-red-500 hover:opacity-80 transition-colors">Reddet</button>
                                                            </div>
                                                        )}
                                                        {isOpen && (
                                                            <button onClick={() => setCloseTarget(s)} className="text-xs font-semibold text-rb-red hover:opacity-80 transition-colors">Günü Kapat</button>
                                                        )}
                                                        {requiresCount(s) && (
                                                            <button onClick={() => setLateCountTarget(s)} className="text-xs font-semibold text-rb-accent hover:opacity-80 transition-colors">Sayım Gir</button>
                                                        )}
                                                        <button onClick={() => setDetailTarget(s)} className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors">Detay</button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

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
                                    {reviewTarget.shift.cashRegisterName} kasasında{' '}
                                    ₺{(reviewTarget.type === 'opening' ? reviewTarget.shift.openingDifference : reviewTarget.shift.difference)?.toFixed(2)}{' '}
                                    tutarında {reviewTarget.type === 'opening' ? 'açılış' : 'kapanış'} farkı, kasiyer bildirdiği anda kasa bakiyesine zaten işlendi.{' '}
                                    {reviewTarget.action === 'approve'
                                        ? 'Onaylarsanız kasa bakiyesine ek bir işlem yapılmaz, sadece incelendiği kaydedilir.'
                                        : 'Reddederseniz kasa bakiyesi bu düzeltme öncesine geri alınır.'}
                                </>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    {reviewTarget?.action === 'reject' && (
                        <div className="px-1">
                            <label className="text-xs text-muted-foreground uppercase tracking-wide mb-1.5 block">Not (opsiyonel)</label>
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

            {closeTarget && <CloseShiftModal shift={closeTarget} onClose={() => setCloseTarget(null)} onClosed={() => { setCloseTarget(null); onChanged(); }} />}
            {lateCountTarget && <LateCountModal shift={lateCountTarget} onClose={() => setLateCountTarget(null)} onCounted={() => { setLateCountTarget(null); onChanged(); }} />}
            {detailTarget && <ShiftDetailModal shift={detailTarget} onClose={() => setDetailTarget(null)} />}
        </div>
    );
}
