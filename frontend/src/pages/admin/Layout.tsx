import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { useTheme } from 'next-themes';
import {
    LayoutDashboard, UtensilsCrossed, Users,
    LayoutGrid, Wallet, Clock, BarChart3, UserCircle, Store, Moon, ChevronRight,
    Menu, X, PanelLeftClose, PanelLeftOpen
} from 'lucide-react';
import { authService } from '@/features/auth/api/authService';
import { userService } from '@/features/users/api/userService';
import type { User } from '@/features/users/types';
import { cn } from '@/lib/utils';
import sophramLogo from '@/assets/sophram-logo-yazisiz.svg';

const navItems = [
    { to: '/admin/overview', icon: LayoutDashboard, label: 'Genel Bakış' },
    { to: '/admin/staff', icon: Users, label: 'Çalışanlar' },
    { to: '/admin/tables', icon: LayoutGrid, label: 'Masalar' },
    { to: '/admin/menu', icon: UtensilsCrossed, label: 'Menü' },
    { to: '/admin/cash-registers', icon: Wallet, label: 'Kasalar' },
    { to: '/admin/shifts', icon: Clock, label: 'Vardiyalar' },
    { to: '/admin/reports', icon: BarChart3, label: 'Raporlar' },
    { to: '/admin/restaurant', icon: Store, label: 'Restoran' },
    { to: '/admin/profile', icon: UserCircle, label: 'Profil' },
];

export default function AdminLayout() {
    const { theme, setTheme } = useTheme();
    const isDark = theme === 'dark';
    const navigate = useNavigate();

    const [restaurantName, setRestaurantName] = useState('');
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [hoverTip, setHoverTip] = useState<{ label: string; top: number } | null>(null);
    const asideRef = useRef<HTMLElement>(null);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) return;

        userService.getCurrentUser()
            .then(u => { setCurrentUser(u); setRestaurantName(u.restaurantName ?? ''); })
            .catch(() => {});
    }, []);

    const handleLogout = () => {
        authService.logout();
        navigate('/login');
    };

    const initials = currentUser?.fullName
        ?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() ?? 'A';

    const displayName = currentUser?.fullName ?? 'Admin';

    return (
        <div className="flex h-screen bg-background">
            {/* Mobil üst bar */}
            <div className="md:hidden fixed top-0 inset-x-0 z-40 h-14 flex items-center justify-between px-4 bg-sidebar border-b border-white/10">
                <button onClick={() => setMobileOpen(true)} className="text-sidebar-foreground/70 hover:text-sidebar-foreground p-1">
                    <Menu className="w-5 h-5" />
                </button>
                <img src={sophramLogo} alt="Sophram" className="h-8 w-auto" />
                <span className="w-7" />
            </div>

            {/* Mobil arkaplan */}
            {mobileOpen && (
                <div
                    className="md:hidden fixed inset-0 z-40 bg-black/50 animate-in fade-in duration-200"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            <aside
                ref={asideRef}
                className={cn(
                    "fixed md:relative inset-y-0 left-0 z-50 flex flex-col bg-sidebar transition-all duration-300 ease-in-out",
                    "w-64",
                    collapsed ? "md:w-20" : "md:w-52",
                    mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
                )}
            >
                {/* Logo */}
                <div className="relative flex h-28 shrink-0 items-center justify-center px-5">
                    <img src={sophramLogo} alt="Sophram" className={cn("h-18 w-auto shrink-0 transition-all duration-300", collapsed && "md:h-10")} />
                    <button
                        onClick={() => setMobileOpen(false)}
                        className="md:hidden absolute right-4 top-1/2 -translate-y-1/2 text-sidebar-foreground/60 hover:text-sidebar-foreground"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Nav */}
                <nav className="sidebar-nav-scroll flex-1 px-3 py-2 space-y-0.5 overflow-y-auto overflow-x-hidden">
                    {navItems.map(({ to, icon: Icon, label }) => (
                        <NavLink
                            key={to}
                            to={to}
                            onClick={() => setMobileOpen(false)}
                            onMouseEnter={e => {
                                if (!collapsed || !asideRef.current) return;
                                const asideTop = asideRef.current.getBoundingClientRect().top;
                                const rect = e.currentTarget.getBoundingClientRect();
                                setHoverTip({ label, top: rect.top - asideTop + rect.height / 2 });
                            }}
                            onMouseLeave={() => setHoverTip(null)}
                            className={({ isActive }) =>
                                cn(
                                    'group relative flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors',
                                    collapsed && 'md:justify-center md:px-2',
                                    isActive
                                        ? 'bg-white/10 text-sidebar-foreground'
                                        : 'text-sidebar-foreground/40 hover:text-sidebar-foreground/70'
                                )
                            }
                        >
                            {({ isActive }) => (
                                <>
                                    <Icon className={cn(
                                        'w-4 h-4 shrink-0 transition-transform duration-200',
                                        isActive ? 'text-rb-amber' : 'text-sidebar-foreground/30',
                                        collapsed && 'md:group-hover:scale-125'
                                    )} />
                                    <span className={cn(collapsed && 'md:hidden')}>{label}</span>
                                </>
                            )}
                        </NavLink>
                    ))}
                </nav>

                {/* Daraltılmışken hover tooltip'i — nav'ın scroll clip'inden kaçması için aside seviyesinde, JS ile konumlanıyor */}
                {collapsed && hoverTip && (
                    <div
                        className="pointer-events-none absolute z-50 hidden -translate-y-1/2 whitespace-nowrap rounded-md border border-white/10 bg-[#1c1712] px-2.5 py-1.5 text-xs font-medium text-sidebar-foreground shadow-lg md:block"
                        style={{ top: hoverTip.top, left: 84 }}
                    >
                        {hoverTip.label}
                    </div>
                )}

                {/* Bottom */}
                <div className={cn("px-4 py-4 border-t border-white/10 space-y-3", collapsed && "md:px-2")}>
                    <div className={cn("flex items-center gap-2", collapsed && "md:justify-center")}>
                        <span className="w-2 h-2 rounded-full bg-rb-green shrink-0" />
                        <div className={cn("min-w-0", collapsed && "md:hidden")}>
                            <p className="text-sidebar-foreground font-serif font-bold text-base leading-none truncate">
                                {restaurantName || 'Sophram'}
                            </p>
                            <p className="text-rb-amber text-[10px] font-semibold tracking-widest uppercase mt-0.5">
                                Admin
                            </p>
                        </div>
                    </div>

                    <div className={cn("flex items-center", collapsed ? "md:justify-center" : "justify-between")}>
                        <div className={cn("flex items-center gap-2 text-sidebar-foreground/70 text-sm", collapsed && "md:hidden")}>
                            <Moon className="w-4 h-4" />
                            Koyu Tema
                        </div>
                        <button
                            onClick={() => setTheme(isDark ? 'light' : 'dark')}
                            className={cn(
                                'relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 focus:outline-none shrink-0',
                                isDark ? 'bg-rb-accent' : 'bg-gray-600'
                            )}
                        >
                            <span className={cn(
                                'inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform duration-200',
                                isDark ? 'translate-x-4' : 'translate-x-0.5'
                            )} />
                        </button>
                    </div>

                    <button
                        onClick={handleLogout}
                        className={cn(
                            "flex items-center gap-2.5 w-full rounded-xl bg-white/5 hover:bg-white/10 px-3 py-2.5 transition-colors",
                            collapsed && "md:justify-center md:px-0"
                        )}
                        title="Çıkış Yap"
                    >
                        <div className="w-8 h-8 rounded-full bg-rb-amber flex items-center justify-center shrink-0">
                            <span className="text-white text-sm font-bold">{initials}</span>
                        </div>
                        <div className={cn("flex-1 min-w-0 text-left", collapsed && "md:hidden")}>
                            <p className="text-sidebar-foreground text-sm font-medium truncate">{displayName}</p>
                            <p className="text-sidebar-foreground/40 text-xs truncate">{currentUser?.email}</p>
                        </div>
                        <ChevronRight className={cn("w-4 h-4 text-sidebar-foreground/30 shrink-0", collapsed && "md:hidden")} />
                    </button>
                </div>
            </aside>

            <main className="flex-1 overflow-auto p-6 pt-20 md:pt-6">
                <button
                    onClick={() => setCollapsed(v => !v)}
                    className="hidden md:flex items-center justify-center w-8 h-8 mb-4 -ml-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    title={collapsed ? 'Menüyü genişlet' : 'Menüyü daralt'}
                >
                    {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
                </button>
                <Outlet />
            </main>
        </div>
    );
}
