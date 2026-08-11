import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import axios from 'axios';
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { shiftService } from '@/features/cashier/api/shiftService';
import { userService } from '@/features/users/api/userService';
import type { Shift } from '@/features/cashier/types';
import { cn } from '@/lib/utils';

export default function ShiftsPage() {
    const [shifts, setShifts] = useState<Shift[]>([]);
    const [userNames, setUserNames] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [onlyPending, setOnlyPending] = useState(false);
    const [approveTarget, setApproveTarget] = useState<{ shift: Shift; type: 'opening' | 'closing' } | null>(null);
    const [approving, setApproving] = useState(false);

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

    useEffect(() => { refresh(); }, []);

    const requiresOpeningApproval = (s: Shift) => s.openingDifference !== 0 && !s.openingDifferenceApprovedAt;
    const requiresClosingApproval = (s: Shift) => s.status === 2 && !!s.difference && s.difference !== 0 && !s.closingDifferenceApprovedAt;
    const requiresAnyApproval = (s: Shift) => requiresOpeningApproval(s) || requiresClosingApproval(s);

    const filtered = onlyPending ? shifts.filter(requiresAnyApproval) : shifts;
    const pendingCount = shifts.filter(requiresAnyApproval).length;

    const handleApprove = async () => {
        if (!approveTarget) return;
        setApproving(true);
        try {
            if (approveTarget.type === 'opening') {
                await shiftService.approveOpeningDifference(approveTarget.shift.id);
                toast.success('Açılış farkı onaylandı, kasa bakiyesi güncellendi.');
            } else {
                await shiftService.approveDifference(approveTarget.shift.id);
                toast.success('Kapanış farkı onaylandı, kasa bakiyesi güncellendi.');
            }
            setApproveTarget(null);
            await refresh();
        } catch (err: unknown) {
            if (axios.isAxiosError(err)) {
                toast.error(err.response?.data?.error ?? 'Fark onaylanamadı.');
            }
        } finally {
            setApproving(false);
        }
    };

    return (
        <div className="space-y-5">
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-serif font-bold text-foreground">Vardiyalar</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        {shifts.length} vardiya{pendingCount > 0 && ` · ${pendingCount} onay bekliyor`}
                    </p>
                </div>
                <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer select-none">
                    <input
                        type="checkbox"
                        checked={onlyPending}
                        onChange={e => setOnlyPending(e.target.checked)}
                        className="rounded border-border"
                    />
                    Sadece onay bekleyenler
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
                                const openingPending = requiresOpeningApproval(s);
                                const closingPending = requiresClosingApproval(s);
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
                                                {isOpen && (
                                                    <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rb-green-bg text-rb-green">Açık</span>
                                                )}
                                                {!isOpen && !closingPending && (
                                                    <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rb-neutral-bg text-rb-neutral">
                                                        {hasDifference ? 'Kapanış Onaylandı' : 'Kapalı'}
                                                    </span>
                                                )}
                                                {closingPending && (
                                                    <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rb-amber-bg text-rb-amber">Kapanış Onayı Bekliyor</span>
                                                )}
                                                {openingPending && (
                                                    <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rb-amber-bg text-rb-amber">Açılış Onayı Bekliyor</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3.5 text-right">
                                            <div className="flex flex-col gap-1 items-end">
                                                {openingPending && (
                                                    <button
                                                        onClick={() => setApproveTarget({ shift: s, type: 'opening' })}
                                                        className="text-xs font-semibold text-rb-accent hover:opacity-80 transition-colors"
                                                    >
                                                        Açılışı Onayla
                                                    </button>
                                                )}
                                                {closingPending && (
                                                    <button
                                                        onClick={() => setApproveTarget({ shift: s, type: 'closing' })}
                                                        className="text-xs font-semibold text-rb-accent hover:opacity-80 transition-colors"
                                                    >
                                                        Kapanışı Onayla
                                                    </button>
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

            <AlertDialog open={approveTarget !== null} onOpenChange={open => !open && !approving && setApproveTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {approveTarget?.type === 'opening' ? 'Açılış farkını onayla' : 'Kapanış farkını onayla'}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {approveTarget && (
                                <>
                                    {approveTarget.shift.cashRegisterName} kasasında{' '}
                                    ₺{(approveTarget.type === 'opening' ? approveTarget.shift.openingDifference : approveTarget.shift.difference)?.toFixed(2)}{' '}
                                    tutarında {approveTarget.type === 'opening' ? 'açılış' : 'kapanış'} farkı var.
                                    Onaylarsanız kasa bakiyesi sayılan tutara göre düzeltilecek. Bu işlem geri alınamaz.
                                </>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={approving}>İptal</AlertDialogCancel>
                        <Button onClick={handleApprove} disabled={approving}>Onayla</Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
