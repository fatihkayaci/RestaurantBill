import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Banknote, Check, CheckCircle2, ChevronDown, Clock, CreditCard, Landmark } from 'lucide-react';
import { courierCashService } from '@/features/courier/api/courierService';
import { DoorPayment, doorPaymentWord, type CourierCashSummary, type CourierHandoverHistory } from '@/features/courier/types';
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

function dateTimeOf(iso?: string | null): string {
    return iso ? new Date(iso).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';
}

/** "1 sa 10 dk" / "25 dk": verilen andan bu yana. */
function elapsedText(iso: string, now: number): string {
    const minutes = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60_000));
    if (minutes < 60) return `${minutes} dk`;
    const rest = minutes % 60;
    return rest ? `${Math.floor(minutes / 60)} sa ${rest} dk` : `${Math.floor(minutes / 60)} sa`;
}

function initialsOf(name: string): string {
    return name.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]?.toLocaleUpperCase('tr-TR')).join('') || '?';
}

function isToday(iso: string): boolean {
    const d = new Date(iso);
    const t = new Date();
    return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate();
}

/** Sayım farkı: eksi kırmızı (eksik), artı sarı (fazla), sıfır yeşil. */
function differenceText(diff: number): string {
    if (diff === 0) return 'Fark yok';
    return diff < 0 ? `₺${formatAmount(Math.abs(diff))} eksik` : `₺${formatAmount(diff)} fazla`;
}

function differenceClass(diff: number): string {
    return diff < 0 ? 'text-rb-red' : diff > 0 ? 'text-rb-amber' : 'text-rb-green';
}

/** Kuryenin şu anki durumu: "2 yolda" / "boşta" / "1 bekliyor". */
function loadText(c: CourierCashSummary): string {
    if (c.onTheWayCount > 0) return `${c.onTheWayCount} yolda`;
    if (c.openOrderCount === 0) return 'boşta';
    return `${c.openOrderCount} sipariş bekliyor`;
}

// Kurye kasası (kurye defteri): bütün kuryeler tek ekranda; her satır kuryenin kapıda tahsil edip kasaya teslim etmediği
// tutarı gösterir, açılınca siparişler, sayım ve "Teslim al" yerinde yapılır (modal yok). Önceki günden kalan para
// kırmızıyla en üstte. Teslim alınan siparişler kasiyerin açık vardiyasındaki kasaya yazılır; yönetici/sahip açık günü olan
// kasalardan birini seçer. Canlı olayları online sipariş panosu ve uyarılarla aynı bağlantıdan dinler.
/** initialCourierId: panodaki kurye kutusundan açılınca o kurye açık gelir. */
export default function CourierCashPanel({ initialCourierId }: { initialCourierId?: string } = {}) {
    const { shift } = useActiveShift();
    const [couriers, setCouriers] = useState<CourierCashSummary[]>([]);
    const [history, setHistory] = useState<CourierHandoverHistory[]>([]);
    const [loaded, setLoaded] = useState(false);
    /** undefined: kendiliğinden (tek kurye varsa açık); null: hepsi kapalı. */
    const [expandedId, setExpandedId] = useState<string | null | undefined>(initialCourierId);
    const [historyOpen, setHistoryOpen] = useState(false);
    const [now, setNow] = useState(() => Date.now());

    const load = useCallback(() => {
        courierCashService.getCouriers()
            .then(list => { setCouriers(list); setLoaded(true); })
            .catch(() => {});
        courierCashService.getHandovers()
            .then(setHistory)
            .catch(() => {});
    }, []);

    useEffect(() => {
        load();
        // Kurye teslim edince ya da başka bir kasiyer teslim alınca liste değişir.
        const unsubscribe = subscribeOnlineOrders(load);
        window.addEventListener('focus', load);
        const timer = window.setInterval(() => setNow(Date.now()), 60_000);
        return () => {
            unsubscribe();
            window.removeEventListener('focus', load);
            window.clearInterval(timer);
        };
    }, [load]);

    // Önceki günden kalanlar önce, sonra en eski tahsilat.
    const pending = useMemo(() => couriers
        .filter(c => c.outstandingOrders.length > 0 || c.openOrderCount > 0)
        .sort((a, b) => {
            const prev = Number(b.previousDayOrderCount > 0) - Number(a.previousDayOrderCount > 0);
            if (prev !== 0) return prev;
            const at = a.oldestCollectedAt ?? '9999';
            const bt = b.oldestCollectedAt ?? '9999';
            return at.localeCompare(bt) || a.fullName.localeCompare(b.fullName, 'tr');
        }), [couriers]);

    const totals = useMemo(() => pending.reduce(
        (sum, c) => ({ cash: sum.cash + c.outstandingCash, card: sum.card + c.outstandingCard }),
        { cash: 0, card: 0 },
    ), [pending]);

    const today = useMemo(() => {
        const items = history.filter(h => isToday(h.settledAt));
        return {
            orders: items.reduce((s, h) => s + h.orderCount, 0),
            amount: items.reduce((s, h) => s + (h.countedCash ?? h.expectedCash) + h.cardAmount, 0),
        };
    }, [history]);

    if (couriers.length === 0) {
        return !loaded ? null : <p className="text-sm text-muted-foreground">Şubede kurye yok. Çalışanlar sayfasından Kurye rolüyle ekleyebilirsiniz.</p>;
    }

    const autoId = pending.length === 1 && pending[0].outstandingOrders.length > 0 ? pending[0].userId : null;
    const openId = expandedId === undefined ? autoId : expandedId;

    return (
        <section aria-labelledby="courier-cash-title" className="mb-6 flex max-w-3xl flex-col gap-3">
            <h2 id="courier-cash-title" className="sr-only">Kurye kasası</h2>

            {/* Kuryelerde toplam */}
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-2xl bg-sidebar px-4 py-3 text-sidebar-foreground">
                <span className="text-sm">Kuryelerde toplam</span>
                <span className="flex gap-4 text-sm">
                    <b className="tabular-nums text-[#45C87A]">₺{formatAmount(totals.cash)} nakit</b>
                    <b className="tabular-nums">₺{formatAmount(totals.card)} kart</b>
                </span>
            </div>

            {pending.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                    Kuryelerde teslim alınacak tahsilat yok.
                </p>
            ) : (
                <ul className="flex flex-col gap-3">
                    {pending.map(courier => (
                        <li key={courier.userId}>
                            <CourierRow
                                courier={courier}
                                now={now}
                                open={openId === courier.userId}
                                onToggle={() => setExpandedId(openId === courier.userId ? null : courier.userId)}
                                cashRegisterId={shift?.cashRegisterId ?? null}
                                cashRegisterName={shift?.cashRegisterName ?? ''}
                                onDone={() => { setExpandedId(null); load(); }}
                            />
                        </li>
                    ))}
                </ul>
            )}

            <div className="flex min-h-12 items-center gap-3 rounded-2xl border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="flex-1">
                    Bugün teslim alınanlar: {today.orders} sipariş · <span className="tabular-nums">₺{formatAmount(today.amount)}</span>
                </span>
                {history.length > 0 && (
                    <button
                        type="button"
                        onClick={() => setHistoryOpen(v => !v)}
                        aria-expanded={historyOpen}
                        className="flex min-h-10 shrink-0 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-foreground hover:bg-muted"
                    >
                        Teslim geçmişi
                        <ChevronDown className={cn('h-4 w-4 transition-transform', historyOpen && 'rotate-180')} aria-hidden="true" />
                    </button>
                )}
            </div>

            {historyOpen && <HandoverHistory items={history} />}
        </section>
    );
}

interface CourierRowProps {
    courier: CourierCashSummary;
    now: number;
    open: boolean;
    onToggle: () => void;
    /**
     * Kasiyerin açık vardiyasının kasası: ödeme kuralı gereği yalnızca kendi gününe alınır. null (yönetici/sahip):
     * açık günü olan kasalardan biri seçilir.
     */
    cashRegisterId: string | null;
    cashRegisterName: string;
    onDone: () => void;
}

// Defterde bir kurye: özet satırı; açılınca yerinde teslim alma.
function CourierRow({ courier, now, open, onToggle, cashRegisterId, cashRegisterName, onDone }: CourierRowProps) {
    const hasOrders = courier.outstandingOrders.length > 0;
    const previous = courier.previousDayOrderCount > 0;
    const sub = [
        `${courier.outstandingOrders.length} teslim`,
        loadText(courier),
        courier.oldestCollectedAt ? `ilk tahsilat ${timeOf(courier.oldestCollectedAt)} (${elapsedText(courier.oldestCollectedAt, now)})` : null,
    ].filter(Boolean).join(' · ');

    const summary = (
        <>
            <span className={cn(
                'flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold',
                hasOrders ? 'bg-rb-gold/30 text-foreground' : 'bg-muted text-muted-foreground',
            )} aria-hidden="true">
                {initialsOf(courier.fullName)}
            </span>
            <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold text-foreground">{courier.fullName}</span>
                {previous ? (
                    <span className="block text-xs font-semibold text-rb-red">
                        Dünden kalan{courier.previousDayCash > 0 ? ` ₺${formatAmount(courier.previousDayCash)}` : ''} · {courier.previousDayOrderCount} sipariş
                    </span>
                ) : null}
                <span className="block truncate text-xs text-muted-foreground">{sub}</span>
            </span>
            <span className="flex shrink-0 flex-col items-end">
                <b className="font-serif text-lg tabular-nums text-foreground">₺{formatAmount(courier.outstandingCash)}</b>
                {courier.outstandingCard > 0 && (
                    <span className="text-[11px] font-semibold tabular-nums text-rb-accent">+ ₺{formatAmount(courier.outstandingCard)} kart</span>
                )}
            </span>
        </>
    );

    return (
        <div className={cn(
            'overflow-hidden rounded-2xl border bg-card',
            previous ? 'border-rb-red/40 bg-rb-red-bg' : 'border-border',
            open && !previous && 'shadow-[0_12px_30px_-18px_rgba(0,0,0,.35)]',
        )}>
            {hasOrders ? (
                <button
                    type="button"
                    onClick={onToggle}
                    aria-expanded={open}
                    className="flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left"
                >
                    {summary}
                    <ChevronDown className={cn('h-5 w-5 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')} aria-hidden="true" />
                </button>
            ) : (
                // Üzerinde sipariş var ama henüz tahsilat yok: teslim alınacak bir şey yok.
                <div className="flex min-h-16 items-center gap-3 px-4 py-3 opacity-80">
                    {summary}
                    <span className="w-5 shrink-0" aria-hidden="true" />
                </div>
            )}

            {open && hasOrders && (
                <HandoverForm
                    key={courier.userId}
                    courier={courier}
                    cashRegisterId={cashRegisterId}
                    cashRegisterName={cashRegisterName}
                    onDone={onDone}
                />
            )}
        </div>
    );
}

interface HandoverFormProps {
    courier: CourierCashSummary;
    cashRegisterId: string | null;
    cashRegisterName: string;
    onDone: () => void;
}

function HandoverForm({ courier, cashRegisterId: ownRegisterId, cashRegisterName: ownRegisterName, onDone }: HandoverFormProps) {
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
    const orders = courier.outstandingOrders;
    const [selected, setSelected] = useState<Set<string>>(() => new Set(orders.map(o => o.deliveryOrderId)));
    const [submitting, setSubmitting] = useState(false);
    // Kuryeden alınan nakdin sayımı: beklenenle farkı teslim kaydına yazılır (teslimi durdurmaz).
    const [counted, setCounted] = useState('');

    // Listede artık olmayan (başka kasada teslim alınmış) siparişler seçimden düşer.
    const selectedIds = useMemo(
        () => orders.filter(o => selected.has(o.deliveryOrderId)).map(o => o.deliveryOrderId),
        [orders, selected],
    );
    const totals = useMemo(() => {
        // IBAN (havale) ayrı sayılır: kuryede para yok, banka hesabından kontrol edilir.
        let cash = 0, card = 0, iban = 0;
        for (const o of orders) {
            if (!selected.has(o.deliveryOrderId)) continue;
            if (o.collectedMethod === DoorPayment.Nakit) cash += o.collectedAmount;
            else if (o.collectedMethod === DoorPayment.Iban) iban += o.collectedAmount;
            else card += o.collectedAmount;
        }
        return { cash, card, iban };
    }, [orders, selected]);
    const cashCount = orders.filter(o => selected.has(o.deliveryOrderId) && o.collectedMethod === DoorPayment.Nakit).length;

    const toggle = (id: string) => setSelected(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
    });

    const allSelected = selectedIds.length === orders.length;
    const hasCash = totals.cash > 0;
    const countedValue = counted.trim() === '' ? null : Number(counted.replace(',', '.'));
    const countedValid = countedValue !== null && Number.isFinite(countedValue) && countedValue >= 0;
    const difference = countedValid ? Math.round((countedValue - totals.cash) * 100) / 100 : null;

    const confirm = async () => {
        if (!cashRegisterId) {
            toast.error(pickRegister ? 'Teslim almak için açık günü olan bir kasa seçin.' : 'Teslim almak için açık bir vardiyanız olmalı.');
            return;
        }
        if (selectedIds.length === 0) return;
        if (hasCash && !countedValid) {
            toast.error('Kuryeden aldığınız nakdi sayıp tutarı yazın.');
            return;
        }
        setSubmitting(true);
        try {
            const result = await courierCashService.handover(courier.userId, cashRegisterId, selectedIds, hasCash ? countedValue : null);
            const parts = [
                result.cashAmount > 0 ? `nakit ₺${formatAmount(result.cashAmount)}` : null,
                result.cardAmount > 0 ? `${totals.iban > 0 ? 'kart/IBAN' : 'kart'} ₺${formatAmount(result.cardAmount)}` : null,
            ].filter(Boolean).join(', ');
            const diffNote = result.cashDifference ? ` Sayım farkı: ${differenceText(result.cashDifference)}.` : '';
            const message = `${courier.fullName}: ${result.settledCount} sipariş teslim alındı${parts ? ` (${parts})` : ''}.${diffNote}`;
            if (result.cashDifference) toast.warning(message);
            else toast.success(message);
            onDone();
        } catch (err) {
            toast.error(getApiErrorMessage(err, 'Teslim alınamadı. Listeyi yenileyip tekrar deneyin.'));
        } finally {
            setSubmitting(false);
        }
    };

    const buttonLabel = submitting
        ? 'Teslim alınıyor…'
        : [
            totals.cash > 0 ? `₺${formatAmount(countedValid && hasCash ? countedValue : totals.cash)} nakit` : null,
            totals.card > 0 ? `₺${formatAmount(totals.card)} kart` : null,
            totals.iban > 0 ? `₺${formatAmount(totals.iban)} IBAN` : null,
        ].filter(Boolean).join(' + ') + ' teslim al' + (difference ? ' · fark kaydedilir' : '');

    return (
        <div className="flex flex-col gap-4 border-t border-border bg-card px-4 py-4">
            {/* Kasa */}
            <div className="flex flex-wrap items-center justify-between gap-2">
                {pickRegister ? (
                    openRegisters === null ? (
                        <p className="text-sm text-muted-foreground">Kasalar yükleniyor…</p>
                    ) : openRegisters.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Açık günü olan kasa yok. Önce bir kasada gün başlatın.</p>
                    ) : (
                        <label className="flex w-full flex-col gap-1 text-xs font-semibold text-muted-foreground sm:w-auto">
                            Hangi kasaya alınsın
                            <select
                                value={pickedRegisterId}
                                onChange={e => setPickedRegisterId(e.target.value)}
                                disabled={submitting}
                                className="h-11 rounded-lg border border-border bg-card px-2.5 text-sm font-normal text-foreground"
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
                    <span className="rounded-full bg-muted px-3 py-1.5 text-sm font-semibold text-foreground">
                        {cashRegisterId ? ownRegisterName || 'Kasa' : 'Açık vardiyanız yok'}
                    </span>
                )}
                <button
                    type="button"
                    onClick={() => setSelected(allSelected ? new Set() : new Set(orders.map(o => o.deliveryOrderId)))}
                    className="min-h-10 px-1 text-xs font-semibold text-rb-accent hover:underline"
                >
                    {allSelected ? 'Seçimi kaldır' : 'Tümünü seç'}
                </button>
            </div>

            {/* Siparişler */}
            <ul className="divide-y divide-border rounded-xl border border-border">
                {orders.map(order => {
                    const checked = selected.has(order.deliveryOrderId);
                    return (
                        <li key={order.deliveryOrderId}>
                            <button
                                type="button"
                                role="checkbox"
                                aria-checked={checked}
                                onClick={() => toggle(order.deliveryOrderId)}
                                disabled={submitting}
                                className="flex min-h-14 w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-muted"
                            >
                                <span className={cn(
                                    'flex h-6 w-6 shrink-0 items-center justify-center rounded-md border',
                                    checked ? 'border-rb-gold bg-rb-gold text-rb-gold-foreground' : 'border-border',
                                )}>
                                    {checked && <Check className="h-4 w-4" aria-hidden="true" />}
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate text-sm font-semibold text-foreground">
                                        #{order.number}{order.zoneName ? ` ${order.zoneName}` : ''} · {doorPaymentWord(order.collectedMethod)}
                                    </span>
                                    <span className="block truncate text-xs text-muted-foreground">
                                        {[
                                            order.customerName,
                                            order.isFromPreviousDay ? dateTimeOf(order.collectedAt ?? order.deliveredAt) : timeOf(order.deliveredAt),
                                        ].filter(Boolean).join(' · ')}
                                    </span>
                                    {order.isFromPreviousDay && (
                                        <span className="mt-0.5 inline-flex items-center gap-1 rounded bg-rb-red-bg px-1.5 py-0.5 text-[10px] font-bold text-rb-red">
                                            <Clock className="h-3 w-3" aria-hidden="true" />ÖNCEKİ GÜN
                                        </span>
                                    )}
                                </span>
                                <span className="flex shrink-0 items-center gap-1.5">
                                    {order.collectedMethod === DoorPayment.Nakit
                                        ? <Banknote className="h-4 w-4 text-rb-green" aria-hidden="true" />
                                        : order.collectedMethod === DoorPayment.Iban
                                            ? <Landmark className="h-4 w-4 text-rb-purple" aria-hidden="true" />
                                            : <CreditCard className="h-4 w-4 text-rb-accent" aria-hidden="true" />}
                                    <span className="font-serif text-base font-bold tabular-nums text-foreground">₺{formatAmount(order.collectedAmount)}</span>
                                </span>
                            </button>
                        </li>
                    );
                })}
            </ul>

            {/* Beklenen / sayılan / fark */}
            {hasCash ? (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <div className="rounded-2xl border border-border bg-card p-3.5">
                        <p className="text-xs font-semibold text-muted-foreground">Beklenen nakit</p>
                        <p className="font-serif text-2xl font-bold tabular-nums text-foreground">₺{formatAmount(totals.cash)}</p>
                        <p className="text-xs text-muted-foreground">{cashCount} sipariş</p>
                    </div>
                    <label className={cn(
                        'flex flex-col rounded-2xl bg-card p-3.5 focus-within:border-2 focus-within:border-foreground',
                        counted.trim() ? 'border-2 border-foreground' : 'border border-border',
                    )}>
                        <span className="text-xs font-semibold text-muted-foreground">Sayılan nakit</span>
                        <span className="flex items-baseline gap-0.5 font-serif text-2xl font-bold text-foreground">
                            ₺
                            <input
                                type="number"
                                inputMode="decimal"
                                min={0}
                                step="0.01"
                                value={counted}
                                onChange={e => setCounted(e.target.value)}
                                disabled={submitting}
                                placeholder="0"
                                aria-label="Sayılan nakit (kuryeden alınan)"
                                className="min-w-0 flex-1 bg-transparent tabular-nums outline-none placeholder:text-muted-foreground/50"
                            />
                        </span>
                        <span className="text-xs text-muted-foreground">Kuryeden aldığınızı sayıp yazın</span>
                    </label>
                    <div className={cn(
                        'rounded-2xl p-3.5',
                        difference === null ? 'border border-dashed border-border'
                            : difference < 0 ? 'bg-rb-red-bg' : difference > 0 ? 'bg-rb-amber-bg' : 'bg-rb-green-bg',
                    )}>
                        <p className={cn('text-xs font-semibold', difference === null ? 'text-muted-foreground' : differenceClass(difference))}>Fark</p>
                        <p className={cn('font-serif text-2xl font-bold tabular-nums', difference === null ? 'text-muted-foreground' : differenceClass(difference))}>
                            {difference === null ? '—' : difference === 0 ? '₺0' : `${difference < 0 ? '−' : '+'}₺${formatAmount(Math.abs(difference))}`}
                        </p>
                        <p className={cn('text-xs', difference === null ? 'text-muted-foreground' : differenceClass(difference))}>
                            {difference === null ? 'Sayım bekleniyor' : difference === 0 ? 'Fark yok' : `${differenceText(difference)} · kayda yazılır`}
                        </p>
                    </div>
                </div>
            ) : totals.card > 0 ? (
                <p className="rounded-xl bg-rb-accent-bg px-3 py-2 text-sm text-rb-accent">
                    Yalnızca kart: ₺{formatAmount(totals.card)}. POS slipleriyle karşılaştırın.
                </p>
            ) : null}
            {totals.iban > 0 && (
                <p className="rounded-xl bg-rb-purple-bg px-3 py-2 text-sm text-rb-purple">
                    IBAN (havale): ₺{formatAmount(totals.iban)}. Kuryede para yok; paranın banka hesabına geçtiğini kontrol edin.
                </p>
            )}

            <button
                type="button"
                onClick={confirm}
                disabled={submitting || selectedIds.length === 0 || !cashRegisterId || (hasCash && !countedValid)}
                className="min-h-14 w-full rounded-xl bg-rb-gold px-4 py-3 text-base font-semibold text-rb-gold-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            >
                {selectedIds.length === 0 && !submitting ? 'Teslim alınacak siparişi seçin' : buttonLabel}
            </button>
        </div>
    );
}

// Teslim geçmişi: son 7 günün teslimleri, beklenen/sayılan nakit ve fark. Sayım girilmeyen (eski) teslimlerde "—".
function HandoverHistory({ items }: { items: CourierHandoverHistory[] }) {
    return (
        <div className="flex flex-col gap-2">
            <h3 className="px-1 text-xs font-semibold tracking-widest uppercase text-muted-foreground">Teslim geçmişi · son 7 gün</h3>
            <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
                {items.map(item => (
                    <li key={`${item.courierUserId}-${item.settledAt}`} className="flex min-h-14 flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-sm">
                        <div className="min-w-0 flex-1">
                            <p className="truncate font-semibold text-foreground">{item.courierName}</p>
                            <p className="truncate text-xs text-muted-foreground" title={item.numbers.map(n => `#${n}`).join(', ')}>
                                {dateTimeOf(item.settledAt)} · {item.orderCount} sipariş{item.settledByName ? ` · alan: ${item.settledByName}` : ''}
                            </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-4 text-right tabular-nums">
                            <div>
                                <p className="text-[11px] text-muted-foreground">Beklenen</p>
                                <p className="font-semibold text-foreground">₺{formatAmount(item.expectedCash)}</p>
                            </div>
                            <div>
                                <p className="text-[11px] text-muted-foreground">Sayılan</p>
                                <p className="font-semibold text-foreground">{item.countedCash !== null ? `₺${formatAmount(item.countedCash)}` : '—'}</p>
                            </div>
                            {item.cardAmount > 0 && (
                                <div>
                                    <p className="text-[11px] text-muted-foreground">Kart</p>
                                    <p className="font-semibold text-foreground">₺{formatAmount(item.cardAmount)}</p>
                                </div>
                            )}
                            <div className="min-w-20">
                                <p className="text-[11px] text-muted-foreground">Fark</p>
                                <p className={cn('font-semibold', item.cashDifference !== null ? differenceClass(item.cashDifference) : 'text-muted-foreground')}>
                                    {item.cashDifference !== null ? differenceText(item.cashDifference) : '—'}
                                </p>
                            </div>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
}
