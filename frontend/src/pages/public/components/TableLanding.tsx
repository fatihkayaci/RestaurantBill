import { useEffect, useRef, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BellRing, CalendarDays, Check, ChevronRight, ClipboardList, Landmark, Moon, Receipt, ShoppingBag } from 'lucide-react';
import { RESERVATION_LOOKUP_PATH } from '@/features/customerSite/reservationCode';
import type { PublicProduct, PublicSite } from '@/features/customerSite/types';
import { formatPrice } from '@/lib/format';
import { cn } from '@/lib/utils';
import { GlassStatusPill } from '../site/SiteCards';
import { ImageSlot } from '../site/SiteChrome';
import { serif } from '../site/siteParts';
import { opensText } from '../customerTheme';
import {
    accentItalic, creamBox, displayTitle, eyebrowAccent, heroBox, heroPattern, pillDark, pillOutline, sheetBackdrop, sheetPanel,
} from '../table/tableUi';
import { formatClock, type TableActionState } from '../useTableAction';
import { StockImageLabel } from './StockImageLabel';
import { TableBadge } from './TableBadge';

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
    /** "IBAN ile öde" penceresini açar; null: restoran açmadı (karo yok). */
    onPayByIban: (() => void) | null;
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

// Masadaki QR'ın açtığı ilk ekran ("Renkli ve sıcak"): kum sayfada kapak renginde kutu (ad, açık/kapalı hapı, masa, selam
// ve hardal ana eylem: menü), altında krem kutular: garson + hesap, siparişlerim, şefin önerileri ve ikincil bağlantılar. Garson/hesap gönderilince ekranın en büyük
// nesnesi onay penceresi olur (geri sayım çubuğuyla). Admin'in kapattığı özellikler hiç gösterilmez.
export default function TableLanding({
    site, restaurantName, tableName, regionName, orderingEnabled, onOpenMenu, callWaiter, billRequest, onPayByIban, showDelivery,
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
        <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col gap-2 px-2 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-2 sm:gap-3 sm:px-4 sm:pt-4">
            {/* Kapak: temanın kapak renginde kutu (fotoğraf varsa arkasında, kapak rengi perdeyle); ad, durum, masa, selam ve ana eylem. */}
            <header className={cn(heroBox, 'flex flex-col')}>
                {coverImageUrl ? (
                    <>
                        <img src={coverImageUrl} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover" />
                        <span aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(180deg,color-mix(in_srgb,var(--site-hero-bg)_70%,transparent),color-mix(in_srgb,var(--site-hero-bg)_92%,transparent)_55%)]" />
                    </>
                ) : (
                    <span aria-hidden="true" className={heroPattern} />
                )}
                <div className="relative flex min-h-[340px] flex-col px-5 pb-5 pt-5 sm:px-8 sm:pb-8 sm:pt-7">
                    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
                        <span className={cn(serif, 'min-w-0 truncate text-[24px] italic leading-none')}>{restaurantName}</span>
                        {(statusText || coverImageUrl?.includes('/shared/stock/')) && (
                            <span className="flex items-center gap-2">
                                {coverImageUrl?.includes('/shared/stock/') && <StockImageLabel className="static" />}
                                {statusText && <GlassStatusPill open={site.isOpenNow}>{statusText}</GlassStatusPill>}
                            </span>
                        )}
                    </div>
                    <div className="mt-auto flex flex-col gap-3 pt-12">
                        <TableBadge tableName={tableName} regionName={regionName} className="self-start" />
                        <h1 className={cn(displayTitle, 'text-[56px] sm:text-[68px]')}>
                            {closed ? <>Şu an <em className="font-semibold italic">kapalıyız.</em></> : <>Hoş <em className="font-semibold italic">geldiniz.</em></>}
                        </h1>
                        <button
                            type="button"
                            onClick={onOpenMenu}
                            className={cn('mt-3 flex min-h-[60px] w-full items-center justify-between gap-3 rounded-full py-2 pl-6 pr-2 text-left transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--site-on-paper)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--site-hero-bg)]',
                                closed ? 'border-2 border-[rgba(251,244,232,0.55)] text-[var(--site-on-paper)]' : 'bg-[var(--site-mustard)] text-[var(--site-text)]')}
                        >
                            <span className="min-w-0">
                                <span className="block text-[17px] font-extrabold leading-tight">
                                    {closed ? 'Menüye göz at' : orderingEnabled ? 'Menüyü gör, sipariş ver' : 'Menüyü gör'}
                                </span>
                                {orderingEnabled && !closed && <span className="block text-[13px] font-semibold">Garson onaylayınca mutfağa gider</span>}
                            </span>
                            <span aria-hidden="true" className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-full',
                                closed ? 'bg-[rgba(251,244,232,0.15)]' : 'bg-[var(--site-paper)] text-[var(--site-on-paper)]')}>
                                <ArrowRight className="h-5 w-5" />
                            </span>
                        </button>
                    </div>
                </div>
            </header>

            {closed && (
                <section aria-label="Restoran kapalı" className="flex flex-col gap-2 rounded-[24px] bg-[var(--site-paper)] p-5 text-[var(--site-on-paper)] sm:p-7">
                    <p className="m-0 flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.2em] text-[var(--site-on-paper-sub)]">
                        <Moon className="h-4 w-4" aria-hidden="true" />Mutfak kapandı
                    </p>
                    <p className={cn(serif, 'm-0 text-[28px] leading-tight')}>
                        {reopen ? `${reopen} açılıyoruz.` : 'Şu an sipariş alamıyoruz.'}
                    </p>
                    <p className="m-0 text-sm leading-relaxed text-[var(--site-on-paper-sub)]">Menüye göz atabilirsiniz, sipariş şu an gönderilemez.</p>
                </section>
            )}

            {(callWaiter || billRequest) && (
                <div className={cn('grid gap-2 sm:gap-3', callWaiter && billRequest ? 'grid-cols-2' : 'grid-cols-1')}>
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

            {onPayByIban && (
                <button type="button" onClick={onPayByIban}
                    className={cn(creamBox, 'flex min-h-[72px] w-full items-center gap-3 px-4 text-left transition-colors hover:bg-[var(--site-alt)] sm:px-5')}>
                    <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--site-accent)] text-[var(--site-on-accent)]"><Landmark className="h-5 w-5" /></span>
                    <span className="min-w-0 flex-1">
                        <span className={cn(serif, 'block text-[20px] leading-tight')}>IBAN ile öde</span>
                        <span className="block text-sm text-[var(--site-sub)]">Havale / EFT, dekontu WhatsApp'tan gönderin</span>
                    </span>
                    <ChevronRight className="h-5 w-5 shrink-0 text-[var(--site-sub)]" aria-hidden="true" />
                </button>
            )}

            {myOrders && (
                <button type="button" onClick={myOrders.open}
                    className={cn(creamBox, 'flex min-h-[72px] w-full items-center gap-3 px-4 text-left transition-colors hover:bg-[var(--site-alt)] sm:px-5')}>
                    <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--site-paper)] text-[var(--site-on-paper)]"><ClipboardList className="h-5 w-5" /></span>
                    <span className="min-w-0 flex-1">
                        <span className={cn(serif, 'block text-[20px] leading-tight')}>Siparişlerim</span>
                        <span className="block text-sm text-[var(--site-sub)]">
                            {myOrders.pendingCount > 0 ? `${myOrders.pendingCount} sipariş garson onayı bekliyor` : `${myOrders.count} sipariş gönderildi`}
                        </span>
                    </span>
                    {myOrders.pendingCount > 0 && (
                        <span aria-hidden="true" className="flex h-7 min-w-7 items-center justify-center rounded-full bg-[var(--site-mustard)] px-2 text-[13px] font-extrabold tabular-nums text-[var(--site-text)]">{myOrders.pendingCount}</span>
                    )}
                    <ChevronRight className="h-5 w-5 shrink-0 text-[var(--site-sub)]" aria-hidden="true" />
                </button>
            )}

            {picks.length > 0 && (
                <section aria-labelledby="sefin-onerileri" className={cn(creamBox, 'py-6 sm:py-7')}>
                    <div className="flex items-end justify-between gap-3 px-5 sm:px-7">
                        <div className="min-w-0">
                            <p className={cn(eyebrowAccent, 'm-0')}>Mutfaktan</p>
                            <h2 id="sefin-onerileri" className={cn(serif, 'm-0 mt-1.5 text-[32px] leading-none')}>Şefin <em className={accentItalic}>önerileri</em></h2>
                        </div>
                        <button type="button" onClick={onOpenMenu} className="flex h-11 shrink-0 items-center gap-1 text-sm font-bold text-[var(--site-text)] underline underline-offset-4">
                            Tümü<span aria-hidden="true">→</span>
                        </button>
                    </div>
                    <ul className="m-0 mt-4 flex list-none snap-x scroll-px-5 gap-3 overflow-x-auto px-5 pb-1 [scrollbar-width:none] sm:scroll-px-7 sm:px-7 [&::-webkit-scrollbar]:hidden">
                        {picks.map(product => (
                            <li key={product.id} className="w-[138px] shrink-0 snap-start">
                                <button type="button" onClick={onOpenMenu} className="flex w-full flex-col gap-2 rounded-[20px] text-left">
                                    <ImageSlot src={product.imageUrl} alt={product.name} restaurant={restaurantName}
                                        logoTextClassName="text-[min(15px,13cqw)]" className="aspect-square rounded-[20px] border-[3px] border-[var(--site-mustard)]" />
                                    <span className={cn(serif, 'line-clamp-2 text-[17px] leading-snug')}>{product.name}</span>
                                    <span className="text-[15px] font-extrabold tabular-nums text-[var(--site-accent-text)]">{formatPrice(product.price)} ₺</span>
                                </button>
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            {(showDelivery || showReservation) && (
                <nav aria-label="Diğer" className="flex flex-col gap-2">
                    <div className={cn('grid gap-2 sm:gap-3', showDelivery && showReservation ? 'grid-cols-2' : 'grid-cols-1')}>
                        {showDelivery && (
                            <Link to={deliveryHref} className={cn(creamBox, 'flex min-h-16 items-center gap-3 px-4 text-[15px] font-bold no-underline transition-colors hover:bg-[var(--site-alt)]')}>
                                <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--site-bg)]"><ShoppingBag className="h-[18px] w-[18px]" /></span>
                                Paket servis
                            </Link>
                        )}
                        {showReservation && (
                            <Link to="/rezervasyon" className={cn(creamBox, 'flex min-h-16 items-center gap-3 px-4 text-[15px] font-bold no-underline transition-colors hover:bg-[var(--site-alt)]')}>
                                <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--site-bg)]"><CalendarDays className="h-[18px] w-[18px]" /></span>
                                {closed ? 'Masa ayırt' : 'Rezervasyon'}
                            </Link>
                        )}
                    </div>
                    {showReservation && (
                        <Link to={RESERVATION_LOOKUP_PATH} className="flex min-h-11 items-center justify-center text-sm font-bold text-[var(--site-sub)] underline underline-offset-4">
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
                className={cn('flex min-h-[120px] flex-col items-start justify-between gap-4 rounded-[24px] border-2 p-4 text-left transition-colors disabled:opacity-60 sm:p-5',
                    waiting ? 'border-[var(--site-ok-line)] bg-[var(--site-ok-bg)] text-[var(--site-ok)]' : 'border-transparent bg-[var(--site-card)] text-[var(--site-text)] hover:border-[var(--site-border-strong)]')}
            >
                <span aria-hidden="true" className={cn('flex h-11 w-11 items-center justify-center rounded-full',
                    waiting ? 'bg-[var(--site-ok)] text-[var(--site-ok-bg)]' : 'bg-[var(--site-accent)] text-[var(--site-on-accent)]')}>
                    {waiting ? <Check className="h-5 w-5" strokeWidth={2.5} /> : icon}
                </span>
                <span className={cn(serif, 'text-[21px] leading-[1.05]')}>
                    {state.status === 'sending' ? busyTitle : waiting ? <>{title.split(' ')[0]} {waitingText}<span className="mt-1 block font-[family-name:var(--site-sans,Manrope,system-ui,sans-serif)] text-sm font-bold tabular-nums tracking-normal">{formatClock(remainingSeconds)}</span></> : title}
                </span>
            </button>
            {state.status === 'error' && <p role="alert" className="m-0 mt-1.5 rounded-2xl bg-[var(--site-error-bg)] px-3 py-2 text-sm font-semibold text-[var(--site-error)]">{state.message}</p>}
        </div>
    );
}

/** Garson çağrıldı / Hesap istendi onayı (karşılamada ve menüde aynı pencere). */
export function TableActionConfirmation({ kind, callWaiter, billRequest, regionName, onClose, onOpenMenu, onAction, onPayByIban }: {
    kind: TableActionKind;
    callWaiter: TableAction | null;
    billRequest: TableAction | null;
    regionName: string;
    onClose: () => void;
    /** "Menüye dön": karşılamadaysa menüyü açar; menüdeyse yalnız kapatır (verilmez). */
    onOpenMenu?: () => void;
    onAction: (kind: TableActionKind) => void;
    /** Hesap onayında "IBAN ile öde" (restoran açtıysa). */
    onPayByIban?: () => void;
}) {
    if (kind === 'waiter' && callWaiter) {
        const repeat = callWaiter.state.status === 'done' && !callWaiter.state.sent;
        return (
            <ActionConfirmation
                action={callWaiter}
                title={repeat ? <>Garson az önce <span className="italic">çağrıldı.</span></> : <>Garson <span className="italic">geliyor.</span></>}
                text={`${regionName ? `${regionName} bölümüne` : 'Masanıza bakan garsona'} haber verildi`}
                againText="sonra tekrar çağırabilirsiniz"
                secondary={billRequest ? { label: 'Hesap iste', icon: <Receipt className="h-4 w-4" aria-hidden="true" />, onClick: () => { onClose(); onAction('bill'); } } : null}
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
                secondary={onPayByIban ? { label: 'IBAN ile öde', icon: <Landmark className="h-4 w-4" aria-hidden="true" />, onClick: () => { onClose(); onPayByIban(); } } : null}
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
    secondary: { label: string; icon: ReactNode; onClick: () => void } | null;
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
        <div className={sheetBackdrop} onClick={onClose}>
            <div
                ref={ref}
                tabIndex={-1}
                role="dialog"
                aria-modal="true"
                aria-labelledby="masa-onay-baslik"
                onClick={e => e.stopPropagation()}
                className={cn(sheetPanel, 'sm:max-w-md')}
            >
                {/* Üst: kapak renginde şerit, ortada onay işareti (hardal daire). */}
                <div className="relative flex h-[92px] shrink-0 items-end bg-[var(--site-hero-bg)] px-6">
                    <span aria-hidden="true" className={heroPattern} />
                    <span aria-hidden="true" className="relative translate-y-1/2 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--site-mustard)] text-[var(--site-text)] ring-[6px] ring-[var(--site-card)]">
                        <Check className="h-8 w-8" strokeWidth={2.75} />
                    </span>
                </div>
                <div className="overflow-y-auto px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-12">
                    <h2 id="masa-onay-baslik" role="status" className={cn(displayTitle, 'text-[42px] [&_.italic]:text-[var(--site-accent-text)]')}>{title}</h2>
                    <p className="m-0 mt-2.5 text-[15px] leading-relaxed text-[var(--site-sub)]">{text}{sentAt && <> · {sentAt}</>}</p>

                    {billTotal != null && billTotal > 0 && (
                        <div className="mt-5 flex items-baseline justify-between gap-3 rounded-[20px] bg-[var(--site-paper)] px-5 py-4 text-[var(--site-on-paper)]">
                            <span className="text-xs font-extrabold uppercase tracking-[0.18em] text-[var(--site-on-paper-sub)]">Masa toplamı</span>
                            <span className={cn(serif, 'text-[30px] leading-none tabular-nums')}>{formatPrice(billTotal)} ₺</span>
                        </div>
                    )}

                    {remainingSeconds > 0 && (
                        <div className="mt-5">
                            <div className="h-2 overflow-hidden rounded-full bg-[var(--site-bg)]" aria-hidden="true">
                                <div className="h-full rounded-full bg-[var(--site-accent)] transition-[width] duration-1000 ease-linear" style={{ width: `${share * 100}%` }} />
                            </div>
                            <p className="m-0 mt-2 text-sm font-semibold tabular-nums text-[var(--site-sub)]">{formatClock(remainingSeconds)} {againText}</p>
                        </div>
                    )}

                    <div className="mt-6 flex flex-col gap-2.5">
                        {secondary && (
                            <button type="button" onClick={secondary.onClick} className={cn(pillOutline, 'w-full')}>
                                {secondary.icon}{secondary.label}
                            </button>
                        )}
                        <button type="button" onClick={() => { onClose(); onCloseToMenu?.(); }} className={cn(pillDark, 'w-full')}>
                            {closeLabel}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
