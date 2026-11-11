import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { userService } from '@/features/users/api/userService';
import type { Shift } from '@/features/cashier/types';
import type { ShiftReport } from '@/features/reports/types';
import { cn } from '@/lib/utils';
import { formatAmount } from '@/lib/format';

interface Props {
    data: ShiftReport | null;
    loading: boolean;
    role: 'admin' | 'owner';
    showBranchSummary: boolean;
}

const REVIEW_PENDING = 1;
const REVIEW_REJECTED = 3;
const COUNT_NOT_COUNTED = 2;

const formatTL = (amount: number) => `₺${amount.toLocaleString('tr-TR')}`;

// Salt okunur rapor. Onay, sayım ve kapatma işleri Vardiyalar sayfasında.
export default function ShiftsTab({ data, loading, role, showBranchSummary }: Props) {
    const [userNames, setUserNames] = useState<Record<string, string>>({});
    const [onlyPending, setOnlyPending] = useState(false);

    useEffect(() => {
        // getUsersByRestaurantId giriş yapan kullanıcıyı hariç tutuyor; vardiyayı kendisi açıp
        // kapatmış olabileceğinden ayrıca ekleniyor.
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
    const requiresCount = (s: Shift) => s.status === 2 && s.countStatus === COUNT_NOT_COUNTED;
    const needsAttention = (s: Shift) => requiresOpeningReview(s) || requiresClosingReview(s) || requiresCount(s);

    const shifts = data?.shifts ?? [];
    const filtered = shifts.filter(s => !onlyPending || needsAttention(s));

    if (loading && !data) {
        return <div className="flex items-center justify-center h-64 text-sm text-muted-foreground">Yükleniyor...</div>;
    }

    return (
        <div className="space-y-4 mt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                    <p className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground">Sistem Kapattı</p>
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
                                <th className="text-left text-[11px] font-semibold tracking-widest uppercase text-muted-foreground px-4 py-3">Sistem Kapattı</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(data?.branchSummaries ?? []).length === 0 ? (
                                <tr><td colSpan={5} className="px-5 py-10 text-center text-sm text-muted-foreground">Bu aralıkta vardiya yok.</td></tr>
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
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer select-none">
                            <input type="checkbox" checked={onlyPending} onChange={e => setOnlyPending(e.target.checked)} className="rounded border-border accent-rb-gold" />
                            Sadece inceleme bekleyenler
                        </label>
                        {role === 'admin' && (
                            <Link to="/admin/shifts" className="inline-flex items-center gap-1 text-sm font-semibold text-rb-amber hover:underline">
                                Onay ve sayım için Vardiyalar sayfası <ArrowRight className="h-3.5 w-3.5" />
                            </Link>
                        )}
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
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.length === 0 ? (
                                    <tr><td colSpan={7} className="px-5 py-10 text-center text-sm text-muted-foreground">{onlyPending ? 'İnceleme bekleyen vardiya yok.' : 'Bu aralıkta vardiya yok.'}</td></tr>
                                ) : (
                                    filtered.map(s => {
                                        const isOpen = s.status === 1;
                                        const expected = isOpen ? s.expectedOpeningBalance : s.expectedClosingBalance;
                                        const counted = isOpen ? s.openingBalance : s.countedClosingBalance;
                                        const diff = isOpen ? s.openingDifference : s.difference;
                                        const hasDifference = diff !== null && diff !== undefined && diff !== 0;
                                        return (
                                            <tr key={s.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors align-top">
                                                <td className="px-5 py-3.5 font-medium text-foreground whitespace-nowrap">{s.cashRegisterName}</td>
                                                <td className="px-4 py-3.5 text-muted-foreground whitespace-nowrap">
                                                    {s.openedByUserName || userNames[s.openedByUserId] || '—'}
                                                    {s.closedByUserId && (<><br /><span className="text-xs">→ {userNames[s.closedByUserId] ?? '—'}</span></>)}
                                                    {!s.closedByUserId && s.closedBySystem && (<><br /><span className="text-xs">→ Sistem</span></>)}
                                                </td>
                                                <td className="px-4 py-3.5 text-muted-foreground whitespace-nowrap">
                                                    {new Date(s.openedAt).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                                    {s.closedAt && (<><br /><span className="text-xs">→ {new Date(s.closedAt).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span></>)}
                                                </td>
                                                <td className="px-4 py-3.5 text-right font-serif text-foreground whitespace-nowrap">
                                                    ₺{formatAmount(expected)}
                                                    <br />
                                                    <span className="text-[10px] font-sans uppercase tracking-wide text-muted-foreground">{isOpen ? 'açılış' : 'kapanış'}</span>
                                                </td>
                                                <td className="px-4 py-3.5 text-right font-serif text-foreground whitespace-nowrap">
                                                    {counted != null ? `₺${formatAmount(counted)}` : '—'}
                                                </td>
                                                <td className={cn('px-4 py-3.5 text-right font-serif whitespace-nowrap', !hasDifference ? 'text-muted-foreground' : diff! < 0 ? 'text-red-500' : 'text-rb-amber')}>
                                                    {hasDifference ? `₺${formatAmount(diff!)}` : '—'}
                                                </td>
                                                <td className="px-4 py-3.5">
                                                    <div className="flex flex-col gap-1 items-start">
                                                        <span className={cn('inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold', isOpen ? 'bg-rb-green-bg text-rb-green' : 'bg-rb-neutral-bg text-rb-neutral')}>
                                                            {isOpen ? 'Açık' : s.closedBySystem ? 'Sistem kapattı' : 'Kapalı'}
                                                        </span>
                                                        {requiresCount(s) && (
                                                            <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rb-amber-bg text-rb-amber">Sayım bekliyor</span>
                                                        )}
                                                        {s.openingDifference !== 0 && (
                                                            <span className={cn(
                                                                'inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold',
                                                                s.openingDifferenceReviewStatus === REVIEW_PENDING ? 'bg-rb-amber-bg text-rb-amber'
                                                                    : s.openingDifferenceReviewStatus === REVIEW_REJECTED ? 'bg-rb-red-bg text-red-500'
                                                                        : 'bg-rb-neutral-bg text-rb-neutral'
                                                            )}>
                                                                Açılış {s.openingDifferenceReviewStatus === REVIEW_PENDING ? 'onayı bekliyor' : s.openingDifferenceReviewStatus === REVIEW_REJECTED ? 'reddedildi' : 'onaylandı'}
                                                            </span>
                                                        )}
                                                        {hasDifference && !isOpen && (
                                                            <span className={cn(
                                                                'inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold',
                                                                s.closingDifferenceReviewStatus === REVIEW_PENDING ? 'bg-rb-amber-bg text-rb-amber'
                                                                    : s.closingDifferenceReviewStatus === REVIEW_REJECTED ? 'bg-rb-red-bg text-red-500'
                                                                        : 'bg-rb-neutral-bg text-rb-neutral'
                                                            )}>
                                                                Kapanış {s.closingDifferenceReviewStatus === REVIEW_PENDING ? 'onayı bekliyor' : s.closingDifferenceReviewStatus === REVIEW_REJECTED ? 'reddedildi' : 'onaylandı'}
                                                            </span>
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
                </>
            )}
        </div>
    );
}
