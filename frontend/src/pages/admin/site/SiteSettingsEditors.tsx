import { useRef, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, Check, ImagePlus, Plus, Trash2 } from 'lucide-react';
import type { SiteDayHours, SiteMilestone, SiteReview, SiteValue } from '@/features/customerSite/types';
import { inputClass, labelClass } from '@/lib/formStyles';
import { cn } from '@/lib/utils';
import { SITE_THEMES, DEFAULT_THEME, resolveTheme } from '@/pages/public/site/siteTheme';

// "Restoran sitesi" ayar sayfasının düzenleyicileri: tema, haftalık saat, mekân galerisi ve kısa liste alanları.

const smallButton = 'inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50';

export function Field({ id, label, hint, count, max, children }: { id: string; label: string; hint?: string; count?: number; max?: number; children: ReactNode }) {
    return (
        <div>
            <div className="flex items-baseline justify-between gap-2">
                <label htmlFor={id} className={labelClass}>{label}</label>
                {max !== undefined && <span className="text-[11px] text-muted-foreground">{count}/{max}</span>}
            </div>
            {children}
            {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
        </div>
    );
}

export function Panel({ id, title, description, children }: { id?: string; title: string; description?: string; children: ReactNode }) {
    return (
        <section id={id} className="scroll-mt-24 space-y-4 rounded-xl border border-border bg-card p-5 transition-shadow">
            <div>
                <h2 className="text-base font-semibold text-foreground">{title}</h2>
                {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
            </div>
            {children}
        </section>
    );
}

// ── Tema ─────────────────────────────────────────────────────────────────────────────────────────

// Vurgu seçenekleri (zemin her temada aynı kum; tema kapak rengini ve vurguyu seçer, özel renk yalnız vurguyu değiştirir).
const ACCENT_OPTIONS = ['#DC5B2F', '#EBB03F', '#9DBF8E', '#E79A9A', '#2F4F8F', '#A8354A', '#24180F', '#9AA5B1'];

/** Hazır temalar (zemin ortak; tema ana sayfa kapağının rengini ve vurguyu seçer) ve isteğe bağlı özel vurgu rengi. */
export function ThemePicker({ theme, accent, onTheme, onAccent }: {
    theme: string; accent: string; onTheme: (key: string) => void; onAccent: (hex: string) => void;
}) {
    const selected = resolveTheme(theme).key;
    const current = resolveTheme(theme);
    return (
        <div className="space-y-4">
            <div role="radiogroup" aria-label="Site teması" className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                {Object.values(SITE_THEMES).map(t => {
                    const on = selected === t.key;
                    return (
                        <button key={t.key} type="button" role="radio" aria-checked={on}
                            onClick={() => onTheme(t.key === DEFAULT_THEME ? '' : t.key)}
                            className={cn('flex flex-col gap-2 rounded-xl border-2 p-2.5 text-left transition-colors', on ? 'border-foreground' : 'border-border hover:border-foreground/40')}>
                            {/* Küçük önizleme: zemin, kart, yazı, düğme */}
                            <span aria-hidden="true" className="flex h-16 items-end gap-1.5 rounded-lg p-2" style={{ background: t.bg }}>
                                <span className="flex h-full flex-1 flex-col justify-center gap-1 rounded-md px-2" style={{ background: t.hero }}>
                                    <span className="h-1.5 w-3/4 rounded-full" style={{ background: t.card }} />
                                    <span className="h-1.5 w-1/2 rounded-full bg-[#F2C25E]" />
                                </span>
                                <span className="h-6 w-12 rounded-full" style={{ background: t.accent }} />
                            </span>
                            <span className="flex items-center justify-between gap-2">
                                <span className="text-sm font-semibold text-foreground">{t.label}</span>
                                {on && <Check className="h-4 w-4 text-foreground" aria-hidden="true" />}
                            </span>
                            <span className="text-xs leading-snug text-muted-foreground">{t.description}</span>
                        </button>
                    );
                })}
            </div>
            <div>
                <p className={labelClass}>Vurgu rengi</p>
                <div role="radiogroup" aria-label="Vurgu rengi" className="flex flex-wrap items-center gap-2.5">
                    <button type="button" role="radio" aria-checked={!accent} onClick={() => onAccent('')}
                        className={cn('flex h-11 items-center gap-2 rounded-full border-2 px-3 text-sm font-medium', !accent ? 'border-foreground' : 'border-border')}>
                        <span aria-hidden="true" className="h-6 w-6 rounded-full" style={{ background: current.accent }} />
                        Tema rengi
                    </button>
                    {ACCENT_OPTIONS.filter(c => c.toUpperCase() !== current.accent.toUpperCase()).map(color => {
                        const on = accent.toUpperCase() === color.toUpperCase();
                        return (
                            <button key={color} type="button" role="radio" aria-checked={on} aria-label={color} onClick={() => onAccent(color)}
                                className={cn('h-11 w-11 rounded-full border-2 transition-transform', on ? 'scale-110 border-foreground' : 'border-transparent')}
                                style={{ background: color }} />
                        );
                    })}
                    <label className="flex h-11 items-center gap-2 rounded-full border border-border px-3 text-sm">
                        <span className="sr-only">Özel renk</span>
                        <input type="color" value={accent || current.accent} onChange={e => onAccent(e.target.value.toUpperCase())}
                            className="h-7 w-7 cursor-pointer rounded-full border-0 bg-transparent p-0" />
                        Özel
                    </label>
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">Düğmeler, rozetler ve süsler bu renkte olur. Okunurluk için düğme yazısı ve tonu kendiliğinden ayarlanır.</p>
            </div>
        </div>
    );
}

// ── Haftalık saat ────────────────────────────────────────────────────────────────────────────────

const DAYS: { day: number; label: string }[] = [
    { day: 1, label: 'Pazartesi' }, { day: 2, label: 'Salı' }, { day: 3, label: 'Çarşamba' }, { day: 4, label: 'Perşembe' },
    { day: 5, label: 'Cuma' }, { day: 6, label: 'Cumartesi' }, { day: 0, label: 'Pazar' },
];

function weekFrom(opens: string | null, closes: string | null): SiteDayHours[] {
    return DAYS.map(d => ({ day: d.day, isOpen: true, opens: opens || '09:00', closes: closes || '22:00' }));
}

/**
 * "Her gün aynı" kısayolu (tek aralık: opensAt/closesAt) ya da gün gün 7 satır. Çoğu restoran kısayolu seçer;
 * kapatınca 7 satır tek aralıkla dolar.
 */
export function WeeklyHoursEditor({ opensAt, closesAt, week, onSingle, onWeek }: {
    opensAt: string | null; closesAt: string | null; week: SiteDayHours[];
    onSingle: (opens: string | null, closes: string | null) => void;
    onWeek: (week: SiteDayHours[]) => void;
}) {
    const same = week.length === 0;
    const half = (opensAt ? 1 : 0) + (closesAt ? 1 : 0) === 1;
    const setDay = (day: number, patch: Partial<SiteDayHours>) => onWeek(week.map(d => (d.day === day ? { ...d, ...patch } : d)));
    const copyFirstToAll = () => {
        const first = week.find(d => d.day === 1) ?? week[0];
        onWeek(week.map(d => ({ ...d, isOpen: first.isOpen, opens: first.opens, closes: first.closes })));
    };

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Saat biçimi">
                <button type="button" role="radio" aria-checked={same} onClick={() => {
                    const first = week.find(d => d.isOpen);
                    onSingle(first?.opens ?? opensAt, first?.closes ?? closesAt);
                    onWeek([]);
                }} className={cn('h-10 rounded-lg border-2 px-3.5 text-sm font-semibold', same ? 'border-foreground' : 'border-border text-muted-foreground')}>
                    Her gün aynı
                </button>
                <button type="button" role="radio" aria-checked={!same} onClick={() => { if (same) onWeek(weekFrom(opensAt, closesAt)); }}
                    className={cn('h-10 rounded-lg border-2 px-3.5 text-sm font-semibold', !same ? 'border-foreground' : 'border-border text-muted-foreground')}>
                    Günlere göre farklı
                </button>
            </div>

            {same ? (
                <>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field id="site-opens" label="Açılış">
                            <input id="site-opens" type="time" className={inputClass} value={opensAt ?? ''} onChange={e => onSingle(e.target.value || null, closesAt)} />
                        </Field>
                        <Field id="site-closes" label="Kapanış">
                            <input id="site-closes" type="time" className={inputClass} value={closesAt ?? ''} onChange={e => onSingle(opensAt, e.target.value || null)} />
                        </Field>
                    </div>
                    {half && <p className="text-xs text-destructive">Açılış ve kapanış saatini birlikte girin.</p>}
                </>
            ) : (
                <div className="space-y-2">
                    {DAYS.map(({ day, label }) => {
                        const d = week.find(w => w.day === day);
                        if (!d) return null;
                        return (
                            <div key={day} className="grid grid-cols-[110px_auto_1fr_1fr] items-center gap-2 sm:grid-cols-[120px_auto_160px_160px]">
                                <span className="text-sm font-medium text-foreground">{label}</span>
                                <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                    <input type="checkbox" checked={d.isOpen} onChange={e => setDay(day, { isOpen: e.target.checked })} className="h-4 w-4" />
                                    Açık
                                </label>
                                <input type="time" aria-label={`${label} açılış`} className={inputClass} disabled={!d.isOpen} value={d.opens}
                                    onChange={e => setDay(day, { opens: e.target.value || '09:00' })} />
                                <input type="time" aria-label={`${label} kapanış`} className={inputClass} disabled={!d.isOpen} value={d.closes}
                                    onChange={e => setDay(day, { closes: e.target.value || '22:00' })} />
                            </div>
                        );
                    })}
                    <button type="button" onClick={copyFirstToAll} className={smallButton}>Pazartesiyi bütün günlere uygula</button>
                    {!week.some(d => d.isOpen) && <p className="text-xs text-destructive">Haftada en az bir gün açık olmalı.</p>}
                </div>
            )}
        </div>
    );
}

// ── Mekân galerisi ───────────────────────────────────────────────────────────────────────────────

export function GalleryManager({ urls, max, busy, onAdd, onRemove, onMove }: {
    urls: string[]; max: number; busy: boolean;
    onAdd: (files: File[]) => void; onRemove: (index: number) => void; onMove: (from: number, to: number) => void;
}) {
    const inputRef = useRef<HTMLInputElement>(null);
    const full = urls.length >= max;
    return (
        <div className="space-y-3">
            {urls.length > 0 ? (
                <ol className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4">
                    {urls.map((url, i) => (
                        <li key={url} className="space-y-1.5">
                            <div className="relative aspect-square overflow-hidden rounded-lg border border-border bg-muted">
                                <img src={url} alt={`Mekân fotoğrafı ${i + 1}`} className="h-full w-full object-cover" />
                                {i === 0 && <span className="absolute left-1.5 top-1.5 rounded bg-black/55 px-1.5 py-0.5 text-[10px] font-semibold text-white">Büyük</span>}
                            </div>
                            <div className="flex items-center justify-between gap-1">
                                <button type="button" aria-label="Öne al" disabled={busy || i === 0} onClick={() => onMove(i, i - 1)} className={cn(smallButton, 'h-8 px-2')}>
                                    <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                                </button>
                                <button type="button" aria-label="Sona al" disabled={busy || i === urls.length - 1} onClick={() => onMove(i, i + 1)} className={cn(smallButton, 'h-8 px-2')}>
                                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                                </button>
                                <button type="button" aria-label={`Fotoğraf ${i + 1} kaldır`} disabled={busy} onClick={() => onRemove(i)} className={cn(smallButton, 'h-8 px-2 text-rb-red hover:bg-rb-red-bg')}>
                                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                                </button>
                            </div>
                        </li>
                    ))}
                </ol>
            ) : (
                <div className="flex aspect-[16/5] items-center justify-center rounded-lg border border-dashed border-border bg-muted px-4 text-center text-sm text-muted-foreground">
                    Henüz mekân fotoğrafı yok. Salon, avlu, masalar ve ışık: en az 3 fotoğraf yükleyin.
                </div>
            )}
            <div className="flex flex-wrap items-center gap-3">
                <button type="button" disabled={busy || full} onClick={() => inputRef.current?.click()} className={smallButton}>
                    <ImagePlus className="h-4 w-4" aria-hidden="true" />
                    {busy ? 'Yükleniyor…' : 'Fotoğraf ekle'}
                </button>
                <span className="text-xs text-muted-foreground">{urls.length} / {max} · İlk fotoğraf galerinin büyük karesidir. Birden fazla seçebilirsiniz.</span>
            </div>
            <input ref={inputRef} type="file" multiple accept="image/jpeg,image/png,image/webp" className="hidden"
                onChange={e => { const files = Array.from(e.target.files ?? []); e.target.value = ''; if (files.length) onAdd(files.slice(0, max - urls.length)); }} />
        </div>
    );
}

// ── Kısa liste alanları ──────────────────────────────────────────────────────────────────────────

function ListShell<T>({ items, max, empty, addLabel, onAdd, onRemove, render }: {
    items: T[]; max: number; empty: T; addLabel: string; onAdd: (item: T) => void; onRemove: (index: number) => void;
    render: (item: T, index: number) => ReactNode;
}) {
    return (
        <div className="space-y-3">
            {items.map((item, i) => (
                <div key={i} className="flex items-start gap-2 rounded-lg border border-border p-3">
                    <div className="min-w-0 flex-1 space-y-2">{render(item, i)}</div>
                    <button type="button" aria-label="Kaldır" onClick={() => onRemove(i)} className={cn(smallButton, 'h-9 px-2 text-rb-red hover:bg-rb-red-bg')}>
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                </div>
            ))}
            {items.length < max && (
                <button type="button" onClick={() => onAdd(empty)} className={smallButton}>
                    <Plus className="h-4 w-4" aria-hidden="true" />{addLabel}
                </button>
            )}
            <p className="text-xs text-muted-foreground">{items.length} / {max}</p>
        </div>
    );
}

export function ReviewsEditor({ items, onChange, limits }: {
    items: SiteReview[]; onChange: (items: SiteReview[]) => void; limits: { author: number; text: number; source: number; max: number };
}) {
    const set = (i: number, patch: Partial<SiteReview>) => onChange(items.map((r, j) => (j === i ? { ...r, ...patch } : r)));
    return (
        <ListShell items={items} max={limits.max} empty={{ author: '', text: '', source: 'Google' }} addLabel="Yorum ekle"
            onAdd={r => onChange([...items, r])} onRemove={i => onChange(items.filter((_, j) => j !== i))}
            render={(r, i) => (
                <>
                    <textarea aria-label="Yorum metni" rows={2} className={cn(inputClass, 'resize-y')} maxLength={limits.text}
                        placeholder="Adana'yı burada yedikten sonra başka yerde yiyemiyorum." value={r.text} onChange={e => set(i, { text: e.target.value })} />
                    <div className="grid gap-2 sm:grid-cols-2">
                        <input aria-label="Yorumu yazan" className={inputClass} maxLength={limits.author} placeholder="Elif K." value={r.author} onChange={e => set(i, { author: e.target.value })} />
                        <input aria-label="Kaynak" className={inputClass} maxLength={limits.source} placeholder="Google" value={r.source} onChange={e => set(i, { source: e.target.value })} />
                    </div>
                </>
            )} />
    );
}

export function ValuesEditor({ items, onChange, limits }: {
    items: SiteValue[]; onChange: (items: SiteValue[]) => void; limits: { title: number; text: number; max: number };
}) {
    const set = (i: number, patch: Partial<SiteValue>) => onChange(items.map((v, j) => (j === i ? { ...v, ...patch } : v)));
    return (
        <ListShell items={items} max={limits.max} empty={{ title: '', text: '' }} addLabel="Değer ekle"
            onAdd={v => onChange([...items, v])} onRemove={i => onChange(items.filter((_, j) => j !== i))}
            render={(v, i) => (
                <>
                    <input aria-label="Değer başlığı" className={inputClass} maxLength={limits.title} placeholder="Her sabah zırh" value={v.title} onChange={e => set(i, { title: e.target.value })} />
                    <input aria-label="Değer cümlesi" className={inputClass} maxLength={limits.text} placeholder="Kıyma günlük, el ile çekilir." value={v.text} onChange={e => set(i, { text: e.target.value })} />
                </>
            )} />
    );
}

export function MilestonesEditor({ items, onChange, limits }: {
    items: SiteMilestone[]; onChange: (items: SiteMilestone[]) => void; limits: { text: number; max: number };
}) {
    const set = (i: number, patch: Partial<SiteMilestone>) => onChange(items.map((m, j) => (j === i ? { ...m, ...patch } : m)));
    return (
        <ListShell items={items} max={limits.max} empty={{ year: new Date().getFullYear(), text: '' }} addLabel="Kilometre taşı ekle"
            onAdd={m => onChange([...items, m])} onRemove={i => onChange(items.filter((_, j) => j !== i))}
            render={(m, i) => (
                <div className="grid gap-2 sm:grid-cols-[110px_1fr]">
                    <input aria-label="Yıl" type="number" inputMode="numeric" min={1800} max={new Date().getFullYear()} className={inputClass}
                        value={m.year || ''} onChange={e => set(i, { year: Number(e.target.value) || 0 })} />
                    <input aria-label="Ne oldu" className={inputClass} maxLength={limits.text} placeholder="Taş fırın geldi, pideler başladı." value={m.text} onChange={e => set(i, { text: e.target.value })} />
                </div>
            )} />
    );
}
