import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Banknote, Bike, Check, CreditCard, X } from 'lucide-react';
import { Modal, ModalTitle } from '@/components/ui/modal';
import { courierCashService } from '@/features/courier/api/courierService';
import { DoorPayment, type CourierCashSummary } from '@/features/courier/types';
import { useActiveShift } from '@/features/cashier/context/activeShiftStore';
import { shiftService } from '@/features/cashier/api/shiftService';
import type { OpenRegister } from '@/features/cashier/types';
import { subscribeOnlineOrders } from '@/features/delivery/onlineOrdersHub';
import { getApiErrorMessage } from '@/lib/apiError';
import { formatAmount } from '@/lib/format';
import { cn } from '@/lib/utils';

function timeOf(iso?: string | null): string {
    return iso ? new Date(iso).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : '';
}

// Kurye kasası: her kuryenin kapıda tahsil edip kasaya teslim etmediği nakit/kart ve "Teslim al". Teslim alınan siparişler
// kasiyerin kendi açık vardiyasındaki kasaya ödeme olarak yazılır ve kapanır. Yönetici/sahip (açık vardiyası olmayan)
// teslim alırken açık günü olan kasalardan birini seçer. Kendi verisini yönetir; canlı olayları online sipariş panosu ve
// uyarılarla aynı bağlantıdan dinler. Online sipariş panosunun "Kurye kasası" görünümüdür.
export default function CourierCashPanel() {
    const { shift } = useActiveShift();
    const [couriers, setCouriers] = useState<CourierCashSummary[]>([]);
    const [handoverFor, setHandoverFor] = useState<CourierCashSummary | null>(null);
    const [loaded, setLoaded] = useState(false);

    const load = useCallback(() => {
        courierCashService.getCouriers()
            .then(list => { setCouriers(list); setLoaded(true); })
            .catch(() => {});
    }, []);

    useEffect(() => {
        load();
        // Kurye teslim edince ya da başka bir kasiyer teslim alınca liste değişir.
        const unsubscribe = subscribeOnlineOrders(load);
        window.addEventListener('focus', load);
        return () => {
            unsubscribe();
            window.removeEventListener('focus', load);
        };
    }, [load]);

    // Açık modaldaki kurye listede yenilenirse modal da güncel siparişleri göstersin.
    const openCourier = handoverFor ? couriers.find(c => c.userId === handoverFor.userId) ?? handoverFor : null;

    if (couriers.length === 0) {
        return !loaded ? null : <p className="text-sm text-muted-foreground">Şubede kurye yok. Çalışanlar sayfasından Kurye rolüyle ekleyebilirsiniz.</p>;
    }

    const pending = couriers.filter(c => c.outstandingOrders.length > 0 || c.openOrderCount > 0);

    return (
        <section aria-labelledby="courier-cash-title" className="mb-6">
            <div className="mb-3 flex items-center gap-2">
                <h2 id="courier-cash-title" className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">
                    Kurye Kasası
                </h2>
            </div>

            {pending.length === 0 ? (
                <p className="text-sm text-muted-foreground">Kuryelerde teslim alınacak tahsilat yok.</p>
            ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {pending.map(courier => (
                        <div key={courier.userId} className="flex flex-col gap-3 rounded-2xl border bg-card p-4">
                            <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                    <p className="flex items-center gap-1.5 font-serif text-lg font-bold text-foreground">
                                        <Bike className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                                        <span className="truncate">{courier.fullName}</span>
                                    </p>
                                    {courier.openOrderCount > 0 && (
                                        <p className="text-xs text-muted-foreground">
                                            Üzerinde {courier.openOrderCount} sipariş{courier.onTheWayCount > 0 ? ` · ${courier.onTheWayCount} yolda` : ''}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-sm">
                                <div className="rounded-xl bg-rb-green-bg px-3 py-2">
                                    <p className="text-xs font-semibold text-rb-green">Nakit · {courier.outstandingCashOrderCount}</p>
                                    <p className="font-serif text-lg font-bold tabular-nums text-foreground">₺{formatAmount(courier.outstandingCash)}</p>
                                </div>
                                <div className="rounded-xl bg-rb-accent-bg px-3 py-2">
                                    <p className="text-xs font-semibold text-rb-accent">Kart · {courier.outstandingCardOrderCount}</p>
                                    <p className="font-serif text-lg font-bold tabular-nums text-foreground">₺{formatAmount(courier.outstandingCard)}</p>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() => setHandoverFor(courier)}
                                disabled={courier.outstandingOrders.length === 0}
                                className="min-h-12 rounded-xl bg-rb-gold px-3 text-sm font-semibold text-rb-gold-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
                            >
                                {courier.outstandingOrders.length === 0 ? 'Teslim alınacak sipariş yok' : 'Teslim al'}
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {openCourier && (
                <HandoverModal
                    courier={openCourier}
                    cashRegisterId={shift?.cashRegisterId ?? null}
                    cashRegisterName={shift?.cashRegisterName ?? ''}
                    onClose={() => setHandoverFor(null)}
                    onDone={() => { setHandoverFor(null); load(); }}
                />
            )}
        </section>
    );
}

interface HandoverModalProps {
    courier: CourierCashSummary;
    /**
     * Kasiyerin açık vardiyasının kasası: ödeme kuralı gereği yalnızca kendi gününe alınır. null (yönetici/sahip):
     * açık günü olan kasalardan biri seçilir.
     */
    cashRegisterId: string | null;
    cashRegisterName: string;
    onClose: () => void;
    onDone: () => void;
}

function HandoverModal({ courier, cashRegisterId: ownRegisterId, cashRegisterName: ownRegisterName, onClose, onDone }: HandoverModalProps) {
    const pickRegister = ownRegisterId === null;
    const [openRegisters, setOpenRegisters] = useState<OpenRegister[] | null>(null);
    const [pickedRegisterId, setPickedRegisterId] = useState<string>('');

    useEffect(() => {
        if (!pickRegister) return;
        shiftService.getOpenRegisters()
            .then(list => {
                setOpenRegisters(list);
                setPickedRegisterId(current => current || list[0]?.cashRegisterId || '');
            })
            .catch(() => setOpenRegisters([]));
    }, [pickRegister]);

    const cashRegisterId = pickRegister ? (pickedRegisterId || null) : ownRegisterId;
    const cashRegisterName = pickRegister
        ? openRegisters?.find(r => r.cashRegisterId === pickedRegisterId)?.cashRegisterName ?? ''
        : ownRegisterName;
    const orders = courier.outstandingOrders;
    const [selected, setSelected] = useState<Set<string>>(() => new Set(orders.map(o => o.deliveryOrderId)));
    const [submitting, setSubmitting] = useState(false);

    // Listede artık olmayan (başka kasada teslim alınmış) siparişler seçimden düşer.
    const selectedIds = useMemo(
        () => orders.filter(o => selected.has(o.deliveryOrderId)).map(o => o.deliveryOrderId),
        [orders, selected],
    );
    const totals = useMemo(() => {
        let cash = 0, card = 0;
        for (const o of orders) {
            if (!selected.has(o.deliveryOrderId)) continue;
            if (o.collectedMethod === DoorPayment.Nakit) cash += o.collectedAmount;
            else card += o.collectedAmount;
        }
        return { cash, card };
    }, [orders, selected]);

    const toggle = (id: string) => setSelected(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
    });

    const allSelected = selectedIds.length === orders.length;

    const confirm = async () => {
        if (!cashRegisterId) {
            toast.error(pickRegister ? 'Teslim almak için açık günü olan bir kasa seçin.' : 'Teslim almak için açık bir vardiyanız olmalı.');
            return;
        }
        if (selectedIds.length === 0) return;
        setSubmitting(true);
        try {
            const result = await courierCashService.handover(courier.userId, cashRegisterId, selectedIds);
            const parts = [
                result.cashAmount > 0 ? `nakit ₺${formatAmount(result.cashAmount)}` : null,
                result.cardAmount > 0 ? `kart ₺${formatAmount(result.cardAmount)}` : null,
            ].filter(Boolean).join(', ');
            toast.success(`${courier.fullName}: ${result.settledCount} sipariş teslim alındı${parts ? ` (${parts})` : ''}.`);
            onDone();
        } catch (err) {
            toast.error(getApiErrorMessage(err, 'Teslim alınamadı. Listeyi yenileyip tekrar deneyin.'));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal onClose={onClose} closeOnOverlay={!submitting} overlayClassName="z-80 bg-black/60 backdrop-blur-[3px] p-4">
            <div className="flex max-h-[90dvh] w-full max-w-md flex-col rounded-2xl border border-border bg-card shadow-2xl">
                <div className="flex items-start justify-between gap-3 p-5 pb-3">
                    <div className="min-w-0">
                        <ModalTitle className="font-serif text-lg font-bold text-foreground">Teslim al · {courier.fullName}</ModalTitle>
                        {pickRegister ? (
                            openRegisters === null ? (
                                <p className="mt-0.5 text-sm text-muted-foreground">Kasalar yükleniyor…</p>
                            ) : openRegisters.length === 0 ? (
                                <p className="mt-0.5 text-sm text-muted-foreground">Açık günü olan kasa yok. Önce bir kasada gün başlatın.</p>
                            ) : (
                                <label className="mt-1.5 flex flex-col gap-1 text-xs font-semibold text-muted-foreground">
                                    Hangi kasaya alınsın
                                    <select
                                        value={pickedRegisterId}
                                        onChange={e => setPickedRegisterId(e.target.value)}
                                        disabled={submitting}
                                        className="h-10 rounded-lg border border-border bg-card px-2.5 text-sm font-normal text-foreground"
                                    >
                                        {openRegisters.map(r => (
                                            <option key={r.cashRegisterId} value={r.cashRegisterId}>
                                                {r.cashRegisterName}{r.shiftOwnerName ? ` · ${r.shiftOwnerName}` : ''}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                            )
                        ) : (
                            <p className="mt-0.5 text-sm text-muted-foreground">
                                {cashRegisterId ? `Kasa: ${cashRegisterName}` : 'Açık vardiyanız yok.'}
                            </p>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={submitting}
                        aria-label="Kapat"
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="flex items-center justify-between px-5 pb-2">
                    <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">{orders.length} sipariş</p>
                    <button
                        type="button"
                        onClick={() => setSelected(allSelected ? new Set() : new Set(orders.map(o => o.deliveryOrderId)))}
                        className="min-h-9 text-xs font-semibold text-rb-accent hover:underline"
                    >
                        {allSelected ? 'Seçimi kaldır' : 'Tümünü seç'}
                    </button>
                </div>

                <ul className="flex-1 divide-y divide-border overflow-y-auto border-y border-border">
                    {orders.map(order => {
                        const checked = selected.has(order.deliveryOrderId);
                        const cash = order.collectedMethod === DoorPayment.Nakit;
                        return (
                            <li key={order.deliveryOrderId}>
                                <button
                                    type="button"
                                    role="checkbox"
                                    aria-checked={checked}
                                    onClick={() => toggle(order.deliveryOrderId)}
                                    className="flex min-h-14 w-full items-center gap-3 px-5 py-2 text-left transition-colors hover:bg-muted"
                                >
                                    <span className={cn(
                                        'flex h-5 w-5 shrink-0 items-center justify-center rounded border',
                                        checked ? 'border-rb-gold bg-rb-gold text-rb-gold-foreground' : 'border-border',
                                    )}>
                                        {checked && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate text-sm font-bold text-foreground">
                                            PAKET #{order.number}{order.zoneName ? ` · ${order.zoneName}` : ''}
                                        </span>
                                        <span className="block truncate text-xs text-muted-foreground">
                                            {[order.customerName, timeOf(order.deliveredAt)].filter(Boolean).join(' · ')}
                                        </span>
                                    </span>
                                    <span className="flex shrink-0 flex-col items-end gap-0.5">
                                        <span className={cn(
                                            'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold',
                                            cash ? 'bg-rb-green-bg text-rb-green' : 'bg-rb-accent-bg text-rb-accent',
                                        )}>
                                            {cash ? <Banknote className="h-3 w-3" aria-hidden="true" /> : <CreditCard className="h-3 w-3" aria-hidden="true" />}
                                            {cash ? 'NAKİT' : 'KART'}
                                        </span>
                                        <span className="font-serif text-base font-bold tabular-nums text-foreground">₺{formatAmount(order.collectedAmount)}</span>
                                    </span>
                                </button>
                            </li>
                        );
                    })}
                </ul>

                <div className="flex flex-col gap-3 p-5">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                        <p className="text-muted-foreground">
                            Kasaya girecek nakit
                            <span className="block font-serif text-lg font-bold tabular-nums text-rb-green">₺{formatAmount(totals.cash)}</span>
                        </p>
                        <p className="text-muted-foreground">
                            Kart
                            <span className="block font-serif text-lg font-bold tabular-nums text-foreground">₺{formatAmount(totals.card)}</span>
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={confirm}
                        disabled={submitting || selectedIds.length === 0 || !cashRegisterId}
                        className="min-h-12 w-full rounded-xl bg-rb-gold py-3 text-sm font-semibold text-rb-gold-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                    >
                        {submitting
                            ? 'Teslim alınıyor…'
                            : `${selectedIds.length} siparişi teslim al · ₺${formatAmount(totals.cash + totals.card)}`}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
