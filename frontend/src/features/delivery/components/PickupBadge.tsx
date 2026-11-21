import { cn } from '@/lib/utils';

/** "GEL AL" rozeti: müşteri siparişi restorandan kendisi alır (kurye yok, adres yok). */
export default function PickupBadge({ className }: { className?: string }) {
    return (
        <span className={cn('inline-flex shrink-0 items-center rounded bg-rb-gold px-1.5 py-0.5 align-middle text-[10px] font-bold tracking-widest text-rb-gold-foreground', className)}>
            GEL AL
        </span>
    );
}
