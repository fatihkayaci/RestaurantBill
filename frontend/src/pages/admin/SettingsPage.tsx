import { useCallback, useEffect, useRef } from 'react';
import { Link, Navigate, useBlocker, useSearchParams, type BlockerFunction } from 'react-router-dom';
import { toast } from 'sonner';
import {
    AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { authService } from '@/features/auth/api/authService';
import { getSession, startSession } from '@/lib/auth';
import { isSingleBranchOwner, useMyBranches } from '@/features/branches/useMyBranches';
import { getApiErrorMessage } from '@/lib/apiError';
import IbanSettingsCard from './components/IbanSettingsCard';
import QrFeaturesCard from './components/QrFeaturesCard';
import RestaurantInfoTab from './settings/RestaurantInfoTab';
import OnlineOrderingSettingsTab from './settings/OnlineOrderingSettingsTab';
import ReservationSettingsTab from './settings/ReservationSettingsTab';
import SiteInfoTab from './settings/SiteInfoTab';
import { isSettingsTab, SETTINGS_TABS, SettingsDirtyContext, settingsPath, type SettingsTabKey } from './settings/settingsTabs';

// Şubenin tüm ayarları tek sayfada, sekmelerle. Sekme adreste (?sekme=…) tutulur; bağlantıyla doğrudan açılabilir.
// Her sekme kendi Kaydet'iyle ayrı kaydeder. Sekmeden çıkınca içerik kapanır, bu yüzden kaydedilmemiş değişiklik
// varken sekme değiştirmek, uygulama içinde başka sayfaya gitmek (menü, bağlantı, geri tuşu) onay ister (useBlocker);
// sayfayı yenilemek/kapatmak tarayıcının kendi uyarısını açar. Aynı sekmenin alt bölümleri (?bolum=) engellenmez:
// form aynı kalır, Teslimat bölgeleri kendi onayını sorar.
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

    // Kirli form varken sayfa ya da ayar sekmesi değişiyorsa durdur; karar gidiş anında ref'ten okunur.
    const shouldBlock = useCallback<BlockerFunction>(({ currentLocation, nextLocation }) => {
        if (dirtyForms.current.size === 0) return false;
        if (currentLocation.pathname !== nextLocation.pathname) return true;
        const tabOf = (search: string) => {
            const value = new URLSearchParams(search).get('sekme');
            return isSettingsTab(value) ? value : 'restoran';
        };
        return tabOf(currentLocation.search) !== tabOf(nextLocation.search);
    }, []);
    const blocker = useBlocker(shouldBlock);

    const changeTab = (value: string) => {
        if (value === tab || !isSettingsTab(value)) return;
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
                    <TabsContent value="saatler" className="mt-3"><SiteInfoTab /></TabsContent>
                    <TabsContent value="odeme" className="mt-3"><IbanSettingsCard /></TabsContent>
                    <TabsContent value="qr" className="mt-3"><QrFeaturesCard /></TabsContent>
                    <TabsContent value="online" className="mt-3"><OnlineOrderingSettingsTab /></TabsContent>
                    <TabsContent value="rezervasyon" className="mt-3"><ReservationSettingsTab /></TabsContent>
                </Tabs>

                {getSession()?.role === 'Owner' && <DataDeletionHint />}

                <AlertDialog open={blocker.state === 'blocked'} onOpenChange={open => { if (!open && blocker.state === 'blocked') blocker.reset(); }}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Kaydedilmemiş değişiklikler</AlertDialogTitle>
                            <AlertDialogDescription>
                                Bu sekmede kaydedilmemiş değişiklikler var. Buradan çıkarsanız kaybolacak.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Sekmede kal</AlertDialogCancel>
                            <Button variant="destructive" onClick={() => { if (blocker.state === 'blocked') blocker.proceed(); }}>
                                Değişiklikleri at
                            </Button>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
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
// Tek şubeli sahipte "Tümü" yok: sayfa şube kapsamında doğrudan açılır.
function DataDeletionHint() {
    const singleBranch = isSingleBranchOwner(getSession()?.role, useMyBranches());
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
            {singleBranch ? (
                <Link to="/owner/data" className="font-medium text-foreground underline underline-offset-2 hover:text-rb-gold">
                    Şirket → Verileri sil
                </Link>
            ) : (
                <button type="button" onClick={goToCompanyData} className="font-medium text-foreground underline underline-offset-2 hover:text-rb-gold">
                    Tümü → Verileri sil
                </button>
            )}
        </p>
    );
}
