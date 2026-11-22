import { foldText } from '../../siteParts';

// Kategori, değer ve olanak simgesinin seçimi: addaki kelimeden (Türkçe harfler sadeleşmiş, küçük harf). Yalnız süs (veri
// uydurmaz); eşleşmeyen ad genel tabak (kategori) ya da mühür (değer) simgesini alır. Çizimler SophraIcons.tsx'te.

export type IconKind = 'flame' | 'skewer' | 'bowl' | 'soup' | 'cake' | 'cup' | 'leaf' | 'fish' | 'egg' | 'pizza' | 'bread' | 'cloche'
    | 'chef' | 'people' | 'hand' | 'heart' | 'clock' | 'seal' | 'car' | 'wifi' | 'music' | 'card' | 'child' | 'paw' | 'access' | 'sun' | 'gift';

// İlk eşleşen kazanır.
const CATEGORY_WORDS: [string[], IconKind][] = [
    [['kebap', 'kebab', 'sis', 'adana', 'urfa', 'beyti', 'doner'], 'skewer'],
    [['izgara', 'ocak', 'mangal', 'kofte', 'et ', 'etler', 'steak', 'pirzola', 'kasap'], 'flame'],
    [['corba', 'soup'], 'soup'],
    [['tatli', 'dessert', 'pasta', 'baklava', 'kunefe', 'sutlac', 'dondurma', 'kek'], 'cake'],
    [['icecek', 'mesrubat', 'kahve', 'cay', 'drink', 'su ', 'ayran', 'kokteyl', 'sarap', 'bira', 'smoothie', 'limonata'], 'cup'],
    [['salata', 'vegan', 'vejetaryen', 'yesil', 'bowl'], 'leaf'],
    [['balik', 'deniz', 'fish', 'levrek', 'cupra', 'karides'], 'fish'],
    [['kahvalti', 'yumurta', 'omlet', 'menemen', 'breakfast'], 'egg'],
    [['pizza', 'pide', 'lahmacun'], 'pizza'],
    [['ekmek', 'borek', 'firin', 'tost', 'sandvic', 'burger', 'hamburger', 'durum', 'wrap'], 'bread'],
    [['meze', 'baslangic', 'aperatif', 'ara sicak', 'sicak', 'zeytinyagli', 'atistirmalik'], 'bowl'],
];

export function categoryIcon(name: string): IconKind {
    const n = ` ${foldText(name)} `;
    return CATEGORY_WORDS.find(([words]) => words.some(w => n.includes(w)))?.[1] ?? 'cloche';
}

const VALUE_WORDS: [string[], IconKind][] = [
    [['taze', 'dogal', 'organik', 'yerel', 'malzeme', 'bahce', 'tarla'], 'leaf'],
    [['usta', 'sef', 'mutfak', 'asci'], 'chef'],
    [['ates', 'ocak', 'kor', 'odun', 'komur', 'mangal', 'firin'], 'flame'],
    [['aile', 'misafir', 'dost', 'sofra', 'birlikte', 'ortam', 'atmosfer'], 'people'],
    [['el ', 'elle', 'el yapimi', 'ev yapimi', 'emek'], 'hand'],
    [['hizli', 'zaman', 'dakika', 'servis', 'teslimat'], 'clock'],
    [['sevgi', 'ozen', 'gonul', 'kalp'], 'heart'],
    [['gelenek', 'tarif', 'nesil', 'yil', 'kusak'], 'seal'],
];

export function valueIcon(title: string): IconKind {
    const n = ` ${foldText(title)} `;
    return VALUE_WORDS.find(([words]) => words.some(w => n.includes(w)))?.[1] ?? 'seal';
}

/** Mekân olanağının simgesi (SITE_AMENITIES anahtarı). */
export const AMENITY_ICON: Record<string, IconKind> = {
    avlu: 'leaf', teras: 'sun', otopark: 'car', vale: 'car', cocuk: 'child', wifi: 'wifi', engelli: 'access', evcil: 'paw',
    'canli-muzik': 'music', vejetaryen: 'leaf', 'kartla-odeme': 'card', 'bebek-sandalyesi': 'child', 'aile-salonu': 'people',
    'sigara-alani': 'sun', 'ozel-gun': 'gift',
};
