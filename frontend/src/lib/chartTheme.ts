import type { CSSProperties } from 'react';

// Recharts'ın varsayılan ipucu beyaz kutu + siyah yazıdır; koyu temada beyaz üstüne beyaz görünüyordu.
// Tema değişkenlerine bağlı ortak stil: her <Tooltip {...chartTooltipProps} /> aynı görünür.
export const chartTooltipProps = {
    contentStyle: {
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        color: 'var(--foreground)',
        fontSize: 12,
        boxShadow: '0 6px 20px rgba(0,0,0,0.14)',
    } as CSSProperties,
    labelStyle: { color: 'var(--muted-foreground)', marginBottom: 2 } as CSSProperties,
    itemStyle: { color: 'var(--foreground)' } as CSSProperties,
};
