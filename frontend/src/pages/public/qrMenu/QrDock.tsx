import { useEffect, useRef, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** Alt gezinme çubuğunun yüksekliği (QrTabs BottomBar: 60 px düğme + 16 px dolgu + 1 px çizgi). */
export const NAV_SPACE = 'calc(77px + env(safe-area-inset-bottom))';

/**
 * Sekmenin altına yapışık panel (Sepetim'in sipariş paneli, Hesabım'ın Öde / Hesap iste satırı): alt çubuğun hemen
 * üstünde sabit alt alan; köşesiz, üstte temanın normal çizgisi ve hafif gölge (sürüklenebilir sayfa izlenimi vermez,
 * tutamak yok). Panel alt çubuğun
 * arkasına kadar uzanır; ölçülen yüksekliği sayfanın scroll-padding-bottom'ı olur, böylece odaklanan öğe panelin altında
 * kalmaz. Ebeveyn sütun en az ekran boyu (min-h-dvh) esnek sütun olmalı; panel en sonda durur (mt-auto).
 */
export function DockedPanel({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
    const panelRef = useRef<HTMLElement>(null);

    useEffect(() => {
        const panel = panelRef.current;
        if (!panel) return;
        const html = document.documentElement;
        const apply = () => { html.style.scrollPaddingBottom = `${panel.offsetHeight + 12}px`; };
        apply();
        const observer = new ResizeObserver(apply);
        observer.observe(panel);
        return () => { observer.disconnect(); html.style.scrollPaddingBottom = ''; };
    }, []);

    return (
        <section ref={panelRef} aria-label={label} style={{ paddingBottom: `calc(${NAV_SPACE} + 14px)` }}
            className={cn('sticky bottom-0 z-20 -mx-4 mt-auto border-t border-[var(--site-border)] bg-[var(--site-card)] px-4 pt-4 shadow-[0_-10px_24px_-20px_rgba(0,0,0,0.4)]', className)}>
            {children}
        </section>
    );
}
