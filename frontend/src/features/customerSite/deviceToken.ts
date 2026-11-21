// Masa QR sayfasının telefona özgü rastgele anahtarı. Sunucu masayı ilk sipariş talebini gönderen telefona bağlar;
// sonra yalnız o telefon sipariş verir ve masanın hesabını görür. Anahtar kimseyi tanımlamaz: yalnızca "aynı telefon mu"
// sorusunun cevabıdır. Sunucu özetini saklar. Özel pencerede localStorage yoksa anahtar bu sekmede bellekte kalır.
const STORAGE_KEY = 'rb:device-token';

let memoryToken: string | null = null;

function randomToken(): string {
    try {
        if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    } catch { /* güvenli olmayan bağlam: aşağıdaki yedek */ }
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

/** Sunucunun kabul ettiği biçim: 16–128 karakter, harf, rakam ve tire. */
const isValid = (token: string | null): token is string => !!token && /^[A-Za-z0-9-]{16,128}$/.test(token);

export function getDeviceToken(): string {
    if (isValid(memoryToken)) return memoryToken;
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (isValid(saved)) {
            memoryToken = saved;
            return saved;
        }
        const fresh = randomToken();
        localStorage.setItem(STORAGE_KEY, fresh);
        memoryToken = fresh;
        return fresh;
    } catch {
        memoryToken = randomToken();
        return memoryToken;
    }
}

/** İsteklere eklenen başlık (adreste ve loglarda görünmesin diye başlıkta). */
export const deviceTokenHeader = () => ({ 'X-Device-Token': getDeviceToken() });
