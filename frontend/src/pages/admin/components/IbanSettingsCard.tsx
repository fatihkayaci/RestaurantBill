import { useEffect, useRef, useState } from 'react';
import { Landmark } from 'lucide-react';
import { toast } from 'sonner';
import { SwitchTrack } from '@/components/ui/switch';
import { paymentSettingsService, type BranchPaymentSettings } from '@/features/branches/api/paymentSettingsService';
import { getApiErrorMessage } from '@/lib/apiError';
import { formatIban, isValidTrIban, normalizeIban, TR_IBAN_LENGTH } from '@/lib/iban';
import { inputClass, labelClass } from '@/lib/formStyles';
import { cn } from '@/lib/utils';
import { useSettingsDirty } from '../settings/settingsTabs';

const HOLDER_MAX = 100;
const BANK_MAX = 60;
const IBAN_ERROR = 'Geçerli bir IBAN girin: TR ile başlayan 26 karakter.';

interface Form {
    iban: string;
    holder: string;
    bank: string;
    showOnTable: boolean;
}

const fromSettings = (s: BranchPaymentSettings): Form => ({
    iban: s.iban ? formatIban(s.iban) : '',
    holder: s.accountHolderName,
    bank: s.bankName ?? '',
    showOnTable: !!s.showIbanOnTable,
});

/** Yazarken satır içi uyarı: tamamlanmamışsa yalnız alandan çıkınca, 26 karakterde hemen. */
function ibanProblem(value: string, touched: boolean): string | null {
    const iban = normalizeIban(value);
    if (!iban) return null;
    if (!iban.startsWith('TR') && iban.length >= 2) return 'Yalnız Türkiye IBAN\'ı (TR ile başlar).';
    if (/[^0-9]/.test(iban.slice(2))) return 'TR\'den sonra yalnız rakam olmalı.';
    if (iban.length > TR_IBAN_LENGTH) return IBAN_ERROR;
    if (iban.length === TR_IBAN_LENGTH) return isValidTrIban(iban) ? null : 'IBAN hatalı: kontrol haneleri tutmuyor. Rakamları kontrol edin.';
    return touched ? IBAN_ERROR : null;
}

// Şubenin IBAN'ı. Kasada "IBAN" ile ödeme alınırken QR koda yazılır; restoran isterse masa QR sayfasında "IBAN ile öde"
// olarak da gösterilir (varsayılan kapalı). Boşsa kasiyer IBAN seçeneğini kullanamaz ve QR'da hiçbir şey görünmez.
export default function IbanSettingsCard() {
    const [loaded, setLoaded] = useState(false);
    const [form, setForm] = useState<Form>({ iban: '', holder: '', bank: '', showOnTable: false });
    const [saved, setSaved] = useState<Form>({ iban: '', holder: '', bank: '', showOnTable: false });
    const [ibanTouched, setIbanTouched] = useState(false);
    const [errors, setErrors] = useState<{ iban?: string; holder?: string; show?: string }>({});
    const [saving, setSaving] = useState(false);
    const ibanInput = useRef<HTMLInputElement>(null);

    useEffect(() => {
        paymentSettingsService.get()
            .then(s => {
                const next = fromSettings(s);
                setForm(next);
                setSaved(next);
            })
            .catch(() => toast.error('IBAN bilgisi alınamadı.'))
            .finally(() => setLoaded(true));
    }, []);

    const normalized = normalizeIban(form.iban);
    const dirty = normalized !== normalizeIban(saved.iban) || form.holder.trim() !== saved.holder
        || form.bank.trim() !== saved.bank || form.showOnTable !== saved.showOnTable;
    useSettingsDirty('odeme', loaded && dirty);

    const accountReady = isValidTrIban(normalized) && form.holder.trim().length > 0;
    const liveIbanProblem = ibanProblem(form.iban, ibanTouched);

    // Yazarken 4'lü gruplar (TR00 0000 …); imleç, önündeki karakter sayısına göre yerinde kalır.
    const onIbanChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value;
        const caret = e.target.selectionStart ?? raw.length;
        const charsBefore = normalizeIban(raw.slice(0, caret)).length;
        const formatted = formatIban(raw);
        setForm(f => ({ ...f, iban: formatted, showOnTable: normalizeIban(formatted) ? f.showOnTable : false }));
        setErrors(prev => ({ ...prev, iban: undefined, show: undefined }));
        requestAnimationFrame(() => {
            const input = ibanInput.current;
            if (!input || document.activeElement !== input) return;
            let pos = 0;
            let seen = 0;
            while (pos < formatted.length && seen < charsBefore) {
                if (formatted[pos] !== ' ') seen++;
                pos++;
            }
            input.setSelectionRange(pos, pos);
        });
    };

    const save = async (next: Form) => {
        setSaving(true);
        try {
            const result = await paymentSettingsService.update({
                iban: normalizeIban(next.iban),
                accountHolderName: next.holder.trim(),
                bankName: next.bank.trim(),
                showIbanOnTable: next.showOnTable,
            });
            const fresh = fromSettings(result);
            setForm(fresh);
            setSaved(fresh);
            setIbanTouched(false);
            toast.success(!result.iban ? 'IBAN kaldırıldı.'
                : result.showIbanOnTable ? 'IBAN kaydedildi. Kasada ve masa QR\'ında IBAN ile ödeme açık.'
                    : 'IBAN kaydedildi. Kasada IBAN ile ödeme alınabilir.');
        } catch (err) {
            toast.error(getApiErrorMessage(err, 'IBAN kaydedilemedi.'));
        } finally {
            setSaving(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const next: { iban?: string; holder?: string; show?: string } = {};
        if (normalized || form.holder.trim()) {
            if (!isValidTrIban(normalized)) next.iban = ibanProblem(form.iban, true) ?? IBAN_ERROR;
            if (!form.holder.trim()) next.holder = 'Hesap sahibinin adını girin.';
        }
        if (form.showOnTable && !accountReady) next.show = 'QR menüde göstermek için önce geçerli bir IBAN ve hesap sahibi girin.';
        setErrors(next);
        setIbanTouched(true);
        if (next.iban || next.holder || next.show) return;
        save(form);
    };

    const ibanError = errors.iban ?? liveIbanProblem;

    return (
        <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-card p-5" noValidate>
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                        <label htmlFor="branch-iban" className={labelClass}>IBAN</label>
                        <input
                            id="branch-iban"
                            ref={ibanInput}
                            className={cn(inputClass, 'font-mono tracking-wide', ibanError && 'border-destructive')}
                            placeholder="TR00 0000 0000 0000 0000 0000 00"
                            inputMode="text"
                            autoComplete="off"
                            autoCapitalize="characters"
                            spellCheck={false}
                            maxLength={40}
                            value={form.iban}
                            onChange={onIbanChange}
                            onBlur={() => setIbanTouched(true)}
                            aria-invalid={!!ibanError}
                            aria-describedby={ibanError ? 'branch-iban-error' : undefined}
                        />
                        {ibanError ? (
                            <p id="branch-iban-error" className="text-xs text-destructive mt-1">{ibanError}</p>
                        ) : isValidTrIban(normalized) && (
                            <p className="text-xs text-muted-foreground mt-1">IBAN geçerli.</p>
                        )}
                    </div>
                    <div>
                        <label htmlFor="branch-iban-holder" className={labelClass}>Hesap sahibi</label>
                        <input
                            id="branch-iban-holder"
                            className={cn(inputClass, errors.holder && 'border-destructive')}
                            placeholder="Ad Soyad / Şirket unvanı"
                            maxLength={HOLDER_MAX}
                            value={form.holder}
                            onChange={e => { setForm(f => ({ ...f, holder: e.target.value })); setErrors(prev => ({ ...prev, holder: undefined, show: undefined })); }}
                            aria-invalid={!!errors.holder}
                        />
                        {errors.holder && <p className="text-xs text-destructive mt-1">{errors.holder}</p>}
                    </div>
                    <div>
                        <label htmlFor="branch-iban-bank" className={labelClass}>Banka (isteğe bağlı)</label>
                        <input
                            id="branch-iban-bank"
                            className={inputClass}
                            placeholder="Ör. Ziraat Bankası"
                            maxLength={BANK_MAX}
                            value={form.bank}
                            onChange={e => setForm(f => ({ ...f, bank: e.target.value }))}
                        />
                    </div>

                    {/* Masa QR sayfası: misafire IBAN'ı gösterme anahtarı (varsayılan kapalı). */}
                    <div className="md:col-span-2 rounded-lg border border-border p-4">
                        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">IBAN ile ödeme (QR menü)</h3>
                        <button
                            type="button"
                            role="switch"
                            aria-checked={form.showOnTable}
                            aria-describedby="iban-qr-help"
                            disabled={!form.showOnTable && !accountReady}
                            onClick={() => { setForm(f => ({ ...f, showOnTable: !f.showOnTable })); setErrors(prev => ({ ...prev, show: undefined })); }}
                            className="mt-2 flex min-h-11 w-full items-center justify-between gap-4 text-left disabled:opacity-60"
                        >
                            <span className="block text-sm font-semibold text-foreground">QR menüde "IBAN ile öde" göster</span>
                            <SwitchTrack checked={form.showOnTable} />
                        </button>
                        <p id="iban-qr-help" className="text-xs text-muted-foreground mt-1">
                            Misafir masadaki QR'dan IBAN'ı kopyalar, ödemeyi yapar ve dekontu WhatsApp'tan size gönderir. Ödemeyi hesabınızda görünce kasadan kapatın.
                        </p>
                        {!accountReady && !form.showOnTable && (
                            <p className="text-xs text-muted-foreground mt-1">Açmak için önce geçerli bir IBAN ve hesap sahibi girin.</p>
                        )}
                        {errors.show && <p className="text-xs text-destructive mt-1">{errors.show}</p>}
                    </div>

                    <div className="md:col-span-2 flex flex-wrap items-center justify-end gap-2">
                        {saved.iban && (
                            <button
                                type="button"
                                onClick={() => { setErrors({}); save({ iban: '', holder: '', bank: '', showOnTable: false }); }}
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
