import type { CSSProperties } from 'react';
// Yeni tasarımların (Meyhane Gecesi, Esnaf Tabelası, Bahçe Kahvaltısı) tasarıma özgü çizgileri; yalnız kökünde
// `data-site-design` o tasarım olan sayfada etkilidir.
import './siteThemes.css';

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
// - Sıcak: şeftali/krem zemin #FFF3E6, şeftali bant #FDE4CB, beyaz kutular (ince turuncu-ten çizgi), parlak turuncu vurgu,
//   neredeyse siyah koyu bantlar #1E1915; Montserrat 700 başlık + Poppins gövde. Tema yalnız VURGU rengini seçer; kapak
//   açık şeftali (koyu yazı), menü kutusu ve alt bilgi koyu.
// - Meyhane Gecesi (koyu): kömür zemin #14110E, kart #1F1A15, krem yazı #F3EADB, kehribar vurgu #E9A23B (üstünde koyu
//   yazı); Young Serif + Figtree. Sitenin TEK koyu tasarımı: palette `dark: true` → tarayıcı denetimleri koyu
//   (color-scheme), durum renkleri koyu zemin için açık tonlar, açık zemin varsayan sabit renkler siteThemes.css'te
//   düzeltilir. Tema yalnız vurguyu ve kapak rengini seçer.
// - Esnaf Tabelası: krem zemin #FFF8EC, mürekkep #1A1A1A, tabela kırmızısı #C8102E, çini mavisi #1D4E89, sarı #F2C230;
//   Anton (dar, kalın, BÜYÜK HARF başlık) + Archivo. Kalın çizgiler, köşeli kartlar; fotoğrafsız ürün de dolu görünür.
// - Bahçe Kahvaltısı: açık yeşil-beyaz zemin #F7FBF4, adaçayı #45613E kapak, domates #C2410C vurgu, tereyağı #FFD978
//   kutu; Bricolage Grotesque + Figtree. Yuvarlak köşeler, başlıkta tereyağı işaretleyici.
// Yeni üç tasarımın tasarıma özgü çizgileri (köşe, başlık harfi, menü satırı, desen) siteThemes.css'te, kökteki
// `data-site-design` özniteliğine bağlı; renkler yine yalnız bu dosyadaki değişkenlerden.
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
export const SITE_DESIGN_KEYS = ['renkli', 'sade', 'elit', 'sicak', 'meyhane', 'esnaf', 'bahce'] as const;
export type SiteDesignKey = (typeof SITE_DESIGN_KEYS)[number];
export const DEFAULT_DESIGN: SiteDesignKey = 'renkli';

export function resolveDesign(key?: string | null): SiteDesignKey {
    return (SITE_DESIGN_KEYS as readonly string[]).includes(key ?? '') ? key as SiteDesignKey : DEFAULT_DESIGN;
}

// ── Yazı tipi çiftleri ──
// Başlık (`--site-serif`) + gövde (`--site-sans`). Restoran "Yazı tipi"nde birini seçer; boş = tasarımın kendi çifti
// (Renkli: Fraunces + Manrope; Sade: Instrument Serif + Manrope; Elit: Bodoni Moda + Montserrat; Sıcak: Montserrat + Poppins). Hepsi Google Fonts,
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
const POPPINS = 'family=Poppins:wght@300;400;500;600;700';
// Yeni tasarımların çiftleri (Google Fonts latin-ext dosyalarında ğ Ğ ş Ş ı İ ç Ç ö Ö ü Ü var; cmap ile denetlendi).
const YOUNG_SERIF = 'family=Young+Serif';
const FIGTREE = 'family=Figtree:wght@400;500;600;700;800';
const ANTON = 'family=Anton';
const ARCHIVO = 'family=Archivo:wght@400;500;600;700;800';
const BRICOLAGE = 'family=Bricolage+Grotesque:opsz,wght@12..96,400..800';
const fontsUrl = (...families: string[]) => `https://fonts.googleapis.com/css2?${families.join('&')}&display=swap`;

export const SITE_FONT_KEYS = [
    'fraunces-manrope', 'instrument-manrope', 'bodoni-montserrat', 'playfair-inter', 'dmserif-dmsans', 'cormorant-lato', 'grotesk-inter',
    'montserrat-poppins', 'youngserif-figtree', 'anton-archivo', 'bricolage-figtree',
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
    /** Başlık yazı tipinin italiği yok (Young Serif, Anton, Bricolage): italik vurgu sahte eğik çizilmesin, dik kalır. */
    noItalic?: boolean;
    /** Başlıkta harf başına ortalama genişlik (em; ince 400 ve kalın 700), ana sayfadaki dev adın sığması için. Tarayıcıda
     *  ölçüldü (canvas measureText, Türkçe örnek ad) ve Fraunces kalının eski 0,6 katsayısına göre ölçeklendi. */
    charWidth: { regular: number; bold: number };
    /** Gereken Google Fonts css2 adresi (ağırlıklar ve italikler). */
    href: string;
}

const fontPair = (p: Omit<SiteFontPair, 'href'>, ...families: string[]): SiteFontPair => ({ ...p, href: fontsUrl(...families) });
const MANROPE_STACK = 'Manrope, system-ui, sans-serif';
const INTER_STACK = 'Inter, system-ui, sans-serif';
const FIGTREE_STACK = 'Figtree, system-ui, sans-serif';

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
    // Genişlikler tahmin (Montserrat geniş bir grotesk; Space Grotesk'ten biraz geniş, kalını daha da geniş).
    'montserrat-poppins': fontPair({
        key: 'montserrat-poppins', label: 'Montserrat + Poppins', heading: 'Montserrat, system-ui, sans-serif', tracking: '-0.02em',
        body: 'Poppins, system-ui, sans-serif', charWidth: { regular: 0.66, bold: 0.72 },
    }, MONTSERRAT, POPPINS),
    // Genişlikler tahmin (Young Serif Fraunces'ten biraz geniş; Anton dar ama Esnaf'ta başlıklar büyük harf; Bricolage
    // Space Grotesk'e yakın).
    'youngserif-figtree': fontPair({
        key: 'youngserif-figtree', label: 'Young Serif + Figtree', heading: "'Young Serif', Georgia, serif", tracking: '-0.01em',
        body: FIGTREE_STACK, singleWeight: true, noItalic: true, charWidth: { regular: 0.62, bold: 0.62 },
    }, YOUNG_SERIF, FIGTREE),
    'anton-archivo': fontPair({
        key: 'anton-archivo', label: 'Anton + Archivo', heading: "Anton, Impact, 'Arial Narrow', sans-serif", tracking: '0.01em',
        body: 'Archivo, system-ui, sans-serif', singleWeight: true, noItalic: true, charWidth: { regular: 0.5, bold: 0.5 },
    }, ANTON, ARCHIVO),
    'bricolage-figtree': fontPair({
        key: 'bricolage-figtree', label: 'Bricolage Grotesque + Figtree', heading: "'Bricolage Grotesque', system-ui, sans-serif", tracking: '-0.025em',
        body: FIGTREE_STACK, noItalic: true, charWidth: { regular: 0.58, bold: 0.62 },
    }, BRICOLAGE, FIGTREE),
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
export const SITE_FONTS_HREF = fontsUrl(FRAUNCES, INSTRUMENT, BODONI, MANROPE, MONTSERRAT, POPPINS, YOUNG_SERIF, FIGTREE, ANTON, ARCHIVO, BRICOLAGE);
/** Bütün çiftler birlikte (yalnız admin'deki yazı tipi seçici). */
export const ALL_SITE_FONTS_HREF = fontsUrl(FRAUNCES, INSTRUMENT, BODONI, MANROPE, MONTSERRAT, PLAYFAIR, INTER, DM_SERIF, DM_SANS, CORMORANT, LATO, GROTESK, POPPINS,
    YOUNG_SERIF, FIGTREE, ANTON, ARCHIVO, BRICOLAGE);

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
    /** Koyu tasarım (Meyhane Gecesi): zemin koyu, yazı açık. Özel vurgunun düğme yazısı koyu zemin rengi, vurgu yazısı
     *  kutulara göre AÇILIR, tarayıcı denetimleri koyu (color-scheme: dark). Yoksa açık. */
    dark?: boolean;
    /** Çizgi saydamlıkları (`--site-border` / `-line` / `-border-mid` / `-border-strong`); yoksa 0.12 / 0.1 / 0.2 / 0.3. */
    lines?: [number, number, number, number];
    /** Durum renkleri (onay ve hata kutusu, yazısı, çizgisi; hata düğmesinin yazısı); yoksa açık zemin değerleri. */
    status?: SiteStatusColors;
}

export interface SiteStatusColors {
    okBg: string; okLine: string; ok: string;
    errorBg: string; errorLine: string; error: string;
    /** `--site-error` zeminli düğmenin yazısı. */
    onError: string;
}

/** Açık tasarımların durum renkleri (eski sabit değerler). */
const LIGHT_STATUS: SiteStatusColors = {
    okBg: '#E3F1E6', okLine: '#9CCBA9', ok: '#1B6A43',
    errorBg: '#FDECE7', errorLine: '#F0B4A3', error: '#A3301A', onError: '#FFFFFF',
};

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

/** Sıcak paleti: şeftali/krem zemin, beyaz kutular, koyu (neredeyse siyah) menü kutusu, hikâye ve alt bilgi. Kapak açık
 *  şeftali (üstünde koyu yazı); koyu zeminlerdeki vurgu ve düğme (pop) temanın vurgusundan hesaplanır. */
const SICAK: SitePalette = {
    bg: '#FFF3E6',
    fg: '#1E1915',
    alt: '#FDE4CB',
    card: '#FFFFFF',
    text2: '#5C4A3B',
    muted: '#6E5C4D',
    wordmark: '#F6DCC0',
    placeholder: '#F6DCC0',
    rgb: '30,25,21',
    heroOverlay: 'rgba(255,243,230,0.82)',
    disabled: '#B09C88',
    paper: '#1E1915',
    onPaper: '#FFF3E6',
    onPaperSub: '#D9C7B5',
    paperRgb: '255,243,230',
    mustard: '#F7C88F',
    mustardText: null,
    onHero: '#1E1915',
    onMenuBox: '#FFF3E6',
    onMenuBoxSub: '#D9C7B5',
    heroAccent: null,
    menuCard: '#FFF3E6',
    dotOk: '#2EAD62',
    dotBad: '#E0603A',
    pop: null,
    onPop: null,
    story: '#1E1915',
    olive: '#2A231D',
    terracotta: null,
    onTerracotta: null,
    terracottaText: null,
    onTerracottaSoft: null,
    footer: '#1E1915',
    onFooter: '#FFF3E6',
    footerMuted: '#D9C7B5',
    footerLabel: null,
    footerMap: '#2A231D',
    footerRoad: '#3A3028',
    footerWater: '#23303A',
    font: 'montserrat-poppins',
    headingWeight: 700,
};

/** Meyhane Gecesi paleti: tek koyu tasarım. Zemin kömür, kartlar bir ton açık, koyu panel (sepet, çağrı kartı) bir ton
 *  daha açık ki koyu zeminde ayrılsın. Hardal kutu kehribar (üstünde koyu yazı; siteThemes.css kutunun içindeki yazı
 *  değişkenlerini koyulaştırır). Kontrastlar (WCAG): krem yazı zeminde 15.8, kartta 14.5; ikincil #CFC2B0 kartta 9.9;
 *  soluk #ADA08F kartta 6.7, menü kartında 6.4; kehribar zeminde 8.7, kartta 8.0, panelde 7.2; kehribar üstünde koyu yazı 8.7. */
const MEYHANE: SitePalette = {
    bg: '#14110E',
    fg: '#F3EADB',
    alt: '#1B1713',
    card: '#1F1A15',
    text2: '#CFC2B0',
    muted: '#ADA08F',
    wordmark: '#211B16',
    placeholder: '#29221B',
    rgb: '243,234,219',
    heroOverlay: 'rgba(20,17,14,0.80)',
    disabled: '#6E6357',
    paper: '#29221B',
    onPaper: '#F3EADB',
    onPaperSub: '#CDBFAD',
    paperRgb: '243,234,219',
    mustard: '#E9A23B',
    mustardText: null,
    onHero: '#F3EADB',
    onMenuBox: '#F3EADB',
    onMenuBoxSub: '#CDBFAD',
    heroAccent: null,
    menuCard: '#14110E',
    dotOk: '#7FD6A0',
    dotBad: '#F08F7A',
    pop: null,
    onPop: '#14110E',
    story: '#3A1712',
    olive: '#22291F',
    // Kiremit kutu (seçili gün, "Özel günler"): krem yazı 5.7, yumuşak şeftali yazı 4.8; koyu zeminde kiremit yazı 7.0.
    terracotta: '#A63B29',
    onTerracotta: '#FBF1E4',
    terracottaText: '#E8826E',
    onTerracottaSoft: '#FFD9A8',
    footer: '#0E0C0A',
    onFooter: '#F3EADB',
    footerMuted: '#BDB0A0',
    footerLabel: null,
    footerMap: '#1E1A15',
    footerRoad: '#2C251E',
    footerWater: '#162229',
    font: 'youngserif-figtree',
    headingWeight: 400,
    dark: true,
    lines: [0.12, 0.1, 0.2, 0.32],
    // Koyu zeminde durum renkleri: açık yazı koyu kutuda (onay 9.1, hata 7.3); hata düğmesinde koyu yazı (8.0).
    status: {
        okBg: '#13261A', okLine: '#2F6B45', ok: '#7FD6A0',
        errorBg: '#2A1512', errorLine: '#7A3328', error: '#F08F7A', onError: '#14110E',
    },
};

/** Esnaf Tabelası paleti: krem zemin, mürekkep yazı, kalın çizgiler; koyu panel mürekkep, menü kutusu temaya göre
 *  (çini mavisi / kırmızı), hardal kutu tabela sarısı. Kontrastlar: mürekkep zeminde 16.5, ara bantta 14.8; ikincil
 *  #3F3933 ara bantta 9.7; soluk #5A5249 ara bantta 6.5; çini mavisi üstünde krem 8.0, sarı 5.0; sarı üstünde mürekkep 10.4. */
const ESNAF: SitePalette = {
    bg: '#FFF8EC',
    fg: '#1A1A1A',
    alt: '#F7EBD6',
    card: '#FFFFFF',
    text2: '#3F3933',
    muted: '#5A5249',
    wordmark: '#F2E4CC',
    placeholder: '#F1E3CB',
    rgb: '26,26,26',
    heroOverlay: 'rgba(255,248,236,0.84)',
    disabled: '#A59A8C',
    paper: '#1A1A1A',
    onPaper: '#FFF8EC',
    onPaperSub: '#CFC6B8',
    paperRgb: '255,248,236',
    mustard: '#F2C230',
    mustardText: '#F2C230',
    onHero: '#FFF8EC',
    onMenuBox: '#FFF8EC',
    onMenuBoxSub: '#E4DCCF',
    // Kapaktaki vurgu yazısı: açık sarı (kırmızı kapakta 4.8, mavide 6.9, kara tahtada 12.2).
    heroAccent: '#FFE7A3',
    menuCard: '#FFF8EC',
    dotOk: '#7BE0A2',
    dotBad: '#FFB4A3',
    pop: '#F2C230',
    onPop: '#1A1A1A',
    story: '#1D4E89',
    olive: '#14365F',
    terracotta: '#C8102E',
    onTerracotta: '#FFFFFF',
    terracottaText: '#B00E28',
    onTerracottaSoft: '#FFE7A3',
    footer: '#1A1A1A',
    onFooter: '#FFF8EC',
    footerMuted: '#CFC6B8',
    footerLabel: '#F2C230',
    footerMap: '#262626',
    footerRoad: '#3A3A3A',
    footerWater: '#1D3550',
    font: 'anton-archivo',
    headingWeight: 400,
    // Pano çizgileri daha belirgin.
    lines: [0.2, 0.16, 0.34, 0.6],
};

/** Bahçe Kahvaltısı paleti: açık yeşil-beyaz zemin, beyaz kartlar, koyu orman yeşili panel, tereyağı kutu.
 *  Kontrastlar: yazı zeminde 14.3, ara bantta 13.0; ikincil #3E4A39 ara bantta 8.2; soluk #55604F ara bantta 5.8;
 *  tereyağı üstünde koyu yazı 11.0; orman yeşili panelde krem 10.4, tereyağı 8.0. */
const BAHCE: SitePalette = {
    bg: '#F7FBF4',
    fg: '#1F2A1C',
    alt: '#EAF2E4',
    card: '#FFFFFF',
    text2: '#3E4A39',
    muted: '#55604F',
    wordmark: '#E3EEDC',
    placeholder: '#E2ECDA',
    rgb: '31,42,28',
    heroOverlay: 'rgba(247,251,244,0.82)',
    disabled: '#9DA996',
    paper: '#2F4229',
    onPaper: '#F7FBF4',
    onPaperSub: '#CFDCC8',
    paperRgb: '247,251,244',
    mustard: '#FFD978',
    mustardText: '#FFD978',
    onHero: '#FFFFFF',
    onMenuBox: '#F7FBF4',
    onMenuBoxSub: '#E2EBDC',
    // Kapakta açık tereyağı (adaçayında 5.5, domateste 5.2, zeytinde 7.2).
    heroAccent: '#FFE39A',
    menuCard: '#F7FBF4',
    dotOk: '#9BE6B0',
    dotBad: '#FFB4A3',
    pop: '#FFD978',
    onPop: '#1F2A1C',
    story: '#8A3510',
    olive: '#3B5234',
    terracotta: null,
    onTerracotta: null,
    terracottaText: null,
    onTerracottaSoft: null,
    footer: '#26351F',
    onFooter: '#F7FBF4',
    footerMuted: '#C9D6C1',
    footerLabel: '#FFD978',
    footerMap: '#2F4229',
    footerRoad: '#3E5536',
    footerWater: '#2A4A4A',
    font: 'bricolage-figtree',
    headingWeight: 700,
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
    { key: 'bordo', label: 'Bordo', description: 'Bordo kapak, hardal vurgu. Akşam yemeği, steakhouse.', ...MUSTARD, hero: '#7A2232', heroDeep: '#5E1A27', menuBox: RENKLI.olive },
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
    { key: 'bordo', label: 'Bordo', description: 'Gül kurusu süsler, bordo yazılar. Akşam yemeği, steakhouse.', accent: '#D4A0A0', accentText: '#7A2F3A', ...ESPRESSO },
    { key: 'zeytin', label: 'Zeytin', description: 'Adaçayı süsler, zeytin yeşili yazılar. Ege, meyhane.', accent: '#B9BD8E', accentText: '#56622F', ...ESPRESSO },
    { key: 'lacivert', label: 'Lacivert', description: 'Buz mavisi süsler, lacivert yazılar. Balık, deniz kenarı.', accent: '#A9B8D0', accentText: '#2F4A75', ...ESPRESSO },
    { key: 'komur', label: 'Kömür', description: 'Taş rengi süsler, kömür yazılar. Bar, gece mekânı.', accent: '#CFC6B8', accentText: '#4A443C', ...ESPRESSO },
]);

const SADE_THEMES = presets(SADE, [
    { key: 'altin', label: 'Altın', description: 'Sıcak krem zemin, altın vurgu. Varsayılan.', accent: '#E8B04B', onAccent: SADE.fg, accentText: '#8A5D0B', ...WHITE },
    { key: 'terracotta', label: 'Terracotta', description: 'Kiremit turuncusu vurgu. Ocakbaşı, ızgara, pide.', accent: '#E2683C', onAccent: SADE.fg, accentText: '#A63F17', ...WHITE },
    { key: 'zeytin', label: 'Zeytin', description: 'Adaçayı yeşili vurgu. Ege, meyhane, kahvaltı.', accent: '#9DBF8E', onAccent: SADE.fg, accentText: '#3F6B34', ...WHITE },
    { key: 'lacivert', label: 'Lacivert', description: 'Koyu lacivert vurgu. Balık, deniz kenarı.', accent: '#2F4F8F', onAccent: '#FFFFFF', accentText: '#2F4F8F', ...WHITE },
    { key: 'bordo', label: 'Bordo', description: 'Bordo vurgu. Akşam yemeği, steakhouse.', accent: '#A8354A', onAccent: '#FFFFFF', accentText: '#8E2433', ...WHITE },
    { key: 'komur', label: 'Kömür', description: 'Kömür siyahı vurgu. Bar, gece mekânı; sade ve güçlü.', accent: '#2A2622', onAccent: SADE.bg, accentText: '#2A2622', ...WHITE },
    { key: 'beyaz', label: 'Sade gri', description: 'Serin gri vurgu. Sade ve modern.', accent: '#9AA5B1', onAccent: SADE.fg, accentText: '#4A5563', ...WHITE },
]);

// Sıcak: tema yalnız vurguyu seçer; kapak açık şeftali, koyu kapak (masa QR, akış sayfaları) ve menü kutusu koyu.
// Turuncu (#D9660B) beyaz yazıyla 3.6:1 kaldığı için düğme yazısı koyu (4.9:1); koyu vurgularda beyaz yazı.
const PEACH = { hero: SICAK.paper, heroDeep: '#15110E', cover: SICAK.alt, coverDeep: '#F9D6B3', menuBox: SICAK.paper };
const SICAK_THEMES = presets(SICAK, [
    { key: 'altin', label: 'Turuncu', description: 'Parlak turuncu vurgu, şeftali zemin. Varsayılan.', accent: '#D9660B', onAccent: SICAK.fg, accentText: '#A34A06', ...PEACH },
    { key: 'terracotta', label: 'Kırmızı biber', description: 'Biber kırmızısı vurgu. Ocakbaşı, ızgara, burger.', accent: '#C8341E', onAccent: '#FFFFFF', accentText: '#A62A16', ...PEACH },
    { key: 'zeytin', label: 'Zeytin', description: 'Zeytin yeşili vurgu. Ege, kahvaltı, salata.', accent: '#6B7A2E', onAccent: '#FFFFFF', accentText: '#56622F', ...PEACH },
    { key: 'bordo', label: 'Bordo', description: 'Bordo vurgu. Akşam yemeği, steakhouse.', accent: '#8E2433', onAccent: '#FFFFFF', accentText: '#8E2433', ...PEACH },
    { key: 'komur', label: 'Kömür', description: 'Kömür siyahı vurgu. Bar, gece mekânı; sade ve güçlü.', accent: SICAK.fg, onAccent: SICAK.bg, accentText: SICAK.fg, ...PEACH },
]);

// Meyhane Gecesi: tema vurguyu ve kapağın rengini seçer (kapak hep koyu). Vurgular koyu zemin için açık tonlar; düğme
// yazısı koyu zemin rengi. Kontrast (zeminde / kartta / üstünde koyu yazı): kehribar 8.7 / 8.0 / 8.7; süt beyazı
// 14.8 / 13.6 / 14.8; buz mavisi 10.1 / 9.3 / 10.1; gül 8.9 / 8.2 / 8.9; zeytin 10.6 / 9.7 / 10.6.
const NIGHT = { onAccent: MEYHANE.bg, menuBox: '#2A1C14' };
const MEYHANE_THEMES = presets(MEYHANE, [
    { key: 'altin', label: 'Kehribar', description: 'Kehribar ışık, kömür zemin. Varsayılan.', accent: '#E9A23B', accentText: '#E9A23B', hero: '#0D0B09', heroDeep: '#080706', ...NIGHT },
    { key: 'beyaz', label: 'Süt beyazı', description: 'Süt beyazı vurgu, sade ve loş. Meze, ocakbaşı.', accent: '#ECE3D3', accentText: '#ECE3D3', hero: '#0D0B09', heroDeep: '#080706', ...NIGHT },
    { key: 'lacivert', label: 'Gece mavisi', description: 'Buz mavisi vurgu, lacivert kapak. Balık, deniz kenarı.', accent: '#9EC1EA', accentText: '#9EC1EA', hero: '#0F1826', heroDeep: '#0A111C', ...NIGHT },
    { key: 'bordo', label: 'Bordo', description: 'Gül kurusu vurgu, bordo kapak. Steakhouse, akşam yemeği.', accent: '#E8A0A0', accentText: '#E8A0A0', hero: '#2B1016', heroDeep: '#1F0B10', ...NIGHT },
    { key: 'zeytin', label: 'Zeytinlik', description: 'Zeytin yeşili vurgu, koyu yeşil kapak. Ege, ocakbaşı.', accent: '#B9C98A', accentText: '#B9C98A', hero: '#161D14', heroDeep: '#10160F', ...NIGHT },
]);

// Esnaf Tabelası: tema kapağın ve menü kutusunun rengini, vurguyu seçer. Kırmızı #C8102E krem zeminde 5.6 (yazıda
// #B00E28, ara bantta 6.1), üstünde beyaz 5.9; sarı vurguda düğme yazısı mürekkep (10.4), açık zeminde yazı #7A5C00 (5.3).
const ESNAF_THEMES = presets(ESNAF, [
    { key: 'altin', label: 'Tabela kırmızısı', description: 'Kırmızı kapak, çini mavisi menü kutusu. Varsayılan.', accent: '#C8102E', onAccent: '#FFFFFF', accentText: '#B00E28', hero: '#C8102E', heroDeep: '#A00D25', menuBox: '#1D4E89' },
    { key: 'lacivert', label: 'Çini mavisi', description: 'Çini mavisi kapak, kırmızı vurgu. Pide, lahmacun, fırın.', accent: '#C8102E', onAccent: '#FFFFFF', accentText: '#B00E28', hero: '#1D4E89', heroDeep: '#163D6B', menuBox: '#A00D25' },
    { key: 'komur', label: 'Kara tahta', description: 'Kara tahta kapak, sarı vurgu. Esnaf lokantası, büfe.', accent: '#F2C230', onAccent: '#1A1A1A', accentText: '#7A5C00', hero: '#1F2A24', heroDeep: '#18211C', menuBox: '#1D4E89' },
    { key: 'terracotta', label: 'Közlenmiş biber', description: 'Koyu kırmızı kapak, sarı vurgu. Kebap, ocakbaşı, döner.', accent: '#F2C230', onAccent: '#1A1A1A', accentText: '#7A5C00', hero: '#8E0B21', heroDeep: '#70091A', menuBox: '#1A1A1A' },
]);

// Bahçe Kahvaltısı: tema kapağın ve menü kutusunun rengini, vurguyu seçer. Domates #C2410C zeminde 4.95 (yazıda
// #AE3A0B, ara bantta 5.4), üstünde beyaz 5.2; adaçayı vurgu #4E6B46 üstünde beyaz 6.0, yazıda #3F5A38 (6.7).
const GARDEN_TOMATO = { accent: '#C2410C', onAccent: '#FFFFFF', accentText: '#AE3A0B' };
const BAHCE_THEMES = presets(BAHCE, [
    { key: 'altin', label: 'Adaçayı', description: 'Adaçayı kapak, domates vurgu. Varsayılan.', ...GARDEN_TOMATO, hero: '#45613E', heroDeep: '#3A5234', menuBox: '#8A3510' },
    { key: 'terracotta', label: 'Domates', description: 'Domates kapak, adaçayı vurgu. Serpme kahvaltı, menemen.', accent: '#4E6B46', onAccent: '#FFFFFF', accentText: '#3F5A38', hero: '#A8380B', heroDeep: '#8E2F09', menuBox: '#2F4229' },
    { key: 'zeytin', label: 'Zeytin', description: 'Zeytin yeşili kapak, domates vurgu. Ege kahvaltısı, köy sofrası.', ...GARDEN_TOMATO, hero: '#4D4A22', heroDeep: '#3F3C1B', menuBox: '#2F4229' },
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
    sicak: {
        key: 'sicak', label: 'Sıcak', description: 'Şeftali ve krem zemin, turuncu vurgu, yuvarlak tabak fotoğrafları.',
        palette: SICAK, themes: SICAK_THEMES,
    },
    meyhane: {
        key: 'meyhane', label: 'Meyhane Gecesi', description: 'Koyu kömür zemin, kehribar ışık; menü, basılı meyhane kartı gibi noktalı fiyat satırları.',
        palette: MEYHANE, themes: MEYHANE_THEMES,
    },
    esnaf: {
        key: 'esnaf', label: 'Esnaf Tabelası', description: 'Tabela kırmızısı ve çini mavisi, kalın büyük harf başlıklar; ürün fotoğrafı olmasa da dolu.',
        palette: ESNAF, themes: ESNAF_THEMES,
    },
    bahce: {
        key: 'bahce', label: 'Bahçe Kahvaltısı', description: 'Adaçayı, domates ve tereyağı; ferah zemin, yuvarlak köşeler, sabah ışığı.',
        palette: BAHCE, themes: BAHCE_THEMES,
    },
};

/** Koyu tasarım mı (Meyhane Gecesi). */
export function isDarkDesign(design?: string | null): boolean {
    return SITE_DESIGNS[resolveDesign(design)].palette.dark === true;
}

/** Menünün satır düzeni (DeliveryMenu `variant`): Meyhane Gecesi noktalı fiyat satırı, Esnaf Tabelası pano satırı;
 *  öteki tasarımlar kart ('default'; Sıcak'ın tabak kartı yalnız paket sipariş sayfasında ayrıca seçilir). */
export function lineMenuVariant(design?: string | null): 'default' | 'meyhane' | 'esnaf' {
    const d = resolveDesign(design);
    return d === 'meyhane' || d === 'esnaf' ? d : 'default';
}

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
    // Koyu tasarımda düğme yazısının koyu seçeneği zemin rengi (yazı rengi açık).
    const pair = custom ? accentPair(accentColor, P.dark ? P.bg : P.fg) : { accent: t.accent, onAccent: t.onAccent };
    // Vurgu yazısı hem zeminde hem kutularda okunmalı: zemin ve ara bandın koyusuna göre (Renkli: kum zemin; Sade ve
    // Elit: ara bant). Koyu tasarımda en açık yüzeye (kart) göre açılır.
    const accentText = !custom ? t.accentText
        : P.dark ? ensureContrast(accentColor, P.card)
            : ensureContrast(accentColor, luminance(P.alt) < luminance(P.bg) ? P.alt : P.bg);
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
 * özel vurgu rengi (boşsa temanınki). `design`: "renkli" | "sade" | "elit" | "sicak" (boş = renkli). `font`: yazı tipi çifti
 * (SITE_FONTS anahtarı; boş = tasarımın çifti). Parametresiz çağrı varsayılanı verir.
 */
export function siteRootStyle(accentColor?: string | null, theme?: string | null, design?: string | null, font?: string | null): CSSProperties {
    const c = resolveSiteColors(accentColor, theme, design);
    const { palette: P, theme: t } = c;
    const f = resolveFont(font, c.design);
    const line = (a: number) => `rgba(${P.rgb},${a})`;
    const [lineBorder, lineSoft, lineMid, lineStrong] = P.lines ?? [0.12, 0.1, 0.2, 0.3];
    const status = P.status ?? LIGHT_STATUS;
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
        '--site-border': line(lineBorder),
        '--site-line': line(lineSoft),
        '--site-border-mid': line(lineMid),
        '--site-border-strong': line(lineStrong),
        '--site-disabled': P.disabled,
        '--site-paper': P.paper,
        '--site-on-paper': P.onPaper,
        '--site-on-paper-sub': P.onPaperSub,
        '--site-paper-line': `rgba(${P.paperRgb},0.14)`,
        '--site-paper-line-strong': `rgba(${P.paperRgb},0.28)`,
        '--site-ok-bg': status.okBg,
        '--site-ok-line': status.okLine,
        '--site-ok': status.ok,
        '--site-error-bg': status.errorBg,
        '--site-error-line': status.errorLine,
        '--site-error': status.error,
        '--site-on-error': status.onError,
        // Odak halkası (yeni tasarımlar, siteThemes.css): vurgunun okunur tonu (koyu tasarımda açık, açıkta koyu).
        '--site-focus': c.accentText,
        colorScheme: P.dark ? 'dark' : 'light',
        fontFamily: f.body,
        fontWeight: f.bodyWeight,
        // Tek ağırlıklı başlık yazı tipi (Instrument Serif, DM Serif Display): kalın sınıflar sahte kalın çizmesin.
        fontSynthesisWeight: f.singleWeight ? 'none' : undefined,
        // İtalği olmayan başlık yazı tipi (Young Serif, Anton, Bricolage): italik vurgu sahte eğik çizilmesin, dik kalır.
        fontSynthesisStyle: f.noItalic ? 'none' : undefined,
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
