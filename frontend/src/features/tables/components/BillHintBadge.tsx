import { billHintText } from '@/features/customerSite/tableActions';
import { cn } from '@/lib/utils';

interface Props {
    paymentHint?: number | null;
    splitCount?: number | null;
    className?: string;
}

/**
 * Müşterinin hesap isteğindeki tercihi: "Kart · 3 kişiye bölünecek". Tercih yoksa hiçbir şey çizmez. Kasiyer kartı,
 * ödeme paneli, garson masa ekranı ve (sonra) admin masalar sayfası kullanır.
 */
export default function BillHintBadge({ paymentHint, splitCount, className }: Props) {
    const text = billHintText(paymentHint, splitCount);
    if (!text) return null;
    return (
        <span className={cn('inline-flex max-w-full items-center rounded-full bg-rb-accent-bg px-2 py-0.5 text-xs font-bold text-rb-accent', className)}>
            <span className="truncate">{text}</span>
        </span>
    );
}
