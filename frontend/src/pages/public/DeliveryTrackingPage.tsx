import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Check, ChevronDown, Phone, RotateCcw } from 'lucide-react';
import { isAxiosError } from 'axios';
import { publicDeliveryService } from '@/features/delivery/api/publicDeliveryService';
import { forgetOrder, rememberOrder } from '@/features/delivery/deliveryCart';
import { TRACKING_STEPS, isFinalStatus, trackingStepIndex } from '@/features/delivery/deliveryStatus';
import { DeliveryStatus, DoorPayment, type DeliveryLine, type DeliveryTracking } from '@/features/delivery/types';
import { getApiErrorMessage } from '@/lib/apiError';
import { formatPrice } from '@/lib/format';
import { cn } from '@/lib/utils';
import { customerRootStyle } from './customerTheme';
import { ImageSlot } from './site/SiteChrome';
import { FlowSiteHeader, HeaderSpacer } from './site/SiteFrame';
import { FONTS_HREF, serif } from './site/siteParts';
import { SITE_FONTS_HREF, glass, telHref } from './site/siteTheme';
import { useSite } from './site/useSite';

const POLL_MS = 15_000;

function timeOfDay(iso: string): string {
    return new Date(iso).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

function minutesBetween(fromIso: string, toIso: string): number {
    return Math.max(0, Math.round((new Date(toIso).getTime() - new Date(fromIso).getTime()) / 60_000));
}

/** Adımın misafire söylenen hâli ("Mutfakta hazırlanıyor"). */
const STEP_HEADLINE: Record<number, string> = {
    [DeliveryStatus.Received]: 'Siparişiniz restoranda',
    [DeliveryStatus.Accepted]: 'Restoran onayladı',
    [DeliveryStatus.Preparing]: 'Mutfakta hazırlanıyor',
    [DeliveryStatus.Ready]: 'Hazır · kurye bekleniyor',
    [DeliveryStatus.OnTheWay]: 'Yolda',
    [DeliveryStatus.Delivered]: 'Teslim edildi',
};

function paymentText(order: DeliveryTracking): string {
    return `Kapıda ${order.paymentPreference === DoorPayment.Nakit ? 'nakit' : 'kart'}`;
}

/** "2 Adana, 1 Ayran" — teslim ekranının kısa özeti. */
function linesSummary(lines: DeliveryLine[]): string {
    return lines.map(line => `${line.quantity} ${line.name}`).join(', ');
}

// Paket siparişin takip sayfası (/siparis/takip/:token). Anahtar siparişte verilen rastgele token'dır; sayfa açılınca
// sipariş bu cihazın "siparişlerim" listesine eklenir. Sayfa görünürken 15 sn'de bir yenilenir, son durumda durur.
// İlk bakışta misafirin asıl sorusu cevaplanır: "ne zaman gelir?" (büyük saat), altında 6 adımlı çubuk. Restoranın adı,
// rengi ve kapağı takip yanıtından gelir. Restoran onaylamadan müşteri iptal edebilir (onay sayfanın içinde açılır).
// "Tekrar sipariş ver" / "Sepete dön", gönderilen sepetin bu cihazdaki kopyasıyla /siparis?tekrar=<token> açar.
export default function DeliveryTrackingPage() {
    const { token = '' } = useParams();
    const [order, setOrder] = useState<DeliveryTracking | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [notFound, setNotFound] = useState(false);
    const [cancelling, setCancelling] = useState(false);
    const [confirmCancel, setConfirmCancel] = useState(false);
    const [cancelError, setCancelError] = useState<string | null>(null);
    const [images, setImages] = useState<Map<string, string>>(() => new Map());
    const [now, setNow] = useState(() => Date.now());
    // Sitenin üst menüsü için (kapak üstünde); alınamazsa menüsüz devam edilir.
    const { site, error: siteError } = useSite();
    const nav = !siteError;

    const load = useCallback(() => {
        publicDeliveryService.getTracking(token)
            .then(data => {
                setOrder(data);
                setError(null);
                rememberOrder({ token, number: data.number, createdAt: data.createdAt });
            })
            .catch(err => {
                if (isAxiosError(err) && err.response?.status === 400) {
                    setNotFound(true);
                    forgetOrder(token);
                }
                setError(getApiErrorMessage(err, 'Sipariş durumu alınamadı. Bağlantınızı kontrol edin.'));
            });
    }, [token]);

    const final = order ? isFinalStatus(order.status) : false;

    useEffect(() => {
        load();
    }, [load]);

    // Ürün küçük resimleri menüden ürün/menü kimliğiyle eşleşir; alınamazsa yer tutucu çizilir.
    useEffect(() => {
        let cancelled = false;
        publicDeliveryService.getOnlineOrdering()
            .then(menu => {
                if (cancelled) return;
                const map = new Map<string, string>();
                for (const product of menu.categories.flatMap(c => c.products)) if (product.imageUrl) map.set(product.id, product.imageUrl);
                for (const set of menu.setMenus) if (set.imageUrl) map.set(set.id, set.imageUrl);
                setImages(map);
            })
            .catch(() => { /* görselsiz devam */ });
        return () => { cancelled = true; };
    }, []);

    // Kalan dakika yazısı için saat.
    useEffect(() => {
        if (final) return;
        const timer = setInterval(() => setNow(Date.now()), 30_000);
        return () => clearInterval(timer);
    }, [final]);

    // Sayfa görünürken yokla; arka plandayken durur, öne gelince hemen yeniler. Son durumda hiç yoklamaz.
    useEffect(() => {
        if (final || notFound) return;
        let timer: ReturnType<typeof setInterval> | null = null;
        const start = () => {
            if (timer || document.visibilityState !== 'visible') return;
            timer = setInterval(load, POLL_MS);
        };
        const stop = () => {
            if (timer) clearInterval(timer);
            timer = null;
        };
        const onVisibility = () => {
            if (document.visibilityState === 'visible') { load(); start(); } else stop();
        };
        start();
        document.addEventListener('visibilitychange', onVisibility);
        return () => { stop(); document.removeEventListener('visibilitychange', onVisibility); };
    }, [final, notFound, load]);

    const cancel = async () => {
        setCancelling(true);
        setCancelError(null);
        try {
            await publicDeliveryService.cancel(token);
            setConfirmCancel(false);
            load();
        } catch (err) {
            setCancelError(getApiErrorMessage(err, 'Sipariş iptal edilemedi. Restoranı arayın.'));
            load();
        } finally {
            setCancelling(false);
        }
    };

    const reorderHref = `/siparis?tekrar=${encodeURIComponent(token)}`;
    const brand = order?.companyName || order?.branchName || '';

    const root = (children: ReactNode) => (
        <div style={customerRootStyle({ accentColor: order?.accentColor, theme: order?.theme, design: order?.design })} className="min-h-screen overflow-x-clip bg-[var(--site-bg)] text-[var(--site-text)]">
            <link rel="stylesheet" href={SITE_FONTS_HREF} precedence="default" />
            <link rel="stylesheet" href={FONTS_HREF} precedence="default" />
            {children}
        </div>
    );

    if (!order) {
        return root(
            <main className="mx-auto min-h-screen max-w-xl px-4 pb-16 pt-4">
                <Link to="/siparis" className="-ml-2 inline-flex h-11 items-center gap-1.5 rounded-full px-2 text-sm font-semibold text-[var(--site-text)] no-underline hover:bg-[var(--site-raised)]">
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" />Sipariş sayfası
                </Link>
                {error ? (
                    <div className="mt-10 text-center">
                        <h1 className={cn(serif, 'm-0 text-[40px] leading-none')}>{notFound ? <>Sipariş <span className="italic">bulunamadı.</span></> : <>Durum <span className="italic">alınamadı.</span></>}</h1>
                        <p className="mt-3 text-base text-[var(--site-sub)]">{error}</p>
                        {!notFound && <button type="button" onClick={load} className="mt-6 h-12 rounded-full bg-[var(--site-paper)] px-6 font-semibold text-[var(--site-on-paper)]">Tekrar dene</button>}
                    </div>
                ) : (
                    <div className="mt-4 space-y-3" aria-busy="true" aria-label="Sipariş durumu yükleniyor">
                        <div className="h-40 animate-pulse rounded-[22px] bg-[var(--site-ink)]" />
                        <div className="h-48 animate-pulse rounded-[22px] bg-[var(--site-raised)]" />
                        <div className="h-16 animate-pulse rounded-[22px] bg-[var(--site-raised)]" />
                    </div>
                )}
            </main>
        );
    }

    const step = trackingStepIndex(order.status);
    const failed = order.status === DeliveryStatus.Rejected || order.status === DeliveryStatus.Cancelled;
    const delivered = order.status === DeliveryStatus.Delivered;
    const itemCount = order.lines.reduce((sum, l) => sum + l.quantity, 0);

    // Kapak: üstte sitenin menüsü (yer tutucu boşlukla), altında sipariş sayfasına dönüş, ad ve sipariş numarası.
    const header = (
        <header className="relative overflow-hidden bg-[var(--site-ink)] text-white">
            {order.coverImageUrl && (
                <>
                    <img src={order.coverImageUrl} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover" />
                    <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(180deg,rgba(20,16,12,0.5),rgba(20,16,12,0.85))]" />
                </>
            )}
            {nav && <HeaderSpacer />}
            <div className={cn('relative mx-auto max-w-xl px-4 pb-6', nav ? 'pt-1' : 'pt-4')}>
                <Link to="/siparis" aria-label="Sipariş sayfasına dön"
                    className={cn(glass, 'flex h-11 w-11 items-center justify-center rounded-full text-white no-underline transition-colors hover:bg-white/25')}>
                    <ArrowLeft className="h-5 w-5" aria-hidden="true" />
                </Link>
                <p className={cn(serif, 'm-0 mt-5 truncate text-[34px] italic leading-none')}>{brand}</p>
                <p className="m-0 mt-2 text-xs font-medium uppercase tracking-[0.22em] text-white/80">
                    Sipariş #{order.number}{order.zoneName ? ` · ${order.zoneName}` : ''}
                    {failed ? ' · alınamadı' : ''}
                </p>
            </div>
        </header>
    );

    const callButton = order.restaurantPhone && (
        <a href={telHref(order.restaurantPhone)}
            className="flex h-12 items-center justify-center gap-2 rounded-full border border-[var(--site-border-strong)] bg-[var(--site-card)] text-[15px] font-semibold text-[var(--site-text)] no-underline transition-colors hover:border-[var(--site-text)]">
            <Phone className="h-4 w-4" aria-hidden="true" />Restoranı ara · {order.restaurantPhone}
        </a>
    );

    const card = 'rounded-[22px] border border-[var(--site-border)] bg-[var(--site-card)]';

    // ── Teslim edildi ──
    if (delivered) {
        return root(
            <>
                {nav && site && <FlowSiteHeader site={site} current="siparis" />}
                {header}
                <main className="mx-auto flex max-w-xl flex-col gap-4 px-4 pb-16 pt-6">
                    <section role="status" className={cn(card, 'flex flex-col items-center gap-2 px-5 py-8 text-center')}>
                        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--site-ok-bg)] text-[var(--site-ok)] ring-8 ring-[var(--site-ok-bg)]/50">
                            <Check className="h-7 w-7" strokeWidth={2.5} aria-hidden="true" />
                        </span>
                        <h1 className={cn(serif, 'm-0 mt-3 text-[52px] italic leading-none')}>Afiyet olsun.</h1>
                        <p className="m-0 text-[15px] text-[var(--site-sub)]">
                            #{order.number}
                            {order.deliveredAt && <> · {timeOfDay(order.deliveredAt)}&apos;de teslim edildi · {minutesBetween(order.createdAt, order.deliveredAt)} dk</>}
                        </p>
                        <p className="m-0 mt-3 max-w-sm text-[15px]">{linesSummary(order.lines)}</p>
                        <p className="m-0 text-sm text-[var(--site-sub)]">{formatPrice(order.total)} ₺ · {paymentText(order).toLocaleLowerCase('tr-TR')}</p>
                    </section>
                    <Link to={reorderHref}
                        className="flex h-14 items-center justify-center gap-2 rounded-full bg-[var(--site-accent)] text-base font-semibold text-[var(--site-on-accent)] no-underline transition-opacity hover:opacity-90">
                        <RotateCcw className="h-4 w-4" aria-hidden="true" />Tekrar sipariş ver
                    </Link>
                    {callButton}
                </main>
            </>
        );
    }

    // ── Reddedildi / iptal edildi ──
    if (failed) {
        const rejected = order.status === DeliveryStatus.Rejected;
        const reason = rejected ? order.rejectReason : order.cancelReason;
        return root(
            <>
                {nav && site && <FlowSiteHeader site={site} current="siparis" />}
                {header}
                <main className="mx-auto flex max-w-xl flex-col gap-4 px-4 pb-16 pt-6">
                    <section role="status" className={cn(card, 'flex flex-col gap-3 p-5')}>
                        <h1 className={cn(serif, 'm-0 text-[40px] leading-[1.02]')}>
                            {rejected ? <>Bu sefer <span className="italic">yetişemedik.</span></> : <>Siparişiniz <span className="italic">iptal edildi.</span></>}
                        </h1>
                        {reason && (
                            <blockquote className="m-0 border-l-2 border-[var(--site-accent)] pl-3 text-[16px] italic leading-relaxed">“{reason}”</blockquote>
                        )}
                        <p className="m-0 text-[15px] leading-relaxed text-[var(--site-sub)]">
                            Ödeme alınmadı. Sepetiniz duruyor, {rejected ? 'biraz sonra yeniden deneyebilirsiniz.' : 'dilediğinizde yeniden gönderebilirsiniz.'}
                        </p>
                    </section>
                    <Link to={reorderHref}
                        className="flex h-14 items-center justify-center rounded-full bg-[var(--site-accent)] text-base font-semibold text-[var(--site-on-accent)] no-underline transition-opacity hover:opacity-90">
                        Sepete dön
                    </Link>
                    {callButton}
                </main>
            </>
        );
    }

    // ── Açık sipariş: büyük saat + 6 adımlı çubuk ──
    const eta = order.estimatedDeliveryAt;
    const minutesLeft = eta ? Math.max(0, Math.ceil((new Date(eta).getTime() - now) / 60_000)) : null;
    const approx = minutesLeft != null && minutesLeft > 0 ? minutesLeft : order.estimatedMinutes ?? null;
    const onTheWay = order.status === DeliveryStatus.OnTheWay;

    const stamps = [
        { label: 'Alındı', at: order.createdAt },
        { label: 'Onaylandı', at: order.acceptedAt },
        { label: 'Yola çıktı', at: order.dispatchedAt },
    ].filter((s): s is { label: string; at: string } => !!s.at);

    return root(
        <>
            {nav && site && <FlowSiteHeader site={site} current="siparis" />}
            {header}
            <main className="mx-auto flex max-w-xl flex-col gap-4 px-4 pb-16 pt-6">
                <section aria-labelledby="takip-baslik" aria-live="polite" className={cn(card, 'p-5')}>
                    {eta ? (
                        <>
                            <h1 id="takip-baslik" className="m-0">
                                <span className="sr-only">Tahmini teslim </span>
                                <span className={cn(serif, 'block text-[76px] leading-[0.9] tabular-nums tracking-[-0.02em]')}>{timeOfDay(eta)}</span>
                                <span className={cn(serif, 'block text-[26px] italic leading-tight text-[var(--site-sub)]')}>civarında kapınızda.</span>
                            </h1>
                        </>
                    ) : (
                        <>
                            <h1 id="takip-baslik" className={cn(serif, 'm-0 text-[40px] leading-[1.02]')}>Siparişiniz <span className="italic">restoranda.</span></h1>
                            <p className="m-0 mt-2 text-[15px] text-[var(--site-sub)]">Restoran birazdan onaylayıp teslim saatini yazacak.</p>
                        </>
                    )}

                    <p className="m-0 mt-5 text-[15px] font-semibold">{STEP_HEADLINE[order.status] ?? order.statusLabel}</p>
                    <p className="m-0 text-sm text-[var(--site-sub)]">
                        Adım {step + 1}/{TRACKING_STEPS.length}{approx ? ` · yaklaşık ${approx} dk` : ''}
                    </p>

                    <ol aria-label="Sipariş adımları" className="m-0 mt-3 grid list-none grid-cols-6 gap-1.5 p-0">
                        {TRACKING_STEPS.map((label, i) => (
                            <li key={label} aria-current={i === step ? 'step' : undefined} className="min-w-0">
                                <span aria-hidden="true" className={cn('block h-1.5 rounded-full',
                                    i < step ? 'bg-[var(--site-text)]' : i === step ? 'bg-[var(--site-accent)] motion-safe:animate-pulse' : 'bg-[var(--site-raised)]')} />
                                <span className={cn('mt-1.5 block truncate text-[10px] font-medium', i === step ? 'text-[var(--site-text)]' : 'text-[var(--site-sub)]', i !== step && 'max-sm:sr-only')}>
                                    {label}{i < step && <span className="sr-only"> (tamamlandı)</span>}
                                </span>
                            </li>
                        ))}
                    </ol>

                    {stamps.length > 0 && (
                        <p className="m-0 mt-3 text-xs tabular-nums text-[var(--site-sub)]">
                            {stamps.map(s => `${s.label} ${timeOfDay(s.at)}`).join(' · ')}
                        </p>
                    )}
                    {order.statusDescription && !onTheWay && <p className="m-0 mt-2 text-sm text-[var(--site-sub)]">{order.statusDescription}</p>}
                </section>

                {onTheWay && (
                    <section aria-label="Kuryeniz" className={cn(card, 'flex items-center gap-4 p-5')}>
                        <span aria-hidden="true" className={cn(serif, 'flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[var(--site-paper)] text-[28px] text-[var(--site-on-paper)]')}>
                            {(order.courierFirstName || 'K').charAt(0).toLocaleUpperCase('tr-TR')}
                        </span>
                        <div className="min-w-0">
                            <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--site-sub)]">Kuryeniz</p>
                            <p className={cn(serif, 'm-0 text-[28px] leading-none')}>{order.courierFirstName || 'Yolda'}</p>
                            <p className="m-0 mt-1 text-sm text-[var(--site-sub)]">
                                {order.zoneName ? `${order.zoneName}'ya doğru yolda` : 'Size doğru yolda'}
                                {order.dispatchedAt && ` · ${timeOfDay(order.dispatchedAt)}'de yola çıktı`}
                            </p>
                            <p className="m-0 mt-1 text-sm font-semibold">{paymentText(order)} ile ödeyeceksiniz · {formatPrice(order.total)} ₺</p>
                        </div>
                    </section>
                )}

                {order.canCancel && (
                    <section aria-label="Siparişi iptal et" className={cn(card, 'p-4')}>
                        {confirmCancel ? (
                            <div role="alertdialog" aria-labelledby="iptal-soru" className="flex flex-col gap-3">
                                <p id="iptal-soru" className="m-0 text-[15px] font-semibold">Siparişiniz iptal edilsin mi?</p>
                                <div className="grid grid-cols-2 gap-2">
                                    <button type="button" onClick={() => setConfirmCancel(false)} disabled={cancelling}
                                        className="h-12 rounded-full border border-[var(--site-border-strong)] text-[15px] font-semibold disabled:opacity-50">
                                        Vazgeç
                                    </button>
                                    <button type="button" onClick={cancel} disabled={cancelling}
                                        className="h-12 rounded-full bg-[var(--site-error)] text-[15px] font-semibold text-white disabled:opacity-50">
                                        {cancelling ? 'İptal ediliyor…' : 'Evet, iptal et'}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <button type="button" onClick={() => { setConfirmCancel(true); setCancelError(null); }}
                                className="h-12 w-full rounded-full border border-[var(--site-border-strong)] text-[15px] font-semibold">
                                Siparişi iptal et
                            </button>
                        )}
                        <p className="m-0 mt-2 text-center text-xs text-[var(--site-muted)]">Restoran onaylayana kadar iptal edebilirsiniz.</p>
                        {cancelError && <p role="alert" className="m-0 mt-2 text-sm text-[var(--site-error)]">{cancelError}</p>}
                    </section>
                )}

                <OrderSummary order={order} images={images} restaurant={brand} itemCount={itemCount} />

                {callButton}

                <p className="m-0 text-center text-xs text-[var(--site-muted)]">Bu sayfa kendiliğinden yenilenir.</p>
                {error && <p className="m-0 text-center text-xs text-[var(--site-error)]">Son yenileme başarısız: {error}</p>}
            </main>
        </>
    );
}

/** Açılır sipariş kartı: "Siparişiniz · 3 ürün · 505 ₺"; içinde küçük resimli satırlar ve tutarlar. */
function OrderSummary({ order, images, restaurant, itemCount }: {
    order: DeliveryTracking; images: Map<string, string>; restaurant: string; itemCount: number;
}) {
    const [open, setOpen] = useState(false);
    return (
        <section aria-label="Siparişiniz" className="rounded-[22px] border border-[var(--site-border)] bg-[var(--site-card)]">
            <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open} aria-controls="takip-siparis"
                className="flex min-h-14 w-full items-center justify-between gap-3 px-5 py-3 text-left">
                <span className="text-[15px] font-semibold">Siparişiniz</span>
                <span className="flex items-center gap-2 text-sm tabular-nums text-[var(--site-sub)]">
                    {itemCount} ürün · {formatPrice(order.total)} ₺
                    <ChevronDown className={cn('h-4 w-4 transition-transform motion-reduce:transition-none', open && 'rotate-180')} aria-hidden="true" />
                </span>
            </button>
            {open && (
                <div id="takip-siparis" className="border-t border-[var(--site-border)] px-5 pb-4">
                    <ul className="m-0 list-none divide-y divide-[var(--site-border)] p-0">
                        {order.lines.map((line, i) => {
                            const image = (line.productId && images.get(line.productId)) || (line.setMenuId && images.get(line.setMenuId)) || '';
                            return (
                                <li key={i} className="flex items-center gap-3 py-3 text-[15px]">
                                    <div className="h-12 w-12 shrink-0">
                                        <ImageSlot src={image} alt="" restaurant={restaurant} className="h-full rounded-xl" logoTextClassName="text-[9px]" />
                                    </div>
                                    <span className="min-w-0 flex-1">
                                        <span className="font-semibold tabular-nums">{line.quantity}×</span> {line.name}
                                        {line.selections.length > 0 && <span className="block text-sm text-[var(--site-sub)]">{line.selections.join(', ')}</span>}
                                        {line.note && <span className="block text-sm text-[var(--site-sub)]">Not: {line.note}</span>}
                                    </span>
                                    <span className="shrink-0 tabular-nums">{formatPrice(line.lineTotal)} ₺</span>
                                </li>
                            );
                        })}
                    </ul>
                    <dl className="m-0 space-y-1 border-t border-[var(--site-border)] pt-2 text-[15px]">
                        <div className="flex justify-between text-[var(--site-sub)]"><dt>Ara toplam</dt><dd className="m-0 tabular-nums">{formatPrice(order.subtotal)} ₺</dd></div>
                        <div className="flex justify-between text-[var(--site-sub)]"><dt>Teslimat{order.zoneName ? ` (${order.zoneName})` : ''}</dt><dd className="m-0 tabular-nums">{formatPrice(order.deliveryFee)} ₺</dd></div>
                        <div className="flex justify-between text-lg font-bold"><dt>Toplam</dt><dd className="m-0 tabular-nums">{formatPrice(order.total)} ₺</dd></div>
                    </dl>
                </div>
            )}
            <p className="m-0 border-t border-[var(--site-border)] px-5 py-3 text-sm text-[var(--site-sub)]">
                {paymentText(order)} · {order.customerName}{order.zoneName ? ` · ${order.zoneName}` : ''}
            </p>
        </section>
    );
}
