import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTheme } from "next-themes";
import { Menu, Moon, Sun, X } from "lucide-react";
import sophramLogo from "@/assets/sophram-logo.svg";

export type PublicNavLink = { label: string; href: string };

interface PublicNavProps {
    links?: PublicNavLink[];
}

export default function PublicNav({ links = [] }: PublicNavProps) {
    const { resolvedTheme, setTheme } = useTheme();
    const isDark = resolvedTheme === "dark";
    const [menuOpen, setMenuOpen] = useState(false);

    useEffect(() => {
        if (!menuOpen) return;
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [menuOpen]);

    return (
        <nav className="sticky top-0 z-50 backdrop-blur-md bg-[#f5f0e8]/95 dark:bg-[#18140f]/95 border-b border-border">
            <div className="px-5 sm:px-8 lg:px-15 py-1.5 flex items-center justify-between gap-6">
                <Link to="/" className="flex items-center shrink-0" onClick={() => setMenuOpen(false)}>
                    <img src={sophramLogo} alt="" className="h-12 sm:h-14 w-auto" />
                    <span className="font-serif text-xl font-bold">Sophram</span>
                </Link>

                {links.length > 0 && (
                    <div className="hidden lg:flex items-center gap-7 flex-1 justify-center">
                        {links.map((link) => (
                            <a
                                key={link.label}
                                href={link.href}
                                className="text-[13px] font-medium text-[#6b5e52] dark:text-[#a89880] hover:text-[#2a1f14] dark:hover:text-[#f2ede4] transition-colors"
                            >
                                {link.label}
                            </a>
                        ))}
                    </div>
                )}

                <div className="flex items-center gap-2 shrink-0">
                    <button
                        type="button"
                        onClick={() => setTheme(isDark ? "light" : "dark")}
                        aria-label={isDark ? "Açık temaya geç" : "Koyu temaya geç"}
                        className="w-9 h-9 rounded-lg flex items-center justify-center text-[#6b5e52] dark:text-[#a89880] hover:bg-black/5 dark:hover:bg-white/8 transition-colors"
                    >
                        {isDark ? <Sun size={18} /> : <Moon size={18} />}
                    </button>
                    <Link
                        to="/login"
                        className="px-4 py-2 rounded-lg bg-rb-gold text-[13px] font-bold text-[#1c1510] hover:bg-[#d6b97f] transition-colors"
                    >
                        Giriş Yap
                    </Link>
                    {links.length > 0 && (
                        <button
                            type="button"
                            onClick={() => setMenuOpen((o) => !o)}
                            aria-label={menuOpen ? "Menüyü kapat" : "Menüyü aç"}
                            aria-expanded={menuOpen}
                            aria-controls="public-nav-menu"
                            className="lg:hidden w-9 h-9 rounded-lg flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/8 transition-colors"
                        >
                            {menuOpen ? <X size={20} /> : <Menu size={20} />}
                        </button>
                    )}
                </div>
            </div>

            {links.length > 0 && menuOpen && (
                <div
                    id="public-nav-menu"
                    className="lg:hidden border-t border-border px-5 sm:px-8 py-3 flex flex-col animate-in fade-in slide-in-from-top-2 duration-200"
                >
                    {links.map((link) => (
                        <a
                            key={link.label}
                            href={link.href}
                            onClick={() => setMenuOpen(false)}
                            className="py-3 text-[15px] font-medium border-b last:border-b-0 border-border"
                        >
                            {link.label}
                        </a>
                    ))}
                </div>
            )}
        </nav>
    );
}
