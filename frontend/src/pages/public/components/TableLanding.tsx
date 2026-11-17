import { useEffect, useRef, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BellRing, CalendarDays, Check, ChevronRight, ClipboardList, Moon, Receipt, ShoppingBag, UtensilsCrossed } from 'lucide-react';
import { RESERVATION_LOOKUP_PATH } from '@/features/customerSite/reservationCode';
import type { PublicProduct, PublicSite } from '@/features/customerSite/types';
import { formatPrice } from '@/lib/format';
import { cn } from '@/lib/utils';
import { GlassStatusPill } from '../site/SiteCards';
import { ImageSlot } from '../site/SiteChrome';
import { serif } from '../site/siteParts';
import { opensText } from '../customerTheme';
import { formatClock, type TableActionState } from '../useTableAction';

export interface TableAction {
    state: TableActionState;
    remainingSeconds: number;
    /** true: sunucu yanıt verdi (gönderildi ya da az önce yapılmış). */
    trigger: () => Promise<boolean>;
}

interface Props {
    site: PublicSite;
    restaurantName: string;
    tableName: string;
    regionName: string;
    /** Sipariş açıksa "Menüyü gör, sipariş ver", değilse "Menüyü gör". */
    orderingEnabled: boolean;
    onOpenMenu: () => void;
    /** null: düğme gizli (admin kapattı). */
    callWaiter: TableAction | null;
    billRequest: TableAction | null;
    showDelivery: boolean;
    /** "Paket servis" bağlantısı: masanın şubesiyle açılır (/siparis?sube=…). */
    deliveryHref?: string;
    showReservation: boolean;
    /** Gönderilmiş sipariş varsa "Siparişlerim" düğmesi; pendingCount onay bekleyenler. */
    myOrders: { count: number; pendingCount: number; open: () => void } | null;
    /** Karoya dokunuldu: istek gönderilir, başarılıysa onay penceresi açılır (TableOrderPage). */
    onAction: (kind: TableActionKind) => void;
    /** Bekleme süresindeki karoya dokunuldu: onay penceresi yeniden açılır. */
    onShowConfirmation: (kind: TableActionKind) => void;
}

export type TableActionKind = 'waiter' | 'bill';

const MAX_PICKS = 6;

/** Karşılamadaki öneri şeridi: öne çıkanlar (görseli olanlar önce), yoksa görselli ilk ürünler. Tükenenler yok. */
function chefPicks(site: PublicSite): PublicProduct[] {
    const all = site.categories.flatMap(c => c.products).filter(p => !p.isOutOfStock);
    const featured = all.filter(p => p.isFeatured).sort((a, b) => Number(!!b.imageUrl) - Number(!!a.imageUrl));
    return (featured.length > 0 ? featured : all.filter(p => p.imageUrl)).slice(0, MAX_PICKS);
}

// Masadaki QR'ın açtığı ilk ekran (tasarım A "Kapaklı karşılama"): sitenin kapağı, açık/kapalı hapı, tek ana eylem (menü),
// başparmak hizasında garson + hesap, şefin önerileri ve ikincil bağlantılar. Garson/hesap gönderilince ekranın en büyük
// nesnesi onay penceresi olur (geri sayım çubuğuyla). Admin'in kapattığı özellikler hiç gösterilmez.
export default function TableLanding({
    site, restaurantName, tableName, regionName, orderingEnabled, onOpenMenu, callWaiter, billRequest, showDelivery,
    deliveryHref = '/siparis', showReservation, myOrders, onAction, onShowConfirmation,
}: Props) {
    const closed = site.isOpenNow === false;
    const { opensAt, closesAt, coverImageUrl } = site.site;
    const picks = chefPicks(site);
    const reopen = opensText(opensAt);

    const statusText = site.isOpenNow === null ? null
        : site.isOpenNow ? (closesAt ? `Açık · ${closesAt}'e kadar` : 'Şu an açık')
            : 'Şu an kapalı';

    return (
        <main className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-[var(--site-bg)] pb-10">
            <header className="relative overflow-hidden bg-[var(--site-hero)] text-white">
                {coverImageUrl && (
                    <>
                        <img src={coverImageUrl} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover" />
                        <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(180deg,rgba(20,16,12,0.5),rgba(20,16,12,0.3)_40%,rgba(20,16,12,0.85))]" />
                    </>
                )}
                <div className="relative flex min-h-[300px] flex-col px-5 pb-16 pt-5">
                    <div className="flex items-center justify-between gap-3">
                        <span className={cn(serif, 'truncate text-[26px] italic leading-none')}>{restaurantName}</span>
                        {statusText && <GlassStatusPill open={site.isOpenNow}>{statusText}</GlassStatusPill>}
                    </div>
                    <div className="mt-auto pt-10">
                        <p className="m-0 text-xs font-medium uppercase tracking-[0.24em] text-white/80">
                            <span className="sr-only">Masa: </span>{tableName}{regionName && <> · {regionName}</>}
                        </p>
                        <h1 className={cn(serif, 'm-0 mt-2 text-[52px] leading-[0.95] tracking-[-0.02em]')}>
                            {closed ? <>Şu an <span className="italic">kapalıyız.</span></> : <>Hoş <span className="italic">geldiniz.</span></>}
                        </h1>
                    </div>
                </div>
            </header>

            <div className="relative -mt-10 flex flex-col gap-3 px-4">
                {closed && (
                    <section aria-label="Restoran kapalı" className="flex flex-col gap-2 rounded-[20px] bg-[var(--site-paper)] p-5 text-[var(--site-on-paper)]">
                        <p className="m-0 flex items-center gap-2 text-sm font-semibold text-[var(--site-on-paper-sub)]">
                            <Moon className="h-4 w-4" aria-hidden="true" />Mutfak kapandı
                        </p>
                        <p className={cn(serif, 'm-0 text-[26px] leading-tight')}>
                            {reopen ? `${reopen} açılıyoruz.` : 'Şu an sipariş alamıyoruz.'}
                        </p>
                        <p className="m-0 text-sm leading-relaxed text-[var(--site-on-paper-sub)]">Menüye göz atabilirsiniz, sipariş şu an gönderilemez.</p>
                    </section>
                )}

                <button
                    type="button"
                    onClick={onOpenMenu}
                    className={cn('flex min-h-[84px] w-full items-center gap-4 rounded-[20px] px-5 py-4 text-left shadow-[0_18px_40px_-20px_rgba(20,16,12,0.55)] transition-opacity hover:opacity-95',
                        closed ? 'border border-[var(--site-border)] bg-[var(--site-card)] text-[var(--site-text)]' : 'bg-[var(--site-accent)] text-[var(--site-on-accent)]')}
                >
                    <span aria-hidden="true" className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-full', closed ? 'bg-[var(--site-raised)]' : 'bg-white/20')}>
                        <UtensilsCrossed className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                        <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] opacity-80">Menü</span>
                        <span className="block text-lg font-semibold leading-tight">
                            {closed ? 'Menüye göz at' : orderingEnabled ? 'Menüyü gör, sipariş ver' : 'Menüyü gör'}
                        </span>
                        {orderingEnabled && !closed && <span className="mt-0.5 block text-sm opacity-85">Garson onaylayınca mutfağa gider</span>}
                    </span>
                    <ArrowRight className="h-5 w-5 shrink-0 opacity-80" aria-hidden="true" />
                </button>

                {(callWaiter || billRequest) && (
                    <div className={cn('grid gap-3', callWaiter && billRequest ? 'grid-cols-2' : 'grid-cols-1')}>
                        {callWaiter && (
                            <ActionTile action={callWaiter} icon={<BellRing className="h-5 w-5" />} title="Garson çağır"
                                busyTitle="Çağrılıyor…" waitingText="çağrıldı" onClick={() => onAction('waiter')}
                                onReopen={() => onShowConfirmation('waiter')} />
                        )}
                        {billRequest && (
                            <ActionTile action={billRequest} icon={<Receipt className="h-5 w-5" />} title="Hesap iste"
                                busyTitle="İsteniyor…" waitingText="istendi" onClick={() => onAction('bill')}
                                onReopen={() => onShowConfirmation('bill')} />
                        )}
                    </div>
                )}

                {myOrders && (
                    <button type="button" onClick={myOrders.open}
                        className="flex min-h-16 w-full items-center gap-3 rounded-[20px] border border-[var(--site-border)] bg-[var(--site-card)] px-4 text-left">
                        <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--site-raised)]"><ClipboardList className="h-5 w-5" /></span>
                        <span className="min-w-0 flex-1">
                            <span className="block text-base font-semibold">Siparişlerim</span>
                            <span className="block text-sm text-[var(--site-sub)]">
                                {myOrders.pendingCount > 0 ? `${myOrders.pendingCount} sipariş garson onayı bekliyor` : `${myOrders.count} sipariş gönderildi`}
                            </span>
                        </span>
                        <ChevronRight className="h-5 w-5 shrink-0 text-[var(--site-sub)]" aria-hidden="true" />
                    </button>
                )}
            </div>

            {picks.length > 0 && (
                <section aria-labelledby="sefin-onerileri" className="mt-7">
                    <div className="flex items-baseline justify-between px-5">
                        <h2 id="sefin-onerileri" className={cn(serif, 'm-0 text-[28px] leading-none')}>Şefin <span className="italic">önerileri</span></h2>
                        <button type="button" onClick={onOpenMenu} className="flex h-11 items-center text-sm font-semibold text-[var(--site-text)] underline underline-offset-4">Tümü</button>
                    </div>
                    <ul className="mt-2 flex snap-x gap-3 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                        {picks.map(product => (
                            <li key={product.id} className="w-[132px] shrink-0 snap-start">
                                <button type="button" onClick={onOpenMenu} className="flex w-full flex-col gap-2 text-left">
                                    <ImageSlot src={product.imageUrl} alt={product.name} restaurant={restaurantName}
                                        logoTextClassName="text-[min(15px,13cqw)]" className="aspect-square rounded-2xl" />
                                    <span className="line-clamp-2 text-[15px] font-semibold leading-snug">{product.name}</span>
                                    <span className="text-sm font-bold tabular-nums">{formatPrice(product.price)} ₺</span>
                                </button>
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            {(showDelivery || showReservation) && (
                <nav aria-label="Diğer" className="mt-7 flex flex-col gap-2.5 px-4">
                    <div className={cn('grid gap-2.5', showDelivery && showReservation ? 'grid-cols-2' : 'grid-cols-1')}>
                        {showDelivery && (
                            <Link to={deliveryHref} className="flex min-h-14 items-center gap-2.5 rounded-2xl border border-[var(--site-border)] bg-[var(--site-card)] px-4 text-[15px] font-semibold text-[var(--site-text)] no-underline">
                                <ShoppingBag className="h-5 w-5 shrink-0 text-[var(--site-sub)]" aria-hidden="true" />Paket servis
                            </Link>
                        )}
                        {showReservation && (
                            <Link to="/rezervasyon" className="flex min-h-14 items-center gap-2.5 rounded-2xl border border-[var(--site-border)] bg-[var(--site-card)] px-4 text-[15px] font-semibold text-[var(--site-text)] no-underline">
                                <CalendarDays className="h-5 w-5 shrink-0 text-[var(--site-sub)]" aria-hidden="true" />{closed ? 'Masa ayırt' : 'Rezervasyon'}
                            </Link>
                        )}
                    </div>
                    {showReservation && (
                        <Link to={RESERVATION_LOOKUP_PATH} className="flex min-h-11 items-center justify-center text-sm font-semibold text-[var(--site-sub)] underline underline-offset-4">
                            Rezervasyonunuz var mı? Kodla sorgulayın
                        </Link>
                    )}
                </nav>
            )}

        </main>
    );
}

// Garson çağır / Hesap iste karosu: gönderilince bekleme süresi boyunca karo "Çağrıldı · 0:45" olur; dokununca onay
// penceresi yeniden açılır. Hata karonun altında yazar.
function ActionTile({ action, icon, title, busyTitle, waitingText, onClick, onReopen }: {
    action: TableAction; icon: ReactNode; title: string; busyTitle: string; waitingText: string;
    onClick: () => void; onReopen: () => void;
}) {
    const { state, remainingSeconds } = action;
    const waiting = state.status === 'done' && remainingSeconds > 0;
    return (
        <div className="flex flex-col">
            <button
                type="button"
                onClick={waiting ? onReopen : onClick}
                disabled={state.status === 'sending'}
                className={cn('flex min-h-[104px] flex-col items-start justify-between gap-3 rounded-[20px] border p-4 text-left transition-colors disabled:opacity-60',
                    waiting ? 'border-[var(--site-ok-line)] bg-[var(--site-ok-bg)] text-[var(--site-ok)]' : 'border-[var(--site-border)] bg-[var(--site-card)] text-[var(--site-text)] hover:border-[var(--site-border-strong)]')}
            >
                <span aria-hidden="true" className={cn('flex h-10 w-10 items-center justify-center rounded-full', waiting ? 'bg-white/60' : 'bg-[var(--site-raised)]')}>
                    {waiting ? <Check className="h-5 w-5" strokeWidth={2.5} /> : icon}
                </span>
                <span className="text-base font-semibold leading-tight">
                    {state.status === 'sending' ? busyTitle : waiting ? <>{title.split(' ')[0]} {waitingText}<span className="block text-sm font-medium tabular-nums opacity-80">{formatClock(remainingSeconds)}</span></> : title}
                </span>
            </button>
            {state.status === 'error' && <p role="alert" className="m-0 mt-1.5 px-1 text-sm font-medium text-[var(--site-error)]">{state.message}</p>}
        </div>
    );
}

/** Garson çağrıldı / Hesap istendi onayı (karşılamada ve menüde aynı pencere). */
export function TableActionConfirmation({ kind, callWaiter, billRequest, regionName, onClose, onOpenMenu, onAction }: {
    kind: TableActionKind;
    callWaiter: TableAction | null;
    billRequest: TableAction | null;
    regionName: string;
    onClose: () => void;
    /** "Menüye dön": karşılamadaysa menüyü açar; menüdeyse yalnız kapatır (verilmez). */
    onOpenMenu?: () => void;
    onAction: (kind: TableActionKind) => void;
}) {
    if (kind === 'waiter' && callWaiter) {
        const repeat = callWaiter.state.status === 'done' && !callWaiter.state.sent;
        return (
            <ActionConfirmation
                action={callWaiter}
                title={repeat ? <>Garson az önce <span className="italic">çağrıldı.</span></> : <>Garson <span className="italic">geliyor.</span></>}
                text={`${regionName ? `${regionName} bölümüne` : 'Masanıza bakan garsona'} haber verildi`}
                againText="sonra tekrar çağırabilirsiniz"
                secondary={billRequest ? { label: 'Hesap iste', onClick: () => { onClose(); onAction('bill'); } } : null}
                onClose={onClose}
                closeLabel="Menüye dön"
                onCloseToMenu={onOpenMenu}
            />
        );
    }
    if (kind === 'bill' && billRequest) {
        const repeat = billRequest.state.status === 'done' && !billRequest.state.sent;
        return (
            <ActionConfirmation
                action={billRequest}
                title={repeat ? <>Hesap az önce <span className="italic">istendi.</span></> : <>Hesabınız <span className="italic">geliyor.</span></>}
                text="Garson ve kasa bilgilendirildi. Hesap birkaç dakika içinde masanıza gelir."
                againText="sonra tekrar isteyebilirsiniz"
                billTotal={billRequest.state.status === 'done' ? billRequest.state.billTotal : null}
                secondary={null}
                onClose={onClose}
                closeLabel="Tamam"
            />
        );
    }
    return null;
}

// Onay anı: ekranın en büyük nesnesi. Geri sayım çubuğu sunucunun bildirdiği bekleme süresini (retryAfterSeconds) gösterir.
function ActionConfirmation({ action, title, text, againText, billTotal, secondary, onClose, closeLabel, onCloseToMenu }: {
    action: TableAction;
    title: ReactNode;
    text: string;
    againText: string;
    billTotal?: number | null;
    secondary: { label: string; onClick: () => void } | null;
    onClose: () => void;
    closeLabel: string;
    onCloseToMenu?: () => void;
}) {
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => { ref.current?.focus(); }, []);
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    const { state, remainingSeconds } = action;
    const done = state.status === 'done' ? state : null;
    const sentAt = done ? new Date(done.at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : null;
    const share = done && done.window > 0 ? Math.min(1, remainingSeconds / done.window) : 0;

    return (
        <div className="fixed inset-0 z-40 flex flex-col justify-end bg-black/55 sm:items-center sm:justify-center" onClick={onClose}>
            <div
                ref={ref}
                tabIndex={-1}
                role="dialog"
                aria-modal="true"
                aria-labelledby="masa-onay-baslik"
                onClick={e => e.stopPropagation()}
                className="w-full max-w-md rounded-t-[28px] bg-[var(--site-card)] px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-7 text-[var(--site-text)] outline-none animate-in slide-in-from-bottom duration-200 sm:rounded-[28px]"
            >
                <span aria-hidden="true" className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--site-ok-bg)] text-[var(--site-ok)] ring-8 ring-[var(--site-ok-bg)]/50">
                    <Check className="h-7 w-7" strokeWidth={2.5} />
                </span>
                <h2 id="masa-onay-baslik" role="status" className={cn(serif, 'm-0 mt-5 text-[40px] leading-[1] tracking-[-0.02em]')}>{title}</h2>
                <p className="m-0 mt-2 text-[15px] leading-relaxed text-[var(--site-sub)]">{text}{sentAt && <> · {sentAt}</>}</p>

                {billTotal != null && billTotal > 0 && (
                    <div className="mt-4 flex items-baseline justify-between rounded-2xl bg-[var(--site-raised)] px-4 py-3">
                        <span className="text-sm font-medium text-[var(--site-sub)]">Masa toplamı</span>
                        <span className={cn(serif, 'text-[28px] leading-none tabular-nums')}>{formatPrice(billTotal)} ₺</span>
                    </div>
                )}

                {remainingSeconds > 0 && (
                    <div className="mt-5">
                        <div className="h-1.5 overflow-hidden rounded-full bg-[var(--site-raised)]" aria-hidden="true">
                            <div className="h-full rounded-full bg-[var(--site-accent)] transition-[width] duration-1000 ease-linear" style={{ width: `${share * 100}%` }} />
                        </div>
                        <p className="m-0 mt-2 text-sm tabular-nums text-[var(--site-sub)]">{formatClock(remainingSeconds)} {againText}</p>
                    </div>
                )}

                <div className="mt-6 flex flex-col gap-2.5">
                    {secondary && (
                        <button type="button" onClick={secondary.onClick}
                            className="flex h-12 items-center justify-center gap-2 rounded-full border border-[var(--site-border-strong)] text-[15px] font-semibold">
                            <Receipt className="h-4 w-4" aria-hidden="true" />{secondary.label}
                        </button>
                    )}
                    <button type="button" onClick={() => { onClose(); onCloseToMenu?.(); }}
                        className="flex h-14 items-center justify-center rounded-full bg-[var(--site-paper)] text-base font-semibold text-[var(--site-on-paper)]">
                        {closeLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
