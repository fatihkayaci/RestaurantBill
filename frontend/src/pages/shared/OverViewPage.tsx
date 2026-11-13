import { useCallback, useEffect, useState } from 'react';
import { Plus, SlidersHorizontal } from 'lucide-react';
import { statsService } from '@/features/stats/api/statsService';
import type { DashboardCardId, DashboardStats } from '@/features/stats/types';
import { DashboardCard } from '@/features/stats/components/DashboardCards';
import { ALL_CARDS, CARD_META } from '@/features/stats/dashboardCards';
import DashboardCustomizeDrawer from '@/features/stats/components/DashboardCustomizeDrawer';
import { PageError, PageLoading } from '@/components/ui/page-state';
import { DATA_CHANGED_EVENT } from '@/lib/axiosInstance';
import { OVERDUE_EVENT } from '@/components/layout/OverdueAlerts';
import { cn } from '@/lib/utils';

/** Canlı kartlar (masa, mutfak, bekleyenler) bu aralıkla yenilenir. */
const REFRESH_MS = 30_000;

// Şube Genel Bakış'ı: kullanıcının seçtiği kartlar, seçtiği sırayla. Tasarım: canvas "Genel Bakış Dashboard".
export default function OverViewPage() {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [cards, setCards] = useState<DashboardCardId[] | null>(null);
    const [failed, setFailed] = useState(false);
    const [now, setNow] = useState(() => Date.now());
    const [customizeOpen, setCustomizeOpen] = useState(false);

    const load = useCallback(() => {
        statsService.getDashboard()
            .then(data => { setStats(data); setFailed(false); setNow(Date.now()); })
            .catch(() => setFailed(true));
    }, []);

    useEffect(() => {
        load();
        statsService.getDashboardLayout()
            .then(setCards)
            .catch(() => setCards([...ALL_CARDS]));

        const timer = window.setInterval(load, REFRESH_MS);
        // Sekmeye dönünce ya da bu sayfadan bir kayıt değişince beklemeden yenile.
        const onVisible = () => { if (document.visibilityState === 'visible') load(); };
        document.addEventListener('visibilitychange', onVisible);
        window.addEventListener(DATA_CHANGED_EVENT, load);
        window.addEventListener(OVERDUE_EVENT, load);
        return () => {
            window.removeEventListener(OVERDUE_EVENT, load);
            window.clearInterval(timer);
            document.removeEventListener('visibilitychange', onVisible);
            window.removeEventListener(DATA_CHANGED_EVENT, load);
        };
    }, [load]);

    const updatedAt = stats ? new Date(stats.generatedAt) : null;
    const hiddenCount = cards ? ALL_CARDS.filter(id => !cards.includes(id)).length : 0;

    return (
        <div className="space-y-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h1 className="font-serif text-[32px] font-bold leading-tight text-foreground">Genel Bakış</h1>
                    <p className="mt-0.5 text-sm text-rb-text-sub">
                        Bugün · {new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' })}
                        {updatedAt && ` · Son güncelleme ${updatedAt.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => setCustomizeOpen(true)}
                    disabled={!cards}
                    className="inline-flex h-11 items-center gap-2 rounded-[10px] border border-border bg-card px-4 text-sm font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-50"
                >
                    <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
                    Paneli düzenle
                </button>
            </div>

            {failed && !stats ? (
                <PageError onRetry={load} />
            ) : !stats || !cards ? (
                <PageLoading />
            ) : (
                <>
                    {failed && (
                        <p role="status" className="rounded-xl border border-rb-red/30 bg-rb-red-bg px-4 py-2 text-sm text-rb-red">
                            Son yenileme başarısız oldu; gördüğünüz veriler {updatedAt?.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })} itibarıyla.
                        </p>
                    )}
                    <div className="grid grid-flow-row-dense grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-6">
                        {cards.map(id => (
                            <div key={id} className={cn('min-w-0 [&>section]:h-full', CARD_META[id].span)}>
                                <DashboardCard id={id} stats={stats} now={now} />
                            </div>
                        ))}
                        <button
                            type="button"
                            onClick={() => setCustomizeOpen(true)}
                            className="flex min-h-40 flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-border text-rb-text-sub transition-colors hover:border-rb-gold/60 hover:text-foreground md:col-span-2 lg:col-span-3"
                        >
                            <Plus className="h-6 w-6" aria-hidden="true" />
                            <span className="text-sm font-semibold text-foreground">{hiddenCount > 0 ? 'Kart ekle' : 'Paneli düzenle'}</span>
                            <span className="text-xs">
                                {hiddenCount > 0 ? `${hiddenCount} kart eklenebilir` : 'Kartların sırasını değiştirin ya da gizleyin'}
                            </span>
                        </button>
                    </div>
                </>
            )}

            {customizeOpen && cards && (
                <DashboardCustomizeDrawer cards={cards} onSaved={setCards} onClose={() => setCustomizeOpen(false)} />
            )}
        </div>
    );
}
