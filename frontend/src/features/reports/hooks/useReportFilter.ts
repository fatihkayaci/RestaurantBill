import { useSearchParams } from 'react-router-dom';

export type DatePreset = 'today' | 'yesterday' | 'week' | 'month' | 'custom';

function toIso(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function presetRange(preset: DatePreset): { from: string; to: string } {
    const now = new Date();
    const today = toIso(now);
    switch (preset) {
        case 'yesterday': {
            const d = new Date(now);
            d.setDate(d.getDate() - 1);
            return { from: toIso(d), to: toIso(d) };
        }
        case 'week': {
            const start = new Date(now);
            const mondayOffset = (start.getDay() + 6) % 7;
            start.setDate(start.getDate() - mondayOffset);
            return { from: toIso(start), to: today };
        }
        case 'month': {
            const start = new Date(now.getFullYear(), now.getMonth(), 1);
            return { from: toIso(start), to: today };
        }
        case 'today':
        default:
            return { from: today, to: today };
    }
}

export function useReportFilter(defaultTab: string) {
    const [searchParams, setSearchParams] = useSearchParams();

    const defaultRange = presetRange('today');
    const from = searchParams.get('from') ?? defaultRange.from;
    const to = searchParams.get('to') ?? defaultRange.to;
    const branchId = searchParams.get('branch') ?? undefined;
    const tab = searchParams.get('tab') ?? defaultTab;

    const setPreset = (preset: DatePreset) => {
        const range = presetRange(preset);
        setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            next.set('from', range.from);
            next.set('to', range.to);
            return next;
        }, { replace: true });
    };

    const setCustomRange = (newFrom: string, newTo: string) => {
        setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            next.set('from', newFrom);
            next.set('to', newTo);
            return next;
        }, { replace: true });
    };

    const setBranch = (id: string | undefined) => {
        setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            if (id) next.set('branch', id); else next.delete('branch');
            return next;
        }, { replace: true });
    };

    const setTab = (newTab: string) => {
        setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            next.set('tab', newTab);
            return next;
        }, { replace: true });
    };

    return { from, to, branchId, tab, setPreset, setCustomRange, setBranch, setTab };
}
