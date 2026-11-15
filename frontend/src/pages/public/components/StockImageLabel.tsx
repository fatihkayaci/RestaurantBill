import { cn } from '@/lib/utils';

/**
 * Hazır görsel kütüphanesinden seçilmiş (restoranın kendi fotoğrafı olmayan) görselin köşesindeki küçük not.
 * Görseli saran kutu `relative` olmalı.
 */
export function StockImageLabel({ className }: { className?: string }) {
    return (
        <span className={cn(
            'pointer-events-none absolute bottom-1.5 right-1.5 rounded bg-black/45 px-1.5 py-0.5 text-[10px] font-medium leading-tight text-white/90',
            className,
        )}>
            Temsili görsel
        </span>
    );
}
