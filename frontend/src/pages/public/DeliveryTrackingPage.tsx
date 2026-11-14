import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Check, Phone, X } from 'lucide-react';
import { publicDeliveryService } from '@/features/delivery/api/publicDeliveryService';
import { forgetOrder, rememberOrder } from '@/features/delivery/deliveryCart';
import { TRACKING_STEPS, isFinalStatus, trackingStepIndex } from '@/features/delivery/deliveryStatus';
import { DeliveryStatus, DoorPayment, type DeliveryTracking } from '@/features/delivery/types';
import { isAxiosError } from 'axios';
import { getApiErrorMessage } from '@/lib/apiError';
import { formatPrice } from '@/lib/format';
import { cn } from '@/lib/utils';
import { SITE_FONTS_HREF, headingFont, siteRootStyle, telHref } from './site/siteTheme';

const POLL_MS = 15_000;

function timeOfDay(iso: string): string {
    return new Date(iso).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

// Paket siparişin takip sayfası (/siparis/takip/:token). Anahtar siparişte verilen rastgele token'dır; sayfa açılınca
// sipariş bu cihazın "siparişlerim" listesine eklenir. Sayfa görünürken 15 sn'de bir yenilenir, son durumda durur.
// Restoran onaylamadan müşteri iptal edebilir.
export default function DeliveryTrackingPage() {
    const { token = '' } = useParams();
    const [order, setOrder] = useState<DeliveryTracking | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [notFound, setNotFound] = useState(false);
    const [cancelling, setCancelling] = useState(false);
    const [cancelError, setCancelError] = useState<string | null>(null);

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
        if (!window.confirm('Siparişiniz iptal edilsin mi?')) return;
        setCancelling(true);
        setCancelError(null);
        try {
            await publicDeliveryService.cancel(token);
            load();
        } catch (err) {
            setCancelError(getApiErrorMessage(err, 'Sipariş iptal edilemedi. Restoranı arayın.'));
            load();
        } finally {
            setCancelling(false);
        }
    };

    const root = (children: ReactNode) => (
        <div style={siteRootStyle()} className="min-h-screen bg-[var(--site-bg)]">
            <link rel="stylesheet" href={SITE_FONTS_HREF} precedence="default" />
            <main className="mx-auto min-h-screen max-w-xl px-4 pb-16 pt-4">
                <Link to="/siparis" className="-ml-2 inline-flex h-11 items-center gap-1.5 rounded-full px-2 text-sm font-semibold text-[var(--site-text)] no-underline hover:bg-[var(--site-raised)]">
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" />Sipariş sayfası
                </Link>
                {children}
            </main>
        </div>
    );

    if (!order) {
        return root(error ? (
            <div className="mt-10 text-center">
                <h1 className={cn(headingFont, 'text-3xl font-bold')}>{notFound ? 'Sipariş bulunamadı' : 'Durum alınamadı'}</h1>
                <p className="mt-2 text-base text-[var(--site-sub)]">{error}</p>
                {!notFound && <button type="button" onClick={load} className="mt-6 h-12 rounded-full bg-[var(--site-paper)] px-6 font-semibold text-[var(--site-on-paper)]">Tekrar dene</button>}
            </div>
        ) : (
            <div className="mt-6 space-y-3" aria-busy="true">
                <div className="h-10 w-48 animate-pulse rounded-lg bg-[var(--site-raised)]" />
                <div className="h-40 animate-pulse rounded-2xl bg-[var(--site-raised)]" />
            </div>
        ));
    }

    const step = trackingStepIndex(order.status);
    const failed = order.status === DeliveryStatus.Rejected || order.status === DeliveryStatus.Cancelled;
    const reason = order.status === DeliveryStatus.Rejected ? order.rejectReason : order.cancelReason;

    return root(
        <>
            <header className="mt-2">
                <p className="text-sm text-[var(--site-sub)]">{order.branchName} · Paket sipariş</p>
                <h1 className={cn(headingFont, 'text-4xl font-bold')}>#{order.number}</h1>
                <p className="mt-1 text-lg font-semibold">{order.statusLabel}</p>
                {order.statusDescription && <p className="text-[15px] text-[var(--site-sub)]">{order.statusDescription}</p>}
            </header>

            {failed ? (
                <div role="status" className="mt-5 rounded-2xl border border-[var(--site-error-line)] bg-[var(--site-error-bg)] p-4 text-[var(--site-error)]">
                    <p className="flex items-center gap-2 font-semibold">
                        <X className="h-5 w-5" aria-hidden="true" />
                        {order.status === DeliveryStatus.Rejected ? 'Sipariş reddedildi' : 'Sipariş iptal edildi'}
                    </p>
                    {reason && <p className="mt-1 text-[15px]">{reason}</p>}
                </div>
            ) : (
                <ol className="mt-6 flex flex-col gap-0" aria-label="Sipariş adımları">
                    {TRACKING_STEPS.map((label, i) => {
                        const done = i < step || (i === step && order.status === DeliveryStatus.Delivered);
                        const current = i === step && order.status !== DeliveryStatus.Delivered;
                        return (
                            <li key={label} className="flex gap-3" aria-current={current ? 'step' : undefined}>
                                <div className="flex flex-col items-center">
                                    <span className={cn(
                                        'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold',
                                        done ? 'border-[var(--site-ok)] bg-[var(--site-ok)] text-white'
                                            : current ? 'border-[var(--site-accent)] text-[var(--site-accent)]'
                                                : 'border-[var(--site-border-strong)] text-[var(--site-disabled)]'
                                    )}>
                                        {done ? <Check className="h-4 w-4" strokeWidth={3} aria-hidden="true" /> : i + 1}
                                    </span>
                                    {i < TRACKING_STEPS.length - 1 && <span className={cn('w-0.5 flex-1 min-h-6', i < step ? 'bg-[var(--site-ok)]' : 'bg-[var(--site-border-strong)]')} />}
                                </div>
                                <p className={cn('pb-5 pt-1 text-[15px]', current ? 'font-bold' : done ? 'font-semibold' : 'text-[var(--site-sub)]')}>
                                    {label}
                                    {current && order.status === DeliveryStatus.Ready && <span className="font-normal text-[var(--site-sub)]"> · hazır, kurye bekleniyor</span>}
                                </p>
                            </li>
                        );
                    })}
                </ol>
            )}

            {!failed && (order.estimatedDeliveryAt || order.deliveredAt) && (
                <p className="rounded-2xl bg-[var(--site-raised)] px-4 py-3 text-[15px]">
                    {order.deliveredAt
                        ? <>Teslim edildi: <b>{timeOfDay(order.deliveredAt)}</b></>
                        : <>Tahmini teslim: <b>{timeOfDay(order.estimatedDeliveryAt!)}</b>{order.estimatedMinutes ? ` (yaklaşık ${order.estimatedMinutes} dk)` : ''}</>}
                </p>
            )}

            {order.canCancel && (
                <div className="mt-4">
                    <button type="button" onClick={cancel} disabled={cancelling}
                        className="h-12 w-full rounded-full border border-[var(--site-border-strong)] text-[15px] font-semibold disabled:opacity-50">
                        {cancelling ? 'İptal ediliyor…' : 'Siparişi iptal et'}
                    </button>
                    <p className="mt-1.5 text-center text-xs text-[var(--site-muted)]">Restoran onaylayana kadar iptal edebilirsiniz.</p>
                    {cancelError && <p role="alert" className="mt-2 text-sm text-[var(--site-error)]">{cancelError}</p>}
                </div>
            )}

            <section className="mt-6 rounded-2xl border border-[var(--site-border)] p-4">
                <h2 className={cn(headingFont, 'text-xl font-bold')}>Siparişiniz</h2>
                <ul className="mt-2 divide-y divide-[var(--site-border)]">
                    {order.lines.map((line, i) => (
                        <li key={i} className="flex justify-between gap-3 py-2 text-[15px]">
                            <span className="min-w-0">
                                {line.quantity}× {line.name}
                                {line.selections.length > 0 && <span className="block text-sm text-[var(--site-sub)]">{line.selections.join(', ')}</span>}
                                {line.note && <span className="block text-sm text-[var(--site-sub)]">Not: {line.note}</span>}
                            </span>
                            <span className="shrink-0 tabular-nums">{formatPrice(line.lineTotal)} ₺</span>
                        </li>
                    ))}
                </ul>
                <dl className="mt-2 space-y-1 border-t border-[var(--site-border)] pt-2 text-[15px]">
                    <div className="flex justify-between text-[var(--site-sub)]"><dt>Ara toplam</dt><dd className="tabular-nums">{formatPrice(order.subtotal)} ₺</dd></div>
                    <div className="flex justify-between text-[var(--site-sub)]"><dt>Teslimat ({order.zoneName})</dt><dd className="tabular-nums">{formatPrice(order.deliveryFee)} ₺</dd></div>
                    <div className={cn(headingFont, 'flex justify-between text-xl font-bold')}><dt>Toplam</dt><dd className="tabular-nums">{formatPrice(order.total)} ₺</dd></div>
                </dl>
                <p className="mt-2 text-sm text-[var(--site-sub)]">
                    Kapıda {order.paymentPreference === DoorPayment.Nakit ? 'nakit' : 'kart'} · {order.customerName} · {order.customerPhone}
                </p>
            </section>

            {order.restaurantPhone && (
                <a href={telHref(order.restaurantPhone)}
                    className="mt-4 flex h-12 items-center justify-center gap-2 rounded-full bg-[var(--site-paper)] text-[15px] font-semibold text-[var(--site-on-paper)] no-underline">
                    <Phone className="h-4 w-4" aria-hidden="true" />Restoranı ara · {order.restaurantPhone}
                </a>
            )}

            {!final && <p className="mt-3 text-center text-xs text-[var(--site-muted)]">Bu sayfa kendiliğinden yenilenir.</p>}
            {error && order && <p className="mt-2 text-center text-xs text-[var(--site-error)]">Son yenileme başarısız: {error}</p>}
        </>
    );
}
