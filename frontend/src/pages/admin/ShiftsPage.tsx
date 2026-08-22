import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import axios from 'axios';
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { shiftService } from '@/features/cashier/api/shiftService';
import { userService } from '@/features/users/api/userService';
import type { Shift } from '@/features/cashier/types';
import { cn } from '@/lib/utils';

type ReviewTarget = { shift: Shift; type: 'opening' | 'closing'; action: 'approve' | 'reject' };

const REVIEW_PENDING = 1;
const REVIEW_REJECTED = 3;

export default function ShiftsPage() {
    const [shifts, setShifts] = useState<Shift[]>([]);
    const [userNames, setUserNames] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [onlyPending, setOnlyPending] = useState(false);
    const [reviewTarget, setReviewTarget] = useState<ReviewTarget | null>(null);
    const [rejectNote, setRejectNote] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const refresh = async () => {
        try {
            const [shiftData, userData] = await Promise.all([
                shiftService.getAll(),
                userService.getUsersByRestaurantId(),
            ]);
            setShifts(shiftData);
            setUserNames(Object.fromEntries(userData.map(u => [u.id, u.fullName])));
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // eslint-disable-next-line react-hooks/set-state-in-effect -- refresh() is async; its setState calls happen after the await, not synchronously.
    useEffect(() => { refresh(); }, []);

    const requiresOpeningReview = (s: Shift) => s.openingDifference !== 0 && s.openingDifferenceReviewStatus === REVIEW_PENDING;
    const requiresClosingReview = (s: Shift) => s.status === 2 && !!s.difference && s.difference !== 0 && s.closingDifferenceReviewStatus === REVIEW_PENDING;
    const requiresAnyReview = (s: Shift) => requiresOpeningReview(s) || requiresClosingReview(s);

    const filtered = onlyPending ? shifts.filter(requiresAnyReview) : shifts;
    const pendingCount = shifts.filter(requiresAnyReview).length;

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
            await refresh();
        } catch (err: unknown) {
            if (axios.isAxiosError(err)) {
                toast.error(err.response?.data?.error ?? 'İşlem gerçekleştirilemedi.');
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-5">
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-serif font-bold text-foreground">Vardiyalar</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        {shifts.length} vardiya{pendingCount > 0 && ` · ${pendingCount} inceleme bekliyor`}
                    </p>
                </div>
                <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer select-none">
                    <input
                        type="checkbox"
                        checked={onlyPending}
                        onChange={e => setOnlyPending(e.target.checked)}
                        className="rounded border-border"
                    />
                    Sadece inceleme bekleyenler
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
                        {loading ? (
                            <tr>
                                <td colSpan={8} className="px-5 py-10 text-center text-sm text-muted-foreground">Yükleniyor...</td>
                            </tr>
                        ) : filtered.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="px-5 py-10 text-center text-sm text-muted-foreground">Vardiya bulunamadı.</td>
                            </tr>
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
                                            {s.closedByUserId && (
                                                <>
                                                    <br />
                                                    <span className="text-xs">→ {userNames[s.closedByUserId] ?? '—'}</span>
                                                </>
                                            )}
                                        </td>
                                        <td className="px-4 py-3.5 text-muted-foreground whitespace-nowrap">
                                            {new Date(s.openedAt).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                            {s.closedAt && (
                                                <>
                                                    <br />
                                                    <span className="text-xs">→ {new Date(s.closedAt).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                                                </>
                                            )}
                                        </td>
                                        <td className="px-4 py-3.5 text-right font-serif text-foreground whitespace-nowrap">
                                            ₺{expected.toFixed(2)}
                                            <br />
                                            <span className="text-[10px] font-sans uppercase tracking-wide text-muted-foreground">
                                                {isOpen ? 'açılış' : 'kapanış'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3.5 text-right font-serif text-foreground whitespace-nowrap">
                                            {counted != null ? `₺${counted.toFixed(2)}` : '—'}
                                        </td>
                                        <td className={cn(
                                            "px-4 py-3.5 text-right font-serif whitespace-nowrap",
                                            !hasDifference ? "text-muted-foreground" : diff! < 0 ? "text-red-500" : "text-rb-amber"
                                        )}>
                                            {hasDifference ? `₺${diff!.toFixed(2)}` : '—'}
                                        </td>
                                        <td className="px-4 py-3.5">
                                            <div className="flex flex-col gap-1 items-start">
                                                <span className={cn(
                                                    "inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold",
                                                    isOpen ? "bg-rb-green-bg text-rb-green" : "bg-rb-neutral-bg text-rb-neutral"
                                                )}>
                                                    {isOpen ? 'Açık' : 'Kapalı'}
                                                </span>
                                                {s.openingDifference !== 0 && (
                                                    <span className={cn(
                                                        "inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold",
                                                        s.openingDifferenceReviewStatus === REVIEW_PENDING ? "bg-rb-amber-bg text-rb-amber"
                                                            : s.openingDifferenceReviewStatus === REVIEW_REJECTED ? "bg-rb-red-bg text-red-500"
                                                                : "bg-rb-neutral-bg text-rb-neutral"
                                                    )}>
                                                        Açılış {s.openingDifferenceReviewStatus === REVIEW_PENDING ? 'Onayı Bekliyor' : s.openingDifferenceReviewStatus === REVIEW_REJECTED ? 'Reddedildi' : 'Onaylandı'}
                                                    </span>
                                                )}
                                                {hasDifference && !isOpen && (
                                                    <span className={cn(
                                                        "inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold",
                                                        s.closingDifferenceReviewStatus === REVIEW_PENDING ? "bg-rb-amber-bg text-rb-amber"
                                                            : s.closingDifferenceReviewStatus === REVIEW_REJECTED ? "bg-rb-red-bg text-red-500"
                                                                : "bg-rb-neutral-bg text-rb-neutral"
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
                                                        <button
                                                            onClick={() => openReviewDialog(s, 'opening', 'approve')}
                                                            className="text-xs font-semibold text-rb-accent hover:opacity-80 transition-colors"
                                                        >
                                                            Açılışı Onayla
                                                        </button>
                                                        <button
                                                            onClick={() => openReviewDialog(s, 'opening', 'reject')}
                                                            className="text-xs font-semibold text-red-500 hover:opacity-80 transition-colors"
                                                        >
                                                            Reddet
                                                        </button>
                                                    </div>
                                                )}
                                                {closingPending && (
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => openReviewDialog(s, 'closing', 'approve')}
                                                            className="text-xs font-semibold text-rb-accent hover:opacity-80 transition-colors"
                                                        >
                                                            Kapanışı Onayla
                                                        </button>
                                                        <button
                                                            onClick={() => openReviewDialog(s, 'closing', 'reject')}
                                                            className="text-xs font-semibold text-red-500 hover:opacity-80 transition-colors"
                                                        >
                                                            Reddet
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
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
                            <label className="text-xs text-muted-foreground uppercase tracking-wide mb-1.5 block">
                                Not (opsiyonel)
                            </label>
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
                        <Button
                            onClick={handleConfirmReview}
                            disabled={submitting}
                            variant={reviewTarget?.action === 'reject' ? 'destructive' : 'default'}
                        >
                            {reviewTarget?.action === 'approve' ? 'Onayla' : 'Reddet'}
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
