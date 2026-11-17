import type { PublicSite, PublicTable } from '@/features/customerSite/types';

// Mekân sayfasının veri kuralları (Renkli/Sade ve Elit sayfası birlikte kullanır): fotoğrafların sırası, kapak,
// bölüm adlarından başlık, toplam kişi sayısı ve galerideki fotoğrafın düzenleyicideki hedefi.

/** Mekân fotoğrafları: galeri → hikâye → kapak (tekrarsız). */
export function venuePhotos(site: PublicSite): string[] {
    const c = site.site;
    return [...new Set([...c.galleryImageUrls, c.aboutImageUrl, c.coverImageUrl].filter(Boolean))];
}

/** Kapak: Mekân'ın kendi kapağı → galerinin ilk fotoğrafı → hikâye → sitenin kapağı. */
export function heroPhoto(site: PublicSite): string {
    const c = site.site;
    return c.venueHeroUrl || c.galleryImageUrls[0] || c.aboutImageUrl || c.coverImageUrl;
}

/** Türkçe bulunma eki: "salon" → "salonda", "teras" → "terasta", "bahçe" → "bahçede" (son ünlü ve sert ünsüz uyumu). */
export function locative(word: string): string {
    const lower = word.trim().toLocaleLowerCase('tr-TR');
    const vowel = [...lower].reverse().find(ch => 'aıoueiöü'.includes(ch));
    const a = vowel && 'eiöü'.includes(vowel) ? 'e' : 'a';
    const d = 'fstkçşhp'.includes(lower.slice(-1)) ? 't' : 'd';
    return `${lower}${d}${a}`;
}

/** "Salonda, avluda" + "ya da terasta." (en çok üç bölüm); tek bölümde null. */
export function regionPhrase(names: string[]): [string, string] | null {
    if (names.length < 2) return null;
    const locs = names.slice(0, 3).map(locative);
    const head = locs.slice(0, -1).join(', ');
    return [head.charAt(0).toLocaleUpperCase('tr-TR') + head.slice(1), `ya da ${locs[locs.length - 1]}.`];
}

/** Masaların toplam kişi sayısı; yalnız her masanın kapasitesi girildiyse (yoksa null, uydurulmaz). */
export function seatCount(tables: PublicTable[]): number | null {
    if (tables.length === 0 || !tables.every(t => t.capacity && t.capacity > 0)) return null;
    return tables.reduce((sum, t) => sum + (t.capacity ?? 0), 0);
}

/** Galerideki bir fotoğrafın düzenleyicideki hedefi: galeri karesi, hikâye fotoğrafı ya da kapak. */
export function photoTarget(site: PublicSite, src: string): { target: string; label: string } {
    const c = site.site;
    const i = c.galleryImageUrls.indexOf(src);
    if (i >= 0) return { target: `gallery:${i}`, label: `Mekân fotoğrafı ${i + 1}` };
    if (src === c.aboutImageUrl) return { target: 'photo:about', label: 'Hikâye fotoğrafı' };
    return { target: 'photo:cover', label: 'Kapak fotoğrafı' };
}
