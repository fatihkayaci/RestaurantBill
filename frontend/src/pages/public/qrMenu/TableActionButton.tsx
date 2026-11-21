import { BellRing, Check, ReceiptText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatClock } from '../useTableAction';
import { isWaiting, type TableAction } from './tableAction';
import { outlineButton, primaryButton } from './qrUi';

// "Garson çağır" / "Hesap iste": onay penceresi yok. Sonuç düğmenin kendisinde görünür ("Garson çağrıldı · 0:45 sonra
// tekrar"); bekleme süresince düğme kapalıdır, süre bitince eski hâline döner. Ekran okuyucuya role="status" ile okunur.

/** Sipariş reddi, boş menü ve sepetteki "Garson çağır": sonuç düğmede yazar. */
export function WaiterCallButton({ action, variant = 'primary', className }: {
    action: TableAction; variant?: 'primary' | 'outline'; className?: string;
}) {
    const { state, remainingSeconds } = action;
    const waiting = isWaiting(action);
    const repeat = state.status === 'done' && !state.sent;
    const countdown = action.countdown ?? null;
    return (
        <div className={cn('flex flex-col', className)}>
            {/* Geri sayımda (useDelayedAction) yalnız yanındaki "İptal" iptal eder; duyuru alt çubuktaki Garson Çağır'da. */}
            <button type="button" onClick={() => void action.trigger()} disabled={state.status === 'sending' || waiting}
                aria-label={countdown != null ? `Garson ${countdown} saniye içinde çağrılacak` : undefined}
                className={cn(variant === 'primary' ? primaryButton : outlineButton, 'w-full',
                    waiting && 'border-[var(--site-ok-line)] bg-[var(--site-ok-bg)] text-[var(--site-ok)] shadow-none disabled:opacity-100')}>
                {waiting ? <Check className="h-5 w-5" strokeWidth={2.75} aria-hidden="true" />
                    : <BellRing className={cn('h-5 w-5', countdown != null && 'motion-safe:animate-pulse')} aria-hidden="true" />}
                <span role="status" aria-hidden={countdown != null || undefined}>
                    {countdown != null ? <>Çağrılıyor… <span className="tabular-nums">{countdown}</span></>
                        : state.status === 'sending' ? 'Çağrılıyor…'
                        : waiting ? <>{repeat ? 'Garson az önce çağrıldı' : 'Garson çağrıldı'}<span className="font-bold tabular-nums"> · {formatClock(remainingSeconds)} sonra tekrar</span></>
                            : 'Garson çağır'}
                </span>
            </button>
            {countdown != null && action.cancel && (
                <button type="button" onClick={action.cancel}
                    className={cn(outlineButton, 'mt-2 w-full')}>
                    İptal
                </button>
            )}
            {state.status === 'error' && <ActionError message={state.message} />}
        </div>
    );
}

/**
 * Hesabım'daki "Hesap iste": sonuç düğmede yazar ("Hesap istendi · 0:45 sonra tekrar"). compact: "Öde" ile yan yana
 * yarım genişlikte; süre ikinci satırda küçük yazar.
 */
export function BillRequestButton({ action, variant = 'primary', compact = false, className }: {
    action: TableAction; variant?: 'primary' | 'outline'; compact?: boolean; className?: string;
}) {
    const { state, remainingSeconds } = action;
    const waiting = isWaiting(action);
    const repeat = state.status === 'done' && !state.sent;
    return (
        <div className={cn('flex flex-col', className)}>
            <button type="button" onClick={() => void action.trigger()} disabled={state.status === 'sending' || waiting}
                className={cn(variant === 'primary' ? primaryButton : outlineButton, 'w-full', compact && 'min-h-14 gap-1.5 px-2.5',
                    waiting && 'border-[var(--site-ok-line)] bg-[var(--site-ok-bg)] text-[var(--site-ok)] shadow-none disabled:opacity-100')}>
                {waiting ? <Check className={compact ? 'h-4 w-4 shrink-0' : 'h-5 w-5'} strokeWidth={2.75} aria-hidden="true" /> : <ReceiptText className="h-5 w-5 shrink-0" aria-hidden="true" />}
                <span role="status" className={cn(compact && waiting && 'flex flex-col items-start text-left leading-tight')}>
                    {state.status === 'sending' ? 'İsteniyor…'
                        : waiting && compact ? <>{repeat ? 'Az önce istendi' : 'Hesap istendi'}<span className="text-[12px] font-semibold tabular-nums">{formatClock(remainingSeconds)} sonra tekrar</span></>
                            : waiting ? <>{repeat ? 'Hesap az önce istendi' : 'Hesap istendi'}<span className="font-bold tabular-nums"> · {formatClock(remainingSeconds)} sonra tekrar</span></>
                                : 'Hesap iste'}
                </span>
            </button>
            {state.status === 'error' && <ActionError message={state.message} />}
        </div>
    );
}

export function ActionError({ message }: { message: string }) {
    return <p role="alert" className="m-0 mt-1.5 rounded-xl bg-[var(--site-error-bg)] px-3 py-2 text-sm font-semibold text-[var(--site-error)]">{message}</p>;
}
