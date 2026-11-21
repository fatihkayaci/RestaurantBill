import { useState } from 'react';
import { Clock, Phone, Search } from 'lucide-react';
import { foldSearch, listNames, zoneFacts } from '@/features/delivery/deliveryText';
import type { DeliveryZone } from '@/features/delivery/types';
import { formatPrice } from '@/lib/format';
import { cn } from '@/lib/utils';
import { serif } from '../site/siteParts';
import { headingFont, telHref } from '../site/siteTheme';
import Sheet from './Sheet';

// Paket siparişin ortak parçaları: mahalle seçici, en az tutar çubuğu ve toplamlar. Sipariş sayfası (/siparis) ve Sophra
// menü sayfasının sepeti/ödeme adımı kullanır; renkler --site-* değişkenlerinden.

export /** Mahalle seçimi: arama + karşılaştırmalı liste. Eşleşme yoksa "henüz gelemiyoruz" ve sonraki adımlar. */
function ZonePicker({ zones, selectedId, phone, onSelect, onBrowse, onClose }: {
    zones: DeliveryZone[]; selectedId: string | null; phone: string;
    onSelect: (id: string) => void; onBrowse: () => void; onClose: () => void;
}) {
    const [query, setQuery] = useState('');
    const q = foldSearch(query);
    const matches = q ? zones.filter(z => foldSearch(z.name).includes(q)) : zones;
    // Yazım hatası için: ilk üç harfi tutan mahalleler önerilir.
    const head = q.slice(0, 3);
    const similar = q && matches.length === 0 ? zones.filter(z => foldSearch(z.name).startsWith(head) || q.startsWith(foldSearch(z.name).slice(0, 3))) : [];
    const typed = query.trim();

    return (
        <Sheet title="Nereye gelsin?" onClose={onClose}>
            <div className="pb-3 pt-1">
                <label htmlFor="mahalle-ara" className="sr-only">Mahallenizi arayın</label>
                <div className="relative">
                    <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--site-sub)]" aria-hidden="true" />
                    <input id="mahalle-ara" value={query} onChange={e => setQuery(e.target.value)} placeholder="Mahallenizi arayın"
                        autoComplete="off" enterKeyHint="search"
                        className="h-12 w-full rounded-xl border border-[var(--site-border-strong)] bg-[var(--site-bg)] pl-10 pr-3 text-[15px] focus:outline-none focus:ring-2 focus:ring-[var(--site-accent)]" />
                </div>
            </div>

            {matches.length > 0 ? (
                <ul className="flex flex-col gap-2 pb-4">
                    {matches.map(z => {
                        const facts = zoneFacts(z);
                        const on = z.id === selectedId;
                        return (
                            <li key={z.id}>
                                <button type="button" onClick={() => onSelect(z.id)} aria-pressed={on}
                                    className={cn('flex min-h-16 w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-colors hover:border-[var(--site-accent)]',
                                        on ? 'border-[var(--site-accent)] shadow-[0_0_0_1px_var(--site-accent)]' : 'border-[var(--site-border)]')}>
                                    <span className="min-w-0 flex-1">
                                        <span className="block text-base font-semibold">{z.name}</span>
                                        <span className="block text-sm text-[var(--site-sub)]">En az {facts.minimum}</span>
                                    </span>
                                    <span className="shrink-0 text-right">
                                        <span className="block text-sm font-semibold tabular-nums">{facts.time}</span>
                                        <span className="block text-sm tabular-nums text-[var(--site-sub)]">{facts.fee}</span>
                                    </span>
                                </button>
                            </li>
                        );
                    })}
                </ul>
            ) : (
                <div role="status" className="flex flex-col gap-3 pb-5">
                    <p className={cn(serif, 'm-0 text-[30px] leading-[1.05]')}>{typed}&apos;ya henüz gelemiyoruz.</p>
                    {similar.length > 0 && (
                        <div>
                            <p className="text-sm text-[var(--site-sub)]">Bunu mu demek istediniz?</p>
                            <div className="mt-2 flex flex-wrap gap-2">
                                {similar.map(z => (
                                    <button key={z.id} type="button" onClick={() => onSelect(z.id)}
                                        className="flex h-11 items-center rounded-full border border-[var(--site-border-strong)] px-4 text-sm font-semibold hover:border-[var(--site-accent)]">
                                        {z.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                    <p className="text-[15px] leading-relaxed text-[var(--site-sub)]">
                        {listNames(zones.map(z => z.name))} mahallelerine teslimat yapıyoruz. Yakınsanız telefonla sorun, belki yolumuzun üstündesiniz.
                    </p>
                    {phone && (
                        <a href={telHref(phone)}
                            className="flex h-12 items-center justify-center gap-2 rounded-full bg-[var(--site-paper)] text-[15px] font-semibold text-[var(--site-on-paper)] no-underline">
                            <Phone className="h-4 w-4" aria-hidden="true" />{phone}
                        </a>
                    )}
                    <button type="button" onClick={onBrowse}
                        className="flex h-12 items-center justify-center rounded-full border border-[var(--site-border-strong)] text-[15px] font-semibold">
                        Menüye yine de göz at
                    </button>
                </div>
            )}
        </Sheet>
    );
}

export /** En az sepet tutarı çubuğu: "En az sepete 80 ₺ kaldı · 220 / 300 ₺". */
function MinimumProgress({ subtotal, target, left, className }: { subtotal: number; target: number; left: number; className?: string }) {
    const percent = Math.min(100, Math.max(0, (subtotal / target) * 100));
    return (
        <div className={className}>
            <div className="flex items-baseline justify-between gap-3 text-[13px]">
                <span className="font-semibold">En az sepete {formatPrice(left)} ₺ kaldı</span>
                <span className="tabular-nums text-[var(--site-sub)]">{formatPrice(subtotal)} / {formatPrice(target)} ₺</span>
            </div>
            <div role="progressbar" aria-label="En az sepet tutarı" aria-valuemin={0} aria-valuemax={target} aria-valuenow={Math.round(subtotal)}
                className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[var(--site-raised)]">
                <div className="h-full rounded-full bg-[var(--site-accent)] transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${percent}%` }} />
            </div>
        </div>
    );
}

export function CartTotals({ subtotal, fee, total, zoneName, pickup = false, minimum, hint, hintIsError, canCheckout, onCheckout, closedLabel }: {
    subtotal: number; fee: number; total: number; zoneName: string | null;
    /** Gel al: teslimat satırında "Gel al · ücretsiz". */
    pickup?: boolean;
    minimum: { subtotal: number; target: number; left: number } | null;
    hint: string | null; hintIsError: boolean; canCheckout: boolean; onCheckout: () => void;
    /** Restoran sipariş almıyorken soluk düğme yerine net durum ("Yarın 09:00'da açılıyor"). */
    closedLabel?: string | null;
}) {
    return (
        <>
            <dl className="mb-3 space-y-1 text-[15px]">
                <div className="flex justify-between"><dt className="text-[var(--site-sub)]">Ara toplam</dt><dd className="tabular-nums">{formatPrice(subtotal)} ₺</dd></div>
                {pickup
                    ? <div className="flex justify-between"><dt className="text-[var(--site-sub)]">Gel al</dt><dd>Teslimat ücreti yok</dd></div>
                    : <div className="flex justify-between"><dt className="text-[var(--site-sub)]">Teslimat{zoneName ? ` (${zoneName})` : ''}</dt><dd className="tabular-nums">{zoneName ? `${formatPrice(fee)} ₺` : '—'}</dd></div>}
                <div className="flex items-baseline justify-between border-t border-dashed border-[var(--site-border-strong)] pt-3"><dt className="font-bold">Toplam</dt><dd className={cn(headingFont, 'text-[36px] font-semibold! leading-none tabular-nums')}>{formatPrice(total)} ₺</dd></div>
            </dl>
            {minimum && <MinimumProgress {...minimum} className="mb-3" />}
            {hint && !closedLabel && (
                <p className={cn('mb-3 rounded-xl px-3 py-2.5 text-sm font-medium',
                    hintIsError ? 'border border-[var(--site-error-line)] bg-[var(--site-error-bg)] text-[var(--site-error)]' : 'bg-[var(--site-raised)]')}>
                    {hint}
                </p>
            )}
            {closedLabel ? (
                <div role="status" className="flex min-h-[60px] w-full items-center justify-center gap-2 rounded-full border border-dashed border-[var(--site-border-strong)] px-4 text-center text-[15px] font-semibold">
                    <Clock className="h-4 w-4 shrink-0 text-[var(--site-sub)]" aria-hidden="true" />{closedLabel}
                </div>
            ) : (
                <button type="button" disabled={!canCheckout} onClick={onCheckout}
                    className="flex h-[60px] w-full items-center justify-center rounded-full bg-[var(--site-accent)] text-base font-extrabold text-[var(--site-on-accent)] transition-opacity hover:opacity-90 disabled:opacity-50">
                    Devam et
                </button>
            )}
        </>
    );
}
