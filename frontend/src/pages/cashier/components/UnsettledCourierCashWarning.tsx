import type { ShiftCourierCash } from '@/features/cashier/types';
import { formatTL } from '@/lib/format';
import { cn } from '@/lib/utils';

interface Props {
    couriers?: ShiftCourierCash[];
    className?: string;
}

// Gün kapatırken: kuryelerin üzerinde kasaya teslim edilmemiş tahsilat varsa kurye kurye uyarır. Engellemez; kasiyer
// yine de kapatabilir (para ertesi gün "Kurye kasası"ndan teslim alınır).
export default function UnsettledCourierCashWarning({ couriers, className = 'mt-4' }: Props) {
    if (!couriers || couriers.length === 0) return null;

    return (
        <div role="alert" className={cn('rounded-lg bg-rb-amber-bg px-4 py-3', className)}>
            <p className="text-sm font-semibold text-rb-amber">Kuryelerde teslim alınmamış tahsilat var</p>
            <ul className="mt-1.5 flex flex-col gap-1">
                {couriers.map(c => (
                    <li key={c.courierUserId} className="flex items-center justify-between gap-3 text-sm text-rb-amber">
                        <span className="truncate">{c.fullName || 'Kurye'}</span>
                        <span className="shrink-0 tabular-nums">
                            {[
                                c.cashOrderCount > 0 ? `Nakit ${formatTL(c.cash)}` : null,
                                c.cardOrderCount > 0 ? `Kart ${formatTL(c.card)}` : null,
                            ].filter(Boolean).join(' · ')}
                        </span>
                    </li>
                ))}
            </ul>
            <p className="mt-1.5 text-xs text-rb-amber">
                Kapatmadan önce Kurye kasası'ndan teslim almanız önerilir. Yine de günü kapatabilirsiniz.
            </p>
        </div>
    );
}
