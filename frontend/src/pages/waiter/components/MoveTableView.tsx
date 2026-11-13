import { useState } from 'react';
import { ArrowRight, ArrowRightLeft, ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';
import { orderService } from '@/features/orders/api/orderService';
import type { Order } from '@/features/orders/types';
import type { Table } from '@/features/tables/types';
import { getApiErrorMessage } from '@/lib/apiError';
import { formatPrice } from '@/lib/format';
import { cn } from '@/lib/utils';

type Mode = 'move' | 'merge' | 'swap';
const MODE_VALUE: Record<Mode, 1 | 2 | 3> = { move: 1, merge: 2, swap: 3 };
const MODE_LABEL: Record<Mode, string> = { move: 'Taşı', merge: 'Birleştir', swap: 'Yer değiştir' };

interface Props {
    table: Table;
    order: Order;
    /** Garsonun görebildiği masalar (bölgesine göre süzülmüş). */
    tables: Table[];
    onBack: () => void;
    onDone: () => void;
}

// Telefon · Masa taşı: Taşı (boş masaya) / Birleştir (dolu masanın hesabına ekle) / Yer değiştir (iki dolu masa).
export default function MoveTableView({ table, order, tables, onBack, onDone }: Props) {
    const [mode, setMode] = useState<Mode>('move');
    const [targetId, setTargetId] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const itemCount = order.orderItems.reduce((sum, i) => sum + i.quantity, 0);
    const eligible = (t: Table) => t.id !== table.id && (mode === 'move' ? t.status === 1 : t.status === 2);
    const target = tables.find(t => t.id === targetId && eligible(t)) ?? null;

    const regions: { id: string; name: string; tables: Table[] }[] = [];
    for (const t of tables) {
        let region = regions.find(r => r.id === t.regionId);
        if (!region) { region = { id: t.regionId, name: t.regionName, tables: [] }; regions.push(region); }
        region.tables.push(t);
    }

    const hint = mode === 'move'
        ? `Sipariş boş masaya geçer, ${table.name} boşalır. Yeşil çerçeveli masalar uygun.`
        : mode === 'merge'
            ? `${table.name} masasının ürünleri seçilen dolu masanın hesabına eklenir, ${table.name} boşalır.`
            : 'İki dolu masanın siparişleri yer değiştirir.';

    const confirm = async () => {
        if (!target || submitting) return;
        setSubmitting(true);
        try {
            await orderService.transferOrder(table.id, target.id, MODE_VALUE[mode]);
            toast.success(`${MODE_LABEL[mode]}: ${table.name} → ${target.name}`);
            onDone();
        } catch (err) {
            toast.error(getApiErrorMessage(err, 'Masa işlemi tamamlanamadı.'));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="flex h-full min-h-0 flex-col bg-[#F5F0E8] dark:bg-background">
            <header className="flex shrink-0 flex-col gap-3 px-4 pt-3 pb-2">
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={onBack}
                        aria-label={`Vazgeç, ${table.name} masasına dön`}
                        className="-ml-2 flex size-12 items-center justify-center rounded-full text-foreground hover:bg-muted"
                    >
                        <ChevronLeft className="size-6" aria-hidden="true" />
                    </button>
                    <div className="flex min-w-0 flex-col">
                        <span className="truncate text-[13px] font-medium text-rb-text-sub">{table.name} · {itemCount} ürün · ₺{formatPrice(order.totalPrice)}</span>
                        <h2 className="font-serif text-[28px] font-bold leading-none text-foreground">Masayı taşı</h2>
                    </div>
                </div>
                <div role="tablist" aria-label="İşlem" className="grid grid-cols-3 gap-1 rounded-2xl bg-[#EBE3D5] p-1 dark:bg-muted">
                    {(['move', 'merge', 'swap'] as Mode[]).map(key => (
                        <button
                            key={key}
                            type="button"
                            role="tab"
                            aria-selected={mode === key}
                            onClick={() => { setMode(key); setTargetId(null); }}
                            className={cn(
                                'min-h-11 rounded-xl text-sm font-semibold',
                                mode === key ? 'bg-card text-foreground shadow-[0_1px_3px_rgba(42,31,20,0.15)]' : 'text-rb-text-sub',
                            )}
                        >
                            {MODE_LABEL[key]}
                        </button>
                    ))}
                </div>
                <p className="text-sm text-rb-text-sub">{hint}</p>
            </header>

            <main className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
                {regions.map(region => (
                    <section key={region.id} className="mt-2">
                        <h3 className="mb-2 text-xs font-bold tracking-widest text-rb-text-sub uppercase">{region.name}</h3>
                        <div className="grid grid-cols-3 gap-2">
                            {region.tables.map(t => {
                                const self = t.id === table.id;
                                const can = eligible(t);
                                const selected = target?.id === t.id;
                                const sub = self ? 'Bu masa' : t.status === 1 ? 'Boş' : t.status === 2 ? `₺${formatPrice(t.activeOrderTotal)}` : t.status === 3 ? 'Rezerve' : 'Kapalı';
                                return (
                                    <button
                                        key={t.id}
                                        type="button"
                                        aria-pressed={selected}
                                        disabled={!can}
                                        aria-label={`${t.name}, ${sub}${can ? '' : ', seçilemez'}`}
                                        onClick={() => setTargetId(t.id)}
                                        className={cn(
                                            'flex min-h-19 flex-col items-center justify-center gap-1 rounded-2xl px-1 text-center',
                                            self ? 'border-[1.5px] border-dashed border-rb-orange bg-rb-orange-bg text-rb-orange'
                                                : selected ? 'border-2 border-foreground bg-foreground text-background'
                                                    : can ? (mode === 'move' ? 'border-[1.5px] border-rb-green bg-card text-rb-green' : 'border-[1.5px] border-rb-orange bg-card text-rb-orange')
                                                        : 'cursor-not-allowed border border-border bg-transparent text-rb-text-muted',
                                        )}
                                    >
                                        <span className="max-w-full truncate text-[15px] font-bold">{t.name}</span>
                                        <span className="text-xs font-medium opacity-85">{sub}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </section>
                ))}
            </main>

            <div className="shrink-0 border-t border-border bg-card px-4 pt-3 pb-[max(14px,env(safe-area-inset-bottom))]">
                {target ? (
                    <div className="flex flex-col gap-2.5">
                        <div className="flex items-center justify-center gap-2.5 text-[15px] font-bold">
                            <span className="rounded-lg bg-rb-orange-bg px-3 py-1.5 text-rb-orange">{table.name}</span>
                            {mode === 'swap' ? <ArrowRightLeft className="size-5 text-rb-text-sub" aria-hidden="true" /> : <ArrowRight className="size-5 text-rb-text-sub" aria-hidden="true" />}
                            <span className={cn('rounded-lg px-3 py-1.5', target.status === 1 ? 'bg-rb-green-bg text-rb-green' : 'bg-rb-orange-bg text-rb-orange')}>{target.name}</span>
                        </div>
                        <button
                            type="button"
                            onClick={confirm}
                            disabled={submitting}
                            className="h-15 rounded-2xl bg-foreground text-[17px] font-bold text-background disabled:opacity-60"
                        >
                            {submitting ? 'İşleniyor…' : `${MODE_LABEL[mode]} · ${table.name} → ${target.name}`}
                        </button>
                    </div>
                ) : (
                    <div className="flex h-15 items-center justify-center rounded-2xl bg-muted text-base font-semibold text-rb-text-sub">Hedef masa seçin</div>
                )}
            </div>
        </div>
    );
}
