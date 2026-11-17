// Mekân, İletişim ve rezervasyon sayfalarındaki iki kutu rengi; değerleri tasarıma göre siteTheme.ts'te (siteRootStyle).
// Renkli: zeytin #3E4A33, kiremit #A9401F (üstünde krem yazı: zeytinde ~9:1, kiremitte ~5.6:1; açık hardal zeytinde
// ~5.7:1, kiremitte 3.7:1 yetmez: kiremit kutuda etiket krem yazılır, hardal yalnız süs çizgisi).
// Sade: zeytin = koyu mürekkep kutusu (üstünde krem yazı), kiremit = temanın vurgusu (yazısı --site-on-terracotta).

/** Zeytin: Mekân kapağı, İletişim'deki çalışma saatleri kutusu, rezervasyon onayı. Yazısı --site-on-paper. */
export const oliveBg = 'bg-[var(--site-olive)]';
/** Kiremit: "Özel günler" kutusu, seçili konu/gün hapı. Yazısı --site-on-terracotta. */
export const terracottaBg = 'bg-[var(--site-terracotta)]';

/** Koyu (rezervasyon) kapağın sağ altındaki krem çizgili hap bağlantı sınıfı. */
export const heroOutlineLink = 'inline-flex h-[50px] items-center gap-2 whitespace-nowrap rounded-full border-2 border-[rgba(251,244,232,0.4)] px-[22px] text-sm font-extrabold text-[var(--site-on-paper)] no-underline transition-colors hover:border-[var(--site-on-paper)]';
