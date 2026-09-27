import { Link } from "react-router-dom";
import { useTheme } from "next-themes";
import sophramLogo from "@/assets/sophram-logo.svg";

export type PublicNavLink = { label: string; href: string };

interface PublicNavProps {
    links?: PublicNavLink[];
}

export default function PublicNav({ links = [] }: PublicNavProps) {
    const { theme, setTheme } = useTheme();
    const isDark = theme === "dark";

    return (
        <nav className="sticky top-0 z-50 backdrop-blur-md bg-[#f5f0e8]/96 dark:bg-[#18140f]/96 border-b border-[#e8e0d0] dark:border-[#3d3528] px-6 md:px-15 py-1.5 flex items-center justify-between gap-6">
            <Link to="/" className="flex items-center gap-0 shrink-0">
                <img src={sophramLogo} alt="Sophram" className="h-14 w-auto" />
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

            <div className="flex items-center gap-2.5 shrink-0">
                <button
                    onClick={() => setTheme(isDark ? "light" : "dark")}
                    className={`relative inline-flex h-5 w-9.5 items-center rounded-full transition-colors duration-300 focus:outline-none shrink-0 ${
                        isDark ? "bg-rb-accent" : "bg-black/10"
                    }`}
                >
                    <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-all duration-200 ${
                            isDark ? "translate-x-5" : "translate-x-0.5"
                        }`}
                    />
                </button>
                <Link to="/login" className="px-4 py-1.75 rounded-lg bg-[#C8A96E] text-[13px] font-bold text-[#1c1510] hover:opacity-90 transition-opacity">
                    Giriş Yap
                </Link>
            </div>
        </nav>
    );
}
