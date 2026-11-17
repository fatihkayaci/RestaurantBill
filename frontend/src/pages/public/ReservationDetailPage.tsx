import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
    CalendarCheck, CalendarPlus, Check, ChefHat, Clock, MapPin, Minus, Navigation, Phone, Plus, ShoppingBag, X,
} from 'lucide-react';
import { toast } from 'sonner';
import { publicService } from '@/features/customerSite/api/publicService';
import {
    ORDER_REQUEST_APPROVED, ORDER_REQUEST_CANCELLED, ORDER_REQUEST_EXPIRED, ORDER_REQUEST_PENDING,
    RESERVATION_CANCELLED, RESERVATION_CONFIRMED, RESERVATION_NO_SHOW, RESERVATION_PENDING, RESERVATION_REJECTED,
    RESERVATION_SEATED, type DaySlot, type PublicCategory, type PublicProduct, type PublicSite, type ReservationDetail,
} from '@/features/customerSite/types';
import { RESERVATION_LOOKUP_PATH, formatTurkishPhoneInput } from '@/features/customerSite/reservationCode';
import { getApiErrorMessage } from '@/lib/apiError';
import { formatPrice } from '@/lib/format';
import { cn } from '@/lib/utils';
import MenuBrowser from './components/MenuBrowser';
import { customerFontsHref, customerRootStyle } from './customerTheme';
import { countdownText, dateParts, dayWord, downloadIcs, reservationStatusBadge } from './reservationCalendar';
import { reservationTone } from './reservationTone';
import { SitePage } from './site/SiteFrame';
import { ImageSlot } from './site/SiteChrome';
import { reservationHref, serif } from './site/siteParts';
import { directionsUrl, headingFont, telHref } from './site/siteTheme';
import { fullAddress, rememberReservationToken } from './site/useSite';

interface CartLine {
    product: PublicProduct;
    quantity: number;
    note: string;
}

const MAX_QUANTITY = 50;
// Ön sipariş penceresi açılınca ve restoran onaylayınca sayfa kendiliğinden güncellensin diye arada bir yenilenir.
const REFRESH_MS = 60_000;
// Geri sayım dakikada bir ilerler.
const TICK_MS = 30_000;

const card = 'rounded-[24px] bg-[var(--site-card)] md:rounded-[32px]';
const eyebrowClass = 'text-[11px] font-medium uppercase tracking-[0.2em] text-[var(--site-sub)]';
const primaryButton = 'flex h-12 items-center justify-center gap-2 rounded-full bg-[var(--site-accent)] px-6 text-[15px] font-semibold text-[var(--site-on-accent)] no-underline transition-opacity hover:opacity-90 disabled:opacity-50';
const secondaryButton = 'flex h-12 items-center justify-center gap-2 rounded-full border border-[var(--site-border)] bg-[var(--site-card)] px-5 text-[15px] font-semibold text-[var(--site-text)] no-underline transition-colors hover:border-[var(--site-text)] disabled:opacity-50';

/** UTC anının cihazdaki yerel günü: "2026-11-14". */
function localDateOf(iso: string): string {
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function useNow(intervalMs: number) {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const timer = window.setInterval(() => setNow(Date.now()), intervalMs);
        return () => window.clearInterval(timer);
    }, [intervalMs]);
    return now;
}

// /rezervasyon/:token — rezervasyonda verilen bağlantı. Durum sayfanın başlığıdır ("Cuma görüşmek üzere."); altında geri
// sayım, saat/kişi/masa, ön sipariş (pencere açılmadıysa bir vaat olarak), yol tarifi / takvim / ara ve kod. Onaylı
// rezervasyonda ön sipariş penceresi içinde menüden ön sipariş verilir, değiştirilir ya da iptal edilir; ön sipariş masaya
// oturunca mutfağa gider. Misafir rezervasyonunu saatinden 2 saat öncesine kadar kod + telefonla kendisi iptal edebilir.
export default function ReservationDetailPage() {
    const { token = '' } = useParams();
    const [detail, setDetail] = useState<ReservationDetail | null>(null);
    const [site, setSite] = useState<PublicSite | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [editing, setEditing] = useState(false);
    const [cart, setCart] = useState<Record<string, CartLine>>({});
    const [orderNote, setOrderNote] = useState('');
    const [cartOpen, setCartOpen] = useState(false);
    const [sending, setSending] = useState(false);
    const [sendError, setSendError] = useState<string | null>(null);
    const [cancellingPreOrder, setCancellingPreOrder] = useState(false);
    const [freeSlots, setFreeSlots] = useState<DaySlot[] | null>(null);
    const now = useNow(TICK_MS);

    useEffect(() => {
        let cancelled = false;
        publicService.getReservationByToken(token)
            .then(async data => {
                rememberReservationToken(token);
                const siteData = await publicService.getSite(data.branchId);
                if (cancelled) return;
                setDetail(data);
                setSite(siteData);
            })
            .catch(err => {
                if (!cancelled) setLoadError(getApiErrorMessage(err, 'Rezervasyon bulunamadı. Bağlantıyı kontrol edin.'));
            });
        const timer = window.setInterval(() => {
            publicService.getReservationByToken(token)
                .then(data => { if (!cancelled) setDetail(data); })
                .catch(() => { /* bir sonraki turda yeniden denenir */ });
        }, REFRESH_MS);
        return () => { cancelled = true; window.clearInterval(timer); };
    }, [token]);

    // Onaylanmayan rezervasyonda aynı günün boş saatleri hemen sunulur.
    const rejectedDay = detail?.status === RESERVATION_REJECTED ? `${detail.branchId}|${detail.date}` : null;
    useEffect(() => {
        if (!rejectedDay) return;
        const [branchId, date] = rejectedDay.split('|');
        let cancelled = false;
        publicService.getDaySlots(branchId, date)
            .then(slots => { if (!cancelled) setFreeSlots(slots.filter(s => !s.full)); })
            .catch(() => { if (!cancelled) setFreeSlots([]); });
        return () => { cancelled = true; };
    }, [rejectedDay]);

    // Tükenen ürünler menüde gösterilmez; boş kalan kategori de gizlenir.
    const categories = useMemo<PublicCategory[]>(() => {
        if (!site || !detail) return [];
        const outOfStock = new Set(detail.outOfStockProductIds);
        return site.categories
            .map(c => ({ ...c, products: c.products.filter(p => !outOfStock.has(p.id)) }))
            .filter(c => c.products.length > 0);
    }, [site, detail]);

    // Ön sipariş kalemlerinin görselleri menüden ürün kimliğiyle eşleşir.
    const productsById = useMemo(
        () => new Map((site?.categories ?? []).flatMap(c => c.products).map(p => [p.id, p])),
        [site],
    );

    const lines = useMemo(() => Object.values(cart), [cart]);
    const itemCount = lines.reduce((sum, line) => sum + line.quantity, 0);
    const total = lines.reduce((sum, line) => sum + line.quantity * line.product.price, 0);
    const quantities = useMemo(() => Object.fromEntries(lines.map(line => [line.product.id, line.quantity])), [lines]);

    const add = (product: PublicProduct) => {
        setCart(prev => {
            const current = prev[product.id];
            const quantity = Math.min(MAX_QUANTITY, (current?.quantity ?? 0) + 1);
            return { ...prev, [product.id]: { product, quantity, note: current?.note ?? '' } };
        });
    };

    const remove = (product: PublicProduct) => {
        setCart(prev => {
            const current = prev[product.id];
            if (!current) return prev;
            if (current.quantity <= 1) {
                const next = { ...prev };
                delete next[product.id];
                return next;
            }
            return { ...prev, [product.id]: { ...current, quantity: current.quantity - 1 } };
        });
    };

    const setLineNote = (productId: string, note: string) => {
        setCart(prev => prev[productId] ? { ...prev, [productId]: { ...prev[productId], note } } : prev);
    };

    // "Değiştir": mevcut ön sipariş sepete yüklenir; menüde artık olmayan ürünler düşer.
    const startEditing = () => {
        if (!detail?.preOrder || !site) return;
        const products = new Map(categories.flatMap(c => c.products).map(p => [p.id, p]));
        const next: Record<string, CartLine> = {};
        let dropped = false;
        for (const item of detail.preOrder.items) {
            const product = products.get(item.productId ?? '');
            if (!product) { dropped = true; continue; }
            const current = next[product.id];
            next[product.id] = {
                product,
                quantity: Math.min(MAX_QUANTITY, (current?.quantity ?? 0) + item.quantity),
                note: current?.note || item.note,
            };
        }
        if (dropped) toast.info('Ön siparişinizdeki bazı ürünler artık menüde yok; sepetten çıkarıldı.');
        setCart(next);
        setOrderNote(detail.preOrder.note);
        setEditing(true);
        window.scrollTo(0, 0);
    };

    const send = async () => {
        if (lines.length === 0 || sending) return;
        setSending(true);
        setSendError(null);
        try {
            const data = await publicService.savePreOrder(
                token,
                lines.map(line => ({ productId: line.product.id, quantity: line.quantity, note: line.note.trim() })),
                orderNote.trim()
            );
            setDetail(data);
            toast.success('Ön siparişiniz alındı', { description: 'Masanıza oturduğunuzda mutfağa iletilecek.' });
            setCart({});
            setOrderNote('');
            setCartOpen(false);
            setEditing(false);
            window.scrollTo(0, 0);
        } catch (err) {
            setSendError(getApiErrorMessage(err, 'Ön sipariş gönderilemedi. Lütfen tekrar deneyin.'));
        } finally {
            setSending(false);
        }
    };

    const cancelPreOrder = async () => {
        if (cancellingPreOrder) return;
        setCancellingPreOrder(true);
        try {
            setDetail(await publicService.cancelPreOrder(token));
            setEditing(false);
            setCart({});
            toast.success('Ön siparişiniz iptal edildi.');
        } catch (err) {
            toast.error(getApiErrorMessage(err, 'Ön sipariş iptal edilemedi.'));
        } finally {
            setCancellingPreOrder(false);
        }
    };

    const root = (children: ReactNode) => (
        <div style={customerRootStyle(site?.site)} className="min-h-screen text-[var(--site-text)]">
            <link rel="stylesheet" href={customerFontsHref(site?.site)} precedence="default" />
            {children}
        </div>
    );

    if (loadError) {
        return root(
            <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
                <span aria-hidden="true" className="flex h-14 w-14 items-center justify-center rounded-full border border-[var(--site-border)] bg-[var(--site-card)] text-[var(--site-sub)]">
                    <CalendarCheck className="h-6 w-6" />
                </span>
                <h1 className={cn(serif, 'm-0 mt-5 text-[40px] leading-none tracking-[-0.02em]')}>Rezervasyon <span className="italic">açılamadı.</span></h1>
                <p className="mt-3 max-w-sm text-base text-[var(--site-sub)]">{loadError}</p>
                <div className="mt-7 flex flex-wrap justify-center gap-3">
                    <Link to={RESERVATION_LOOKUP_PATH} className={primaryButton}>Kodla sorgula</Link>
                    <Link to="/" className={secondaryButton}>Restoran sayfası</Link>
                </div>
            </main>
        );
    }

    if (!detail || !site) {
        return root(
            <main className="min-h-screen" aria-busy="true" aria-label="Rezervasyon yükleniyor">
                <div className="h-[68px] border-b border-[var(--site-border)] bg-[var(--site-card)]" />
                <div className="mx-auto max-w-5xl px-4 pt-6">
                    <div className="overflow-hidden rounded-[22px] border border-[var(--site-border)] bg-[var(--site-card)] lg:max-w-[640px]">
                        <div className="h-48 animate-pulse bg-[var(--site-hero)]" />
                        <div className="grid grid-cols-3 gap-4 p-5">
                            {[...Array(3)].map((_, i) => <div key={i} className="h-14 animate-pulse rounded-lg bg-[var(--site-raised)]" />)}
                        </div>
                    </div>
                    <div className="mt-4 h-24 animate-pulse rounded-[20px] bg-[var(--site-raised)] lg:max-w-[640px]" />
                </div>
            </main>
        );
    }

    const window_ = detail.preOrderWindow;
    const preOrder = detail.preOrder;
    const pending = preOrder?.status === ORDER_REQUEST_PENDING;
    // Menü: pencere açıkken ve bekleyen ön sipariş yokken (ya da müşteri değiştiriyorken).
    const showMenu = window_.canPreOrder && (!pending || editing);
    const restaurant = site.companyName || site.branchName;
    const address = fullAddress(site);
    const activePreOrder = preOrder && (preOrder.status === ORDER_REQUEST_PENDING || preOrder.status === ORDER_REQUEST_APPROVED);
    // Ön sipariş henüz açılmadıysa vaat kartı; açılış saati geçtiyse sunucunun nedeni (kapandı, kapalı…) yazılır.
    const preOrderNotYet = detail.status === RESERVATION_CONFIRMED && window_.enabled && !window_.canPreOrder
        && !activePreOrder && new Date(window_.opensAt).getTime() > now;
    const fieldClass = 'w-full rounded-xl border border-[var(--site-border-strong)] bg-[var(--site-bg)] px-3 text-[15px] text-[var(--site-text)] placeholder:text-[var(--site-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--site-accent)]';

    const addToCalendar = () => downloadIcs({
        uid: detail.code || token.slice(0, 12),
        title: `${restaurant} · Rezervasyon`,
        date: detail.date,
        time: detail.time,
        endTime: detail.endTime,
        location: address || undefined,
        description: [
            `${detail.partySize} kişi · ${detail.tableName}`,
            detail.code ? `Rezervasyon kodu: ${detail.code}` : '',
            `${window.location.origin}/rezervasyon/${token}`,
        ].filter(Boolean).join('\n'),
    });

    return (
        <SitePage site={site} current="rezervasyon-sorgula" mobileActions={[]}>
            <main className={cn('mx-auto flex w-full max-w-[1440px] flex-1 flex-col gap-4 px-2 pt-4 leading-normal text-[var(--site-text)] sm:px-4', showMenu && itemCount > 0 ? 'pb-36' : 'pb-4')}>
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start">
                    <div className="flex min-w-0 flex-col gap-4">
                        <ReservationCard detail={detail} now={now} address={address} onCalendar={addToCalendar}>
                            <CancelArea detail={detail} onCancelled={data => setDetail(data)} />
                        </ReservationCard>
                        {detail.status === RESERVATION_PENDING && <PendingSteps detail={detail} />}
                        {detail.status === RESERVATION_REJECTED && <RejectedNext detail={detail} slots={freeSlots} phone={detail.restaurantPhone} />}
                    </div>

                    <aside aria-label="Rezervasyon kodu ve adres" className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-24 lg:col-start-2 lg:row-span-2 lg:row-start-1">
                        <CodeCard detail={detail} address={address} restaurant={restaurant} />
                    </aside>

                    <div className="flex min-w-0 flex-col gap-4 lg:col-start-1">
                        {preOrder && !editing && (
                            <PreOrderSummary detail={detail} productsById={productsById} restaurant={restaurant}
                                onEdit={startEditing} onCancel={cancelPreOrder} cancelling={cancellingPreOrder} />
                        )}

                        {preOrderNotYet && <PreOrderPromise detail={detail} site={site} />}

                        {!preOrderNotYet && !showMenu && window_.enabled && !pending && preOrder?.status !== ORDER_REQUEST_APPROVED
                            && detail.status === RESERVATION_CONFIRMED && window_.reason && (
                            <p className={cn(card, 'm-0 flex items-start gap-2 p-5 text-[15px]')}>
                                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-[var(--site-sub)]" aria-hidden="true" />
                                {window_.reason}
                            </p>
                        )}

                        {showMenu && (
                            <div className={cn(card, 'flex flex-col gap-1 p-5 sm:p-8')}>
                                <h2 className={cn(serif, 'm-0 text-[30px] leading-tight md:text-[40px]')}>{editing ? <>Ön siparişinizi <em className="font-semibold italic text-[var(--site-terracotta-text)]">değiştirin.</em></> : <>Ön sipariş <em className="font-semibold italic text-[var(--site-terracotta-text)]">verin.</em></>}</h2>
                                <p className="m-0 mt-1 text-[15px] leading-relaxed text-[var(--site-sub)]">
                                    Gelmeden siparişinizi verin; masanıza oturduğunuzda mutfağa iletilir, beklemezsiniz. Masanıza oturana kadar değiştirebilir ya da iptal edebilirsiniz. Ödeme restoranda alınır.
                                </p>
                                {editing && (
                                    <button type="button" onClick={() => { setEditing(false); setCart({}); }} className="mt-1 inline-flex min-h-11 items-center self-start text-sm font-bold text-[var(--site-sub)] underline">
                                        Vazgeç
                                    </button>
                                )}
                            </div>
                        )}

                        {showMenu && (
                            <div className="-mx-2 sm:-mx-4 md:-mx-6">
                                <MenuBrowser categories={categories} quantities={quantities} onAdd={add} onRemove={remove} stickyBgClass="bg-[color-mix(in_srgb,var(--site-bg)_95%,transparent)]" />
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {showMenu && itemCount > 0 && (
                <div className="fixed inset-x-0 bottom-0 z-20 border-t border-[var(--site-border)] bg-[var(--site-bg)] px-4 pb-5 pt-3">
                    <div className="mx-auto max-w-2xl">
                        <p className="mb-2.5 text-center text-[13px] text-[var(--site-muted)]">Ön siparişiniz masanıza oturduğunuzda mutfağa iletilir.</p>
                        <button
                            type="button"
                            onClick={() => setCartOpen(true)}
                            className="flex h-14 w-full items-center justify-between rounded-full bg-[var(--site-accent)] px-6 text-[var(--site-on-accent)] transition-opacity hover:opacity-90"
                        >
                            <span className="flex items-center gap-2.5 text-base font-semibold">
                                <ShoppingBag className="h-5 w-5" aria-hidden="true" />
                                Sepeti gör · {itemCount} ürün
                            </span>
                            <span className={cn(headingFont, 'text-lg font-bold')}>{formatPrice(total)} ₺</span>
                        </button>
                    </div>
                </div>
            )}

            {showMenu && cartOpen && (
                <div className="fixed inset-0 z-30 flex flex-col justify-end bg-black/60" onClick={() => setCartOpen(false)}>
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-label="Ön sipariş sepeti"
                        className="mx-auto flex max-h-[90dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl border-t border-[var(--site-border)] bg-[var(--site-card)] animate-in slide-in-from-bottom duration-200"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex shrink-0 items-center justify-between border-b border-[var(--site-border)] px-5 py-4">
                            <h2 className={cn(headingFont, 'text-2xl font-bold')}>Ön siparişiniz</h2>
                            <button
                                type="button"
                                onClick={() => setCartOpen(false)}
                                aria-label="Sepeti kapat"
                                className="flex h-11 w-11 items-center justify-center rounded-full text-[var(--site-sub)] hover:bg-[var(--site-raised)]"
                            >
                                <X className="h-5 w-5" aria-hidden="true" />
                            </button>
                        </div>

                        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3">
                            {lines.length === 0 ? (
                                <p className="py-8 text-center text-base text-[var(--site-sub)]">Sepetiniz boş.</p>
                            ) : (
                                <ul className="divide-y divide-[var(--site-border)]">
                                    {lines.map(line => (
                                        <li key={line.product.id} className="py-3">
                                            <div className="flex items-center gap-3">
                                                <ImageSlot src={line.product.imageUrl} alt="" restaurant={restaurant} logoTextClassName="text-[9px]" className="h-12 w-12 shrink-0 rounded-xl" />
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-[15px] font-semibold">{line.product.name}</p>
                                                    <p className="text-sm tabular-nums text-[var(--site-sub)]">{formatPrice(line.product.price * line.quantity)} ₺</p>
                                                </div>
                                                <div className="flex shrink-0 items-center gap-1 rounded-full bg-[var(--site-raised)] p-0.5">
                                                    <button type="button" onClick={() => remove(line.product)} aria-label={`${line.product.name} bir azalt`} className="flex h-11 w-11 items-center justify-center rounded-full text-[var(--site-text)]">
                                                        <Minus className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
                                                    </button>
                                                    <span className="min-w-5 text-center text-base font-bold">{line.quantity}</span>
                                                    <button type="button" onClick={() => add(line.product)} aria-label={`${line.product.name} bir artır`} className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--site-accent)] text-[var(--site-on-accent)]">
                                                        <Plus className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
                                                    </button>
                                                </div>
                                            </div>
                                            <label className="sr-only" htmlFor={`not-${line.product.id}`}>{line.product.name} için not</label>
                                            <input
                                                id={`not-${line.product.id}`}
                                                value={line.note}
                                                onChange={e => setLineNote(line.product.id, e.target.value)}
                                                maxLength={300}
                                                placeholder="Not ekle (ör. az pişmiş, soğansız)"
                                                className={cn(fieldClass, 'mt-2 h-11')}
                                            />
                                        </li>
                                    ))}
                                </ul>
                            )}

                            <label htmlFor="on-siparis-notu" className="mt-3 block text-sm font-semibold">Sipariş notu</label>
                            <textarea
                                id="on-siparis-notu"
                                value={orderNote}
                                onChange={e => setOrderNote(e.target.value)}
                                maxLength={500}
                                rows={2}
                                placeholder="Restorana iletmek istediğiniz bir şey var mı? (ör. doğum günü)"
                                className={cn(fieldClass, 'mt-1.5 py-2.5')}
                            />
                        </div>

                        <div className="shrink-0 border-t border-[var(--site-border)] p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                            {sendError && <p role="alert" className="mb-3 rounded-xl border border-[var(--site-error-line)] bg-[var(--site-error-bg)] p-3 text-sm font-medium text-[var(--site-error)]">{sendError}</p>}
                            <button
                                type="button"
                                onClick={send}
                                disabled={sending || lines.length === 0}
                                className="flex h-14 w-full items-center justify-between rounded-full bg-[var(--site-accent)] px-6 text-[var(--site-on-accent)] transition-opacity hover:opacity-90 disabled:opacity-50"
                            >
                                <span className="text-base font-semibold">{sending ? 'Gönderiliyor…' : editing ? 'Değişikliği kaydet' : 'Ön siparişi gönder'}</span>
                                <span className={cn(headingFont, 'text-lg font-bold')}>{formatPrice(total)} ₺</span>
                            </button>
                            <p className="mt-2 text-center text-xs text-[var(--site-muted)]">Fiyatlar restoranın güncel menüsünden hesaplanır. Ödeme restoranda, masa hesabınızla alınır.</p>
                        </div>
                    </div>
                </div>
            )}
        </SitePage>
    );
}

// ── Durum başlığı ───────────────────────────────────────────────────────────────────────────────

function statusHeadline(detail: ReservationDetail): { lead: string; title: ReactNode; text?: string } {
    const day = dayWord(detail.date);
    switch (detail.status) {
        case RESERVATION_CONFIRMED:
            return { lead: `${detail.guestName}, masanız hazır olacak.`, title: <>{day} <span className="italic">görüşmek üzere.</span></> };
        case RESERVATION_PENDING:
            return { lead: 'Onay bekliyor', title: <>Talebiniz <span className="italic">restoranda.</span></>, text: 'Restoran onaylayınca bu sayfa kendiliğinden güncellenir.' };
        case RESERVATION_SEATED:
            return { lead: `${detail.guestName}, hoş geldiniz.`, title: <>Afiyet <span className="italic">olsun.</span></> };
        case RESERVATION_REJECTED:
            return {
                lead: 'Onaylanmadı',
                title: <>{day} {detail.time} <span className="italic">dolu çıktı.</span></>,
                text: 'Bu saat için yer ayıramadık, kusura bakmayın. Aynı gün başka bir saat ya da başka bir gün deneyebilirsiniz.',
            };
        case RESERVATION_CANCELLED:
            return { lead: 'İptal edildi', title: <>Rezervasyon <span className="italic">iptal edildi.</span></>, text: 'Yeni bir gün için dilediğiniz zaman masa ayırtabilirsiniz.' };
        case RESERVATION_NO_SHOW:
            return { lead: 'Kapandı', title: <>Bu rezervasyon <span className="italic">kapandı.</span></>, text: 'Rezervasyon saatinde gelinmediği için kapatıldı.' };
        default:
            return { lead: 'Rezervasyon', title: 'Rezervasyonunuz' };
    }
}

// Rezervasyon kartı (tasarım: "Renkli · Rezervasyon sorgula", sonuç tarafı): başlık + durum rozeti, durum renginde
// tarih yarısı ve krem bilgi yarısı olan bilet, durum notu, Takvime ekle · Yol tarifi · Ara ve iptal.
function ReservationCard({ detail, now, address, onCalendar, children }: {
    detail: ReservationDetail; now: number; address: string; onCalendar: () => void; children?: ReactNode;
}) {
    const headline = statusHeadline(detail);
    const upcoming = detail.status === RESERVATION_CONFIRMED || detail.status === RESERVATION_PENDING;
    const countdown = upcoming ? countdownText(detail.startsAtUtc, now) : null;
    const badge = reservationStatusBadge(detail.status);
    const tone = reservationTone(detail.status);
    const parts = dateParts(detail.date);
    const note = headline.text ?? (countdown ? `${headline.lead} Rezervasyonunuza ${countdown}.` : headline.lead);
    const phone = detail.restaurantPhone;

    return (
        <section aria-labelledby="rez-baslik" className={cn(card, 'flex flex-col gap-6 p-5 sm:p-8 md:p-12')}>
            <div className="flex flex-wrap items-start justify-between gap-3" role="status" aria-live="polite">
                <div className="flex min-w-0 flex-col gap-2">
                    <span className="text-xs font-extrabold uppercase tracking-[0.2em] text-[var(--site-muted)]">Rezervasyon kartınız</span>
                    <h1 id="rez-baslik" className={cn(serif, 'm-0 break-words text-[36px] font-extrabold leading-[0.98] tracking-[-0.02em] sm:text-[44px] md:text-[52px] [&_.italic]:font-semibold [&_.italic]:text-[var(--site-terracotta-text)]')}>{headline.title}</h1>
                </div>
                <span className={cn('inline-flex h-10 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-extrabold', tone.badge)}>
                    <span aria-hidden="true" className={cn('h-2 w-2 rounded-full', tone.dot)} />{badge.text}
                </span>
            </div>

            {/* Bilet */}
            <div className="flex flex-wrap overflow-hidden rounded-[22px] bg-[var(--site-bg)] md:rounded-[28px]">
                <div className={cn('flex min-w-0 flex-[1_1_240px] flex-col gap-1.5 px-6 py-6 md:px-[30px] md:py-7', tone.ticket)}>
                    {detail.code && <span className="font-mono text-xs font-extrabold uppercase tracking-[0.2em]">{detail.code}</span>}
                    <span className={cn(serif, 'text-[44px] font-extrabold leading-none md:text-[54px]')}>{parts.day} {parts.month}</span>
                    <span className={cn(serif, 'text-[20px] font-semibold italic md:text-[22px]')}>{parts.weekday}{countdown && <span className="not-italic font-[family-name:var(--site-sans,Manrope,system-ui,sans-serif)] text-sm font-bold"> · {countdown}</span>}</span>
                </div>
                <div aria-hidden="true" className="hidden w-0 border-l-[3px] border-dashed border-[var(--site-card)] sm:block" />
                <dl className="m-0 grid min-w-0 flex-[1_1_240px] grid-cols-2 gap-[18px] px-6 py-6 md:px-[30px] md:py-7">
                    <TicketField label="Saat" value={detail.time} size="lg" />
                    <TicketField label="Kişi" value={String(detail.partySize)} size="lg" />
                    <TicketField label="Masa" value={detail.tableName.replace(/^Masa\s+/i, '')} />
                    <TicketField label="Bitiş" value={detail.endTime} />
                </dl>
            </div>

            <p className={cn('m-0 rounded-[18px] px-5 py-4 text-[15px] leading-relaxed', tone.note)}>{note}</p>

            {upcoming && (
                <div className="grid grid-cols-1 gap-2.5 min-[420px]:grid-cols-[repeat(auto-fit,minmax(150px,1fr))]">
                    <button type="button" onClick={onCalendar}
                        className="flex h-[54px] items-center justify-center gap-2 rounded-full bg-[var(--site-paper)] px-5 font-extrabold text-[var(--site-on-paper)] transition-opacity hover:opacity-90">
                        <CalendarPlus className="h-[17px] w-[17px]" aria-hidden="true" />Takvime ekle
                    </button>
                    {address && (
                        <a href={directionsUrl(address)} target="_blank" rel="noopener noreferrer"
                            className="flex h-[54px] items-center justify-center gap-2 rounded-full bg-[var(--site-bg)] px-5 font-extrabold text-[var(--site-text)] no-underline transition-opacity hover:opacity-90">
                            <Navigation className="h-4 w-4" aria-hidden="true" />Yol tarifi
                        </a>
                    )}
                    {phone && (
                        <a href={telHref(phone)} aria-label={`Restoranı ara: ${phone}`}
                            className="flex h-[54px] items-center justify-center gap-2 rounded-full bg-[var(--site-bg)] px-5 font-extrabold text-[var(--site-text)] no-underline transition-opacity hover:opacity-90">
                            <Phone className="h-4 w-4" aria-hidden="true" />Ara
                        </a>
                    )}
                </div>
            )}
            {children}
        </section>
    );
}

function TicketField({ label, value, size }: { label: string; value: string; size?: 'lg' }) {
    return (
        <div className="flex min-w-0 flex-col gap-0.5">
            <dt className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[var(--site-muted)]">{label}</dt>
            <dd className={cn(serif, 'm-0 truncate font-extrabold leading-tight tabular-nums', size === 'lg' ? 'text-[30px]' : 'text-[22px]')}>{value}</dd>
        </div>
    );
}

// Bekleyen talep: sonraki adımlar listede görünür (talep → restoran onayı → ön sipariş).
function PendingSteps({ detail }: { detail: ReservationDetail }) {
    const steps = [
        { label: 'Talep gönderildi', state: 'done' as const },
        { label: 'Restoran onayı', state: 'current' as const },
        ...(detail.preOrderWindow.enabled
            ? [{ label: `Ön sipariş açılır (${dayWord(localDateOf(detail.preOrderWindow.opensAt))} ${detail.preOrderWindow.opensAtTime})`, state: 'next' as const }]
            : []),
    ];
    return (
        <ol aria-label="Sonraki adımlar" className={cn(card, 'm-0 flex list-none flex-col gap-3 p-5')}>
            {steps.map(step => (
                <li key={step.label} aria-current={step.state === 'current' ? 'step' : undefined} className="flex items-center gap-3 text-[15px]">
                    <span aria-hidden="true" className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-full border',
                        step.state === 'done' ? 'border-[var(--site-text)] bg-[var(--site-paper)] text-[var(--site-on-paper)]'
                            : step.state === 'current' ? 'border-[var(--site-accent)] text-[var(--site-accent-text)]' : 'border-[var(--site-border)] text-[var(--site-muted)]')}>
                        {step.state === 'done' ? <Check className="h-3.5 w-3.5" strokeWidth={3} />
                            : step.state === 'current' ? <span className="h-2 w-2 animate-pulse rounded-full bg-current motion-reduce:animate-none" />
                                : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
                    </span>
                    <span className={cn(step.state === 'current' ? 'font-semibold' : step.state === 'next' && 'text-[var(--site-sub)]')}>{step.label}</span>
                </li>
            ))}
        </ol>
    );
}

// Onaylanmayan rezervasyon: aynı günün boş saatleri, yeni saat seçimi ve arama.
function RejectedNext({ detail, slots, phone }: { detail: ReservationDetail; slots: DaySlot[] | null; phone: string }) {
    const day = dayWord(detail.date);
    return (
        <section aria-labelledby="rez-bos-saatler" className={cn(card, 'flex flex-col gap-4 p-5')}>
            {slots === null ? (
                <div className="h-10 animate-pulse rounded-xl bg-[var(--site-raised)]" aria-busy="true" aria-label="Boş saatler yükleniyor" />
            ) : slots.length > 0 ? (
                <div>
                    <h2 id="rez-bos-saatler" className={cn(eyebrowClass, 'm-0')}>{day} için boş saatler</h2>
                    <ul className="m-0 mt-2.5 flex list-none flex-wrap gap-2 p-0">
                        {slots.slice(0, 8).map(slot => (
                            <li key={slot.time}>
                                <Link to={reservationHref({ date: detail.date, time: slot.time, partySize: detail.partySize })}
                                    className={cn(serif, 'flex h-11 items-center rounded-xl border border-[var(--site-border)] bg-[var(--site-card)] px-4 text-[20px] tabular-nums text-[var(--site-text)] no-underline hover:border-[var(--site-text)]')}>
                                    {slot.time}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>
            ) : (
                <p id="rez-bos-saatler" className="m-0 text-sm text-[var(--site-sub)]">{day} için boş saat kalmadı. Başka bir gün deneyin.</p>
            )}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Link to={reservationHref()} className={primaryButton}>Yeni saat seç</Link>
                {phone && <a href={telHref(phone)} className={secondaryButton}><Phone className="h-4 w-4" aria-hidden="true" />Restoranı ara</a>}
            </div>
        </section>
    );
}

// ── Kod ve iptal ───────────────────────────────────────────────────────────────────────────────

// Sağ sütun: zeytin kutuda kod (sorgulama bağlantısıyla) ve adres.
function CodeCard({ detail, address, restaurant }: { detail: ReservationDetail; address: string; restaurant: string }) {
    if (!detail.code && !address) return null;
    return (
        <section aria-label="Rezervasyon kodu" className="flex flex-col gap-4 rounded-[24px] bg-[var(--site-olive)] p-6 text-[var(--site-on-paper)] sm:p-8 md:rounded-[36px]">
            {detail.code && (
                <div className="flex flex-col gap-2">
                    <span className="text-xs font-extrabold uppercase tracking-[0.2em] text-[var(--site-mustard-text)]">Rezervasyon kodu</span>
                    <span className="font-mono text-[30px] font-bold tracking-[0.14em]">{detail.code}</span>
                    <p className="m-0 text-sm leading-relaxed text-[var(--site-on-paper-sub)]">
                        Bu kod ve telefon numaranızla rezervasyonunuzu <Link to={RESERVATION_LOOKUP_PATH} className="font-bold text-[var(--site-on-paper)] underline underline-offset-4">sorgulayabilirsiniz</Link>.
                    </p>
                </div>
            )}
            {address && (
                <div className={cn('flex items-start gap-3', detail.code && 'border-t border-[var(--site-paper-line-strong)] pt-4')}>
                    <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-[var(--site-mustard-text)]" aria-hidden="true" />
                    <div className="min-w-0">
                        <p className="m-0 font-extrabold">{restaurant}</p>
                        <p className="m-0 mt-0.5 text-[15px] leading-snug text-[var(--site-on-paper-sub)]">{address}</p>
                    </div>
                </div>
            )}
        </section>
    );
}

// Misafirin kendi iptali. İptal sayfanın içinde onaylanır (window.confirm bazı uygulama içi tarayıcılarda açılmaz);
// kimlik "Rezervasyon sorgula" ile aynı: kod + rezervasyondaki telefon.
function CancelArea({ detail, onCancelled }: { detail: ReservationDetail; onCancelled: (data: ReservationDetail) => void }) {
    const [open, setOpen] = useState(false);
    const [phone, setPhone] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const active = detail.status === RESERVATION_PENDING || detail.status === RESERVATION_CONFIRMED;
    if (!active) return null;

    const deadline = new Date(detail.cancelDeadline);
    const deadlineText = Number.isNaN(deadline.getTime()) ? null
        : `${dayWord(localDateOf(detail.cancelDeadline))} ${deadline.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`;

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        if (busy) return;
        if (phone.replace(/\D/g, '').length < 10) {
            setError('Rezervasyonda yazdığınız telefon numarasını eksiksiz girin.');
            return;
        }
        setBusy(true);
        setError(null);
        try {
            const data = await publicService.cancelReservation(detail.code, phone);
            onCancelled(data);
            setOpen(false);
            toast.success('Rezervasyonunuz iptal edildi.');
        } catch (err) {
            setError(getApiErrorMessage(err, 'Rezervasyon iptal edilemedi. Lütfen restoranı arayın.'));
        } finally {
            setBusy(false);
        }
    };

    if (!detail.canCancel) {
        return (
            <p className="m-0 text-sm text-[var(--site-muted)]">
                Rezervasyona 2 saatten az kaldı; iptal ya da değişiklik için restoranı arayın
                {detail.restaurantPhone && <>: <a href={telHref(detail.restaurantPhone)} className="inline-flex min-h-11 items-center font-bold text-[var(--site-text)]">{detail.restaurantPhone}</a></>}.
            </p>
        );
    }

    if (!open) {
        return (
            <div className="flex flex-col gap-0.5">
                <button type="button" onClick={() => { setOpen(true); setError(null); }}
                    className="inline-flex min-h-11 items-center self-start bg-transparent p-0 font-extrabold text-[var(--site-terracotta-text)] underline underline-offset-4">
                    Rezervasyonu iptal et
                </button>
                <p className="m-0 text-xs text-[var(--site-muted)]">Rezervasyona 2 saat kalana kadar online iptal edebilirsiniz.</p>
            </div>
        );
    }

    return (
        <form onSubmit={submit} noValidate className="flex flex-col gap-3 rounded-[18px] border-2 border-[var(--site-terracotta-text)] px-5 py-[18px]">
            <div>
                <p className="m-0 font-bold">Rezervasyon iptal edilsin mi? Bu işlem geri alınamaz.</p>
                <p className="m-0 mt-0.5 text-sm text-[var(--site-sub)]">
                    Onay için rezervasyonda yazdığınız telefon numarasını girin.{deadlineText && ` Son online iptal: ${deadlineText}.`}
                </p>
            </div>
            <label htmlFor="iptal-telefon" className="sr-only">Telefon</label>
            <input
                id="iptal-telefon"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={phone}
                onChange={e => { setPhone(formatTurkishPhoneInput(e.target.value)); setError(null); }}
                placeholder="05xx xxx xx xx"
                maxLength={16}
                aria-invalid={error ? true : undefined}
                className="h-12 w-full rounded-[14px] border border-[var(--site-border-strong)] bg-[var(--site-bg)] px-4 text-base tabular-nums focus:border-[var(--site-text)] focus:outline-none focus:ring-2 focus:ring-[var(--site-accent)]/40"
            />
            {error && <p role="alert" className="m-0 text-sm font-semibold text-[var(--site-error)]">{error}</p>}
            <div className="flex flex-wrap justify-end gap-2">
                <button type="button" onClick={() => setOpen(false)} disabled={busy}
                    className="h-12 rounded-full border border-[var(--site-border-strong)] bg-transparent px-5 font-bold text-[var(--site-text)] disabled:opacity-50">
                    Vazgeç
                </button>
                <button type="submit" disabled={busy}
                    className="h-12 rounded-full bg-[var(--site-error)] px-5 font-extrabold text-white transition-opacity hover:opacity-90 disabled:opacity-50">
                    {busy ? 'İptal ediliyor…' : 'Evet, iptal et'}
                </button>
            </div>
        </form>
    );
}

// ── Ön sipariş ─────────────────────────────────────────────────────────────────────────────────

// Pencere henüz açılmadı: ön sipariş bir vaat olarak, menünün öne çıkan yemeklerinin görselleriyle durur.
function PreOrderPromise({ detail, site }: { detail: ReservationDetail; site: PublicSite }) {
    const window_ = detail.preOrderWindow;
    const products = site.categories.flatMap(c => c.products).filter(p => p.imageUrl && !p.isOutOfStock);
    const strip = [...products.filter(p => p.isFeatured), ...products.filter(p => !p.isFeatured)].slice(0, 4);
    const opens = `${dayWord(localDateOf(window_.opensAt))} ${window_.opensAtTime}`;
    return (
        <section aria-labelledby="on-siparis-vaat" className={cn(card, 'flex flex-col gap-4 p-5')}>
            <div className="flex items-start gap-3">
                <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--site-bg)]"><ChefHat className="h-5 w-5" /></span>
                <div className="min-w-0">
                    <p className={cn(eyebrowClass, 'm-0')}>Ön sipariş</p>
                    <h2 id="on-siparis-vaat" className={cn(serif, 'm-0 mt-1 text-[26px] leading-tight')}>{opens} itibarıyla açılır.</h2>
                    <p className="m-0 mt-1 text-sm leading-relaxed text-[var(--site-sub)]">Siz oturunca mutfağa gider, beklemezsiniz. Ödeme restoranda, masa hesabınızla.</p>
                </div>
            </div>
            {strip.length > 0 && (
                <ul aria-label="Menüden" className="m-0 grid list-none grid-cols-4 gap-2 p-0">
                    {strip.map(p => (
                        <li key={p.id} className="min-w-0">
                            <img src={p.imageUrl} alt={p.name} loading="lazy" className="aspect-square w-full rounded-xl bg-[var(--site-raised)] object-cover" />
                            <span className="mt-1 block truncate text-xs text-[var(--site-sub)]">{p.name}</span>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}

function PreOrderSummary({ detail, productsById, restaurant, onEdit, onCancel, cancelling }: {
    detail: ReservationDetail;
    productsById: Map<string, PublicProduct>;
    restaurant: string;
    onEdit: () => void;
    onCancel: () => void;
    cancelling: boolean;
}) {
    const [confirming, setConfirming] = useState(false);
    const preOrder = detail.preOrder!;
    const status = preOrder.status;

    const heading = status === ORDER_REQUEST_PENDING
        ? { icon: <Check className="h-5 w-5 text-[var(--site-ok)]" strokeWidth={2.5} aria-hidden="true" />, title: 'Ön siparişiniz hazır bekliyor.', text: `${detail.tableName} masasına oturduğunuzda mutfağa gidecek. Ödeme restoranda, masa hesabınızla.` }
        : status === ORDER_REQUEST_APPROVED
            ? { icon: <ChefHat className="h-5 w-5 text-[var(--site-ok)]" aria-hidden="true" />, title: 'Ön siparişiniz mutfağa iletildi.', text: 'Afiyet olsun.' }
            : status === ORDER_REQUEST_CANCELLED
                ? { icon: <X className="h-5 w-5 text-[var(--site-sub)]" aria-hidden="true" />, title: 'Ön sipariş iptal edildi', text: detail.preOrderWindow.canPreOrder ? 'İsterseniz aşağıdan yeniden verebilirsiniz.' : '' }
                : status === ORDER_REQUEST_EXPIRED
                    ? { icon: <Clock className="h-5 w-5 text-[var(--site-sub)]" aria-hidden="true" />, title: 'Ön siparişin süresi doldu', text: 'Rezervasyon saatinden sonra masaya oturulmadığı için mutfağa gönderilmedi.' }
                    : null;
    if (!heading) return null;
    const active = status === ORDER_REQUEST_PENDING || status === ORDER_REQUEST_APPROVED;

    return (
        <section
            aria-label="Ön sipariş"
            role="status"
            className={cn('flex flex-col gap-3 rounded-[22px] border p-4 sm:p-5', active ? 'border-[var(--site-border)] bg-[var(--site-card)]' : 'border-[var(--site-border)] bg-[var(--site-raised)]')}
        >
            <div className="flex items-start gap-3">
                <span className="mt-0.5 shrink-0">{heading.icon}</span>
                <div>
                    <p className={cn(active ? cn(serif, 'text-[24px] leading-tight') : 'text-base font-semibold')}>{heading.title}</p>
                    {heading.text && <p className="mt-0.5 text-sm leading-relaxed text-[var(--site-sub)]">{heading.text}</p>}
                </div>
            </div>

            {active && (
                <>
                    <ul className="flex flex-col divide-y divide-[var(--site-line)] text-[15px]">
                        {preOrder.items.map((item, i) => {
                            const product = productsById.get(item.productId ?? '');
                            return (
                                <li key={`${item.productId}-${i}`} className="flex items-center gap-3 py-2.5">
                                    <ImageSlot src={product?.imageUrl} alt="" restaurant={restaurant} logoTextClassName="text-[9px]" className="h-12 w-12 shrink-0 rounded-xl" />
                                    <span className="min-w-0 flex-1">
                                        <span className="font-semibold tabular-nums">{item.quantity}×</span> {item.productName}
                                        {item.note && <span className="block text-sm text-[var(--site-sub)]">{item.note}</span>}
                                    </span>
                                    <span className="shrink-0 tabular-nums">{formatPrice(item.unitPrice * item.quantity)} ₺</span>
                                </li>
                            );
                        })}
                        <li className="flex justify-between pt-2.5 font-bold">
                            <span>Toplam</span>
                            <span className="tabular-nums">{formatPrice(preOrder.total)} ₺</span>
                        </li>
                    </ul>
                    {preOrder.note && <p className="text-sm"><span className="font-semibold">Not:</span> {preOrder.note}</p>}
                </>
            )}

            {(preOrder.canEdit || preOrder.canCancel) && !confirming && (
                <div className="grid grid-cols-2 gap-2">
                    {preOrder.canEdit && <button type="button" onClick={onEdit} className={primaryButton}>Değiştir</button>}
                    {preOrder.canCancel && (
                        <button type="button" onClick={() => setConfirming(true)} disabled={cancelling} className={cn(secondaryButton, !preOrder.canEdit && 'col-span-2')}>
                            İptal et
                        </button>
                    )}
                </div>
            )}

            {confirming && (
                <div role="alertdialog" aria-label="Ön sipariş iptali" className="flex flex-col gap-2.5 rounded-xl bg-[var(--site-bg)] p-3.5">
                    <p className="m-0 text-[15px] font-semibold">Ön siparişiniz iptal edilsin mi?</p>
                    <p className="m-0 text-sm text-[var(--site-sub)]">Rezervasyonunuz kalır; yalnız ön sipariş mutfağa gitmez.</p>
                    <div className="grid grid-cols-2 gap-2">
                        <button type="button" onClick={() => setConfirming(false)} disabled={cancelling} className={secondaryButton}>Vazgeç</button>
                        <button type="button" onClick={() => { onCancel(); setConfirming(false); }} disabled={cancelling}
                            className="flex h-12 items-center justify-center rounded-full bg-[var(--site-error)] px-4 text-[15px] font-semibold text-white hover:opacity-90 disabled:opacity-50">
                            {cancelling ? 'İptal ediliyor…' : 'Evet, iptal et'}
                        </button>
                    </div>
                </div>
            )}
        </section>
    );
}
