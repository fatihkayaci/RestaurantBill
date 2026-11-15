import { cn } from '@/lib/utils';

interface Props {
    options: { id: string; name: string }[];
    selectedId: string;
    onSelect: (id: string) => void;
}

// Ürün ekleme ekranındaki yatay kayan kategori çipleri (en az 44px yükseklik).
export default function CategoryChips({ options, selectedId, onSelect }: Props) {
    return (
        <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-0.5" style={{ scrollbarWidth: 'none' }}>
            {options.map(option => (
                <button
                    key={option.id}
                    type="button"
                    aria-pressed={selectedId === option.id}
                    onClick={() => onSelect(option.id)}
                    className={cn(
                        'min-h-11 shrink-0 rounded-full border px-4 text-sm font-semibold whitespace-nowrap transition-colors',
                        selectedId === option.id ? 'border-foreground bg-foreground text-background' : 'border-border bg-card text-foreground',
                    )}
                >
                    {option.name}
                </button>
            ))}
        </div>
    );
}
