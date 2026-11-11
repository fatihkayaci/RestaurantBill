import { ROOT_DOMAIN } from './tenant';

// Personelin giriş adresi ve QR kodu tek yerden üretilir (Restoran sayfası, Marka ayarları, Hızlı Erişim).
// Müşteri sitesi kökü kullanmaya başlayınca yalnızca buradaki yolu değiştirmek yeter.
export function staffLoginUrl(slug: string): string {
    return `https://${slug}.${ROOT_DOMAIN}`;
}

export function staffLoginHost(slug: string): string {
    return staffLoginUrl(slug).replace(/^https?:\/\//, '');
}

// Bir QR <canvas>'ını PNG olarak indirir.
export function downloadCanvasPng(canvas: HTMLCanvasElement | null, fileName: string) {
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = fileName;
    link.href = canvas.toDataURL('image/png');
    link.click();
}
