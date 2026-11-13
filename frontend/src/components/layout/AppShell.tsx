import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
    LayoutDashboard, UtensilsCrossed, Users, LayoutGrid, Wallet, Clock, BarChart3, UserCircle, Store,
    UserCog, Palette, History, CalendarCheck, Globe, Menu, X, PanelLeftClose, PanelLeftOpen,
} from 'lucide-react';
import { authService } from '@/features/auth/api/authService';
import { userService } from '@/features/users/api/userService';
import { branchService } from '@/features/branches/api/branchService';
import type { User } from '@/features/users/types';
import type { Branch } from '@/features/branches/types';
import { getSession } from '@/lib/auth';
import { cn } from '@/lib/utils';
import sophramLogo from '@/assets/sophram-logo-yazisiz.svg';
import BranchSwitcher from './BranchSwitcher';
import QuickAccessPanel from './QuickAccessPanel';
import OverdueAlerts from './OverdueAlerts';
import BillRequestAlerts from './BillRequestAlerts';
import HeaderThemeToggle from './HeaderThemeToggle';
import HeaderLogoutButton from './HeaderLogoutButton';

interface NavItem { to: string; icon: LucideIcon; label: string; }
interface NavGroup { label?: string; items: NavItem[]; }

// Şube modu: Admin ve (bir şube seçmiş) Owner aynı menüyü görür.
const branchNav: NavItem[] = [
    { to: '/admin/overview', icon: LayoutDashboard, label: 'Genel Bakış' },
    { to: '/admin/staff', icon: Users, label: 'Kullanıcılar' },
    { to: '/admin/tables', icon: LayoutGrid, label: 'Masalar' },
    { to: '/admin/menu', icon: UtensilsCrossed, label: 'Menü' },
    { to: '/admin/reservations', icon: CalendarCheck, label: 'Rezervasyonlar' },
    { to: '/admin/cash-registers', icon: Wallet, label: 'Kasalar' },
    { to: '/admin/shifts', icon: Clock, label: 'Vardiyalar' },
    { to: '/admin/reports', icon: BarChart3, label: 'Raporlar' },
    { to: '/admin/restaurant', icon: Store, label: 'Restoran' },
    { to: '/admin/site', icon: Globe, label: 'Restoran sitesi' },
    { to: '/admin/profile', icon: UserCircle, label: 'Profil' },
];

// Owner'a şube modunda ek olarak açılan şirket sayfaları.
const ownerExtrasInBranch: NavItem[] = [
    { to: '/admin/admins', icon: UserCog, label: 'Yöneticiler' },
    { to: '/admin/branding', icon: Palette, label: 'Marka Ayarları' },
    { to: '/admin/audit-log', icon: History, label: 'Denetim Kaydı' },
];

// "Tümü" modu: yalnızca şirket geneli sayfalar; şubeye ait ekranlar (menü, masa, kasa, personel) saklanır.
const companyNav: NavItem[] = [
    { to: '/owner/overview', icon: LayoutDashboard, label: 'Şirket Genel Bakış' },
    { to: '/owner/admins', icon: UserCog, label: 'Yöneticiler' },
    { to: '/owner/branding', icon: Palette, label: 'Marka Ayarları' },
    { to: '/owner/reports', icon: BarChart3, label: 'Finansal Rapor' },
    { to: '/owner/audit-log', icon: History, label: 'Denetim Kaydı' },
];

export default function AppShell() {
    const navigate = useNavigate();

    const session = getSession();
    const isOwner = session?.role === 'Owner';
    const companyMode = session?.isCompanyScope ?? false;

    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [hoverTip, setHoverTip] = useState<{ label: string; top: number } | null>(null);
    const asideRef = useRef<HTMLElement>(null);

    useEffect(() => {
        userService.getCurrentUser().then(setCurrentUser).catch(() => {});
        branchService.getMyBranches().then(setBranches).catch(() => {});
    }, []);

    const handleLogout = () => {
        authService.logout();
        navigate('/login');
    };

    const groups: NavGroup[] = companyMode
        ? [{ items: companyNav }]
        : isOwner
            ? [{ items: branchNav }, { label: 'ŞİRKET', items: ownerExtrasInBranch }]
            : [{ items: branchNav }];

    const accentText = isOwner ? 'text-rb-gold' : 'text-rb-amber';
    const roleLabel = isOwner ? 'Sahip' : 'Yönetici';
    const initials = currentUser?.fullName
        ?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() ?? (isOwner ? 'O' : 'A');
    const displayName = currentUser?.fullName ?? roleLabel;

    return (
        <div className="flex h-screen bg-background">
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
                <div className="relative flex h-20 shrink-0 items-center justify-center px-5">
                    <img src={sophramLogo} alt="Sophram" className={cn("h-14 w-auto shrink-0 transition-all duration-300", collapsed && "md:h-10")} />
                    <button
                        onClick={() => setMobileOpen(false)}
                        aria-label="Menüyü kapat"
                        className="md:hidden absolute right-4 top-1/2 -translate-y-1/2 text-sidebar-foreground/60 hover:text-sidebar-foreground"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Nav */}
                <nav className="sidebar-nav-scroll flex-1 px-3 py-2 space-y-0.5 overflow-y-auto overflow-x-hidden">
                    {groups.map((group, gi) => (
                        <div key={group.label ?? gi} className="space-y-0.5">
                            {group.label && (
                                <div className={cn("flex items-center gap-2 px-3 pt-3 pb-1", collapsed && "md:justify-center md:px-0")}>
                                    <span className={cn("text-[10px] font-semibold tracking-[0.2em] text-rb-gold", collapsed && "md:hidden")}>{group.label}</span>
                                    <span className="flex-1 h-px bg-white/10" />
                                </div>
                            )}
                            {group.items.map(({ to, icon: Icon, label }) => (
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
                                                : 'text-sidebar-foreground/65 hover:text-sidebar-foreground/90'
                                        )
                                    }
                                >
                                    {({ isActive }) => (
                                        <>
                                            <Icon className={cn(
                                                'w-4 h-4 shrink-0 transition-transform duration-200',
                                                isActive ? accentText : 'text-sidebar-foreground/55',
                                                collapsed && 'md:group-hover:scale-125'
                                            )} />
                                            <span className={cn(collapsed && 'md:hidden')}>{label}</span>
                                        </>
                                    )}
                                </NavLink>
                            ))}
                        </div>
                    ))}

                    {companyMode && (
                        <p className={cn("mx-3 mt-4 rounded-lg bg-white/5 px-2.5 py-2 text-[11px] leading-relaxed text-sidebar-foreground/50", collapsed && "md:hidden")}>
                            Menü, masa, kasa ve personel için bir şube seçin.
                        </p>
                    )}
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

                {/* Bottom: şube, tema, profil ve çıkış üst bara taşındı; burada yalnızca daraltma kaldı */}
                <div className={cn("hidden md:block px-3 py-4 border-t border-white/10", collapsed && "md:px-2")}>
                    <button
                        type="button"
                        onClick={() => setCollapsed(v => !v)}
                        aria-label={collapsed ? 'Menüyü genişlet' : 'Menüyü daralt'}
                        title={collapsed ? 'Menüyü genişlet' : 'Menüyü daralt'}
                        className={cn(
                            "hidden md:flex h-10 items-center gap-2.5 w-full rounded-xl px-3 text-sm font-medium text-sidebar-foreground/70 hover:bg-white/10 hover:text-sidebar-foreground transition-colors",
                            collapsed && "md:justify-center md:px-0"
                        )}
                    >
                        {collapsed ? <PanelLeftOpen className="w-4 h-4 shrink-0" /> : <PanelLeftClose className="w-4 h-4 shrink-0" />}
                        <span className={cn(collapsed && "md:hidden")}>Menüyü daralt</span>
                    </button>
                </div>
            </aside>

            <div className="flex flex-1 min-w-0 flex-col">
                {/* Üst bar: şube seçici solda; tema, profil ve çıkış sağda */}
                <header className="flex h-14 md:h-16 shrink-0 items-center gap-2 sm:gap-3 border-b border-white/10 bg-sidebar px-3 sm:px-5">
                    <button
                        onClick={() => setMobileOpen(true)}
                        aria-label="Menüyü aç"
                        className="md:hidden flex h-11 w-11 -ml-2 shrink-0 items-center justify-center text-sidebar-foreground/70 hover:text-sidebar-foreground"
                    >
                        <Menu className="w-5 h-5" />
                    </button>

                    <div className="min-w-0 w-full max-w-60">
                        <BranchSwitcher
                            branches={branches}
                            isOwner={isOwner}
                            companyMode={companyMode}
                            activeBranchId={companyMode ? null : (session?.restaurantId ?? null)}
                            activeBranchName={currentUser?.branchName ?? currentUser?.restaurantName}
                            collapsed={false}
                        />
                    </div>

                    <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
                        <HeaderThemeToggle />

                        <div className="hidden sm:block w-px h-6.5 bg-white/10 shrink-0" />

                        <button
                            type="button"
                            onClick={() => { if (!companyMode) navigate('/admin/profile'); }}
                            disabled={companyMode}
                            className={cn(
                                "flex items-center gap-2.5 rounded-xl px-1.5 py-1 lg:pr-3 transition-colors",
                                !companyMode && "hover:bg-white/10"
                            )}
                            title={companyMode ? displayName : "Profil"}
                            aria-label={companyMode ? displayName : "Profil"}
                        >
                            <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0", isOwner ? "bg-rb-gold" : "bg-rb-amber")}>
                                <span className={cn("text-sm font-bold", isOwner ? "text-rb-gold-foreground" : "text-rb-amber-foreground")}>{initials}</span>
                            </div>
                            <div className="hidden lg:block min-w-0 max-w-44 text-left">
                                <p className="text-sidebar-foreground text-sm font-medium leading-tight truncate">{displayName}</p>
                                <p className="text-sidebar-foreground/40 text-xs leading-tight truncate">{roleLabel}</p>
                            </div>
                        </button>

                        <HeaderLogoutButton onClick={handleLogout} />
                    </div>
                </header>

                <main className="flex-1 overflow-auto p-6 pb-24 md:pb-6">
                    <Outlet />
                </main>
            </div>

            {!companyMode && <QuickAccessPanel />}
            {!companyMode && <OverdueAlerts />}
            {!companyMode && <BillRequestAlerts actionPath="/admin/tables" />}
        </div>
    );
}
