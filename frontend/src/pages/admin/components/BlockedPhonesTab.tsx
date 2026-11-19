import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Search, ShieldBan } from 'lucide-react';
import {
    AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
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

/** "12 Kas" */
function shortDate(iso: string): string {
    return new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
}

/** "12 Kas 19:40" */
function shortDateTime(iso: string): string {
    return `${shortDate(iso)} ${new Date(iso).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`;
}

const digitsOf = (value: string) => formatPhoneInput(value).replace(/\D/g, '');

// "Engelli numaralar": bu numaralar şubeden online sipariş veremez (müşteriye "restoranı arayın" denir). Panodaki
// siparişten de engellenebilir. Üstteki alan hem listeyi süzer hem yeni numarayı engeller; her kartta engelin hangi
// siparişten konduğu ve engelden sonra kaç denemenin geri çevrildiği görünür.
export default function BlockedPhonesTab() {
    const [items, setItems] = useState<BlockedPhone[] | null>(null);
    const [phone, setPhone] = useState('');
    const [reason, setReason] = useState('');
    const [saving, setSaving] = useState(false);
    const [removingId, setRemovingId] = useState<string | null>(null);
    const [unblockTarget, setUnblockTarget] = useState<BlockedPhone | null>(null);

    const load = useCallback(() => {
        onlineOrderingSettingsService.getBlockedPhones()
            .then(setItems)
            .catch(err => { toast.error(getApiErrorMessage(err, 'Liste yüklenemedi.')); setItems([]); });
    }, []);

    useEffect(() => { load(); }, [load]);

    const complete = isCompletePhone(phone);
    const query = phone.replace(/\D/g, '');
    const filtered = useMemo(
        () => (items ?? []).filter(i => !query || digitsOf(i.phone).includes(query)),
        [items, query],
    );
    const alreadyBlocked = complete && (items ?? []).some(i => digitsOf(i.phone) === query);

    const add = async () => {
        if (!complete) {
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

    const remove = async () => {
        const item = unblockTarget;
        if (!item) return;
        setUnblockTarget(null);
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
        <div className="space-y-3">
            <form onSubmit={e => { e.preventDefault(); void add(); }} className="flex flex-col gap-2">
                <div className="flex gap-2">
                    <label className="relative flex-1">
                        <span className="sr-only">Numara ara veya ekle</span>
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                        <input
                            type="tel"
                            inputMode="tel"
                            autoComplete="off"
                            value={phone}
                            onChange={e => setPhone(formatPhoneInput(e.target.value))}
                            placeholder="Numara ara veya ekle"
                            className={cn(inputClass, 'h-11 rounded-xl bg-card pl-9 tabular-nums dark:bg-card')}
                        />
                    </label>
                    <button type="submit" disabled={saving || !complete || alreadyBlocked}
                        className="h-11 shrink-0 rounded-xl bg-rb-gold px-4 text-sm font-semibold text-rb-gold-foreground disabled:opacity-50">
                        {saving ? 'Engelleniyor…' : 'Engelle'}
                    </button>
                </div>
                {complete && !alreadyBlocked && (
                    <input
                        value={reason}
                        maxLength={200}
                        onChange={e => setReason(e.target.value)}
                        placeholder="Neden (isteğe bağlı, yalnızca personel görür) · ör. Sahte sipariş"
                        aria-label="Engel nedeni"
                        className={cn(inputClass, 'h-11 rounded-xl bg-card dark:bg-card')}
                    />
                )}
                {alreadyBlocked && <p className="px-1 text-xs text-muted-foreground">Bu numara zaten engelli.</p>}
            </form>

            {items === null ? (
                <div className="h-32 animate-pulse rounded-2xl bg-muted" aria-busy="true" />
            ) : items.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">Engelli numara yok.</p>
            ) : filtered.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                    Bu numarayla eşleşen engel yok.{complete ? ' “Engelle” ile ekleyebilirsiniz.' : ''}
                </p>
            ) : (
                <ul className="flex flex-col gap-2.5">
                    {filtered.map(item => (
                        <li key={item.id} className="flex flex-col gap-1.5 rounded-2xl border border-border bg-card p-4">
                            <div className="flex items-center justify-between gap-3">
                                <p className="font-semibold tabular-nums text-foreground">{displayPhone(item.phone)}</p>
                                <span
                                    className={cn(
                                        'inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums',
                                        item.blockedAttemptCount > 0 ? 'bg-rb-red-bg text-rb-red' : 'bg-muted text-muted-foreground',
                                    )}
                                    title={item.lastBlockedAttemptAt ? `Son deneme: ${new Date(item.lastBlockedAttemptAt).toLocaleString('tr-TR')}` : 'Henüz engellenen deneme yok'}
                                >
                                    {item.blockedAttemptCount > 0 && <ShieldBan className="h-3 w-3" aria-hidden="true" />}
                                    {item.blockedAttemptCount > 0 ? `${item.blockedAttemptCount} deneme engellendi` : 'deneme yok'}
                                </span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                {item.reason && <>{item.reason} · </>}
                                {item.sourceDeliveryOrderNumber ? (
                                    item.sourceDeliveryOrderId ? (
                                        <><Link to={`/admin/online-orders?siparis=${encodeURIComponent(item.sourceDeliveryOrderId)}`}
                                            className="text-rb-accent underline-offset-2 hover:underline">#{item.sourceDeliveryOrderNumber}</Link> siparişinden</>
                                    ) : <>#{item.sourceDeliveryOrderNumber} siparişinden</>
                                ) : 'elle eklendi'}
                                {' · '}
                                {[item.blockedByName, shortDate(item.createdAt)].filter(Boolean).join(', ')}
                            </p>
                            <div className="flex items-center justify-between gap-3">
                                <span className="text-xs text-muted-foreground">
                                    {item.lastBlockedAttemptAt ? `Son deneme ${shortDateTime(item.lastBlockedAttemptAt)}` : ''}
                                </span>
                                <button type="button" onClick={() => setUnblockTarget(item)} disabled={removingId === item.id}
                                    aria-label={`${displayPhone(item.phone)} engelini kaldır`}
                                    className="min-h-10 rounded-lg px-2 text-xs font-semibold text-muted-foreground hover:text-rb-red disabled:opacity-50">
                                    {removingId === item.id ? 'Kaldırılıyor…' : 'Engeli kaldır'}
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            <AlertDialog open={unblockTarget !== null} onOpenChange={open => !open && setUnblockTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Engeli kaldır</AlertDialogTitle>
                        <AlertDialogDescription>
                            {unblockTarget && `${displayPhone(unblockTarget.phone)} numarasının engeli kaldırılsın mı? Bu numara yeniden online sipariş verebilir.`}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Vazgeç</AlertDialogCancel>
                        <Button onClick={remove}>Engeli kaldır</Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
