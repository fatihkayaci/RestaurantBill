import { useLayoutEffect, useRef } from 'react';
import { useTheme } from 'next-themes';

const DURATION_MS = 450;

// Renk geçişi yalnızca tema değişirken açık kalır (index.css: html.theme-transition).
// Eskiden kural her elemana her zaman uygulanıyordu; hover ve seçili durumlar 0,4 sn gecikiyordu.
export default function ThemeTransition() {
    const { resolvedTheme } = useTheme();
    const previous = useRef(resolvedTheme);

    useLayoutEffect(() => {
        if (previous.current === resolvedTheme) return;
        const hadTheme = previous.current !== undefined;
        previous.current = resolvedTheme;
        if (!hadTheme) return;

        const root = document.documentElement;
        root.classList.add('theme-transition');
        const timer = window.setTimeout(() => root.classList.remove('theme-transition'), DURATION_MS);
        return () => {
            window.clearTimeout(timer);
            root.classList.remove('theme-transition');
        };
    }, [resolvedTheme]);

    return null;
}
