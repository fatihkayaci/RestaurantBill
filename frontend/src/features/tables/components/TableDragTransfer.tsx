import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import {
    DndContext,
    DragOverlay,
    MouseSensor,
    TouchSensor,
    pointerWithin,
    useDraggable,
    useDroppable,
    useSensor,
    useSensors,
    type DragEndEvent,
    type DragStartEvent,
} from '@dnd-kit/core';
import { ArrowRight, ArrowRightLeft, Combine, X } from 'lucide-react';
import { toast } from 'sonner';
import { orderService } from '@/features/orders/api/orderService';
import type { Table } from '@/features/tables/types';
import { Modal, ModalTitle } from '@/components/ui/modal';
import { getApiErrorMessage } from '@/lib/apiError';
import { cn } from '@/lib/utils';

// Masa durumları: 1 boş, 2 dolu, 3 rezerve, 4 hizmet dışı.
const AVAILABLE = 1;
const OCCUPIED = 2;
const TRANSFER = { move: 1, merge: 2, swap: 3 } as const;
type TransferKind = keyof typeof TRANSFER;

/** Sürüklenebilir masa: yalnızca açık siparişi olan (dolu) masa taşınır/birleştirilir/yer değiştirir. */
const canDragTable = (table: Table) => table.status === OCCUPIED;
/** Bırakılabilir hedef: boş masaya taşınır, dolu masayla birleşir ya da yer değiştirir. */
const canDropOn = (source: Table, target: Table) =>
    source.id !== target.id && (target.status === AVAILABLE || target.status === OCCUPIED);

interface DragState {
    enabled: boolean;
    active: Table | null;
}

const TableDragContext = createContext<DragState>({ enabled: false, active: null });

interface ProviderProps {
    tables: Table[];
    /** Kapalıyken (yetki yok ya da sıralama modu) kartlar sürüklenmez. */
    enabled: boolean;
    /** İşlem başarıyla bitince (masaları yenilemek için). */
    onDone: () => void;
    children: ReactNode;
}

/**
 * Masa ızgarasında sürükle-bırak ile masa işlemleri: dolu bir masayı başka masanın üstüne bırakınca
 * "Masayı buraya taşı" (hedef boşsa) ya da "Masaları birleştir" / "Masaları yer değiştir" (hedef doluysa) sorulur.
 * Fareyle 8 px sürükleyince, dokunmatikte basılı tutunca başlar; dokunup bırakmak masayı açmaya devam eder.
 * İşlem mevcut taşıma ucunu (POST /order/transfer) kullanır; yetki ve kurallar sunucuda denetlenir.
 */
export function TableDragTransferProvider({ tables, enabled, onDone, children }: ProviderProps) {
    const sensors = useSensors(
        useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 450, tolerance: 8 } }),
    );
    const [active, setActive] = useState<Table | null>(null);
    const [pending, setPending] = useState<{ source: Table; target: Table } | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const byId = (id: unknown) => tables.find(t => t.id === String(id)) ?? null;

    const handleDragStart = ({ active: a }: DragStartEvent) => setActive(byId(a.id));

    const handleDragEnd = ({ active: a, over }: DragEndEvent) => {
        setActive(null);
        const source = byId(a.id);
        const target = over ? byId(over.id) : null;
        if (!source || !target || source.id === target.id) return;
        if (!canDropOn(source, target)) {
            toast.error(`${target.name} ${target.status === 3 ? 'rezerve' : 'hizmet dışı'}; bu masaya taşınamaz.`);
            return;
        }
        setPending({ source, target });
    };

    const run = async (kind: TransferKind) => {
        if (!pending || submitting) return;
        setSubmitting(true);
        try {
            await orderService.transferOrder(pending.source.id, pending.target.id, TRANSFER[kind]);
            const verb = kind === 'move' ? 'taşındı' : kind === 'merge' ? 'birleştirildi' : 'yer değiştirdi';
            toast.success(`${pending.source.name} → ${pending.target.name}: masa ${verb}.`);
            setPending(null);
            onDone();
        } catch (err) {
            toast.error(getApiErrorMessage(err, 'Masa işlemi tamamlanamadı.'));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <TableDragContext.Provider value={{ enabled, active }}>
            <DndContext
                sensors={sensors}
                collisionDetection={pointerWithin}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragCancel={() => setActive(null)}
            >
                {children}
                <DragOverlay dropAnimation={null}>
                    {active && (
                        <div className="pointer-events-none inline-flex items-center gap-2 rounded-2xl border border-rb-accent bg-card px-4 py-3 shadow-[0_12px_32px_rgba(0,0,0,0.25)]">
                            <ArrowRightLeft className="size-4 text-rb-accent" aria-hidden="true" />
                            <span className="font-serif text-lg font-bold text-foreground">{active.name}</span>
                        </div>
                    )}
                </DragOverlay>
            </DndContext>

            {pending && (
                <Modal onClose={() => !submitting && setPending(null)} overlayClassName="z-80 bg-black/50 backdrop-blur-[2px] p-4">
                    <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-2xl">
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <ModalTitle className="font-serif text-lg font-bold text-foreground">
                                    {pending.source.name} → {pending.target.name}
                                </ModalTitle>
                                <p className="mt-0.5 text-sm text-muted-foreground">
                                    {pending.target.status === AVAILABLE
                                        ? `${pending.target.name} boş. Sipariş bu masaya geçer, ${pending.source.name} boşalır.`
                                        : `${pending.target.name} dolu. Ne yapılsın?`}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setPending(null)}
                                disabled={submitting}
                                aria-label="Vazgeç"
                                className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                            >
                                <X className="size-4" aria-hidden="true" />
                            </button>
                        </div>
                        <div className="mt-4 flex flex-col gap-2">
                            {pending.target.status === AVAILABLE ? (
                                <ActionButton primary icon={ArrowRight} disabled={submitting} onClick={() => run('move')}
                                    title="Masayı buraya taşı" hint={`${pending.source.name} siparişi ${pending.target.name} masasına geçer`} />
                            ) : (
                                <>
                                    <ActionButton primary icon={Combine} disabled={submitting} onClick={() => run('merge')}
                                        title="Masaları birleştir" hint={`${pending.source.name} ürünleri ${pending.target.name} hesabına eklenir`} />
                                    <ActionButton icon={ArrowRightLeft} disabled={submitting} onClick={() => run('swap')}
                                        title="Masaları yer değiştir" hint="İki masanın siparişleri yer değiştirir" />
                                </>
                            )}
                        </div>
                    </div>
                </Modal>
            )}
        </TableDragContext.Provider>
    );
}

function ActionButton({ icon: Icon, title, hint, primary, disabled, onClick }: {
    icon: typeof ArrowRight;
    title: string;
    hint: string;
    primary?: boolean;
    disabled?: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={cn(
                'flex min-h-14 w-full items-center gap-3 rounded-xl px-4 py-2.5 text-left transition-opacity disabled:opacity-50',
                primary ? 'bg-rb-gold text-rb-gold-foreground hover:opacity-90' : 'border border-border text-foreground hover:bg-muted',
            )}
        >
            <Icon className="size-5 shrink-0" aria-hidden="true" />
            <span className="flex min-w-0 flex-col">
                <span className="text-sm font-semibold">{title}</span>
                <span className={cn('text-xs', primary ? 'opacity-80' : 'text-muted-foreground')}>{hint}</span>
            </span>
        </button>
    );
}

/**
 * Masa kartının sarmalayıcısı: dolu masayı sürüklenebilir, her masayı bırakma hedefi yapar. Sürükleme sırasında
 * uygun hedefler vurgulanır, uygun olmayanlar soluklaşır. Sürüklemeden sonra gelen tıklama yutulur (masa açılmasın).
 */
export function DraggableTable({ table, children, className }: { table: Table; children: ReactNode; className?: string }) {
    const { enabled, active } = useContext(TableDragContext);
    const draggable = enabled && canDragTable(table);
    const { setNodeRef: setDragRef, listeners, isDragging } = useDraggable({ id: table.id, disabled: !draggable });
    const { setNodeRef: setDropRef, isOver } = useDroppable({ id: table.id, disabled: !enabled });
    const suppressClick = useRef(false);

    useEffect(() => {
        if (isDragging) suppressClick.current = true;
    }, [isDragging]);
    const validTarget = !!active && canDropOn(active, table);

    return (
        <div
            ref={node => { setDragRef(node); setDropRef(node); }}
            {...(draggable ? listeners : {})}
            onClickCapture={e => {
                if (!suppressClick.current) return;
                suppressClick.current = false;
                e.preventDefault();
                e.stopPropagation();
            }}
            onPointerDown={() => { suppressClick.current = false; }}
            onContextMenu={draggable ? e => e.preventDefault() : undefined}
            className={cn(
                'relative rounded-[18px] transition-[opacity,box-shadow] select-none [-webkit-touch-callout:none]',
                isDragging && 'opacity-40',
                active && !isDragging && !validTarget && 'opacity-50',
                validTarget && 'ring-2 ring-rb-accent/40 ring-offset-2 ring-offset-background',
                validTarget && isOver && 'ring-4 ring-rb-accent',
                className,
            )}
        >
            {children}
        </div>
    );
}
