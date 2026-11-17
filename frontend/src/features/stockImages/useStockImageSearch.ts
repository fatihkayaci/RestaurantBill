import { useEffect, useState } from 'react';
import { getApiErrorMessage } from '@/lib/apiError';
import { stockImageService, type StockImage } from './api/stockImageService';

export type StockSearchState =
    | { status: 'loading' }
    | { status: 'error'; message: string }
    // noMatch: aramaya uyan yok, items varsayılan liste. Katalog tamamen boşsa items da boştur.
    | { status: 'ready'; items: StockImage[]; noMatch: boolean };

const SEARCH_DELAY_MS = 250;

/**
 * Hazır görsel araması (sıralama sunucuda): yazdıkça kısa gecikmeyle arar; eşleşme yoksa boş ekran yerine varsayılan
 * listeyi `noMatch` ile döner. Ürün/menü penceresi (StockImagePickerModal) ve site düzenleyicisinin paneli kullanır.
 */
export function useStockImageSearch(query: string) {
    const [state, setState] = useState<StockSearchState>({ status: 'loading' });
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

    return { state, retry: () => setReloadKey(k => k + 1) };
}
