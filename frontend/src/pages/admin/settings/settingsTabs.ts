import { createContext, useContext, useEffect } from 'react';

// Ayarlar sayfasının sekmeleri. Adres: /admin/settings?sekme=<anahtar>[&bolum=<alt sekme>]
export const SETTINGS_TABS = [
    { key: 'restoran', label: 'Restoran' },
    { key: 'odeme', label: 'Ödeme' },
    { key: 'qr', label: 'QR menü' },
    { key: 'online', label: 'Online sipariş' },
    { key: 'rezervasyon', label: 'Rezervasyon' },
] as const;

export type SettingsTabKey = typeof SETTINGS_TABS[number]['key'];

export const isSettingsTab = (value: string | null): value is SettingsTabKey =>
    SETTINGS_TABS.some(t => t.key === value);

/** Ayarlar sayfasında bir sekmenin (ve isteğe bağlı alt bölümünün) adresi. */
export function settingsPath(sekme: SettingsTabKey, bolum?: string): string {
    const params = new URLSearchParams({ sekme });
    if (bolum) params.set('bolum', bolum);
    return `/admin/settings?${params.toString()}`;
}

// Sekme değiştirirken "kaydedilmemiş değişiklik" uyarısı için: her form kendi kirli durumunu bildirir.
// Sağlayıcı yoksa (form başka yerde kullanılırsa) hiçbir şey yapmaz.
export const SettingsDirtyContext = createContext<(key: string, dirty: boolean) => void>(() => {});

export function useSettingsDirty(key: string, dirty: boolean) {
    const report = useContext(SettingsDirtyContext);
    useEffect(() => {
        report(key, dirty);
        return () => report(key, false);
    }, [report, key, dirty]);
}
