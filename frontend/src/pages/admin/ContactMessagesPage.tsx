import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Check, MessageSquareText, Trash2 } from 'lucide-react';
import { contactMessageService } from '@/features/contactMessages/api/contactMessageService';
import { ContactMessageType, contactMessageTypeLabel, type ContactMessage } from '@/features/contactMessages/types';
import { PageError } from '@/components/ui/page-state';
import { getApiErrorMessage } from '@/lib/apiError';
import { cn } from '@/lib/utils';

// "Şikayet ve Öneriler": restoran sitesinin İletişim formundan gelen mesajlar. En yenisi önce; okunmamışlar vurgulu.
// Okundu işaretleme ve silme yazma isteği olduğu için yan menüdeki sayaç (DATA_CHANGED_EVENT) kendiliğinden güncellenir.

const typeBadge: Record<ContactMessageType, string> = {
    [ContactMessageType.Oneri]: 'bg-rb-green-bg text-rb-green',
    [ContactMessageType.Sikayet]: 'bg-rb-red-bg text-rb-red',
    [ContactMessageType.Diger]: 'bg-muted text-muted-foreground',
};

function formatDate(iso: string): string {
    return new Date(iso).toLocaleString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

type Filter = 'all' | 'unread';

export default function ContactMessagesPage() {
    const [filter, setFilter] = useState<Filter>('all');
    const [items, setItems] = useState<ContactMessage[] | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [busyId, setBusyId] = useState<string | null>(null);

    const load = useCallback(() => {
        contactMessageService.getAll(filter === 'unread')
            .then(data => { setItems(data); setLoadError(null); })
            .catch(err => setLoadError(getApiErrorMessage(err, 'Mesajlar yüklenemedi.')));
    }, [filter]);

    useEffect(() => { load(); }, [load]);

    const retry = () => {
        setLoadError(null);
        setItems(null);
        load();
    };

    const markRead = async (item: ContactMessage) => {
        setBusyId(item.id);
        try {
            await contactMessageService.markRead(item.id);
            setItems(prev => filter === 'unread'
                ? prev?.filter(i => i.id !== item.id) ?? prev
                : prev?.map(i => (i.id === item.id ? { ...i, isRead: true } : i)) ?? prev);
        } catch (err) {
            toast.error(getApiErrorMessage(err, 'Mesaj okundu olarak işaretlenemedi.'));
        } finally {
            setBusyId(null);
        }
    };

    const remove = async (item: ContactMessage) => {
        if (!window.confirm(`${item.name} kişisinin mesajı silinsin mi? Bu işlem geri alınamaz.`)) return;
        setBusyId(item.id);
        try {
            await contactMessageService.remove(item.id);
            setItems(prev => prev?.filter(i => i.id !== item.id) ?? prev);
            toast.success('Mesaj silindi.');
        } catch (err) {
            toast.error(getApiErrorMessage(err, 'Mesaj silinemedi.'));
        } finally {
            setBusyId(null);
        }
    };

    const unreadCount = items?.filter(i => !i.isRead).length ?? 0;

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-serif font-bold text-foreground">Şikayet ve Öneriler</h1>
                    <p className="mt-0.5 text-sm text-muted-foreground">Restoran sitenizin İletişim sayfasındaki formdan gelen mesajlar.</p>
                </div>
                <div role="group" aria-label="Mesaj filtresi" className="flex rounded-[10px] border border-border bg-card p-1">
                    {([['all', 'Tümü'], ['unread', 'Okunmamış']] as const).map(([key, label]) => (
                        <button
                            key={key}
                            type="button"
                            aria-pressed={filter === key}
                            onClick={() => { if (filter !== key) { setItems(null); setLoadError(null); setFilter(key); } }}
                            className={cn(
                                'h-9 rounded-lg px-3.5 text-sm font-semibold transition-colors',
                                filter === key ? 'bg-rb-gold text-rb-gold-foreground' : 'text-muted-foreground hover:text-foreground',
                            )}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {loadError ? (
                <PageError message={loadError} onRetry={retry} />
            ) : items === null ? (
                <div className="h-40 animate-pulse rounded-2xl bg-muted" aria-busy="true" />
            ) : items.length === 0 ? (
                <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border bg-card px-6 py-12 text-center">
                    <MessageSquareText className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
                    <p className="text-sm font-semibold text-foreground">{filter === 'unread' ? 'Okunmamış mesaj yok.' : 'Henüz mesaj yok.'}</p>
                    <p className="text-sm text-muted-foreground">Ziyaretçiler sitenizin İletişim sayfasından öneri ve şikâyet bırakabilir.</p>
                </div>
            ) : (
                <>
                    {filter === 'all' && unreadCount > 0 && (
                        <p className="text-sm text-muted-foreground">{unreadCount} okunmamış mesaj</p>
                    )}
                    <ul className="flex flex-col gap-3">
                        {items.map(item => (
                            <li
                                key={item.id}
                                className={cn(
                                    'rounded-2xl border bg-card p-4 md:p-5',
                                    item.isRead ? 'border-border' : 'border-rb-gold/60 shadow-sm',
                                )}
                            >
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                                    <span className={cn('inline-flex h-6 items-center rounded-full px-2.5 text-xs font-semibold', typeBadge[item.type])}>
                                        {contactMessageTypeLabel(item.type)}
                                    </span>
                                    {!item.isRead && (
                                        <span className="inline-flex h-6 items-center gap-1.5 rounded-full bg-rb-gold/15 px-2.5 text-xs font-semibold text-rb-gold">
                                            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-rb-gold" />Yeni
                                        </span>
                                    )}
                                    <time dateTime={item.createdAt} className="text-xs text-muted-foreground">{formatDate(item.createdAt)}</time>
                                </div>
                                <p className="mt-2.5 text-sm font-semibold text-foreground">
                                    {item.name}
                                    {item.contact && <span className="font-normal text-muted-foreground"> · <span className="break-all">{item.contact}</span></span>}
                                </p>
                                <p className="mt-1.5 whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground">{item.message}</p>
                                <div className="mt-3 flex flex-wrap justify-end gap-2">
                                    {!item.isRead && (
                                        <button
                                            type="button"
                                            onClick={() => markRead(item)}
                                            disabled={busyId === item.id}
                                            className="flex h-10 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-semibold text-foreground hover:border-rb-gold disabled:opacity-50"
                                        >
                                            <Check className="h-4 w-4" aria-hidden="true" />Okundu
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => remove(item)}
                                        disabled={busyId === item.id}
                                        aria-label={`${item.name} kişisinin mesajını sil`}
                                        className="flex h-10 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-semibold text-muted-foreground hover:text-destructive disabled:opacity-50"
                                    >
                                        <Trash2 className="h-4 w-4" aria-hidden="true" />Sil
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </>
            )}
        </div>
    );
}
