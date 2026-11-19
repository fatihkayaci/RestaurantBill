import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { branchSiteInfoService, type BranchSiteInfo } from '@/features/branches/api/branchSiteInfoService';
import { getApiErrorMessage } from '@/lib/apiError';
import { inputClass } from '@/lib/formStyles';
import { cn } from '@/lib/utils';
import { WeeklyHoursEditor } from '../site/SiteSettingsEditors';
import { SettingsCard, SettingsSkeleton } from './SettingsFields';
import { useSettingsDirty } from './settingsTabs';

// Ayarlar → Saatler ve iletişim: restoran sitesinde bu şube seçilince görünen çalışma saatleri, saat notu, WhatsApp ve
// "nasıl gelinir". Sitenin geri kalanı (tasarım, yazılar, fotoğraflar) bütün şubelerde ortaktır ve sahibin "Tümü"
// modundaki Restoran sitesi sayfasından değişir. Kaydedince hemen yayında (taslak yok).

// Sınırlar backend (Branch / SiteContent) ile aynı.
const LIMITS = { hoursNote: 80, whatsapp: 20, directionsNote: 200 } as const;

function same(a: BranchSiteInfo, b: BranchSiteInfo): boolean {
    return JSON.stringify(a) === JSON.stringify(b);
}

function Field({ id, label, hint, children }: { id: string; label: string; hint?: string; children: ReactNode }) {
    return (
        <div className="flex flex-col gap-1.5">
            <label htmlFor={id} className="text-sm font-semibold text-foreground">{label}</label>
            {children}
            {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
        </div>
    );
}

export default function SiteInfoTab() {
    const [saved, setSaved] = useState<BranchSiteInfo | null>(null);
    const [draft, setDraft] = useState<BranchSiteInfo | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    const load = useCallback(() => {
        branchSiteInfoService.get()
            .then(info => { setSaved(info); setDraft(info); setLoadError(null); })
            .catch(err => setLoadError(getApiErrorMessage(err, 'Saatler ve iletişim bilgileri yüklenemedi.')));
    }, []);

    useEffect(() => { load(); }, [load]);

    const dirty = saved !== null && draft !== null && !same(saved, draft);
    useSettingsDirty('saatler', dirty);

    const set = (patch: Partial<BranchSiteInfo>) => setDraft(d => (d ? { ...d, ...patch } : d));

    const save = async () => {
        if (!draft) return;
        setSaving(true);
        try {
            const next = await branchSiteInfoService.update(draft);
            setSaved(next);
            setDraft(next);
            toast.success('Saatler ve iletişim bilgileri kaydedildi.');
        } catch (err) {
            toast.error(getApiErrorMessage(err, 'Kaydedilemedi.'));
        } finally {
            setSaving(false);
        }
    };

    if (loadError) {
        return (
            <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border border-rb-red/30 bg-rb-red-bg px-4 py-3">
                <p className="text-sm text-foreground">{loadError}</p>
                <button type="button" onClick={load} className="h-10 rounded-lg border border-border bg-card px-4 text-sm font-semibold">Tekrar dene</button>
            </div>
        );
    }
    if (!draft) return <SettingsSkeleton />;

    return (
        <div className="grid gap-4">
            <p className="text-sm text-muted-foreground">
                Restoran sitesinde bu şube seçildiğinde görünür ve hemen yayına girer. Sitenin tasarımı, yazıları ve fotoğrafları
                bütün şubelerde ortaktır; restoran sahibi “Tümü” görünümündeki Restoran sitesi sayfasından değiştirir.
            </p>

            <SettingsCard title="Çalışma saatleri">
                <WeeklyHoursEditor opensAt={draft.opensAt} closesAt={draft.closesAt} week={draft.weeklyHours}
                    onSingle={(opensAt, closesAt) => set({ opensAt, closesAt })}
                    onWeek={weeklyHours => set({ weeklyHours })} />
                <Field id="saat-notu" label="Saat notu" hint="Saatlerin altında küçük yazı.">
                    <input id="saat-notu" maxLength={LIMITS.hoursNote} value={draft.hoursNote} placeholder="Pazartesi kapalıyız."
                        onChange={e => set({ hoursNote: e.target.value })} className={inputClass} />
                </Field>
                <p className="text-xs text-muted-foreground">Rezervasyon ve online sipariş saatleri ayrıdır; kendi sekmelerinden değişir.</p>
            </SettingsCard>

            <SettingsCard title="İletişim">
                <Field id="whatsapp" label="WhatsApp numarası" hint="Sitede “WhatsApp” düğmesi olur; IBAN ile ödemede dekont bu numaraya gönderilir.">
                    <input id="whatsapp" type="tel" maxLength={LIMITS.whatsapp} value={draft.whatsappPhone} placeholder="0532 000 48 48"
                        onChange={e => set({ whatsappPhone: e.target.value })} className={cn(inputClass, 'max-w-xs')} />
                </Field>
                <Field id="yol" label="Nasıl gelinir" hint="Metro, otobüs, otopark: kısa bir tarif.">
                    <textarea id="yol" rows={3} maxLength={LIMITS.directionsNote} value={draft.directionsNote} placeholder="Kadıköy iskelesinden 12 dk yürüme."
                        onChange={e => set({ directionsNote: e.target.value })} className={cn(inputClass, 'resize-y')} />
                </Field>
            </SettingsCard>

            <div className="flex justify-end gap-2">
                {dirty && (
                    <button type="button" onClick={() => setDraft(saved)} disabled={saving}
                        className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted disabled:opacity-50">
                        Vazgeç
                    </button>
                )}
                <button type="button" onClick={save} disabled={!dirty || saving}
                    className="rounded-lg bg-rb-gold px-4 py-2 text-sm font-semibold text-rb-gold-foreground transition-opacity hover:opacity-90 disabled:opacity-50">
                    {saving ? 'Kaydediliyor…' : 'Kaydet'}
                </button>
            </div>
        </div>
    );
}
