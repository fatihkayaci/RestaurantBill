import type { PublicProduct } from '@/features/customerSite/types';
import type { SiteCart } from '@/features/delivery/useSiteCart';
import { cn } from '@/lib/utils';

// Tema 2 menü parçaları (ana sayfa "Bugünün menüsü", paket sipariş menüsü): + düğmesi ve arama kutusu. + düğmesi yalnız
// online sipariş açıkken çizilir (SiteCart.enabled).

export function PlusIcon({ size = 18 }: { size?: number }) {
    return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>;
}

/** Ürün satırının sağındaki + düğmesi: yalnız online sipariş açıkken ve ürün paket menüsündeyse. Sepetteyse adet yazar. */
export function AddButton({ product, cart, onAdded, variant = 'line' }: { product: PublicProduct; cart: SiteCart; onAdded: (name: string) => void; variant?: 'line' | 'card' | 'accent' }) {
    if (!cart.enabled) return null;
    const delivery = cart.productFor(product.id);
    if (!delivery || delivery.isOutOfStock || product.isOutOfStock) return <span aria-hidden="true" className="w-11 shrink-0" />;
    const qty = cart.lines.filter(l => l.kind === 'product' && l.productId === product.id).reduce((s, l) => s + l.quantity, 0);
    return (
        <button type="button" onClick={() => { cart.addProduct(product.id); onAdded(product.name); }}
            aria-label={qty > 0 ? `${product.name} sepete bir tane daha ekle (sepette ${qty})` : `${product.name} sepete ekle`}
            className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-full border text-[var(--site-text)] transition-colors',
                variant === 'card' && 'h-[46px] w-[46px] border-transparent',
                variant === 'accent' && 'h-12 w-12 border-transparent',
                qty > 0 ? 'border-[var(--site-text)] bg-[var(--site-text)] text-[var(--site-bg)]'
                    : variant === 'accent' ? 'bg-[var(--site-accent)] text-[var(--site-on-accent)] hover:opacity-90'
                    : variant === 'card' ? 'bg-[var(--site-card)] hover:border-[var(--site-text)]' : 'border-[var(--site-border-strong)] hover:border-[var(--site-text)]')}>
            {qty > 0 ? <span className="text-sm font-extrabold tabular-nums">{qty}</span> : <PlusIcon />}
        </button>
    );
}

/** Menüde arama kutusu (Tema 2: ince çizgili hap). */
export function MenuSearch({ value, onChange, className }: { value: string; onChange: (v: string) => void; className?: string }) {
    return (
        <label className={cn('flex h-12 w-full items-center gap-2.5 rounded-full border border-[var(--site-border-mid)] bg-[var(--site-card)] px-[18px] focus-within:border-[var(--site-text)] sm:w-[340px]', className)}>
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--site-muted)" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
            <span className="sr-only">Menüde ara</span>
            <input type="search" value={value} onChange={e => onChange(e.target.value)} placeholder="Menüde ara…"
                className="min-w-0 flex-1 border-0 bg-transparent text-[15px] text-[var(--site-text)] outline-none placeholder:text-[var(--site-muted)]" />
        </label>
    );
}
