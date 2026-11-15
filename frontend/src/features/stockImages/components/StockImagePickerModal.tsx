import { useEffect, useState } from 'react';
import { ImageOff, Search, X } from 'lucide-react';
import { Modal, ModalTitle } from '@/components/ui/modal';
import { Skeleton } from '@/components/ui/skeleton';
import { getApiErrorMessage } from '@/lib/apiError';
import { inputClass } from '@/lib/formStyles';
import { stockImageService, type StockImage } from '../api/stockImageService';

interface StockImagePickerModalProps {
    /** Ürün/menü adı: arama kutusu bununla dolu açılır, eşleşenler hemen görünür. */
    initialQuery: string;
    onClose: () => void;
    onSelect: (image: StockImage) => void;
}

type PickerState =
    | { status: 'loading' }
    | { status: 'error'; message: string }
    // noMatch: aramaya uyan yok, items varsayılan liste. Katalog tamamen boşsa items da boştur.
    | { status: 'ready'; items: StockImage[]; noMatch: boolean };

const SEARCH_DELAY_MS = 250;

// "Hazır görsellerden seç": ortak kütüphaneden fotoğraf seçer. Seçim kaydedilene kadar yalnızca önizlemedir;
// kaydetme ürün/menü düzenleyicisinde yapılır (yeni kayıtta oluşturduktan sonra).
export default function StockImagePickerModal({ initialQuery, onClose, onSelect }: StockImagePickerModalProps) {
    const [query, setQuery] = useState(initialQuery.trim());
    const [state, setState] = useState<PickerState>({ status: 'loading' });
    const [reloadKey, setReloadKey] = useState(0);

    useEffect(() => {
        const controller = new AbortController();
        const timer = window.setTimeout(async () => {
            setState({ status: 'loading' });
            try {
                const q = query.trim();
                let items = await stockImageService.search(q, controller.signal);
                let noMatch = false;
                if (items.length === 0 && q) {
                    // Eşleşme yoksa boş ekran yerine kütüphanenin varsayılan listesi gösterilir.
                    items = await stockImageService.search('', controller.signal);
                    noMatch = true;
                }
                setState({ status: 'ready', items, noMatch });
            } catch (err) {
                if (controller.signal.aborted) return;
                setState({ status: 'error', message: getApiErrorMessage(err, 'Hazır görseller yüklenemedi.') });
            }
        }, SEARCH_DELAY_MS);
        return () => {
            window.clearTimeout(timer);
            controller.abort();
        };
    }, [query, reloadKey]);

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
                            <button type="button" onClick={() => setReloadKey(k => k + 1)}
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
