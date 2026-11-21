import { useEffect, useState } from 'react';
import { QrCode } from 'lucide-react';
import { toast } from 'sonner';
import { qrFeaturesService } from '@/features/branches/api/qrFeaturesService';
import type { QrFeatures } from '@/features/customerSite/types';
import { SwitchTrack } from '@/components/ui/switch';
import { getApiErrorMessage } from '@/lib/apiError';

type Features = Required<QrFeatures>;

/** Eski sunucu bölüm anahtarlarını göndermezse varsayılanlar: öne çıkanlar açık, popüler kapalı. */
const normalize = (f: QrFeatures): Features => ({
    ...f,
    featuredSectionEnabled: f.featuredSectionEnabled ?? true,
    popularSectionEnabled: f.popularSectionEnabled ?? false,
});

const OPTIONS: { key: keyof Features; title: string; description: string }[] = [
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
    // Paket servis ve rezervasyon bağlantıları QR menüden kaldırıldı (masadan okunur); anahtarları sunucuda duruyor ama
    // burada gösterilmez. Masada paket isteği ürün başına "Paket olsun" ile verilir.
    {
        key: 'featuredSectionEnabled',
        title: 'Öne çıkanlar bölümü',
        description: "Ürünlerde 'Sitede ve QR menüde öne çıkar' işaretlediğiniz ürünler menünün başında büyük fotoğraflı gösterilir.",
    },
    {
        key: 'popularSectionEnabled',
        title: 'Popüler ürünler',
        description: 'Son 30 günde en çok satılan ürünler; yeterli satış yoksa görünmez.',
    },
];

// Masadaki QR kodun açtığı menü ekranında hangi düğme ve bölümlerin görüneceği. Her anahtar anında kaydedilir;
// kapalı özellik müşteriye hiç gösterilmez ve sunucu da isteği reddeder.
export default function QrFeaturesCard() {
    const [features, setFeatures] = useState<Features | null>(null);
    const [saving, setSaving] = useState<keyof Features | null>(null);

    useEffect(() => {
        qrFeaturesService.get()
            .then(f => setFeatures(normalize(f)))
            .catch(() => toast.error('QR menü özellikleri alınamadı.'));
    }, []);

    const toggle = async (key: keyof Features) => {
        if (!features || saving) return;
        const previous = features;
        const next = { ...features, [key]: !features[key] };
        setFeatures(next);
        setSaving(key);
        try {
            setFeatures(normalize(await qrFeaturesService.update(next)));
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
                Müşteri masadaki QR kodu okutunca doğrudan menü açılır. Bu şubede menüde hangi düğme ve bölümlerin olacağını seçin; kapalı olanlar hiç görünmez.
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
