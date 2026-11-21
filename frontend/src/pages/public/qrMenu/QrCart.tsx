import { useEffect, useRef, useState } from 'react';
import { Armchair, ArrowLeft, Check, Info, Minus, Pencil, Plus, Send, ShoppingBag, Trash2, Wallet, X } from 'lucide-react';
import { ORDER_REQUEST_APPROVED, ORDER_REQUEST_REJECTED } from '@/features/customerSite/types';
import type { DeliveryCartLine } from '@/features/delivery/deliveryCart';
import { formatPrice } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { SentOrderRequest } from '../useTableOrderRequests';
import { tableLineKey } from './qrCartStore';
import { StatusChip } from './QrOrders';
import type { QrItem } from './qrModel';
import { QrImage } from './QrParts';
import type { TableAction } from './tableAction';
import { WaiterCallButton } from './TableActionButton';
import { DockedPanel } from './QrDock';
import { card, column, displayTitle, fieldClass, focusRing, iconButton, outlineButton, primaryButton } from './qrUi';

interface Props {
    /** "Masa 4 · Salon" */
    tableLabel: string;
    lines: DeliveryCartLine[];
    total: number;
    /** Satırın küçük görseli ve yer tutucusu: ürün ya da menü kimliği → menüdeki kalem. */
    itemsById: Map<string, QrItem>;
    orderNote: string;
    onOrderNote: (note: string) => void;
    onChange: (key: string, delta: number) => void;
    onRemove: (key: string) => void;
    onLineNote: (key: string, note: string) => void;
    /** Satırın "Paket olsun" işareti. */
    onLineTakeaway: (key: string, takeaway: boolean) => void;
    onSend: () => void;
    sending: boolean;
    sendError: string | null;
    /** Gönderim kapandıysa (personel masada QR siparişini kilitledi, restoran kapandı, bağlantı yok) nedeni; düğme kapalı, üstünde yazar. */
    blockedReason: string | null;
    /** Az önce gönderilen talep: sepet yerine "Siparişiniz garsona iletildi" (durumu canlı). */
    sent: SentOrderRequest | null;
    /** Geri oku ve "Menüye dön": Menü sekmesi. */
    onBack: () => void;
    onAccount: () => void;
    /** Sipariş reddedilince "Garson çağır" (açıksa). */
    callWaiter: TableAction | null;
}

// "Sepetim" sekmesi: geri oku, başlık ve masa; satır kartları (görsel, ad, fiyat, "− n +", sil; altında görünür
// "+ Not ekle"); altta yapışık sipariş paneli ("Garsona not", "Ara Toplam", "Siparişi Garsona Gönder"). Masanın siparişleri
// Hesabım'da. Gönderince aynı sekmede onay ve talebin canlı durumu.
export default function QrCart(props: Props) {
    const { tableLabel, sent, onBack } = props;
    return (
        <div className={cn(column, 'flex min-h-dvh flex-col px-4')}>
            <header className="relative flex flex-col items-center pb-5 pt-[max(1rem,env(safe-area-inset-top))]">
                <button type="button" onClick={onBack} aria-label="Menüye dön" className={cn(iconButton, 'absolute left-0 top-[max(0.75rem,env(safe-area-inset-top))]')}>
                    <ArrowLeft className="h-6 w-6" aria-hidden="true" />
                </button>
                <h1 className={cn(displayTitle, 'text-[28px]')}>Sepetim</h1>
                <p className="m-0 mt-2.5 inline-flex max-w-full items-center gap-2 rounded-full border border-[var(--site-border-mid)] bg-[var(--site-card)] px-4 py-1.5 text-sm font-semibold">
                    <Armchair className="h-4 w-4 shrink-0 text-[var(--site-accent-text)]" aria-hidden="true" />
                    <span className="truncate">{tableLabel}</span>
                </p>
            </header>
            {sent ? <SentState {...props} sent={sent} /> : <MyCart {...props} />}
        </div>
    );
}

function MyCart({ lines, total, itemsById, orderNote, onOrderNote, onChange, onRemove, onLineNote, onLineTakeaway, onSend, sending, sendError, blockedReason, onBack }: Props) {
    // Not alanı açık satırlar (satır anahtarıyla). "Paket olsun" anahtarı değiştirir: açık not alanı açık kalır, odak
    // yeni satırın kutusunda.
    const [editing, setEditing] = useState<Set<string>>(() => new Set());
    const focusId = useRef<string | null>(null);

    useEffect(() => {
        if (!focusId.current) return;
        document.getElementById(focusId.current)?.focus();
        focusId.current = null;
    }, [lines]);

    const setOpen = (key: string, open: boolean) => setEditing(prev => {
        const next = new Set(prev);
        if (open) next.add(key); else next.delete(key);
        return next;
    });

    const setTakeaway = (line: DeliveryCartLine, takeaway: boolean) => {
        const nextKey = tableLineKey({ ...line, takeaway });
        setEditing(prev => {
            if (!prev.has(line.key)) return prev;
            const next = new Set(prev); next.delete(line.key); next.add(nextKey); return next;
        });
        focusId.current = `paket-${nextKey}`;
        onLineTakeaway(line.key, takeaway);
    };

    if (lines.length === 0) {
        return (
            <div className="flex flex-col items-center pb-[calc(96px+env(safe-area-inset-bottom))] pt-8 text-center">
                <span aria-hidden="true" className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--site-alt)] text-[var(--site-sub)]">
                    <ShoppingBag className="h-7 w-7" />
                </span>
                <p className="m-0 mt-5 text-[18px] font-extrabold">Sepetiniz boş</p>
                <p className="m-0 mt-1 max-w-xs text-[15px] text-[var(--site-sub)]">Menüden beğendiklerinizi ekleyin, buradan garsona gönderin.</p>
                {blockedReason && <BlockedNotice text={blockedReason} />}
                <button type="button" onClick={onBack} className={cn(outlineButton, 'mt-6')}>Menüye dön</button>
            </div>
        );
    }

    return (
        <div className="flex flex-1 flex-col">
            <ul className="m-0 flex list-none flex-col gap-3 p-0 pb-5" aria-label="Sepetteki ürünler">
                {lines.map(line => (
                    <CartLine key={line.key} line={line} item={itemsById.get((line.kind === 'setMenu' ? line.setMenuId : line.productId) ?? '')}
                        editing={editing.has(line.key)} onEdit={open => setOpen(line.key, open)}
                        onChange={delta => onChange(line.key, delta)} onRemove={() => onRemove(line.key)}
                        onNote={note => onLineNote(line.key, note)} onTakeaway={takeaway => setTakeaway(line, takeaway)} />
                ))}
            </ul>

            <CheckoutPanel count={lines.reduce((sum, l) => sum + l.quantity, 0)} total={total} orderNote={orderNote} onOrderNote={onOrderNote}
                onSend={onSend} sending={sending} sendError={sendError} blockedReason={blockedReason} />
        </div>
    );
}

/**
 * Sepetin altına yapışık sipariş paneli (DockedPanel): sırasıyla tek satırlık "Garsona not" (dokununca alan açılır),
 * "Ara Toplam" ve tek ana işlem "Siparişi Garsona Gönder".
 */
function CheckoutPanel({ count, total, orderNote, onOrderNote, onSend, sending, sendError, blockedReason }: {
    count: number; total: number; orderNote: string; onOrderNote: (note: string) => void;
    onSend: () => void; sending: boolean; sendError: string | null; blockedReason: string | null;
}) {
    const [noteOpen, setNoteOpen] = useState(false);
    const note = orderNote.trim();

    return (
        <DockedPanel label="Sipariş özeti">
            {noteOpen ? (
                <div className="flex items-center gap-2 py-0.5">
                    <label htmlFor="siparis-notu" className="sr-only">Garsona not (isteğe bağlı)</label>
                    <Pencil className="h-[18px] w-[18px] shrink-0 text-[var(--site-accent-text)]" aria-hidden="true" />
                    <input id="siparis-notu" value={orderNote} onChange={e => onOrderNote(e.target.value)} maxLength={500} autoFocus
                        placeholder="Örn: Şekersiz olsun, yanında su…" enterKeyHint="done"
                        onKeyDown={e => { if (e.key === 'Enter') setNoteOpen(false); }}
                        className={cn(fieldClass, 'h-11 min-w-0 flex-1')} />
                    <button type="button" onClick={() => setNoteOpen(false)}
                        className={cn('min-h-11 shrink-0 rounded-xl px-2.5 text-sm font-bold text-[var(--site-accent-text)]', focusRing)}>
                        Tamam
                    </button>
                </div>
            ) : (
                <button type="button" onClick={() => setNoteOpen(true)} aria-expanded="false"
                    aria-label={note ? `Garsona notu düzenle: ${note}` : 'Garsona not ekle, isteğe bağlı'}
                    className={cn('flex min-h-11 w-full items-center gap-2.5 rounded-xl text-left text-[14px]', focusRing)}>
                    <Pencil className="h-[18px] w-[18px] shrink-0 text-[var(--site-accent-text)]" aria-hidden="true" />
                    {note ? (
                        <>
                            <span className="min-w-0 flex-1 truncate"><span className="font-bold">Not:</span> {note}</span>
                            <span className="shrink-0 font-bold text-[var(--site-accent-text)]">Düzenle</span>
                        </>
                    ) : (
                        <span className="min-w-0 flex-1 truncate font-bold text-[var(--site-accent-text)]">
                            Garsona not ekle <span className="font-medium text-[var(--site-sub)]">(isteğe bağlı)</span>
                        </span>
                    )}
                </button>
            )}

            <div className="mt-1 flex items-end justify-between gap-3 border-t border-dashed border-[var(--site-border-mid)] pt-3">
                <p className="m-0 flex flex-col">
                    <span className="text-[15px] font-bold leading-tight">Ara Toplam</span>
                    <span className="text-[13px] tabular-nums text-[var(--site-sub)]">{count} ürün</span>
                </p>
                <p className="m-0 text-[28px] font-extrabold leading-none tabular-nums">{formatPrice(total)} ₺</p>
            </div>

            <div aria-live="assertive">
                {sendError && <p role="alert" className="m-0 mt-3 rounded-2xl bg-[var(--site-error-bg)] px-4 py-2.5 text-sm font-semibold text-[var(--site-error)]">{sendError}</p>}
            </div>
            {blockedReason && <div className="mt-3"><BlockedNotice text={blockedReason} /></div>}

            <button type="button" onClick={onSend} disabled={sending || !!blockedReason} className={cn(primaryButton, 'mt-3 w-full disabled:cursor-not-allowed')}>
                <Send className="h-5 w-5" aria-hidden="true" />{sending ? 'Gönderiliyor…' : 'Siparişi Garsona Gönder'}
            </button>
            {!noteOpen && (
                <p className="m-0 mt-2 flex items-center justify-center gap-1.5 text-[12px] leading-snug text-[var(--site-sub)]">
                    <Info className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />Garson onaylayınca masa hesabına eklenir.
                </p>
            )}
        </DockedPanel>
    );
}

function BlockedNotice({ text }: { text: string }) {
    return (
        <p role="status" className="m-0 mt-0 flex items-start gap-2.5 rounded-2xl bg-[var(--site-alt)] px-4 py-3 text-left text-sm leading-snug text-[var(--site-text)]">
            <Info className="mt-px h-4 w-4 shrink-0 text-[var(--site-accent-text)]" aria-hidden="true" />{text}
        </p>
    );
}

/**
 * Sepet satırı (kart): görsel, kalın ad, altında fiyat, menü seçimleri ve (varsa) "Not: …"; sağda "− n +" ve sil.
 * Altında yan yana görünür "Paket olsun" kutusu ve "+ Not ekle" / "Notu düzenle"; not düğmesi satırın altında tek
 * satırlık not alanını açar.
 */
function CartLine({ line, item, editing, onEdit, onChange, onRemove, onNote, onTakeaway }: {
    line: DeliveryCartLine; item: QrItem | undefined; editing: boolean; onEdit: (open: boolean) => void;
    onChange: (delta: number) => void; onRemove: () => void; onNote: (note: string) => void; onTakeaway: (takeaway: boolean) => void;
}) {
    const panelId = `not-alani-${line.key}`;
    const extras = line.selectionNames.join(' · ');
    const note = line.note.trim();
    const stepButton = cn('flex h-11 w-10 items-center justify-center rounded-full text-[var(--site-text)] disabled:opacity-35', focusRing);

    return (
        <li className={cn(card, 'p-2.5')}>
            <div className="flex items-start gap-3">
                <QrImage src={item?.imageUrl} alt="" category={{ id: item?.categoryId ?? '', name: item?.categoryName ?? '' }}
                    className="h-16 w-16 shrink-0 rounded-xl" />
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
                    <div className="min-w-[7rem] flex-1 py-0.5">
                        <p className="m-0 break-words text-[16px] font-extrabold leading-snug">{line.name}</p>
                        <p className="m-0 mt-0.5 text-[15px] font-bold tabular-nums">{formatPrice(line.unitPrice * line.quantity)} ₺</p>
                        {extras && <p className="m-0 mt-0.5 break-words text-[13px] leading-snug text-[var(--site-sub)]">{extras}</p>}
                        {note && !editing && <p className="m-0 mt-0.5 break-words text-[13px] leading-snug text-[var(--site-sub)]">Not: {note}</p>}
                    </div>
                    <div className="ml-auto flex shrink-0 items-center gap-1">
                        <div className="flex items-center rounded-full border border-[var(--site-border-mid)] bg-[var(--site-card)]">
                            <button type="button" onClick={() => onChange(-1)} disabled={line.quantity <= 1} aria-label={`${line.name} bir azalt`} className={stepButton}>
                                <Minus className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
                            </button>
                            <span className="min-w-6 text-center text-base font-extrabold tabular-nums" aria-live="polite">
                                <span className="sr-only">{line.name} adedi: </span>{line.quantity}
                            </span>
                            <button type="button" onClick={() => onChange(1)} aria-label={`${line.name} bir artır`} className={stepButton}>
                                <Plus className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
                            </button>
                        </div>
                        <button type="button" onClick={onRemove} aria-label={`${line.name} sepetten çıkar`}
                            className={cn('flex h-11 w-10 items-center justify-center rounded-full text-[var(--site-error)] hover:bg-[var(--site-error-bg)]', focusRing)}>
                            <Trash2 className="h-5 w-5" aria-hidden="true" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Satır altı: görünür "Paket olsun" kutusu ve not düğmesi yan yana (dar ekranda alta kayar). */}
            <div className="ml-[70px] mt-0.5 flex flex-wrap items-center gap-x-2">
                <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl px-1.5 text-[13px] font-bold has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[var(--site-focus)]">
                    <input id={`paket-${line.key}`} type="checkbox" className="peer sr-only" checked={!!line.takeaway}
                        onChange={e => onTakeaway(e.target.checked)} aria-label={`${line.name} paket olsun`} />
                    <span aria-hidden="true" className={cn('flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors motion-reduce:transition-none',
                        line.takeaway ? 'border-[var(--site-accent)] bg-[var(--site-accent)] text-[var(--site-on-accent)]' : 'border-[var(--site-border-strong)] bg-[var(--site-card)]')}>
                        {line.takeaway && <Check className="h-3.5 w-3.5" strokeWidth={3.25} />}
                    </span>
                    <span className={line.takeaway ? 'text-[var(--site-text)]' : 'text-[var(--site-sub)]'}>Paket olsun</span>
                </label>
                {!editing && (
                    <button type="button" onClick={() => onEdit(true)} aria-expanded="false" aria-controls={panelId}
                        aria-label={note ? `${line.name} notunu düzenle: ${note}` : `${line.name} için not ekle`}
                        className={cn('inline-flex min-h-11 items-center gap-1 rounded-xl px-1.5 text-[13px] font-bold text-[var(--site-accent-text)]', focusRing)}>
                        {note ? <><Pencil className="h-3.5 w-3.5" aria-hidden="true" />Notu düzenle</>
                            : <><Plus className="h-3.5 w-3.5" strokeWidth={2.75} aria-hidden="true" />Not ekle</>}
                    </button>
                )}
            </div>

            {editing && (
                <div id={panelId} className="mt-1 flex flex-col gap-1 rounded-xl bg-[var(--site-alt)] px-3 py-2.5">
                    <label className="text-[13px] font-bold" htmlFor={`not-${line.key}`}>{line.name} için not</label>
                    <div className="flex items-center gap-2">
                        <input id={`not-${line.key}`} value={line.note} onChange={e => onNote(e.target.value)} maxLength={300}
                            autoFocus={!line.note} placeholder="Örn. az pişmiş, soğansız"
                            onKeyDown={e => { if (e.key === 'Enter') onEdit(false); }}
                            className={cn(fieldClass, 'h-11 min-w-0 flex-1')} />
                        <button type="button" onClick={() => onEdit(false)}
                            className={cn('min-h-11 shrink-0 rounded-xl px-3 text-sm font-bold text-[var(--site-accent-text)]', focusRing)}>
                            Tamam
                        </button>
                    </div>
                </div>
            )}
        </li>
    );
}

// Gönderim sonrası: onay işareti, "Siparişiniz garsona iletildi" ve talebin canlı durumu (useTableOrderRequests
// yoklaması). Reddedilirse garsonun nedeni ve "Garson çağır".
function SentState({ sent, onAccount, onBack, callWaiter }: Props & { sent: SentOrderRequest }) {
    const approved = sent.status === ORDER_REQUEST_APPROVED;
    const rejected = sent.status === ORDER_REQUEST_REJECTED;

    return (
        <div className="flex flex-col items-center pb-[calc(96px+env(safe-area-inset-bottom))] pt-6 text-center">
            <div role="status" aria-live="polite" className="flex flex-col items-center">
                <span aria-hidden="true" className={cn('qr-pop flex h-[80px] w-[80px] items-center justify-center rounded-full ring-[10px]',
                    rejected ? 'bg-[var(--site-error)] text-[var(--site-on-error)] ring-[var(--site-error-bg)]'
                        : 'bg-[var(--site-accent)] text-[var(--site-on-accent)] ring-[color-mix(in_srgb,var(--site-accent)_18%,transparent)]')}>
                    {rejected ? <X className="h-9 w-9" strokeWidth={3} /> : <Check className="h-9 w-9" strokeWidth={3} />}
                </span>
                <h2 className={cn(displayTitle, 'mt-7 text-[24px]')}>
                    {rejected ? 'Siparişiniz onaylanmadı' : approved ? 'Siparişiniz mutfakta' : 'Siparişiniz garsona iletildi'}
                </h2>
                {rejected && sent.rejectReason && (
                    <p className="m-0 mt-4 max-w-[320px] rounded-2xl bg-[var(--site-error-bg)] px-4 py-3 text-[15px] font-semibold leading-snug text-[var(--site-error)]">
                        Garsonun notu: {sent.rejectReason}
                    </p>
                )}
                {rejected ? (
                    <p className="m-0 mt-3 max-w-[300px] text-[15px] leading-relaxed text-[var(--site-sub)]">Menüden başka bir şey seçebilir ya da garsonu çağırabilirsiniz.</p>
                ) : (
                    <div className="mt-4">
                        <StatusChip tone={approved ? 'kitchen' : 'waiting'}>{approved ? 'Onaylandı · Mutfakta' : 'Garson onayı bekleniyor'}</StatusChip>
                    </div>
                )}
            </div>
            <div className="mt-8 flex w-full max-w-[360px] flex-col gap-2.5">
                {rejected && callWaiter && <WaiterCallButton action={callWaiter} />}
                <button type="button" onClick={onAccount} className={cn(rejected && callWaiter ? outlineButton : primaryButton, 'w-full')}>
                    <Wallet className="h-5 w-5" aria-hidden="true" />Hesabıma git
                </button>
                <button type="button" onClick={onBack}
                    className={cn('min-h-11 rounded-xl text-[15px] font-bold text-[var(--site-sub)] hover:text-[var(--site-text)]', focusRing)}>
                    Menüye dön
                </button>
            </div>
        </div>
    );
}
