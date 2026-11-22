/**
 * Ödeme ekranının ortak iç bileşenleri (Hesabı Böl, İndirim / İkram, yöntem panelleri) iki ekranda çizilir:
 * admin: kasiyer/yönetici paneli (vurgu rengi rb-accent) · waiter: garson telefonu (koyu ana düğme, ≥44px dokunma).
 */
export type PaymentTone = 'admin' | 'waiter';

export const TONE: Record<PaymentTone, {
    /** Seçili sekme/segment. */
    on: string;
    /** Ana onay düğmesi (Uygula, Seçilenleri al). */
    primary: string;
    /** Segment, küçük giriş ve adım düğmelerinin yüksekliği. */
    control: string;
    step: string;
}> = {
    admin: { on: 'bg-rb-accent text-rb-accent-foreground', primary: 'bg-rb-accent text-rb-accent-foreground', control: 'h-10', step: 'h-9 w-9' },
    waiter: { on: 'bg-foreground text-background', primary: 'bg-foreground text-background', control: 'h-11', step: 'h-11 w-11' },
};
