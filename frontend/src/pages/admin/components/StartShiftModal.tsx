import { useEffect, useState } from 'react';
import { X, Info } from 'lucide-react';
import { toast } from 'sonner';
import { shiftService } from '@/features/cashier/api/shiftService';
import { userService } from '@/features/users/api/userService';
import type { ShiftStartCandidate } from '@/features/cashier/types';
import type { User } from '@/features/users/types';
import { getApiErrorMessage } from '@/lib/apiError';
import { formatAmount } from '@/lib/format';
import { cn } from '@/lib/utils';

interface Props {
    candidate: ShiftStartCandidate;
    onClose: () => void;
    onStarted: () => void;
}

const CASHIER_ROLE = 3;
const ADMIN_ROLE = 1;

// Yönetici vardiyayı ya kendi adına açar (butik yer: sahip = kasiyer) ya da bir kasiyer için açar;
// ikincisinde kasiyer girişte kapı görmeden kasasına düşer. Tasarım: canvas "Vardiyalar".
export default function StartShiftModal({ candidate, onClose, onStarted }: Props) {
    const [mode, setMode] = useState<'me' | 'for'>('me');
    const [staff, setStaff] = useState<User[]>([]);
    const [forUserId, setForUserId] = useState('');
    const [counted, setCounted] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        userService.getUsersByRestaurantId()
            .then(users => setStaff(users.filter(u => u.isActive && (u.role === CASHIER_ROLE || u.role === ADMIN_ROLE))))
            .catch(() => setStaff([]));
    }, []);

    const handleSubmit = async () => {
        let countedAmount: number | undefined;
        if (candidate.requiresCount) {
            countedAmount = parseFloat(counted.replace(',', '.'));
            if (counted.trim() === '' || Number.isNaN(countedAmount) || countedAmount < 0) {
                toast.error('Geçerli bir sayım tutarı girin.');
                return;
            }
        }
        if (mode === 'for' && !forUserId) {
            toast.error('Bir kasiyer seçin.');
            return;
        }
        setSubmitting(true);
        try {
            await shiftService.openShift(candidate.cashRegisterId, countedAmount, mode === 'for' ? forUserId : undefined);
            const who = mode === 'for' ? staff.find(u => u.id === forUserId)?.fullName : null;
            toast.success(who ? `${candidate.cashRegisterName} kasasında ${who} adına vardiya açıldı.` : `${candidate.cashRegisterName} kasasında vardiyan başladı.`);
            onStarted();
        } catch (err) {
            toast.error(getApiErrorMessage(err, 'Vardiya açılamadı.'));
        } finally {
            setSubmitting(false);
        }
    };

    const optionClass = (active: boolean) => cn(
        'flex items-start gap-3 rounded-xl border p-3.5 cursor-pointer transition-colors',
        active ? 'border-rb-gold bg-rb-gold-bg' : 'border-border bg-card hover:border-rb-gold/50'
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
            <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="flex items-start justify-between gap-3 px-6 pt-5 pb-4">
                    <div>
                        <h2 className="font-serif text-2xl font-bold text-foreground">Vardiya başlat</h2>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                            {candidate.cashRegisterName}
                            {candidate.expectedOpeningBalance != null && ` · açılış ₺${formatAmount(candidate.expectedOpeningBalance)} (kasa bakiyesi)`}
                        </p>
                    </div>
                    <button type="button" onClick={onClose} aria-label="Kapat" className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="space-y-4 px-6 pb-5">
                    <fieldset className="space-y-2.5">
                        <legend className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">Kim çalışacak?</legend>

                        <label className={optionClass(mode === 'me')}>
                            <input type="radio" name="who" checked={mode === 'me'} onChange={() => setMode('me')} className="mt-1 accent-rb-gold" />
                            <span className="flex flex-col gap-0.5">
                                <span className="text-sm font-semibold text-foreground">Ben çalışacağım</span>
                                <span className="text-[12.5px] leading-relaxed text-muted-foreground">Vardiya senin adına açılır. Masalar'dan ödeme alırken bu kasa kullanılır; kapanış sayımı da sana düşer.</span>
                            </span>
                        </label>

                        <label className={optionClass(mode === 'for')}>
                            <input type="radio" name="who" checked={mode === 'for'} onChange={() => setMode('for')} className="mt-1 accent-rb-gold" />
                            <span className="flex flex-1 flex-col gap-2">
                                <span className="flex flex-col gap-0.5">
                                    <span className="text-sm font-semibold text-foreground">Bir kasiyer için aç</span>
                                    <span className="text-[12.5px] leading-relaxed text-muted-foreground">Vardiya seçtiğin kişi adına açılır. Girişte kasa seçmez, sayım yapmaz, doğrudan ödeme almaya başlar.</span>
                                </span>
                                {mode === 'for' && (
                                    <select
                                        aria-label="Kasiyer"
                                        value={forUserId}
                                        onChange={e => setForUserId(e.target.value)}
                                        className="h-9 rounded-lg border border-border bg-background px-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                                    >
                                        <option value="">Kasiyer seç…</option>
                                        {staff.map(u => (
                                            <option key={u.id} value={u.id}>{u.fullName} · {u.role === CASHIER_ROLE ? 'kasiyer' : 'yönetici'}</option>
                                        ))}
                                    </select>
                                )}
                            </span>
                        </label>
                    </fieldset>

                    {candidate.requiresCount ? (
                        <div className="space-y-2 rounded-xl border border-rb-amber/40 bg-rb-amber-bg p-3.5">
                            <p className="text-sm font-semibold text-foreground">Önceki vardiya sayılmadan kapandı</p>
                            <p className="text-[12.5px] leading-relaxed text-muted-foreground">
                                {candidate.lastShiftOwnerName ? `${candidate.lastShiftOwnerName} adlı kişinin vardiyası` : 'Önceki vardiya'}
                                {candidate.lastClosedBySystem ? ' gün sonunda sistem tarafından' : ''} sayımsız kapandı.
                                Kasadaki nakdi say; bu sayım o vardiyaya yazılır, yeni vardiya bu tutarla başlar.
                            </p>
                            <label htmlFor="start-shift-count" className="block text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">Kasada sayılan nakit</label>
                            <input
                                id="start-shift-count"
                                type="number"
                                inputMode="decimal"
                                value={counted}
                                onChange={e => setCounted(e.target.value)}
                                placeholder="0,00"
                                className="w-full rounded-lg border border-border bg-background px-3 py-2 font-serif text-lg text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                            />
                        </div>
                    ) : (
                        <p className="flex items-start gap-2 rounded-lg bg-muted px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
                            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                            Açılış sayımı gerekmiyor: önceki vardiya sayımla kapandı, kasadaki nakit o tutar.
                        </p>
                    )}
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-border px-6 py-4">
                    <button type="button" onClick={onClose} disabled={submitting} className="rounded-lg border border-border px-4 py-2 text-sm text-foreground transition-colors hover:bg-muted">Vazgeç</button>
                    <button type="button" onClick={handleSubmit} disabled={submitting} className="rounded-lg bg-rb-gold px-4 py-2 text-sm font-semibold text-rb-gold-foreground transition-opacity hover:opacity-90 disabled:opacity-60">
                        {submitting ? 'Başlatılıyor…' : 'Vardiyayı başlat'}
                    </button>
                </div>
            </div>
        </div>
    );
}
