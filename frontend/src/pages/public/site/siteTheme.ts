import type { CSSProperties } from 'react';

// Restoranın müşteri sitesinin görünümü. Restoran önce TASARIMI ("Renkli ve sıcak" ya da "Sade"), sonra o tasarımın
// içinde RENGİ (hazır tema ya da özel vurgu rengi) seçer. Her ikisi de tek yerde, CSS değişkeni olarak tanımlıdır:
// site sayfaları, rezervasyon akışı, masa QR sayfası ve paket sipariş sayfaları yalnız bu değişkenleri kullanır.
//
// - Renkli ve sıcak (varsayılan): kum zemin #EFE2CC, krem kutular #FBF4E8, Fraunces; tema VURGU rengini ve ana sayfa
//   kapağının ZEMİNİNİ seçer; zeytin/hardal/kiremit kutular, zeytin alt bilgi.
// - Sade ("Tema 2 · Açık"): krem zemin #F6F1E9, beyaz kutular, Instrument Serif; tema yalnız VURGU rengini seçer;
//   kapak ve menü kutusu beyaz, alt bilgi açık kum (#E6DBC9), koyu kutular mürekkep rengi.
// - Elit: krem zemin #F4EEE3, ara bant #EAE2D4, koyu espresso bantlar #2B2119, Bodoni Moda + Montserrat (300);
//   tema yalnız VURGU AİLESİNİ seçer (koyu zeminde açık ton: çizgi, süs, düğme; krem zeminde koyu ton: yazı).
//   Kapak her zaman koyu (fotoğraf + koyu perde ya da desenli koyu bant), alt bilgi koyu espresso.
//
// Renkli kutuların (kapak, menü kutusu, hikâye, zeytin, kiremit, hardal, alt bilgi) her biri zemin + üstündeki yazı
// değişkeniyle gelir (`--site-cover-bg` / `--site-on-cover` …). Sayfa bu çiftleri kullanır; tasarım değerlerini değiştirir.
// İki kapak değişkeni var:
// - `--site-cover-bg` (+ `--site-cover-deep`, `--site-on-cover`, `--site-cover-accent`): site sayfalarının kapağı
//   (ana sayfa, Menü, Hakkımızda). Renkli: temanın koyu kapak rengi, krem yazı; Sade: beyaz kutu, koyu yazı.
// - `--site-hero-bg` (+ `--site-hero-deep`): HER ZAMAN koyu kapak, üstünde `--site-on-paper` krem yazı (masa QR sayfası,
//   akış sayfaları). Renkli: temanın kapak rengi (= cover); Sade: mürekkep rengi.
// Özel vurgu renginde düğme yazısı ve açık zemindeki vurgu yazısı okunurluk (WCAG AA, 4.5:1) için otomatik ayarlanır.

/** Sitenin tasarımları (backend: SiteContent.DesignKeys). Boş/bilinmeyen = varsayılan (renkli). */
export const SITE_DESIGN_KEYS = ['renkli', 'sade', 'elit'] as const;
export type SiteDesignKey = (typeof SITE_DESIGN_KEYS)[number];
export const DEFAULT_DESIGN: SiteDesignKey = 'renkli';

export function resolveDesign(key?: string | null): SiteDesignKey {
    return (SITE_DESIGN_KEYS as readonly string[]).includes(key ?? '') ? key as SiteDesignKey : DEFAULT_DESIGN;
}

// ── Yazı tipi çiftleri ──
// Başlık (`--site-serif`) + gövde (`--site-sans`). Restoran "Yazı tipi"nde birini seçer; boş = tasarımın kendi çifti
// (Renkli: Fraunces + Manrope; Sade: Instrument Serif + Manrope; Elit: Bodoni Moda + Montserrat). Hepsi Google Fonts,
// hepsinde Türkçe harfler (latin-ext: ğ ş ı İ ç ö ü) var. Backend: SiteContent.FontKeys (aynı anahtarlar).

const MANROPE = 'family=Manrope:wght@400;500;600;700;800';
const FRAUNCES = 'family=Fraunces:ital,opsz,wght@0,9..144,500..900;1,9..144,500..900';
const INSTRUMENT = 'family=Instrument+Serif:ital@0;1';
const BODONI = 'family=Bodoni+Moda:ital,opsz,wght@0,6..96,400..700;1,6..96,400..700';
const MONTSERRAT = 'family=Montserrat:wght@300;400;500;600;700;800';
const PLAYFAIR = 'family=Playfair+Display:ital,wght@0,400..900;1,400..900';
const INTER = 'family=Inter:wght@300;400;500;600;700;800';
const DM_SERIF = 'family=DM+Serif+Display:ital@0;1';
const DM_SANS = 'family=DM+Sans:wght@300;400;500;600;700;800';
const CORMORANT = 'family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600;1,700';
const LATO = 'family=Lato:wght@300;400;700;900';
const GROTESK = 'family=Space+Grotesk:wght@300..700';
const fontsUrl = (...families: string[]) => `https://fonts.googleapis.com/css2?${families.join('&')}&display=swap`;

export const SITE_FONT_KEYS = [
    'fraunces-manrope', 'instrument-manrope', 'bodoni-montserrat', 'playfair-inter', 'dmserif-dmsans', 'cormorant-lato', 'grotesk-inter',
] as const;
export type SiteFontKey = (typeof SITE_FONT_KEYS)[number];

export interface SiteFontPair {
    key: SiteFontKey;
    /** Admin'deki ad ("Fraunces + Manrope"). */
    label: string;
    /** Başlık yazı tipi (CSS font-family yığını) ve harf aralığı. */
    heading: string;
    tracking: string;
    /** Gövde yazı tipi ve ağırlığı (boş = 400). */
    body: string;
    bodyWeight?: number;
    /** Başlık yazı tipinin tek ağırlığı var (Instrument Serif, DM Serif Display): sahte kalın çizilmesin. */
    singleWeight?: boolean;
    /** Başlıkta harf başına ortalama genişlik (em; ince 400 ve kalın 700), ana sayfadaki dev adın sığması için. Tarayıcıda
     *  ölçüldü (canvas measureText, Türkçe örnek ad) ve Fraunces kalının eski 0,6 katsayısına göre ölçeklendi. */
    charWidth: { regular: number; bold: number };
    /** Gereken Google Fonts css2 adresi (ağırlıklar ve italikler). */
    href: string;
}

const fontPair = (p: Omit<SiteFontPair, 'href'>, ...families: string[]): SiteFontPair => ({ ...p, href: fontsUrl(...families) });
const MANROPE_STACK = 'Manrope, system-ui, sans-serif';
const INTER_STACK = 'Inter, system-ui, sans-serif';

export const SITE_FONTS: Record<SiteFontKey, SiteFontPair> = {
    'fraunces-manrope': fontPair({
        key: 'fraunces-manrope', label: 'Fraunces + Manrope', heading: 'Fraunces, Georgia, serif', tracking: '-0.02em',
        body: MANROPE_STACK, charWidth: { regular: 0.56, bold: 0.6 },
    }, FRAUNCES, MANROPE),
    'instrument-manrope': fontPair({
        key: 'instrument-manrope', label: 'Instrument Serif + Manrope', heading: "'Instrument Serif', Georgia, serif", tracking: '-0.01em',
        body: MANROPE_STACK, singleWeight: true, charWidth: { regular: 0.46, bold: 0.46 },
    }, INSTRUMENT, MANROPE),
    'bodoni-montserrat': fontPair({
        key: 'bodoni-montserrat', label: 'Bodoni Moda + Montserrat', heading: "'Bodoni Moda', Didot, Georgia, serif", tracking: '-0.01em',
        body: 'Montserrat, system-ui, sans-serif', bodyWeight: 300, charWidth: { regular: 0.645, bold: 0.68 },
    }, BODONI, MONTSERRAT),
    'playfair-inter': fontPair({
        key: 'playfair-inter', label: 'Playfair Display + Inter', heading: "'Playfair Display', Georgia, serif", tracking: '-0.01em',
        body: INTER_STACK, charWidth: { regular: 0.64, bold: 0.66 },
    }, PLAYFAIR, INTER),
    'dmserif-dmsans': fontPair({
        key: 'dmserif-dmsans', label: 'DM Serif Display + DM Sans', heading: "'DM Serif Display', Georgia, serif", tracking: '-0.01em',
        body: "'DM Sans', system-ui, sans-serif", singleWeight: true, charWidth: { regular: 0.62, bold: 0.62 },
    }, DM_SERIF, DM_SANS),
    'cormorant-lato': fontPair({
        key: 'cormorant-lato', label: 'Cormorant Garamond + Lato', heading: "'Cormorant Garamond', Garamond, Georgia, serif", tracking: '0em',
        body: 'Lato, system-ui, sans-serif', charWidth: { regular: 0.565, bold: 0.57 },
    }, CORMORANT, LATO),
    'grotesk-inter': fontPair({
        key: 'grotesk-inter', label: 'Space Grotesk + Inter', heading: "'Space Grotesk', system-ui, sans-serif", tracking: '-0.03em',
        body: INTER_STACK, charWidth: { regular: 0.66, bold: 0.66 },
    }, GROTESK, INTER),
};

/** Seçilen yazı tipi çifti; boş/bilinmeyen = tasarımın kendi çifti. */
export function resolveFont(font?: string | null, design?: string | null): SiteFontPair {
    const key = (SITE_FONT_KEYS as readonly string[]).includes(font ?? '') ? font as SiteFontKey : designFontKey(design);
    return SITE_FONTS[key];
}

/** Sitenin yazı tiplerinin css2 adresi: yalnız seçilen çift (boş = tasarımın çifti). */
export function siteFontsHref(design?: string | null, font?: string | null): string {
    return resolveFont(font, design).href;
}

/** Tasarımı bilmeyen sayfalar için tasarımların kendi yazı tipleri birlikte (tarayıcı yalnız kullanılan dosyayı indirir). */
export const SITE_FONTS_HREF = fontsUrl(FRAUNCES, INSTRUMENT, BODONI, MANROPE, MONTSERRAT);
/** Bütün çiftler birlikte (yalnız admin'deki yazı tipi seçici). */
export const ALL_SITE_FONTS_HREF = fontsUrl(FRAUNCES, INSTRUMENT, BODONI, MANROPE, MONTSERRAT, PLAYFAIR, INTER, DM_SERIF, DM_SANS, CORMORANT, LATO, GROTESK);

export interface SiteThemePreset {
    key: string;
    label: string;
    /** Admin'deki tek satırlık tarif. */
    description: string;
    /** Sayfa zemini (her temada aynı) */
    bg: string;
    /** Kutu yüzeyi */
    card: string;
    border: string;
    text: string;
    muted: string;
    /** Düğme zemini (yazısı onAccent) */
    accent: string;
    onAccent: string;
    /** Açık zeminde vurgu yazısı (italik başlık parçası, etiket, rozet); zemin ve kutular üstünde en az 4.5:1 */
    accentText: string;
    /** Koyu kapak zemini ve alt şeridi (üstünde krem yazı; masa QR ve akış sayfaları). */
    hero: string;
    heroDeep: string;
    /** Site sayfalarının kapağı (ana sayfa, Menü, Hakkımızda); yoksa `hero`. Sade: beyaz kutu (üstünde koyu yazı). */
    cover?: string;
    coverDeep?: string;
    /** Ana sayfadaki menü kutusunun zemini (Renkli: kapakla aynı renk olmasın diye; Sade: beyaz kutu). */
    menuBox: string;
}

/** Tasarımın paleti (bütün temalarda ortak). `null` olan renkler temanın vurgusundan hesaplanır. */
export interface SitePalette {
    bg: string; fg: string; alt: string; card: string; text2: string; muted: string; wordmark: string; placeholder: string;
    rgb: string; heroOverlay: string; disabled: string;
    /** Koyu panel (sepet, çağrı kartı, akış sayfalarının kapağı) */
    paper: string; onPaper: string; onPaperSub: string; paperRgb: string;
    /** Hardal kutu / rozet (üstünde koyu yazı). */
    mustard: string;
    /** Koyu zeminlerde (koyu panel, hikâye, zeytin) vurgu yazısı; null = vurgunun koyu zemin için açılmışı. */
    mustardText: string | null;
    /** Kapak ve menü kutusunun üstündeki yazı, ikincil yazı ve vurgu yazısı (null = açık zemindeki vurgu yazısı). */
    onHero: string; onMenuBox: string; onMenuBoxSub: string; heroAccent: string | null;
    /** Menü kutusundaki ürün kartları. */
    menuCard: string;
    /** Kapak, menü kutusu ve alt bilgideki açık/kapalı noktası. */
    dotOk: string; dotBad: string;
    /** Kapak ve menü kutusundaki ana düğme (Renkli: hardal; Sade: koyu); null = vurgunun koyu zemin için açılmışı,
     *  üstünde koyu panel rengi yazı (Elit: altın düğme). */
    pop: string | null; onPop: string | null;
    story: string;
    olive: string;
    /** Kiremit kutu ("Özel günler", seçili konu); null = temanın vurgusu (yazısı onAccent). */
    terracotta: string | null; onTerracotta: string | null;
    /** Açık zeminde kiremit yazı (seçili işaret, numara); null = vurgu yazısı. */
    terracottaText: string | null;
    /** Kiremit kutuda ikincil vurgu yazısı (bilet kartındaki gün); null = kutunun yazısı. */
    onTerracottaSoft: string | null;
    footer: string; onFooter: string; footerMuted: string; footerLabel: string | null;
    footerMap: string; footerRoad: string; footerWater: string;
    /** Tasarımın kendi yazı tipi çifti (restoran "Yazı tipi"nde başka çift seçebilir). */
    font: SiteFontKey;
    /** Başlıkların ağırlığı (`--site-serif-weight`; Renkli kalın, Sade ve Elit ince). */
    headingWeight: number;
}

const RENKLI: SitePalette = {
    bg: '#EFE2CC',
    fg: '#24180F',
    alt: '#F3E7D3',
    card: '#FBF4E8',
    text2: '#5A4A3C',
    muted: '#6B5B4C',
    wordmark: '#E3D2B6',
    placeholder: '#E6D5B8',
    rgb: '36,24,15',
    heroOverlay: 'rgba(251,244,232,0.82)',
    disabled: '#A08F7C',
    paper: '#24180F',
    onPaper: '#FBF4E8',
    onPaperSub: '#CBBFAE',
    paperRgb: '251,244,232',
    mustard: '#EBB03F',
    // #EBB03F'nin biraz açığı: koyu kiremit üstünde de 4.5:1.
    mustardText: '#F2C25E',
    onHero: '#FBF4E8',
    onMenuBox: '#F3E7D3',
    onMenuBoxSub: '#D4CBB6',
    heroAccent: '#F2C25E',
    menuCard: '#FBF4E8',
    dotOk: '#7BE0A2',
    dotBad: '#F4A28C',
    pop: '#EBB03F',
    onPop: '#24180F',
    story: '#6E2A15',
    olive: '#3E4A33',
    terracotta: '#A9401F',
    onTerracotta: '#FBF4E8',
    terracottaText: '#A9401F',
    onTerracottaSoft: '#F8E3B6',
    footer: '#3E4A33',
    onFooter: '#F3E7D3',
    footerMuted: '#D4CBB6',
    footerLabel: '#EBB03F',
    footerMap: '#34402B',
    footerRoad: '#4C5A40',
    footerWater: '#2E4744',
    font: 'fraunces-manrope',
    headingWeight: 700,
};

/** Sade ("Tema 2 · Açık", d439b68) paleti. */
const SADE: SitePalette = {
    bg: '#F6F1E9',
    fg: '#1E1A16',
    alt: '#EEE7DC',
    card: '#FFFFFF',
    text2: '#4F473F',
    muted: '#6B6259',
    wordmark: '#E3D8C8',
    placeholder: '#E9E1D5',
    rgb: '30,26,22',
    heroOverlay: 'rgba(246,241,233,0.80)',
    disabled: '#A79D90',
    paper: '#1E1A16',
    onPaper: '#F6F1E9',
    onPaperSub: '#B8AEA2',
    paperRgb: '246,241,233',
    // Sade'nin hazır menü kutusu tonu.
    mustard: '#EDE5D8',
    mustardText: null,
    onHero: '#1E1A16',
    onMenuBox: '#1E1A16',
    onMenuBoxSub: '#6B6259',
    heroAccent: null,
    menuCard: '#F6F1E9',
    dotOk: '#22A35A',
    dotBad: '#C8472C',
    pop: '#1E1A16',
    onPop: '#F6F1E9',
    story: '#1E1A16',
    olive: '#2E2823',
    terracotta: null,
    onTerracotta: null,
    terracottaText: null,
    onTerracottaSoft: null,
    footer: '#E6DBC9',
    onFooter: '#1E1A16',
    footerMuted: '#52493F',
    footerLabel: null,
    footerMap: '#D6C8B2',
    footerRoad: '#EFE7DA',
    footerWater: '#BFD0CC',
    font: 'instrument-manrope',
    headingWeight: 400,
};

/** Elit paleti. Kapak, menü kutusu, hikâye ve alt bilgi koyu espresso; vurgu türevleri (düğme, koyu zemindeki çizgi
 *  ve yazı) temanın vurgusundan hesaplanır. Soluk yazı #6B6157: tasarımın #8A8073 / #7A7064'ü kremde 4.5:1'i tutmuyor. */
const ELIT: SitePalette = {
    bg: '#F4EEE3',
    fg: '#1A1714',
    alt: '#EAE2D4',
    card: '#FBF7F0',
    text2: '#4A443C',
    muted: '#6B6157',
    wordmark: '#E3D9C8',
    placeholder: '#E3D9C8',
    rgb: '26,23,20',
    heroOverlay: 'rgba(244,238,227,0.82)',
    disabled: '#A39889',
    paper: '#2B2119',
    onPaper: '#F4EEE3',
    onPaperSub: '#D2C8B9',
    paperRgb: '244,238,227',
    mustard: '#E3D5BA',
    mustardText: null,
    onHero: '#F4EEE3',
    onMenuBox: '#F4EEE3',
    onMenuBoxSub: '#D2C8B9',
    heroAccent: null,
    menuCard: '#F4EEE3',
    dotOk: '#8FD19E',
    dotBad: '#E8A08C',
    pop: null,
    onPop: null,
    story: '#2B2119',
    olive: '#382B21',
    terracotta: null,
    onTerracotta: null,
    terracottaText: null,
    onTerracottaSoft: null,
    footer: '#2B2119',
    onFooter: '#F4EEE3',
    footerMuted: '#D2C8B9',
    footerLabel: null,
    footerMap: '#382B21',
    footerRoad: '#46372B',
    footerWater: '#2A3440',
    font: 'bodoni-montserrat',
    headingWeight: 400,
};

type PresetInput = Omit<SiteThemePreset, 'bg' | 'card' | 'border' | 'text' | 'muted'>;

function presets(p: SitePalette, list: PresetInput[]): Record<string, SiteThemePreset> {
    const base = { bg: p.bg, card: p.card, border: `rgba(${p.rgb},0.12)`, text: p.fg, muted: p.muted };
    return Object.fromEntries(list.map(t => [t.key, { ...base, ...t }]));
}

// Renkli: turuncu vurgu (tasarımın #D9562B'si koyu yazıyla 4.38:1 kaldığı için bir tık açık) ya da hardal vurgu.
const ORANGE = { accent: '#DC5B2F', onAccent: RENKLI.fg, accentText: '#A9401F' };
const MUSTARD = { accent: RENKLI.mustard, onAccent: RENKLI.fg, accentText: '#7A5208' };
const KIREMIT = { hero: '#8C3317', heroDeep: '#722A12' };

const RENKLI_THEMES = presets(RENKLI, [
    { key: 'altin', label: 'Kiremit', description: 'Kiremit kapak, turuncu vurgu. Varsayılan.', ...ORANGE, ...KIREMIT, menuBox: RENKLI.olive },
    { key: 'terracotta', label: 'Kiremit · hardal', description: 'Kiremit kapak, hardal vurgu. Ocakbaşı, ızgara.', ...MUSTARD, ...KIREMIT, menuBox: RENKLI.olive },
    { key: 'zeytin', label: 'Zeytin', description: 'Zeytin yeşili kapak, turuncu vurgu. Ege, meyhane, kahvaltı.', ...ORANGE, hero: RENKLI.olive, heroDeep: '#2F3926', menuBox: '#8C3317' },
    { key: 'lacivert', label: 'Lacivert', description: 'Gece mavisi kapak, hardal vurgu. Balık, deniz kenarı.', ...MUSTARD, hero: '#1F3550', heroDeep: '#172839', menuBox: RENKLI.olive },
    { key: 'bordo', label: 'Bordo', description: 'Şarap rengi kapak, hardal vurgu. Akşam yemeği, steakhouse.', ...MUSTARD, hero: '#7A2232', heroDeep: '#5E1A27', menuBox: RENKLI.olive },
    { key: 'komur', label: 'Kömür', description: 'Koyu kahve kapak, hardal vurgu. Bar, gece mekânı.', ...MUSTARD, hero: RENKLI.fg, heroDeep: '#17100A', menuBox: RENKLI.olive },
    { key: 'beyaz', label: 'Toprak', description: 'Toprak rengi kapak, turuncu vurgu. Sade ve sıcak.', ...ORANGE, hero: '#4A3C30', heroDeep: '#3A2F25', menuBox: RENKLI.olive },
]);

// Sade: zemin ortak, tema yalnız vurguyu seçer (kapak ve menü kutusu beyaz). Değerler d439b68'in siteTheme.ts'inden.
const WHITE = { hero: SADE.paper, heroDeep: '#2A2622', cover: SADE.card, coverDeep: SADE.card, menuBox: SADE.card };
// Elit: tema yalnız vurgu ailesini seçer. `accent`: koyu bantlarda çizgi, süs ve düğme (üstünde koyu espresso yazı);
// `accentText`: krem zeminde ve ara bantta (#EAE2D4) yazı. Tasarımın #8F7034'ü kremde 4.0:1 kaldığı için #7A5F2B.
const ESPRESSO = { onAccent: ELIT.paper, hero: ELIT.paper, heroDeep: '#221A14', cover: ELIT.paper, coverDeep: '#221A14', menuBox: ELIT.paper };
const ELIT_THEMES = presets(ELIT, [
    { key: 'altin', label: 'Altın', description: 'Altın çizgiler ve düğmeler. Varsayılan.', accent: '#C8A35F', accentText: '#7A5F2B', ...ESPRESSO },
    { key: 'bordo', label: 'Bordo', description: 'Gül kurusu süsler, şarap rengi yazılar. Akşam yemeği, steakhouse.', accent: '#D4A0A0', accentText: '#7A2F3A', ...ESPRESSO },
    { key: 'zeytin', label: 'Zeytin', description: 'Adaçayı süsler, zeytin yeşili yazılar. Ege, meyhane.', accent: '#B9BD8E', accentText: '#56622F', ...ESPRESSO },
    { key: 'lacivert', label: 'Lacivert', description: 'Buz mavisi süsler, lacivert yazılar. Balık, deniz kenarı.', accent: '#A9B8D0', accentText: '#2F4A75', ...ESPRESSO },
    { key: 'komur', label: 'Kömür', description: 'Taş rengi süsler, kömür yazılar. Bar, gece mekânı.', accent: '#CFC6B8', accentText: '#4A443C', ...ESPRESSO },
]);

const SADE_THEMES = presets(SADE, [
    { key: 'altin', label: 'Altın', description: 'Sıcak krem zemin, altın vurgu. Varsayılan.', accent: '#E8B04B', onAccent: SADE.fg, accentText: '#8A5D0B', ...WHITE },
    { key: 'terracotta', label: 'Terracotta', description: 'Kiremit turuncusu vurgu. Ocakbaşı, ızgara, pide.', accent: '#E2683C', onAccent: SADE.fg, accentText: '#A63F17', ...WHITE },
    { key: 'zeytin', label: 'Zeytin', description: 'Adaçayı yeşili vurgu. Ege, meyhane, kahvaltı.', accent: '#9DBF8E', onAccent: SADE.fg, accentText: '#3F6B34', ...WHITE },
    { key: 'lacivert', label: 'Lacivert', description: 'Koyu lacivert vurgu. Balık, deniz kenarı.', accent: '#2F4F8F', onAccent: '#FFFFFF', accentText: '#2F4F8F', ...WHITE },
    { key: 'bordo', label: 'Bordo', description: 'Şarap rengi vurgu. Akşam yemeği, steakhouse.', accent: '#A8354A', onAccent: '#FFFFFF', accentText: '#8E2433', ...WHITE },
    { key: 'komur', label: 'Kömür', description: 'Kömür siyahı vurgu. Bar, gece mekânı; sade ve güçlü.', accent: '#2A2622', onAccent: SADE.bg, accentText: '#2A2622', ...WHITE },
    { key: 'beyaz', label: 'Sade gri', description: 'Serin gri vurgu. Sade ve modern.', accent: '#9AA5B1', onAccent: SADE.fg, accentText: '#4A5563', ...WHITE },
]);

export interface SiteDesignInfo {
    key: SiteDesignKey;
    label: string;
    /** Admin'deki tek satırlık tarif. */
    description: string;
    palette: SitePalette;
    themes: Record<string, SiteThemePreset>;
}

/** Tasarımın kendi yazı tipi çifti. */
export function designFontKey(design?: string | null): SiteFontKey {
    return SITE_DESIGNS[resolveDesign(design)].palette.font;
}

export const SITE_DESIGNS: Record<SiteDesignKey, SiteDesignInfo> = {
    renkli: {
        key: 'renkli', label: 'Renkli ve sıcak', description: 'Kum zemin, renkli kapak ve kutular, kalın başlıklar.',
        palette: RENKLI, themes: RENKLI_THEMES,
    },
    sade: {
        key: 'sade', label: 'Sade', description: 'Açık krem zemin, beyaz kutular, ince serif başlıklar.',
        palette: SADE, themes: SADE_THEMES,
    },
    elit: {
        key: 'elit', label: 'Elit', description: 'Krem ve koyu espresso, tam sayfa fotoğraf, ince altın çizgiler.',
        palette: ELIT, themes: ELIT_THEMES,
    },
};

/** Renkli tasarımın temaları (geriye dönük ad). */
export const SITE_THEMES = RENKLI_THEMES;

/** Boş tema anahtarı bu temayı verir (backend'de anahtarı yok; admin'de seçilince "" kaydedilir). */
export const DEFAULT_THEME = 'altin';
export const SITE_THEME_KEYS = Object.keys(RENKLI_THEMES);

/** Tasarımın temaları, admin'deki sırayla. */
export function designThemes(design?: string | null): SiteThemePreset[] {
    return Object.values(SITE_DESIGNS[resolveDesign(design)].themes);
}

/** Varsayılan temanın vurgu rengi (Renkli; admin'de "tema rengi" seçeneği). */
export const DEFAULT_ACCENT = RENKLI_THEMES[DEFAULT_THEME].accent;

export function resolveTheme(key?: string | null, design?: string | null): SiteThemePreset {
    const themes = SITE_DESIGNS[resolveDesign(design)].themes;
    return (key && themes[key]) || themes[DEFAULT_THEME];
}

/** Koyu bant ve panellerin zemini (sepet paneli, akış sayfalarının kapağı); Renkli değeri. */
export const SITE_INK = RENKLI.paper;

// ── Renk hesapları (özel vurgu rengi için) ───────────────────────────────────────────────────────
function isHex(value: string | undefined | null): value is string {
    return !!value && /^#[0-9A-Fa-f]{6}$/.test(value);
}

function rgb(hex: string): [number, number, number] {
    return [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
}

function toHex([r, g, b]: [number, number, number]): string {
    return `#${[r, g, b].map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')}`.toUpperCase();
}

function luminance(hex: string): number {
    const [r, g, b] = rgb(hex).map(v => {
        const c = v / 255;
        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
    const [x, y] = [luminance(a), luminance(b)];
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

/** Renk `bg` üstünde en az `min` karşıtlığa ulaşana kadar koyulaşır (koyu zeminde açılır). */
export function ensureContrast(color: string, bg: string, min = 4.5): string {
    let current = color;
    const towardsWhite = luminance(bg) < 0.2;
    for (let i = 0; i < 30 && contrastRatio(current, bg) < min; i++) {
        const [r, g, b] = rgb(current);
        current = towardsWhite
            ? toHex([r + (255 - r) * 0.12, g + (255 - g) * 0.12, b + (255 - b) * 0.12])
            : toHex([r * 0.88, g * 0.88, b * 0.88]);
    }
    return current;
}

/** Düğme zemini ve yazısı: koyu ya da beyaz yazıdan okunanı; ikisi de yetmiyorsa zemin koyulaştırılır. */
function accentPair(accent: string, ink: string): { accent: string; onAccent: string } {
    const dark = contrastRatio(ink, accent);
    const white = contrastRatio('#FFFFFF', accent);
    if (dark >= 4.5 && dark >= white) return { accent, onAccent: ink };
    if (white >= 4.5) return { accent, onAccent: '#FFFFFF' };
    if (dark >= 4.5) return { accent, onAccent: ink };
    return { accent: ensureContrast(accent, '#FFFFFF'), onAccent: '#FFFFFF' };
}

/** Tasarım × tema × özel vurgu için çözülmüş renkler (siteRootStyle'ın değerleri; karşıtlık denetimi de bunu kullanır). */
export interface ResolvedSiteColors {
    design: SiteDesignKey;
    palette: SitePalette;
    theme: SiteThemePreset;
    accent: string; onAccent: string; accentText: string; accentOnDark: string;
    mustardText: string; heroAccent: string; pop: string; onPop: string;
    terracotta: string; onTerracotta: string; terracottaText: string; footerLabel: string;
}

export function resolveSiteColors(accentColor?: string | null, theme?: string | null, design?: string | null): ResolvedSiteColors {
    const d = resolveDesign(design);
    const P = SITE_DESIGNS[d].palette;
    const t = resolveTheme(theme, d);
    const custom = isHex(accentColor) && accentColor.toUpperCase() !== t.accent.toUpperCase();
    const pair = custom ? accentPair(accentColor, P.fg) : { accent: t.accent, onAccent: t.onAccent };
    // Vurgu yazısı hem zeminde hem kutularda okunmalı: zemin ve ara bandın koyusuna göre (Renkli: kum zemin; Sade ve
    // Elit: ara bant).
    const accentText = custom ? ensureContrast(accentColor, luminance(P.alt) < luminance(P.bg) ? P.alt : P.bg) : t.accentText;
    // Koyu panelde (sepet, çağrı kartı) vurgu: koyu vurgular açılır.
    const accentOnDark = ensureContrast(pair.accent, P.paper);
    const cover = t.cover ?? t.hero;
    return {
        design: d, palette: P, theme: t, ...pair, accentText, accentOnDark,
        // Sade'de koyu kutular mürekkep rengi; üstlerindeki vurgu, en açık koyu kutuya (zeytin) göre açılır.
        mustardText: P.mustardText ?? ensureContrast(pair.accent, P.olive),
        // Kapaktaki vurgu yazısı: açık kapakta açık zemindeki vurgu yazısı, koyu kapakta (Elit) vurgunun açılmışı.
        heroAccent: P.heroAccent ?? (luminance(cover) < 0.2 ? ensureContrast(pair.accent, cover) : accentText),
        pop: P.pop ?? accentOnDark,
        onPop: P.onPop ?? P.paper,
        terracotta: P.terracotta ?? pair.accent,
        onTerracotta: P.onTerracotta ?? pair.onAccent,
        terracottaText: P.terracottaText ?? accentText,
        // Alt bilginin zemininde vurgu yazısı; gerekirse koyulaşır (altının #8A5D0B'si 4.2:1 kalıyordu). Koyu alt bilgide
        // (Elit) vurgunun kendisi, gerekirse açılır.
        footerLabel: P.footerLabel ?? ensureContrast(luminance(P.footer) < 0.2 ? pair.accent : accentText, P.footer),
    };
}

/**
 * Sitenin kök stili. `theme`: hazır tema anahtarı (boş/bilinmeyen = tasarımın varsayılanı). `accentColor`: restoranın
 * özel vurgu rengi (boşsa temanınki). `design`: "renkli" | "sade" | "elit" (boş = renkli). `font`: yazı tipi çifti
 * (SITE_FONTS anahtarı; boş = tasarımın çifti). Parametresiz çağrı varsayılanı verir.
 */
export function siteRootStyle(accentColor?: string | null, theme?: string | null, design?: string | null, font?: string | null): CSSProperties {
    const c = resolveSiteColors(accentColor, theme, design);
    const { palette: P, theme: t } = c;
    const f = resolveFont(font, c.design);
    const line = (a: number) => `rgba(${P.rgb},${a})`;
    return {
        '--site-sans': f.body,
        '--site-serif': f.heading,
        '--site-serif-tracking': f.tracking,
        '--site-serif-weight': P.headingWeight,
        '--site-accent': c.accent,
        '--site-on-accent': c.onAccent,
        '--site-accent-text': c.accentText,
        '--site-accent-bright': c.accentOnDark,
        '--site-accent-on-dark': c.accentOnDark,
        '--site-accent-on-sand': c.footerLabel,
        '--site-accent-line': `${c.accent}AA`,
        '--site-accent-soft': `color-mix(in srgb, ${c.accent} 22%, ${P.card})`,
        // Renkli kutular: zemin + üstündeki yazı (Sade'de açık kutular beyaz, koyu kutular mürekkep).
        '--site-hero-bg': t.hero,
        '--site-hero-deep': t.heroDeep,
        '--site-cover-bg': t.cover ?? t.hero,
        '--site-cover-deep': t.coverDeep ?? t.heroDeep,
        '--site-on-cover': P.onHero,
        '--site-cover-accent': c.heroAccent,
        '--site-menu-box': t.menuBox,
        '--site-on-menu-box': P.onMenuBox,
        '--site-on-menu-box-sub': P.onMenuBoxSub,
        '--site-menu-card': P.menuCard,
        '--site-dot-ok': P.dotOk,
        '--site-dot-bad': P.dotBad,
        '--site-pop': c.pop,
        '--site-on-pop': c.onPop,
        '--site-story': P.story,
        '--site-olive': P.olive,
        '--site-terracotta': c.terracotta,
        '--site-on-terracotta': c.onTerracotta,
        '--site-terracotta-text': c.terracottaText,
        '--site-on-terracotta-soft': P.onTerracottaSoft ?? c.onTerracotta,
        '--site-mustard': P.mustard,
        '--site-mustard-text': c.mustardText,
        '--site-footer-bg': P.footer,
        '--site-on-footer': P.onFooter,
        '--site-footer-muted': P.footerMuted,
        '--site-footer-map': P.footerMap,
        '--site-footer-road': P.footerRoad,
        '--site-footer-water': P.footerWater,
        '--site-ink': P.paper,
        '--site-hero': P.paper,
        '--site-overlay': P.heroOverlay,
        '--site-bg': P.bg,
        '--site-alt': P.alt,
        '--site-band': P.alt,
        '--site-card': P.card,
        '--site-raised': P.alt,
        '--site-placeholder': P.placeholder,
        '--site-chip': P.alt,
        '--site-text': P.fg,
        '--site-sub': P.text2,
        '--site-muted': P.muted,
        '--site-wordmark': P.wordmark,
        '--site-border': line(0.12),
        '--site-line': line(0.1),
        '--site-border-mid': line(0.2),
        '--site-border-strong': line(0.3),
        '--site-disabled': P.disabled,
        '--site-paper': P.paper,
        '--site-on-paper': P.onPaper,
        '--site-on-paper-sub': P.onPaperSub,
        '--site-paper-line': `rgba(${P.paperRgb},0.14)`,
        '--site-paper-line-strong': `rgba(${P.paperRgb},0.28)`,
        '--site-ok-bg': '#E3F1E6',
        '--site-ok-line': '#9CCBA9',
        '--site-ok': '#1B6A43',
        '--site-error-bg': '#FDECE7',
        '--site-error-line': '#F0B4A3',
        '--site-error': '#A3301A',
        colorScheme: 'light',
        fontFamily: f.body,
        fontWeight: f.bodyWeight,
        // Tek ağırlıklı başlık yazı tipi (Instrument Serif, DM Serif Display): kalın sınıflar sahte kalın çizmesin.
        fontSynthesisWeight: f.singleWeight ? 'none' : undefined,
        backgroundColor: 'var(--site-bg)',
        color: 'var(--site-text)',
    } as CSSProperties;
}

/** Başlıklar ve büyük fiyatlar: tasarımın serif'i (Renkli: Fraunces kalın, sıkı aralık; Sade: Instrument Serif). */
export const headingFont = 'font-[family-name:var(--site-serif,Fraunces,Georgia,serif)] font-(--site-serif-weight,700)! tracking-[var(--site-serif-tracking,-0.02em)]';

/** Başlığı iki parçaya böler: ikinci parça italik vurgu yazısıyla yazılır (Tema 2 başlık dili).
 *  "Közün başında, ustanın elinden." → ["Közün başında,", "ustanın elinden."]; virgül yoksa son kelime vurgulanır. */
export function splitAccent(text: string): [string, string] {
    const value = text.trim();
    const comma = value.indexOf(', ');
    if (comma > 0 && comma < value.length - 2) return [value.slice(0, comma + 1), value.slice(comma + 2)];
    const words = value.split(/\s+/).filter(Boolean);
    if (words.length < 2) return ['', value];
    return [words.slice(0, -1).join(' '), words[words.length - 1]];
}

// "Dost Kafe" → "Dost Kafe" (aradaki boşluk vurgu noktasına döner; tek kelimede nokta sona gelir).
export function wordmarkParts(name: string): { first: string; rest: string } {
    const words = name.trim().split(/\s+/).filter(Boolean);
    return { first: words[0] ?? '', rest: words.slice(1).join(' ') };
}

// "Dost Lokanta" → "DL"
export function initials(name: string): string {
    return name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map(word => word.charAt(0).toLocaleUpperCase('tr-TR'))
        .join('');
}

export function telHref(phone: string): string {
    return `tel:${phone.replace(/[^\d+]/g, '')}`;
}

/** "0532 000 48 48" → https://wa.me/905320004848 (Türkiye numarası varsayılır). */
export function whatsappHref(phone: string): string {
    let digits = phone.replace(/\D/g, '');
    if (digits.startsWith('0')) digits = `90${digits.slice(1)}`;
    else if (digits.length === 10) digits = `90${digits}`;
    return `https://wa.me/${digits}`;
}

// "2026-11-14" → "14 Kasım Cuma"
export function formatDay(date: string): string {
    const [year, month, day] = date.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' });
}

export function directionsUrl(address: string): string {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

// 1250 → "1.250 ₺"
export function formatSitePrice(value: number): string {
    return `${value.toLocaleString('tr-TR', { maximumFractionDigits: 2 })} ₺`;
}

// ── Ortak sınıf dizileri (site, menü, alt bilgi) ─────────────────────────────────────────────────
export const glass = 'border border-white/25 bg-white/15 backdrop-blur-[14px]';
export const container = 'mx-auto w-full max-w-[1320px] px-4 md:px-8';
export const pill = 'inline-flex items-center justify-center rounded-full font-bold no-underline transition-opacity hover:opacity-90';
