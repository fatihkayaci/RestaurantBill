import { useTheme } from 'next-themes';
import { Moon, Sun } from 'lucide-react';

export default function HeaderThemeToggle() {
    const { theme, setTheme } = useTheme();
    const isDark = theme === 'dark';

    return (
        <button
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            className="flex items-center gap-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] px-2.5 py-1.5 transition-colors"
        >
            {isDark ? <Moon className="w-4 h-4 text-sidebar-foreground/60" /> : <Sun className="w-4 h-4 text-sidebar-foreground/60" />}
            <span className="hidden md:inline text-xs font-medium text-sidebar-foreground/70 whitespace-nowrap">
                {isDark ? 'Koyu Tema' : 'Açık Tema'}
            </span>
            <span className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 shrink-0 ${isDark ? 'bg-rb-accent' : 'bg-gray-600'}`}>
                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform duration-200 ${isDark ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </span>
        </button>
    );
}
