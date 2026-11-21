import { useEffect, useMemo, useRef, useState } from 'react';
import { getApiErrorMessage } from '@/lib/apiError';
import { publicDeliveryService } from './api/publicDeliveryService';
import { toCartInput, type DeliveryCartLine } from './deliveryCart';
import type { CartLineInput, DeliveryQuote } from './types';

const QUOTE_DEBOUNCE_MS = 400;

export interface DeliveryQuoteState {
    /** Sepetin şu anki hâline ait teklif; sepet değişip yenisi gelene kadar null. */
    quote: DeliveryQuote | null;
    error: string | null;
    quoting: boolean;
    /** 409 (fiyat değişti) sonrası gelen güncel teklifi elle yazar. */
    setQuote: (value: DeliveryQuote) => void;
}

/**
 * Sunucunun sepet teklifi (fiyat, teslimat ücreti, en az tutar): sepet, mahalle ya da gel al değişince 400 ms sonra
 * yeniden istenir; eski cevaplar yok sayılır. Notlar fiyatı değiştirmez: not yazarken teklif yeniden istenmez.
 * Sipariş sayfası (/siparis) ve Sophra menü sayfası kullanır.
 */
export function useDeliveryQuote(branchId: string | null, lines: DeliveryCartLine[], zoneId: string | null, pickup: boolean): DeliveryQuoteState {
    const [quote, setQuoteState] = useState<{ key: string; value: DeliveryQuote } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [quoting, setQuoting] = useState(false);
    const seqRef = useRef(0);

    const key = useMemo(
        () => JSON.stringify({ branchId, zoneId: pickup ? null : zoneId, pickup, lines: toCartInput(lines).map(l => ({ ...l, note: undefined })) }),
        [branchId, zoneId, pickup, lines],
    );
    const hasLines = lines.length > 0;

    useEffect(() => {
        if (!branchId || !hasLines) return;
        const seq = ++seqRef.current;
        const request = JSON.parse(key) as { zoneId: string | null; pickup: boolean; lines: CartLineInput[] };
        const timer = setTimeout(() => {
            setQuoting(true);
            publicDeliveryService.quote(branchId, request.zoneId, request.lines, request.pickup)
                .then(value => {
                    if (seq !== seqRef.current) return;
                    setQuoteState({ key, value });
                    setError(null);
                })
                .catch(err => {
                    if (seq !== seqRef.current) return;
                    setQuoteState(null);
                    setError(getApiErrorMessage(err, 'Sepet tutarı hesaplanamadı. Bağlantınızı kontrol edin.'));
                })
                .finally(() => { if (seq === seqRef.current) setQuoting(false); });
        }, QUOTE_DEBOUNCE_MS);
        return () => clearTimeout(timer);
    }, [branchId, key, hasLines]);

    return {
        quote: quote && quote.key === key && hasLines ? quote.value : null,
        error: hasLines ? error : null,
        quoting,
        setQuote: value => setQuoteState({ key, value }),
    };
}
