// Garson ekranının "ürün hazır" sesi. Mutfağın yeni bilet sesinden ayrılsın diye üç kısa, inen tonlu bir "ding-ding-dong".
// Aç/kapa, saklanan tercih ve dokunuşla kilit açma ortak yardımcıda (lib/soundToggle).
import { createSoundToggle, type Tone } from '@/lib/soundToggle';

const READY_TONES: Tone[] = [
    { at: 0, frequency: 1046.5, duration: 0.12 },
    { at: 0.14, frequency: 1046.5, duration: 0.12 },
    { at: 0.28, frequency: 784, duration: 0.3 },
];

export const waiterSound = createSoundToggle({
    storageKey: 'waiter-sound',
    toggleAttribute: 'data-waiter-sound-toggle',
    confirmTones: READY_TONES,
});

export function playItemReadySound() {
    waiterSound.play(READY_TONES);
}

// Müşteri QR'dan garson çağırdı: "ürün hazır"dan ayrılsın diye iki kez çalan, yükselen kısa bir "di-dit".
const CALL_TONES: Tone[] = [
    { at: 0, frequency: 659.3, duration: 0.09 },
    { at: 0.1, frequency: 987.8, duration: 0.14 },
    { at: 0.38, frequency: 659.3, duration: 0.09 },
    { at: 0.48, frequency: 987.8, duration: 0.14 },
];

export function playWaiterCallSound() {
    waiterSound.play(CALL_TONES);
}
