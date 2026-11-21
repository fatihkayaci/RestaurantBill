import { useState, type ReactNode } from 'react';
import {
    Armchair, ArrowRight, BellRing, Check, ChevronDown, ChevronRight, Receipt, ReceiptText, ShoppingBasket, UserRound, UtensilsCrossed, Wallet, X,
} from 'lucide-react';
import { ORDER_REQUEST_PENDING, ORDER_REQUEST_REJECTED, type PublicTableBill, type TableOrderLock } from '@/features/customerSite/types';
import { formatPrice } from '@/lib/format';
import { cn } from '@/lib/utils';
import { formatClock, type TableActionState } from '../useTableAction';
import type { SentOrderRequest } from '../useTableOrderRequests';
import { parsePaidAt, timeOf } from './qrModel';
import type { QrPaymentMethod } from './qrPayments';
import { BillLines, RequestList, StatusChip } from './QrOrders';
import { isWaiting, type TableAction } from './tableAction';
import { BillRequestButton, WaiterCallButton } from './TableActionButton';
import Sheet from '../delivery/Sheet';
import { card, column, displayTitle, focusRing, primaryButton } from './qrUi';

// Hesabım sekmesi (sipariş durumu şeridi, masanın adisyonu, Hesap iste ve Öde / ödeme yöntemi penceresi), alt
// gezinme çubuğu (Menü, Sepetim, Hesabım sekmeleri; Garson Çağır düğmesi) ve sepet çubuğu.

export type QrTab = 'menu' | 'cart' | 'account';

function EmptyState({ icon, title, text, action }: { icon: ReactNode; title: string; text: string; action?: ReactNode }) {
    return (
        <div className={cn(card, 'flex flex-col items-center px-6 py-10 text-center')}>
            <span aria-hidden="true" className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--site-accent-soft)] text-[var(--site-accent-text)]">{icon}</span>
            <h2 className="m-0 mt-4 text-[17px] font-extrabold">{title}</h2>
            <p className="m-0 mt-1 max-w-xs text-[15px] leading-relaxed text-[var(--site-sub)]">{text}</p>
            {action}
        </div>
    );
}

// ── Hesabım ──────────────────────────────────────────────────────────────────────────────────

interface AccountTabProps {
    tableName: string;
    regionName: string;
    /** Masanın hesabı (bugün yalnız masa bu telefondaysa ya da hesap az önce ödendiyse); yoksa null. */
    bill: PublicTableBill | null;
    lock: TableOrderLock;
    requests: SentOrderRequest[];
    onOpenMenu: () => void;
    /** Kapalıysa (admin ayarı) null. */
    billRequest: TableAction | null;
    callWaiter: TableAction | null;
    /** Ödeme yöntemleri (qrPayments.ts); boşsa "Öde" düğmesi yok. */
    paymentMethods: QrPaymentMethod[];
}

// Hesabım tek bir adisyon: (varsa) üstte onay bekleyen / onaylanmayan siparişlerin ince şeridi; masanın hesabı kâğıt
// fiş olarak (masa ve durum, kalemler, kesik çizgi, toplam; kısmen ödendiyse Ödenen ve Kalan); hemen altında tek işlem
// satırı "Hesap iste" ve "Öde" (yöntem penceresi). Hesap görünmüyorsa tek sade kart.
export function AccountTab({ tableName, regionName, bill, lock, requests, onOpenMenu, billRequest, callWaiter, paymentMethods }: AccountTabProps) {
    const paidAtMs = parsePaidAt(bill?.paidAt);
    const tableLabel = regionName ? `${tableName} · ${regionName}` : tableName;
    const paid = !!bill?.isPaid;
    const [payOpen, setPayOpen] = useState(false);
    // Hesap varken ya da masa başka telefondayken garsondan hesap istenebilir.
    const showBillRequest = !!billRequest && !paid && (!!bill || lock === 'other');
    const showPay = !!bill && !paid && paymentMethods.length > 0;

    return (
        <div className={cn(column, 'flex flex-col gap-4 px-4 pb-4 pt-5')}>
            <h1 className={cn(displayTitle, 'text-[28px]')}>Hesabım</h1>

            <RequestBanner requests={requests} paidAtMs={paidAtMs} callWaiter={callWaiter} />

            {bill ? <BillReceipt tableLabel={tableLabel} bill={bill} paidAtMs={paidAtMs} />
                : <NoBill tableLabel={tableLabel} lock={lock} hasRequests={requests.length > 0} onOpenMenu={onOpenMenu} />}

            {paid ? (
                <p className="m-0 flex items-center justify-center gap-2 text-[15px] font-semibold text-[var(--site-sub)]">
                    <Check className="h-4 w-4 shrink-0 text-[var(--site-ok)]" strokeWidth={3} aria-hidden="true" />Hesabınız ödendi, teşekkürler.
                </p>
            ) : (showBillRequest || showPay) && (
                <div className={cn('grid gap-2.5', showBillRequest && showPay && 'grid-cols-2')}>
                    {showBillRequest && billRequest && <BillRequestButton action={billRequest} variant="outline" compact={showPay} />}
                    {showPay && (
                        <button type="button" onClick={() => setPayOpen(true)} aria-haspopup="dialog" className={cn(primaryButton, 'w-full px-3')}>
                            <Wallet className="h-5 w-5" aria-hidden="true" />Öde
                        </button>
                    )}
                </div>
            )}

            {payOpen && <PaySheet methods={paymentMethods} onClose={() => setPayOpen(false)} />}
        </div>
    );
}

/** "Ödeme yöntemi" penceresi: qrPayments.ts'deki yöntemler; seçilince pencere kapanır, yöntemin kendi akışı açılır. */
function PaySheet({ methods, onClose }: { methods: QrPaymentMethod[]; onClose: () => void }) {
    return (
        <Sheet title="Ödeme yöntemi" onClose={onClose}>
            <ul className="m-0 flex list-none flex-col gap-2 p-0 pb-[env(safe-area-inset-bottom)]">
                {methods.map(method => (
                    <li key={method.id}>
                        <button type="button" onClick={() => { onClose(); method.onSelect(); }}
                            className={cn(card, 'flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:border-[var(--site-border-strong)]', focusRing)}>
                            <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--site-accent-soft)] text-[var(--site-accent-text)]">
                                <method.icon className="h-5 w-5" />
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="block text-[15px] font-extrabold leading-tight">{method.title}</span>
                                <span className="mt-0.5 block text-[13px] leading-snug text-[var(--site-sub)]">{method.description}</span>
                            </span>
                            <ChevronRight className="h-5 w-5 shrink-0 text-[var(--site-sub)]" aria-hidden="true" />
                        </button>
                    </li>
                ))}
            </ul>
        </Sheet>
    );
}

/**
 * Bu telefonun onay bekleyen ya da onaylanmayan (son ödemeden sonraki) siparişleri için ince şerit; yoksa hiç yok.
 * Dokununca yerinde açılır: saat, tek satır özet, durum, garsonun nedeni; onaylanmayan varsa "Garson çağır".
 */
function RequestBanner({ requests, paidAtMs, callWaiter }: { requests: SentOrderRequest[]; paidAtMs: number | null; callWaiter: TableAction | null }) {
    const [open, setOpen] = useState(false);
    const pending = requests.filter(r => r.status === ORDER_REQUEST_PENDING);
    const rejected = requests.filter(r => r.status === ORDER_REQUEST_REJECTED && (paidAtMs == null || r.sentAt > paidAtMs));
    const shown = [...rejected, ...pending].sort((a, b) => b.sentAt - a.sentAt);
    const text = [
        rejected.length > 0 ? `${rejected.length} sipariş onaylanmadı` : '',
        pending.length > 0 ? `${pending.length} sipariş garson onayı bekliyor` : '',
    ].filter(Boolean).join(' · ');
    const bad = rejected.length > 0;

    return (
        <div aria-live="polite">
            {shown.length > 0 && (
                <div className={cn('rounded-2xl border', bad ? 'border-[var(--site-error-line)] bg-[var(--site-error-bg)]' : 'border-[var(--site-border)] bg-[var(--site-alt)]')}>
                    <button type="button" onClick={() => setOpen(v => !v)} aria-expanded={open} aria-controls="siparis-durumu"
                        className={cn('flex min-h-12 w-full items-center gap-2.5 rounded-2xl px-4 py-2 text-left text-sm font-bold', focusRing,
                            bad ? 'text-[var(--site-error)]' : 'text-[var(--site-text)]')}>
                        <span aria-hidden="true" className={cn('h-2.5 w-2.5 shrink-0 rounded-full', bad ? 'bg-[var(--site-error)]' : 'bg-[#D97706] motion-safe:animate-pulse')} />
                        <span className="min-w-0 flex-1">{text}</span>
                        <ChevronDown className={cn('h-5 w-5 shrink-0 opacity-70 transition-transform motion-reduce:transition-none', open && 'rotate-180')} aria-hidden="true" />
                    </button>
                    <div id="siparis-durumu" hidden={!open} className="px-4 pb-3">
                        <RequestList requests={shown} paidAtMs={paidAtMs} />
                        {bad && callWaiter && <WaiterCallButton action={callWaiter} variant="outline" className="mt-2" />}
                    </div>
                </div>
            )}
        </div>
    );
}

/** Fişin alt kenarı: kesik dişli (tema renginde, yalnız maske). */
const receiptEdge = {
    WebkitMask: 'linear-gradient(#000 0 0) top / 100% calc(100% - 7px) no-repeat, conic-gradient(from -45deg at bottom, #0000, #000 1deg 89deg, #0000 90deg) bottom / 14px 7px repeat-x',
    mask: 'linear-gradient(#000 0 0) top / 100% calc(100% - 7px) no-repeat, conic-gradient(from -45deg at bottom, #0000, #000 1deg 89deg, #0000 90deg) bottom / 14px 7px repeat-x',
} as const;

const dashed = 'border-t border-dashed border-[var(--site-border-strong)]';

/** Masanın adisyonu: masa ve durum çipi, kalemler, kesik çizgi, toplam; kısmen ödendiyse Ödenen ve vurgulu Kalan. */
function BillReceipt({ tableLabel, bill, paidAtMs }: { tableLabel: string; bill: PublicTableBill; paidAtMs: number | null }) {
    const partlyPaid = !bill.isPaid && bill.paid > 0;
    return (
        <section aria-label="Masanın hesabı" className="drop-shadow-[0_0_0.5px_var(--site-border-strong)]">
            <div style={receiptEdge} className="bg-[var(--site-card)] px-4 pb-6 pt-4 text-[var(--site-text)]">
                <div className="flex items-center justify-between gap-3">
                    <p className="m-0 inline-flex min-w-0 items-center gap-2 text-[15px] font-bold">
                        <Armchair className="h-4 w-4 shrink-0 text-[var(--site-accent-text)]" aria-hidden="true" />
                        <span className="truncate">{tableLabel}</span>
                    </p>
                    {bill.isPaid ? <StatusChip tone="paid">{paidAtMs != null ? `Ödendi · ${timeOf(paidAtMs)}` : 'Ödendi'}</StatusChip>
                        : <StatusChip tone="open">Açık hesap</StatusChip>}
                </div>

                <div className={cn(dashed, 'mt-3 pt-1')}>
                    <BillLines items={bill.items} collapsible />
                </div>

                <dl className={cn(dashed, 'm-0 mt-2 flex flex-col gap-1.5 pt-3')}>
                    {bill.isPaid ? (
                        <>
                            {bill.discount > 0 && (
                                <>
                                    <TotalRow label="Toplam" value={bill.total} />
                                    <TotalRow label="İndirim" value={-bill.discount} />
                                </>
                            )}
                            <TotalRow label="Ödenen" value={bill.paid} big />
                        </>
                    ) : partlyPaid ? (
                        <>
                            <TotalRow label="Toplam" value={bill.total} />
                            <TotalRow label="Ödenen" value={bill.paid} ok />
                            <TotalRow label="Kalan" value={bill.remaining} big />
                        </>
                    ) : (
                        <TotalRow label="Toplam" value={bill.total} big />
                    )}
                </dl>
            </div>
        </section>
    );
}

function TotalRow({ label, value, big = false, ok = false }: { label: string; value: number; big?: boolean; ok?: boolean }) {
    return (
        <div className={cn('flex items-baseline justify-between gap-3', big && 'mt-0.5')}>
            <dt className={cn(big ? 'text-[16px] font-extrabold' : 'text-[14px] font-semibold text-[var(--site-sub)]')}>{label}</dt>
            <dd className={cn('m-0 tabular-nums', big ? 'text-[30px] font-extrabold leading-none' : 'text-[15px] font-bold',
                ok && 'text-[var(--site-ok)]')}>
                {value < 0 ? '−' : ''}{formatPrice(Math.abs(value))} ₺
            </dd>
        </div>
    );
}

/** Hesap görünmüyorsa tek sade kart: henüz hesap yok ya da masa başka telefonda. */
function NoBill({ tableLabel, lock, hasRequests, onOpenMenu }: { tableLabel: string; lock: TableOrderLock; hasRequests: boolean; onOpenMenu: () => void }) {
    const other = lock === 'other';
    return (
        <section aria-label="Masanın hesabı" className={cn(card, 'flex items-start gap-3 px-4 py-4')}>
            <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--site-alt)] text-[var(--site-sub)]">
                {other ? <UserRound className="h-5 w-5" /> : <Receipt className="h-5 w-5" />}
            </span>
            <div className="min-w-0 text-[15px] leading-relaxed text-[var(--site-sub)]">
                <p className="m-0 text-[13px] font-semibold">{tableLabel}</p>
                <p className="m-0 font-extrabold text-[var(--site-text)]">{other ? 'Hesap bu telefonda görünmüyor' : 'Henüz açık hesap yok'}</p>
                <p className="m-0">
                    {other ? 'Hesap, masanın ilk siparişini veren telefonda görünür. Garsondan da isteyebilirsiniz.'
                        : hasRequests ? 'Siparişiniz garson onaylayınca burada görünür.' : 'Onaylanan siparişler burada görünür.'}
                </p>
                {!other && (
                    <button type="button" onClick={onOpenMenu}
                        className={cn('-ml-1 mt-1 inline-flex min-h-11 items-center gap-1 rounded-xl px-1 text-[15px] font-bold text-[var(--site-accent-text)]', focusRing)}>
                        Menüye göz at<ChevronRight className="h-4 w-4" aria-hidden="true" />
                    </button>
                )}
            </div>
        </section>
    );
}

// ── Alt çubuklar ─────────────────────────────────────────────────────────────────────────────

/** Alt çubuğun üstündeki kısa bildirim. cart: "Sepete eklendi" (sepet çubuğu nabız atar); info: garson/hesap sonucu. */
export interface BarToast {
    id: number;
    text: string;
    kind?: 'cart' | 'info';
}

/**
 * Alt gezinme: Menü, Sepetim (ürün sayısı), Garson Çağır (işlem; admin kapattıysa yok) ve Hesabım (onay bekleyen
 * sayısı). Seçili sekme vurgu renkli dolu hap. Garson Çağır'da onay penceresi yok: simge yeşil onaya döner, altında
 * bekleme süresi ("0:45") sayar; sonucu üstteki kısa şerit ve ekran okuyucu bildirimi söyler. Üstünde (varsa) sepet çubuğu.
 */
export function BottomBar({ tab, onTab, cartCount, pendingCount, cart, toast, callWaiter }: {
    tab: QrTab; onTab: (tab: QrTab) => void; cartCount: number; pendingCount: number;
    /** Menü sekmesinde, sepet doluysa ve sipariş açıksa sepet çubuğu. */
    cart: { count: number; total: number; onOpen: () => void } | null;
    /** Son eklemenin ya da işlemin kısa bildirimi (birkaç saniye görünür); null: yok. */
    toast: BarToast | null;
    callWaiter: TableAction | null;
}) {
    // Hata şeridi kapatılınca aynı hata yeniden gösterilmez; yeni denemede (durum değişir) yine görünür.
    const [dismissed, setDismissed] = useState<TableActionState | null>(null);
    const failed = callWaiter && callWaiter.state.status === 'error' && callWaiter.state !== dismissed ? callWaiter : null;
    const errorMessage = failed?.state.status === 'error' ? failed.state.message : null;
    const bump = toast && toast.kind !== 'info' ? toast : null;
    const columns = 3 + Number(!!callWaiter);

    return (
        <div className="fixed inset-x-0 bottom-0 z-30">
            {/* Ekran okuyucu bildirimi her zaman yerinde; görünen şerit yalnız bildirim varken. Dokunuşları engellemez. */}
            <div className={cn(column, 'pointer-events-none flex justify-center px-3 pb-2')} aria-live="polite" role="status">
                {toast && !errorMessage && (
                    <p key={toast.id} className="qr-toast m-0 flex max-w-full items-center gap-2 rounded-full bg-[var(--site-text)] py-2 pl-2.5 pr-4 text-sm font-bold text-[var(--site-bg)] shadow-[0_8px_20px_-8px_rgba(0,0,0,0.45)]">
                        <span aria-hidden="true" className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--site-ok)] text-[var(--site-ok-bg)]">
                            <Check className="h-3.5 w-3.5" strokeWidth={3.25} />
                        </span>
                        <span className="min-w-0 truncate">{toast.text}</span>
                    </p>
                )}
            </div>
            {errorMessage && failed && (
                <div className={cn(column, 'px-3 pb-2')}>
                    <p role="alert" className="m-0 flex items-start gap-2 rounded-2xl border border-[var(--site-error-line)] bg-[var(--site-error-bg)] py-2 pl-3.5 pr-1 text-sm font-semibold text-[var(--site-error)] shadow-[0_8px_20px_-10px_rgba(0,0,0,0.35)]">
                        <span className="min-w-0 flex-1 py-1.5">{errorMessage}</span>
                        <button type="button" onClick={() => setDismissed(failed.state)} aria-label="Uyarıyı kapat"
                            className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-full', focusRing)}>
                            <X className="h-4 w-4" aria-hidden="true" />
                        </button>
                    </p>
                </div>
            )}
            {cart && (
                <div className={cn(column, 'px-3 pb-2')}>
                    <button type="button" onClick={cart.onOpen}
                        className={cn('flex min-h-14 w-full items-center justify-between gap-3 rounded-2xl bg-[var(--site-accent)] py-2 pl-4 pr-2 text-[var(--site-on-accent)] shadow-[0_14px_30px_-12px_rgba(0,0,0,0.45)] transition-opacity hover:opacity-95', focusRing,
                            bump && 'qr-cart-bump')}
                        key={bump?.id ?? 'cart'}>
                        <span className="flex min-w-0 items-center gap-3 text-[15px] font-extrabold">
                            <ShoppingBasket className="h-5 w-5 shrink-0" aria-hidden="true" />
                            <span className="tabular-nums">{cart.count} Ürün</span>
                            <span aria-hidden="true" className="h-4 w-px bg-current opacity-40" />
                            <span className="tabular-nums">{formatPrice(cart.total)} ₺</span>
                        </span>
                        <span className="flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-[color-mix(in_srgb,var(--site-on-accent)_16%,transparent)] px-3.5 text-sm font-extrabold">
                            Sepetim<ArrowRight className="h-4 w-4" aria-hidden="true" />
                        </span>
                    </button>
                </div>
            )}
            <nav aria-label="Masa menüsü" className="rounded-t-[22px] border-t border-[var(--site-border)] bg-[color-mix(in_srgb,var(--site-card)_96%,transparent)] pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_-18px_rgba(0,0,0,0.35)] backdrop-blur-[12px]">
                <ul className={cn(column, 'grid list-none gap-1 px-2 py-2')} style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
                    <li>
                        <TabButton active={tab === 'menu'} onClick={() => onTab('menu')} icon={<UtensilsCrossed className="h-[22px] w-[22px]" />} label="Menü" />
                    </li>
                    <li>
                        <TabButton active={tab === 'cart'} onClick={() => onTab('cart')} icon={<ShoppingBasket className="h-[22px] w-[22px]" />} label="Sepetim"
                            badge={cartCount > 0 ? cartCount : null} srExtra={cartCount > 0 ? `, ${cartCount} ürün` : undefined} />
                    </li>
                    {callWaiter && (
                        <li>
                            <ActionButton action={callWaiter} icon={<BellRing className="h-[22px] w-[22px]" />} label="Garson Çağır"
                                busyLabel="Çağrılıyor…" doneLabel="Çağrıldı" announce={{ sent: 'Garson çağrıldı.', repeat: 'Garson az önce çağrıldı.' }} />
                        </li>
                    )}
                    <li>
                        <TabButton active={tab === 'account'} onClick={() => onTab('account')} icon={<ReceiptText className="h-[22px] w-[22px]" />} label="Hesabım"
                            badge={pendingCount > 0 ? pendingCount : null} srExtra={pendingCount > 0 ? `, ${pendingCount} sipariş onay bekliyor` : undefined} />
                    </li>
                </ul>
            </nav>
        </div>
    );
}

const barItem = cn('relative flex min-h-[60px] w-full flex-col items-center justify-center gap-1 rounded-2xl px-1 text-[12px] font-bold leading-tight transition-colors motion-reduce:transition-none', focusRing, 'focus-visible:ring-offset-0');

function TabButton({ active, onClick, icon, label, badge = null, srExtra }: {
    active: boolean; onClick: () => void; icon: ReactNode; label: string; badge?: number | null; srExtra?: string;
}) {
    return (
        <button type="button" onClick={onClick} aria-current={active ? 'page' : undefined}
            className={cn(barItem, active
                ? 'bg-[var(--site-accent)] text-[var(--site-on-accent)] shadow-[0_8px_18px_-12px_var(--site-accent)]'
                : 'text-[var(--site-sub)] hover:bg-[var(--site-alt)] hover:text-[var(--site-text)]')}>
            <span aria-hidden="true" className="relative">
                {icon}
                {badge != null && (
                    <span className={cn('absolute -right-2.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[11px] font-extrabold tabular-nums',
                        active ? 'bg-[var(--site-on-accent)] text-[var(--site-accent)]' : 'bg-[var(--site-accent)] text-[var(--site-on-accent)]')}>{badge}</span>
                )}
            </span>
            <span className="max-w-full truncate">{label}</span>
            {srExtra && <span className="sr-only">{srExtra}</span>}
        </button>
    );
}

// Garson Çağır: sekme değil, işlem. Gönderilince simge yeşil onaya döner, altında "0:45" bekleme süresi sayar; süre
// boyunca kapalıdır. Hata olursa simgede kırmızı nokta, metni çubuğun üstündeki şeritte.
function ActionButton({ action, icon, label, busyLabel, doneLabel, announce }: {
    action: TableAction; icon: ReactNode; label: string; busyLabel: string; doneLabel: string;
    announce: { sent: string; repeat: string };
}) {
    const { state, remainingSeconds } = action;
    const waiting = isWaiting(action);
    const sending = state.status === 'sending';
    const failed = state.status === 'error';
    const done = waiting && state.status === 'done' ? state : null;
    const status = sending ? busyLabel : done ? (done.sent ? announce.sent : announce.repeat) : '';
    return (
        <>
            <button type="button" onClick={() => void action.trigger()} disabled={sending || waiting}
                aria-label={waiting ? `${status} ${remainingSeconds} saniye sonra tekrar` : label}
                className={cn(barItem, waiting ? 'text-[var(--site-ok)]' : 'text-[var(--site-text)] hover:bg-[var(--site-alt)]', sending && 'opacity-60')}>
                <span aria-hidden="true" className={cn('relative flex h-[22px] items-center justify-center', waiting && 'w-[22px] rounded-full bg-[var(--site-ok)] text-[var(--site-ok-bg)]')}>
                    {waiting ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : icon}
                    {failed && <span className="absolute -right-1 -top-0.5 h-2.5 w-2.5 rounded-full bg-[var(--site-error)] ring-2 ring-[var(--site-card)]" />}
                </span>
                <span aria-hidden="true" className="max-w-full truncate">
                    {sending ? busyLabel : waiting ? <>{doneLabel} <span className="tabular-nums">{formatClock(remainingSeconds)}</span></> : label}
                </span>
            </button>
            {/* Geri sayım okunmaz; yalnız sonuç bir kez bildirilir. */}
            <span className="sr-only" role="status" aria-live="polite">{status}</span>
        </>
    );
}

/** Menü boşken. */
export function EmptyMenu({ callWaiter }: { callWaiter: TableAction | null }) {
    return (
        <div className="mt-6">
            <EmptyState icon={<UtensilsCrossed className="h-6 w-6" />} title="Menü hazırlanıyor"
                text="Online menü henüz hazır değil. Garson basılı menüyü getirebilir."
                action={callWaiter && <WaiterCallButton action={callWaiter} className="mt-5 w-full" />} />
        </div>
    );
}
