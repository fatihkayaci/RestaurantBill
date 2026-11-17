import { useEffect, useState } from 'react';
import { publicDeliveryService } from './api/publicDeliveryService';
import { loadBranchChoice } from './deliveryCart';
import type { OnlineOrdering } from './types';

// Restoran sitesindeki "Paket sipariş" düğmeleri ve ana sayfanın sepeti: şirketin online siparişi açık en az bir şubesi
// varsa görünür (saat dışı ya da durdurulmuş olsa da; sipariş sayfası durumu kendisi anlatır). Sayfa başına bir istek:
// sonuç modülde saklanır. Bu cihazda daha önce bir şube seçildiyse (/siparis) o şubenin menüsü ve sepeti kullanılır.
let cached: Promise<OnlineOrdering | null> | null = null;

export function loadOnlineOrdering(): Promise<OnlineOrdering | null> {
    cached ??= (async () => {
        const saved = loadBranchChoice();
        let data = await publicDeliveryService.getOnlineOrdering(saved ?? undefined);
        // Kayıtlı şube artık online sipariş almıyorsa varsayılan şube (sipariş sayfasıyla aynı kural).
        if (saved && data.branches.length > 0 && !data.branches.some(b => b.id === saved)) {
            data = await publicDeliveryService.getOnlineOrdering();
        }
        return data;
    })().catch(() => {
        cached = null;
        return null;
    });
    return cached;
}

export function isOnlineOrderingAvailable(data: OnlineOrdering | null): boolean {
    return !!data && (data.branches.length > 0 || data.state !== 'disabled');
}

/** Online sipariş bilgisi (menü, saatler, mahalleler); yüklenene kadar ya da hata olursa null. */
export function useOnlineOrdering(): OnlineOrdering | null {
    const [data, setData] = useState<OnlineOrdering | null>(null);
    useEffect(() => {
        let cancelled = false;
        loadOnlineOrdering().then(value => { if (!cancelled) setData(value); });
        return () => { cancelled = true; };
    }, []);
    return data;
}

export function useOnlineOrderingAvailable(): boolean {
    return isOnlineOrderingAvailable(useOnlineOrdering());
}
