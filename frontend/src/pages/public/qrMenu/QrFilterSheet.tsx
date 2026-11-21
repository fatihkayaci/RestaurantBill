import type { ReactNode } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import Sheet from '../delivery/Sheet';
import { DEFAULT_FILTERS, type QrFilters, type QrSort } from './qrModel';
import { outlineButton, primaryButton } from './qrUi';

const SORTS: { id: QrSort; label: string }[] = [
    { id: 'menu', label: 'Menü sırası' },
    { id: 'price-asc', label: 'Fiyat: düşükten yükseğe' },
    { id: 'price-desc', label: 'Fiyat: yüksekten düşüğe' },
];

// Süzgeç penceresi: tükenenleri gizle ve fiyat sıralaması. Seçimler hemen uygulanır.
export default function QrFilterSheet({ filters, onChange, onClose }: {
    filters: QrFilters; onChange: (filters: QrFilters) => void; onClose: () => void;
}) {
    const footer = (
        <div className="grid grid-cols-2 gap-2.5">
            <button type="button" onClick={() => onChange(DEFAULT_FILTERS)} className={outlineButton}>Temizle</button>
            <button type="button" onClick={onClose} className={primaryButton}>Göster</button>
        </div>
    );
    return (
        <Sheet title="Süzgeç ve sıralama" onClose={onClose} footer={footer}>
            <Option type="checkbox" checked={filters.inStockOnly} onChange={() => onChange({ ...filters, inStockOnly: !filters.inStockOnly })}>
                Tükenenleri gizle
            </Option>
            <fieldset className="m-0 mt-6 border-0 p-0">
                <legend className="p-0 text-[17px] font-extrabold">Sıralama</legend>
                <div className="mt-2.5 flex flex-col gap-2">
                    {SORTS.map(sort => (
                        <Option key={sort.id} type="radio" name="qr-siralama" checked={filters.sort === sort.id} onChange={() => onChange({ ...filters, sort: sort.id })}>
                            {sort.label}
                        </Option>
                    ))}
                </div>
            </fieldset>
        </Sheet>
    );
}

function Option({ type, name, checked, onChange, children }: { type: 'checkbox' | 'radio'; name?: string; checked: boolean; onChange: () => void; children: ReactNode }) {
    return (
        <label className={cn('flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl border px-4 py-2.5 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[var(--site-focus)]',
            checked ? 'border-[var(--site-accent)] bg-[var(--site-accent-soft)]' : 'border-[var(--site-border-mid)]')}>
            <input type={type} name={name} checked={checked} onChange={onChange} className="sr-only" />
            <span aria-hidden="true" className={cn('flex h-6 w-6 shrink-0 items-center justify-center border-2', type === 'radio' ? 'rounded-full' : 'rounded-md',
                checked ? 'border-[var(--site-accent)] bg-[var(--site-accent)] text-[var(--site-on-accent)]' : 'border-[var(--site-border-strong)]')}>
                {checked && <Check className="h-3.5 w-3.5" strokeWidth={3.5} />}
            </span>
            <span className="min-w-0 flex-1 text-[15px] font-semibold">{children}</span>
        </label>
    );
}
