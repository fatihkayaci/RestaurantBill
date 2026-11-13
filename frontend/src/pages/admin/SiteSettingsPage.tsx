import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, ImagePlus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { siteSettingsService, type BranchSiteInput, type SiteImageSlot } from '@/features/customerSite/api/siteSettingsService';
import type { BranchSite } from '@/features/customerSite/types';
import { branchService } from '@/features/branches/api/branchService';
import { PageError, PageLoading } from '@/components/ui/page-state';
import { getApiErrorMessage } from '@/lib/apiError';
import { inputClass, labelClass } from '@/lib/formStyles';
import { ROOT_DOMAIN } from '@/lib/tenant';
import { cn } from '@/lib/utils';
import { DEFAULT_ACCENT } from '@/pages/public/site/siteTheme';

const ACCENT_OPTIONS = ['#E2531F', '#2F55D4', '#1F7A4D', '#7A3FD1', '#B8860B', '#111111'];

const LIMITS = { headline: 80, tagline: 160, storyTitle: 120, about: 800, hoursNote: 80 };

function toInput(site: BranchSite): BranchSiteInput {
    return {
        headline: site.headline,
        tagline: site.tagline,
        storyTitle: site.storyTitle,
        about: site.about,
        opensAt: site.opensAt,
        closesAt: site.closesAt,
        hoursNote: site.hoursNote,
        instagramUrl: site.instagramUrl,
        accentColor: site.accentColor,
    };
}

// Admin: restoranın müşteri sitesinin içeriği. Boş bırakılan alanın bölümü sitede görünmez.
export default function SiteSettingsPage() {
    const [site, setSite] = useState<BranchSite | null>(null);
    const [form, setForm] = useState<BranchSiteInput | null>(null);
    const [failed, setFailed] = useState(false);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState<SiteImageSlot | null>(null);
    const [siteUrl, setSiteUrl] = useState<string | null>(null);
    const [reloadTick, setReloadTick] = useState(0);

    useEffect(() => {
        let cancelled = false;
        siteSettingsService.get()
            .then(data => { if (!cancelled) { setSite(data); setForm(toInput(data)); setFailed(false); } })
            .catch(() => { if (!cancelled) setFailed(true); });
        branchService.getMyBranch()
            .then(b => { if (!cancelled && b.slug) setSiteUrl(`https://${b.slug}.${ROOT_DOMAIN}`); })
            .catch(() => { /* bağlantı düğmesi gizli kalır */ });
        return () => { cancelled = true; };
    }, [reloadTick]);

    if (failed && !site) return <PageError onRetry={() => setReloadTick(t => t + 1)} />;
    if (!site || !form) return <PageLoading />;

    const set = <K extends keyof BranchSiteInput>(key: K, value: BranchSiteInput[K]) => setForm({ ...form, [key]: value });
    const dirty = JSON.stringify(form) !== JSON.stringify(toInput(site));
    const hoursHalf = (form.opensAt ? 1 : 0) + (form.closesAt ? 1 : 0) === 1;

    const save = async () => {
        if (hoursHalf) { toast.error('Açılış ve kapanış saatini birlikte girin ya da ikisini de boş bırakın.'); return; }
        setSaving(true);
        try {
            const saved = await siteSettingsService.update({
                ...form,
                opensAt: form.opensAt || null,
                closesAt: form.closesAt || null,
            });
            setSite(saved);
            setForm(toInput(saved));
            toast.success('Site kaydedildi.');
        } catch (err) {
            toast.error(getApiErrorMessage(err, 'Site kaydedilemedi.'));
        } finally {
            setSaving(false);
        }
    };

    const upload = async (slot: SiteImageSlot, file: File) => {
        if (file.size > 10_000_000) { toast.error('Görsel en fazla 10 MB olabilir.'); return; }
        setUploading(slot);
        try {
            const saved = await siteSettingsService.uploadImage(slot, file);
            setSite(saved);
            toast.success('Fotoğraf yüklendi.');
        } catch (err) {
            toast.error(getApiErrorMessage(err, 'Fotoğraf yüklenemedi.'));
        } finally {
            setUploading(null);
        }
    };

    const remove = async (slot: SiteImageSlot) => {
        setUploading(slot);
        try {
            setSite(await siteSettingsService.removeImage(slot));
        } catch (err) {
            toast.error(getApiErrorMessage(err, 'Fotoğraf kaldırılamadı.'));
        } finally {
            setUploading(null);
        }
    };

    const accent = form.accentColor || DEFAULT_ACCENT;

    return (
        <div className="mx-auto max-w-3xl space-y-5 pb-24">
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h1 className="font-serif text-2xl font-bold text-foreground">Restoran sitesi</h1>
                    <p className="mt-0.5 text-sm text-muted-foreground">Müşterilerin gördüğü sayfa. Boş bıraktığınız bölüm sitede görünmez.</p>
                </div>
                {siteUrl && (
                    <a href={siteUrl} target="_blank" rel="noopener noreferrer"
                        className="inline-flex h-11 items-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-semibold text-foreground transition-colors hover:bg-muted">
                        <ExternalLink className="h-4 w-4" aria-hidden="true" />
                        Siteyi aç
                    </a>
                )}
            </div>

            <Panel title="Fotoğraflar">
                <div className="grid gap-4 sm:grid-cols-2">
                    <ImageSlot
                        label="Kapak fotoğrafı"
                        hint="Ana sayfanın tam ekran girişi ve menü sayfasının başlığı. Yatay, en az 1600 px."
                        url={site.coverImageUrl}
                        busy={uploading === 'cover'}
                        onPick={file => upload('cover', file)}
                        onRemove={() => remove('cover')}
                    />
                    <ImageSlot
                        label="Hikâye fotoğrafı"
                        hint="“Hikâyemiz” bölümünde metnin yanında görünür."
                        url={site.aboutImageUrl}
                        busy={uploading === 'about'}
                        onPick={file => upload('about', file)}
                        onRemove={() => remove('about')}
                    />
                </div>
            </Panel>

            <Panel title="Giriş">
                <Field id="site-headline" label="Büyük başlık" hint="Boşsa restoranın adı yazılır." count={form.headline.length} max={LIMITS.headline}>
                    <input id="site-headline" className={inputClass} maxLength={LIMITS.headline} placeholder="Kahve, kahvaltı ve uzun sohbetler."
                        value={form.headline} onChange={e => set('headline', e.target.value)} />
                </Field>
                <Field id="site-tagline" label="Alt başlık" hint="Boşsa semt ve şehir yazılır." count={form.tagline.length} max={LIMITS.tagline}>
                    <input id="site-tagline" className={inputClass} maxLength={LIMITS.tagline} placeholder="Moda'nın mahalle kafesi. Gelin oturun ya da yolda alın."
                        value={form.tagline} onChange={e => set('tagline', e.target.value)} />
                </Field>
            </Panel>

            <Panel title="Hikâyemiz">
                <Field id="site-story-title" label="Büyük slogan"
                    hint="Bölümün başında büyük harflerle durur. Ürün fotoğraflarınız varsa ilk üçü kelimelerin arasına küçük yuvarlak resimler olarak girer."
                    count={form.storyTitle.length} max={LIMITS.storyTitle}>
                    <input id="site-story-title" className={inputClass} maxLength={LIMITS.storyTitle}
                        placeholder="Üçüncü dalga kahve, bütün gün kahvaltı ve ev yapımı tatlılar."
                        value={form.storyTitle} onChange={e => set('storyTitle', e.target.value)} />
                </Field>
                <Field id="site-about" label="Kısa hikâye" hint="2–3 cümle: ne zaman açıldınız, sizi farklı kılan ne." count={form.about.length} max={LIMITS.about}>
                    <textarea id="site-about" rows={5} className={cn(inputClass, 'resize-y')} maxLength={LIMITS.about}
                        value={form.about} onChange={e => set('about', e.target.value)} />
                </Field>
            </Panel>

            <Panel title="Saatler ve iletişim">
                <div className="grid gap-4 sm:grid-cols-2">
                    <Field id="site-opens" label="Açılış">
                        <input id="site-opens" type="time" className={inputClass} value={form.opensAt ?? ''} onChange={e => set('opensAt', e.target.value || null)} />
                    </Field>
                    <Field id="site-closes" label="Kapanış" hint="Gece yarısından sonra kapanıyorsanız (ör. 02:00) öyle yazın.">
                        <input id="site-closes" type="time" className={inputClass} value={form.closesAt ?? ''} onChange={e => set('closesAt', e.target.value || null)} />
                    </Field>
                </div>
                {hoursHalf && <p className="text-xs text-destructive">Açılış ve kapanış saatini birlikte girin.</p>}
                <Field id="site-hours-note" label="Saat notu" count={form.hoursNote.length} max={LIMITS.hoursNote}>
                    <input id="site-hours-note" className={inputClass} maxLength={LIMITS.hoursNote} placeholder="Kahvaltı 15:00'e kadar"
                        value={form.hoursNote} onChange={e => set('hoursNote', e.target.value)} />
                </Field>
                <Field id="site-instagram" label="Instagram adresi">
                    <input id="site-instagram" type="url" className={inputClass} placeholder="https://instagram.com/restoraniniz"
                        value={form.instagramUrl} onChange={e => set('instagramUrl', e.target.value)} />
                </Field>
                <p className="text-xs text-muted-foreground">
                    Adres ve telefon şube bilgilerinden gelir. Değiştirmek için <Link to="/admin/restaurant" className="font-semibold underline">Restoran</Link> sayfasına gidin.
                </p>
            </Panel>

            <Panel title="Vurgu rengi">
                <div role="radiogroup" aria-label="Vurgu rengi" className="flex flex-wrap gap-2.5">
                    {ACCENT_OPTIONS.map(color => {
                        const selected = accent.toUpperCase() === color.toUpperCase();
                        return (
                            <button
                                key={color}
                                type="button"
                                role="radio"
                                aria-checked={selected}
                                aria-label={color}
                                onClick={() => set('accentColor', color === DEFAULT_ACCENT ? '' : color)}
                                className={cn('h-11 w-11 rounded-full border-2 transition-transform', selected ? 'scale-110 border-foreground' : 'border-transparent')}
                                style={{ background: color }}
                            />
                        );
                    })}
                </div>
                <p className="text-xs text-muted-foreground">Düğmeler, isimdeki nokta ve rezervasyon bandı bu renkte olur.</p>
            </Panel>

            <div className="sticky bottom-4 z-10 flex justify-end">
                <button
                    type="button"
                    onClick={save}
                    disabled={!dirty || saving}
                    className="h-11 rounded-lg bg-rb-gold px-6 text-sm font-semibold text-rb-gold-foreground shadow-lg transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                    {saving ? 'Kaydediliyor…' : dirty ? 'Kaydet' : 'Kaydedildi'}
                </button>
            </div>
        </div>
    );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
    return (
        <section className="space-y-4 rounded-xl border border-border bg-card p-5">
            <h2 className="text-base font-semibold text-foreground">{title}</h2>
            {children}
        </section>
    );
}

function Field({ id, label, hint, count, max, children }: { id: string; label: string; hint?: string; count?: number; max?: number; children: ReactNode }) {
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

function ImageSlot({ label, hint, url, busy, onPick, onRemove }: {
    label: string; hint: string; url: string; busy: boolean; onPick: (file: File) => void; onRemove: () => void;
}) {
    const inputRef = useRef<HTMLInputElement>(null);
    return (
        <div className="space-y-2">
            <p className={labelClass}>{label}</p>
            <div className="relative aspect-[16/10] overflow-hidden rounded-lg border border-border bg-muted">
                {url ? (
                    <img src={url} alt={label} className="h-full w-full object-cover" />
                ) : (
                    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Fotoğraf yok</div>
                )}
                {busy && <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-sm font-semibold text-white">Yükleniyor…</div>}
            </div>
            <div className="flex gap-2">
                <button type="button" disabled={busy} onClick={() => inputRef.current?.click()}
                    className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50">
                    <ImagePlus className="h-4 w-4" aria-hidden="true" />
                    {url ? 'Değiştir' : 'Yükle'}
                </button>
                {url && (
                    <button type="button" disabled={busy} onClick={onRemove} aria-label={`${label} kaldır`}
                        className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-sm font-medium text-rb-red transition-colors hover:bg-rb-red-bg disabled:opacity-50">
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                        Kaldır
                    </button>
                )}
            </div>
            <p className="text-xs text-muted-foreground">{hint}</p>
            <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={e => { const file = e.target.files?.[0]; e.target.value = ''; if (file) onPick(file); }}
            />
        </div>
    );
}
