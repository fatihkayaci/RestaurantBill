import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { QuickAddChips } from '@/components/ui/empty-state';
import { cn } from '@/lib/utils';

interface SuggestedChipsProps {
    /** Hazır isimler; mevcut olanlar (büyük/küçük harf farkı gözetmeden) gizlenir. */
    options: string[];
    /** Sayfada zaten olan kayıtların adları. */
    existingNames: string[];
    onPick: (name: string) => Promise<void> | void;
    /** Açık/kapalı tercihinin tarayıcıda saklandığı anahtar. */
    storageKey: string;
}

const normalize = (name: string) => name.trim().toLocaleLowerCase('tr');

function readOpen(storageKey: string): boolean {
    try { return localStorage.getItem(storageKey) !== '0'; } catch { return true; }
}

// Liste doluyken de görünen, katlanabilir "Önerilenler" satırı: yalnızca henüz eklenmemiş hazır isimleri gösterir.
export function SuggestedChips({ options, existingNames, onPick, storageKey }: SuggestedChipsProps) {
    const [open, setOpen] = useState(() => readOpen(storageKey));

    const existing = new Set(existingNames.map(normalize));
    const missing = options.filter(name => !existing.has(normalize(name)));
    if (missing.length === 0) return null;

    const toggle = () => {
        const next = !open;
        setOpen(next);
        try { localStorage.setItem(storageKey, next ? '1' : '0'); } catch { /* özel pencere */ }
    };

    return (
        <div className="flex flex-wrap items-center gap-2">
            <button
                type="button"
                onClick={toggle}
                aria-expanded={open}
                className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
            >
                Önerilenler ({missing.length})
                <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', !open && '-rotate-90')} aria-hidden="true" />
            </button>
            {open && <QuickAddChips options={missing} onPick={onPick} />}
        </div>
    );
}
