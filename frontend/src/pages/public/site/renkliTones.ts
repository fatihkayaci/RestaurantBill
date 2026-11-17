// "Renkli ve sıcak" yönünün Mekân ve İletişim sayfalarında kullanılan, ortak palette (siteTheme.ts) henüz değişkeni
// olmayan iki kutu rengi. Ortak palete `--site-olive` / `--site-terracotta` eklenince bunlar o değişkenlere döner.
// Karşıtlık: krem (#FBF4E8) yazı zeytinde ~9:1, kiremitte ~5.6:1; açık hardal (#F2C25E) zeytinde ~5.7:1, kiremitte
// 3.7:1 (yetmez; kiremit kutuda etiket krem yazılır, hardal yalnız süs çizgisi).

/** Zeytin (#3E4A33): Mekân kapağı ve İletişim'deki çalışma saatleri kutusu. */
export const OLIVE = '#3E4A33';
/** Kiremit (#A9401F): "Özel günler" kutusu, seçili konu hapı. */
export const TERRACOTTA = '#A9401F';

/** Tailwind sınıfları (renkler sabit; JIT tam dizeyi görmeli). */
export const oliveBg = 'bg-[#3E4A33]';
export const terracottaBg = 'bg-[#A9401F]';
