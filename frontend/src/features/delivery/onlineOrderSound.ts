// Yeni online paket siparişinin sesi: mutfağın ve garsonun seslerinden ayrılsın diye üç kez yükselen kısa tonlar.
// Aç/kapa, saklanan tercih ve dokunuşla kilit açma ortak yardımcıda (lib/soundToggle).
import { createSoundToggle, type Tone } from '@/lib/soundToggle';

const NEW_ORDER_TONES: Tone[] = [
    { at: 0, frequency: 784, duration: 0.12 },
    { at: 0.13, frequency: 1046.5, duration: 0.12 },
    { at: 0.26, frequency: 1318.5, duration: 0.22 },
    { at: 0.7, frequency: 784, duration: 0.12 },
    { at: 0.83, frequency: 1046.5, duration: 0.12 },
    { at: 0.96, frequency: 1318.5, duration: 0.22 },
];

export const onlineOrderSound = createSoundToggle({
    storageKey: 'online-order-sound',
    toggleAttribute: 'data-online-order-sound-toggle',
    confirmTones: NEW_ORDER_TONES.slice(0, 3),
});

export function playNewOnlineOrderSound() {
    onlineOrderSound.play(NEW_ORDER_TONES);
}
