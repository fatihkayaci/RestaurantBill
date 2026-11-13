// Canlı uyarılar (gecikme, hesap isteği) için kısa iki tonlu ses.
let audioContext: AudioContext | null = null;

// Kısa iki tonlu uyarı. Tarayıcı, sayfayla hiç etkileşim olmadıysa sesi engelleyebilir; o zaman yalnızca toast görünür.
export function playAlertSound() {
    try {
        audioContext ??= new AudioContext();
        const ctx = audioContext;
        if (ctx.state === 'suspended') ctx.resume().catch(() => {});
        [0, 0.18].forEach((offset, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = i === 0 ? 880 : 660;
            const start = ctx.currentTime + offset;
            gain.gain.setValueAtTime(0.0001, start);
            gain.gain.exponentialRampToValueAtTime(0.2, start + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.16);
            osc.connect(gain).connect(ctx.destination);
            osc.start(start);
            osc.stop(start + 0.17);
        });
    } catch {
        // Ses desteklenmiyorsa sessiz geç.
    }
}
