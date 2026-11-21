import { toast } from 'sonner';
import { SortableList, SortableRow } from '@/components/dnd/SortableList';
import { SortModeBanner } from '@/components/dnd/SortMode';
import { regionService } from '@/features/regions/api/regionService';
import { tableService } from '@/features/tables/api/tableService';
import type { Region } from '@/features/regions/types';
import type { Table } from '@/features/tables/types';
import { getApiErrorMessage } from '@/lib/apiError';
import { cn } from '@/lib/utils';

interface Props {
    regions: Region[];
    tables: Table[];
    onRegionsChange: (next: Region[]) => void;
    onTablesChange: (next: Table[]) => void;
}

/** Tabloyu bölge sırasına göre yeniden dizer (sunucunun döndüğü sırayla aynı: bölge → masa). */
function sortByRegions(tables: Table[], regions: Region[]): Table[] {
    const rank = new Map(regions.map((r, i) => [r.id, i]));
    return [...tables].sort((a, b) => (rank.get(a.regionId) ?? 0) - (rank.get(b.regionId) ?? 0));
}

/** Bir bölgenin masalarını verilen sıraya dizer; diğer bölgelerin masaları yerinde kalır. */
function applyRegionOrder(all: Table[], regionId: string, ordered: Table[]): Table[] {
    let i = 0;
    return all.map(t => (t.regionId === regionId ? ordered[i++] ?? t : t));
}

const STATUS_DOT: Record<number, string> = {
    1: 'bg-rb-green',
    2: 'bg-rb-orange',
    3: 'bg-rb-amber',
    4: 'bg-muted-foreground',
};

// Masalar · Sıralama modu: bölgeleri ve her bölgenin masalarını sürükleyerek dizer. Bırakınca hemen kaydedilir;
// garson, kasa ve yönetici masa ekranları ile rezervasyon sayfası bu sırayı kullanır.
export default function TableOrderPanel({ regions, tables, onRegionsChange, onTablesChange }: Props) {
    const reorderRegions = async (next: Region[]) => {
        const previousRegions = regions;
        const previousTables = tables;
        onRegionsChange(next);
        onTablesChange(sortByRegions(tables, next));
        try {
            await regionService.reorderRegions(next.map(r => r.id));
            toast.success('Bölge sırası kaydedildi.');
        } catch (err) {
            onRegionsChange(previousRegions);
            onTablesChange(previousTables);
            toast.error(getApiErrorMessage(err, 'Bölge sırası kaydedilemedi.'));
        }
    };

    const reorderTables = async (regionId: string, next: Table[]) => {
        const previous = tables;
        onTablesChange(applyRegionOrder(tables, regionId, next));
        try {
            await tableService.reorderTables(regionId, next.map(t => t.id));
            toast.success('Masa sırası kaydedildi.');
        } catch (err) {
            onTablesChange(previous);
            toast.error(getApiErrorMessage(err, 'Masa sırası kaydedilemedi.'));
        }
    };

    return (
        <div className="space-y-6">
            <SortModeBanner>
                Bölgeleri ve masaları tutup sürükleyin (telefonda basılı tutun). Bırakınca sıra kaydedilir. Masalar kendi
                bölgeleri içinde sıralanır; başka bölgeye almak için masayı düzenleyin. Bitince "Bitti"ye basın.
            </SortModeBanner>

            {regions.length > 1 && (
                <section className="space-y-2" aria-labelledby="order-regions-title">
                    <h2 id="order-regions-title" className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">
                        Bölgeler
                    </h2>
                    <SortableList
                        items={regions}
                        getName={r => r.name}
                        onReorder={next => void reorderRegions(next)}
                        className="flex max-w-xl flex-col gap-2"
                        renderItem={(region, state) => (
                            <SortableRow state={state} label={`${region.name} bölgesini taşı`}>
                                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">{region.name}</span>
                                <span className="shrink-0 text-xs text-muted-foreground">
                                    {tables.filter(t => t.regionId === region.id).length} masa
                                </span>
                            </SortableRow>
                        )}
                    />
                </section>
            )}

            {regions.map(region => {
                const regionTables = tables.filter(t => t.regionId === region.id);
                if (regionTables.length === 0) return null;
                return (
                    <section key={region.id} className="space-y-2" aria-label={`${region.name} masaları`}>
                        <h2 className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">
                            {region.name} · masalar ({regionTables.length})
                        </h2>
                        <SortableList
                            items={regionTables}
                            layout="grid"
                            getName={t => t.name}
                            onReorder={next => void reorderTables(region.id, next)}
                            className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,9rem),1fr))] gap-2"
                            renderItem={(table, state) => (
                                <div
                                    ref={state.handle.setNodeRef}
                                    {...state.handle.attributes}
                                    {...state.handle.listeners}
                                    aria-label={`${table.name} masasını taşı`}
                                    className={cn(
                                        'flex min-h-16 cursor-grab touch-manipulation items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 select-none active:cursor-grabbing',
                                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                                        state.isDragging && 'border-rb-accent shadow-[0_10px_30px_rgba(0,0,0,0.18)] ring-2 ring-rb-accent/30',
                                    )}
                                >
                                    <span className={cn('size-2 shrink-0 rounded-full', STATUS_DOT[table.status] ?? STATUS_DOT[1])} aria-hidden="true" />
                                    <span className="truncate font-serif text-base font-bold text-foreground">{table.name}</span>
                                </div>
                            )}
                        />
                    </section>
                );
            })}
        </div>
    );
}
