import { useRef, useState, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, Check, ExternalLink, ImagePlus, Images, Loader2, RotateCcw, Trash2 } from 'lucide-react';
import { siteEditorService, type SiteDraftTexts } from '@/features/customerSite/api/siteEditorService';
import { inputClass } from '@/lib/formStyles';
import { cn } from '@/lib/utils';
import { EXTERNAL_SOURCES, SITE_LIMITS, type SiteEditTarget } from '@/pages/public/site/siteEditContext';
import { SITE_AMENITIES } from '@/pages/public/site/siteParts';
import { restaurantName } from '@/pages/public/site/useSite';
import { DesignPicker, FontPicker, ThemePicker } from '../SiteSettingsEditors';
import { photoTarget, type EditorCtx } from './editorActions';
import { isStockUrl, tooBig } from './editorModel';
import { ed } from './editorStyles';
import { PhotoPicker } from './PhotoPicker';
import { SeoPreview } from './SeoPreview';

// Önizlemenin üstünde açılan küçük pencerelerin içi (fotoğraf menüsü, saat, iletişim, puan, kuruluş yılı, olanaklar,
// "başka sayfadan gelir") ve "Genel ayarlar" penceresinin bölümleri. Telefonda aynı içerik alttan açılır.

// ── Küçük pencerenin içleri ─────────────────────────────────────────────────────────────────────

/** Pencere başlığı; açıklama gerekiyorsa küçük "?" düğmesinin arkasında (tek kısa satır). */
function Head({ title, hint }: { title: string; hint?: ReactNode }) {
    const [open, setOpen] = useState(false);
    return (
        <div className="flex flex-col gap-1 pr-7">
            <span className="flex items-center gap-1.5">
                <b className="text-[15px] text-foreground">{title}</b>
                {hint && (
                    <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open} aria-label="Açıklama"
                        className="flex h-5 w-5 items-center justify-center rounded-full border border-border text-xs font-bold text-muted-foreground hover:text-foreground">?</button>
                )}
            </span>
            {hint && open && <span className="text-[13px] leading-snug text-muted-foreground">{hint}</span>}
        </div>
    );
}

const menuButton = 'flex w-full items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-left text-sm font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-50';

export function PhotoMenu({ ctx, target, onDone }: { ctx: EditorCtx; target: SiteEditTarget; onDone: () => void }) {
    const fileRef = useRef<HTMLInputElement>(null);
    const p = photoTarget(ctx, target);
    if (!p) return <Head title="Fotoğraf" hint="Bu fotoğraf artık yok." />;
    const busy = ctx.state.busy === p.busyKey;
    const done = (ok: unknown) => { if (ok !== false) onDone(); };
    return (
        <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
                {p.current && (
                    <span className="relative h-12 w-16 shrink-0 overflow-hidden rounded-lg bg-muted">
                        <img src={p.current} alt="" className="h-full w-full object-cover" />
                        {isStockUrl(p.current) && <span className="absolute bottom-0.5 left-0.5 rounded bg-black/55 px-1 text-[8px] font-semibold text-white">Temsili</span>}
                    </span>
                )}
                <Head title={p.title} hint={p.hint} />
            </div>
            <div className="flex flex-col">
                <button type="button" disabled={busy} className={menuButton} onClick={() => fileRef.current?.click()}>
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ImagePlus className="h-4 w-4" aria-hidden="true" />}
                    {busy ? 'Yükleniyor…' : p.multiple ? 'Yükle (birden fazla seçebilirsiniz)' : 'Yükle'}
                </button>
                <button type="button" disabled={busy} className={menuButton} onClick={() => ctx.openStock(target)}>
                    <Images className="h-4 w-4" aria-hidden="true" />Hazır görsellerden seç
                </button>
                {p.move && p.canMove && (
                    <div className="flex gap-1">
                        <button type="button" disabled={busy || !p.canMove.left} className={menuButton} onClick={() => void p.move!(-1).then(done)}>
                            <ArrowLeft className="h-4 w-4" aria-hidden="true" />Öne al
                        </button>
                        <button type="button" disabled={busy || !p.canMove.right} className={menuButton} onClick={() => void p.move!(1).then(done)}>
                            Sona al<ArrowRight className="h-4 w-4" aria-hidden="true" />
                        </button>
                    </div>
                )}
                {p.hasOwn && p.remove && (
                    <button type="button" disabled={busy} className={cn(menuButton, 'text-[#A3301A] hover:bg-[#FDECE7] dark:hover:bg-rb-red-bg')}
                        onClick={() => void p.remove!().then(done)}>
                        <Trash2 className="h-4 w-4" aria-hidden="true" />{p.removeLabel}
                    </button>
                )}
            </div>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" multiple={p.multiple} className="hidden"
                onChange={e => {
                    const files = Array.from(e.target.files ?? []).filter(f => !tooBig(f));
                    e.target.value = '';
                    if (files.length) void p.upload(files).then(done);
                }} />
        </div>
    );
}

function TextInput({ id, label, value, max, onChange, placeholder, rows, hint, type = 'text' }: {
    id: string; label: string; value: string; max?: number; onChange: (v: string) => void; placeholder?: string; rows?: number; hint?: string; type?: string;
}) {
    return (
        <div className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-2">
                <label htmlFor={id} className={ed.label}>{label}</label>
                {max !== undefined && value.length >= max * 0.8 && <span className={cn(ed.counter, value.length >= max && 'text-destructive')}>{value.length} / {max}</span>}
            </div>
            {rows ? (
                <textarea id={id} rows={rows} maxLength={max} value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)} className={cn(inputClass, 'resize-y')} />
            ) : (
                <input id={id} type={type} maxLength={max} value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)} className={inputClass} />
            )}
            {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
        </div>
    );
}

function numberOrNull(value: string): number | null {
    const n = Number(value.replace(',', '.'));
    return value.trim() === '' || Number.isNaN(n) ? null : n;
}

type Patch = (patch: Partial<SiteDraftTexts>) => void;
const patcher = (ctx: EditorCtx): Patch => patch => ctx.state.updateTexts(x => ({ ...x, ...patch }));

/** Çalışma saatleri, saat notu, WhatsApp ve "nasıl gelinir" şubenindir: burada değişmez, nereden değiştiği gösterilir. */
export function HoursFields({ ctx }: { ctx: EditorCtx }) {
    return <ExternalInfo ctx={ctx} source="branchInfo" />;
}

/** Instagram şirketin sitesinde; WhatsApp her şubenin kendi bilgisidir (şube Ayarlar'ı). */
export function ContactFields({ ctx, idPrefix = '' }: { ctx: EditorCtx; idPrefix?: string }) {
    const t = ctx.texts;
    const set = patcher(ctx);
    return (
        <div className="flex flex-col gap-3.5">
            <TextInput id={`${idPrefix}instagram`} type="url" label="Instagram adresi" value={t.instagramUrl} placeholder="https://instagram.com/restoraniniz"
                onChange={v => set({ instagramUrl: v })} />
            <p className="m-0 text-xs text-muted-foreground">{EXTERNAL_SOURCES.branchInfo.text}</p>
        </div>
    );
}

export function RatingFields({ ctx, idPrefix = '' }: { ctx: EditorCtx; idPrefix?: string }) {
    const t = ctx.texts;
    const set = patcher(ctx);
    return (
        <div className="flex flex-col gap-3.5">
            <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                    <label htmlFor={`${idPrefix}puan`} className={ed.label}>Puan</label>
                    <input id={`${idPrefix}puan`} type="number" inputMode="decimal" step="0.1" min={1} max={5} placeholder="4,7" className={inputClass}
                        value={t.rating ?? ''} onChange={e => set({ rating: numberOrNull(e.target.value) })} />
                </div>
                <div className="flex flex-col gap-1.5">
                    <label htmlFor={`${idPrefix}yorum-sayisi`} className={ed.label}>Yorum sayısı</label>
                    <input id={`${idPrefix}yorum-sayisi`} type="number" inputMode="numeric" min={0} placeholder="1240" className={inputClass}
                        value={t.reviewCount ?? ''} onChange={e => set({ reviewCount: numberOrNull(e.target.value) })} />
                </div>
            </div>
            <TextInput id={`${idPrefix}yorum-baglanti`} type="url" label="Google Haritalar bağlantısı" max={SITE_LIMITS.reviewsUrl} value={t.reviewsUrl}
                placeholder="https://maps.app.goo.gl/…" onChange={v => set({ reviewsUrl: v })} />
        </div>
    );
}

function YearField({ ctx }: { ctx: EditorCtx }) {
    const t = ctx.texts;
    return (
        <div className="flex flex-col gap-1.5">
            <label htmlFor="kurulus" className={ed.label}>Kuruluş yılı</label>
            <input id="kurulus" type="number" inputMode="numeric" min={1800} max={new Date().getFullYear()} placeholder="1987" autoFocus
                className={cn(inputClass, 'max-w-[160px]')} value={t.foundedYear ?? ''}
                onChange={e => ctx.state.updateTexts(x => ({ ...x, foundedYear: numberOrNull(e.target.value) }))} />
        </div>
    );
}

function AmenitiesFields({ ctx }: { ctx: EditorCtx }) {
    const selected = ctx.texts.amenities;
    const toggle = (key: string) => ctx.state.updateTexts(x => ({
        ...x, amenities: x.amenities.includes(key) ? x.amenities.filter(a => a !== key) : [...x.amenities, key],
    }));
    return (
        <div className="flex flex-wrap gap-1.5">
            {SITE_AMENITIES.map(a => {
                const on = selected.includes(a.key);
                return (
                    <button key={a.key} type="button" aria-pressed={on} onClick={() => toggle(a.key)}
                        className={cn('inline-flex h-8 items-center gap-1 rounded-full border px-3 text-[13px] font-medium transition-colors',
                            on ? 'border-foreground bg-foreground text-background' : 'border-border text-foreground hover:bg-muted')}>
                        {on && <Check className="h-3.5 w-3.5" aria-hidden="true" />}{a.label}
                    </button>
                );
            })}
        </div>
    );
}

export function ExternalInfo({ ctx, source }: { ctx: EditorCtx; source: string }) {
    const info = EXTERNAL_SOURCES[source];
    if (!info) return null;
    return (
        <div className="flex flex-col gap-2.5">
            <Head title={info.title} hint={info.text} />
            {info.links.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {info.links.map(l => (
                        <button key={l.to} type="button" className={ed.btnSm} onClick={() => ctx.openAdmin(l.to)}>
                            {l.label} <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                    ))}
                </div>
            )}
            {info.edit && (
                <button type="button" className={cn(ed.link, 'self-start')} onClick={() => ctx.select(info.edit!.target)}>{info.edit.label} →</button>
            )}
        </div>
    );
}

/** Önizlemedeki küçük pencerenin içi (hedefe göre). */
export function PopoverBody({ ctx, target, onDone }: { ctx: EditorCtx; target: SiteEditTarget; onDone: () => void }) {
    if (target.startsWith('external:')) return <ExternalInfo ctx={ctx} source={target.slice(9)} />;
    switch (target) {
        case 'hours': return <HoursFields ctx={ctx} />;
        case 'rating': return <><Head title="Google puanı" hint="Yalnız gerçek puan. Boşsa “Misafirlerimiz” kartı görünmez." /><RatingFields ctx={ctx} /></>;
        case 'contact': return <><Head title="Instagram" /><ContactFields ctx={ctx} /></>;
        case 'year': return <YearField ctx={ctx} />;
        case 'amenities': return <><Head title="Olanaklar" /><AmenitiesFields ctx={ctx} /></>;
    }
    return <PhotoMenu ctx={ctx} target={target} onDone={onDone} />;
}

// ── "Genel ayarlar" bölümleri ───────────────────────────────────────────────────────────────────

/** Restoran logosu: QR menünün başlığında ve fotoğrafı olmayan ürünlerde. Hazır görsel yok; yalnız kendi dosyası. */
export function LogoFields({ ctx }: { ctx: EditorCtx }) {
    const fileRef = useRef<HTMLInputElement>(null);
    const logoUrl = ctx.editor.draft.logoUrl ?? '';
    const busy = ctx.state.busy === 'photo:logo';
    return (
        <div className="flex items-center gap-4">
            <span className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border bg-muted">
                {logoUrl
                    ? <img src={logoUrl} alt="Restoran logosu" className="h-full w-full object-contain p-1.5" />
                    : <span className="text-xl font-bold text-muted-foreground" aria-hidden="true">{initials(restaurantName(ctx.site))}</span>}
            </span>
            <div className="flex flex-col gap-1.5">
                <span className="text-[13px] leading-snug text-muted-foreground">
                    QR menünün başında ve fotoğrafı olmayan ürünlerde görünür. Kare, şeffaf arka planlı PNG önerilir.
                    {!logoUrl && ' Logo yokken adınızın baş harfleri görünür.'}
                </span>
                <div className="flex flex-wrap items-center gap-3">
                    <button type="button" disabled={busy} className={cn(ed.link, 'inline-flex items-center gap-1')} onClick={() => fileRef.current?.click()}>
                        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <ImagePlus className="h-3.5 w-3.5" aria-hidden="true" />}
                        {busy ? 'Yükleniyor…' : logoUrl ? 'Değiştir' : 'Logo yükle'}
                    </button>
                    {logoUrl && (
                        <button type="button" disabled={busy} className={cn(ed.link, 'inline-flex items-center gap-1')}
                            onClick={() => void ctx.state.runPhoto('photo:logo', () => siteEditorService.removeImage('logo'))}>
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />Kaldır
                        </button>
                    )}
                </div>
            </div>
            <input ref={fileRef} type="file" accept="image/png,image/webp,image/jpeg" className="hidden" aria-label="Logo dosyası"
                onChange={e => {
                    const file = e.target.files?.[0];
                    e.target.value = '';
                    if (file && !tooBig(file)) void ctx.state.runPhoto('photo:logo', () => siteEditorService.uploadImage('logo', file), 'Logo yüklenemedi.');
                }} />
        </div>
    );
}

function initials(name: string): string {
    return name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]!.toLocaleUpperCase('tr-TR')).join('') || '?';
}

/** "Tasarımlar": önce tasarım; renk (tema) altında, seçilen tasarımın temalarıyla. Seçim taslağa ve önizlemeye hemen gider. */
export function DesignFields({ ctx }: { ctx: EditorCtx }) {
    const t = ctx.texts;
    return (
        <DesignPicker design={t.design ?? ''} theme={t.theme} accent={t.accentColor}
            onDesign={design => ctx.state.updateTexts(x => ({ ...x, design }))} />
    );
}

/** "Yazı tipi": tasarımın kendi çifti ya da hazır bir başlık + gövde çifti; önizlemeye hemen gider. */
export function FontFields({ ctx }: { ctx: EditorCtx }) {
    const t = ctx.texts;
    return <FontPicker design={t.design ?? ''} font={t.font ?? ''} onFont={font => ctx.state.updateTexts(x => ({ ...x, font }))} />;
}

export function ThemeFields({ ctx }: { ctx: EditorCtx }) {
    const t = ctx.texts;
    return (
        <ThemePicker design={t.design} theme={t.theme} accent={t.accentColor}
            onTheme={theme => ctx.state.updateTexts(x => ({ ...x, theme }))}
            onAccent={accentColor => ctx.state.updateTexts(x => ({ ...x, accentColor }))} />
    );
}

export function SeoFields({ ctx, live }: { ctx: EditorCtx; live: { title: string; description: string; imageUrl: string } | null }) {
    const seo = ctx.editor.seo;
    const t = ctx.texts;
    const [editingTitle, setEditingTitle] = useState(Boolean(t.seoTitle));
    const [editingDescription, setEditingDescription] = useState(Boolean(t.seoDescription));
    const [picking, setPicking] = useState(false);
    const set = patcher(ctx);
    const description = t.seoDescription || seo.autoDescription;
    const length = description.length;
    const tone = length > 155 ? 'text-[#A3301A]' : length >= 120 ? 'text-[#1B6A43]' : 'text-[#B8880A]';
    const bar = length > 155 ? 'bg-[#A3301A]' : length >= 120 ? 'bg-[#1B6A43]' : 'bg-[#C9821A]';
    const shareUrl = ctx.editor.draft.shareImageUrl;
    const shareBusy = ctx.state.busy === 'photo:share';

    const autoHead = (label: string, isAuto: boolean, onChange: () => void, editing: boolean) => (
        <div className="flex items-baseline justify-between gap-2">
            <span className={ed.label}>{label}</span>
            {editing
                ? <span className={ed.counter}>Düzenleniyor</span>
                : <span className="flex items-baseline gap-2">{isAuto && <span className={ed.autoPill}>otomatik</span>}<button type="button" className={ed.link} onClick={onChange}>değiştir</button></span>}
        </div>
    );

    return (
        <div className="flex flex-col gap-5">
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                        {autoHead('Sayfa başlığı', !t.seoTitle, () => { setEditingTitle(true); set({ seoTitle: seo.autoTitle }); }, editingTitle)}
                        {editingTitle ? (
                            <>
                                <input aria-label="Sayfa başlığı" className={cn(inputClass, 'border-2 border-[#2B7FFF]')} maxLength={SITE_LIMITS.seoTitle}
                                    value={t.seoTitle} onChange={e => set({ seoTitle: e.target.value })} />
                                <div className="flex items-center justify-between">
                                    <button type="button" className={cn(ed.link, 'inline-flex items-center gap-1')} onClick={() => { setEditingTitle(false); set({ seoTitle: '' }); }}>
                                        <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />Otomatiğe dön
                                    </button>
                                    <span className={ed.counter}>{t.seoTitle.length} / {SITE_LIMITS.seoTitle}</span>
                                </div>
                            </>
                        ) : (
                            <div className="min-h-10 rounded-[10px] border border-border bg-[#F7F2EA] px-3 py-[9px] text-sm dark:bg-muted">{t.seoTitle || seo.autoTitle}</div>
                        )}
                    </div>
                    <div className="flex flex-col gap-1.5">
                        {autoHead('Açıklama', !t.seoDescription, () => { setEditingDescription(true); set({ seoDescription: seo.autoDescription }); }, editingDescription)}
                        {editingDescription ? (
                            <textarea aria-label="Açıklama" rows={4} maxLength={SITE_LIMITS.seoDescription}
                                className={cn(inputClass, 'resize-none border-2 border-[#2B7FFF] leading-[1.45]')}
                                value={t.seoDescription} onChange={e => set({ seoDescription: e.target.value })} />
                        ) : (
                            <div className="rounded-[10px] border border-border bg-[#F7F2EA] px-3 py-[9px] text-sm leading-[1.45] dark:bg-muted">{description || '—'}</div>
                        )}
                        <div className="flex flex-col gap-1">
                            <div className="relative h-[5px] rounded-full bg-border">
                                <div className={cn('absolute left-0 top-0 h-[5px] rounded-full', bar)} style={{ width: `${Math.min(100, (length / 155) * 100)}%` }} />
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">{length > 155 ? 'Google 155 karakterden sonrasını kısaltabilir.' : ''}</span>
                                <span className={cn('font-bold tabular-nums', tone)}>{length} / 155</span>
                            </div>
                        </div>
                        {editingDescription && (
                            <button type="button" className={cn(ed.link, 'inline-flex items-center gap-1 self-start')} onClick={() => { setEditingDescription(false); set({ seoDescription: '' }); }}>
                                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />Otomatiğe dön (alt başlık + ilçe + saat)
                            </button>
                        )}
                    </div>
                    <div className="flex flex-col gap-2">
                        <div className="flex items-baseline justify-between gap-2">
                            <span className={ed.label}>Paylaşım görseli</span>
                            <span className="flex items-baseline gap-2">
                                {!shareUrl && <span className={ed.autoPill}>otomatik</span>}
                                <button type="button" className={ed.link} onClick={() => setPicking(p => !p)} aria-expanded={picking}>{picking ? 'kapat' : 'değiştir'}</button>
                            </span>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="h-[63px] w-[120px] shrink-0 overflow-hidden rounded-lg bg-muted">
                                {(shareUrl || seo.autoShareImageUrl) && <img src={shareUrl || seo.autoShareImageUrl} alt="" className="h-full w-full object-cover" />}
                            </span>
                            <span className="text-[13px] leading-[1.45] text-muted-foreground">
                                {shareUrl ? 'Seçtiğiniz görsel' : 'Kapak fotoğrafı'}
                            </span>
                        </div>
                        {shareUrl && (
                            <button type="button" disabled={shareBusy} className={cn(ed.link, 'inline-flex items-center gap-1 self-start')}
                                onClick={() => void ctx.state.runPhoto('photo:share', () => siteEditorService.removeImage('share'))}>
                                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />Otomatiğe dön (kapak)
                            </button>
                        )}
                        {picking && (
                            <PhotoPicker currentUrl={shareUrl} markLabel="Paylaşımda" actionHint="tıklayınca paylaşım görseli olur" busy={shareBusy}
                                onStock={image => void ctx.state.runPhoto('photo:share', () => siteEditorService.selectStockImage('share', image.id)).then(ok => { if (ok) setPicking(false); })}
                                onUpload={files => void ctx.state.runPhoto('photo:share', () => siteEditorService.uploadImage('share', files[0]), 'Fotoğraf yüklenemedi.').then(ok => { if (ok) setPicking(false); })} />
                        )}
                    </div>
                </div>
                <div className="overflow-hidden rounded-xl">
                    <SeoPreview compact name={restaurantName(ctx.site)} siteUrl={ctx.editor.siteUrl}
                        draft={{ title: t.seoTitle || seo.autoTitle, description, imageUrl: shareUrl || seo.autoShareImageUrl }} live={live} />
                </div>
            </div>
        </div>
    );
}

export function ExternalList({ ctx }: { ctx: EditorCtx }) {
    const rows = ['restaurant', 'branchInfo', 'menu', 'setMenus', 'reservation', 'online', 'tables', 'messages', 'auto'];
    return (
        <ul className="m-0 flex list-none flex-col p-0">
            {rows.map(key => {
                const info = EXTERNAL_SOURCES[key];
                return (
                    <li key={key} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-border py-2.5 first:border-t-0">
                        <span className="flex min-w-[200px] flex-1 flex-col">
                            <b className="text-sm">{info.title}</b>
                            <span className="text-[13px] text-muted-foreground">{info.text}</span>
                        </span>
                        <span className="flex flex-wrap gap-1.5">
                            {info.links.map(l => (
                                <button key={l.to} type="button" className={ed.btnSm} onClick={() => ctx.openAdmin(l.to)}>{l.label} ↗</button>
                            ))}
                        </span>
                    </li>
                );
            })}
        </ul>
    );
}
