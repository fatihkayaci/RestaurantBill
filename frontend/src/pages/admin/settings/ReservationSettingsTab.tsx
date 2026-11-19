import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { reservationSettingsService } from '@/features/customerSite/api/reservationSettingsService';
import type { ReservationRules } from '@/features/customerSite/types';
import { getApiErrorMessage } from '@/lib/apiError';
import { SettingsSkeleton } from './SettingsFields';
import ReservationRulesForm from './ReservationRulesForm';
import PreOrderSettingsCard from './PreOrderSettingsCard';

// Ayarlar → Rezervasyon: rezervasyon kuralları ve ön sipariş. İkisi ayrı kayıtlardır, her biri kendi Kaydet'iyle.
export default function ReservationSettingsTab() {
    const [rules, setRules] = useState<ReservationRules | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    // Kaydedince form yeni kuralla baştan kurulsun (taslak durumu sıfırlanır).
    const [formKey, setFormKey] = useState(0);

    const load = useCallback(() => {
        reservationSettingsService.get()
            .then(r => { setRules(r); setLoadError(null); })
            .catch(err => setLoadError(getApiErrorMessage(err, 'Rezervasyon ayarları yüklenemedi.')));
    }, []);

    useEffect(() => { load(); }, [load]);

    return (
        <div className="grid gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">Sitedeki rezervasyon saatleri, kuralları ve ön sipariş.</p>
                <Link to="/admin/reservations" className="flex h-10 items-center rounded-[10px] border border-border bg-card px-3.5 text-sm font-semibold text-foreground hover:border-rb-gold">
                    Rezervasyonlar
                </Link>
            </div>

            {loadError ? (
                <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border border-rb-red/30 bg-rb-red-bg px-4 py-3">
                    <p className="text-sm text-foreground">{loadError}</p>
                    <button type="button" onClick={load} className="h-10 rounded-lg border border-border bg-card px-4 text-sm font-semibold">Tekrar dene</button>
                </div>
            ) : !rules ? <SettingsSkeleton /> : (
                <ReservationRulesForm
                    key={formKey}
                    rules={rules}
                    onSaved={saved => { setRules(saved); setFormKey(k => k + 1); }}
                />
            )}

            <PreOrderSettingsCard />
        </div>
    );
}
