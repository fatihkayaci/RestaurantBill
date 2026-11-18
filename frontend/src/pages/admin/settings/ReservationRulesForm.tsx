import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { reservationSettingsService } from '@/features/customerSite/api/reservationSettingsService';
import { formatDuration, type ReservationDay, type ReservationRules } from '@/features/customerSite/types';
import { getApiErrorMessage } from '@/lib/apiError';
import { inputClass, labelClass } from '@/lib/formStyles';
import { cn } from '@/lib/utils';
import { AllDayPill, CopyToAllButton, TimeSelect } from './HoursFields';
import { DAY_MINUTES, timeOptions, toMinutes, toTime } from './hoursTime';
import { useSettingsDirty } from './settingsTabs';

const DAY_NAMES = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
const INTERVALS = [15, 30, 60];
const DURATIONS = [60, 90, 120, 150, 180, 210, 240];
const DAYS_AHEAD = { min: 1, max: 90 };
const PARTY = { min: 1, max: 50 };
// "24 saat" günün kaydı: 00:00'dan 23:45'e. 23:45 her aralıkta (15/30/60) günün son başlangıcını kapsar,
// böylece aralık değişse de gün boyu açık kalır; arka uçta ayrı bir alan gerekmez.
const ALL_DAY = { firstStart: '00:00', lastStart: '23:45' };
const FALLBACK_HOURS = { firstStart: '09:00', lastStart: '21:00' };

interface Props {
    rules: ReservationRules;
    onSaved: (rules: ReservationRules) => void;
}

type Errors = Partial<Record<'maxDaysAhead' | 'maxPartySize' | `day${number}`, string>>;

// Gün boyu mu: 00:00'da başlıyor ve seçili aralığa göre günün son başlangıcına kadar gidiyor.
function isAllDay(d: ReservationDay, interval: number): boolean {
    return d.firstStart === '00:00' && toMinutes(d.lastStart) + interval >= DAY_MINUTES;
}

// Satırın altındaki özet: müşterinin gerçekte göreceği ilk/son saat ve seçenek sayısı.
function daySummary(d: ReservationDay, interval: number): string {
    if (!d.isOpen) return 'Bu gün rezervasyon alınmaz.';
    const first = toMinutes(d.firstStart);
    const last = toMinutes(d.lastStart);
    if (Number.isNaN(first) || Number.isNaN(last) || last < first) return '';
    const count = Math.floor((last - first) / interval) + 1;
    const realLast = toTime(first + (count - 1) * interval);
    const range = `${d.firstStart} – ${realLast} arası, ${interval} dakikada bir (${count} saat seçeneği).`;
    return isAllDay(d, interval) ? `Gün boyu: ${range}` : range;
}

function parseWhole(value: string): number | null {
    return /^\d+$/.test(value.trim()) ? Number(value.trim()) : null;
}

// Şubenin rezervasyon kuralları: açık/kapalı, gün gün başlangıç saatleri, aralık, masada kalma süresi ve sınırlar.
// Müşteri sitesi ve personelin açtığı rezervasyonlar bu ayarlara uyar. Ayarlar → Rezervasyon'da gösterilir
// (önceden Rezervasyonlar sayfasında modaldı). Kaydedince üst bileşen yeni kuralla formu baştan kurar.
export default function ReservationRulesForm({ rules, onSaved }: Props) {
    const [enabled, setEnabled] = useState(rules.enabled);
    const [days, setDays] = useState<ReservationDay[]>(rules.days);
    const [slotInterval, setSlotInterval] = useState(rules.slotIntervalMinutes);
    const [duration, setDuration] = useState(rules.durationMinutes);
    const [maxDaysAhead, setMaxDaysAhead] = useState(String(rules.maxDaysAhead));
    const [maxPartySize, setMaxPartySize] = useState(String(rules.maxPartySize));
    const [errors, setErrors] = useState<Errors>({});
    const [saving, setSaving] = useState(false);

    const dirty = enabled !== rules.enabled
        || slotInterval !== rules.slotIntervalMinutes
        || duration !== rules.durationMinutes
        || maxDaysAhead !== String(rules.maxDaysAhead)
        || maxPartySize !== String(rules.maxPartySize)
        || JSON.stringify(days) !== JSON.stringify(rules.days);
    useSettingsDirty('rezervasyon', dirty);

    const updateDay = (index: number, patch: Partial<ReservationDay>) => {
        setDays(list => list.map((d, i) => (i === index ? { ...d, ...patch } : d)));
        setErrors(e => ({ ...e, [`day${index}`]: undefined }));
    };

    // İlk saat son saatin ötesine geçerse son saat de onunla birlikte ilerler.
    const changeFirstStart = (index: number, firstStart: string) => {
        const lastStart = days[index].lastStart;
        updateDay(index, toMinutes(lastStart) < toMinutes(firstStart) ? { firstStart, lastStart: firstStart } : { firstStart });
    };

    // 24 saat kapatılınca günün kayıtlı saatlerine (o da gün boyuysa 09:00–21:00'a) dönülür.
    const toggleAllDay = (index: number, on: boolean) => {
        if (on) {
            updateDay(index, ALL_DAY);
            return;
        }
        const saved = rules.days.find(x => x.day === days[index].day);
        const back = saved && !isAllDay(saved, slotInterval)
            ? { firstStart: saved.firstStart, lastStart: saved.lastStart }
            : FALLBACK_HOURS;
        updateDay(index, back);
    };

    const copyToAll = (index: number) => {
        const source = days[index];
        setDays(list => list.map(d => ({ ...d, isOpen: source.isOpen, firstStart: source.firstStart, lastStart: source.lastStart })));
        setErrors(e => Object.fromEntries(Object.entries(e).filter(([key]) => !key.startsWith('day'))));
        toast.success(`${DAY_NAMES[source.day]} saatleri tüm günlere kopyalandı.`);
    };

    const validate = (): Errors => {
        const next: Errors = {};
        const daysAhead = parseWhole(maxDaysAhead);
        if (daysAhead === null || daysAhead < DAYS_AHEAD.min || daysAhead > DAYS_AHEAD.max)
            next.maxDaysAhead = `${DAYS_AHEAD.min} ile ${DAYS_AHEAD.max} arasında bir gün sayısı girin.`;
        const party = parseWhole(maxPartySize);
        if (party === null || party < PARTY.min || party > PARTY.max)
            next.maxPartySize = `${PARTY.min} ile ${PARTY.max} arasında bir kişi sayısı girin.`;
        days.forEach((d, i) => {
            if (!d.isOpen) return;
            if (!d.firstStart || !d.lastStart) next[`day${i}`] = 'İlk ve son rezervasyon saatini seçin.';
            else if (toMinutes(d.lastStart) < toMinutes(d.firstStart)) next[`day${i}`] = 'Son rezervasyon saati, ilk rezervasyon saatinden önce olamaz.';
        });
        return next;
    };

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        const found = validate();
        setErrors(found);
        if (Object.values(found).some(Boolean)) {
            toast.error('Lütfen işaretli alanları düzeltin.');
            return;
        }
        setSaving(true);
        try {
            const saved = await reservationSettingsService.update({
                enabled,
                slotIntervalMinutes: slotInterval,
                durationMinutes: duration,
                maxDaysAhead: Number(maxDaysAhead),
                maxPartySize: Number(maxPartySize),
                days,
            });
            toast.success('Rezervasyon ayarları kaydedildi.');
            onSaved(saved);
        } catch (err) {
            toast.error(getApiErrorMessage(err, 'Rezervasyon ayarları kaydedilemedi.'));
        } finally {
            setSaving(false);
        }
    };

    const discard = () => {
        setEnabled(rules.enabled);
        setDays(rules.days);
        setSlotInterval(rules.slotIntervalMinutes);
        setDuration(rules.durationMinutes);
        setMaxDaysAhead(String(rules.maxDaysAhead));
        setMaxPartySize(String(rules.maxPartySize));
        setErrors({});
    };

    const resetToDefaults = async () => {
        setSaving(true);
        try {
            const saved = await reservationSettingsService.resetToDefaults();
            toast.success('Rezervasyon ayarları varsayılana döndü.');
            onSaved(saved);
        } catch (err) {
            toast.error(getApiErrorMessage(err, 'Varsayılana dönülemedi.'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <section aria-labelledby="reservation-settings-title" className="flex flex-col rounded-2xl border border-border bg-card">
            <div className="border-b border-border px-4 pb-4 pt-5 sm:px-5">
                <h2 id="reservation-settings-title" className={labelClass}>Rezervasyon kuralları</h2>
                <p className="text-sm text-muted-foreground">
                    Restoran sitesindeki rezervasyon saatleri ve kuralları.
                    {!rules.isCustomized && ' Şu an varsayılan değerler kullanılıyor.'}
                </p>
            </div>

            <form id="reservation-settings" onSubmit={submit} className="space-y-6 px-4 py-5 sm:px-5">
                <div className="flex items-start justify-between gap-3 rounded-lg border border-border px-3 py-2.5">
                    <span className="flex flex-col gap-0.5">
                        <span className="text-sm font-semibold text-foreground">Online rezervasyon {enabled ? 'açık' : 'kapalı'}</span>
                        <span className="text-xs text-muted-foreground">
                            Kapalıyken sitede rezervasyon bölümü görünmez, yeni talep ve personel rezervasyonu alınmaz. Mevcut rezervasyonlar korunur.
                        </span>
                    </span>
                    <Switch checked={enabled} onCheckedChange={setEnabled} aria-label="Online rezervasyon" buttonClassName="mt-0.5 shrink-0" />
                </div>

                <fieldset className={cn('space-y-2', !enabled && 'opacity-60')}>
                    <legend className={labelClass}>Haftalık rezervasyon saatleri</legend>
                    <p className="text-xs text-muted-foreground">
                        Müşteri, ilk ve son rezervasyon saati arasındaki saatleri seçebilir (ikisi de dahil). Saatler, seçili saat aralığına göre listelenir.
                    </p>
                    <div className="divide-y divide-border rounded-lg border border-border">
                        {days.map((d, i) => {
                            const error = errors[`day${i}`];
                            const name = DAY_NAMES[d.day];
                            const allDay = d.isOpen && isAllDay(d, slotInterval);
                            const options = timeOptions(slotInterval, d.firstStart, d.lastStart);
                            const summary = daySummary(d, slotInterval);
                            const errorId = `rez-gun-${d.day}-hata`;
                            return (
                                <div key={d.day} className="px-3 py-2.5">
                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                                        <span className="w-24 text-sm font-semibold text-foreground">{name}</span>
                                        <Switch
                                            checked={d.isOpen}
                                            onCheckedChange={isOpen => updateDay(i, { isOpen })}
                                            aria-label={`${name} rezervasyon alınsın`}
                                            label={<span className="w-11 text-xs text-muted-foreground">{d.isOpen ? 'Açık' : 'Kapalı'}</span>}
                                        />
                                        {d.isOpen && (
                                            <AllDayPill on={allDay} onToggle={on => toggleAllDay(i, on)} ariaLabel={`${name} 24 saat rezervasyon`} />
                                        )}
                                        <CopyToAllButton onClick={() => copyToAll(i)} />
                                    </div>
                                    {d.isOpen && !allDay && (
                                        <div className="mt-2 grid grid-cols-2 gap-2 sm:flex sm:gap-3">
                                            <TimeSelect
                                                label="İlk rezervasyon"
                                                ariaLabel={`${name} ilk rezervasyon saati`}
                                                value={d.firstStart}
                                                options={options}
                                                onChange={t => changeFirstStart(i, t)}
                                                error={!!error}
                                                errorId={errorId}
                                            />
                                            <TimeSelect
                                                label="Son rezervasyon"
                                                ariaLabel={`${name} son rezervasyon saati`}
                                                value={d.lastStart}
                                                options={options}
                                                onChange={t => updateDay(i, { lastStart: t })}
                                                isDisabled={t => toMinutes(t) < toMinutes(d.firstStart)}
                                                error={!!error}
                                                errorId={errorId}
                                            />
                                        </div>
                                    )}
                                    {summary && !error && <p className="mt-1.5 text-xs text-muted-foreground">{summary}</p>}
                                    {error && <p id={errorId} className="mt-1.5 text-xs text-destructive">{error}</p>}
                                </div>
                            );
                        })}
                    </div>
                </fieldset>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                        <label htmlFor="rez-aralik" className={labelClass}>Saat aralığı</label>
                        <select id="rez-aralik" className={inputClass} value={slotInterval} onChange={e => setSlotInterval(Number(e.target.value))}>
                            {INTERVALS.map(v => <option key={v} value={v}>{v} dakikada bir</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="rez-sure" className={labelClass}>Masada kalma süresi</label>
                        <select id="rez-sure" className={inputClass} value={duration} onChange={e => setDuration(Number(e.target.value))}>
                            {DURATIONS.map(v => <option key={v} value={v}>{formatDuration(v)}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="rez-gun" className={labelClass}>En fazla kaç gün sonrası</label>
                        <input
                            id="rez-gun"
                            type="number"
                            inputMode="numeric"
                            min={DAYS_AHEAD.min}
                            max={DAYS_AHEAD.max}
                            value={maxDaysAhead}
                            onChange={e => { setMaxDaysAhead(e.target.value); setErrors(x => ({ ...x, maxDaysAhead: undefined })); }}
                            className={cn(inputClass, errors.maxDaysAhead && 'border-destructive')}
                        />
                        {errors.maxDaysAhead && <p className="mt-1 text-xs text-destructive">{errors.maxDaysAhead}</p>}
                    </div>
                    <div>
                        <label htmlFor="rez-kisi" className={labelClass}>En fazla kişi sayısı</label>
                        <input
                            id="rez-kisi"
                            type="number"
                            inputMode="numeric"
                            min={PARTY.min}
                            max={PARTY.max}
                            value={maxPartySize}
                            onChange={e => { setMaxPartySize(e.target.value); setErrors(x => ({ ...x, maxPartySize: undefined })); }}
                            className={cn(inputClass, errors.maxPartySize && 'border-destructive')}
                        />
                        {errors.maxPartySize && <p className="mt-1 text-xs text-destructive">{errors.maxPartySize}</p>}
                    </div>
                </div>
                <p className="text-xs text-muted-foreground">
                    Süre, yeni rezervasyonların bitiş saatini belirler; önceden alınmış rezervasyonların saatleri değişmez.
                </p>
            </form>

            <div className="sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-3 rounded-b-2xl border-t border-border bg-card px-4 py-4 sm:px-5">
                {rules.isCustomized ? (
                    <button
                        type="button"
                        onClick={resetToDefaults}
                        disabled={saving}
                        className="text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline disabled:opacity-50"
                    >
                        Varsayılana dön
                    </button>
                ) : <span />}
                <div className="flex items-center gap-3">
                    {dirty && <span className="text-sm text-muted-foreground">Kaydedilmemiş değişiklik var</span>}
                    <button
                        type="button"
                        onClick={discard}
                        disabled={!dirty || saving}
                        className="rounded-lg border border-border px-4 py-2 text-sm text-foreground transition-colors hover:bg-muted disabled:opacity-40"
                    >
                        Geri al
                    </button>
                    <button
                        type="submit"
                        form="reservation-settings"
                        disabled={!dirty || saving}
                        className="rounded-lg bg-rb-gold px-4 py-2 text-sm font-semibold text-rb-gold-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                    >
                        {saving ? 'Kaydediliyor…' : 'Kaydet'}
                    </button>
                </div>
            </div>
        </section>
    );
}
