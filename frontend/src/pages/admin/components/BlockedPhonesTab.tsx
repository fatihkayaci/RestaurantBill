import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';
import { onlineOrderingSettingsService } from '@/features/delivery/api/deliveryService';
import { formatPhoneInput, isCompletePhone } from '@/features/delivery/deliveryCart';
import type { BlockedPhone } from '@/features/delivery/types';
import { getApiErrorMessage } from '@/lib/apiError';
import { inputClass } from '@/lib/formStyles';
import { cn } from '@/lib/utils';

/** "+905321234567" → "0532 123 45 67" */
function displayPhone(phone: string): string {
    return formatPhoneInput(phone);
}

// "Engelli numaralar": bu numaralar şubeden online sipariş veremez (müşteriye "restoranı arayın" denir). Panodaki
// siparişten de engellenebilir.
export default function BlockedPhonesTab() {
    const [items, setItems] = useState<BlockedPhone[] | null>(null);
    const [phone, setPhone] = useState('');
    const [reason, setReason] = useState('');
    const [saving, setSaving] = useState(false);
    const [removingId, setRemovingId] = useState<string | null>(null);

    const load = useCallback(() => {
        onlineOrderingSettingsService.getBlockedPhones()
            .then(setItems)
            .catch(err => { toast.error(getApiErrorMessage(err, 'Liste yüklenemedi.')); setItems([]); });
    }, []);

    useEffect(() => { load(); }, [load]);

    const add = async () => {
        if (!isCompletePhone(phone)) {
            toast.error('Geçerli bir telefon numarası girin (0xxx xxx xx xx).');
            return;
        }
        setSaving(true);
        try {
            const created = await onlineOrderingSettingsService.blockPhone(phone, reason.trim());
            setItems(prev => [created, ...(prev ?? []).filter(i => i.id !== created.id)]);
            setPhone('');
            setReason('');
            toast.success('Numara engellendi.');
        } catch (err) {
            toast.error(getApiErrorMessage(err, 'Numara engellenemedi.'));
        } finally {
            setSaving(false);
        }
    };

    const remove = async (item: BlockedPhone) => {
        if (!window.confirm(`${displayPhone(item.phone)} numarasının engeli kaldırılsın mı?`)) return;
        setRemovingId(item.id);
        try {
            await onlineOrderingSettingsService.unblockPhone(item.id);
            setItems(prev => prev?.filter(i => i.id !== item.id) ?? prev);
            toast.success('Engel kaldırıldı.');
        } catch (err) {
            toast.error(getApiErrorMessage(err, 'Engel kaldırılamadı.'));
        } finally {
            setRemovingId(null);
        }
    };

    return (
        <div className="max-w-3xl space-y-4">
            <form
                onSubmit={e => { e.preventDefault(); add(); }}
                className="flex flex-wrap items-end gap-2 rounded-2xl border border-border bg-card p-4"
            >
                <label className="flex min-w-44 flex-1 flex-col gap-1 text-xs font-semibold text-muted-foreground">
                    Telefon
                    <input
                        type="tel"
                        inputMode="tel"
                        autoComplete="off"
                        value={phone}
                        onChange={e => setPhone(formatPhoneInput(e.target.value))}
                        placeholder="05xx xxx xx xx"
                        className={cn(inputClass, 'py-2 tabular-nums')}
                    />
                </label>
                <label className="flex min-w-56 flex-[2] flex-col gap-1 text-xs font-semibold text-muted-foreground">
                    Neden (isteğe bağlı, yalnızca personel görür)
                    <input value={reason} maxLength={200} onChange={e => setReason(e.target.value)} placeholder="ör. Sahte sipariş" className={cn(inputClass, 'py-2')} />
                </label>
                <button type="submit" disabled={saving}
                    className="h-10 rounded-[10px] bg-rb-gold px-4 text-sm font-semibold text-rb-gold-foreground disabled:opacity-50">
                    {saving ? 'Engelleniyor…' : 'Engelle'}
                </button>
            </form>

            {items === null ? (
                <div className="h-32 animate-pulse rounded-2xl bg-muted" aria-busy="true" />
            ) : items.length === 0 ? (
                <p className="text-sm text-muted-foreground">Engelli numara yok.</p>
            ) : (
                <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
                    {items.map(item => (
                        <li key={item.id} className="flex items-center gap-3 px-4 py-3">
                            <div className="min-w-0 flex-1">
                                <p className="font-semibold tabular-nums text-foreground">{displayPhone(item.phone)}</p>
                                <p className="truncate text-xs text-muted-foreground">
                                    {[item.reason, item.blockedByName, new Date(item.createdAt).toLocaleDateString('tr-TR')].filter(Boolean).join(' · ')}
                                </p>
                            </div>
                            <button type="button" onClick={() => remove(item)} disabled={removingId === item.id}
                                aria-label={`${displayPhone(item.phone)} engelini kaldır`}
                                className="flex h-10 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-semibold text-muted-foreground hover:text-destructive disabled:opacity-50">
                                <Trash2 className="h-4 w-4" aria-hidden="true" />Kaldır
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
