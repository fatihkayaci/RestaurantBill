import { useId, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { BellRing, CalendarDays, ChevronRight, ClipboardList, Receipt, ShoppingBag, UtensilsCrossed } from 'lucide-react';
import { RESERVATION_LOOKUP_PATH } from '@/features/customerSite/reservationCode';
import { cn } from '@/lib/utils';
import { SiteLogo } from '../site/SiteChrome';
import { headingFont } from '../site/siteTheme';
import { formatWait, type TableActionState } from '../useTableAction';

interface TableAction {
    state: TableActionState;
    remainingSeconds: number;
    trigger: () => void;
}

interface Props {
    restaurantName: string;
    tableName: string;
    regionName: string;
    /** Sipariş açıksa "Menüyü gör / Sipariş ver", değilse "Menüyü gör". */
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
}

const bigButton = 'flex min-h-[72px] w-full items-center gap-4 rounded-2xl px-5 py-4 text-left transition-opacity hover:opacity-90 disabled:opacity-60';
const secondary = 'border border-[var(--site-border-strong)] bg-[var(--site-card)] text-[var(--site-text)]';

function ButtonBody({ icon, title, hint }: { icon: ReactNode; title: string; hint?: string }) {
    return (
        <>
            <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-black/10">{icon}</span>
            <span className="min-w-0 flex-1">
                <span className="block text-lg font-semibold leading-tight">{title}</span>
                {hint && <span className="mt-0.5 block text-sm opacity-80">{hint}</span>}
            </span>
            <ChevronRight className="h-5 w-5 shrink-0 opacity-60" aria-hidden="true" />
        </>
    );
}

// Garson çağır / Hesap iste: gönderilince kalan süre boyunca düğme kapanır, altında durum satırı görünür.
function ActionButton({ action, icon, title, hint, doneText, againText, repeatText }: {
    action: TableAction;
    icon: ReactNode;
    title: string;
    hint: string;
    /** Sunucu bildirdi: "Garson çağrıldı". */
    doneText: string;
    /** "tekrar çağırabilirsiniz" */
    againText: string;
    /** Sunucu bildirmedi, az önce yapılmış: "Garson az önce çağrıldı". */
    repeatText: string;
}) {
    const { state, remainingSeconds, trigger } = action;
    const waiting = state.status === 'done' && remainingSeconds > 0;
    const statusId = useId();

    return (
        <div>
            <button
                type="button"
                onClick={trigger}
                disabled={state.status === 'sending' || waiting}
                aria-describedby={statusId}
                className={cn(bigButton, secondary)}
            >
                <ButtonBody icon={icon} title={state.status === 'sending' ? 'Gönderiliyor…' : title} hint={hint} />
            </button>
            <p id={statusId} role="status" aria-live="polite" className="min-h-0 px-2 text-sm">
                {waiting && (
                    <span className="mt-2 block font-medium text-[var(--site-text)]">
                        {state.sent ? doneText : repeatText} · {formatWait(remainingSeconds)} sonra {againText}
                    </span>
                )}
                {state.status === 'error' && (
                    <span className="mt-2 block font-medium text-[var(--site-error)]">{state.message}</span>
                )}
            </p>
        </div>
    );
}

// Masadaki QR'ın açtığı ilk ekran: masa adı ve büyük düğmeler. Admin'in kapattığı özellikler hiç gösterilmez.
export default function TableLanding({
    restaurantName, tableName, regionName, orderingEnabled, onOpenMenu, callWaiter, billRequest, showDelivery, deliveryHref = '/siparis', showReservation, myOrders,
}: Props) {
    return (
        <main className="mx-auto flex min-h-screen w-full max-w-md flex-col px-4 pb-10 pt-8">
            <header className="text-center">
                <SiteLogo name={restaurantName} className={cn(headingFont, 'text-2xl text-[var(--site-text)]')} />
                <h1 className={cn(headingFont, 'mt-6 text-4xl font-bold leading-tight')}>
                    {tableName}
                    <span className="block text-xl font-semibold text-[var(--site-sub)]">Hoş geldiniz</span>
                </h1>
                {regionName && <p className="mt-1 text-sm text-[var(--site-muted)]">{regionName}</p>}
            </header>

            <nav aria-label="Masa işlemleri" className="mt-8 flex flex-col gap-3">
                <button
                    type="button"
                    onClick={onOpenMenu}
                    className={cn(bigButton, 'bg-[var(--site-accent)] text-[var(--site-on-accent)]')}
                >
                    <ButtonBody
                        icon={<UtensilsCrossed className="h-5 w-5" />}
                        title={orderingEnabled ? 'Menüyü gör / Sipariş ver' : 'Menüyü gör'}
                        hint={orderingEnabled ? 'Siparişiniz garson onaylayınca mutfağa gider.' : undefined}
                    />
                </button>

                {myOrders && (
                    <button type="button" onClick={myOrders.open} className={cn(bigButton, secondary)}>
                        <ButtonBody
                            icon={<ClipboardList className="h-5 w-5" />}
                            title="Siparişlerim"
                            hint={myOrders.pendingCount > 0
                                ? `${myOrders.pendingCount} sipariş garson onayı bekliyor`
                                : `${myOrders.count} sipariş gönderildi`}
                        />
                    </button>
                )}

                {callWaiter && (
                    <ActionButton
                        action={callWaiter}
                        icon={<BellRing className="h-5 w-5" />}
                        title="Garson çağır"
                        hint="Masanıza bakan garsona haber verilir."
                        doneText="Garson çağrıldı"
                        repeatText="Garson az önce çağrıldı"
                        againText="tekrar çağırabilirsiniz"
                    />
                )}

                {billRequest && (
                    <ActionButton
                        action={billRequest}
                        icon={<Receipt className="h-5 w-5" />}
                        title="Hesap iste"
                        hint="Hesabınız kasaya ve garsona bildirilir."
                        doneText="Hesap istendi"
                        repeatText="Hesap az önce istendi"
                        againText="tekrar isteyebilirsiniz"
                    />
                )}

                {showDelivery && (
                    <Link to={deliveryHref} className={cn(bigButton, secondary, 'no-underline')}>
                        <ButtonBody icon={<ShoppingBag className="h-5 w-5" />} title="Paket servis" hint="Evinize ya da işinize sipariş verin." />
                    </Link>
                )}

                {showReservation && (
                    <>
                        <Link to="/rezervasyon" className={cn(bigButton, secondary, 'no-underline')}>
                            <ButtonBody icon={<CalendarDays className="h-5 w-5" />} title="Rezervasyon" hint="Bir sonraki ziyaretiniz için masa ayırtın." />
                        </Link>
                        <Link to={RESERVATION_LOOKUP_PATH} className="flex min-h-11 items-center justify-center text-sm font-semibold text-[var(--site-sub)] underline underline-offset-4">
                            Rezervasyonunuz var mı? Kodla sorgulayın
                        </Link>
                    </>
                )}
            </nav>
        </main>
    );
}
