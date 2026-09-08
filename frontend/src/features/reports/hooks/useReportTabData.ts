import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReportFilterParams } from '../types';

/**
 * Bir Raporlar sekmesinin verisini yönetir: sekme aktifken lazy çeker, aynı filtre
 * (tarih aralığı + şube) için tekrar sekmeye dönüldüğünde yeniden istek atmaz.
 */
export function useReportTabData<T>(
    tabName: string,
    activeTab: string,
    filter: ReportFilterParams,
    fetchFn: (filter: ReportFilterParams) => Promise<T>,
) {
    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState(false);
    const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
    const filterKey = `${filter.from}|${filter.to}|${filter.branchId ?? ''}`;
    const loadedKeyRef = useRef<string | null>(null);

    const load = useCallback((force: boolean) => {
        if (!force && loadedKeyRef.current === filterKey) return Promise.resolve();
        setLoading(true);
        return fetchFn(filter)
            .then(result => { setData(result); setUpdatedAt(new Date()); loadedKeyRef.current = filterKey; })
            .catch(console.error)
            .finally(() => setLoading(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps -- filterKey already encodes filter's fields
    }, [filterKey, fetchFn]);

    useEffect(() => {
        if (activeTab === tabName) load(false);
    }, [activeTab, tabName, load]);

    return { data, loading, updatedAt, load };
}
