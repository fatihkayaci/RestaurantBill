import { useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * Müşteri sayfalarının ortak ürün görseli (masa QR menüsü ve sepeti, site menüsü ve sepeti). Görsel inene kadar kutu
 * yerinde durur ve hafifçe nabız atar (iskelet); boyutu ve en-boy oranı `className`'den gelir, görsel gelince kayma olmaz.
 * `eager`: ekranın üstündeki görseller (ilk vitrin, sepet satırları, ayrıntı fotoğrafı) beklemeden iner; `priority` en
 * önemli görseli (ayrıntı fotoğrafı) öne alır. Öteki görseller ekrana yaklaşınca iner (lazy) ve ayrı iş parçacığında
 * çözülür (decoding="async").
 */
export function SkeletonImg({ src, alt, className, eager = false, priority = false, onError }: {
    src: string; alt: string; className?: string; eager?: boolean; priority?: boolean; onError?: () => void;
}) {
    // Yüklenen adres tutulur: kaynak değişince iskelet yeniden görünür.
    const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
    const loaded = loadedSrc === src;
    return (
        <img
            src={src}
            alt={alt}
            loading={eager || priority ? 'eager' : 'lazy'}
            decoding={priority ? 'auto' : 'async'}
            fetchPriority={priority ? 'high' : undefined}
            onLoad={() => setLoadedSrc(src)}
            onError={onError}
            className={cn('block w-full bg-[var(--site-placeholder)] object-cover',
                !loaded && 'animate-pulse motion-reduce:animate-none', className)}
        />
    );
}
