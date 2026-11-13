// Mutfak ekranının yeni sipariş sesi. Ses dosyası yok: WebAudio ile kısa iki tonlu bir "çın" üretilir.
// Tarayıcılar kullanıcı dokunmadan ses çalmaya izin vermez; başlıktaki "Sesi aç" düğmesi bu dokunuşu sağlar.
// Tercih cihazda saklanır (mutfak tableti çoğu zaman tek kullanıcılıdır). Sayfa yenilenince tercih açık kalır ama
// ses ilk dokunuşa kadar kilitlidir ("locked"); ekrana herhangi bir dokunuş kilidi açar.

export type KitchenSoundState = 'off' | 'on' | 'locked';

const STORAGE_KEY = 'kitchen-sound';

let enabled = readPreference();
let ctx: AudioContext | null = null;
const listeners = new Set<() => void>();

function readPreference(): boolean {
    try {
        return localStorage.getItem(STORAGE_KEY) === 'on';
    } catch {
        return false;
    }
}

function writePreference(value: boolean) {
    try {
        localStorage.setItem(STORAGE_KEY, value ? 'on' : 'off');
    } catch {
        // Özel pencere / engellenmiş depolama: tercih yalnızca bu oturumda geçerli olur.
    }
}

function emit() {
    listeners.forEach(l => l());
}

export function getKitchenSoundState(): KitchenSoundState {
    if (!enabled) return 'off';
    return ctx?.state === 'running' ? 'on' : 'locked';
}

export function subscribeKitchenSound(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

// Yalnızca kullanıcı dokunuşu içinden çağrılmalı (tarayıcının ses kilidini açar).
function unlock() {
    try {
        if (!ctx) {
            const Ctor = window.AudioContext
                ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
            if (!Ctor) return;
            ctx = new Ctor();
            ctx.onstatechange = emit;
        }
        if (ctx.state === 'suspended') void ctx.resume().then(emit, emit);
    } catch {
        // Ses desteklenmiyor; ekran sessiz çalışmaya devam eder.
    }
    emit();
}

// Tercih açıkken sayfa yenilendiyse ilk dokunuşta kilidi aç.
if (typeof document !== 'undefined') {
    const onGesture = (e: Event) => {
        // Ses düğmesinin kendisi toggleKitchenSound ile karar verir; burada kilidi açıp düğmeyi "kapat"a çevirmeyelim.
        if ((e.target as Element | null)?.closest?.('[data-kitchen-sound-toggle]')) return;
        if (enabled && ctx?.state !== 'running') unlock();
    };
    document.addEventListener('pointerdown', onGesture, { passive: true });
    document.addEventListener('keydown', onGesture);
}

export function toggleKitchenSound() {
    if (enabled && ctx?.state === 'running') {
        enabled = false;
        writePreference(false);
        emit();
        return;
    }
    enabled = true;
    writePreference(true);
    unlock();
    playKitchenChime(true);
}

function tone(at: number, frequency: number, duration: number) {
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(0.35, at + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start(at);
    osc.stop(at + duration + 0.02);
}

// Yeni bilet sesi: iki kısa yükselen ton (~0,4 sn).
export function playKitchenChime(force = false) {
    if (!enabled || !ctx) return;
    if (ctx.state !== 'running' && !force) return;
    try {
        const t = ctx.currentTime + 0.02;
        tone(t, 880, 0.18);
        tone(t + 0.16, 1318.5, 0.26);
    } catch {
        // yok say
    }
}
