// Mutfak ekranının yeni sipariş sesi. Aç/kapa, saklanan tercih ve dokunuşla kilit açma ortak yardımcıda
// (lib/soundToggle); burada yalnızca mutfağın tonu ve tercih anahtarı tanımlıdır.
import { createSoundToggle, type SoundState, type Tone } from '@/lib/soundToggle';

export type KitchenSoundState = SoundState;

// Yeni bilet sesi: iki kısa yükselen ton (~0,4 sn).
const CHIME: Tone[] = [
    { at: 0, frequency: 880, duration: 0.18 },
    { at: 0.16, frequency: 1318.5, duration: 0.26 },
];

export const kitchenSound = createSoundToggle({
    storageKey: 'kitchen-sound',
    toggleAttribute: 'data-kitchen-sound-toggle',
    confirmTones: CHIME,
});

export const getKitchenSoundState = kitchenSound.getState;
export const subscribeKitchenSound = kitchenSound.subscribe;
export const toggleKitchenSound = kitchenSound.toggle;

export function playKitchenChime(force = false) {
    kitchenSound.play(CHIME, force);
}
