import type { TableActionState } from '../useTableAction';

/** "Garson çağır" / "Hesap iste" düğmesinin durumu (useTableAction). */
export interface TableAction {
    state: TableActionState;
    remainingSeconds: number;
    /** true: sunucu yanıt verdi (gönderildi ya da az önce yapılmış). */
    trigger: () => Promise<boolean>;
}

/** Bekleme süresinde mi (gönderildi, tekrar için süre dolmadı). */
export const isWaiting = (action: TableAction) => action.state.status === 'done' && action.remainingSeconds > 0;
