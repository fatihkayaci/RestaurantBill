import { useCallback, useEffect, useRef } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { authService } from '@/features/auth/api/authService';
import { getSession, startSession } from '@/lib/auth';
import { getApiErrorMessage } from '@/lib/apiError';
import IbanSettingsCard from './components/IbanSettingsCard';
import QrFeaturesCard from './components/QrFeaturesCard';
import RestaurantInfoTab from './settings/RestaurantInfoTab';
import OnlineOrderingSettingsTab from './settings/OnlineOrderingSettingsTab';
import ReservationSettingsTab from './settings/ReservationSettingsTab';
import { isSettingsTab, SETTINGS_TABS, SettingsDirtyContext, settingsPath, type SettingsTabKey } from './settings/settingsTabs';

const UNSAVED_WARNING = 'Kaydedilmemiş değişiklikler var. Sekmeyi değiştirirsen kaybolacak. Devam edilsin mi?';

// Şubenin tüm ayarları tek sayfada, sekmelerle. Sekme adreste (?sekme=…) tutulur; bağlantıyla doğrudan açılabilir.
// Her sekme kendi Kaydet'iyle ayrı kaydeder. Sekmeden çıkınca içerik kapanır, bu yüzden kaydedilmemiş değişiklik
// varken sekme değiştirmek (ve sayfayı kapatmak) onay ister.
export default function SettingsPage() {
    const [params, setParams] = useSearchParams();
    const sekmeParam = params.get('sekme');
    const tab: SettingsTabKey = isSettingsTab(sekmeParam) ? sekmeParam : 'restoran';

    const dirtyForms = useRef(new Set<string>());
    const reportDirty = useCallback((key: string, dirty: boolean) => {
        if (dirty) dirtyForms.current.add(key);
        else dirtyForms.current.delete(key);
    }, []);

    useEffect(() => {
        const onBeforeUnload = (e: BeforeUnloadEvent) => {
            if (dirtyForms.current.size > 0) e.preventDefault();
        };
        window.addEventListener('beforeunload', onBeforeUnload);
        return () => window.removeEventListener('beforeunload', onBeforeUnload);
    }, []);

    const changeTab = (value: string) => {
        if (value === tab || !isSettingsTab(value)) return;
        if (dirtyForms.current.size > 0 && !window.confirm(UNSAVED_WARNING)) return;
        setParams({ sekme: value });
    };

    return (
        <SettingsDirtyContext.Provider value={reportDirty}>
            <div className="flex flex-col gap-4">
                <div>
                    <h1 className="text-2xl font-serif font-bold text-foreground">Ayarlar</h1>
                    <p className="mt-0.5 text-sm text-muted-foreground">Şubenin tüm ayarları. Her sekme kendi Kaydet düğmesiyle kaydedilir.</p>
                </div>

                <Tabs value={tab} onValueChange={changeTab}>
                    {/* Telefonda sekmeler yana kayar. */}
                    <div className="-mx-6 overflow-x-auto px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                        <TabsList className="justify-start [&>[data-slot=tabs-trigger]]:flex-none [&>[data-slot=tabs-trigger]]:px-3">
                            {SETTINGS_TABS.map(t => <TabsTrigger key={t.key} value={t.key}>{t.label}</TabsTrigger>)}
                        </TabsList>
                    </div>

                    <TabsContent value="restoran" className="mt-3"><RestaurantInfoTab /></TabsContent>
                    <TabsContent value="odeme" className="mt-3 max-w-3xl"><IbanSettingsCard /></TabsContent>
                    <TabsContent value="qr" className="mt-3 max-w-3xl"><QrFeaturesCard /></TabsContent>
                    <TabsContent value="online" className="mt-3"><OnlineOrderingSettingsTab /></TabsContent>
                    <TabsContent value="rezervasyon" className="mt-3"><ReservationSettingsTab /></TabsContent>
                </Tabs>

                {getSession()?.role === 'Owner' && <DataDeletionHint />}
            </div>
        </SettingsDirtyContext.Provider>
    );
}

// Eski ayar adresleri (/admin/online-ordering?tab=…, /admin/restaurant) Ayarlar'daki sekmeye yönlenir.
export function LegacySettingsRedirect({ sekme }: { sekme: SettingsTabKey }) {
    const [params] = useSearchParams();
    return <Navigate to={settingsPath(sekme, params.get('tab') ?? undefined)} replace />;
}

// "Verileri sil" şirket geneli bir sayfadır (Tümü modu); şube ayarlarında yalnızca oraya giden kısa bir yol var.
function DataDeletionHint() {
    const goToCompanyData = async () => {
        try {
            const token = await authService.switchBranch(null);
            startSession(token);
            window.location.assign('/owner/data');
        } catch (err) {
            toast.error(getApiErrorMessage(err, 'Tümü görünümüne geçilemedi.'));
        }
    };

    return (
        <p className="text-xs text-muted-foreground">
            Verileri silmek veya hesabı kapatmak için:{' '}
            <button type="button" onClick={goToCompanyData} className="font-medium text-foreground underline underline-offset-2 hover:text-rb-gold">
                Tümü → Verileri sil
            </button>
        </p>
    );
}
