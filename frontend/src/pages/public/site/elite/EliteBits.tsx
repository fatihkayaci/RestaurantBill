import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { PublicProduct } from '@/features/customerSite/types';
import type { SiteCart } from '@/features/delivery/useSiteCart';
import { cn } from '@/lib/utils';
import { StockImageLabel } from '../../components/StockImageLabel';
import { EditableBlock } from '../siteEdit';
import { useSiteEdit } from '../siteEditContext';
import { elButton, elItalic, elLabel, elPattern, elSerif } from './eliteParts';

// Elit tasarımın küçük ortak parçaları: üst satır (iki yanında ince çizgi), tam genişlik kapak, boş sayfa ve + düğmesi.

/** Üst satır: küçük aralıklı büyük harf, solunda (ortalıysa iki yanında) ince çizgi. `dark`: koyu bantta altın. */
export function EliteKicker({ children, centered = false, dark = false, className }: {
    children: ReactNode; centered?: boolean; dark?: boolean; className?: string;
}) {
    const tone = dark ? 'text-[var(--site-accent-on-dark)]' : 'text-[var(--site-accent-text)]';
    const rule = cn('h-px w-8 shrink-0 sm:w-10', dark ? 'bg-[var(--site-accent-on-dark)]' : 'bg-[var(--site-accent-text)]');
    return (
        <span className={cn('inline-flex max-w-full items-center gap-4', elLabel, tone, className)}>
            <span aria-hidden="true" className={rule} />
            <span className="min-w-0">{children}</span>
            {centered && <span aria-hidden="true" className={rule} />}
        </span>
    );
}

/**
 * Tam genişlik kapak: fotoğraf (yavaş yakınlaşma, koyu perde ve üst/alt geçiş) ya da fotoğraf yoksa ince altın desenli
 * koyu bant; ortada üst satır, dev serif başlık, italik alt başlık ve düğmeler. Üst menü kapağın üstünde saydam durur
 * (SitePage `overlayHeader`); kapak onun yüksekliği kadar boşluk bırakır. `image`: gösterilecek fotoğraf (sayfanın
 * kapağı ya da yedeği); `ownImage`: sayfanın kendi kapağı var mı (düzenleyicideki "seç" ipucu için).
 */
export function EliteHero({ label, title, titleId, lead, image, ownImage, imageTarget, imageLabel, emptyHint, tall = false, bottom, children }: {
    label?: ReactNode; title: ReactNode; titleId: string; lead?: ReactNode;
    image?: string | null; ownImage?: boolean; imageTarget: string; imageLabel: string; emptyHint: string;
    /** Ana sayfa: ekran yüksekliğinde (en çok 900 px). */
    tall?: boolean;
    /** Kapağın alt şeridi (ana sayfa: durum, Keşfet, konum). */
    bottom?: ReactNode;
    children?: ReactNode;
}) {
    const edit = useSiteEdit();
    return (
        <section aria-labelledby={titleId}
            className={cn('relative flex flex-col overflow-hidden bg-[var(--site-cover-bg)] text-[var(--site-on-cover)] [--site-accent-text:var(--site-cover-accent)]',
                tall ? 'min-h-[620px] md:h-[min(900px,100svh)] md:min-h-[680px]' : 'min-h-[480px] md:min-h-[560px]')}>
            <EditableBlock target={imageTarget} label={imageLabel} chip="Fotoğrafı değiştir" className="absolute inset-0">
                {image ? (
                    <>
                        <img src={image} alt="" className="rb-el-yavas absolute inset-0 h-full w-full object-cover" />
                        <span aria-hidden="true" className="absolute inset-0 bg-[color-mix(in_srgb,var(--site-cover-bg)_52%,transparent)]" />
                        <span aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(180deg,color-mix(in_srgb,var(--site-cover-bg)_75%,transparent)_0%,transparent_28%,transparent_58%,color-mix(in_srgb,var(--site-cover-bg)_85%,transparent)_100%)]" />
                        {image.includes('/shared/stock/') && <StockImageLabel className="bottom-auto right-3 top-24" />}
                    </>
                ) : (
                    <span aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
                        <span className={cn('absolute inset-0', elPattern)} />
                        <span className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,color-mix(in_srgb,var(--site-cover-bg)_92%,transparent)_75%)]" />
                        <span className="absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[color-mix(in_srgb,var(--site-accent-on-dark)_22%,transparent)]" />
                    </span>
                )}
                {edit && !ownImage && (
                    <span className="absolute right-4 top-4 whitespace-nowrap rounded-full border border-dashed border-[var(--site-border-strong)] bg-[var(--site-card)] px-4 py-2 font-[family-name:'DM_Sans',system-ui,sans-serif] text-[15px] font-semibold text-[var(--site-text)]">
                        {emptyHint}
                    </span>
                )}
            </EditableBlock>
            {/* Üst menünün yeri (düzenleyicide üst menü çizilmez). */}
            {!edit && <span aria-hidden="true" className="block h-[84px] shrink-0 lg:h-[108px]" />}
            <div className="rb-el-belir pointer-events-none relative z-[1] flex flex-1 flex-col items-center justify-center gap-5 px-4 pb-12 pt-6 text-center sm:px-8 md:gap-[22px] [&_[data-edit-target]]:pointer-events-auto [&_[data-edit-text]]:pointer-events-auto [&_a]:pointer-events-auto [&_button]:pointer-events-auto">
                {label && <EliteKicker centered dark>{label}</EliteKicker>}
                <h1 id={titleId} className={cn(elSerif, 'm-0 max-w-[1100px] break-words text-[52px] leading-[0.98] sm:text-[64px] md:text-[clamp(64px,7vw,112px)]', tall && 'md:text-[clamp(72px,8.6vw,144px)] md:leading-[0.95]')}>
                    {title}
                </h1>
                {lead}
                {children}
            </div>
            {bottom}
        </section>
    );
}

/** İçeriği girilmemiş sayfa: kısa açıklama ve ana sayfaya/menüye dönüş. */
export function EliteEmpty({ text }: { text: string }) {
    return (
        <section className="flex flex-col items-center gap-8 px-4 py-24 text-center md:py-[130px]">
            <p className={cn(elItalic, 'm-0 max-w-[680px] text-[34px] leading-[1.15] md:text-[44px]')}>{text}</p>
            <div className="flex flex-wrap justify-center gap-3">
                <Link to="/" className={elButton.line}>Ana sayfa</Link>
                <Link to="/menu" className={elButton.dark}>Menüyü gör</Link>
            </div>
        </section>
    );
}

/** Satırın sağındaki yuvarlak + düğmesi: yalnız online sipariş açıkken ve ürün paket menüsündeyse; sepetteyse adet. */
export function EliteAddButton({ product, cart, onAdded }: { product: PublicProduct; cart: SiteCart; onAdded: (name: string) => void }) {
    if (!cart.enabled) return null;
    const delivery = cart.productFor(product.id);
    if (!delivery || delivery.isOutOfStock || product.isOutOfStock) return <span aria-hidden="true" className="w-11 shrink-0" />;
    const qty = cart.lines.filter(l => l.kind === 'product' && l.productId === product.id).reduce((s, l) => s + l.quantity, 0);
    return (
        <EliteRoundButton qty={qty} label={qty > 0 ? `${product.name} sepete bir tane daha ekle (sepette ${qty})` : `${product.name} sepete ekle`}
            onClick={() => { cart.addProduct(product.id); onAdded(product.name); }} />
    );
}

export function EliteRoundButton({ qty, label, onClick }: { qty: number; label: string; onClick: () => void }) {
    return (
        <button type="button" onClick={onClick} aria-label={label}
            className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-full border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--site-text)]',
                qty > 0 ? 'border-[var(--site-paper)] bg-[var(--site-paper)] text-sm font-medium tabular-nums text-[var(--site-accent-on-dark)]'
                    : 'border-[var(--site-border-strong)] bg-transparent text-xl font-light text-[var(--site-text)] hover:border-[var(--site-text)]')}>
            {qty > 0 ? qty : <span aria-hidden="true">+</span>}
        </button>
    );
}

/** Ürün satırı: "Ad ······ fiyat", altında açıklama/süre ve (varsa) etiket. Menü sayfası ve ana sayfa. */
export function EliteDishLine({ name, price, meta, tag, out, size = 'md', action }: {
    name: string; price: ReactNode; meta?: string; tag?: string | null; out?: boolean; size?: 'md' | 'lg'; action?: ReactNode;
}) {
    return (
        <div className="flex min-w-0 items-center gap-4">
            <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="flex items-baseline gap-3.5">
                    <h3 className={cn(elSerif, 'm-0 min-w-0 break-words leading-[1.15]', size === 'lg' ? 'text-[24px] md:text-[28px]' : 'text-[22px] md:text-[25px]', out && 'text-[var(--site-muted)]')}>{name}</h3>
                    <span aria-hidden="true" className="min-w-6 flex-1 -translate-y-1.5 border-b border-dotted border-[color-mix(in_srgb,var(--site-text)_35%,transparent)]" />
                    <span className={cn(elSerif, 'shrink-0 whitespace-nowrap font-medium tabular-nums text-[var(--site-accent-text)]', size === 'lg' ? 'text-[22px] md:text-[26px]' : 'text-[21px] md:text-[23px]')}>{price}</span>
                </div>
                {(meta || tag) && (
                    <p className="m-0 text-[13px] leading-relaxed tracking-[0.04em] text-[var(--site-muted)]">
                        {meta}
                        {tag && <span className={cn(elItalic, 'text-[15px]', out ? 'text-[var(--site-muted)]' : 'text-[var(--site-accent-text)]')}>{meta ? ' · ' : ''}{tag}</span>}
                    </p>
                )}
            </div>
            {action}
        </div>
    );
}
