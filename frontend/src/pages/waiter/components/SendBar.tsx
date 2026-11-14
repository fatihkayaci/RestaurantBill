import { Loader2 } from 'lucide-react';
import { formatPrice } from '@/lib/format';

interface Props {
    count: number;
    noteCount: number;
    total: number;
    sending: boolean;
    /** Mobil klavyenin kapattığı yükseklik; çubuk klavyenin üstünde kalsın diye. */
    keyboardInset: number;
    onSend: () => void;
}

// Ürün ekleme ekranının alt çubuğu: "Mutfağa gönder (N) · ₺toplam".
export default function SendBar({ count, noteCount, total, sending, keyboardInset, onSend }: Props) {
    return (
        <div
            className="shrink-0 border-t border-border bg-card px-4 pt-3 pb-[max(14px,env(safe-area-inset-bottom))]"
            style={keyboardInset > 0 ? { marginBottom: keyboardInset } : undefined}
        >
            {count === 0 ? (
                <div className="flex h-14 items-center justify-center rounded-2xl bg-muted text-base font-semibold text-rb-text-sub">Ürün seçin</div>
            ) : (
                <button
                    type="button"
                    onClick={onSend}
                    disabled={sending}
                    aria-busy={sending}
                    className="flex h-16 w-full items-center justify-between gap-3 rounded-2xl bg-foreground px-5 text-background disabled:opacity-70"
                >
                    {sending ? (
                        <span className="flex items-center gap-2 text-[17px] font-bold">
                            <Loader2 className="size-5 animate-spin" aria-hidden="true" />
                            Gönderiliyor…
                        </span>
                    ) : (
                        <span className="flex flex-col items-start">
                            <span className="text-[17px] font-bold">Mutfağa gönder ({count})</span>
                            {noteCount > 0 && <span className="text-[13px] opacity-75">{noteCount} notlu satır</span>}
                        </span>
                    )}
                    <span className="text-xl font-bold">₺{formatPrice(total)}</span>
                </button>
            )}
        </div>
    );
}
