import type { ReactNode } from 'react';
import {
    DndContext, KeyboardSensor, MouseSensor, TouchSensor, closestCenter, useSensor, useSensors,
    type Announcements, type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props<T extends string> {
    items: readonly T[];
    /** Düzenleme kapalıyken kartlar normal davranır; açıkken tıklamalar kartın içine gitmez, kart taşınır. */
    editing: boolean;
    onReorder: (next: T[]) => void;
    /** Kartın ızgaradaki genişliği (col-span sınıfları). */
    itemClassName: (id: T) => string;
    /** Ekran okuyucu ve tutamak etiketi için kartın adı. */
    itemLabel: (id: T) => string;
    renderItem: (id: T) => ReactNode;
    className?: string;
    /** Izgaranın sonuna eklenen, sıralanmayan öğe (ör. "Kart ekle"). */
    trailing?: ReactNode;
    /** Düzenleme katmanının köşe yuvarlaklığı; kartlarınkiyle aynı olmalı. */
    radiusClassName?: string;
}

// Panel kartlarını sürükle-bırak ile sıralayan ızgara. Fare: 6px sürükleyince başlar; dokunmatik: basılı tutunca
// (kaydırma bozulmasın diye); klavye: kart odaktayken Boşluk ile tut, oklarla taşı, Boşluk ile bırak.
export default function SortableGrid<T extends string>({
    items, editing, onReorder, itemClassName, itemLabel, renderItem, className, trailing, radiusClassName = 'rounded-xl',
}: Props<T>) {
    const sensors = useSensors(
        useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );

    const label = (id: unknown) => itemLabel(String(id) as T);
    const position = (id: unknown) => items.indexOf(String(id) as T) + 1;
    const announcements: Announcements = {
        onDragStart: ({ active }) => `${label(active.id)} kartı tutuldu. ${position(active.id)}. sırada.`,
        onDragOver: ({ active, over }) => (over ? `${label(active.id)} kartı ${position(over.id)}. sıraya taşınıyor.` : `${label(active.id)} kartı ızgaranın dışında.`),
        onDragEnd: ({ active, over }) => (over ? `${label(active.id)} kartı ${position(over.id)}. sıraya bırakıldı.` : `${label(active.id)} kartı bırakıldı.`),
        onDragCancel: ({ active }) => `Taşıma iptal edildi. ${label(active.id)} kartı yerinde kaldı.`,
    };

    const handleDragEnd = ({ active, over }: DragEndEvent) => {
        if (!over || active.id === over.id) return;
        const from = items.indexOf(String(active.id) as T);
        const to = items.indexOf(String(over.id) as T);
        if (from < 0 || to < 0) return;
        onReorder(arrayMove([...items], from, to));
    };

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
            accessibility={{
                announcements,
                screenReaderInstructions: {
                    draggable: 'Kartı taşımak için Boşluk ya da Enter tuşuna basın, ok tuşlarıyla yerini seçin, bırakmak için yeniden Boşluk ya da Enter, vazgeçmek için Escape.',
                },
            }}
        >
            <SortableContext items={items as T[]} strategy={rectSortingStrategy} disabled={!editing}>
                <div className={className}>
                    {items.map(id => (
                        <SortableItem key={id} id={id} editing={editing} label={itemLabel(id)} className={itemClassName(id)} radiusClassName={radiusClassName}>
                            {renderItem(id)}
                        </SortableItem>
                    ))}
                    {trailing}
                </div>
            </SortableContext>
        </DndContext>
    );
}

function SortableItem({ id, editing, label, className, radiusClassName, children }: {
    id: string; editing: boolean; label: string; className: string; radiusClassName: string; children: ReactNode;
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

    return (
        <div
            ref={setNodeRef}
            // Translate (scale değil): farklı genişlikteki kartlar sürüklerken esneyip bozulmasın.
            style={{ transform: CSS.Translate.toString(transform), transition }}
            className={cn('relative min-w-0', isDragging && 'z-20', className)}
        >
            {/* Düzenlemede kartın içi devre dışı (inert): tıklama, odak ve grafik ipuçları kartı taşımayı bozmasın. */}
            <div inert={editing} className={cn('h-full [&>*]:h-full', editing && 'select-none')}>
                {children}
            </div>
            {editing && (
                <div
                    {...attributes}
                    {...listeners}
                    aria-label={`${label} kartını taşı`}
                    className={cn(
                        'absolute inset-0 cursor-grab touch-manipulation border-2 border-dashed border-rb-gold/60 bg-rb-gold/5 outline-none transition-shadow',
                        'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                        radiusClassName,
                        isDragging && 'cursor-grabbing border-solid border-rb-gold bg-rb-gold/10 shadow-2xl',
                    )}
                >
                    <span className="absolute right-2 top-2 flex items-center gap-1 rounded-lg border border-border bg-card px-2 py-1 text-xs font-semibold text-foreground shadow-sm">
                        <GripVertical className="h-4 w-4 text-rb-text-sub" aria-hidden="true" />
                        Taşı
                    </span>
                </div>
            )}
        </div>
    );
}
