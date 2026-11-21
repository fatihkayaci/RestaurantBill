import { useState } from 'react';
import { Lock, QrCode } from 'lucide-react';
import { toast } from 'sonner';
import { SwitchTrack } from '@/components/ui/switch';
import { getApiErrorMessage } from '@/lib/apiError';
import { cn } from '@/lib/utils';
import { tableService } from '../api/tableService';

interface Props {
    tableId: string;
    tableName: string;
    locked: boolean;
    /** Sunucu kaydettikten sonra yeni durum (kart rozeti ve liste için). */
    onChanged: (locked: boolean) => void;
    className?: string;
}

// "QR siparişi: Açık / Kilitli" anahtarı (admin Masalar ve garsonun masa ekranı). Kilitliyken masanın QR'ından sipariş
// gönderilemez; müşteri menüye bakar, garson çağırır, hesap ister ve hesabı görür. Yalnız yetkili kullanıcıya çizilir
// (Owner/Admin, "QR siparişini kilitleme" yetkili garson); sunucu da denetler.
export default function QrOrderingToggle({ tableId, tableName, locked, onChanged, className }: Props) {
    const [saving, setSaving] = useState(false);

    const toggle = async () => {
        if (saving) return;
        const next = !locked;
        setSaving(true);
        try {
            await tableService.setQrLock(tableId, next);
            onChanged(next);
            toast.success(next ? `${tableName}: QR siparişi kilitlendi.` : `${tableName}: QR siparişi açıldı.`);
        } catch (err) {
            toast.error(getApiErrorMessage(err, 'QR siparişi değiştirilemedi.'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <button
            type="button"
            role="switch"
            aria-checked={!locked}
            aria-label={`QR siparişi: ${locked ? 'Kilitli' : 'Açık'}`}
            onClick={() => void toggle()}
            disabled={saving}
            className={cn(
                'flex w-full items-center gap-3 rounded-2xl border px-3.5 py-2.5 text-left transition-colors disabled:opacity-60',
                locked ? 'border-rb-red/30 bg-rb-red-bg' : 'border-border bg-card hover:bg-muted/50',
                className
            )}
        >
            <span aria-hidden="true" className={cn('flex size-9 shrink-0 items-center justify-center rounded-full',
                locked ? 'bg-rb-red text-rb-red-foreground' : 'bg-muted text-foreground')}>
                {locked ? <Lock className="size-4.5" /> : <QrCode className="size-4.5" />}
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-[15px] font-bold text-foreground">
                    QR siparişi: <span className={locked ? 'text-rb-red' : 'text-rb-green'}>{locked ? 'Kilitli' : 'Açık'}</span>
                </span>
                <span className="text-[12px] leading-snug text-rb-text-sub">
                    {locked ? 'Müşteri menüye bakar, hesabı görür; QR ile sipariş gönderemez.' : 'Masadaki her telefon QR ile sipariş gönderebilir.'}
                </span>
            </span>
            <SwitchTrack checked={!locked} offClassName="bg-rb-red" />
        </button>
    );
}
