import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { deliveryLateness } from '../deliveryStatus';
import { DeliveryStatus, type DeliveryOrder } from '../types';

function hhmm(date: Date): string {
    return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

// Müşteriye söz verilen teslim saatine göre rozet: yeşil zamanında, sarı son 5 dk, kırmızı gecikti.
// Teslim edilmiş siparişte teslim anına göre: "Zamanında" ya da "N dk geç".
export default function LatenessBadge({ order, now, className }: { order: DeliveryOrder; now: number; className?: string }) {
    const lateness = deliveryLateness(order, now);
    if (!lateness) return null;
    const delivered = order.status === DeliveryStatus.Delivered;
    const promised = hhmm(lateness.promisedAt);

    const text = delivered
        ? (lateness.level === 'late' ? `${lateness.minutes} dk geç teslim` : 'Zamanında teslim')
        : lateness.level === 'late'
            ? `${lateness.minutes} dk gecikti · söz ${promised}`
            : `${lateness.minutes} dk kaldı · söz ${promised}`;

    return (
        <span
            title={`Müşteriye söz verilen teslim saati ${promised}`}
            className={cn(
                'inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold tabular-nums',
                lateness.level === 'late' ? 'bg-rb-red text-rb-red-foreground'
                    : lateness.level === 'soon' ? 'bg-rb-amber-bg text-rb-amber'
                        : 'bg-rb-green-bg text-rb-green',
                delivered && lateness.level === 'late' && 'bg-rb-red-bg text-rb-red',
                className
            )}
        >
            <Clock className="h-3 w-3" aria-hidden="true" />
            {text}
        </span>
    );
}
