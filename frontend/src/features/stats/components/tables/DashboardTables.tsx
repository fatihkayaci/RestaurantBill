import { Link } from 'react-router-dom';
import type { DashboardStats } from '../../types';
import { CARD_META } from '../../dashboardCards';
import { useLiveTables } from './useLiveTables';
import { SummaryBar } from './DashboardTablesShared';
import DashboardTableGrid from './DashboardTableGrid';

// Deneme sırasında seçilen tasarım burada saklanıyordu; tek tasarım kaldı, eski anahtar bir kez temizlenir.
try { localStorage.removeItem('rb:dashboard-tables-variant'); } catch { /* gizli pencere / kapalı depolama */ }

// "Masa durumu" kartı. Eski "Şu an" ve "Geciken siparişler" kartlarının bilgisi burada: özet şeridi + masalar.
export default function DashboardTables({ stats, onRefresh }: { stats: DashboardStats; onRefresh: () => void }) {
    const { regions, summary, now } = useLiveTables(stats, onRefresh);

    return (
        <section className="flex flex-col gap-3.5 rounded-2xl border border-border bg-card p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <h2 className="text-xs font-bold uppercase tracking-[0.08em] text-rb-text-sub">{CARD_META.tables.title}</h2>
                    <span className="text-xs font-semibold text-rb-green">● Canlı</span>
                </div>
                <Link to="/admin/tables" className="text-[13px] font-semibold text-rb-amber hover:underline">Masalara git</Link>
            </div>

            <SummaryBar summary={summary} stats={stats} now={now} />

            {regions.length === 0 ? (
                <p className="py-6 text-center text-sm text-rb-text-sub">
                    Henüz masa yok. <Link to="/admin/tables" className="ml-1 font-semibold text-rb-amber hover:underline">Masa ekle</Link>
                </p>
            ) : (
                <DashboardTableGrid regions={regions} now={now} />
            )}
        </section>
    );
}
