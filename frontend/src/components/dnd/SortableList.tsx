import type { CSSProperties, ReactNode } from 'react';
import {
    DndContext,
    KeyboardSensor,
    MouseSensor,
    TouchSensor,
    closestCenter,
    useSensor,
    useSensors,
    type Announcements,
    type DragEndEvent,
    type DraggableAttributes,
    type DraggableSyntheticListeners,
    type ScreenReaderInstructions,
} from '@dnd-kit/core';
import {
    SortableContext,
    arrayMove,
    horizontalListSortingStrategy,
    rectSortingStrategy,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Sürükleme tutamağına (ya da tüm karta) yayılacak dnd-kit özellikleri. */
export interface DragHandleProps {
    setNodeRef: (element: HTMLElement | null) => void;
    attributes: DraggableAttributes;
    listeners: DraggableSyntheticListeners;
}

export interface SortableRenderState {
    handle: DragHandleProps;
    isDragging: boolean;
}

type Layout = 'vertical' | 'horizontal' | 'grid';

const STRATEGY = {
    vertical: verticalListSortingStrategy,
    horizontal: horizontalListSortingStrategy,
    grid: rectSortingStrategy,
} as const;

/**
 * Sıralama sürüklemesinin sensörleri: fare 5 px kımıldayınca, dokunmatikte kısa basılı tutunca (kaydırma bozulmasın)
 * başlar; klavyede tutamağa odaklanıp Boşluk/Enter ile alınır, oklarla taşınır, tekrar Boşluk/Enter ile bırakılır.
 */
function useReorderSensors() {
    return useSensors(
        useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );
}

const screenReaderInstructions: ScreenReaderInstructions = {
    draggable: 'Taşımak için Boşluk ya da Enter tuşuna basın, ok tuşlarıyla yerini seçin, bırakmak için yeniden Boşluk ya da Enter, vazgeçmek için Escape.',
};

function announcements(nameOf: (id: string) => string, positionOf: (id: string) => number): Announcements {
    return {
        onDragStart: ({ active }) => `${nameOf(String(active.id))} alındı.`,
        onDragOver: ({ active, over }) => over ? `${nameOf(String(active.id))}, ${positionOf(String(over.id)) + 1}. sıraya geliyor.` : undefined,
        onDragEnd: ({ active, over }) => over
            ? `${nameOf(String(active.id))} ${positionOf(String(over.id)) + 1}. sıraya bırakıldı.`
            : `${nameOf(String(active.id))} bırakıldı.`,
        onDragCancel: ({ active }) => `Taşıma iptal edildi, ${nameOf(String(active.id))} yerinde kaldı.`,
    };
}

interface SortableListProps<T extends { id: string }> {
    items: T[];
    /** Bırakınca yeni sıra (yalnızca sıra gerçekten değiştiyse çağrılır). */
    onReorder: (next: T[]) => void;
    /** Ekran okuyucu duyuruları için öğenin adı. */
    getName: (item: T) => string;
    renderItem: (item: T, state: SortableRenderState) => ReactNode;
    layout?: Layout;
    className?: string;
    disabled?: boolean;
}

/** Sürükle-bırak ile sıralanan liste; görünümü çağıran `renderItem` ile çizer, tutamağı `state.handle` ile bağlar. */
export function SortableList<T extends { id: string }>({
    items, onReorder, getName, renderItem, layout = 'vertical', className, disabled,
}: SortableListProps<T>) {
    const sensors = useReorderSensors();
    const ids = items.map(i => i.id);
    const nameOf = (id: string) => {
        const item = items.find(i => i.id === id);
        return item ? getName(item) : '';
    };

    const handleDragEnd = ({ active, over }: DragEndEvent) => {
        if (!over || active.id === over.id) return;
        const from = ids.indexOf(String(active.id));
        const to = ids.indexOf(String(over.id));
        if (from < 0 || to < 0) return;
        onReorder(arrayMove(items, from, to));
    };

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
            accessibility={{ screenReaderInstructions, announcements: announcements(nameOf, id => ids.indexOf(id)) }}
        >
            <SortableContext items={ids} strategy={STRATEGY[layout]} disabled={disabled}>
                <div className={className}>
                    {items.map(item => (
                        <SortableItem key={item.id} id={item.id}>
                            {state => renderItem(item, state)}
                        </SortableItem>
                    ))}
                </div>
            </SortableContext>
        </DndContext>
    );
}

function SortableItem({ id, children }: { id: string; children: (state: SortableRenderState) => ReactNode }) {
    const { setNodeRef, setActivatorNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({ id });
    const style: CSSProperties = {
        transform: CSS.Translate.toString(transform),
        transition,
        position: 'relative',
        zIndex: isDragging ? 20 : undefined,
    };
    return (
        <div ref={setNodeRef} style={style}>
            {children({ handle: { setNodeRef: setActivatorNodeRef, attributes, listeners }, isDragging })}
        </div>
    );
}

/** Satırın solundaki tutamak: fareyle tut-sürükle, dokunmatikte basılı tut-sürükle, klavyede Boşluk/Enter. */
export function DragHandle({ setNodeRef, attributes, listeners, label, className }: DragHandleProps & { label: string; className?: string }) {
    return (
        <button
            type="button"
            ref={setNodeRef}
            {...attributes}
            {...listeners}
            aria-label={label}
            className={cn(
                'flex size-10 shrink-0 cursor-grab touch-none items-center justify-center rounded-lg text-muted-foreground',
                'hover:bg-muted hover:text-foreground active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                className,
            )}
        >
            <GripVertical className="size-5" aria-hidden="true" />
        </button>
    );
}

/** Sıralama listelerinin ortak satırı: tutamak + içerik. Sürüklenirken gölgelenir. */
export function SortableRow({ state, label, children, className }: {
    state: SortableRenderState;
    label: string;
    children: ReactNode;
    className?: string;
}) {
    return (
        <div
            className={cn(
                'flex min-h-14 items-center gap-2 rounded-xl border border-border bg-card py-2 pr-3 pl-1 select-none',
                state.isDragging && 'border-rb-accent shadow-[0_10px_30px_rgba(0,0,0,0.18)] ring-2 ring-rb-accent/30',
                className,
            )}
        >
            <DragHandle {...state.handle} label={label} />
            {children}
        </div>
    );
}
