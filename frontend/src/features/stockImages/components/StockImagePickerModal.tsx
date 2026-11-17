import { useState } from 'react';
import { ImageOff, Search, X } from 'lucide-react';
import { Modal, ModalTitle } from '@/components/ui/modal';
import { Skeleton } from '@/components/ui/skeleton';
import { inputClass } from '@/lib/formStyles';
import type { StockImage } from '../api/stockImageService';
import { useStockImageSearch } from '../useStockImageSearch';

interface StockImagePickerModalProps {
    /** Ürün/menü adı: arama kutusu bununla dolu açılır, eşleşenler hemen görünür. */
    initialQuery: string;
    onClose: () => void;
    onSelect: (image: StockImage) => void;
}

const FOOD = { scope: 'food' } as const;

// "Hazır görsellerden seç": ortak kütüphaneden fotoğraf seçer. Seçim kaydedilene kadar yalnızca önizlemedir;
// kaydetme ürün/menü düzenleyicisinde yapılır (yeni kayıtta oluşturduktan sonra).
export default function StockImagePickerModal({ initialQuery, onClose, onSelect }: StockImagePickerModalProps) {
    const [query, setQuery] = useState(initialQuery.trim());
    // Ürün ve menüler: yemek/içecek fotoğrafları (mekân grupları hariç).
    const { state, retry } = useStockImageSearch(query, FOOD);

    return (
        <Modal onClose={onClose} overlayClassName="bg-black/40 backdrop-blur-sm">
            <div className="relative mx-4 flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl dark:bg-[#26221e]">
                <div className="flex items-center justify-between border-b border-border px-6 pb-4 pt-6">
                    <ModalTitle className="text-xl font-bold text-foreground">Hazır görsellerden seç</ModalTitle>
                    <button type="button" onClick={onClose} aria-label="Kapat" className="text-muted-foreground transition-colors hover:text-foreground">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="border-b border-border px-6 py-4">
                    <label htmlFor="stock-image-search" className="sr-only">Görsel ara</label>
                    <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                        <input
                            id="stock-image-search"
                            type="search"
                            className={`${inputClass} pl-9`}
                            placeholder="Ara: adana, çay, lahmacun…"
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            autoFocus
                        />
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                        Hazır görseller örnek fotoğraflardır; müşteriye "Temsili görsel" etiketiyle gösterilir.
                    </p>
                </div>

                <div className="min-h-[240px] flex-1 overflow-y-auto px-6 py-5" aria-live="polite" aria-busy={state.status === 'loading'}>
                    {state.status === 'loading' && (
                        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                            {Array.from({ length: 8 }, (_, i) => (
                                <div key={i} className="space-y-1.5">
                                    <Skeleton className="aspect-square w-full rounded-lg" />
                                    <Skeleton className="h-3 w-2/3" />
                                </div>
                            ))}
                        </div>
                    )}

                    {state.status === 'error' && (
                        <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
                            <p className="text-sm text-destructive">{state.message}</p>
                            <button type="button" onClick={retry}
                                className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted">
                                Tekrar dene
                            </button>
                        </div>
                    )}

                    {state.status === 'ready' && state.items.length === 0 && (
                        <div className="flex flex-col items-center justify-center gap-2 py-10 text-center text-muted-foreground">
                            <ImageOff className="h-6 w-6" aria-hidden="true" />
                            <p className="text-sm">Henüz hazır görsel yok.</p>
                        </div>
                    )}

                    {state.status === 'ready' && state.items.length > 0 && (
                        <>
                            {state.noMatch && (
                                <p className="mb-3 text-xs text-muted-foreground">
                                    "{query.trim()}" için eşleşen görsel bulunamadı. Tüm hazır görseller:
                                </p>
                            )}
                            <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                                {state.items.map(image => (
                                    <li key={image.id}>
                                        <button
                                            type="button"
                                            onClick={() => onSelect(image)}
                                            title={image.group ? `${image.title} · ${image.group}` : image.title}
                                            className="group block w-full rounded-lg text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                        >
                                            <span className="block aspect-square w-full overflow-hidden rounded-lg border border-border bg-muted/50">
                                                <img src={image.url} alt="" loading="lazy"
                                                    className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                                            </span>
                                            <span className="mt-1.5 block truncate text-xs font-medium text-foreground">{image.title}</span>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </>
                    )}
                </div>
            </div>
        </Modal>
    );
}
