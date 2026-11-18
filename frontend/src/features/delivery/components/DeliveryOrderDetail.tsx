import { useState } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, Ban, Bike, MapPin, Phone, X } from 'lucide-react';
import { Modal, ModalTitle } from '@/components/ui/modal';
import type { CourierCashSummary } from '@/features/courier/types';
import { mapsUrl, telUrl } from '@/features/courier/types';
import { getApiErrorMessage } from '@/lib/apiError';
import { formatAmount, formatElapsed } from '@/lib/format';
import { cn } from '@/lib/utils';
import { deliveryService } from '../api/deliveryService';
import { CANCEL_REASONS, ETA_CHOICES, REJECT_REASONS, countdownText, orderTitle } from '../deliveryStatus';
import CourierPicker from './CourierPicker';
import LatenessBadge from './LatenessBadge';
import { DeliveryStatus, DoorPayment, doorPaymentWord, type DeliveryOrder } from '../types';

interface Props {
    order: DeliveryOrder;
    couriers: CourierCashSummary[];
    canBlockPhone: boolean;
    now: number;
    onClose: () => void;
    /** İşlemden sonra pano yeniden çeker (canlı olay da gelir). */
    onChanged: () => void;
    /** Panodaki kartın "Reddet"i detayı doğrudan gerekçe adımında açar. */
    initialStep?: 'main' | 'reject';
}

type Step = 'main' | 'reject' | 'cancel' | 'block';

function timeOf(iso?: string | null): string {
    return iso ? new Date(iso).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : '';
}

// Online siparişin detayı ve işlemleri: kabul (süre seçerek), ret (gerekçe müşteriye gösterilir), kurye atama, iptal ve
// numarayı engelleme (Owner/Admin). Yola çıkmış siparişe ürün eklenmez; bu ekranda ürün ekleme yoktur.
export default function DeliveryOrderDetail({ order, couriers, canBlockPhone, now, onClose, onChanged, initialStep = 'main' }: Props) {
    const [step, setStep] = useState<Step>(initialStep);
    const [busy, setBusy] = useState(false);
    const suggested = order.suggestedEtaMinutes > 0 ? order.suggestedEtaMinutes : 30;
    const [eta, setEta] = useState<number>(suggested);
    const [reason, setReason] = useState('');

    const etaChoices = (ETA_CHOICES as readonly number[]).includes(suggested)
        ? [...ETA_CHOICES]
        : [...ETA_CHOICES, suggested].sort((a, b) => a - b);

    const isNew = order.status === DeliveryStatus.Received;
    const canAssign = order.status === DeliveryStatus.Accepted || order.status === DeliveryStatus.Preparing || order.status === DeliveryStatus.Ready;
    const canCancel = canAssign || order.status === DeliveryStatus.OnTheWay;
    const cash = order.paymentPreference === DoorPayment.Nakit;
    const iban = order.paymentPreference === DoorPayment.Iban;

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

    const reasonStep = (title: string, presets: readonly string[], warning: string | null, confirmLabel: string, onConfirm: () => void, required: boolean) => (
        <div className="flex flex-col gap-3">
            <p className="text-sm font-semibold text-foreground">{title}</p>
            {warning && (
                <p className="flex items-start gap-2 rounded-lg bg-rb-amber-bg px-3 py-2 text-xs text-rb-amber">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    {warning}
                </p>
            )}
            <div className="flex flex-wrap gap-2">
                {presets.map(p => (
                    <button
                        key={p}
                        type="button"
                        onClick={() => setReason(p)}
                        className={cn(
                            'min-h-10 rounded-full border px-3 text-left text-xs font-semibold transition-colors',
                            reason === p ? 'border-rb-gold bg-rb-gold text-rb-gold-foreground' : 'border-border bg-card text-foreground hover:border-rb-gold'
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
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground"
            />
            <div className="flex gap-2">
                <button type="button" onClick={() => { setStep('main'); setReason(''); }} disabled={busy}
                    className="min-h-12 flex-1 rounded-xl border border-border text-sm font-semibold text-foreground">Vazgeç</button>
                <button type="button" onClick={onConfirm} disabled={busy || (required && !reason.trim())}
                    className="min-h-12 flex-1 rounded-xl bg-rb-red text-sm font-semibold text-rb-red-foreground disabled:opacity-50">
                    {busy ? 'Gönderiliyor…' : confirmLabel}
                </button>
            </div>
        </div>
    );

    return (
        <Modal onClose={onClose} closeOnOverlay={!busy} overlayClassName="z-80 bg-black/60 backdrop-blur-[3px] sm:p-4">
            <div className="flex h-dvh w-full max-w-lg flex-col bg-card shadow-2xl sm:h-auto sm:max-h-[92dvh] sm:rounded-2xl sm:border sm:border-border">
                <div className="flex items-start justify-between gap-3 border-b border-border p-4 sm:p-5">
                    <div className="min-w-0">
                        <ModalTitle className="font-serif text-xl font-bold text-foreground">Paket {orderTitle(order)}</ModalTitle>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                            {order.statusLabel} · {timeOf(order.createdAt)} ({formatElapsed(order.createdAt, now)} önce)
                        </p>
                    </div>
                    <button type="button" onClick={onClose} aria-label="Kapat"
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted hover:text-foreground">
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
                    {/* Müşteri */}
                    <section className="space-y-1.5 rounded-xl border border-border p-3 text-sm">
                        <p className="flex flex-wrap items-center gap-2 font-semibold text-foreground">
                            {order.customerName}
                            {order.isPhoneBlocked && (
                                <span className="rounded bg-rb-red-bg px-1.5 py-0.5 text-[10px] font-bold text-rb-red">ENGELLİ NUMARA</span>
                            )}
                        </p>
                        <a href={telUrl(order.customerPhone)} className="flex min-h-9 items-center gap-1.5 font-semibold text-rb-accent">
                            <Phone className="h-4 w-4" aria-hidden="true" />{order.customerPhone}
                        </a>
                        <a href={mapsUrl([order.address, order.zoneName].filter(Boolean).join(', '))} target="_blank" rel="noreferrer"
                            className="flex items-start gap-1.5 text-foreground hover:underline">
                            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                            <span>{order.address}{order.zoneName ? ` · ${order.zoneName}` : ''}</span>
                        </a>
                        {order.addressDirections && <p className="text-muted-foreground">Tarif: {order.addressDirections}</p>}
                        {order.note && <p className="rounded-lg bg-rb-amber-bg px-2.5 py-1.5 text-rb-amber">Not: {order.note}</p>}
                    </section>

                    {/* Ürünler */}
                    <section>
                        <ul className="divide-y divide-border text-sm">
                            {order.lines.map((line, i) => (
                                <li key={i} className="flex items-start justify-between gap-3 py-2">
                                    <div className="min-w-0">
                                        <p className="font-semibold text-foreground">{line.quantity}× {line.name}</p>
                                        {line.selections.length > 0 && <p className="text-xs text-muted-foreground">{line.selections.join(', ')}</p>}
                                        {line.note && <p className="text-xs text-rb-amber">{line.note}</p>}
                                    </div>
                                    <span className="shrink-0 tabular-nums text-foreground">₺{formatAmount(line.lineTotal)}</span>
                                </li>
                            ))}
                        </ul>
                        <dl className="mt-2 space-y-1 border-t border-border pt-2 text-sm">
                            <div className="flex justify-between text-muted-foreground"><dt>Ara toplam</dt><dd className="tabular-nums">₺{formatAmount(order.subtotal)}</dd></div>
                            <div className="flex justify-between text-muted-foreground"><dt>Teslimat</dt><dd className="tabular-nums">₺{formatAmount(order.deliveryFee)}</dd></div>
                            <div className="flex justify-between font-serif text-lg font-bold text-foreground"><dt>Toplam</dt><dd className="tabular-nums">₺{formatAmount(order.total)}</dd></div>
                        </dl>
                        <p className={cn('mt-1 inline-flex rounded px-2 py-0.5 text-xs font-bold',
                            cash ? 'bg-rb-green-bg text-rb-green' : iban ? 'bg-rb-purple-bg text-rb-purple' : 'bg-rb-accent-bg text-rb-accent')}>
                            {iban ? 'IBAN (havale) · kurye para almaz' : `Kapıda ${cash ? 'nakit' : 'kart'}`}
                        </p>
                    </section>

                    {/* Durum bilgisi */}
                    {(order.estimatedMinutes || order.dispatchedAt || order.deliveredAt) && (
                        <section className="space-y-1 text-sm text-muted-foreground">
                            {order.acceptedAt && order.estimatedMinutes && (
                                <p className="flex flex-wrap items-center gap-2">
                                    Kabul {timeOf(order.acceptedAt)} · müşteriye {order.estimatedMinutes} dk söylendi
                                    <LatenessBadge order={order} now={now} />
                                </p>
                            )}
                            {order.dispatchedAt && <p>Yola çıktı {timeOf(order.dispatchedAt)}</p>}
                            {order.deliveredAt && (
                                <p>
                                    Teslim {timeOf(order.deliveredAt)}
                                    {order.collectedMethod && ` · ${doorPaymentWord(order.collectedMethod)} ₺${formatAmount(order.collectedAmount ?? 0)}`}
                                    {order.settledAt ? ' · kasaya alındı' : ' · kurye kasaya teslim etmedi'}
                                </p>
                            )}
                        </section>
                    )}

                    {/* Kurye */}
                    {(canAssign || order.courierName) && step === 'main' && (
                        <section className="space-y-1.5">
                            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                                <Bike className="h-3.5 w-3.5" aria-hidden="true" />Kurye
                                {canAssign && !order.courierUserId && <span className="normal-case tracking-normal text-rb-amber">· atanmadı</span>}
                            </p>
                            {canAssign ? (
                                <CourierPicker couriers={couriers} selectedId={order.courierUserId} disabled={busy} onPick={assign} />
                            ) : (
                                <p className="text-sm font-semibold text-foreground">{order.courierName}</p>
                            )}
                        </section>
                    )}

                    {step === 'reject' && reasonStep('Neden reddediyorsunuz?', REJECT_REASONS,
                        'Gerekçe müşterinin takip sayfasında görünür.', 'Reddet', reject, true)}
                    {step === 'cancel' && reasonStep('Neden iptal ediyorsunuz?', CANCEL_REASONS,
                        'Gerekçe müşterinin takip sayfasında görünür. Mutfaktaki sipariş de iptal olur.', 'İptal et', cancel, true)}
                    {step === 'block' && reasonStep('Bu numara engellensin mi?', ['Sahte sipariş', 'Teslim alınmadı', 'Kötü niyetli kullanım'],
                        'Engellenen numara bu şubeden online sipariş veremez. Engel "Online sipariş → Engelli numaralar"dan kaldırılır.',
                        'Numarayı engelle', block, false)}
                </div>

                {step === 'main' && (
                    <div className="space-y-3 border-t border-border p-4 sm:p-5">
                        {isNew && (
                            <>
                                {order.autoRejectAt && (
                                    <p className="text-xs font-semibold text-rb-amber">
                                        Yanıtlanmazsa {countdownText(order.autoRejectAt, now)} içinde otomatik reddedilir.
                                    </p>
                                )}
                                <div>
                                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Teslim süresi</p>
                                    <div className="grid grid-cols-4 gap-2">
                                        {etaChoices.map(m => (
                                            <button
                                                key={m}
                                                type="button"
                                                onClick={() => setEta(m)}
                                                aria-pressed={eta === m}
                                                className={cn(
                                                    'min-h-12 rounded-xl border text-sm font-bold tabular-nums transition-colors',
                                                    eta === m ? 'border-rb-gold bg-rb-gold text-rb-gold-foreground' : 'border-border bg-card text-foreground hover:border-rb-gold'
                                                )}
                                            >
                                                {m} dk
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button type="button" onClick={() => { setReason(''); setStep('reject'); }} disabled={busy}
                                        className="min-h-12 flex-1 rounded-xl border border-rb-red/40 text-sm font-semibold text-rb-red hover:bg-rb-red-bg">
                                        Reddet
                                    </button>
                                    <button type="button" onClick={accept} disabled={busy}
                                        className="min-h-12 flex-[2] rounded-xl bg-rb-green text-sm font-semibold text-rb-green-foreground hover:opacity-90 disabled:opacity-50">
                                        {busy ? 'Kabul ediliyor…' : `Kabul et · ${eta} dk`}
                                    </button>
                                </div>
                            </>
                        )}
                        <div className="flex flex-wrap gap-2">
                            {canCancel && (
                                <button type="button" onClick={() => { setReason(''); setStep('cancel'); }} disabled={busy}
                                    className="min-h-11 flex-1 rounded-xl border border-border px-3 text-sm font-semibold text-foreground hover:border-rb-red/40 hover:text-rb-red">
                                    Siparişi iptal et
                                </button>
                            )}
                            {canBlockPhone && !order.isPhoneBlocked && (
                                <button type="button" onClick={() => { setReason(''); setStep('block'); }} disabled={busy}
                                    className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border border-border px-3 text-sm font-semibold text-muted-foreground hover:text-rb-red">
                                    <Ban className="h-4 w-4" aria-hidden="true" />Numarayı engelle
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
}
