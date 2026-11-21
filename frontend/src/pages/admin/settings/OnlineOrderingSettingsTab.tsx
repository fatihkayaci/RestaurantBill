import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ExternalLink } from 'lucide-react';
import {
    AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { deliveryService, onlineOrderingSettingsService } from '@/features/delivery/api/deliveryService';
import type { OnlineOrderDay, OnlineOrderSettings } from '@/features/delivery/types';
import { getApiErrorMessage } from '@/lib/apiError';
import DeliveryZonesTab from '../components/DeliveryZonesTab';
import BlockedPhonesTab from '../components/BlockedPhonesTab';
import { NumberField, SettingsCard as Card, SettingsRow as Row, SettingsSkeleton as Skeleton } from './SettingsFields';
import { AllDayPill, CopyToAllButton, TimeSelect } from './HoursFields';
import { DAY_MINUTES, timeOptions, toMinutes, toTime } from './hoursTime';
import { settingsPath, useSettingsDirty } from './settingsTabs';

const DAY_NAMES = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
/** Haftayı pazartesiden başlatarak gösterir. */
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const TABS = ['genel', 'saatler', 'bolgeler', 'engelli'] as const;
type TabKey = typeof TABS[number];

const TIME_STEP = 15;
// "24 saat" günün kaydı: 00:00–23:59. Sunucu bunu gün boyu açık sayar: son sipariş kesintisi uygulanmaz,
// ertesi gün de 24 saatse gece yarısında kapanmaz (DeliveryScope.EvaluateHours, OnlineOrderDayHours.IsAllDay).
const ALL_DAY = { opens: '00:00', closes: '23:59' };
const FALLBACK_HOURS = { opens: '11:00', closes: '22:00' };

const isAllDay = (d: OnlineOrderDay) => d.isOpen && d.opens === ALL_DAY.opens && d.closes === ALL_DAY.closes;

/** Günün kural hatası; seçiciler biçimi garantiler, burada asıl anlamsız aralık yakalanır. */
function dayError(d: OnlineOrderDay): string | null {
    if (!d.isOpen) return null;
    if (!/^\d{2}:\d{2}$/.test(d.opens) || !/^\d{2}:\d{2}$/.test(d.closes)) return 'Saatleri SS:DD biçiminde seçin.';
    if (d.opens === d.closes) return 'Açılış ve kapanış saati aynı olamaz.';
    return null;
}

/** Satırın altındaki özet: açık saatler ve son siparişin gerçekte ne zaman biteceği. */
function daySummary(d: OnlineOrderDay, lastOrderMinutes: number): string {
    if (!d.isOpen) return 'Bu gün online sipariş alınmaz.';
    if (isAllDay(d)) return 'Gün boyu açık (00:00 – 24:00), son sipariş kesintisi yok.';
    const opens = toMinutes(d.opens);
    let closes = toMinutes(d.closes);
    if (Number.isNaN(opens) || Number.isNaN(closes) || opens === closes) return '';
    if (closes < opens) closes += DAY_MINUTES;
    const lastOrder = closes - lastOrderMinutes;
    if (lastOrder <= opens) return 'Son sipariş süresi bu aralıktan uzun: bu gün sipariş alınmaz.';
    const nextDay = (m: number) => (m >= DAY_MINUTES ? ' (ertesi gün)' : '');
    const range = `${d.opens} – ${d.closes}${nextDay(closes)}`;
    return lastOrderMinutes > 0 ? `${range} · son sipariş ${toTime(lastOrder)}${nextDay(lastOrder)}` : range;
}

/** Kaydetmeden önce alanların sunucu kurallarına uygunluğu (aynı kurallar sunucuda da var). */
function validate(s: OnlineOrderSettings): string | null {
    const between = (v: number, min: number, max: number) => Number.isInteger(v) && v >= min && v <= max;
    if (!s.acceptCash && !s.acceptCard && !(s.acceptIban && s.hasIban)) return 'En az bir ödeme yöntemi (nakit, kart ya da IBAN) açık olmalı.';
    if (!between(s.defaultEtaMinutes, 10, 180)) return 'Varsayılan teslim süresi 10–180 dakika arasında olmalı.';
    if (s.pickupEnabled && !between(s.pickupEtaMinutes, 10, 180)) return 'Gel al hazır olma süresi 10–180 dakika arasında olmalı.';
    if (!between(s.autoRejectAfterMinutes, 3, 60)) return 'Otomatik ret süresi 3–60 dakika arasında olmalı.';
    if (!between(s.maxOpenOrdersPerPhone, 1, 10)) return 'Bir numaranın açık sipariş sınırı 1–10 arasında olmalı.';
    if (!between(s.maxOrdersPerPhonePerDay, 1, 50)) return 'Bir numaranın günlük sipariş sınırı 1–50 arasında olmalı.';
    if (s.maxOrdersPerPhonePerDay < s.maxOpenOrdersPerPhone) return 'Günlük sipariş sınırı açık sipariş sınırından küçük olamaz.';
    if (!between(s.lastOrderMinutesBeforeClose, 0, 120)) return 'Son sipariş süresi 0–120 dakika arasında olmalı.';
    for (const d of s.days) {
        const error = dayError(d);
        if (error) return `${DAY_NAMES[d.day]}: ${error.charAt(0).toLocaleLowerCase('tr-TR')}${error.slice(1)}`;
    }
    return null;
}

// Ayarlar → Online sipariş: şubenin paket sipariş ayarları. Genel ve Çalışma saatleri tek ayar kaydıdır (aynı Kaydet);
// bölgeler kendi tek "Kaydet" çubuğuyla, engelli numaralar her işlemde hemen kaydedilir. Alt sekme adreste:
// ?sekme=online&bolum=<anahtar>. Bölgelerde kaydedilmemiş değişiklik varken alt sekmeden çıkmak onay ister.
// Ön sipariş ayarı da aynı kayıtta durur ama Ayarlar → Rezervasyon'da düzenlenir; burası onu kaydederken
// sunucudaki güncel değeri gönderir, böylece iki form birbirinin değişikliğini ezmez.
export default function OnlineOrderingSettingsTab() {
    const [params, setParams] = useSearchParams();
    const tabParam = params.get('bolum') as TabKey | null;
    const tab: TabKey = tabParam && TABS.includes(tabParam) ? tabParam : 'genel';

    const [saved, setSaved] = useState<OnlineOrderSettings | null>(null);
    const [draft, setDraft] = useState<OnlineOrderSettings | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [pausing, setPausing] = useState(false);
    const [ibanSaving, setIbanSaving] = useState(false);
    // Bölgeler sekmesi kapanınca içeriği silinir: kaydedilmemiş değişiklik varken sekme değişimi onay ister.
    const [zonesDirty, setZonesDirty] = useState(false);
    // Onay bekleyen alt sekme. Sayfadan çıkışı (bağlantı, menü) Ayarlar sayfasının ortak onayı yakalar.
    const [pendingTab, setPendingTab] = useState<string | null>(null);

    const load = useCallback(() => {
        onlineOrderingSettingsService.getSettings()
            .then(s => { setSaved(s); setDraft(s); setLoadError(null); })
            .catch(err => setLoadError(getApiErrorMessage(err, 'Ayarlar yüklenemedi.')));
    }, []);

    useEffect(() => { load(); }, [load]);

    const dirty = !!saved && !!draft && JSON.stringify({ ...saved, paused: false }) !== JSON.stringify({ ...draft, paused: false });
    useSettingsDirty('online', dirty);

    const update = (patch: Partial<OnlineOrderSettings>) => setDraft(prev => prev ? { ...prev, ...patch } : prev);
    const updateDay = (day: number, patch: Partial<OnlineOrderDay>) =>
        setDraft(prev => prev ? { ...prev, days: prev.days.map(d => d.day === day ? { ...d, ...patch } : d) } : prev);

    const save = async () => {
        if (!draft) return;
        const error = validate(draft);
        if (error) {
            toast.error(error);
            return;
        }
        setSaving(true);
        try {
            // Ön sipariş alanları Rezervasyon sekmesinde düzenlenir: sunucudaki son hâlini koru.
            const latest = await onlineOrderingSettingsService.getSettings();
            const result = await onlineOrderingSettingsService.saveSettings({
                enabled: draft.enabled,
                days: draft.days,
                lastOrderMinutesBeforeClose: draft.lastOrderMinutesBeforeClose,
                defaultEtaMinutes: draft.defaultEtaMinutes,
                autoRejectAfterMinutes: draft.autoRejectAfterMinutes,
                maxOpenOrdersPerPhone: draft.maxOpenOrdersPerPhone,
                maxOrdersPerPhonePerDay: draft.maxOrdersPerPhonePerDay,
                acceptCash: draft.acceptCash,
                acceptCard: draft.acceptCard,
                // IBAN anahtarı ayrı ve hemen kaydedilir (Ayarlar → Ödeme'de de var): sunucudaki son hâli korunur.
                // IBAN sonradan kaldırıldıysa eski açık kayıt gönderilmez (sunucu reddeder).
                acceptIban: latest.acceptIban && latest.hasIban,
                requirePhoneVerification: draft.requirePhoneVerification,
                pickupEnabled: draft.pickupEnabled,
                pickupEtaMinutes: draft.pickupEtaMinutes,
                preOrderEnabled: latest.preOrderEnabled,
                preOrderLeadMinutes: latest.preOrderLeadMinutes,
            });
            setSaved(result);
            setDraft(result);
            toast.success('Online sipariş ayarları kaydedildi.');
        } catch (err) {
            toast.error(getApiErrorMessage(err, 'Ayarlar kaydedilemedi.'));
        } finally {
            setSaving(false);
        }
    };

    const togglePause = async (paused: boolean) => {
        setPausing(true);
        try {
            const result = await deliveryService.setPaused(paused);
            setSaved(prev => prev ? { ...prev, paused: result.paused } : prev);
            setDraft(prev => prev ? { ...prev, paused: result.paused } : prev);
            toast.success(result.paused ? 'Online sipariş durduruldu.' : 'Online sipariş yeniden açıldı.');
        } catch (err) {
            toast.error(getApiErrorMessage(err, 'Durum değiştirilemedi.'));
        } finally {
            setPausing(false);
        }
    };

    // IBAN anahtarı taslağa yazılmaz, hemen kaydedilir: Kaydet'e basılmadan açık görünüp kaydedilmemiş kalmasın.
    const toggleIban = async (acceptIban: boolean) => {
        setIbanSaving(true);
        try {
            const result = await onlineOrderingSettingsService.setAcceptIban(acceptIban);
            const patch = { acceptIban: result.acceptIban, hasIban: result.hasIban, isCustomized: result.isCustomized };
            setSaved(prev => prev ? { ...prev, ...patch } : prev);
            setDraft(prev => prev ? { ...prev, ...patch } : prev);
            toast.success(result.acceptIban ? 'Paket siparişte IBAN ile ödeme açıldı.' : 'Paket siparişte IBAN ile ödeme kapatıldı.');
        } catch (err) {
            toast.error(getApiErrorMessage(err, 'IBAN ile ödeme ayarı kaydedilemedi.'));
        } finally {
            setIbanSaving(false);
        }
    };

    // 24 saat kapatılınca günün kayıtlı saatlerine (o da gün boyuysa 11:00–22:00'a) dönülür.
    const toggleAllDay = (day: number, on: boolean) => {
        if (on) {
            updateDay(day, ALL_DAY);
            return;
        }
        const before = saved?.days.find(x => x.day === day);
        updateDay(day, before && !isAllDay(before) && before.opens !== before.closes
            ? { opens: before.opens, closes: before.closes }
            : FALLBACK_HOURS);
    };

    const copyToAll = (source: OnlineOrderDay) => {
        setDraft(prev => prev ? { ...prev, days: prev.days.map(d => ({ ...d, isOpen: source.isOpen, opens: source.opens, closes: source.closes })) } : prev);
        toast.success(`${DAY_NAMES[source.day]} saatleri tüm günlere kopyalandı.`);
    };

    const settingsTab = tab === 'genel' || tab === 'saatler';

    const goToTab = (value: string) => setParams(prev => {
        const next = new URLSearchParams(prev);
        next.set('bolum', value);
        return next;
    });

    const changeTab = (value: string) => {
        if (value === tab || !TABS.includes(value as TabKey)) return;
        if (tab === 'bolgeler' && zonesDirty) {
            setPendingTab(value);
            return;
        }
        goToTab(value);
    };

    return (
        <div className="flex flex-col gap-5 pb-24">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <p className="text-sm text-muted-foreground">Sitenizdeki /siparis sayfasından paket sipariş: kurallar, saatler, teslimat bölgeleri.</p>
                    {saved && !saved.enabled && (
                        <p className="mt-2 inline-flex rounded-lg bg-rb-red-bg px-2.5 py-1 text-xs font-semibold text-rb-red">
                            Online sipariş kapalı: sitede "Paket sipariş" görünmüyor.
                        </p>
                    )}
                </div>
                <div className="flex flex-wrap gap-2">
                    <Link to="/admin/online-orders" className="flex h-10 items-center rounded-[10px] border border-border bg-card px-3.5 text-sm font-semibold text-foreground hover:border-rb-gold">
                        Siparişler panosu
                    </Link>
                    <a href="/siparis" target="_blank" rel="noreferrer" className="flex h-10 items-center gap-1.5 rounded-[10px] border border-border bg-card px-3.5 text-sm font-semibold text-foreground hover:border-rb-gold">
                        Sipariş sayfası <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                    </a>
                </div>
            </div>

            {loadError ? (
                <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border border-rb-red/30 bg-rb-red-bg px-4 py-3">
                    <p className="text-sm text-foreground">{loadError}</p>
                    <button type="button" onClick={load} className="h-10 rounded-lg border border-border bg-card px-4 text-sm font-semibold">Tekrar dene</button>
                </div>
            ) : (
                <Tabs value={tab} onValueChange={changeTab}>
                    <TabsList variant="line" className="flex-wrap justify-start group-data-horizontal/tabs:h-auto [&>[data-slot=tabs-trigger]]:h-9 [&>[data-slot=tabs-trigger]]:flex-none">
                        <TabsTrigger value="genel">Genel</TabsTrigger>
                        <TabsTrigger value="saatler">Çalışma saatleri</TabsTrigger>
                        <TabsTrigger value="bolgeler">Teslimat bölgeleri</TabsTrigger>
                        <TabsTrigger value="engelli">Engelli numaralar</TabsTrigger>
                    </TabsList>

                    <TabsContent value="genel" className="mt-3">
                        {!draft ? <Skeleton /> : (
                            <div className="grid items-start gap-4 xl:grid-cols-2">
                                <Card title="Sipariş alma">
                                    <Row label="Online sipariş" hint="Kapalıyken sitede paket sipariş bölümü ve bağlantıları görünmez.">
                                        <Switch checked={draft.enabled} onCheckedChange={enabled => update({ enabled })} aria-label="Online sipariş açık"
                                            label={<span className="w-12 text-xs text-muted-foreground">{draft.enabled ? 'Açık' : 'Kapalı'}</span>} />
                                    </Row>
                                    <Row label="Şu an sipariş alınıyor" hint="Yoğunlukta kapatıp geçici durdurun; kasiyer de panodan açıp kapatabilir. Hemen uygulanır.">
                                        {/* Açık = sipariş alınıyor; sunucudaki alan "paused" (tersi). */}
                                        <Switch checked={!draft.paused} disabled={pausing || !saved?.enabled} onCheckedChange={open => togglePause(!open)}
                                            aria-label="Şu an sipariş alınıyor"
                                            label={<span className="w-20 text-xs text-muted-foreground">{draft.paused ? 'Durduruldu' : 'Açık'}</span>} />
                                    </Row>
                                    <Row label="Gel al" hint="Müşteri online sipariş verip restorana gelip kendisi alır: adres ve teslimat ücreti yok, bölgenin en az tutarı uygulanmaz. Siparişler panoda “GEL AL” rozetiyle gelir; müşteri gelince “Müşteri aldı” ile ödeme kasaya alınır.">
                                        <Switch checked={draft.pickupEnabled} onCheckedChange={pickupEnabled => update({ pickupEnabled })} aria-label="Gel al"
                                            label={<span className="w-12 text-xs text-muted-foreground">{draft.pickupEnabled ? 'Açık' : 'Kapalı'}</span>} />
                                    </Row>
                                    <Row label="Kapıda ödeme" hint="Kart ile online ödeme yok; müşteri teslimatta (gel al'da restoranda) öder.">
                                        <div className="flex flex-wrap gap-3">
                                            <Switch checked={draft.acceptCash} onCheckedChange={acceptCash => update({ acceptCash })} label={<span className="text-xs">Nakit</span>} />
                                            <Switch checked={draft.acceptCard} onCheckedChange={acceptCard => update({ acceptCard })} label={<span className="text-xs">Kart</span>} />
                                        </div>
                                    </Row>
                                    <Row
                                        label="IBAN ile ödeme (havale/EFT)"
                                        hint={draft.hasIban
                                            ? "Müşteri ödeme adımında IBAN'ı kopyalayıp parayı gönderir; açıklamaya sipariş numarasını yazar. Kurye para almaz; kasada \"Teslim al\"da paranın hesaba geçtiğini kontrol edin. Hemen uygulanır."
                                            : "Açmak için önce şubenin IBAN'ını ve hesap sahibini Ayarlar → Ödeme'den girin."}
                                    >
                                        <div className="flex flex-col items-end gap-1">
                                            <Switch checked={draft.acceptIban && draft.hasIban} disabled={!draft.hasIban || ibanSaving}
                                                onCheckedChange={toggleIban} aria-label="IBAN ile ödeme"
                                                label={<span className="text-xs">IBAN</span>} />
                                            {!draft.hasIban && (
                                                <Link to={settingsPath('odeme')} className="text-xs font-semibold text-rb-accent hover:underline">
                                                    Ayarlar → Ödeme
                                                </Link>
                                            )}
                                        </div>
                                    </Row>
                                </Card>

                                <Card title="Süreler">
                                    <NumberField label="Varsayılan teslim süresi (dk)" hint="Bölgenin süresi yoksa kabulde önerilir. 10–180."
                                        value={draft.defaultEtaMinutes} min={10} max={180} onChange={defaultEtaMinutes => update({ defaultEtaMinutes })} />
                                    {draft.pickupEnabled && (
                                        <NumberField label="Gel al hazır olma süresi (dk)" hint="Sitede “yaklaşık N dk'da hazır” olarak görünür, kabulde önerilir. 10–180."
                                            value={draft.pickupEtaMinutes} min={10} max={180} onChange={pickupEtaMinutes => update({ pickupEtaMinutes })} />
                                    )}
                                    <NumberField label="Otomatik ret (dk)" hint="Bu sürede yanıtlanmayan sipariş reddedilir ve müşteriye bildirilir. 3–60."
                                        value={draft.autoRejectAfterMinutes} min={3} max={60} onChange={autoRejectAfterMinutes => update({ autoRejectAfterMinutes })} />
                                </Card>

                                <Card title="Kötüye kullanım sınırları">
                                    <NumberField label="Bir numaranın açık siparişi" hint="Aynı anda en fazla. 1–10."
                                        value={draft.maxOpenOrdersPerPhone} min={1} max={10} onChange={maxOpenOrdersPerPhone => update({ maxOpenOrdersPerPhone })} />
                                    <NumberField label="Bir numaranın günlük siparişi" hint="Gün içinde en fazla. 1–50."
                                        value={draft.maxOrdersPerPhonePerDay} min={1} max={50} onChange={maxOrdersPerPhonePerDay => update({ maxOrdersPerPhonePerDay })} />
                                    <Row
                                        label="Telefon doğrulaması (SMS kodu)"
                                        hint={draft.smsConfigured
                                            ? 'Müşteri siparişi göndermeden önce telefonuna gelen kodu girer.'
                                            : 'SMS sağlayıcı yok: açık olsa da kod gönderilmez ve doğrulama istenmez. SMS hesabı bağlanınca kullanılabilir.'}
                                    >
                                        <Switch checked={draft.requirePhoneVerification} disabled={!draft.smsConfigured}
                                            onCheckedChange={requirePhoneVerification => update({ requirePhoneVerification })}
                                            aria-label="Telefon doğrulaması"
                                            label={<span className="w-12 text-xs text-muted-foreground">{draft.requirePhoneVerification ? 'Açık' : 'Kapalı'}</span>} />
                                    </Row>
                                </Card>

                                <p className="text-xs text-muted-foreground">
                                    Rezervasyon ön siparişinin ayarı:{' '}
                                    <Link to={settingsPath('rezervasyon')} className="font-semibold text-rb-accent hover:underline">Rezervasyon sekmesi</Link>.
                                </p>
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="saatler" className="mt-3">
                        {!draft ? <Skeleton /> : (
                            <div className="grid gap-4">
                                <Card title="Haftalık sipariş saatleri">
                                    <p className="text-xs text-muted-foreground">
                                        Kapanış açılıştan önceyse gece yarısını aşar (ör. 18:00–02:00). "24 saat" günlerde son sipariş kesintisi uygulanmaz.
                                        Saatler şubenin saat dilimindedir.
                                    </p>
                                    <div className="divide-y divide-border rounded-lg border border-border">
                                        {DAY_ORDER.map(dayNumber => {
                                            const d = draft.days.find(x => x.day === dayNumber);
                                            if (!d) return null;
                                            const name = DAY_NAMES[d.day];
                                            const allDay = isAllDay(d);
                                            const overnight = d.isOpen && !allDay && toMinutes(d.closes) < toMinutes(d.opens);
                                            const error = dayError(d);
                                            const errorId = `siparis-gun-${d.day}-hata`;
                                            const options = timeOptions(TIME_STEP, d.opens, d.closes);
                                            const summary = daySummary(d, draft.lastOrderMinutesBeforeClose);
                                            return (
                                                <div key={d.day} className="px-3 py-2.5">
                                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                                                        <span className="w-24 text-sm font-semibold text-foreground">{name}</span>
                                                        <Switch checked={d.isOpen} onCheckedChange={isOpen => updateDay(d.day, { isOpen })}
                                                            aria-label={`${name} sipariş alınsın`}
                                                            label={<span className="w-11 text-xs text-muted-foreground">{d.isOpen ? 'Açık' : 'Kapalı'}</span>} />
                                                        {d.isOpen && (
                                                            <AllDayPill on={allDay} onToggle={on => toggleAllDay(d.day, on)} ariaLabel={`${name} 24 saat sipariş`} />
                                                        )}
                                                        {overnight && <span className="rounded bg-rb-purple-bg px-1.5 py-0.5 text-[10px] font-bold text-rb-purple">ertesi gün</span>}
                                                        <CopyToAllButton onClick={() => copyToAll(d)} />
                                                    </div>
                                                    {d.isOpen && !allDay && (
                                                        <div className="mt-2 grid grid-cols-2 gap-2 sm:flex sm:gap-3">
                                                            <TimeSelect label="Açılış" ariaLabel={`${name} açılış`} value={d.opens} options={options}
                                                                onChange={opens => updateDay(d.day, { opens })} error={!!error} errorId={errorId} />
                                                            <TimeSelect label="Kapanış" ariaLabel={`${name} kapanış`} value={d.closes} options={options}
                                                                onChange={closes => updateDay(d.day, { closes })} isDisabled={t => t === d.opens}
                                                                error={!!error} errorId={errorId} />
                                                        </div>
                                                    )}
                                                    {summary && !error && <p className="mt-1.5 text-xs text-muted-foreground">{summary}</p>}
                                                    {error && <p id={errorId} className="mt-1.5 text-xs text-destructive">{error}</p>}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </Card>
                                <Card title="Son sipariş">
                                    <NumberField label="Kapanıştan kaç dakika önce sipariş alma bitsin" hint="0–120. Mutfağın son siparişi yetiştirmesi için."
                                        value={draft.lastOrderMinutesBeforeClose} min={0} max={120}
                                        onChange={lastOrderMinutesBeforeClose => update({ lastOrderMinutesBeforeClose })} />
                                </Card>
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="bolgeler" className="mt-3">
                        <DeliveryZonesTab onDirtyChange={setZonesDirty} />
                    </TabsContent>

                    <TabsContent value="engelli" className="mt-3">
                        <BlockedPhonesTab />
                    </TabsContent>
                </Tabs>
            )}

            <AlertDialog open={pendingTab !== null} onOpenChange={open => !open && setPendingTab(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Kaydedilmemiş değişiklikler</AlertDialogTitle>
                        <AlertDialogDescription>
                            Teslimat bölgelerinde kaydedilmemiş değişiklikler var. Buradan çıkarsanız kaybolacak.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Sekmede kal</AlertDialogCancel>
                        <Button variant="destructive" onClick={() => {
                            const target = pendingTab;
                            setPendingTab(null);
                            setZonesDirty(false);
                            if (target) goToTab(target);
                        }}>Değişiklikleri at</Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {settingsTab && draft && (
                <div className="fixed inset-x-0 bottom-0 z-20 flex items-center justify-end gap-3 border-t border-border bg-card/95 px-4 py-3 backdrop-blur md:left-auto md:right-6 md:bottom-6 md:rounded-2xl md:border">
                    {dirty && <span className="text-sm text-muted-foreground">Kaydedilmemiş değişiklik var</span>}
                    <button type="button" onClick={() => setDraft(saved)} disabled={!dirty || saving}
                        className="h-11 rounded-[10px] border border-border px-4 text-sm font-semibold text-foreground disabled:opacity-40">Geri al</button>
                    <button type="button" onClick={save} disabled={!dirty || saving}
                        className="h-11 rounded-[10px] bg-rb-gold px-5 text-sm font-semibold text-rb-gold-foreground disabled:opacity-50">
                        {saving ? 'Kaydediliyor…' : 'Kaydet'}
                    </button>
                </div>
            )}
        </div>
    );
}
