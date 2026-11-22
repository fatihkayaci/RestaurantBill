import { useSyncExternalStore } from 'react';
import { getTenantSlug } from '@/lib/tenant';
import { loadTableCart } from '@/pages/public/qrMenu/qrCartStore';

// Bu sekmede masadaki QR okutuldu mu? Masa sayfası (TableOrderPage) açılınca masa sekmenin oturum deposuna yazılır.
// Müşteri aynı sekmede sitenin başka sayfasına (ana sayfa, /menu) geçerse site onu "masada" bilir: paket siparişin
// sepeti, teslimat ücreti, mahalle ve en az sepet tutarı hiç gösterilmez (useSiteCart / useOrderSession kapanır);
// sepet simgesi ve üstteki şerit masanın sepetine/menüsüne döner. Oturum deposu sekme kapanınca silinir; yeni sekmede
// (evden paket sipariş) site normal davranır. Telefonlar sekmeyi günlerce açık tutabildiği için masa bilgisi ayrıca:
// QR sayfası son açıldıktan 2 saat sonra, masanın hesabı ödenince ya da müşteri şeritteki × ile kapatınca düşer.
// Site, şerit görünürken masanın hesabını bir kez sorar: açık hesap yoksa (müşteri kalkıp gitmiş) bilgi silinir.

const TTL_MS = 2 * 60 * 60 * 1000;
/** QR'ı yeni okutan, henüz sipariş vermemiş müşteriyi hemen düşürmemek için: bu süreden kısa ziyaretler korunur. */
export const VISIT_GRACE_MS = 20 * 60 * 1000;

export interface TableVisit {
    tableId: string;
    tableName: string;
    branchId: string;
    savedAt: number;
}

const storageKey = () => `rb:qr-visit:${getTenantSlug() ?? 'dev'}`;

const listeners = new Set<() => void>();
let cachedRaw: string | null | undefined;
let cachedVisit: TableVisit | null = null;

function read(): TableVisit | null {
    let raw: string | null = null;
    try { raw = sessionStorage.getItem(storageKey()); } catch { /* özel pencere */ }
    if (raw === cachedRaw) return cachedVisit;
    cachedRaw = raw;
    try {
        const visit = raw ? JSON.parse(raw) as TableVisit : null;
        cachedVisit = visit && typeof visit.tableId === 'string' && typeof visit.branchId === 'string' ? visit : null;
    } catch {
        cachedVisit = null;
    }
    return cachedVisit;
}

/** Bu sekmenin masası; yoksa ya da süresi geçtiyse null. */
export function activeTableVisit(now = Date.now()): TableVisit | null {
    const visit = read();
    return visit && now - visit.savedAt <= TTL_MS ? visit : null;
}

export function rememberTableVisit(visit: Omit<TableVisit, 'savedAt'>) {
    try {
        sessionStorage.setItem(storageKey(), JSON.stringify({ ...visit, savedAt: Date.now() } satisfies TableVisit));
    } catch { /* yalnız bu sayfada */ }
    listeners.forEach(l => l());
}

/** Masa ziyareti bitti (hesap ödendi, müşteri kapattı ya da masada açık hesap kalmadı): site normal davranır. */
export function forgetTableVisit() {
    try { sessionStorage.removeItem(storageKey()); } catch { /* yalnız bu sayfada */ }
    listeners.forEach(l => l());
}

const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
};

/** Sitedeki bileşenler için: bu sekmenin masası (yoksa null). */
export function useTableVisit(): TableVisit | null {
    return useSyncExternalStore(subscribe, () => activeTableVisit(), () => null);
}

/** Masanın sepetinin adresi ve sepetteki ürün sayısı (telefonda saklanan masa sepeti). */
export function tableCartPath(visit: TableVisit): string {
    return `/masa/${encodeURIComponent(visit.tableId)}?sekme=sepet`;
}

export function tableMenuPath(visit: TableVisit): string {
    return `/masa/${encodeURIComponent(visit.tableId)}`;
}

export function tableCartCount(visit: TableVisit): number {
    return loadTableCart(visit.tableId, visit.branchId)?.lines.reduce((sum, l) => sum + l.quantity, 0) ?? 0;
}
