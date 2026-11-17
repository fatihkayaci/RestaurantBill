import { useEffect, useState } from 'react';
import { getApiErrorMessage } from '@/lib/apiError';
import { stockImageService, type StockImage, type StockSearchOptions } from './api/stockImageService';

export type StockSearchState =
    | { status: 'loading' }
    | { status: 'error'; message: string }
    // noMatch: aramaya uyan yok, items varsayılan liste. Katalog tamamen boşsa items da boştur.
    | { status: 'ready'; items: StockImage[]; noMatch: boolean };

const SEARCH_DELAY_MS = 250;

/**
 * Hazır görsel araması (sıralama sunucuda): yazdıkça kısa gecikmeyle arar; eşleşme yoksa boş ekran yerine varsayılan
 * listeyi `noMatch` ile döner (aynı kapsam ve grupla). Ürün/menü penceresi (StockImagePickerModal, `food`) ve site
 * düzenleyicisinin paneli (StockGrid, `venue`) kullanır.
 */
export function useStockImageSearch(query: string, { scope, group }: StockSearchOptions = {}) {
    const [state, setState] = useState<StockSearchState>({ status: 'loading' });
    const [reloadKey, setReloadKey] = useState(0);

    useEffect(() => {
        const controller = new AbortController();
        const timer = window.setTimeout(async () => {
            setState({ status: 'loading' });
            try {
                const q = query.trim();
                const options = { scope, group };
                let items = await stockImageService.search(q, options, controller.signal);
                let noMatch = false;
                if (items.length === 0 && q) {
                    items = await stockImageService.search('', options, controller.signal);
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
    }, [query, scope, group, reloadKey]);

    return { state, retry: () => setReloadKey(k => k + 1) };
}
