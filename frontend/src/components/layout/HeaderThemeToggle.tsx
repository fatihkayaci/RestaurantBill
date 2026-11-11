import { useTheme } from 'next-themes';
import { Moon, Sun } from 'lucide-react';

export default function HeaderThemeToggle({ large = false }: { large?: boolean }) {
    const { resolvedTheme, setTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';

    return (
        <button
            type="button"
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            aria-label={isDark ? 'Açık temaya geç' : 'Koyu temaya geç'}
            className={`flex items-center gap-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] transition-colors ${large ? 'min-h-11 px-3' : 'px-2.5 py-1.5'}`}
        >
            {isDark ? <Moon className={`${large ? 'w-5 h-5' : 'w-4 h-4'} text-sidebar-foreground/60`} /> : <Sun className={`${large ? 'w-5 h-5' : 'w-4 h-4'} text-sidebar-foreground/60`} />}
            <span className={`hidden md:inline font-medium text-sidebar-foreground/70 whitespace-nowrap ${large ? 'text-sm' : 'text-xs'}`}>
                {isDark ? 'Koyu Tema' : 'Açık Tema'}
            </span>
            <span className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 shrink-0 ${isDark ? 'bg-rb-accent' : 'bg-white/20'}`}>
                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform duration-200 ${isDark ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </span>
        </button>
    );
}
