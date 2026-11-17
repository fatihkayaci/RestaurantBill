import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, BadgeCheck, ClipboardCheck, Flame, House, MapPin, Package, Phone, RotateCcw, Truck } from 'lucide-react';
import { isAxiosError } from 'axios';
import { publicDeliveryService } from '@/features/delivery/api/publicDeliveryService';
import { forgetOrder, rememberOrder } from '@/features/delivery/deliveryCart';
import { TRACKING_STEPS, isFinalStatus, trackingStepIndex } from '@/features/delivery/deliveryStatus';
import { DeliveryStatus, DoorPayment, type DeliveryTracking } from '@/features/delivery/types';
import { getApiErrorMessage } from '@/lib/apiError';
import { formatPrice } from '@/lib/format';
import { cn } from '@/lib/utils';
import { customerFontsHref, customerRootStyle } from './customerTheme';
import { ImageSlot } from './site/SiteChrome';
import { FlowSiteHeader, SiteFooter } from './site/SiteFrame';
import { serif } from './site/siteParts';
import { resolveDesign, telHref } from './site/siteTheme';
import { EliteFlowStyle } from './site/elite/EliteFlowStyle';
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

// Paket siparişin takip sayfası (/siparis/takip/:token). Anahtar siparişte verilen rastgele token'dır; sayfa açılınca
// sipariş bu cihazın "siparişlerim" listesine eklenir. Sayfa görünürken 15 sn'de bir yenilenir, son durumda durur.
// Tasarım "Renkli · Siparişim": durum rengindeki kapakta başlık, kalan dakika dairesi ve 6 adım; altında krem sipariş
// kâğıdı (satırlar, tutarlar, iptal) ve sağda zeytin yardım/kurye kutusu, teslim ya da iptalde hardal "tekrar" kutusu.
// Restoranın rengi ve tasarımı takip yanıtından gelir; renkler yalnız site değişkenleridir (Sade'de de çalışır). Restoran onaylamadan müşteri iptal edebilir (onay sayfanın içinde açılır).
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

    // Elit: köşesiz, ince serif giydirme (rb-el-flow) ve duruma göre değişmeyen koyu espresso kapak.
    const elit = resolveDesign(order?.design) === 'elit';
    const root = (children: ReactNode) => (
        <div style={customerRootStyle({ accentColor: order?.accentColor, theme: order?.theme, design: order?.design, font: order?.font })} className={cn('flex min-h-screen flex-col overflow-x-clip bg-[var(--site-bg)] text-[var(--site-text)]', elit && 'rb-el-flow')}>
            <EliteFlowStyle design={order?.design} />
            <link rel="stylesheet" href={customerFontsHref(order)} precedence="default" />
            {children}
        </div>
    );

    if (!order) {
        return root(
            <main className="mx-auto min-h-screen w-full max-w-xl px-4 pb-16 pt-4">
                <Link to="/siparis" className="-ml-2 inline-flex h-11 items-center gap-1.5 rounded-full px-2 text-sm font-semibold text-[var(--site-text)] no-underline hover:bg-[var(--site-raised)]">
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" />Sipariş sayfası
                </Link>
                {error ? (
                    <div className="mt-10 text-center">
                        <h1 className={cn(serif, 'm-0 text-[40px] font-extrabold leading-none')}>{notFound ? <>Sipariş <em className="font-semibold italic text-[var(--site-terracotta-text)]">bulunamadı.</em></> : <>Durum <em className="font-semibold italic text-[var(--site-terracotta-text)]">alınamadı.</em></>}</h1>
                        <p className="mt-3 text-base text-[var(--site-sub)]">{error}</p>
                        {!notFound && <button type="button" onClick={load} className="mt-6 h-12 rounded-full bg-[var(--site-paper)] px-6 font-extrabold text-[var(--site-on-paper)]">Tekrar dene</button>}
                    </div>
                ) : (
                    <div className="mt-4 space-y-3" aria-busy="true" aria-label="Sipariş durumu yükleniyor">
                        <div className="h-64 animate-pulse rounded-[24px] bg-[var(--site-mustard)]" />
                        <div className="h-48 animate-pulse rounded-[24px] bg-[var(--site-card)]" />
                        <div className="h-24 animate-pulse rounded-[24px] bg-[var(--site-card)]" />
                    </div>
                )}
            </main>
        );
    }

    const step = trackingStepIndex(order.status);
    const failed = order.status === DeliveryStatus.Rejected || order.status === DeliveryStatus.Cancelled;
    const rejected = order.status === DeliveryStatus.Rejected;
    const delivered = order.status === DeliveryStatus.Delivered;
    const onTheWay = order.status === DeliveryStatus.OnTheWay;

    const eta = order.estimatedDeliveryAt;
    const minutesLeft = eta ? Math.max(0, Math.ceil((new Date(eta).getTime() - now) / 60_000)) : null;
    const approx = minutesLeft != null && minutesLeft > 0 ? minutesLeft : order.estimatedMinutes ?? null;

    const tone = elit && !failed ? ELIT_TONE : heroTone(order.status);
    const title = heroTitle(order.status);
    const reason = failed ? (rejected ? order.rejectReason : order.cancelReason) : '';

    // Kapağın açıklaması: sunucunun durum açıklaması; teslimde süre, olmayınca kısa bir yedek cümle.
    const desc = delivered
        ? <>#{order.number}{order.deliveredAt && <> · {timeOfDay(order.deliveredAt)}&apos;de teslim edildi · {minutesBetween(order.createdAt, order.deliveredAt)} dk</>}. Bizi tercih ettiğiniz için teşekkürler.</>
        : failed
            ? <>Ödeme alınmadı. Sepetiniz duruyor, {rejected ? 'biraz sonra yeniden deneyebilirsiniz.' : 'dilediğinizde yeniden gönderebilirsiniz.'}</>
            : order.statusDescription || (eta ? `${timeOfDay(eta)} civarında kapınızda.` : 'Restoran birazdan onaylayıp teslim saatini yazacak.');

    // Sağdaki daire: kalan dakika (yoksa tahmini saat); teslimde teslim saati.
    const badge: { label: string; value: string; sub: string } | null = delivered
        ? (order.deliveredAt ? { label: 'Teslim', value: timeOfDay(order.deliveredAt), sub: 'bugün' } : null)
        : failed ? null
            : approx ? { label: onTheWay ? 'Varış' : 'Kalan', value: String(approx), sub: eta ? `dakika · ${timeOfDay(eta)}` : 'dakika' }
                : eta ? { label: 'Tahmini', value: timeOfDay(eta), sub: 'civarında' } : null;

    const stampOf = (i: number): string => {
        const at = [order.createdAt, order.acceptedAt, null, null, order.dispatchedAt, order.deliveredAt][i];
        if (at) return timeOfDay(at);
        if (i === step && !delivered) return 'Şimdi';
        if (i === TRACKING_STEPS.length - 1 && eta) return `~${timeOfDay(eta)}`;
        return '';
    };

    const reorder = delivered || failed;
    const phone = order.restaurantPhone;

    return root(
        <>
            {nav && site && <FlowSiteHeader site={site} current="siparis" />}
            <main className={cn('mx-auto flex w-full flex-1 flex-col gap-4', elit ? 'max-w-[1280px] px-4 pb-16 pt-8 sm:px-10 md:gap-6 md:pt-12' : 'max-w-[1440px] px-2 pb-4 pt-4 sm:px-4')}>
                {/* ── Durum kapağı: rengi duruma göre (alındı hardal, mutfakta kiremit, yolda zeytin, teslim koyu) ── */}
                <section aria-labelledby="takip-baslik" className={cn('relative flex flex-col gap-8 overflow-hidden rounded-[24px] px-5 py-8 sm:px-10 sm:py-10 md:gap-10 md:rounded-[36px] md:px-14 md:pb-11 md:pt-12', tone.box)}>
                    <span aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(color-mix(in_srgb,currentColor_15%,transparent)_2px,transparent_2.6px)] bg-[length:22px_22px] [mask-image:linear-gradient(90deg,transparent_40%,#000_100%)]" />
                    <div className="relative flex flex-wrap items-end justify-between gap-7">
                        <div role="status" aria-live="polite" className="flex min-w-0 max-w-[720px] flex-col gap-3.5">
                            {!nav && (
                                <Link to="/siparis" className="-ml-2 inline-flex h-11 items-center gap-1.5 self-start rounded-full px-2 text-sm font-bold text-current no-underline">
                                    <ArrowLeft className="h-4 w-4" aria-hidden="true" />{brand || 'Sipariş sayfası'}
                                </Link>
                            )}
                            <span className="text-xs font-extrabold uppercase tracking-[0.24em]">
                                Sipariş #{order.number} · {order.zoneName || 'Paket servis'}
                            </span>
                            <h1 id="takip-baslik" className={cn(serif, 'm-0 break-words text-[44px] font-extrabold leading-[0.92] tracking-[-0.025em] sm:text-[56px] md:text-[clamp(56px,6.4vw,100px)]')}>
                                {title.lead}<br /><em className={cn('font-semibold italic', tone.em)}>{title.accent}</em>
                            </h1>
                            {reason && (
                                <blockquote className="m-0 max-w-[520px] border-l-[3px] border-current pl-3 text-[17px] italic leading-relaxed">“{reason}”</blockquote>
                            )}
                            <p className="m-0 max-w-[520px] text-base leading-relaxed md:text-[17px]">{desc}</p>
                        </div>
                        {badge && (
                            <div className={cn('flex h-[150px] w-[150px] shrink-0 flex-col items-center justify-center gap-0.5 rounded-full text-center md:h-[210px] md:w-[210px]', tone.badge)}>
                                <span className="text-[11px] font-extrabold uppercase tracking-[0.16em] md:text-xs">{badge.label}</span>
                                <span className={cn(serif, 'font-extrabold leading-none tabular-nums', badge.value.length > 3 ? 'text-[38px] md:text-[52px]' : 'text-[48px] md:text-[64px]')}>{badge.value}</span>
                                <span className="text-xs font-bold md:text-[13px]">{badge.sub}</span>
                            </div>
                        )}
                    </div>

                    {step >= 0 && (
                        <div className="relative flex flex-col gap-3">
                            <ol aria-label="Sipariş adımları" className="m-0 grid list-none grid-cols-6 p-0">
                                {TRACKING_STEPS.map((label, i) => {
                                    const done = i < step;
                                    const current = i === step;
                                    const Icon = STEP_ICONS[i];
                                    return (
                                        <li key={label} aria-current={current ? 'step' : undefined} className="flex min-w-0 flex-col gap-2 sm:gap-3">
                                            <div className="flex items-center">
                                                <span aria-hidden="true" className={cn('relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full sm:h-[54px] sm:w-[54px]',
                                                    current ? 'bg-[var(--trk-fg)] text-[var(--trk-bg)]'
                                                        : done ? 'bg-[color-mix(in_srgb,var(--trk-fg)_85%,transparent)] text-[var(--trk-bg)]'
                                                            : 'border-2 border-dashed border-[color-mix(in_srgb,var(--trk-fg)_45%,transparent)] text-[color-mix(in_srgb,var(--trk-fg)_65%,transparent)]')}>
                                                    {current && !delivered && <span className="absolute inset-0 rounded-full bg-[var(--trk-fg)] opacity-25 motion-safe:animate-ping" />}
                                                    <Icon className="relative h-[18px] w-[18px] sm:h-[22px] sm:w-[22px]" strokeWidth={2} />
                                                </span>
                                                <span aria-hidden="true" className={cn('mx-1 h-[3px] min-w-0 flex-1 rounded-sm sm:mx-2.5',
                                                    i === TRACKING_STEPS.length - 1 ? 'opacity-0' : done ? 'bg-[var(--trk-fg)]' : 'bg-[color-mix(in_srgb,var(--trk-fg)_25%,transparent)]')} />
                                            </div>
                                            <span className="pr-1 text-[15px] font-extrabold leading-tight max-sm:sr-only md:text-base">
                                                {label}{done && <span className="sr-only"> (tamamlandı)</span>}
                                            </span>
                                            <span aria-hidden="true" className="min-h-[1lh] text-[13px] font-semibold tabular-nums max-sm:hidden">{stampOf(i)}</span>
                                        </li>
                                    );
                                })}
                            </ol>
                            <p className="m-0 text-sm font-bold sm:hidden">
                                Adım {step + 1}/{TRACKING_STEPS.length} · {STEP_HEADLINE[order.status] ?? order.statusLabel}
                                {stampOf(step) && stampOf(step) !== 'Şimdi' ? ` · ${stampOf(step)}` : ''}
                            </p>
                        </div>
                    )}
                </section>

                <div className="flex flex-wrap items-start gap-4">
                    {/* ── Sipariş detayı ── */}
                    <section aria-labelledby="takip-siparis" className="flex min-w-0 flex-[999_1_620px] flex-col gap-5 rounded-[24px] bg-[var(--site-card)] p-5 sm:p-8 md:rounded-[36px] md:p-11">
                        <div className="flex flex-wrap items-baseline justify-between gap-3">
                            <h2 id="takip-siparis" className={cn(serif, 'm-0 text-[32px] leading-none md:text-[40px]')}>Siparişiniz</h2>
                            <span className="text-sm text-[var(--site-muted)]">{timeOfDay(order.createdAt)} · {paymentText(order)}</span>
                        </div>
                        <ul className="m-0 flex list-none flex-col p-0">
                            {order.lines.map((line, i) => {
                                const image = (line.productId && images.get(line.productId)) || (line.setMenuId && images.get(line.setMenuId)) || '';
                                return (
                                    <li key={i} className="flex items-center gap-3 border-b border-[var(--site-line)] py-4 sm:gap-3.5">
                                        <span className="flex h-[34px] min-w-[38px] shrink-0 items-center justify-center rounded-[10px] bg-[var(--site-bg)] px-2 font-extrabold tabular-nums">{line.quantity}×</span>
                                        <div className="hidden h-12 w-12 shrink-0 sm:block">
                                            <ImageSlot src={image} alt="" restaurant={brand} className="h-full rounded-xl" logoTextClassName="text-[9px]" />
                                        </div>
                                        <span className="min-w-0 flex-1">
                                            <span className={cn(serif, 'block break-words text-[19px] leading-tight md:text-[22px]')}>{line.name}</span>
                                            {line.selections.length > 0 && <span className="block text-sm text-[var(--site-sub)]">{line.selections.join(', ')}</span>}
                                            {line.note && <span className="block text-sm italic text-[var(--site-sub)]">Not: {line.note}</span>}
                                        </span>
                                        <span className="shrink-0 text-base font-extrabold tabular-nums">{formatPrice(line.lineTotal)} ₺</span>
                                    </li>
                                );
                            })}
                        </ul>
                        <dl className="m-0 flex flex-col gap-2 text-[15px]">
                            <div className="flex justify-between gap-3"><dt className="text-[var(--site-muted)]">Ara toplam</dt><dd className="m-0 font-bold tabular-nums">{formatPrice(order.subtotal)} ₺</dd></div>
                            <div className="flex justify-between gap-3"><dt className="text-[var(--site-muted)]">Teslimat{order.zoneName ? ` · ${order.zoneName}` : ''}</dt><dd className="m-0 font-bold tabular-nums">{order.deliveryFee > 0 ? `${formatPrice(order.deliveryFee)} ₺` : 'Ücretsiz'}</dd></div>
                            <div className="flex items-baseline justify-between gap-3 border-t border-dashed border-[var(--site-border-mid)] pt-3">
                                <dt className="font-extrabold">Toplam</dt>
                                <dd className={cn(serif, 'm-0 text-[34px] font-extrabold leading-none tabular-nums text-[var(--site-terracotta-text)] md:text-[40px]')}>{formatPrice(order.total)} ₺</dd>
                            </div>
                        </dl>
                        <div className="flex items-start gap-3.5 rounded-[20px] bg-[var(--site-bg)] px-5 py-[18px]">
                            <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-[var(--site-terracotta-text)]" aria-hidden="true" />
                            <div className="flex min-w-0 flex-col gap-0.5">
                                <span className="font-extrabold">Teslimat{order.zoneName ? ` · ${order.zoneName}` : ''}</span>
                                <span className="text-sm text-[var(--site-sub)]">{order.customerName} · {paymentText(order).toLocaleLowerCase('tr-TR')} ödeme</span>
                            </div>
                        </div>

                        {order.canCancel && (
                            <div aria-label="Siparişi iptal et" role="group">
                                {confirmCancel ? (
                                    <div role="alertdialog" aria-labelledby="iptal-soru" className="flex flex-wrap items-center justify-between gap-3 rounded-[18px] border-2 border-[var(--site-terracotta-text)] px-5 py-4">
                                        <p id="iptal-soru" className="m-0 font-bold">Siparişiniz iptal edilsin mi?</p>
                                        <div className="flex gap-2">
                                            <button type="button" onClick={() => setConfirmCancel(false)} disabled={cancelling}
                                                className="h-12 rounded-full border border-[var(--site-border-strong)] bg-transparent px-5 font-bold disabled:opacity-50">
                                                Vazgeç
                                            </button>
                                            <button type="button" onClick={cancel} disabled={cancelling}
                                                className="h-12 rounded-full bg-[var(--site-error)] px-5 font-extrabold text-white disabled:opacity-50">
                                                {cancelling ? 'İptal ediliyor…' : 'Evet, iptal et'}
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="m-0 flex flex-wrap items-center gap-x-1.5 text-sm text-[var(--site-muted)]">
                                        Restoran onaylayana kadar iptal edebilirsiniz.
                                        <button type="button" onClick={() => { setConfirmCancel(true); setCancelError(null); }}
                                            className="inline-flex min-h-11 items-center bg-transparent p-0 font-extrabold text-[var(--site-terracotta-text)] underline underline-offset-4">
                                            Siparişi iptal et
                                        </button>
                                    </p>
                                )}
                                {cancelError && <p role="alert" className="m-0 mt-2 text-sm font-semibold text-[var(--site-error)]">{cancelError}</p>}
                            </div>
                        )}

                        {!final && <p className="m-0 text-xs text-[var(--site-muted)]">Bu sayfa kendiliğinden yenilenir.</p>}
                        {error && <p className="m-0 text-xs font-semibold text-[var(--site-error)]">Son yenileme başarısız: {error}</p>}
                    </section>

                    {/* ── Sağ sütun: yardım / kurye, tekrar sipariş ── */}
                    <div className="flex min-w-0 flex-[1_1_380px] flex-col gap-4">
                        <section aria-labelledby="takip-yardim" className="flex flex-col gap-4 rounded-[24px] bg-[var(--site-olive)] p-6 text-[var(--site-on-paper)] sm:p-8 md:rounded-[36px]">
                            <span className="text-xs font-extrabold uppercase tracking-[0.2em] text-[var(--site-mustard-text)]">{onTheWay ? 'Kuryeniz yolda' : 'Yardım'}</span>
                            <h2 id="takip-yardim" className={cn(serif, 'm-0 text-[26px] leading-[1.1] md:text-[30px]')}>
                                {onTheWay
                                    ? <>{order.courierFirstName || 'Kuryemiz'} {order.zoneName ? `${order.zoneName}'ya doğru` : 'size doğru'} yolda.</>
                                    : 'Siparişinizle ilgili bir sorun mu var?'}
                            </h2>
                            {onTheWay && (
                                <p className="m-0 text-[15px] leading-relaxed text-[var(--site-on-paper-sub)]">
                                    {order.dispatchedAt && <>{timeOfDay(order.dispatchedAt)}&apos;de yola çıktı. </>}
                                    {paymentText(order)} ile ödeyeceksiniz · <span className="font-bold text-[var(--site-on-paper)]">{formatPrice(order.total)} ₺</span>
                                </p>
                            )}
                            <div className="flex flex-wrap gap-2">
                                {phone && (
                                    <a href={telHref(phone)} aria-label={`Restoranı ara: ${phone}`}
                                        className="flex h-[52px] min-w-[150px] flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-[var(--site-mustard)] px-4 font-extrabold text-[var(--site-text)] no-underline transition-opacity hover:opacity-90">
                                        <Phone className="h-[17px] w-[17px]" aria-hidden="true" />Restoranı ara
                                    </a>
                                )}
                                <Link to="/siparis"
                                    className="flex h-[52px] min-w-[150px] flex-1 items-center justify-center whitespace-nowrap rounded-full border-2 border-[var(--site-paper-line-strong)] px-4 font-extrabold text-[var(--site-on-paper)] no-underline transition-colors hover:border-[var(--site-on-paper)]">
                                    Sipariş sayfası
                                </Link>
                            </div>
                            {phone && <p className="m-0 text-sm tabular-nums text-[var(--site-on-paper-sub)]">{phone}</p>}
                        </section>

                        {reorder && (
                            <section aria-labelledby="takip-tekrar" className="flex flex-col gap-3.5 rounded-[24px] bg-[var(--site-mustard)] p-6 text-[var(--site-text)] sm:p-8 md:rounded-[36px]">
                                <h2 id="takip-tekrar" className={cn(serif, 'm-0 text-[28px] font-extrabold leading-[1.05] md:text-[32px]')}>
                                    {delivered ? 'Afiyet olsun! Bir daha?' : 'Sepetiniz duruyor.'}
                                </h2>
                                <p className="m-0 text-sm font-semibold">{delivered ? 'Aynı siparişi tek dokunuşla yeniden verin.' : 'Ürünleriniz sepette; dilediğinizde yeniden gönderin.'}</p>
                                <Link to={reorderHref}
                                    className="flex h-[52px] items-center justify-center gap-2 rounded-full bg-[var(--site-paper)] px-5 font-extrabold text-[var(--site-on-paper)] no-underline transition-opacity hover:opacity-90">
                                    {delivered && <RotateCcw className="h-4 w-4" aria-hidden="true" />}{delivered ? 'Tekrar sipariş ver' : 'Sepete dön'}
                                </Link>
                            </section>
                        )}
                    </div>
                </div>
            </main>
            {nav && site && <SiteFooter site={site} bottomBar={false} />}
        </>
    );
}

const STEP_ICONS = [ClipboardCheck, BadgeCheck, Flame, Package, Truck, House] as const;

/**
 * Kapağın tonu (tasarım: "Renkli · Siparişim"): alındı/onaylandı hardal, mutfakta/hazır kiremit, yolda zeytin, teslim
 * koyu, iptal/red krem kutu. Sade'de aynı değişkenler açık kum, vurgu ve mürekkep kutularıdır. `--trk-fg/--trk-bg` adım
 * dairelerinin rengidir (dolu daire kutunun yazı rengi, içindeki simge kutunun zemini). Daire (kalan dakika) kutunun tersi.
 */
/** Elit: her durumda koyu espresso kapak, krem yazı, vurgu (altın) italik ve vurgu zeminli rozet. */
const ELIT_TONE = {
    box: 'bg-[var(--site-paper)] text-[var(--site-on-paper)] [--trk-bg:var(--site-paper)] [--trk-fg:var(--site-on-paper)]',
    em: 'text-[var(--site-accent-on-dark)]',
    badge: 'bg-[var(--site-pop)] text-[var(--site-on-pop)]',
};

function heroTone(status: DeliveryTracking['status']): { box: string; em: string; badge: string } {
    switch (status) {
        case DeliveryStatus.Received:
        case DeliveryStatus.Accepted:
            return {
                box: 'bg-[var(--site-mustard)] text-[var(--site-text)] [--trk-bg:var(--site-mustard)] [--trk-fg:var(--site-text)]',
                em: 'text-[var(--site-story)]',
                badge: 'bg-[var(--site-paper)] text-[var(--site-on-paper)]',
            };
        case DeliveryStatus.Preparing:
        case DeliveryStatus.Ready:
            return {
                box: 'bg-[var(--site-terracotta)] text-[var(--site-on-terracotta)] [--trk-bg:var(--site-terracotta)] [--trk-fg:var(--site-on-terracotta)]',
                em: 'text-[var(--site-on-terracotta-soft)]',
                badge: 'bg-[var(--site-paper)] text-[var(--site-on-paper)]',
            };
        case DeliveryStatus.OnTheWay:
            return {
                box: 'bg-[var(--site-olive)] text-[var(--site-on-paper)] [--trk-bg:var(--site-olive)] [--trk-fg:var(--site-on-paper)]',
                em: 'text-[var(--site-mustard-text)]',
                badge: 'bg-[var(--site-mustard)] text-[var(--site-text)]',
            };
        case DeliveryStatus.Delivered:
            return {
                box: 'bg-[var(--site-paper)] text-[var(--site-on-paper)] [--trk-bg:var(--site-paper)] [--trk-fg:var(--site-on-paper)]',
                em: 'text-[var(--site-mustard-text)]',
                badge: 'bg-[var(--site-mustard)] text-[var(--site-text)]',
            };
        default:
            return {
                box: 'bg-[var(--site-card)] text-[var(--site-text)] [--trk-bg:var(--site-card)] [--trk-fg:var(--site-text)]',
                em: 'text-[var(--site-terracotta-text)]',
                badge: '',
            };
    }
}

/** Kapak başlığı: ilk satır + italik vurgu satırı. */
function heroTitle(status: DeliveryTracking['status']): { lead: string; accent: string } {
    switch (status) {
        case DeliveryStatus.Received: return { lead: 'Siparişiniz', accent: 'restoranda.' };
        case DeliveryStatus.Accepted: return { lead: 'Siparişiniz', accent: 'onaylandı.' };
        case DeliveryStatus.Preparing: return { lead: 'Siparişiniz', accent: 'hazırlanıyor.' };
        case DeliveryStatus.Ready: return { lead: 'Siparişiniz', accent: 'hazır.' };
        case DeliveryStatus.OnTheWay: return { lead: 'Siparişiniz', accent: 'yolda.' };
        case DeliveryStatus.Delivered: return { lead: 'Afiyet', accent: 'olsun!' };
        case DeliveryStatus.Rejected: return { lead: 'Bu sefer', accent: 'yetişemedik.' };
        default: return { lead: 'Siparişiniz', accent: 'iptal edildi.' };
    }
}
