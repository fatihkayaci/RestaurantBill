import { useEffect, useState } from 'react';
import { Landmark } from 'lucide-react';
import { toast } from 'sonner';
import { paymentSettingsService } from '@/features/branches/api/paymentSettingsService';
import { getApiErrorMessage } from '@/lib/apiError';
import { formatIban, isValidTrIban, normalizeIban } from '@/lib/iban';
import { inputClass, labelClass } from '@/lib/formStyles';
import { cn } from '@/lib/utils';

// Kasada "IBAN" ile ödeme alınırken QR koda yazılan hesap. Boşsa kasiyer IBAN seçeneğini kullanamaz.
export default function IbanSettingsCard() {
    const [loaded, setLoaded] = useState(false);
    const [iban, setIban] = useState('');
    const [holder, setHolder] = useState('');
    const [saved, setSaved] = useState({ iban: '', holder: '' });
    const [errors, setErrors] = useState<{ iban?: string; holder?: string }>({});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        paymentSettingsService.get()
            .then(s => {
                setIban(s.iban ? formatIban(s.iban) : '');
                setHolder(s.accountHolderName);
                setSaved({ iban: s.iban, holder: s.accountHolderName });
            })
            .catch(() => toast.error('IBAN bilgisi alınamadı.'))
            .finally(() => setLoaded(true));
    }, []);

    const dirty = normalizeIban(iban) !== saved.iban || holder.trim() !== saved.holder;

    const save = async (nextIban: string, nextHolder: string) => {
        setSaving(true);
        try {
            const result = await paymentSettingsService.update(normalizeIban(nextIban), nextHolder.trim());
            setIban(result.iban ? formatIban(result.iban) : '');
            setHolder(result.accountHolderName);
            setSaved({ iban: result.iban, holder: result.accountHolderName });
            toast.success(result.iban ? 'IBAN kaydedildi. Kasada IBAN ile ödeme alınabilir.' : 'IBAN kaldırıldı.');
        } catch (err) {
            toast.error(getApiErrorMessage(err, 'IBAN kaydedilemedi.'));
        } finally {
            setSaving(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const next: { iban?: string; holder?: string } = {};
        const normalized = normalizeIban(iban);
        if (normalized || holder.trim()) {
            if (!isValidTrIban(normalized)) next.iban = 'Geçerli bir IBAN girin: TR ile başlayan 26 karakter.';
            if (!holder.trim()) next.holder = 'Hesap sahibinin adını girin.';
        }
        setErrors(next);
        if (next.iban || next.holder) return;
        save(iban, holder);
    };

    return (
        <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-1.5 mb-1">
                <Landmark className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
                <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">IBAN ile ödeme</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
                Kasiyer ödeme ekranında "IBAN"ı seçince bu hesap, tutar ve masa bilgisiyle birlikte QR kod olarak gösterilir. Havale gelince kasiyer onaylar; kasadaki nakde dokunmaz.
            </p>
            {!loaded ? (
                <p className="text-sm text-muted-foreground">Yükleniyor...</p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-[3fr_2fr] gap-4">
                    <div>
                        <label htmlFor="branch-iban" className={labelClass}>IBAN</label>
                        <input
                            id="branch-iban"
                            className={cn(inputClass, 'font-mono tracking-wide', errors.iban && 'border-destructive')}
                            placeholder="TR00 0000 0000 0000 0000 0000 00"
                            inputMode="text"
                            autoComplete="off"
                            maxLength={34}
                            value={iban}
                            onChange={e => setIban(e.target.value.toUpperCase())}
                            onBlur={() => { if (isValidTrIban(iban)) setIban(formatIban(iban)); }}
                            aria-invalid={!!errors.iban}
                        />
                        {errors.iban && <p className="text-xs text-destructive mt-1">{errors.iban}</p>}
                    </div>
                    <div>
                        <label htmlFor="branch-iban-holder" className={labelClass}>Hesap sahibi</label>
                        <input
                            id="branch-iban-holder"
                            className={cn(inputClass, errors.holder && 'border-destructive')}
                            placeholder="Ad Soyad / Şirket unvanı"
                            maxLength={70}
                            value={holder}
                            onChange={e => setHolder(e.target.value)}
                            aria-invalid={!!errors.holder}
                        />
                        {errors.holder && <p className="text-xs text-destructive mt-1">{errors.holder}</p>}
                    </div>
                    <div className="md:col-span-2 flex flex-wrap items-center justify-end gap-2">
                        {saved.iban && (
                            <button
                                type="button"
                                onClick={() => { setErrors({}); save('', ''); }}
                                disabled={saving}
                                className="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground hover:text-destructive hover:border-destructive/40 transition-colors disabled:opacity-50"
                            >
                                IBAN'ı kaldır
                            </button>
                        )}
                        <button
                            type="submit"
                            disabled={saving || !dirty}
                            className="rounded-lg bg-rb-gold px-4 py-2 text-sm font-semibold text-rb-gold-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
                        >
                            {saving ? 'Kaydediliyor...' : 'Kaydet'}
                        </button>
                    </div>
                </div>
            )}
        </form>
    );
}
