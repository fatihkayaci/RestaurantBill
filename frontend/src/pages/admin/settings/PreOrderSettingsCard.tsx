import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { onlineOrderingSettingsService } from '@/features/delivery/api/deliveryService';
import { getApiErrorMessage } from '@/lib/apiError';
import { NumberField, SettingsCard, SettingsRow, SettingsSkeleton } from './SettingsFields';
import { useSettingsDirty } from './settingsTabs';

interface PreOrder { enabled: boolean; leadMinutes: number; }

// Ayarlar → Rezervasyon: ön sipariş. Değerler online sipariş ayar kaydında durur (sunucuda ayrı uç yok). Bu yüzden
// kaydederken kaydın sunucudaki son hâli alınır ve yalnızca ön sipariş alanları değiştirilir; Online sipariş sekmesi de
// kaydederken ön sipariş alanlarını sunucudan alır. İki form birbirinin değişikliğini ezmez.
export default function PreOrderSettingsCard() {
    const [saved, setSaved] = useState<PreOrder | null>(null);
    const [draft, setDraft] = useState<PreOrder | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    const load = useCallback(() => {
        onlineOrderingSettingsService.getSettings()
            .then(s => {
                const value = { enabled: s.preOrderEnabled, leadMinutes: s.preOrderLeadMinutes };
                setSaved(value);
                setDraft(value);
                setLoadError(null);
            })
            .catch(err => setLoadError(getApiErrorMessage(err, 'Ön sipariş ayarı yüklenemedi.')));
    }, []);

    useEffect(() => { load(); }, [load]);

    const dirty = !!saved && !!draft && (saved.enabled !== draft.enabled || saved.leadMinutes !== draft.leadMinutes);
    useSettingsDirty('onsiparis', dirty);

    const save = async () => {
        if (!draft) return;
        const lead = draft.leadMinutes;
        if (!Number.isInteger(lead) || lead < 15 || lead > 1440) {
            toast.error('Ön sipariş süresi 15–1440 dakika arasında olmalı.');
            return;
        }
        setSaving(true);
        try {
            const latest = await onlineOrderingSettingsService.getSettings();
            const result = await onlineOrderingSettingsService.saveSettings({
                enabled: latest.enabled,
                days: latest.days,
                lastOrderMinutesBeforeClose: latest.lastOrderMinutesBeforeClose,
                defaultEtaMinutes: latest.defaultEtaMinutes,
                autoRejectAfterMinutes: latest.autoRejectAfterMinutes,
                maxOpenOrdersPerPhone: latest.maxOpenOrdersPerPhone,
                maxOrdersPerPhonePerDay: latest.maxOrdersPerPhonePerDay,
                acceptCash: latest.acceptCash,
                acceptCard: latest.acceptCard,
                // IBAN sonradan kaldırıldıysa eski açık ayar kaydı engellemesin.
                acceptIban: latest.acceptIban && latest.hasIban,
                requirePhoneVerification: latest.requirePhoneVerification,
                pickupEnabled: latest.pickupEnabled,
                pickupEtaMinutes: latest.pickupEtaMinutes,
                preOrderEnabled: draft.enabled,
                preOrderLeadMinutes: lead,
            });
            const value = { enabled: result.preOrderEnabled, leadMinutes: result.preOrderLeadMinutes };
            setSaved(value);
            setDraft(value);
            toast.success('Ön sipariş ayarı kaydedildi.');
        } catch (err) {
            toast.error(getApiErrorMessage(err, 'Ön sipariş ayarı kaydedilemedi.'));
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
        <SettingsCard title="Rezervasyon ön siparişi">
            <SettingsRow label="Ön sipariş" hint='Onaylı rezervasyonu olan müşteri, rezervasyon bağlantısından önceden sipariş verebilir. Sipariş misafir gelince ("Geldi") mutfağa gider.'>
                <Switch checked={draft.enabled} onCheckedChange={enabled => setDraft({ ...draft, enabled })} aria-label="Ön sipariş"
                    label={<span className="w-12 text-xs text-muted-foreground">{draft.enabled ? 'Açık' : 'Kapalı'}</span>} />
            </SettingsRow>
            <NumberField label="Rezervasyondan kaç dakika önce açılsın" hint="15–1440."
                value={draft.leadMinutes} min={15} max={1440} disabled={!draft.enabled}
                onChange={leadMinutes => setDraft({ ...draft, leadMinutes })} />
            <div className="flex flex-wrap items-center justify-end gap-3 border-t border-border pt-3">
                {dirty && <span className="text-sm text-muted-foreground">Kaydedilmemiş değişiklik var</span>}
                <button type="button" onClick={() => setDraft(saved)} disabled={!dirty || saving}
                    className="rounded-lg border border-border px-4 py-2 text-sm text-foreground transition-colors hover:bg-muted disabled:opacity-40">Geri al</button>
                <button type="button" onClick={save} disabled={!dirty || saving}
                    className="rounded-lg bg-rb-gold px-4 py-2 text-sm font-semibold text-rb-gold-foreground transition-opacity hover:opacity-90 disabled:opacity-50">
                    {saving ? 'Kaydediliyor…' : 'Kaydet'}
                </button>
            </div>
        </SettingsCard>
    );
}
