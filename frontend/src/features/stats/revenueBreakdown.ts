import type { DashboardStats } from './types';

export interface RevenuePart {
    key: 'cash' | 'card' | 'qr' | 'iban' | 'other';
    label: string;
    amount: number;
    /** Çubuk ve lejant rengi (Tailwind bg- sınıfı). */
    bar: string;
    /** Lejant noktası rengi (Tailwind text- sınıfı). */
    dot: string;
}

// Bugünün cirosu ödeme yöntemlerine göre. qr/iban alanları gelmezse ikisinin toplamı "Diğer" olarak gösterilir.
export function revenueParts(r: DashboardStats['revenue']): RevenuePart[] {
    const parts: RevenuePart[] = [
        { key: 'cash', label: 'Nakit', amount: r.cash, bar: 'bg-rb-amber', dot: 'text-rb-amber' },
        { key: 'card', label: 'Kart', amount: r.card, bar: 'bg-rb-accent', dot: 'text-rb-accent' },
    ];
    if (typeof r.qr === 'number' || typeof r.iban === 'number') {
        const qr = r.qr ?? 0;
        const iban = r.iban ?? 0;
        parts.push({ key: 'qr', label: 'QR', amount: qr, bar: 'bg-rb-purple', dot: 'text-rb-purple' });
        parts.push({ key: 'iban', label: 'IBAN', amount: iban, bar: 'bg-rb-green', dot: 'text-rb-green' });
        // Toplamla uyuşmayan bir artık kalırsa kaybolmasın.
        const rest = Math.round((r.other - qr - iban) * 100) / 100;
        if (rest > 0) parts.push({ key: 'other', label: 'Diğer', amount: rest, bar: 'bg-rb-text-muted', dot: 'text-rb-text-muted' });
    } else {
        parts.push({ key: 'other', label: 'Diğer (QR / IBAN)', amount: r.other, bar: 'bg-rb-purple', dot: 'text-rb-purple' });
    }
    return parts;
}
