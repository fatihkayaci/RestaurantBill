import { useState, type FormEvent } from 'react';
import { Copy, X } from 'lucide-react';
import { toast } from 'sonner';
import { Modal, ModalTitle } from '@/components/ui/modal';
import { Switch } from '@/components/ui/switch';
import { reservationSettingsService } from '@/features/customerSite/api/reservationSettingsService';
import { formatDuration, type ReservationDay, type ReservationRules } from '@/features/customerSite/types';
import { getApiErrorMessage } from '@/lib/apiError';
import { inputClass, labelClass } from '@/lib/formStyles';
import { cn } from '@/lib/utils';

const DAY_NAMES = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
const INTERVALS = [15, 30, 60];
const DURATIONS = [60, 90, 120, 150, 180, 210, 240];
const DAYS_AHEAD = { min: 1, max: 90 };
const PARTY = { min: 1, max: 50 };

interface Props {
    rules: ReservationRules;
    onClose: () => void;
    onSaved: (rules: ReservationRules) => void;
}

type Errors = Partial<Record<'maxDaysAhead' | 'maxPartySize' | `day${number}`, string>>;

function parseWhole(value: string): number | null {
    return /^\d+$/.test(value.trim()) ? Number(value.trim()) : null;
}

// Şubenin rezervasyon kuralları: açık/kapalı, gün gün başlangıç saatleri, aralık, masada kalma süresi ve sınırlar.
// Müşteri sitesi ve personelin açtığı rezervasyonlar bu ayarlara uyar.
export default function ReservationSettingsModal({ rules, onClose, onSaved }: Props) {
    const [enabled, setEnabled] = useState(rules.enabled);
    const [days, setDays] = useState<ReservationDay[]>(rules.days);
    const [slotInterval, setSlotInterval] = useState(rules.slotIntervalMinutes);
    const [duration, setDuration] = useState(rules.durationMinutes);
    const [maxDaysAhead, setMaxDaysAhead] = useState(String(rules.maxDaysAhead));
    const [maxPartySize, setMaxPartySize] = useState(String(rules.maxPartySize));
    const [errors, setErrors] = useState<Errors>({});
    const [saving, setSaving] = useState(false);

    const updateDay = (index: number, patch: Partial<ReservationDay>) => {
        setDays(list => list.map((d, i) => (i === index ? { ...d, ...patch } : d)));
        setErrors(e => ({ ...e, [`day${index}`]: undefined }));
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
            if (!d.firstStart || !d.lastStart) next[`day${i}`] = 'İlk ve son başlangıç saatini girin.';
            else if (d.lastStart < d.firstStart) next[`day${i}`] = 'Son başlangıç, ilk başlangıçtan önce olamaz.';
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
        <Modal onClose={onClose} closeOnOverlay={false} overlayClassName="bg-black/40 backdrop-blur-sm">
            <div className="relative mx-4 my-6 flex max-h-[92vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-xl dark:bg-[#26221e]">
                <div className="flex items-start justify-between gap-3 border-b border-border px-6 pb-4 pt-6">
                    <div>
                        <ModalTitle className="text-xl font-bold text-foreground">Rezervasyon ayarları</ModalTitle>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                            Restoran sitesindeki rezervasyon saatleri ve kuralları.
                            {!rules.isCustomized && ' Şu an varsayılan değerler kullanılıyor.'}
                        </p>
                    </div>
                    <button type="button" onClick={onClose} aria-label="Kapat" className="text-muted-foreground transition-colors hover:text-foreground">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form id="reservation-settings" onSubmit={submit} className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
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
                        <p className="text-xs text-muted-foreground">Müşteri, ilk ve son başlangıç saati arasındaki saatleri seçebilir (ikisi de dahil).</p>
                        <div className="divide-y divide-border rounded-lg border border-border">
                            {days.map((d, i) => {
                                const error = errors[`day${i}`];
                                return (
                                    <div key={d.day} className="px-3 py-2.5">
                                        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                                            <span className="w-24 text-sm font-semibold text-foreground">{DAY_NAMES[d.day]}</span>
                                            <Switch
                                                checked={d.isOpen}
                                                onCheckedChange={isOpen => updateDay(i, { isOpen })}
                                                aria-label={`${DAY_NAMES[d.day]} rezervasyon alınsın`}
                                                label={<span className="w-11 text-xs text-muted-foreground">{d.isOpen ? 'Açık' : 'Kapalı'}</span>}
                                            />
                                            {d.isOpen && (
                                                <span className="flex items-center gap-1.5">
                                                    <input
                                                        type="time"
                                                        step={900}
                                                        aria-label={`${DAY_NAMES[d.day]} ilk başlangıç`}
                                                        value={d.firstStart}
                                                        onChange={e => updateDay(i, { firstStart: e.target.value })}
                                                        className={cn(inputClass, 'w-[132px] py-1.5', error && 'border-destructive')}
                                                    />
                                                    <span className="text-muted-foreground">–</span>
                                                    <input
                                                        type="time"
                                                        step={900}
                                                        aria-label={`${DAY_NAMES[d.day]} son başlangıç`}
                                                        value={d.lastStart}
                                                        onChange={e => updateDay(i, { lastStart: e.target.value })}
                                                        className={cn(inputClass, 'w-[132px] py-1.5', error && 'border-destructive')}
                                                    />
                                                </span>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => copyToAll(i)}
                                                className="ml-auto flex items-center gap-1 text-[11px] font-semibold text-rb-accent transition-opacity hover:opacity-80"
                                            >
                                                <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                                                Tüm günlere kopyala
                                            </button>
                                        </div>
                                        {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
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

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-6 py-4">
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
                        <button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm text-foreground transition-colors hover:bg-muted">İptal</button>
                        <button
                            type="submit"
                            form="reservation-settings"
                            disabled={saving}
                            className="rounded-lg bg-rb-gold px-4 py-2 text-sm font-semibold text-rb-gold-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                        >
                            {saving ? 'Kaydediliyor…' : 'Kaydet'}
                        </button>
                    </div>
                </div>
            </div>
        </Modal>
    );
}
