import { useState } from 'react';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { Modal, ModalTitle } from '@/components/ui/modal';
import { categoryService } from '@/features/categories/api/categoryService';
import type { Category } from '@/features/categories/types';
import { getApiErrorMessage } from '@/lib/apiError';
import { inputClass, labelClass } from '@/lib/formStyles';
import { cn } from '@/lib/utils';

interface Props {
    category: Category;
    onClose: () => void;
    onSaved: () => void;
}

// Gün maskesi: bit 0 = Pazar … bit 6 = Cumartesi (sunucudaki DayOfWeek). Ekranda Pazartesiden başlar.
const DAYS: { bit: number; label: string }[] = [
    { bit: 1, label: 'Pzt' }, { bit: 2, label: 'Sal' }, { bit: 3, label: 'Çar' }, { bit: 4, label: 'Per' },
    { bit: 5, label: 'Cum' }, { bit: 6, label: 'Cmt' }, { bit: 0, label: 'Paz' },
];
const ALL_DAYS = 0b111_1111;
const WEEKDAYS = 0b011_1110;
const WEEKEND = 0b100_0001;

// Kategorinin servis penceresi ("Pide 22:00'ye kadar"): müşteri QR ve online siparişte pencere dışında sipariş
// edilemez; garson ve kasa yalnız uyarı görür. Varsayılan "Her zaman".
export default function CategoryAvailabilityModal({ category, onClose, onSaved }: Props) {
    const hasWindow = category.availableDays != null || !!category.availableFrom || !!category.availableUntil;
    const [always, setAlways] = useState(!hasWindow);
    const [days, setDays] = useState<number>(category.availableDays ?? ALL_DAYS);
    const [from, setFrom] = useState(category.availableFrom ?? '');
    const [until, setUntil] = useState(category.availableUntil ?? '');
    const [saving, setSaving] = useState(false);

    const crossesMidnight = !!from && !!until && until < from;
    const sameTime = !!from && from === until;
    const noDay = days === 0;

    const save = async () => {
        if (!always && (sameTime || noDay)) return;
        setSaving(true);
        try {
            await categoryService.updateCategory(category, always
                ? { days: null, from: null, until: null }
                : { days: days === ALL_DAYS ? null : days, from: from || null, until: until || null });
            toast.success(always ? `${category.name} her zaman sipariş edilebilir.` : `${category.name} servis saatleri kaydedildi.`);
            onSaved();
            onClose();
        } catch (err) {
            toast.error(getApiErrorMessage(err, 'Servis saatleri kaydedilemedi.'));
        } finally {
            setSaving(false);
        }
    };

    const preset = (mask: number) => setDays(mask);

    return (
        <Modal onClose={onClose} closeOnOverlay={false} overlayClassName="z-50 bg-black/60 backdrop-blur-[3px] p-4">
            <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl p-6">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <ModalTitle className="font-serif text-xl font-bold text-foreground">Servis saatleri</ModalTitle>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            "{category.name}" müşterinin QR ve online siparişinde yalnız bu saatlerde seçilebilir. Garson ve kasa uyarı görür, yine de ekleyebilir.
                        </p>
                    </div>
                    <button type="button" onClick={onClose} aria-label="Kapat"
                        className="w-11 h-11 shrink-0 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div role="radiogroup" aria-label="Servis saatleri" className="mt-5 grid grid-cols-2 gap-1 rounded-xl border border-border p-1">
                    {([[true, 'Her zaman'], [false, 'Belirli saatler']] as const).map(([value, label]) => (
                        <button key={label} type="button" role="radio" aria-checked={always === value} onClick={() => setAlways(value)}
                            className={cn('min-h-11 rounded-lg text-sm font-semibold transition-colors',
                                always === value ? 'bg-rb-accent text-rb-accent-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground')}>
                            {label}
                        </button>
                    ))}
                </div>

                {!always && (
                    <div className="mt-5 space-y-4">
                        <fieldset>
                            <legend className={labelClass}>Günler</legend>
                            <div className="mt-1.5 flex flex-wrap gap-1.5">
                                {DAYS.map(d => {
                                    const on = (days & (1 << d.bit)) !== 0;
                                    return (
                                        <button key={d.bit} type="button" aria-pressed={on} onClick={() => setDays(days ^ (1 << d.bit))}
                                            className={cn('min-h-11 min-w-11 rounded-full border px-3 text-sm font-semibold transition-colors',
                                                on ? 'border-rb-accent bg-rb-accent-bg text-rb-accent' : 'border-border text-muted-foreground hover:bg-muted')}>
                                            {d.label}
                                        </button>
                                    );
                                })}
                            </div>
                            <div className="mt-2 flex flex-wrap gap-3 text-xs">
                                <button type="button" className="font-semibold text-rb-accent hover:underline" onClick={() => preset(ALL_DAYS)}>Her gün</button>
                                <button type="button" className="font-semibold text-rb-accent hover:underline" onClick={() => preset(WEEKDAYS)}>Hafta içi</button>
                                <button type="button" className="font-semibold text-rb-accent hover:underline" onClick={() => preset(WEEKEND)}>Hafta sonu</button>
                            </div>
                            {noDay && <p className="mt-1 text-xs text-destructive">En az bir gün seçin.</p>}
                        </fieldset>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label htmlFor="category-available-from" className={labelClass}>Başlangıç</label>
                                <input id="category-available-from" type="time" className={inputClass} value={from} onChange={e => setFrom(e.target.value)} />
                            </div>
                            <div>
                                <label htmlFor="category-available-until" className={labelClass}>Bitiş</label>
                                <input id="category-available-until" type="time" className={cn(inputClass, sameTime && 'border-destructive')} value={until} onChange={e => setUntil(e.target.value)} />
                            </div>
                        </div>
                        <p className={cn('text-xs', sameTime ? 'text-destructive' : 'text-muted-foreground')}>
                            {sameTime
                                ? 'Başlangıç ve bitiş aynı olamaz.'
                                : crossesMidnight
                                    ? `Gece yarısını aşar: ${from}'dan ertesi gün ${until}'a kadar (başladığı güne sayılır).`
                                    : 'Yalnız bitiş: gün başından o saate kadar (ör. pide fırını 22:00\'de kapanır). Yalnız başlangıç: o saatten gün sonuna.'}
                        </p>
                    </div>
                )}

                <div className="mt-6 flex justify-end gap-3">
                    <button type="button" onClick={onClose} disabled={saving}
                        className="h-11 rounded-lg border border-border px-4 text-sm font-semibold text-foreground hover:bg-muted disabled:opacity-50">
                        Vazgeç
                    </button>
                    <button type="button" onClick={save} disabled={saving || (!always && (sameTime || noDay))}
                        className="h-11 rounded-lg bg-rb-accent px-5 text-sm font-bold text-rb-accent-foreground hover:opacity-90 disabled:opacity-50">
                        {saving ? 'Kaydediliyor…' : 'Kaydet'}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
