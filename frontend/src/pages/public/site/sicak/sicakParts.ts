// "Sıcak" tasarımının ortak parçaları (şimdilik yalnız paket sipariş sayfası, /siparis). Dil: şeftali-krem degrade zemin,
// üstünde çok silik turuncu çizgi yemek süsleri; ince ten-turuncu çerçeveli yarı saydam beyaz kartlar; kartın üstünden
// taşan yuvarlak "tabak" fotoğraflar (koyu kenarlı); küçük köşeli turuncu düğmeler; koyu (neredeyse siyah) paneller.
// Renkler sitenin kök değişkenlerinden gelir (siteRootStyle, tasarım: sicak); burada yalnız tasarıma özgü çizgi ve zemin.

export function isSicak(design?: string | null): boolean {
    return (design ?? '').trim().toLowerCase() === 'sicak';
}

/** Kartların ince çerçevesi (ten-turuncu) ve yumuşak kartın zemini. */
export const scLine = 'border-[color-mix(in_srgb,var(--site-accent)_38%,#F3D3B0)]';
export const scCard = `rounded-[18px] border ${scLine} bg-[color-mix(in_srgb,#FFFFFF_62%,transparent)]`;

/** Çizgi süsler: pizza dilimi, yaprak, çatal, tavuk budu (silik turuncu). Zemine tekrar eden desen olarak basılır. */
const DOODLES = `<svg xmlns='http://www.w3.org/2000/svg' width='360' height='360' viewBox='0 0 360 360' fill='none' stroke='%23D9660B' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round' opacity='0.16'>`
    + `<path d='M40 40l46 14-30 40z'/><circle cx='60' cy='58' r='3'/><circle cx='70' cy='70' r='2.5'/><path d='M40 40c8-6 30 0 46 14'/>`
    + `<path d='M250 60c30-20 60 0 60 0s-20 34-60 30c-14-1-14-20 0-30z'/><path d='M252 88l52-26'/>`
    + `<path d='M70 250v60M60 250v18c0 6 20 6 20 0v-18'/>`
    + `<path d='M250 260c18-18 46-10 46 10s-26 28-38 18l-16 16c-6 6-14-2-8-8l16-16'/>`
    + `<path d='M170 170c10-14 30-14 40 0'/><path d='M165 172h50'/>`
    + `</svg>`;

/** Sayfa zemini: şeftali-krem degrade ve çizgi süsler. */
export const scPageBg = {
    backgroundColor: '#FFF3E6',
    backgroundImage: `url("data:image/svg+xml,${DOODLES}"), linear-gradient(180deg, #FFF6EC 0%, #FDE4CB 55%, #FFF3E6 100%)`,
    backgroundSize: '360px 360px, 100% 100%',
    backgroundAttachment: 'scroll, fixed',
} as const;

/** Koyu panel ("Siparişiniz") içinde ortak parçaların okunması için yerel renkler (krem yazı, turuncu artı). */
export const scDarkTone = '[--site-text:#FFF3E6] [--site-sub:#D9C7B5] [--site-muted:#D9C7B5] [--site-border:rgba(255,243,230,0.14)] [--site-border-strong:rgba(255,243,230,0.28)] [--site-raised:rgba(255,243,230,0.08)] [--site-bg:rgba(255,243,230,0.07)] [--site-qty-bg:rgba(255,243,230,0.1)] [--site-qty-minus:#FFF3E6] [--site-qty-plus:var(--site-accent)] [--site-qty-plus-text:var(--site-on-accent)]';

/** Açık zeminde sepet satırlarının adet düğmesi: şeftali hap, beyaz eksi, turuncu artı. */
export const scQtyTone = '[--site-qty-bg:#FDE4CB] [--site-qty-minus:#FFFFFF] [--site-qty-plus:var(--site-accent)] [--site-qty-plus-text:var(--site-on-accent)]';
