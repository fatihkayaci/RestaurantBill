import { useCallback, useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { authService } from '@/features/auth/api/authService';
import { dataManagementService } from '@/features/dataManagement/api/dataManagementService';
import { formatDay } from '@/features/dataManagement/formatDay';
import type { ClosureStatus } from '@/features/dataManagement/types';
import { getApiErrorMessage } from '@/lib/apiError';
import { getHomePathFromToken, getSession } from '@/lib/auth';
import { PageError, PageLoading } from '@/components/ui/page-state';
import sophramLogo from '@/assets/sophram-logo-yazisiz.svg';

// Sahip hesabı kapattıktan sonra, silinene kadar gördüğü tek ekran: silinme tarihi ve "Vazgeç".
export default function AccountClosingPage() {
    const navigate = useNavigate();
    const session = getSession();
    const [status, setStatus] = useState<ClosureStatus | null>(null);
    const [failed, setFailed] = useState(false);
    const [busy, setBusy] = useState(false);

    const fetchStatus = useCallback(
        () => dataManagementService.closureStatus().then(setStatus).catch(() => setFailed(true)),
        [],
    );
    const load = () => { setFailed(false); void fetchStatus(); };

    useEffect(() => { if (session?.role === 'Owner') void fetchStatus(); }, [fetchStatus, session?.role]);

    if (!session) return <Navigate to="/login" replace />;
    if (session.role !== 'Owner') return <Navigate to={getHomePathFromToken()} replace />;
    if (status && !status.isClosed) return <Navigate to={getHomePathFromToken()} replace />;

    const cancel = async () => {
        setBusy(true);
        try {
            await dataManagementService.cancelClosure();
            toast.success('Hesabınız yeniden açıldı.');
            window.location.assign(getHomePathFromToken());
        } catch (err) {
            toast.error(getApiErrorMessage(err, 'Vazgeçilemedi. Tekrar deneyin.'));
            setBusy(false);
        }
    };

    const logout = async () => {
        await authService.logout();
        navigate('/login', { replace: true });
    };

    return (
        <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
            <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
                <img src={sophramLogo} alt="" className="mx-auto mb-5 h-10 w-10" />
                {failed ? (
                    <PageError onRetry={load} className="border-0 bg-transparent px-0 py-0" />
                ) : !status ? (
                    <PageLoading className="h-24" />
                ) : (
                    <>
                        <h1 className="font-serif text-xl font-bold text-foreground">
                            Hesabınız {formatDay(status.deletionScheduledAt)} tarihinde silinecek
                        </h1>
                        <p className="mt-2 text-sm text-muted-foreground">
                            {status.companyName} şu an kapalı. Vazgeçerseniz her şey olduğu gibi geri gelir.
                        </p>
                        <button
                            type="button"
                            onClick={cancel}
                            disabled={busy}
                            className="mt-6 h-11 w-full rounded-xl bg-rb-gold text-sm font-semibold text-rb-gold-foreground hover:opacity-90 disabled:opacity-60"
                        >
                            {busy ? 'Açılıyor...' : 'Vazgeç'}
                        </button>
                        <button type="button" onClick={logout} className="mt-3 text-sm text-muted-foreground hover:text-foreground">
                            Çıkış yap
                        </button>
                    </>
                )}
            </div>
        </main>
    );
}
