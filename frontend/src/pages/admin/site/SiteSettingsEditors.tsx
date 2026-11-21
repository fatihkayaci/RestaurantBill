import { useRef, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, Check, ImagePlus, Plus, Trash2 } from 'lucide-react';
import type { SiteDayHours, SiteMilestone, SiteReview, SiteValue } from '@/features/customerSite/types';
import { inputClass, labelClass } from '@/lib/formStyles';
import { cn } from '@/lib/utils';
import {
    ALL_SITE_FONTS_HREF, DEFAULT_DESIGN, DEFAULT_THEME, SITE_DESIGNS, SITE_DESIGN_KEYS, SITE_FONTS, SITE_FONTS_HREF, SITE_FONT_KEYS,
    designFontKey, designThemes, resolveDesign, resolveSiteColors, resolveTheme, type SiteDesignKey, type SiteFontPair,
} from '@/pages/public/site/siteTheme';

// "Restoran sitesi" ayar sayfasının düzenleyicileri: tasarım, tema, haftalık saat, mekân galerisi ve kısa liste alanları.

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

// ── Tasarım ve tema ──────────────────────────────────────────────────────────────────────────────

/**
 * Sitenin tasarımı ("Renkli ve sıcak" / "Sade" / "Elit" / "Sıcak"): her kart tasarımın küçük bir maketini o anki tema ve vurgu rengiyle
 * çizer (sayfa zemini, kapak, menü kutusu, alt bilgi, başlık yazı tipi). Renkli varsayılandır ve "" olarak kaydedilir.
 */
export function DesignPicker({ design, theme, accent, onDesign }: {
    design: string; theme: string; accent: string; onDesign: (key: string) => void;
}) {
    const selected = resolveDesign(design);
    return (
        <div role="radiogroup" aria-label="Site tasarımı" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {/* Kartlardaki yazı örneği için iki tasarımın serif'i (tarayıcı yalnız kullanılanı indirir). */}
            <link rel="stylesheet" href={SITE_FONTS_HREF} precedence="default" />
            {SITE_DESIGN_KEYS.map(key => {
                const d = SITE_DESIGNS[key];
                const P = d.palette;
                const c = resolveSiteColors(accent, theme, key);
                const t = c.theme;
                const on = selected === key;
                const sade = key === 'sade';
                return (
                    <button key={key} type="button" role="radio" aria-checked={on}
                        onClick={() => onDesign(key === DEFAULT_DESIGN ? '' : key)}
                        className={cn('flex flex-col gap-2.5 rounded-xl border-2 p-2.5 text-left transition-colors',
                            on ? 'border-foreground' : 'border-border hover:border-foreground/40')}>
                        {key === 'elit' ? <EliteMock accent={c.pop} accentText={c.accentText} />
                            : key === 'sicak' ? <SicakMock accent={c.accent} onAccent={c.onAccent} accentText={c.accentText} />
                            : key === 'meyhane' ? <MeyhaneMock accent={c.accent} accentText={c.accentText} cover={t.hero} />
                            : key === 'esnaf' ? <EsnafMock accentText={c.accentText} cover={t.hero} menuBox={t.menuBox} />
                            : key === 'bahce' ? <BahceMock accent={c.accent} accentText={c.accentText} cover={t.hero} /> : (
                        /* Küçük maket: üst menü, kapak (başlık + düğme), menü kutusu ve alt bilgi şeridi. */
                        <span aria-hidden="true" className="flex h-[148px] flex-col gap-1.5 overflow-hidden rounded-lg p-2" style={{ background: P.bg }}>
                            <span className="flex h-5 shrink-0 items-center gap-1.5 rounded-full px-2" style={{ background: sade ? P.card : 'transparent' }}>
                                {!sade && <span className="h-3.5 w-3.5 rounded-full" style={{ background: t.hero }} />}
                                <span className="h-1.5 w-10 rounded-full" style={{ background: P.fg }} />
                                <span className="ml-auto h-3 w-9 rounded-full" style={{ background: c.accent }} />
                            </span>
                            <span className="flex min-h-0 flex-1 gap-1.5">
                                <span className="flex flex-[3] flex-col justify-between rounded-md p-2"
                                    style={{ background: t.cover ?? t.hero, color: P.onHero, border: sade ? `1px solid ${t.border}` : undefined }}>
                                    <span className="text-[22px] leading-[0.95]" style={{ fontFamily: SITE_FONTS[P.font].heading, fontWeight: sade ? 400 : 800, letterSpacing: SITE_FONTS[P.font].tracking }}>
                                        Ocak<br /><em style={{ color: c.heroAccent, fontWeight: sade ? 400 : 600 }}>Kadıköy</em>
                                    </span>
                                    <span className="h-3.5 w-14 rounded-full" style={{ background: c.pop }} />
                                </span>
                                <span className="flex flex-[2] flex-col gap-1.5">
                                    <span className="flex flex-1 flex-col justify-center gap-1 rounded-md px-1.5"
                                        style={{ background: t.menuBox, border: sade ? `1px solid ${t.border}` : undefined }}>
                                        <span className="h-1.5 w-3/4 rounded-full" style={{ background: P.onMenuBox }} />
                                        <span className="h-3 rounded" style={{ background: P.menuCard }} />
                                    </span>
                                    <span className="h-4 rounded" style={{ background: P.mustard }} />
                                </span>
                            </span>
                            <span className="h-3 shrink-0 rounded" style={{ background: P.footer }} />
                        </span>
                        )}
                        <span className="flex items-center justify-between gap-2">
                            <span className="text-sm font-semibold text-foreground">{d.label}</span>
                            {on && <Check className="h-4 w-4 text-foreground" aria-hidden="true" />}
                        </span>
                        <span className="text-xs leading-snug text-muted-foreground">{d.description}</span>
                    </button>
                );
            })}
        </div>
    );
}

/**
 * Elit tasarımın maketi: koyu tam genişlik kapak (aralıklı ad, italik ikinci satır, ince vurgu çizgileri, köşesiz
 * düğme), krem bantta noktalı menü satırları ve koyu alt bilgi. `accent`: koyu zemindeki vurgu; `accentText`: kremdeki.
 */
function EliteMock({ accent, accentText }: { accent: string; accentText: string }) {
    const P = SITE_DESIGNS.elit.palette;
    return (
        <span aria-hidden="true" className="flex h-[148px] flex-col overflow-hidden rounded-lg" style={{ background: P.bg }}>
            <span className="relative flex flex-[3] flex-col items-center justify-center gap-1 px-2" style={{ background: P.paper, color: P.onPaper }}>
                <span className="absolute inset-0 opacity-60" style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.25), transparent 40%, rgba(0,0,0,0.3))' }} />
                <span className="relative flex items-center gap-1.5">
                    <span className="h-px w-4" style={{ background: accent }} />
                    <span className="text-[6px] uppercase tracking-[0.3em]" style={{ color: accent, fontFamily: SITE_FONTS[P.font].body }}>Kadıköy</span>
                    <span className="h-px w-4" style={{ background: accent }} />
                </span>
                <span className="relative text-center text-[19px] leading-[0.95]" style={{ fontFamily: SITE_FONTS[P.font].heading, fontWeight: 400 }}>
                    Ocak<br /><em>Kadıköy</em>
                </span>
                <span className="relative mt-1 h-2.5 w-12" style={{ background: accent }} />
            </span>
            <span className="flex flex-[2] flex-col justify-center gap-1.5 px-3" style={{ background: P.alt }}>
                {[0, 1].map(i => (
                    <span key={i} className="flex items-end gap-1">
                        <span className="h-1.5 w-10 rounded-full" style={{ background: P.fg }} />
                        <span className="mb-px flex-1 border-b border-dotted" style={{ borderColor: P.muted }} />
                        <span className="h-1.5 w-5 rounded-full" style={{ background: accentText }} />
                    </span>
                ))}
            </span>
            <span className="h-3 shrink-0" style={{ background: P.footer, borderTop: `1px solid ${accent}` }} />
        </span>
    );
}

/**
 * Sıcak tasarımın maketi: şeftali kapakta kalın başlık, turuncu düğme ve yuvarlak tabak; altında ince turuncu-ten çizgili
 * beyaz ürün kartları (yuvarlak tabak + fiyat) ve koyu alt bilgi.
 */
function SicakMock({ accent, onAccent, accentText }: { accent: string; onAccent: string; accentText: string }) {
    const P = SITE_DESIGNS.sicak.palette;
    const font = SITE_FONTS[P.font];
    return (
        <span aria-hidden="true" className="flex h-[148px] flex-col overflow-hidden rounded-lg" style={{ background: `linear-gradient(160deg, ${P.bg}, ${P.alt})` }}>
            <span className="flex flex-[3] items-center gap-2 px-2.5">
                <span className="flex flex-1 flex-col gap-1.5">
                    <span className="text-[17px] leading-[0.95]" style={{ fontFamily: font.heading, fontWeight: 700, letterSpacing: font.tracking, color: P.fg }}>
                        Ocak<br /><span style={{ color: accentText }}>Kadıköy</span>
                    </span>
                    <span className="flex h-3.5 w-14 items-center justify-center rounded-full" style={{ background: accent }}>
                        <span className="h-1 w-7 rounded-full" style={{ background: onAccent }} />
                    </span>
                </span>
                <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full" style={{ background: P.card, boxShadow: '0 4px 10px rgba(30,25,21,0.15)' }}>
                    <span className="h-11 w-11 rounded-full" style={{ background: `radial-gradient(circle at 35% 35%, ${P.mustard}, ${accent})` }} />
                </span>
            </span>
            <span className="flex flex-[2] items-center gap-1.5 px-2.5">
                {[0, 1].map(i => (
                    <span key={i} className="flex flex-1 items-center gap-1 rounded-md px-1 py-1" style={{ background: P.card, border: `1px solid ${P.mustard}` }}>
                        <span className="h-4 w-4 shrink-0 rounded-full" style={{ background: P.placeholder }} />
                        <span className="flex flex-1 flex-col gap-0.5">
                            <span className="h-1 w-3/4 rounded-full" style={{ background: P.fg }} />
                            <span className="h-1 w-1/3 rounded-full" style={{ background: accentText }} />
                        </span>
                    </span>
                ))}
            </span>
            <span className="h-3 shrink-0" style={{ background: P.footer }} />
        </span>
    );
}

/**
 * Meyhane Gecesi maketi (kendi düzeni): kapak renginde gece kapağı, tepede lamba dizisi, ortada çift çizgili tabelada ad;
 * altında "bu akşam" şeridi, meze tepsisi (yuvarlak kâseler) ve noktalı fiyat satırı; en altta krem adisyon fişi.
 */
function MeyhaneMock({ accent, accentText, cover }: { accent: string; accentText: string; cover: string }) {
    const P = SITE_DESIGNS.meyhane.palette;
    const font = SITE_FONTS[P.font];
    return (
        <span aria-hidden="true" className="flex h-[148px] flex-col overflow-hidden rounded-lg" style={{ background: P.bg }}>
            <span className="relative flex flex-[3] flex-col items-center justify-center"
                style={{ background: `radial-gradient(110px 50px at 50% 0%, ${accentText}40, transparent 75%), ${cover}`, color: P.fg }}>
                <span className="absolute inset-x-2 top-1.5 flex justify-between">
                    {[0, 1, 2, 3, 4, 5, 6].map(i => (
                        <span key={i} className="h-1.5 w-1 rounded-full" style={{ background: accentText, boxShadow: `0 0 6px 1px ${accentText}AA`, marginTop: [0, 3, 5, 6, 5, 3, 0][i] }} />
                    ))}
                </span>
                <span className="mt-2 px-2 py-1 text-center text-[15px] leading-[0.95]"
                    style={{ fontFamily: font.heading, letterSpacing: font.tracking, border: `1px solid ${accent}AA`, outline: `1px solid ${P.fg}33`, outlineOffset: 2 }}>
                    Ocak <span style={{ color: accentText, textShadow: `0 0 10px ${accent}88` }}>Kadıköy</span>
                </span>
            </span>
            <span className="flex flex-[3] flex-col justify-center gap-1.5 px-3">
                <span className="flex justify-center gap-1.5">
                    {[0, 1, 2, 3].map(i => <span key={i} className="h-4 w-4 rounded-full" style={{ background: P.placeholder, boxShadow: `0 0 0 1px ${P.fg}44` }} />)}
                </span>
                <span className="flex items-end gap-1">
                    <span className="h-1.5 w-10 rounded-full" style={{ background: P.fg }} />
                    <span className="mb-px flex-1 border-b border-dotted" style={{ borderColor: P.muted }} />
                    <span className="h-1.5 w-5 rounded-full" style={{ background: accentText }} />
                </span>
            </span>
            <span className="flex h-5 shrink-0 justify-center pt-1" style={{ background: P.footer }}>
                <span className="h-full w-12" style={{ background: P.fg }} />
            </span>
        </span>
    );
}

/**
 * Esnaf Tabelası maketi: krem zeminde kapak renginde tabela şeridi (dar kalın büyük harf ad, sarı düğme), altında kalın
 * çizgili pano satırları (fiyat sağda, vurgu renginde) ve menü kutusu renginde şerit; mürekkep alt bilgi.
 */
function EsnafMock({ accentText, cover, menuBox }: { accentText: string; cover: string; menuBox: string }) {
    const P = SITE_DESIGNS.esnaf.palette;
    const font = SITE_FONTS[P.font];
    return (
        <span aria-hidden="true" className="flex h-[148px] flex-col gap-1.5 overflow-hidden rounded-lg p-2" style={{ background: P.bg }}>
            <span className="flex flex-[3] items-center justify-between gap-2 rounded px-2.5" style={{ background: cover, color: P.onHero, boxShadow: 'inset 0 -3px 0 rgba(0,0,0,0.2)' }}>
                <span className="text-[20px] uppercase leading-[0.95]" style={{ fontFamily: font.heading, letterSpacing: font.tracking }}>
                    Ocak<br /><span style={{ color: P.heroAccent ?? accentText }}>Kadıköy</span>
                </span>
                <span className="h-4 w-12 rounded-sm" style={{ background: P.pop ?? P.mustard }} />
            </span>
            <span className="flex flex-[2] flex-col justify-center gap-1 px-0.5">
                {[0, 1].map(i => (
                    <span key={i} className="flex items-center justify-between gap-1 pb-1" style={{ borderBottom: `2px solid ${P.fg}99` }}>
                        <span className="h-1.5 w-14 rounded-sm" style={{ background: P.fg }} />
                        <span className="h-2 w-6 rounded-sm" style={{ background: accentText }} />
                    </span>
                ))}
                <span className="h-2.5 rounded-sm" style={{ background: menuBox }} />
            </span>
            <span className="h-3 shrink-0 rounded-sm" style={{ background: P.footer, borderTop: `2px solid ${P.mustard}` }} />
        </span>
    );
}

/**
 * Bahçe Kahvaltısı maketi: açık yeşil zeminde sabah ışığı, adaçayı kapakta kalın ad ve tereyağı düğme, yanında yuvarlak
 * tabak; altında yuvarlak köşeli beyaz kartlar (domates fiyat), orman yeşili alt bilgi.
 */
function BahceMock({ accent, accentText, cover }: { accent: string; accentText: string; cover: string }) {
    const P = SITE_DESIGNS.bahce.palette;
    const font = SITE_FONTS[P.font];
    return (
        <span aria-hidden="true" className="flex h-[148px] flex-col gap-1.5 overflow-hidden rounded-lg p-2"
            style={{ background: `radial-gradient(140px 80px at 0% 0%, ${P.mustard}66, transparent 70%), ${P.bg}` }}>
            <span className="flex flex-[3] items-center gap-2 rounded-xl px-2.5" style={{ background: cover, color: P.onHero }}>
                <span className="flex flex-1 flex-col gap-1.5">
                    <span className="text-[18px] leading-[0.95]" style={{ fontFamily: font.heading, fontWeight: 700, letterSpacing: font.tracking }}>
                        Ocak<br /><span style={{ color: P.heroAccent ?? accentText }}>Kadıköy</span>
                    </span>
                    <span className="h-3.5 w-14 rounded-full" style={{ background: P.pop ?? accent }} />
                </span>
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full" style={{ background: P.card }}>
                    <span className="h-8 w-8 rounded-full" style={{ background: `radial-gradient(circle at 35% 35%, ${P.mustard}, ${accent})` }} />
                </span>
            </span>
            <span className="flex flex-[2] items-center gap-1.5">
                {[0, 1].map(i => (
                    <span key={i} className="flex flex-1 items-center gap-1 rounded-xl px-1.5 py-1.5" style={{ background: P.card }}>
                        <span className="h-4 w-4 shrink-0 rounded-full" style={{ background: P.placeholder }} />
                        <span className="flex flex-1 flex-col gap-0.5">
                            <span className="h-1 w-3/4 rounded-full" style={{ background: P.fg }} />
                            <span className="h-1 w-1/3 rounded-full" style={{ background: accentText }} />
                        </span>
                    </span>
                ))}
            </span>
            <span className="h-3 shrink-0 rounded-md" style={{ background: P.footer }} />
        </span>
    );
}

/**
 * Sitenin yazı tipi: ilk seçenek "Tasarımın yazı tipi" ("" kaydedilir; tasarım değişince onun çiftine geçer), altında hazır
 * başlık + gövde çiftleri. Her kart "Aa" ve kısa bir Türkçe örneği o çiftle çizer. Admin olduğu için bütün çiftler yüklenir.
 */
export function FontPicker({ design, font, onFont }: { design: string; font: string; onFont: (key: string) => void }) {
    const own = SITE_FONTS[designFontKey(design)];
    const selected = (SITE_FONT_KEYS as readonly string[]).includes(font) ? font : '';
    return (
        <div role="radiogroup" aria-label="Yazı tipi" className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <link rel="stylesheet" href={ALL_SITE_FONTS_HREF} precedence="default" />
            <FontCard pair={own} label={`Tasarımın yazı tipi (${own.label})`} on={selected === ''} onClick={() => onFont('')} />
            {SITE_FONT_KEYS.map(key => (
                <FontCard key={key} pair={SITE_FONTS[key]} label={SITE_FONTS[key].label} on={selected === key} onClick={() => onFont(key)} />
            ))}
        </div>
    );
}

function FontCard({ pair, label, on, onClick }: { pair: SiteFontPair; label: string; on: boolean; onClick: () => void }) {
    return (
        <button type="button" role="radio" aria-checked={on} onClick={onClick}
            className={cn('flex items-center gap-3 rounded-xl border-2 p-3 text-left transition-colors',
                on ? 'border-foreground' : 'border-border hover:border-foreground/40')}>
            <span aria-hidden="true" className="w-12 shrink-0 text-center text-[34px] leading-none text-foreground"
                style={{ fontFamily: pair.heading, letterSpacing: pair.tracking }}>Aa</span>
            <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span aria-hidden="true" className="truncate text-[17px] leading-tight text-foreground" style={{ fontFamily: pair.heading, letterSpacing: pair.tracking }}>
                    Közde pişen lezzetler
                </span>
                <span aria-hidden="true" className="truncate text-[13px] text-muted-foreground" style={{ fontFamily: pair.body, fontWeight: pair.bodyWeight }}>
                    Ğğ Şş İı Çç Öö Üü · gövde yazısı
                </span>
                <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                    {label}
                    {on && <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
                </span>
            </span>
        </button>
    );
}

// Vurgu seçenekleri (zemin her temada aynı; özel renk yalnız vurguyu değiştirir).
const ACCENT_OPTIONS: Record<SiteDesignKey, string[]> = {
    renkli: ['#DC5B2F', '#EBB03F', '#9DBF8E', '#E79A9A', '#2F4F8F', '#A8354A', '#24180F', '#9AA5B1'],
    sade: ['#E8B04B', '#E2683C', '#9DBF8E', '#E79A9A', '#2F4F8F', '#A8354A', '#2A2622', '#9AA5B1'],
    elit: ['#C8A35F', '#D4A0A0', '#B9BD8E', '#A9B8D0', '#CFC6B8', '#E79A9A', '#2F4F8F', '#A8354A'],
    sicak: ['#D9660B', '#C8341E', '#6B7A2E', '#8E2433', '#1E1915', '#EBB03F', '#2F4F8F', '#E2683C'],
    // Koyu zemin: açık, parlak vurgular (koyu bir özel renk seçilirse yazısı kendiliğinden açılır).
    meyhane: ['#E9A23B', '#ECE3D3', '#9EC1EA', '#E8A0A0', '#B9C98A', '#D9654F', '#F2C25E', '#C7A6E0'],
    esnaf: ['#C8102E', '#1D4E89', '#F2C230', '#1A1A1A', '#2E7D32', '#E2683C', '#8E2433', '#0F766E'],
    bahce: ['#C2410C', '#4E6B46', '#FFD978', '#E2683C', '#2F4F8F', '#A8354A', '#6B7A2E', '#1F2A1C'],
};

// Temanın kapak rengini / menü kutusu rengini de değiştirdiği tasarımlar (diğerlerinde yalnız vurgu değişir).
const THEME_SETS_COVER: SiteDesignKey[] = ['renkli', 'meyhane', 'esnaf', 'bahce'];
const THEME_SETS_MENU_BOX: SiteDesignKey[] = ['esnaf', 'bahce'];

/** Tema kartında "Kapak ■" gibi küçük renk etiketi. */
function ColorChip({ label, color }: { label: string; color: string }) {
    return (
        <span className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="h-3.5 w-3.5 rounded-sm border border-border" style={{ background: color }} />
            {label}
        </span>
    );
}

/** Seçili tasarımın hazır temaları ve isteğe bağlı özel vurgu rengi. Renkli: tema kapak rengini ve vurguyu seçer;
 *  Sade: yalnız vurguyu (kapak beyaz kutu); Elit: yalnız vurgu ailesini (koyu zeminde açık, kremde koyu ton);
 *  Sıcak: yalnız vurguyu (zemin şeftali, koyu bantlar). */
export function ThemePicker({ design, theme, accent, onTheme, onAccent }: {
    design?: string; theme: string; accent: string; onTheme: (key: string) => void; onAccent: (hex: string) => void;
}) {
    const key = resolveDesign(design);
    const current = resolveTheme(theme, key);
    const selected = current.key;
    return (
        <div className="space-y-4">
            <p className="m-0 text-sm text-muted-foreground">
                {key === 'sade' ? 'Sade tasarımda tema vurgu rengini seçer; kapak ve kutular beyaz kalır.'
                    : key === 'elit' ? 'Elit tasarımda tema yalnız vurgu ailesini seçer (çizgiler, süsler, düğmeler); zemin krem ve koyu espresso kalır.'
                        : key === 'sicak' ? 'Sıcak tasarımda tema vurgu rengini seçer (düğmeler, etiketler); zemin şeftali ve krem, koyu bantlar kalır.'
                        : key === 'meyhane' ? 'Meyhane Gecesi koyu bir tasarımdır: tema vurgu rengini ve kapağın tonunu seçer; zemin her temada kömür kalır.'
                        : key === 'esnaf' ? 'Esnaf Tabelası\'nda tema kapağın (tabela) ve menü kutusunun rengini, vurguyu seçer; zemin krem kalır.'
                        : key === 'bahce' ? 'Bahçe Kahvaltısı\'nda tema kapağın ve menü kutusunun rengini, vurguyu seçer; zemin açık yeşil kalır.'
                        : 'Renkli tasarımda tema ana sayfa kapağının rengini ve vurguyu seçer.'}
            </p>
            <div role="radiogroup" aria-label="Site teması" className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                {designThemes(key).map(t => {
                    const on = selected === t.key;
                    const c = resolveSiteColors(null, t.key, key);
                    const cover = t.cover ?? t.hero;
                    return (
                        <button key={t.key} type="button" role="radio" aria-checked={on}
                            onClick={() => onTheme(t.key === DEFAULT_THEME ? '' : t.key)}
                            className={cn('flex flex-col gap-2 rounded-xl border-2 p-2.5 text-left transition-colors', on ? 'border-foreground' : 'border-border hover:border-foreground/40')}>
                            {/* Küçük önizleme: zemin, kapak (yazı ve vurgu yazısı), düğme */}
                            <span aria-hidden="true" className="flex h-16 items-end gap-1.5 rounded-lg p-2" style={{ background: t.bg }}>
                                <span className="flex h-full flex-1 flex-col justify-center gap-1 rounded-md px-2" style={{ background: cover, border: `1px solid ${t.border}` }}>
                                    <span className="h-1.5 w-3/4 rounded-full" style={{ background: c.palette.onHero }} />
                                    <span className="h-1.5 w-1/2 rounded-full" style={{ background: c.heroAccent }} />
                                </span>
                                <span className="h-6 w-12 rounded-full" style={{ background: t.accent }} />
                            </span>
                            <span className="flex items-center justify-between gap-2">
                                <span className="text-sm font-semibold text-foreground">{t.label}</span>
                                {on && <Check className="h-4 w-4 text-foreground" aria-hidden="true" />}
                            </span>
                            <span className="text-xs leading-snug text-muted-foreground">{t.description}</span>
                            {/* Temanın neyi boyadığı: yalnız bu tasarımda temayla değişen renkler. */}
                            <span className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                {THEME_SETS_COVER.includes(key) && <ColorChip label="Kapak" color={cover} />}
                                <ColorChip label="Vurgu" color={t.accent} />
                                {THEME_SETS_MENU_BOX.includes(key) && t.menuBox && <ColorChip label="Menü kutusu" color={t.menuBox} />}
                            </span>
                        </button>
                    );
                })}
            </div>
            <div>
                <p className={labelClass}>Vurgu rengi <span className="font-normal normal-case text-muted-foreground">(isteğe bağlı)</span></p>
                <p className="mb-2 mt-0 text-xs text-muted-foreground">
                    Düğmelerin, fiyatların ve etiketlerin rengi. Temanın vurgu rengini değiştirir; kapağa ve zemine dokunmaz.
                </p>
                <div role="radiogroup" aria-label="Vurgu rengi" className="flex flex-wrap items-center gap-2.5">
                    <button type="button" role="radio" aria-checked={!accent} onClick={() => onAccent('')}
                        className={cn('flex h-11 items-center gap-2 rounded-full border-2 px-3 text-sm font-medium', !accent ? 'border-foreground' : 'border-border')}>
                        <span aria-hidden="true" className="h-6 w-6 rounded-full" style={{ background: current.accent }} />
                        Tema rengi
                    </button>
                    {ACCENT_OPTIONS[key].filter(c => c.toUpperCase() !== current.accent.toUpperCase()).map(color => {
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
                <p className="mt-1.5 text-xs text-muted-foreground">Okunurluk için düğme yazısı ve tonu kendiliğinden ayarlanır.</p>
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
