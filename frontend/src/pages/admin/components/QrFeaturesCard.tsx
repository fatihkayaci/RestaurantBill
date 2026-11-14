import { useEffect, useState } from 'react';
import { QrCode } from 'lucide-react';
import { toast } from 'sonner';
import { qrFeaturesService } from '@/features/branches/api/qrFeaturesService';
import type { QrFeatures } from '@/features/customerSite/types';
import { SwitchTrack } from '@/components/ui/switch';
import { getApiErrorMessage } from '@/lib/apiError';

const OPTIONS: { key: keyof QrFeatures; title: string; description: string }[] = [
    {
        key: 'orderingEnabled',
        title: 'Sipariş ver',
        description: 'Müşteri menüden sepet doldurup garsona gönderir; garson onaylayınca mutfağa gider. Kapalıysa menü yalnızca görüntülenir.',
    },
    {
        key: 'callWaiterEnabled',
        title: 'Garson çağır',
        description: 'Masaya bakan garsonlara sesli uyarı gider. Aynı masadan en fazla dakikada bir.',
    },
    {
        key: 'billRequestEnabled',
        title: 'Hesap iste',
        description: 'Masanın açık hesabı için kasaya ve garsonlara "hesap istendi" bildirimi gider.',
    },
    {
        key: 'deliveryLinkEnabled',
        title: 'Paket servis bağlantısı',
        description: 'Online paket sipariş sayfasına bağlantı. Yalnızca şube online sipariş alırken görünür.',
    },
    {
        key: 'reservationLinkEnabled',
        title: 'Rezervasyon bağlantısı',
        description: 'Rezervasyon sayfasına bağlantı. Yalnızca online rezervasyon açıkken görünür.',
    },
];

// Masadaki QR kodun açtığı karşılama ekranında hangi düğmelerin görüneceği. Her anahtar anında kaydedilir;
// kapalı özellik müşteriye hiç gösterilmez ve sunucu da isteği reddeder.
export default function QrFeaturesCard() {
    const [features, setFeatures] = useState<QrFeatures | null>(null);
    const [saving, setSaving] = useState<keyof QrFeatures | null>(null);

    useEffect(() => {
        qrFeaturesService.get()
            .then(setFeatures)
            .catch(() => toast.error('QR menü özellikleri alınamadı.'));
    }, []);

    const toggle = async (key: keyof QrFeatures) => {
        if (!features || saving) return;
        const previous = features;
        const next = { ...features, [key]: !features[key] };
        setFeatures(next);
        setSaving(key);
        try {
            setFeatures(await qrFeaturesService.update(next));
        } catch (err) {
            setFeatures(previous);
            toast.error(getApiErrorMessage(err, 'QR menü özellikleri kaydedilemedi.'));
        } finally {
            setSaving(null);
        }
    };

    return (
        <section aria-labelledby="qr-features-title" className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-1.5 mb-1">
                <QrCode className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
                <h2 id="qr-features-title" className="text-xs font-bold text-muted-foreground uppercase tracking-widest">QR menü özellikleri</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
                Müşteri masadaki QR kodu okutunca önce bir karşılama ekranı görür. Bu şubede o ekranda hangi düğmelerin olacağını seçin; kapalı olanlar hiç görünmez.
            </p>
            {!features ? (
                <p className="text-sm text-muted-foreground">Yükleniyor...</p>
            ) : (
                <ul className="divide-y divide-border">
                    {OPTIONS.map(option => (
                        <li key={option.key}>
                            <button
                                type="button"
                                role="switch"
                                aria-checked={features[option.key]}
                                aria-describedby={`qr-feature-${option.key}`}
                                disabled={saving !== null}
                                onClick={() => toggle(option.key)}
                                className="flex w-full items-center justify-between gap-4 py-3 text-left disabled:opacity-60"
                            >
                                <span className="min-w-0">
                                    <span className="block text-sm font-semibold text-foreground">{option.title}</span>
                                    <span id={`qr-feature-${option.key}`} className="block text-xs text-muted-foreground mt-0.5">{option.description}</span>
                                </span>
                                <SwitchTrack checked={features[option.key]} />
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}
