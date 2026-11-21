import { AlertTriangle, Loader2, RotateCw, X } from 'lucide-react';
import { formatPrice } from '@/lib/format';

interface Props {
    count: number;
    noteCount: number;
    total: number;
    sending: boolean;
    /** Son gönderim başarısızsa sunucunun mesajı; doluyken çubuğun üstünde kırmızı uyarı ve "Tekrar gönder" çıkar. */
    error?: string | null;
    /** Mobil klavyenin kapattığı yükseklik; çubuk klavyenin üstünde kalsın diye. */
    keyboardInset: number;
    onSend: () => void;
    onDismissError?: () => void;
}

// Ürün ekleme ekranının alt çubuğu: "Mutfağa gönder (N) · ₺toplam". Gönderim başarısızsa üstünde, gözden kaçmasın diye
// kalıcı (kendiliğinden kaybolmayan) bir uyarı durur: sipariş mutfağa gitmedi, sepet duruyor, "Tekrar gönder".
export default function SendBar({ count, noteCount, total, sending, error, keyboardInset, onSend, onDismissError }: Props) {
    const showError = Boolean(error) && count > 0;
    return (
        <div
            className="shrink-0 border-t border-border bg-card px-4 pt-3 pb-[max(14px,env(safe-area-inset-bottom))]"
            style={keyboardInset > 0 ? { marginBottom: keyboardInset } : undefined}
        >
            {showError && (
                <div role="alert" className="mb-3 rounded-2xl border-2 border-destructive bg-rb-red-bg p-3.5">
                    <div className="flex items-start gap-2.5">
                        <AlertTriangle className="mt-0.5 size-6 shrink-0 text-destructive" aria-hidden="true" />
                        <div className="min-w-0 flex-1">
                            <p className="text-base font-bold text-destructive">Sipariş mutfağa gitmedi</p>
                            <p className="mt-0.5 text-sm text-foreground">{error}</p>
                            <p className="mt-1 text-[13px] text-rb-text-sub">Sepetteki ürünler duruyor, hiçbiri gönderilmedi.</p>
                        </div>
                        {onDismissError && (
                            <button
                                type="button"
                                onClick={onDismissError}
                                aria-label="Uyarıyı kapat"
                                className="-mt-1 -mr-1 flex size-10 shrink-0 items-center justify-center rounded-full text-rb-text-sub hover:bg-muted"
                            >
                                <X className="size-5" aria-hidden="true" />
                            </button>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={onSend}
                        disabled={sending}
                        className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-destructive text-base font-bold text-white disabled:opacity-70"
                    >
                        {sending
                            ? <Loader2 className="size-5 animate-spin" aria-hidden="true" />
                            : <RotateCw className="size-5" aria-hidden="true" />}
                        Tekrar gönder
                    </button>
                </div>
            )}
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
                    <span className="text-xl font-bold">{formatPrice(total)} ₺</span>
                </button>
            )}
        </div>
    );
}
