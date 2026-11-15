import { useEffect, useState } from 'react';
import { publicDeliveryService } from './api/publicDeliveryService';

// Restoran sitesindeki "Paket sipariş" düğmeleri: şirketin online siparişi açık en az bir şubesi varsa görünür (saat dışı
// ya da durdurulmuş olsa da; sipariş sayfası durumu kendisi anlatır). Sayfa başına bir istek: sonuç modülde saklanır.
let cached: Promise<boolean> | null = null;

function loadAvailability(): Promise<boolean> {
    cached ??= publicDeliveryService.getOnlineOrdering()
        .then(data => data.branches.length > 0 || data.state !== 'disabled')
        .catch(() => {
            cached = null;
            return false;
        });
    return cached;
}

export function useOnlineOrderingAvailable(): boolean {
    const [available, setAvailable] = useState(false);
    useEffect(() => {
        let cancelled = false;
        loadAvailability().then(value => { if (!cancelled) setAvailable(value); });
        return () => { cancelled = true; };
    }, []);
    return available;
}
