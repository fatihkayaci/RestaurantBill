import { ROOT_DOMAIN } from './tenant';

// Personelin giriş adresi ve QR kodu tek yerden üretilir (Restoran sayfası, Marka ayarları, Hızlı Erişim).
// Alan adının kökü müşteri sitesi; personel /login yolundan girer.
export function staffLoginUrl(slug: string): string {
    return `https://${slug}.${ROOT_DOMAIN}/login`;
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
