import { AlertCircle, RotateCw } from 'lucide-react';
import { cn } from '@/lib/utils';

// Ortak yükleniyor / hata durumları. Boş durum için ayrı bileşen: ui/empty-state.

export function PageLoading({ label = 'Yükleniyor...', className }: { label?: string; className?: string }) {
    return (
        <div role="status" aria-live="polite" className={cn('flex h-64 items-center justify-center text-sm text-muted-foreground', className)}>
            {label}
        </div>
    );
}

interface PageErrorProps {
    title?: string;
    message?: string;
    onRetry?: () => void;
    className?: string;
}

// Yükleme hatasını "veri yok" boş durumundan ayırır: başlık, açıklama ve Tekrar dene.
export function PageError({
    title = 'Veriler yüklenemedi',
    message = 'Bağlantınızı kontrol edip tekrar deneyin.',
    onRetry,
    className,
}: PageErrorProps) {
    return (
        <div role="alert" className={cn('flex flex-col items-center justify-center gap-3 rounded-xl border border-rb-red/30 bg-rb-red-bg px-6 py-10 text-center', className)}>
            <AlertCircle className="h-6 w-6 text-rb-red" aria-hidden="true" />
            <div>
                <p className="text-sm font-semibold text-foreground">{title}</p>
                <p className="mt-1 text-sm text-rb-text-sub">{message}</p>
            </div>
            {onRetry && (
                <button
                    type="button"
                    onClick={onRetry}
                    className="mt-1 inline-flex h-11 items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
                >
                    <RotateCw className="h-4 w-4" aria-hidden="true" />
                    Tekrar dene
                </button>
            )}
        </div>
    );
}
