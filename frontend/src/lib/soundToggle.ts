// Rol ekranlarının (mutfak, garson) açılıp kapanabilen uyarı sesi. Ses dosyası yok: WebAudio ile kısa tonlar üretilir.
// Tarayıcılar kullanıcı dokunmadan ses çalmaya izin vermez; başlıktaki ses düğmesi bu dokunuşu sağlar.
// Tercih cihazda saklanır. Sayfa yenilenince tercih açık kalır ama ses ilk dokunuşa kadar kilitlidir ("locked");
// ekrana herhangi bir dokunuş kilidi açar.

export type SoundState = 'off' | 'on' | 'locked';

/** Bir ton: başlangıçtan kaç saniye sonra, hangi frekansta, ne kadar süre. */
export interface Tone {
    at: number;
    frequency: number;
    duration: number;
}

interface Options {
    /** localStorage anahtarı ('on' / 'off'). */
    storageKey: string;
    /** Ses düğmesine verilen data-* özniteliği; genel dokunuş dinleyicisi bu düğmeye karışmaz. */
    toggleAttribute: string;
    /** Ses açılırken çalan onay tonu (kullanıcı sesin çalıştığını duysun). */
    confirmTones: Tone[];
}

export interface SoundToggle {
    toggleAttribute: string;
    getState: () => SoundState;
    subscribe: (listener: () => void) => () => void;
    toggle: () => void;
    /** Tercih kapalıysa ya da ses kilitliyse (force olmadıkça) sessiz geçer. */
    play: (tones: Tone[], force?: boolean) => void;
}

export function createSoundToggle({ storageKey, toggleAttribute, confirmTones }: Options): SoundToggle {
    let enabled = readPreference();
    let ctx: AudioContext | null = null;
    const listeners = new Set<() => void>();

    function readPreference(): boolean {
        try {
            return localStorage.getItem(storageKey) === 'on';
        } catch {
            return false;
        }
    }

    function writePreference(value: boolean) {
        try {
            localStorage.setItem(storageKey, value ? 'on' : 'off');
        } catch {
            // Özel pencere / engellenmiş depolama: tercih yalnızca bu oturumda geçerli olur.
        }
    }

    function emit() {
        listeners.forEach(l => l());
    }

    function getState(): SoundState {
        if (!enabled) return 'off';
        return ctx?.state === 'running' ? 'on' : 'locked';
    }

    function subscribe(listener: () => void) {
        listeners.add(listener);
        return () => { listeners.delete(listener); };
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
            // Ses düğmesinin kendisi toggle ile karar verir; burada kilidi açıp düğmeyi "kapat"a çevirmeyelim.
            if ((e.target as Element | null)?.closest?.(`[${toggleAttribute}]`)) return;
            if (enabled && ctx?.state !== 'running') unlock();
        };
        document.addEventListener('pointerdown', onGesture, { passive: true });
        document.addEventListener('keydown', onGesture);
    }

    function tone(start: number, frequency: number, duration: number) {
        if (!ctx) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = frequency;
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(0.35, start + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
        osc.connect(gain).connect(ctx.destination);
        osc.start(start);
        osc.stop(start + duration + 0.02);
    }

    function play(tones: Tone[], force = false) {
        if (!enabled || !ctx) return;
        if (ctx.state !== 'running' && !force) return;
        try {
            const t = ctx.currentTime + 0.02;
            for (const x of tones) tone(t + x.at, x.frequency, x.duration);
        } catch {
            // yok say
        }
    }

    function toggle() {
        if (enabled && ctx?.state === 'running') {
            enabled = false;
            writePreference(false);
            emit();
            return;
        }
        enabled = true;
        writePreference(true);
        unlock();
        play(confirmTones, true);
    }

    return { toggleAttribute, getState, subscribe, toggle, play };
}
