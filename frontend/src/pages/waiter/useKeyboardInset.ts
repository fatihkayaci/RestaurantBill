import { useSyncExternalStore } from 'react';

// Mobil klavyenin kapattığı alt yükseklik (px). iOS Safari klavye açılınca sayfayı küçültmez;
// visualViewport küçülür. Alttaki çubuğa bu kadar boşluk verilince klavyenin üstünde kalır.
// Android Chrome sayfayı zaten küçülttüğü için orada değer 0 kalır.

// Adres çubuğunun açılıp kapanması gibi küçük oynamaları klavye sanmamak için.
const MIN_KEYBOARD_PX = 80;

function subscribe(callback: () => void) {
    const viewport = window.visualViewport;
    if (!viewport) return () => {};
    viewport.addEventListener('resize', callback);
    viewport.addEventListener('scroll', callback);
    return () => {
        viewport.removeEventListener('resize', callback);
        viewport.removeEventListener('scroll', callback);
    };
}

function getInset(): number {
    const viewport = window.visualViewport;
    if (!viewport) return 0;
    const covered = Math.round(window.innerHeight - viewport.height - viewport.offsetTop);
    return covered >= MIN_KEYBOARD_PX ? covered : 0;
}

export function useKeyboardInset(): number {
    return useSyncExternalStore(subscribe, getInset, () => 0);
}
