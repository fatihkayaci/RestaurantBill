import { Coffee, Image as ImageIcon, Minus, NotebookPen, Plus } from 'lucide-react';
import type { Product } from '@/features/products/types';
import { formatPrice } from '@/lib/format';
import { cn } from '@/lib/utils';
import { lineNote, type CartLine } from '../orderCart';
import LineNotesPanel, { type LineNoteActions } from './LineNotesPanel';

interface Props extends LineNoteActions {
    product: Product;
    /** Bu ürünün sepet satırları (boşsa ürün sepette değil). */
    lines: CartLine[];
    quickNotes: string[];
    notesOpen: boolean;
    onToggleNotes: () => void;
    onAdd: () => void;
    onRemove: () => void;
}

/** "Acısız" veya birden çok satırda "1× Acılı / 1× Acısız". */
function noteSummary(lines: CartLine[]): string {
    const noted = lines.filter(l => lineNote(l));
    if (noted.length === 0) return '';
    if (lines.length === 1) return lineNote(lines[0]);
    return lines.map(l => `${l.quantity}× ${lineNote(l) || 'notsuz'}`).join(' / ');
}

// Ürün ekleme listesinin bir satırı.
// Satırın tamamı (görsel dahil) tek bir "ekle" düğmesidir; acele anında nereye dokunulursa dokunulsun
// bir adet eklenir. Ayrı düğmeler yalnızca ürün sepetteyken çıkar: adın altında "Not" çipi ve sağda −/+.
// İkinci satırın yüksekliği sabit (h-8) olduğu için çip çıkınca satırlar kaymaz.
// "Tükendi" işaretli ürün soluk görünür ve eklenemez; sepete önceden girdiyse yalnızca azaltılabilir.
export default function ProductRow({ product, lines, quickNotes, notesOpen, onToggleNotes, onAdd, onRemove, ...noteActions }: Props) {
    const qty = lines.reduce((sum, l) => sum + l.quantity, 0);
    const inCart = qty > 0;
    const summary = noteSummary(lines);
    const soldOut = !!product.isOutOfStock;

    return (
        <li className={cn('flex flex-col gap-2 rounded-2xl bg-card p-2.5', inCart ? 'border-[1.5px] border-rb-gold' : 'border border-border', soldOut && !inCart && 'opacity-60')}>
            {/* "relative" olan düğmeler (Not, −, +) satırı kaplayan ekle düğmesinin üstünde durur. */}
            <div className="relative flex items-center gap-3">
                <button
                    type="button"
                    onClick={onAdd}
                    disabled={soldOut}
                    aria-label={soldOut ? `${product.name} tükendi` : inCart ? `${product.name} bir tane daha ekle` : `${product.name} ekle`}
                    className="absolute inset-0 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring active:bg-foreground/5 disabled:cursor-not-allowed disabled:active:bg-transparent"
                />
                <ProductImage product={product} />
                <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-base font-semibold text-foreground">{product.name}</span>
                    <div className="flex h-8 min-w-0 items-center gap-2 text-sm text-rb-text-sub">
                        <span className="shrink-0 font-bold text-foreground">{formatPrice(product.price)} ₺</span>
                        {inCart ? (
                            <button
                                type="button"
                                onClick={onToggleNotes}
                                aria-expanded={notesOpen}
                                aria-label={summary ? `${product.name} notu: ${summary}` : `${product.name} için not ekle`}
                                className={cn(
                                    // Görünen boy 32px; before ile dokunma alanı 44px'e uzatılır.
                                    'relative inline-flex h-8 min-w-0 items-center gap-1 rounded-full px-2.5 text-[13px] font-bold',
                                    'before:absolute before:inset-x-0 before:-inset-y-1.5',
                                    summary || notesOpen ? 'bg-rb-gold text-rb-gold-foreground' : 'border border-rb-gold/50 bg-rb-gold-bg text-rb-gold',
                                )}
                            >
                                <NotebookPen className="size-4 shrink-0" aria-hidden="true" />
                                <span className="truncate">{summary || 'Not'}</span>
                            </button>
                        ) : (
                            product.prepMinutes != null && <span className="truncate">· ~{product.prepMinutes} dk</span>
                        )}
                    </div>
                </div>
                {inCart ? (
                    <div className="relative flex shrink-0 items-center rounded-full bg-muted">
                        <button
                            type="button"
                            onClick={onRemove}
                            aria-label={`${product.name} azalt`}
                            className="flex size-12 items-center justify-center rounded-full bg-card text-foreground"
                        >
                            <Minus className="size-5" strokeWidth={2.4} aria-hidden="true" />
                        </button>
                        <span aria-live="polite" className="w-7 text-center text-base font-bold tabular-nums">{qty}</span>
                        <button
                            type="button"
                            onClick={onAdd}
                            disabled={soldOut}
                            aria-label={soldOut ? `${product.name} tükendi` : `${product.name} ekle`}
                            className="flex size-12 items-center justify-center rounded-full bg-foreground text-background disabled:opacity-40"
                        >
                            <Plus className="size-5" strokeWidth={2.4} aria-hidden="true" />
                        </button>
                    </div>
                ) : soldOut ? (
                    <span className="shrink-0 rounded-full bg-rb-red-bg px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-rb-red">Tükendi</span>
                ) : (
                    // Yalnızca görsel ipucu; dokunuş alttaki ekle düğmesine gider.
                    <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-rb-gold text-rb-gold-foreground" aria-hidden="true">
                        <Plus className="size-5.5" strokeWidth={2.4} />
                    </span>
                )}
            </div>
            {inCart && notesOpen && (
                <LineNotesPanel productName={product.name} lines={lines} quickNotes={quickNotes} {...noteActions} />
            )}
        </li>
    );
}

function ProductImage({ product }: { product: Product }) {
    if (product.imageUrl) {
        return <img src={product.imageUrl} alt="" loading="lazy" className="size-13 shrink-0 rounded-[14px] object-cover" />;
    }
    return (
        <span className="flex size-13 shrink-0 items-center justify-center rounded-[14px] bg-rb-gold-bg text-rb-gold" aria-hidden="true">
            {/içecek|kahve|çay/i.test(product.categoryName ?? '') ? <Coffee className="size-6" /> : <ImageIcon className="size-6" />}
        </span>
    );
}
