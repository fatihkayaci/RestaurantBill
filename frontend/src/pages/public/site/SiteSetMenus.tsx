import { Fragment } from 'react';
import type { OnlineSetMenu, OnlineSetMenuSlot } from '@/features/delivery/types';
import { cn } from '@/lib/utils';
import { formatSitePrice } from './siteTheme';

// Hazır menünün içerik özeti (Tema 2 hazır menü kartları, SiteMenuBoard.tsx).

/** Menünün içerik özeti: "Adana Kebap · İçecek: Ayran / Kola (+10 ₺)". Bölüm yoksa çizilmez. */
export function SlotsSummary({ menu, className }: { menu: OnlineSetMenu; className?: string }) {
    if (menu.slots.length === 0) return null;
    return (
        <p className={cn('m-0', className)}>
            <span className="sr-only">İçindekiler: </span>
            {menu.slots.map((slot, i) => (
                <Fragment key={slot.id}>
                    {i > 0 && <span aria-hidden="true" className="px-1.5 text-[var(--site-accent-text)]">·</span>}
                    <SlotSummary slot={slot} />
                </Fragment>
            ))}
        </p>
    );
}

// Tek seçenekli bölüm sabit üründür (yalnız adı); çok seçenekliyse "İçecek: Ayran / Kola (+10 ₺)".
function SlotSummary({ slot }: { slot: OnlineSetMenuSlot }) {
    const choice = slot.options.length > 1;
    return (
        <span className="whitespace-normal">
            {choice && <span className="text-[var(--site-muted)]">{slot.name}: </span>}
            {slot.options.map((o, i) => (
                <Fragment key={o.productId}>
                    {i > 0 && <span className="text-[var(--site-muted)]"> / </span>}
                    <span className={cn(!o.isAvailable && 'text-[var(--site-muted)] line-through')} title={o.isAvailable ? undefined : 'Tükendi'}>
                        {o.productName}
                        {o.surcharge > 0 && <span className="whitespace-nowrap text-[var(--site-muted)]"> (+{formatSitePrice(o.surcharge)})</span>}
                    </span>
                </Fragment>
            ))}
        </span>
    );
}
