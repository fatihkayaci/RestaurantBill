import { Package } from 'lucide-react';
import { cn } from '@/lib/utils';

// Müşteri QR menüde "Paket olsun" dediği kalemin rozeti: garsonun onay listesi, masa ekranları, kasa ve mutfak bileti.
// Küçük, dolgulu ve büyük harf; satırın adının hemen yanında durur.
export function TakeawayBadge({ className, size = 'sm' }: { className?: string; size?: 'sm' | 'lg' }) {
    return (
        <span className={cn('inline-flex shrink-0 items-center gap-1 rounded-md bg-rb-amber font-extrabold uppercase leading-none tracking-wide text-rb-amber-foreground align-middle',
            size === 'lg' ? 'px-2 py-1 text-sm' : 'px-1.5 py-0.5 text-[10px]', className)}>
            <Package className={size === 'lg' ? 'h-3.5 w-3.5' : 'h-3 w-3'} aria-hidden="true" />
            Paket
        </span>
    );
}
