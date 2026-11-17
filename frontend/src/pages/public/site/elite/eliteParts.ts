import { cn } from '@/lib/utils';

// Elit tasarımın ortak sınıf dizileri ve hareketleri (tasarım: "Elit" — Bodoni Moda + Montserrat, köşesiz düğmeler, ince
// altın çizgiler, tam genişlik fotoğraf kapakları). Renkler siteTheme.ts'teki değişkenlerden:
// - krem zemin `--site-bg`, ara bant `--site-alt`, koyu bant `--site-paper` (üstünde `--site-on-paper`)
// - krem zeminde vurgu yazısı `--site-accent-text`; koyu bantta vurgu (yazı ve çizgi) `--site-accent-on-dark`
// - koyu banttaki altın düğme `--site-pop` / `--site-on-pop`
// Yalnız `site/elite/*` ve SiteFrame'in Elit dalı kullanır.

/** Başlıklar: Bodoni Moda, ince (400). */
export const elSerif = 'font-[family-name:var(--site-serif)] font-normal tracking-[var(--site-serif-tracking)]';
/** İtalik serif (alt başlık, sayılar, alıntı). */
export const elItalic = cn(elSerif, 'italic');
/** Kapağın italik alt başlığı. */
export const heroLead = cn(elItalic, 'm-0 max-w-[560px] text-xl leading-[1.45] text-[color-mix(in_srgb,var(--site-on-cover)_88%,transparent)] md:text-[22px]');
/** Küçük, aralıklı büyük harf etiket (Montserrat 500). */
export const elLabel = 'text-xs font-medium uppercase tracking-[0.32em]';
/** Bölüm genişliği ve kenar boşluğu (telefonda 16 px). */
export const elWrap = 'mx-auto w-full max-w-[1280px] px-4 sm:px-10';
/** Bölümün dikey boşluğu (geniş ekranda 120–140 px). */
export const elSection = 'py-20 md:py-[130px]';
/** Bölüm başlığı (h2). */
export const elTitle = cn(elSerif, 'm-0 break-words text-[40px] leading-[1.02] md:text-[clamp(44px,4.6vw,72px)]');

const button = 'inline-flex min-h-[52px] items-center justify-center gap-3.5 whitespace-nowrap px-7 text-xs font-medium uppercase tracking-[0.26em] no-underline transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 sm:px-9 md:min-h-14';
/** Köşesiz düğmeler: `gold` koyu bantta ana eylem, `ghost` koyu bantta ikincil, `dark` kremde ana eylem, `line` kremde
 *  ikincil, `goldLine` koyu bantta altın çizgili. */
export const elButton = {
    gold: cn(button, 'bg-[var(--site-pop)] text-[var(--site-on-pop)] focus-visible:outline-[var(--site-on-paper)]'),
    ghost: cn(button, 'border border-[color-mix(in_srgb,var(--site-on-paper)_60%,transparent)] text-[var(--site-on-paper)] focus-visible:outline-[var(--site-on-paper)]'),
    goldLine: cn(button, 'border border-[var(--site-accent-on-dark)] text-[var(--site-accent-on-dark)] focus-visible:outline-[var(--site-on-paper)]'),
    dark: cn(button, 'bg-[var(--site-paper)] text-[var(--site-on-paper)] focus-visible:outline-[var(--site-text)]'),
    line: cn(button, 'border border-[var(--site-text)] text-[var(--site-text)] focus-visible:outline-[var(--site-text)]'),
} as const;

/** Alt çizgili metin bağlantısı ("Hikâyenin tamamı →"). */
export const elTextLink = 'inline-flex min-h-11 items-center gap-3.5 self-start border-b border-current pb-1 text-xs font-medium uppercase tracking-[0.3em] no-underline transition-opacity hover:opacity-75';

/** Koyu bantlarda: italik ve vurgu yazısı koyu zemine göre (Elit'te başlık italikleri yazının rengini alır). */
export const onDark = 'bg-[var(--site-paper)] text-[var(--site-on-paper)] [--site-accent-text:var(--site-accent-on-dark)]';

/** Fotoğrafsız kapak ve bantlar için ince altın çapraz çizgi deseni. */
export const elPattern = 'bg-[repeating-linear-gradient(45deg,color-mix(in_srgb,var(--site-accent-on-dark)_10%,transparent)_0_1px,transparent_1px_24px),repeating-linear-gradient(-45deg,color-mix(in_srgb,var(--site-accent-on-dark)_6%,transparent)_0_1px,transparent_1px_24px)]';

// Yavaş yakınlaşma (kapak fotoğrafı), belirme (kapak yazısı), "Keşfet" çizgisi ve fotoğrafın üstüne gelince büyümesi.
// Hareket azaltma tercihinde hiçbiri çalışmaz.
export const ELITE_CSS = `
@keyframes rb-el-yavas{from{transform:scale(1.08)}to{transform:scale(1)}}
@keyframes rb-el-belir{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}
@keyframes rb-el-inis{0%{transform:scaleY(0);transform-origin:top}50%{transform:scaleY(1);transform-origin:top}50.1%{transform-origin:bottom}100%{transform:scaleY(0);transform-origin:bottom}}
.rb-el-yavas{animation:rb-el-yavas 9s ease-out both}
.rb-el-belir{animation:rb-el-belir 1.2s .1s both}
.rb-el-belir-hizli{animation:rb-el-belir .5s both}
.rb-el-inis{animation:rb-el-inis 2.4s ease-in-out infinite}
.rb-el-zoom img{transition:transform 1.2s cubic-bezier(.2,.7,.2,1)}
.rb-el-zoom:hover img{transform:scale(1.06)}
@media (prefers-reduced-motion: reduce){
.rb-el-yavas,.rb-el-belir,.rb-el-belir-hizli,.rb-el-inis{animation:none}
.rb-el-zoom img{transition:none}.rb-el-zoom:hover img{transform:none}
}
`;

/** "1" → "I" … "12" → "XII" (menü ve değer numaraları). */
export function roman(n: number): string {
    const map: [number, string][] = [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
    let out = '';
    let rest = n;
    for (const [v, s] of map) while (rest >= v) { out += s; rest -= v; }
    return out;
}

/**
 * Elit'in akış sayfalarına (paket sipariş, sipariş takibi, rezervasyon, rezervasyon sorgulama, masa QR) giydirmesi:
 * sayfa bileşenleri ve mantığı aynı kalır, `.rb-el-flow` kökü altında Elit dili uygulanır. Köşeler kalkar (dar
 * yuvarlaklar — nokta, adet düğmesi, ikon dairesi — kalır; yatay dolgulu haplar köşeli düğme olur), düğme yazısı küçük
 * aralıklı büyük harf, serif başlıklar Bodoni'nin ince (400) kesimi, gövdenin kalınları Montserrat 500. Katmansız stil
 * olduğu için Tailwind araçlarının (katmanlı) önüne geçer; yalnız Elit'te çizilir, Renkli ve Sade'ye dokunmaz.
 */
export const ELITE_FLOW_CSS = `
.rb-el-flow [class*="rounded"]{border-radius:0}
.rb-el-flow [class~="rounded-full"]:not([class*="px-"]):not([class*="pl-"]):not([class*="pr-"]){border-radius:9999px}
.rb-el-flow :is(.font-bold,.font-extrabold,.font-black,.font-semibold){font-weight:500}
.rb-el-flow [class*="site-serif"]{font-weight:400;letter-spacing:var(--site-serif-tracking,-0.01em)}
.rb-el-flow :is(a,button,label)[class~="rounded-full"]:is([class*="px-"],[class*="pl-"]):not(:has(> span + span)){text-transform:uppercase;letter-spacing:.14em;font-size:12px;font-weight:500}
.rb-el-flow [class*="repeating-conic-gradient"]{background-image:repeating-linear-gradient(45deg,color-mix(in srgb,var(--site-accent-on-dark) 10%,transparent) 0 1px,transparent 1px 24px),repeating-linear-gradient(-45deg,color-mix(in srgb,var(--site-accent-on-dark) 6%,transparent) 0 1px,transparent 1px 24px);background-size:auto}
.rb-el-flow [class*="shadow-["]{box-shadow:0 18px 40px -24px rgba(43,33,25,.45)}
`;

export function isElit(design?: string | null): boolean {
    return (design ?? '').trim().toLowerCase() === 'elit';
}
