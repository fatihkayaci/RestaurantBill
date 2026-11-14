import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/format';
import type { LiveRegion } from './liveTables';
import { ItemProgress, OverdueStrip, StatusLabel, TableFlags } from './DashboardTablesShared';
import { tableHref, tableLine, tableTone } from './tableUi';

// "Zengin kartlar": bölge bölge, her masa kendi kartında her şeyi söyler:
// durum + süre + tutar, kırmızı gecikme şeridi, "x/y servis edildi" ilerlemesi, hazır / hesap / QR etiketleri.
// Telefonda tek sütun, 420 px'ten sonra iki, geniş ekranda altıya kadar.
export default function DashboardTableGrid({ regions, now }: { regions: LiveRegion[]; now: number }) {
    return (
        <div className="flex flex-col gap-5">
            {regions.map(region => (
                <section key={region.id} aria-label={region.name} className="flex flex-col gap-2">
                    <h3 className="text-[13px] font-semibold text-foreground">
                        {region.name}
                        <span className="ml-2 font-normal tabular-nums text-rb-text-sub">
                            {region.tables.filter(t => t.kind === 'busy').length}/{region.tables.length} dolu
                        </span>
                    </h3>
                    <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
                        {region.tables.map(t => (
                            <Link
                                key={t.id}
                                to={tableHref(t.id)}
                                className={cn('flex min-h-24 min-w-0 flex-col gap-1.5 rounded-xl border p-2.5 transition-colors hover:border-rb-gold', tableTone(t))}
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <span className="min-w-0 truncate text-base font-bold text-foreground">{t.name}</span>
                                    <StatusLabel table={t} className="shrink-0 pt-0.5" />
                                </div>
                                <p className={cn('truncate text-sm tabular-nums', t.kind === 'busy' ? 'font-semibold text-foreground' : 'text-rb-text-sub')}>
                                    {tableLine(t, now)}
                                </p>
                                {t.kind === 'busy' && t.paid > 0 && (
                                    <p className="-mt-1 truncate text-xs tabular-nums text-rb-text-sub">
                                        Ödenen {formatCurrency(t.paid)} · kalan {formatCurrency(t.remaining)}
                                    </p>
                                )}
                                <OverdueStrip table={t} />
                                {t.kind === 'busy' && <ItemProgress counts={t.counts} />}
                                <TableFlags table={t} now={now} />
                                {t.kind === 'busy' && t.nextReservationTime && (
                                    <p className="truncate text-xs text-rb-accent">Sonraki rezervasyon {t.nextReservationTime}</p>
                                )}
                            </Link>
                        ))}
                    </div>
                </section>
            ))}
        </div>
    );
}
