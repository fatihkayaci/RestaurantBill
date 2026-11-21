import { useEffect, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, Ban, Banknote, CreditCard, Landmark, MapPin, Phone, X, XCircle } from 'lucide-react';
import { Modal, ModalTitle } from '@/components/ui/modal';
import { useActiveShift } from '@/features/cashier/context/activeShiftStore';
import { shiftService } from '@/features/cashier/api/shiftService';
import type { OpenRegister } from '@/features/cashier/types';
import type { CourierCashSummary } from '@/features/courier/types';
import { mapsUrl, telUrl } from '@/features/courier/types';
import { getApiErrorMessage } from '@/lib/apiError';
import { formatAmount, formatElapsed } from '@/lib/format';
import { cn } from '@/lib/utils';
import { deliveryService } from '../api/deliveryService';
import { CANCEL_REASONS, ETA_CHOICES, PICKUP_ETA_CHOICES, REJECT_REASONS, boardColumnOf, countdownText, deliveryLateness, orderTitle, type BoardColumnKey } from '../deliveryStatus';
import CourierPicker from './CourierPicker';
import LatenessBadge from './LatenessBadge';
import PickupBadge from './PickupBadge';
import { DeliveryStatus, DoorPayment, doorPaymentWord, type DeliveryOrder, type DoorPaymentMethod } from '../types';

interface Props {
    order: DeliveryOrder;
    couriers: CourierCashSummary[];
    canBlockPhone: boolean;
    now: number;
    onClose: () => void;
    /** İşlemden sonra pano yeniden çeker (canlı olay da gelir). */
    onChanged: () => void;
    /** Panodaki "Reddet" detayı doğrudan gerekçe adımında açar. */
    initialStep?: 'main' | 'reject';
}

type Step = 'main' | 'reject' | 'cancel' | 'block';

/** Durum rozeti: panodaki şerit renkleriyle aynı (yeni mavi, mutfak turuncu, hazır mor, yolda gri-kahve). */
const STATUS_CHIP: Record<BoardColumnKey, string> = {
    new: 'bg-rb-accent text-rb-accent-foreground',
    preparing: 'bg-rb-orange-bg text-rb-orange',
    ready: 'bg-rb-purple-bg text-rb-purple',
    onTheWay: 'bg-rb-neutral-bg text-rb-neutral',
    delivered: 'bg-muted text-muted-foreground',
};

const FOCUS = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';

function timeOf(iso?: string | null): string {
    return iso ? new Date(iso).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : '';
}

/** Bölüm başlığı: küçük, soluk, büyük harf. */
function SectionLabel({ children }: { children: ReactNode }) {
    return <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[.14em] text-muted-foreground">{children}</h3>;
}

// Online siparişin detayı ve işlemleri. Düzen yukarıdan aşağı: başlık (numara, durum, saat/söz, toplam ve ödeme) →
// müşteri → ürünler ve tutar dökümü → durum ve kurye → altta tek işlem alanı (o adımın ana işi; iptal ve numara
// engelleme ayrı ve sessiz). Gerekçe adımları (ret, iptal, engelleme) işlem alanının yerine açılır.
// Yola çıkmış siparişe ürün eklenmez; bu ekranda ürün ekleme yoktur. Gel al siparişinde kurye ve adres yoktur; müşteri
// gelince işlem alanında kasa ve ödeme seçilip "Müşteri aldı" denir (ödeme o anda kasaya yazılır, sipariş kapanır).
export default function DeliveryOrderDetail({ order, couriers, canBlockPhone, now, onClose, onChanged, initialStep = 'main' }: Props) {
    const [step, setStep] = useState<Step>(initialStep);
    const [busy, setBusy] = useState(false);
    const suggested = order.suggestedEtaMinutes > 0 ? order.suggestedEtaMinutes : 30;
    const [eta, setEta] = useState<number>(suggested);
    const [reason, setReason] = useState('');

    const isPickup = !!order.isPickup;
    const baseEta: readonly number[] = isPickup ? PICKUP_ETA_CHOICES : ETA_CHOICES;
    const etaChoices = baseEta.includes(suggested)
        ? [...baseEta]
        : [...baseEta, suggested].sort((a, b) => a - b);

    const isNew = order.status === DeliveryStatus.Received;
    const inProgress = order.status === DeliveryStatus.Accepted || order.status === DeliveryStatus.Preparing || order.status === DeliveryStatus.Ready;
    const canAssign = inProgress && !isPickup;
    const canHandOver = inProgress && isPickup;
    const canCancel = inProgress || order.status === DeliveryStatus.OnTheWay;
    const canBlock = canBlockPhone && !order.isPhoneBlocked;
    const cash = order.paymentPreference === DoorPayment.Nakit;
    const iban = order.paymentPreference === DoorPayment.Iban;
    const PayIcon = cash ? Banknote : iban ? Landmark : CreditCard;
    const column = boardColumnOf(order.status);
    const urgent = !!order.autoRejectAt && new Date(order.autoRejectAt).getTime() - now < 2 * 60_000;
    const hasLateness = !!deliveryLateness(order, now);
    const itemTotal = order.lines.reduce((s, l) => s + l.quantity, 0);

    const run = async (action: () => Promise<void>, success: string, fallback: string, close = false) => {
        setBusy(true);
        try {
            await action();
            toast.success(success);
            onChanged();
            if (close) onClose();
            else setStep('main');
        } catch (err) {
            toast.error(getApiErrorMessage(err, fallback));
            onChanged();
        } finally {
            setBusy(false);
        }
    };

    const accept = () => run(() => deliveryService.accept(order.id, eta),
        `${orderTitle(order)} kabul edildi · ${eta} dk. Mutfağa gönderildi.`, 'Sipariş kabul edilemedi.', true);
    const reject = () => run(() => deliveryService.reject(order.id, reason.trim()),
        `${orderTitle(order)} reddedildi.`, 'Sipariş reddedilemedi.', true);
    const cancel = () => run(() => deliveryService.cancel(order.id, reason.trim()),
        `${orderTitle(order)} iptal edildi.`, 'Sipariş iptal edilemedi.', true);
    const block = () => run(() => deliveryService.blockPhone(order.id, reason.trim() || undefined),
        'Numara engellendi. Bu numara artık online sipariş veremez.', 'Numara engellenemedi.');
    const assign = (courierUserId: string | null) => run(() => deliveryService.assignCourier(order.id, courierUserId),
        courierUserId ? 'Kurye atandı.' : 'Kurye ataması kaldırıldı.', 'Kurye atanamadı.');

    const openStep = (next: Step) => { setReason(''); setStep(next); };

    // ── Gel al: "Müşteri aldı" ──
    // Kasiyer kendi açık vardiyasının kasasına alır; vardiyası olmayan (yönetici) açık günü olan kasalardan seçer.
    const { shift } = useActiveShift();
    const ownRegisterId = shift?.cashRegisterId ?? null;
    const [openRegisters, setOpenRegisters] = useState<OpenRegister[] | null>(null);
    const [pickedRegisterId, setPickedRegisterId] = useState('');
    const [pickupMethod, setPickupMethod] = useState<DoorPaymentMethod>(order.paymentPreference);
    useEffect(() => {
        if (!canHandOver || ownRegisterId) return;
        shiftService.getOpenRegisters()
            .then(list => {
                setOpenRegisters(list);
                setPickedRegisterId(current => current || list[0]?.cashRegisterId || '');
            })
            .catch(() => setOpenRegisters([]));
    }, [canHandOver, ownRegisterId]);
    const registerId = ownRegisterId ?? (pickedRegisterId || null);
    const pickupMethods: DoorPaymentMethod[] = order.paymentPreference === DoorPayment.Iban
        ? [DoorPayment.Iban, DoorPayment.Nakit, DoorPayment.Kart]
        : [DoorPayment.Nakit, DoorPayment.Kart];
    const completePickup = () => {
        if (!registerId) {
            toast.error(ownRegisterId === null ? 'Ödemeyi almak için açık günü olan bir kasa seçin.' : 'Ödemeyi almak için açık bir vardiyanız olmalı.');
            return;
        }
        return run(() => deliveryService.completePickup(order.id, registerId, pickupMethod),
            `${orderTitle(order)} müşteriye verildi · ${doorPaymentWord(pickupMethod)} ₺${formatAmount(order.total)} kasaya alındı.`,
            'Sipariş teslim edilemedi.', true);
    };

    const reasonStep = (title: string, presets: readonly string[], warning: string | null, confirmLabel: string, onConfirm: () => void, required: boolean) => (
        <div className="flex flex-col gap-3">
            <p className="text-sm font-semibold text-foreground">{title}</p>
            {warning && (
                <p className="flex items-start gap-2 text-xs text-muted-foreground">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rb-amber" aria-hidden="true" />
                    {warning}
                </p>
            )}
            <div className="flex flex-wrap gap-2">
                {presets.map(p => (
                    <button
                        key={p}
                        type="button"
                        onClick={() => setReason(p)}
                        aria-pressed={reason === p}
                        className={cn(
                            'min-h-11 rounded-full border px-3.5 text-left text-xs font-semibold transition-colors',
                            reason === p ? 'border-rb-gold bg-rb-gold text-rb-gold-foreground' : 'border-border bg-card text-foreground hover:border-rb-gold',
                            FOCUS
                        )}
                    >
                        {p}
                    </button>
                ))}
            </div>
            <textarea
                value={reason}
                onChange={e => setReason(e.target.value)}
                maxLength={step === 'block' ? 200 : 300}
                rows={2}
                placeholder="Ya da kendiniz yazın"
                aria-label="Gerekçe"
                className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground"
            />
            <div className="flex gap-2">
                <button type="button" onClick={() => { setStep('main'); setReason(''); }} disabled={busy}
                    className={cn('min-h-12 flex-1 rounded-xl border border-border text-sm font-semibold text-foreground hover:bg-muted', FOCUS)}>Vazgeç</button>
                <button type="button" onClick={onConfirm} disabled={busy || (required && !reason.trim())}
                    className={cn('min-h-12 flex-[1.5] rounded-xl bg-rb-red text-sm font-semibold text-rb-red-foreground disabled:opacity-50', FOCUS)}>
                    {busy ? 'Gönderiliyor…' : confirmLabel}
                </button>
            </div>
        </div>
    );

    // Durum satırları: etiket solda soluk, değer sağda koyu.
    const timeline: [string, ReactNode][] = [];
    if (order.acceptedAt) timeline.push(['Kabul', <>{timeOf(order.acceptedAt)}{order.estimatedMinutes ? ` · müşteriye ${order.estimatedMinutes} dk söylendi` : ''}</>]);
    if (order.dispatchedAt) timeline.push(['Yola çıktı', timeOf(order.dispatchedAt)]);
    if (order.deliveredAt && isPickup) {
        timeline.push(['Müşteri aldı', <>
            {timeOf(order.deliveredAt)}
            {order.collectedMethod ? ` · ${doorPaymentWord(order.collectedMethod)} ₺${formatAmount(order.collectedAmount ?? 0)} kasaya alındı` : ''}
        </>]);
    } else if (order.deliveredAt) {
        timeline.push(['Teslim', <>
            {timeOf(order.deliveredAt)}
            {order.collectedMethod ? ` · ${doorPaymentWord(order.collectedMethod)} ₺${formatAmount(order.collectedAmount ?? 0)}` : ''}
        </>]);
        timeline.push(['Kasa', order.settledAt
            ? 'Kasaya alındı'
            : <span className="text-rb-amber">Kurye kasaya teslim etmedi</span>]);
    }

    const secondary = step === 'main' && (canCancel || canBlock) && (
        <div className={cn('flex flex-wrap gap-x-2 gap-y-1', isNew && 'border-t border-border pt-2')}>
            {canCancel && (
                <button type="button" onClick={() => openStep('cancel')} disabled={busy}
                    className={cn('flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-rb-red hover:bg-rb-red-bg disabled:opacity-50', FOCUS)}>
                    <XCircle className="h-4 w-4" aria-hidden="true" />Siparişi iptal et
                </button>
            )}
            {canBlock && (
                <button type="button" onClick={() => openStep('block')} disabled={busy}
                    className={cn('ml-auto flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50', FOCUS)}>
                    <Ban className="h-4 w-4" aria-hidden="true" />Numarayı engelle
                </button>
            )}
        </div>
    );

    return (
        <Modal onClose={onClose} closeOnOverlay={!busy} overlayClassName="z-80 bg-black/60 backdrop-blur-[3px] sm:p-4">
            <div className="flex h-dvh w-full max-w-lg flex-col bg-card shadow-2xl sm:h-auto sm:max-h-[92dvh] sm:rounded-2xl sm:border sm:border-border">
                {/* Başlık: numara + durum | toplam + ödeme; altında saat ve söz/geri sayım */}
                <header className="flex flex-col gap-3 border-b border-border px-5 pb-4 pt-4">
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1">
                            <ModalTitle className="font-serif text-[28px] font-bold leading-none tabular-nums text-foreground">
                                #{order.number}
                                <span className="sr-only"> numaralı paket sipariş</span>
                            </ModalTitle>
                            <span className={cn('inline-flex rounded-full px-2.5 py-1 text-xs font-bold', column ? STATUS_CHIP[column] : 'bg-rb-red-bg text-rb-red')}>
                                {order.statusLabel}
                            </span>
                        </div>
                        <button type="button" onClick={onClose} aria-label="Kapat"
                            className={cn('-mr-1 -mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground', FOCUS)}>
                            <X className="h-5 w-5" aria-hidden="true" />
                        </button>
                    </div>
                    <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
                        <div className="flex min-w-0 flex-col gap-1.5 text-sm text-muted-foreground">
                            <span className="tabular-nums">
                                {isPickup ? <PickupBadge className="mr-1.5" /> : order.zoneName && <b className="font-semibold text-foreground">{order.zoneName} · </b>}
                                {timeOf(order.createdAt)} geldi · {formatElapsed(order.createdAt, now)} önce
                            </span>
                            {isNew && order.autoRejectAt ? (
                                <span className={cn('text-xs font-bold tabular-nums', urgent ? 'text-rb-red' : 'text-rb-amber')}>
                                    Yanıtlanmazsa {countdownText(order.autoRejectAt, now)} içinde otomatik reddedilir
                                </span>
                            ) : hasLateness && <LatenessBadge order={order} now={now} className="px-2.5 py-1 text-xs" />}
                        </div>
                        <div className="text-right">
                            <p className="font-serif text-[28px] font-bold leading-none tabular-nums text-foreground">₺{formatAmount(order.total)}</p>
                            <p className={cn('mt-1 flex items-center justify-end gap-1 text-xs font-semibold', cash ? 'text-rb-green' : iban ? 'text-rb-purple' : 'text-rb-accent')}>
                                <PayIcon className="h-3.5 w-3.5" aria-hidden="true" />
                                {iban ? 'IBAN (havale)' : `${isPickup ? 'Kasada' : 'Kapıda'} ${cash ? 'nakit' : 'kart'}`}
                                {iban && !isPickup && <span className="font-normal text-muted-foreground">· kurye para almaz</span>}
                            </p>
                        </div>
                    </div>
                </header>

                <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
                    {/* Müşteri */}
                    <section>
                        <SectionLabel>Müşteri</SectionLabel>
                        <p className="flex flex-wrap items-center gap-2 text-base font-semibold text-foreground">
                            {order.customerName}
                            {order.isPhoneBlocked && <span className="rounded bg-rb-red-bg px-1.5 py-0.5 text-[10px] font-bold text-rb-red">ENGELLİ NUMARA</span>}
                        </p>
                        <a href={telUrl(order.customerPhone)}
                            className={cn('-ml-1 mt-0.5 inline-flex min-h-11 items-center gap-2 rounded-lg px-1 text-sm font-semibold tabular-nums text-rb-accent hover:underline', FOCUS)}>
                            <Phone className="h-4 w-4" aria-hidden="true" />{order.customerPhone}
                        </a>
                        {isPickup ? (
                            <p className="flex min-h-11 items-center gap-2 text-sm text-foreground">
                                <PickupBadge />Müşteri restorana gelip alacak · kurye yok
                            </p>
                        ) : (
                        <a href={mapsUrl([order.address, order.zoneName].filter(Boolean).join(', '))} target="_blank" rel="noreferrer"
                            className={cn('-ml-1 flex min-h-11 items-start gap-2 rounded-lg px-1 py-1.5 text-sm text-foreground hover:underline', FOCUS)}>
                            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                            <span className="min-w-0 break-words">
                                {order.address}
                                {order.addressDirections && <span className="mt-0.5 block text-muted-foreground">Tarif: {order.addressDirections}</span>}
                            </span>
                        </a>
                        )}
                        {order.note && (
                            <p className="mt-2 rounded-r-lg border-l-[3px] border-rb-gold bg-rb-gold-bg px-3 py-2 text-sm text-foreground">
                                <span className="font-semibold text-muted-foreground">Not: </span>{order.note}
                            </p>
                        )}
                    </section>

                    {/* Ürünler ve tutar */}
                    <section>
                        <SectionLabel>Ürünler · {itemTotal}</SectionLabel>
                        <ul className="space-y-2.5">
                            {order.lines.map((line, i) => (
                                <li key={i} className="grid grid-cols-[2rem_minmax(0,1fr)_auto] gap-x-2 text-sm">
                                    <span className="text-right font-bold tabular-nums text-foreground">{line.quantity}×</span>
                                    <span className="min-w-0 break-words">
                                        <span className="font-semibold text-foreground">{line.name}</span>
                                        {line.selections.length > 0 && <span className="block text-xs text-muted-foreground">{line.selections.join(', ')}</span>}
                                        {line.note && <span className="block text-xs text-rb-amber">Not: {line.note}</span>}
                                    </span>
                                    <span className="text-right tabular-nums text-foreground">₺{formatAmount(line.lineTotal)}</span>
                                </li>
                            ))}
                        </ul>
                        <dl className="mt-3 space-y-1 border-t border-border pt-3 pl-10 text-sm">
                            <div className="flex justify-between text-muted-foreground"><dt>Ara toplam</dt><dd className="tabular-nums">₺{formatAmount(order.subtotal)}</dd></div>
                            {isPickup
                                ? <div className="flex justify-between text-muted-foreground"><dt>Gel al</dt><dd>teslimat ücreti yok</dd></div>
                                : <div className="flex justify-between text-muted-foreground"><dt>Teslimat</dt><dd className="tabular-nums">₺{formatAmount(order.deliveryFee)}</dd></div>}
                            <div className="flex justify-between font-semibold text-foreground"><dt>Toplam</dt><dd className="tabular-nums">₺{formatAmount(order.total)}</dd></div>
                        </dl>
                    </section>

                    {/* Durum */}
                    {timeline.length > 0 && (
                        <section>
                            <SectionLabel>Durum</SectionLabel>
                            <dl className="grid grid-cols-[6rem_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-sm">
                                {timeline.map(([label, value]) => (
                                    <div key={label} className="contents">
                                        <dt className="text-muted-foreground">{label}</dt>
                                        <dd className="font-medium tabular-nums text-foreground">{value}</dd>
                                    </div>
                                ))}
                            </dl>
                        </section>
                    )}

                    {/* Kurye: atanabilirken seçici (Hazır'da asıl iş), sonra yalnızca ad */}
                    {(canAssign || order.courierName) && step === 'main' && (
                        <section>
                            <SectionLabel>
                                Kurye
                                {canAssign && !order.courierUserId && (
                                    <span className={cn('ml-1.5 normal-case tracking-normal', order.status === DeliveryStatus.Ready ? 'font-bold text-rb-purple' : 'text-rb-amber')}>
                                        · {order.status === DeliveryStatus.Ready ? 'paket hazır, kurye seçin' : 'atanmadı'}
                                    </span>
                                )}
                            </SectionLabel>
                            {canAssign ? (
                                <CourierPicker couriers={couriers} selectedId={order.courierUserId} disabled={busy} onPick={assign} />
                            ) : (
                                <p className="text-sm font-semibold text-foreground">{order.courierName}</p>
                            )}
                        </section>
                    )}
                </div>

                {/* Tek işlem alanı: gerekçe adımı ya da o adımın ana işi; iptal ve engelleme altta ayrı */}
                {(step !== 'main' || isNew || canHandOver || secondary) && (
                    <footer className="space-y-3 border-t border-border bg-muted/40 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 sm:rounded-b-2xl">
                        {step === 'reject' && reasonStep('Neden reddediyorsunuz?', REJECT_REASONS,
                            'Gerekçe müşterinin takip sayfasında görünür.', 'Reddet', reject, true)}
                        {step === 'cancel' && reasonStep('Neden iptal ediyorsunuz?', CANCEL_REASONS,
                            'Gerekçe müşterinin takip sayfasında görünür. Mutfaktaki sipariş de iptal olur.', 'İptal et', cancel, true)}
                        {step === 'block' && reasonStep('Bu numara engellensin mi?', ['Sahte sipariş', 'Teslim alınmadı', 'Kötü niyetli kullanım'],
                            'Engellenen numara bu şubeden online sipariş veremez. Engel "Online sipariş → Engelli numaralar"dan kaldırılır.',
                            'Numarayı engelle', block, false)}

                        {step === 'main' && isNew && (
                            <>
                                <div>
                                    <p id="detail-eta" className="mb-1.5 text-[11px] font-semibold uppercase tracking-[.14em] text-muted-foreground">Müşteriye söylenecek süre</p>
                                    <div className="flex gap-1.5" role="radiogroup" aria-labelledby="detail-eta">
                                        {etaChoices.map(m => (
                                            <button
                                                key={m}
                                                type="button"
                                                role="radio"
                                                aria-checked={eta === m}
                                                onClick={() => setEta(m)}
                                                className={cn(
                                                    'min-h-11 min-w-0 flex-1 rounded-[10px] border text-sm font-bold tabular-nums transition-colors',
                                                    eta === m ? 'border-rb-gold bg-rb-gold text-rb-gold-foreground' : 'border-border bg-card text-foreground hover:border-rb-gold',
                                                    FOCUS
                                                )}
                                            >
                                                {m} dk
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button type="button" onClick={() => openStep('reject')} disabled={busy}
                                        className={cn('min-h-12 w-28 shrink-0 rounded-xl border border-border bg-card text-sm font-semibold text-foreground hover:border-rb-red/50 hover:text-rb-red disabled:opacity-50', FOCUS)}>
                                        Reddet
                                    </button>
                                    <button type="button" onClick={accept} disabled={busy}
                                        className={cn('min-h-12 flex-1 rounded-xl bg-rb-gold text-base font-bold text-rb-gold-foreground hover:brightness-105 disabled:opacity-50', FOCUS)}>
                                        {busy ? 'Kabul ediliyor…' : `Kabul et · ${eta} dk`}
                                    </button>
                                </div>
                            </>
                        )}

                        {step === 'main' && canHandOver && (
                            <div className="flex flex-col gap-3">
                                <p className="text-sm font-semibold text-foreground">
                                    {order.status === DeliveryStatus.Ready ? 'Sipariş hazır. Müşteri gelince ödemeyi alıp teslim edin.' : 'Müşteri geldiyse ödemeyi alıp teslim edin.'}
                                </p>
                                {ownRegisterId === null && (
                                    openRegisters === null ? (
                                        <p className="text-sm text-muted-foreground">Kasalar yükleniyor…</p>
                                    ) : openRegisters.length === 0 ? (
                                        <p className="text-sm text-muted-foreground">Açık günü olan kasa yok. Önce bir kasada gün başlatın.</p>
                                    ) : (
                                        <label className="flex flex-col gap-1 text-xs font-semibold text-muted-foreground">
                                            Hangi kasaya alınsın
                                            <select value={pickedRegisterId} onChange={e => setPickedRegisterId(e.target.value)} disabled={busy}
                                                className="h-11 rounded-lg border border-border bg-card px-2.5 text-sm font-normal text-foreground">
                                                {openRegisters.map(r => (
                                                    <option key={r.cashRegisterId} value={r.cashRegisterId}>
                                                        {r.cashRegisterName}{r.shiftOwnerName ? ` · ${r.shiftOwnerName}` : ''}
                                                    </option>
                                                ))}
                                            </select>
                                        </label>
                                    )
                                )}
                                <div className="flex gap-1.5" role="radiogroup" aria-label="Ödeme şekli">
                                    {pickupMethods.map(m => {
                                        const Icon = m === DoorPayment.Nakit ? Banknote : m === DoorPayment.Iban ? Landmark : CreditCard;
                                        return (
                                            <button key={m} type="button" role="radio" aria-checked={pickupMethod === m} onClick={() => setPickupMethod(m)}
                                                className={cn('flex min-h-11 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-[10px] border text-sm font-bold transition-colors',
                                                    pickupMethod === m ? 'border-rb-gold bg-rb-gold text-rb-gold-foreground' : 'border-border bg-card text-foreground hover:border-rb-gold', FOCUS)}>
                                                <Icon className="h-4 w-4" aria-hidden="true" />
                                                {m === DoorPayment.Nakit ? 'Nakit' : m === DoorPayment.Iban ? 'IBAN geldi' : 'Kart'}
                                            </button>
                                        );
                                    })}
                                </div>
                                <button type="button" onClick={completePickup} disabled={busy || !registerId}
                                    className={cn('min-h-12 w-full rounded-xl bg-rb-gold text-base font-bold text-rb-gold-foreground hover:brightness-105 disabled:opacity-50', FOCUS)}>
                                    {busy ? 'Kaydediliyor…' : `Müşteri aldı · ₺${formatAmount(order.total)} ${doorPaymentWord(pickupMethod)}`}
                                </button>
                            </div>
                        )}

                        {secondary}
                    </footer>
                )}
            </div>
        </Modal>
    );
}
