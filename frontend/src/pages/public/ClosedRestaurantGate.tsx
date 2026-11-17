import { useEffect, useState, type ReactNode } from 'react';
import { publicApi } from '@/features/customerSite/api/publicService';

// Sahibi hesabı kapattıysa restoranın müşteri sayfaları (site, QR, rezervasyon, paket sipariş) yerine nötr bir ekran.
// Durum sayfa başına bir kez sorulur; sorulamazsa sayfa normal açılır (veri uçları kapalı restoranda zaten yanıt vermez).
let cached: Promise<boolean> | null = null;

function isClosed(): Promise<boolean> {
    cached ??= publicApi
        .get<{ closed: boolean }>('/status')
        .then(r => r.data.closed)
        .catch(() => false);
    return cached;
}

export default function ClosedRestaurantGate({ children }: { children: ReactNode }) {
    const [closed, setClosed] = useState<boolean | null>(null);

    useEffect(() => {
        let alive = true;
        isClosed().then(value => { if (alive) setClosed(value); });
        return () => { alive = false; };
    }, []);

    if (closed === null) return null;
    if (!closed) return <>{children}</>;

    return (
        <main className="flex min-h-screen items-center justify-center bg-[#F6F1EA] px-6 text-center text-[#2B2520]">
            <div className="max-w-sm">
                <h1 className="font-serif text-2xl font-bold">Bu restoran artık hizmet vermiyor</h1>
                <p className="mt-3 text-sm text-[#6B6158]">İlginiz için teşekkür ederiz.</p>
            </div>
        </main>
    );
}
