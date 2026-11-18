import type { ReactNode } from 'react';
import { toast } from 'sonner';
import { createSoundToggle, type Tone } from './soundToggle';

// Personel ekranlarının ortak canlı bildirimi: QR sipariş, garson çağrısı, hesap isteği, hazır ürün, gecikme,
// rezervasyon ve iletişim mesajı aynı yoldan geçer:
//   - normalden büyük, solda renkli şeritli toast (index.css: .staff-alert); iş gerektirenler kapatılana ya da
//     işleme alınana kadar kalır,
//   - kısa ses (aç/kapa tercihi cihazda saklanır; tarayıcı sesi ilk dokunuşa kadar kilitli tutabilir),
//   - sekme başlığında açık bildirim sayısı: "(2) Masalar · …".
// Paket sipariş uyarısı kendi şeridini kullanır (OnlineOrderAlerts), başlık sayısına setStaffAlertCount ile katılır.

export type StaffAlertTone = 'gold' | 'red' | 'green' | 'accent' | 'orange';

export interface StaffAlertOptions {
    /** Aynı id'li yeni bildirim eskisinin yerine geçer (ör. masa başına tek toast). */
    id: string;
    title: string;
    description?: ReactNode;
    tone?: StaffAlertTone;
    icon?: ReactNode;
    /** İş gerektiren bildirim: kapatılana ya da düğmeye basılana kadar ekranda kalır. */
    persistent?: boolean;
    /** Kalıcı değilse ekranda kalma süresi (varsayılan 20 sn). */
    durationMs?: number;
    action?: { label: string; onClick: () => void };
    /** Çalınacak ses; verilmezse sessiz. */
    sound?: () => void;
}

// ── Sekme başlığındaki sayı ──
const activeAlerts = new Set<string>();
const externalCounts = new Map<string, number>();
const COUNT_PREFIX = /^\(\d+\) /;

function renderTitle() {
    if (typeof document === 'undefined') return;
    let count = activeAlerts.size;
    for (const n of externalCounts.values()) count += n;
    const base = document.title.replace(COUNT_PREFIX, '');
    const next = count > 0 ? `(${count}) ${base}` : base;
    if (next !== document.title) document.title = next;
}

function untrack(id: string) {
    if (activeAlerts.delete(id)) renderTitle();
}

/** Başka bir kaynağın (ör. onay bekleyen paket siparişler) sayısını başlığa ekler; 0 kaldırır. */
export function setStaffAlertCount(source: string, count: number) {
    if (count > 0) externalCounts.set(source, count);
    else externalCounts.delete(source);
    renderTitle();
}

export function notifyStaff({
    id, title, description, tone = 'gold', icon, persistent = false, durationMs = 20_000, action, sound,
}: StaffAlertOptions) {
    sound?.();
    activeAlerts.add(id);
    renderTitle();
    toast(title, {
        id,
        description,
        icon,
        duration: persistent ? Infinity : durationMs,
        closeButton: true,
        className: `staff-alert staff-alert--${tone}`,
        action: action && {
            label: action.label,
            onClick: () => { untrack(id); action.onClick(); },
        },
        onDismiss: () => untrack(id),
        onAutoClose: () => untrack(id),
    });
}

/** İş başka yerden bitti (talep onaylandı, hesap ödendi…): bildirimi kapat. */
export function dismissStaffAlert(id: string) {
    toast.dismiss(id);
    untrack(id);
}

// ── Yönetici ve kasiyer ekranlarının uyarı sesi ──
// Garson ekranı kendi sesini (pages/waiter/waiterSound) kullanır. Tercih kaydedilmemişse açık başlar: eski
// davranışta bu uyarılar hep ses çalıyordu.
const CONFIRM_TONES: Tone[] = [
    { at: 0, frequency: 880, duration: 0.12 },
    { at: 0.16, frequency: 1174.7, duration: 0.16 },
];

export const staffAlertSound = createSoundToggle({
    storageKey: 'staff-alert-sound',
    toggleAttribute: 'data-staff-alert-sound-toggle',
    confirmTones: CONFIRM_TONES,
    defaultOn: true,
});

/** Türüne göre ayırt edilebilen kısa tonlar. */
export const STAFF_TONES = {
    // Yeni QR sipariş / rezervasyon talebi: yükselen üç ton.
    request: [
        { at: 0, frequency: 784, duration: 0.1 },
        { at: 0.12, frequency: 987.8, duration: 0.1 },
        { at: 0.24, frequency: 1174.7, duration: 0.22 },
    ],
    // Garson çağrısı: iki kez "di-dit".
    call: [
        { at: 0, frequency: 659.3, duration: 0.09 },
        { at: 0.1, frequency: 987.8, duration: 0.14 },
        { at: 0.38, frequency: 659.3, duration: 0.09 },
        { at: 0.48, frequency: 987.8, duration: 0.14 },
    ],
    // Hesap isteği, gecikme, bilgi: inen iki ton.
    info: [
        { at: 0, frequency: 880, duration: 0.15 },
        { at: 0.18, frequency: 660, duration: 0.16 },
    ],
} satisfies Record<string, Tone[]>;

export function playStaffTone(kind: keyof typeof STAFF_TONES) {
    staffAlertSound.play(STAFF_TONES[kind]);
}
