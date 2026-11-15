import { Outlet, NavLink, Link, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState, type MouseEvent } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
    House, UtensilsCrossed, Users, LayoutGrid, Wallet, Clock, BarChart3, UserCircle, Settings, Briefcase,
    UserCog, Palette, History, CalendarCheck, Globe, Menu, X, Layers, Bike, MessageSquareText, Building2,
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
import WaiterCallAlerts from './WaiterCallAlerts';
import OnlineOrderAlerts from './OnlineOrderAlerts';
import HeaderThemeToggle from './HeaderThemeToggle';
import HeaderLogoutButton from './HeaderLogoutButton';
import { useUnreadContactMessages } from './useUnreadContactMessages';

// badge: menü öğesinin yanında sayaç gösterilecekse hangi sayaç.
interface NavItem { to: string; icon: LucideIcon; label: string; badge?: 'unreadContactMessages'; }
// Şeritteki bir bölüm. Tek sayfalı bölüm doğrudan bağlantıdır; çok sayfalı bölüm açılır panel açar.
interface NavSection { key: string; label: string; short: string; icon: LucideIcon; items: NavItem[]; }

// Şube modu: Admin ve (bir şube seçmiş) Owner aynı menüyü görür.
// Profil listede yok: şeridin altındaki avatar ve üst bardaki kullanıcı düğmesinde duruyor.
const branchSections: NavSection[] = [
    { key: 'genel', label: 'Genel Bakış', short: 'Genel', icon: House, items: [
        { to: '/admin/overview', icon: House, label: 'Genel Bakış' },
    ] },
    { key: 'operasyon', label: 'Operasyon', short: 'Operasyon', icon: LayoutGrid, items: [
        { to: '/admin/tables', icon: LayoutGrid, label: 'Masalar' },
        { to: '/admin/reservations', icon: CalendarCheck, label: 'Rezervasyonlar' },
        { to: '/admin/online-orders', icon: Bike, label: 'Online siparişler' },
        { to: '/admin/cash-registers', icon: Wallet, label: 'Kasalar' },
        { to: '/admin/shifts', icon: Clock, label: 'Vardiyalar' },
    ] },
    { key: 'menu', label: 'Menü', short: 'Menü', icon: UtensilsCrossed, items: [
        { to: '/admin/menu', icon: UtensilsCrossed, label: 'Yemeklerimiz' },
        { to: '/admin/set-menus', icon: Layers, label: 'Set menüler' },
    ] },
    { key: 'musteri', label: 'Müşteri', short: 'Müşteri', icon: MessageSquareText, items: [
        { to: '/admin/contact-messages', icon: MessageSquareText, label: 'Şikayet ve Öneriler', badge: 'unreadContactMessages' },
        { to: '/admin/site', icon: Globe, label: 'Restoran sitesi' },
    ] },
    { key: 'yonetim', label: 'Yönetim', short: 'Yönetim', icon: Briefcase, items: [
        { to: '/admin/staff', icon: Users, label: 'Çalışanlar' },
        { to: '/admin/reports', icon: BarChart3, label: 'Raporlar' },
        { to: '/admin/settings', icon: Settings, label: 'Ayarlar' },
    ] },
];

// Owner'a şube modunda ek olarak açılan şirket sayfaları.
const ownerSectionInBranch: NavSection = { key: 'sirket', label: 'Şirket', short: 'Şirket', icon: Building2, items: [
    { to: '/admin/admins', icon: UserCog, label: 'Yöneticiler' },
    { to: '/admin/branding', icon: Palette, label: 'Marka Ayarları' },
    { to: '/admin/audit-log', icon: History, label: 'Denetim Kaydı' },
] };

// "Tümü" modu: yalnızca şirket geneli sayfalar; şubeye ait ekranlar (menü, masa, kasa, personel) saklanır.
// Az sayfa olduğu için her biri şeritte doğrudan bağlantı (tek öğeli bölüm).
const companySections: NavSection[] = [
    { key: 'c-genel', label: 'Şirket Genel Bakış', short: 'Genel', icon: House, items: [{ to: '/owner/overview', icon: House, label: 'Şirket Genel Bakış' }] },
    { key: 'c-admins', label: 'Yöneticiler', short: 'Yöneticiler', icon: UserCog, items: [{ to: '/owner/admins', icon: UserCog, label: 'Yöneticiler' }] },
    { key: 'c-branding', label: 'Marka Ayarları', short: 'Marka', icon: Palette, items: [{ to: '/owner/branding', icon: Palette, label: 'Marka Ayarları' }] },
    { key: 'c-reports', label: 'Finansal Rapor', short: 'Rapor', icon: BarChart3, items: [{ to: '/owner/reports', icon: BarChart3, label: 'Finansal Rapor' }] },
    { key: 'c-audit', label: 'Denetim Kaydı', short: 'Denetim', icon: History, items: [{ to: '/owner/audit-log', icon: History, label: 'Denetim Kaydı' }] },
];

const focusRing = 'outline-none focus-visible:ring-2 focus-visible:ring-rb-gold/70';
const railItemBase = cn(
    'relative flex h-[58px] w-[60px] shrink-0 flex-col items-center justify-center gap-[5px] rounded-xl text-[10px] font-semibold leading-none transition-colors',
    focusRing,
);
const railItemState = (highlighted: boolean) => highlighted
    ? 'bg-[#2C251F] text-rb-gold'
    : 'text-[#9A8F80] hover:bg-white/5 hover:text-sidebar-foreground';

export default function AppShell() {
    const navigate = useNavigate();
    const { pathname } = useLocation();

    const session = getSession();
    const isOwner = session?.role === 'Owner';
    const companyMode = session?.isCompanyScope ?? false;

    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [mobileOpen, setMobileOpen] = useState(false);
    // Açık panel: hangi bölüm ve şeritteki düğmesine göre dikey konumu. Aynı anda yalnızca bir panel açık.
    const [panel, setPanel] = useState<{ key: string; top: number } | null>(null);
    const [seenPath, setSeenPath] = useState(pathname);
    const panelRef = useRef<HTMLElement>(null);
    const railButtons = useRef<Record<string, HTMLButtonElement | null>>({});
    // "Tümü" modunda şube menüsü yok; sayaç yalnızca şube modunda çekilir.
    const unreadContactMessages = useUnreadContactMessages(!companyMode);
    const badgeCount = (badge: NavItem['badge']) => (badge === 'unreadContactMessages' ? unreadContactMessages : 0);

    // Rota değişince panel ve mobil çekmece kapanır (effect içinde setState yerine render sırasında ayarlama).
    if (seenPath !== pathname) {
        setSeenPath(pathname);
        setPanel(null);
        setMobileOpen(false);
    }

    useEffect(() => {
        userService.getCurrentUser().then(setCurrentUser).catch(() => {});
        branchService.getMyBranches().then(setBranches).catch(() => {});
    }, []);

    // Panel açıkken: dışarı tıklama kapatır; Esc kapatır ve odağı paneli açan şerit düğmesine geri verir.
    const openKey = panel?.key ?? null;
    useEffect(() => {
        if (!openKey) return;
        const onPointerDown = (e: PointerEvent) => {
            const target = e.target as Element | null;
            if (!target || panelRef.current?.contains(target)) return;
            // Şerit düğmeleri kendi tıklamasıyla açar/kapatır/değiştirir.
            if (target.closest('[data-rail-section]')) return;
            setPanel(null);
        };
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key !== 'Escape') return;
            setPanel(null);
            railButtons.current[openKey]?.focus();
        };
        document.addEventListener('pointerdown', onPointerDown);
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('pointerdown', onPointerDown);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [openKey]);

    // Mobil çekmece Esc ile de kapanır.
    useEffect(() => {
        if (!mobileOpen) return;
        const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') setMobileOpen(false); };
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [mobileOpen]);

    const handleLogout = () => {
        authService.logout();
        navigate('/login');
    };

    const sections: NavSection[] = companyMode
        ? companySections
        : isOwner ? [...branchSections, ownerSectionInBranch] : branchSections;

    const isActivePath = (to: string) => pathname === to || pathname.startsWith(`${to}/`);
    const sectionIsActive = (s: NavSection) => s.items.some(i => isActivePath(i.to));
    const sectionBadge = (s: NavSection) => s.items.reduce((sum, i) => sum + badgeCount(i.badge), 0);

    const togglePanel = (section: NavSection) => (e: MouseEvent<HTMLButtonElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        // Panelin tahmini yüksekliği (başlık + satırlar); alt kenardan taşmasın diye yukarı itilir.
        const estimated = 60 + section.items.length * 42;
        const top = Math.max(8, Math.min(rect.top - 8, window.innerHeight - estimated - 8));
        setPanel(prev => (prev?.key === section.key ? null : { key: section.key, top }));
    };

    const roleLabel = isOwner ? 'Sahip' : 'Yönetici';
    const initials = currentUser?.fullName
        ?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() ?? (isOwner ? 'O' : 'A');
    const displayName = currentUser?.fullName ?? roleLabel;
    const avatarColors = isOwner ? 'bg-rb-gold text-rb-gold-foreground' : 'bg-rb-amber text-rb-amber-foreground';

    const countBadge = (count: number, className?: string) => (
        <span
            aria-label={`${count} okunmamış`}
            className={cn('ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#E2531F] px-1.5 text-[11px] font-bold tabular-nums text-white', className)}
        >
            {count > 99 ? '99+' : count}
        </span>
    );

    return (
        <div className="flex h-screen bg-background">
            {/* Masaüstü: dar ikon şeridi. Çok sayfalı bölümler içeriğin üstüne binen panel açar; içerik itilmez. */}
            <aside className="hidden md:flex w-[76px] shrink-0 flex-col items-center bg-[#17130F] py-[18px] z-40">
                <img src={sophramLogo} alt="Sophram" className="mb-3.5 h-10 w-auto shrink-0" />

                <nav aria-label="Bölümler" className="sidebar-nav-scroll flex min-h-0 flex-1 flex-col items-center gap-1.5 overflow-y-auto overflow-x-hidden px-2 py-0.5">
                    {sections.map(section => {
                        const Icon = section.icon;
                        const active = sectionIsActive(section);
                        const hasUnread = sectionBadge(section) > 0;
                        const dot = hasUnread && (
                            <span aria-hidden="true" className="absolute -right-1.5 -top-1 h-[9px] w-[9px] rounded-full border-2 border-[#17130F] bg-[#E2531F]" />
                        );

                        if (section.items.length === 1) {
                            const item = section.items[0];
                            return (
                                <Link
                                    key={section.key}
                                    to={item.to}
                                    aria-current={active ? 'page' : undefined}
                                    aria-label={section.short === item.label ? undefined : item.label}
                                    className={cn(railItemBase, railItemState(active))}
                                >
                                    <span className="relative flex"><Icon aria-hidden="true" className="h-5 w-5" strokeWidth={1.8} />{dot}</span>
                                    <span>{section.short}</span>
                                </Link>
                            );
                        }

                        const open = panel?.key === section.key;
                        const panelId = `rail-panel-${section.key}`;
                        return (
                            <div key={section.key} className="contents">
                                <button
                                    type="button"
                                    ref={el => { railButtons.current[section.key] = el; }}
                                    data-rail-section={section.key}
                                    onClick={togglePanel(section)}
                                    aria-expanded={open}
                                    aria-controls={panelId}
                                    aria-label={hasUnread ? `${section.label}, okunmamış mesaj var` : undefined}
                                    className={cn(railItemBase, railItemState(open || active))}
                                >
                                    <span className="relative flex"><Icon aria-hidden="true" className="h-5 w-5" strokeWidth={1.8} />{dot}</span>
                                    <span>{section.short}</span>
                                </button>

                                {/* DOM'da düğmenin hemen ardından: Tab ile düğmeden panele geçilir. Konum fixed, şeridin sağında. */}
                                {open && panel && (
                                    <nav
                                        ref={panelRef}
                                        id={panelId}
                                        aria-label={section.label}
                                        style={{ top: panel.top, maxHeight: 'calc(100vh - 16px)' }}
                                        className="fixed left-[84px] z-50 flex w-60 flex-col gap-0.5 overflow-y-auto rounded-2xl border border-white/5 bg-[#1F1A16] px-2.5 py-3.5 text-[#E8E1D6] shadow-[0_24px_60px_rgba(20,16,12,0.35)] animate-in fade-in slide-in-from-left-1 duration-150"
                                    >
                                        <span className="px-2.5 pb-2.5 pt-1 text-xs font-semibold uppercase tracking-[0.16em] text-rb-gold">{section.label}</span>
                                        {section.items.map(item => {
                                            const count = badgeCount(item.badge);
                                            const itemActive = isActivePath(item.to);
                                            return (
                                                <Link
                                                    key={item.to}
                                                    to={item.to}
                                                    onClick={() => setPanel(null)}
                                                    aria-current={itemActive ? 'page' : undefined}
                                                    className={cn(
                                                        'flex h-10 shrink-0 items-center gap-2 rounded-[10px] px-3 text-sm transition-colors',
                                                        focusRing,
                                                        itemActive
                                                            ? 'bg-rb-gold font-semibold text-rb-gold-foreground'
                                                            : 'text-[#E8E1D6] hover:bg-white/5 hover:text-white'
                                                    )}
                                                >
                                                    <span className="flex-1">{item.label}</span>
                                                    {count > 0 && countBadge(count)}
                                                </Link>
                                            );
                                        })}
                                    </nav>
                                )}
                            </div>
                        );
                    })}
                </nav>

                {!companyMode && (
                    <Link
                        to="/admin/profile"
                        aria-label="Profil"
                        aria-current={isActivePath('/admin/profile') ? 'page' : undefined}
                        className={cn(
                            'mt-3 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                            avatarColors,
                            isActivePath('/admin/profile') && 'ring-2 ring-rb-gold/60 ring-offset-2 ring-offset-[#17130F]',
                            'outline-none focus-visible:ring-2 focus-visible:ring-rb-gold focus-visible:ring-offset-2 focus-visible:ring-offset-[#17130F]'
                        )}
                    >
                        {initials}
                    </Link>
                )}
            </aside>

            {/* Mobil: hamburger ile açılan çekmece, tüm bölümler başlıklarıyla açık liste */}
            {mobileOpen && (
                <div
                    className="md:hidden fixed inset-0 z-40 bg-black/50 animate-in fade-in duration-200"
                    onClick={() => setMobileOpen(false)}
                />
            )}
            <aside
                aria-label="Menü"
                inert={!mobileOpen}
                className={cn(
                    'md:hidden fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-sidebar transition-transform duration-300 ease-in-out',
                    mobileOpen ? 'translate-x-0' : '-translate-x-full'
                )}
            >
                <div className="relative flex h-20 shrink-0 items-center justify-center px-5">
                    <img src={sophramLogo} alt="Sophram" className="h-14 w-auto shrink-0" />
                    <button
                        onClick={() => setMobileOpen(false)}
                        aria-label="Menüyü kapat"
                        className={cn('absolute right-4 top-1/2 -translate-y-1/2 rounded-md text-sidebar-foreground/60 hover:text-sidebar-foreground', focusRing)}
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <nav aria-label="Sayfalar" className="sidebar-nav-scroll flex-1 overflow-y-auto overflow-x-hidden px-3 py-2">
                    {sections.map(section => (
                        <div key={section.key} className="space-y-0.5">
                            {section.items.length > 1 && (
                                <div className="flex items-center gap-2 px-3 pt-3 pb-1">
                                    <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-rb-gold">{section.label}</span>
                                    <span className="flex-1 h-px bg-white/10" />
                                </div>
                            )}
                            {section.items.map(({ to, icon: Icon, label, badge }) => {
                                const count = badgeCount(badge);
                                return (
                                    <NavLink
                                        key={to}
                                        to={to}
                                        onClick={() => setMobileOpen(false)}
                                        className={({ isActive }) => cn(
                                            'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors',
                                            focusRing,
                                            isActive ? 'bg-white/10 text-sidebar-foreground' : 'text-sidebar-foreground/65 hover:text-sidebar-foreground/90'
                                        )}
                                    >
                                        {({ isActive }) => (
                                            <>
                                                <Icon className={cn('w-4 h-4 shrink-0', isActive ? 'text-rb-gold' : 'text-sidebar-foreground/55')} />
                                                <span>{label}</span>
                                                {count > 0 && countBadge(count)}
                                            </>
                                        )}
                                    </NavLink>
                                );
                            })}
                        </div>
                    ))}

                    {companyMode && (
                        <p className="mx-3 mt-4 rounded-lg bg-white/5 px-2.5 py-2 text-[11px] leading-relaxed text-sidebar-foreground/50">
                            Menü, masa, kasa ve personel için bir şube seçin.
                        </p>
                    )}
                </nav>

                {!companyMode && (
                    <div className="border-t border-white/10 px-3 py-3">
                        <NavLink
                            to="/admin/profile"
                            onClick={() => setMobileOpen(false)}
                            className={({ isActive }) => cn(
                                'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors',
                                focusRing,
                                isActive ? 'bg-white/10 text-sidebar-foreground' : 'text-sidebar-foreground/65 hover:text-sidebar-foreground/90'
                            )}
                        >
                            {({ isActive }) => (
                                <>
                                    <UserCircle className={cn('w-4 h-4 shrink-0', isActive ? 'text-rb-gold' : 'text-sidebar-foreground/55')} />
                                    <span>Profil</span>
                                </>
                            )}
                        </NavLink>
                    </div>
                )}
            </aside>

            <div className="flex flex-1 min-w-0 flex-col">
                {/* Üst bar: şube seçici solda; tema, profil ve çıkış sağda */}
                <header className="flex h-14 md:h-16 shrink-0 items-center gap-2 sm:gap-3 border-b border-white/10 bg-sidebar px-3 sm:px-5">
                    <button
                        onClick={() => setMobileOpen(true)}
                        aria-label="Menüyü aç"
                        aria-expanded={mobileOpen}
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
                        {!companyMode && <OnlineOrderAlerts boardPath="/admin/online-orders" />}
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
            {!companyMode && <WaiterCallAlerts variant="manager" />}
        </div>
    );
}
