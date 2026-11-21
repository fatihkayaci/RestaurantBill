import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState, type FocusEvent, type MouseEvent } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
    House, UtensilsCrossed, Users, LayoutGrid, Wallet, Clock, BarChart3, Settings, Briefcase,
    UserCog, Palette, History, CalendarCheck, Globe, Menu, X, PanelLeftClose, PanelLeftOpen, Layers, Bike, MessageSquareText, ChevronDown, Trash2, Landmark,
} from 'lucide-react';
import { authService } from '@/features/auth/api/authService';
import { userService } from '@/features/users/api/userService';
import { isSingleBranchOwner, useMyBranches } from '@/features/branches/useMyBranches';
import type { User } from '@/features/users/types';
import { getSession, startSession } from '@/lib/auth';
import { cn } from '@/lib/utils';
import sophramLogo from '@/assets/sophram-logo-yazisiz.svg';
import BranchSwitcher from './BranchSwitcher';
import QuickAccessPanel from './QuickAccessPanel';
import OverdueAlerts from './OverdueAlerts';
import BillRequestAlerts from './BillRequestAlerts';
import WaiterCallAlerts from './WaiterCallAlerts';
import OrderRequestAlerts from './OrderRequestAlerts';
import CustomerActivityAlerts from './CustomerActivityAlerts';
import StaffSoundToggle from './StaffSoundToggle';
import OnlineOrderAlerts from './OnlineOrderAlerts';
import HeaderThemeToggle from './HeaderThemeToggle';
import HeaderLogoutButton from './HeaderLogoutButton';
import HeaderUserMenu from './HeaderUserMenu';
import { useUnreadContactMessages } from './useUnreadContactMessages';
import { useSiteHasDraft } from '@/features/customerSite/siteDraftStatus';
import { useIsDesktop, useSidebarGroups } from './useSidebarGroups';

// badge: menü öğesinin yanında sayaç gösterilecekse hangi sayaç; dot: turuncu nokta (sitede yayınlanmamış taslak).
interface NavItem { to: string; icon: LucideIcon; label: string; badge?: 'unreadContactMessages'; dot?: 'siteDraft'; }
// Başlığı açılır/kapanır bir düğme olan bölüm (akordeon).
interface NavSection { key: string; label: string; icon: LucideIcon; items: NavItem[]; }

// Şube modu: Admin ve (bir şube seçmiş) Owner aynı menüyü görür.
// Profil listede yok: kenar çubuğunun altındaki kullanıcı satırında ve üst bardaki kullanıcı düğmesinde duruyor.
const branchTop: NavItem[] = [
    { to: '/admin/overview', icon: House, label: 'Genel Bakış' },
];

const branchSections: NavSection[] = [
    { key: 'operasyon', label: 'Operasyon', icon: LayoutGrid, items: [
        { to: '/admin/tables', icon: LayoutGrid, label: 'Masalar' },
        { to: '/admin/reservations', icon: CalendarCheck, label: 'Rezervasyonlar' },
        { to: '/admin/online-orders', icon: Bike, label: 'Online siparişler' },
        { to: '/admin/cash-registers', icon: Wallet, label: 'Kasalar' },
        { to: '/admin/shifts', icon: Clock, label: 'Vardiyalar' },
        // Şube modunda yalnız bu şubenin mesajları; bütün şubeler sahibin "Tümü" menüsünde.
        { to: '/admin/contact-messages', icon: MessageSquareText, label: 'Şikayet ve Öneriler', badge: 'unreadContactMessages' },
    ] },
    { key: 'menu', label: 'Menü', icon: UtensilsCrossed, items: [
        { to: '/admin/menu', icon: UtensilsCrossed, label: 'Yemeklerimiz' },
        { to: '/admin/set-menus', icon: Layers, label: 'Set menüler' },
    ] },
    { key: 'yonetim', label: 'Yönetim', icon: Briefcase, items: [
        { to: '/admin/staff', icon: Users, label: 'Çalışanlar' },
        { to: '/admin/reports', icon: BarChart3, label: 'Raporlar' },
        { to: '/admin/settings', icon: Settings, label: 'Ayarlar' },
    ] },
];

// Tek şubeli sahip: "Tümü" ayrımı yok; şube menüsüne şirket sayfaları eklenir (tek birleşik menü, şube kapsamında).
// Şirket Genel Bakış yerine şubenin Genel Bakış'ı, Finansal Rapor yerine Raporlar (tek şubede aynı veri),
// Şikayet ve Öneriler bir kez (şubenin mesajları = bütün mesajlar). Şube eklemek için şube seçicideki "Şubeleri yönet".
const singleBranchSections: NavSection[] = [
    ...branchSections.map(section => (section.key === 'yonetim'
        ? { ...section, items: [
            { to: '/admin/staff', icon: Users, label: 'Çalışanlar' },
            { to: '/admin/admins', icon: UserCog, label: 'Yöneticiler' },
            { to: '/admin/reports', icon: BarChart3, label: 'Raporlar' },
            { to: '/admin/settings', icon: Settings, label: 'Ayarlar' },
        ] }
        : section)),
    { key: 'sirket', label: 'Şirket', icon: Landmark, items: [
        { to: '/owner/site', icon: Globe, label: 'Restoran sitesi', dot: 'siteDraft' },
        { to: '/admin/branding', icon: Palette, label: 'Marka Ayarları' },
        { to: '/admin/audit-log', icon: History, label: 'Denetim Kaydı' },
        { to: '/owner/data', icon: Trash2, label: 'Verileri sil' },
    ] },
];

// "Tümü" modu: yalnızca şirket geneli sayfalar, bölümsüz düz liste; şubeye ait ekranlar saklanır.
const companyTop: NavItem[] = [
    { to: '/owner/overview', icon: House, label: 'Şirket Genel Bakış' },
    { to: '/owner/admins', icon: UserCog, label: 'Yöneticiler' },
    { to: '/owner/branding', icon: Palette, label: 'Marka Ayarları' },
    { to: '/owner/reports', icon: BarChart3, label: 'Finansal Rapor' },
    { to: '/owner/audit-log', icon: History, label: 'Denetim Kaydı' },
    // Restoran sitesi şirket genelidir (tek site); mesajlar bütün şubelerden.
    { to: '/owner/site', icon: Globe, label: 'Restoran sitesi', dot: 'siteDraft' },
    { to: '/owner/contact-messages', icon: MessageSquareText, label: 'Şikayet ve Öneriler', badge: 'unreadContactMessages' },
    { to: '/owner/data', icon: Trash2, label: 'Verileri sil' },
];

const focusRing = 'outline-none focus-visible:ring-2 focus-visible:ring-ring';

export default function AppShell() {
    const navigate = useNavigate();
    const { pathname } = useLocation();

    const session = getSession();
    const isOwner = session?.role === 'Owner';
    const companyMode = session?.isCompanyScope ?? false;

    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const branchList = useMyBranches();
    const branches = branchList ?? [];
    // Tek şubeli sahip: "Tümü" yok, birleşik menü (singleBranchSections).
    const singleBranch = isSingleBranchOwner(session?.role, branchList);
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [hoverTip, setHoverTip] = useState<{ label: string; top: number } | null>(null);
    const asideRef = useRef<HTMLElement>(null);
    // Sayaç her iki modda da: şube modunda o şubenin, "Tümü" modunda bütün şubelerin okunmamış mesajları.
    const unreadContactMessages = useUnreadContactMessages(true);
    const badgeCount = (badge: NavItem['badge']) => (badge === 'unreadContactMessages' ? unreadContactMessages : 0);
    const siteHasDraft = useSiteHasDraft(isOwner && (companyMode || singleBranch));
    const hasDot = (dot: NavItem['dot']) => dot === 'siteDraft' && siteHasDraft;
    const draftDot = <span aria-label="Yayınlanmamış değişiklik var" title="Yayınlanmamış değişiklik var" className="ml-auto h-2 w-2 shrink-0 rounded-full bg-[#E0952A]" />;

    useEffect(() => {
        userService.getCurrentUser().then(setCurrentUser).catch(() => {});
    }, []);

    // Tek şubeli sahip "Tümü" modunda kalmaz (ör. ikinci şubeyi sildi): o şubeye geçilir. Aynı adres yeniden açılır;
    // /owner sayfaları gerekirse şube panelindeki karşılığına yönlenir (OwnerCompanyRoute).
    const autoSwitching = useRef(false);
    const singleBranchId = singleBranch ? branches[0].id : null;
    useEffect(() => {
        if (!companyMode || !singleBranchId || autoSwitching.current) return;
        autoSwitching.current = true;
        authService.switchBranch(singleBranchId)
            .then(token => {
                startSession(token);
                // Token kapsamı değişti: SignalR bağlantıları ve sayfa cache'leri yeni şube için sıfırdan kurulsun.
                window.location.assign(`${window.location.pathname}${window.location.search}`);
            })
            .catch(() => { autoSwitching.current = false; });
    }, [companyMode, singleBranchId]);

    const handleLogout = () => {
        authService.logout();
        navigate('/login');
    };

    const topItems = companyMode ? companyTop : branchTop;
    // Çok şubede şirket sayfaları (Yöneticiler, Marka Ayarları, Denetim Kaydı) yalnız "Tümü" modunda: şubeye ait değiller.
    // Tek şubede şube menüsüyle birleşir.
    const sections: NavSection[] = companyMode ? [] : (singleBranch ? singleBranchSections : branchSections);

    // Aktif rotayı içeren bölüm: kullanıcı kapalı bir bölüme girince açılır.
    const isActivePath = (to: string) => pathname === to || pathname.startsWith(`${to}/`);
    const activeSectionKey = sections.find(s => s.items.some(i => isActivePath(i.to)))?.key;
    const { isOpen: isSectionOpen, toggle: toggleSection } = useSidebarGroups(session?.userId ?? null, activeSectionKey);
    const isDesktop = useIsDesktop();
    // Daraltılmış ikon modu yalnızca masaüstünde; mobil çekmece her zaman tam düzen.
    const iconOnly = collapsed && isDesktop;

    const showTip = (label: string) => (e: MouseEvent<HTMLElement> | FocusEvent<HTMLElement>) => {
        if (!iconOnly || !asideRef.current) return;
        const asideTop = asideRef.current.getBoundingClientRect().top;
        const rect = e.currentTarget.getBoundingClientRect();
        setHoverTip({ label, top: rect.top - asideTop + rect.height / 2 });
    };
    const tipHandlers = (label: string) => ({
        onMouseEnter: showTip(label),
        onMouseLeave: () => setHoverTip(null),
        onFocus: showTip(label),
        onBlur: () => setHoverTip(null),
    });

    const roleLabel = isOwner ? 'Sahip' : 'Yönetici';
    const initials = currentUser?.fullName
        ?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() ?? (isOwner ? 'O' : 'A');
    const displayName = currentUser?.fullName ?? roleLabel;
    const avatarColors = isOwner ? 'bg-rb-gold text-rb-gold-foreground' : 'bg-rb-amber text-rb-amber-foreground';

    const countBadge = (count: number, onGold = false) => (
        <span
            aria-label={`${count} okunmamış`}
            className={cn(
                'ml-auto inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 text-xs font-bold tabular-nums',
                onGold ? 'bg-rb-gold-foreground text-rb-gold' : 'bg-rb-gold text-rb-gold-foreground'
            )}
        >
            {count > 99 ? '99+' : count}
        </span>
    );
    const unreadDot = <span aria-hidden="true" className="absolute right-2 top-1.5 h-2 w-2 rounded-full bg-rb-gold" />;

    // Daraltılmış modda tek öğe: ortalı ikon, tooltip, okunmamışsa nokta.
    const renderIconItem = ({ to, icon: Icon, label, badge, dot }: NavItem) => {
        const count = badgeCount(badge);
        return (
            <NavLink
                key={to}
                to={to}
                aria-label={count > 0 ? `${label}, ${count} okunmamış` : label}
                {...tipHandlers(label)}
                className={({ isActive }) => cn(
                    'group relative flex h-10 items-center justify-center rounded-lg transition-colors',
                    focusRing,
                    isActive ? 'bg-white/10 text-rb-gold' : 'text-sidebar-foreground/60 hover:bg-white/5 hover:text-sidebar-foreground'
                )}
            >
                <Icon aria-hidden="true" className="h-[18px] w-[18px] transition-transform duration-200 group-hover:scale-110 motion-reduce:transition-none" />
                {count > 0 && unreadDot}
                {hasDot(dot) && <span aria-hidden="true" className="absolute right-2 top-1.5 h-2 w-2 rounded-full bg-[#E0952A]" />}
            </NavLink>
        );
    };

    // Üst düzey bağlantı (Genel Bakış, şirket modundaki sayfalar): ikon + etiket.
    const renderTopItem = (item: NavItem) => {
        if (iconOnly) return renderIconItem(item);
        const { to, icon: Icon, label, badge, dot } = item;
        const count = badgeCount(badge);
        return (
            <NavLink
                key={to}
                to={to}
                onClick={() => setMobileOpen(false)}
                aria-label={count > 0 ? `${label}, ${count} okunmamış` : undefined}
                className={({ isActive }) => cn(
                    'flex h-[42px] items-center gap-3 rounded-[10px] px-3 text-sm font-medium transition-colors',
                    focusRing,
                    isActive ? 'bg-rb-gold font-semibold text-rb-gold-foreground' : 'text-[#E8E1D6] hover:bg-white/5 hover:text-white'
                )}
            >
                {({ isActive }) => (
                    <>
                        <Icon aria-hidden="true" className="h-[18px] w-[18px] shrink-0" />
                        <span className="truncate">{label}</span>
                        {count > 0 && countBadge(count, isActive)}
                        {hasDot(dot) && draftDot}
                    </>
                )}
            </NavLink>
        );
    };

    return (
        <div className="flex h-screen bg-background">
            {/* Telefon/tablet (lg altı): kenar çubuğu çekmece; arkaplan */}
            {mobileOpen && (
                <div
                    className="lg:hidden fixed inset-0 z-40 bg-black/50 animate-in fade-in duration-200"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            <aside
                ref={asideRef}
                className={cn(
                    'fixed lg:relative inset-y-0 left-0 z-50 flex max-w-[85vw] flex-col bg-sidebar transition-all duration-300 ease-in-out motion-reduce:transition-none',
                    'w-68',
                    collapsed ? 'lg:w-20' : 'lg:w-68',
                    mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
                )}
            >
                {/* Logo */}
                <div className="relative flex h-20 shrink-0 items-center justify-center px-5">
                    <img src={sophramLogo} alt="Sophram" className={cn('h-14 w-auto shrink-0 transition-all duration-300', collapsed && 'lg:h-10')} />
                    <button
                        onClick={() => setMobileOpen(false)}
                        aria-label="Menüyü kapat"
                        className={cn('lg:hidden absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-md text-sidebar-foreground/60 hover:text-sidebar-foreground', focusRing)}
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <nav aria-label="Yönetim menüsü" className="sidebar-nav-scroll flex-1 overflow-y-auto overflow-x-hidden px-3 pb-2">
                    <div className="space-y-0.5">{topItems.map(renderTopItem)}</div>

                    {sections.length > 0 && (
                        <div className={cn('mt-2.5 flex flex-col', iconOnly ? 'gap-0.5' : 'gap-1')}>
                            {sections.map(section => {
                                // Daraltılmış ikon modu: akordeon yok; bölümler arasında ince ayraç ve tüm sayfa ikonları.
                                if (iconOnly) {
                                    return (
                                        <div key={section.key} role="group" aria-label={section.label} className="space-y-0.5">
                                            <div aria-hidden="true" className="mx-3 my-2 h-px bg-white/10" />
                                            {section.items.map(renderIconItem)}
                                        </div>
                                    );
                                }

                                const open = isSectionOpen(section.key);
                                const active = section.key === activeSectionKey;
                                const sectionBadge = section.items.reduce((sum, item) => sum + badgeCount(item.badge), 0);
                                const panelId = `sidebar-section-${section.key}`;
                                const SectionIcon = section.icon;
                                return (
                                    <div key={section.key} className="flex flex-col">
                                        <button
                                            type="button"
                                            onClick={() => toggleSection(section.key)}
                                            aria-expanded={open}
                                            aria-controls={panelId}
                                            className={cn(
                                                'flex h-11 w-full items-center gap-3 rounded-[10px] px-2.5 text-left text-sm font-semibold transition-colors',
                                                focusRing,
                                                active ? 'bg-white/[0.07] text-white' : 'text-[#E8E1D6] hover:bg-white/5'
                                            )}
                                        >
                                            <span aria-hidden="true" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#2C251F] text-rb-gold">
                                                <SectionIcon className="h-4 w-4" />
                                            </span>
                                            <span className="flex-1 truncate">{section.label}</span>
                                            {!open && sectionBadge > 0 && countBadge(sectionBadge)}
                                            <ChevronDown aria-hidden="true" className={cn(
                                                'h-4 w-4 shrink-0 text-[#9A8F80] transition-transform duration-200 motion-reduce:transition-none',
                                                open && 'rotate-180'
                                            )} />
                                        </button>
                                        {/* Kapalı bölümün öğeleri inert: Tab ile odaklanmaz. */}
                                        <div
                                            id={panelId}
                                            inert={!open}
                                            className={cn(
                                                'grid transition-[grid-template-rows,opacity] duration-200 ease-out motion-reduce:transition-none',
                                                open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                                            )}
                                        >
                                            <div className="min-h-0 overflow-hidden">
                                                <div className="mb-2 ml-[25px] mt-0.5 flex flex-col border-l border-[#3A322B] pl-3">
                                                    {section.items.map(({ to, label, badge, dot }) => {
                                                        const count = badgeCount(badge);
                                                        return (
                                                            <NavLink
                                                                key={to}
                                                                to={to}
                                                                onClick={() => setMobileOpen(false)}
                                                                className={({ isActive }) => cn(
                                                                    'flex h-9 shrink-0 items-center gap-2 rounded-lg px-2.5 text-[13.5px] transition-colors',
                                                                    focusRing,
                                                                    isActive
                                                                        ? 'bg-rb-gold font-semibold text-rb-gold-foreground'
                                                                        : 'text-[#CFC6B8] hover:bg-white/5 hover:text-white'
                                                                )}
                                                            >
                                                                {({ isActive }) => (
                                                                    <>
                                                                        <span className="flex-1 truncate">{label}</span>
                                                                        {count > 0 && countBadge(count, isActive)}
                                                                        {hasDot(dot) && draftDot}
                                                                    </>
                                                                )}
                                                            </NavLink>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {companyMode && (
                        <p className={cn('mx-3 mt-4 rounded-lg bg-white/5 px-2.5 py-2 text-xs leading-relaxed text-sidebar-foreground/60', collapsed && 'lg:hidden')}>
                            Menü, masa, kasa ve personel için bir şube seçin.
                        </p>
                    )}
                </nav>

                {/* Daraltılmışken tooltip — nav'ın scroll clip'inden kaçması için aside seviyesinde, JS ile konumlanıyor */}
                {iconOnly && hoverTip && (
                    <div
                        role="tooltip"
                        className="pointer-events-none absolute z-50 -translate-y-1/2 whitespace-nowrap rounded-md border border-white/10 bg-[#1c1712] px-2.5 py-1.5 text-xs font-medium text-sidebar-foreground shadow-lg"
                        style={{ top: hoverTip.top, left: 84 }}
                    >
                        {hoverTip.label}
                    </div>
                )}

                {/* Alt: kullanıcı satırı (profil) ve daraltma. Şube, tema ve çıkış üst barda. */}
                <div className={cn('flex flex-col gap-0.5 border-t border-[#3A322B] px-3 py-2.5', companyMode && 'hidden lg:flex')}>
                    {!companyMode && (
                        <NavLink
                            to="/admin/profile"
                            onClick={() => setMobileOpen(false)}
                            aria-label={iconOnly ? 'Profil' : undefined}
                            {...tipHandlers('Profil')}
                            className={({ isActive }) => cn(
                                'flex h-[42px] items-center gap-3 rounded-[10px] px-3 text-sm transition-colors',
                                focusRing,
                                iconOnly && 'justify-center px-0',
                                isActive ? 'bg-white/10' : 'hover:bg-white/5'
                            )}
                        >
                            <span aria-hidden="true" className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold', avatarColors)}>
                                {initials}
                            </span>
                            {!iconOnly && (
                                <span className="flex min-w-0 flex-col leading-tight">
                                    <span className="truncate font-semibold text-[#E8E1D6]">{displayName}</span>
                                    <span className="text-xs text-[#9A8F80]">Profil</span>
                                </span>
                            )}
                        </NavLink>
                    )}
                    <button
                        type="button"
                        onClick={() => { setCollapsed(v => !v); setHoverTip(null); }}
                        aria-label={collapsed ? 'Menüyü genişlet' : 'Menüyü daralt'}
                        {...tipHandlers('Menüyü genişlet')}
                        className={cn(
                            'hidden lg:flex h-10 w-full items-center gap-3 rounded-[10px] px-3 text-[13px] text-[#9A8F80] transition-colors hover:bg-white/5 hover:text-sidebar-foreground',
                            focusRing,
                            iconOnly && 'justify-center px-0'
                        )}
                    >
                        {collapsed ? <PanelLeftOpen aria-hidden="true" className="h-4 w-4 shrink-0" /> : <PanelLeftClose aria-hidden="true" className="h-4 w-4 shrink-0" />}
                        {!iconOnly && <span>Menüyü daralt</span>}
                    </button>
                </div>
            </aside>

            <div className="flex flex-1 min-w-0 flex-col">
                {/* Üst bar. Kırılımlar ekran değil barın kendi genişliğine göre (@container): sağ panel açıkken ya da
                    kenar çubuğu daraltılmışken de doğru davranır. Bar genişliği (iç):
                    < @xl (576 px): menü, şube, Paket ve hesap menüsü; sesler, tema, profil, çıkış hesap menüsünde.
                    @xl – @4xl (896 px): ses düğmeleri de açıkta. @4xl+: tema, profil adı ve Çıkış da açıkta, menü yok.
                    @[72rem]+: ses ve tema düğmelerinin yazıları da görünür. */}
                <header className="@container flex h-14 md:h-16 shrink-0 items-center border-b border-white/10 bg-sidebar px-3 sm:px-5">
                    <div className="flex w-full min-w-0 items-center gap-2 @xl:gap-3">
                        <button
                            onClick={() => setMobileOpen(true)}
                            aria-label="Menüyü aç"
                            aria-expanded={mobileOpen}
                            className={cn('lg:hidden flex h-11 w-11 -ml-2 shrink-0 items-center justify-center rounded-lg text-sidebar-foreground/70 hover:text-sidebar-foreground', focusRing)}
                        >
                            <Menu className="w-5 h-5" />
                        </button>

                        <div className="min-w-0 flex-1 max-w-60">
                            <BranchSwitcher
                                branches={branches}
                                isOwner={isOwner}
                                companyMode={companyMode}
                                singleBranch={singleBranch}
                                activeBranchId={companyMode ? null : (session?.restaurantId ?? null)}
                                activeBranchName={currentUser?.branchName ?? currentUser?.restaurantName}
                                collapsed={false}
                                iconClassName="hidden @[22rem]:flex"
                            />
                        </div>

                        <div className="ml-auto flex shrink-0 items-center gap-2 @xl:gap-3">
                            {/* Paket düğmesi hep açıkta (yeni sipariş rozeti); paket sesi düğmesi dar barda hesap menüsünde. */}
                            {!companyMode && <OnlineOrderAlerts boardPath="/admin/online-orders" soundToggleClassName="hidden @xl:flex" />}
                            {!companyMode && (
                                <div className="hidden @xl:flex">
                                    <StaffSoundToggle labelClassName="hidden @[72rem]:inline" />
                                </div>
                            )}

                            <div className="hidden @4xl:flex items-center gap-3">
                                <HeaderThemeToggle labelClassName="hidden @[72rem]:inline" />

                                <div className="w-px h-6.5 bg-white/10 shrink-0" />

                                <button
                                    type="button"
                                    onClick={() => { if (!companyMode) navigate('/admin/profile'); }}
                                    disabled={companyMode}
                                    className={cn(
                                        "flex items-center gap-2.5 rounded-xl px-1.5 py-1 pr-3 transition-colors",
                                        focusRing,
                                        !companyMode && "hover:bg-white/10"
                                    )}
                                    title={companyMode ? displayName : "Profil"}
                                    aria-label={companyMode ? displayName : "Profil"}
                                >
                                    <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0", avatarColors)}>
                                        <span className="text-sm font-bold">{initials}</span>
                                    </div>
                                    <div className="min-w-0 max-w-44 text-left">
                                        <p className="text-sidebar-foreground text-sm font-medium leading-tight truncate">{displayName}</p>
                                        <p className="text-sidebar-foreground/60 text-xs leading-tight truncate">{roleLabel}</p>
                                    </div>
                                </button>

                                <HeaderLogoutButton onClick={handleLogout} />
                            </div>

                            <HeaderUserMenu
                                className="@4xl:hidden"
                                initials={initials}
                                displayName={displayName}
                                roleLabel={roleLabel}
                                avatarClassName={avatarColors}
                                companyMode={companyMode}
                                onProfile={() => navigate('/admin/profile')}
                                onLogout={handleLogout}
                            />
                        </div>
                    </div>
                </header>

                {/* Yeni paket siparişi uyarı şeridinin yeri (OnlineOrderAlerts portal ile yerleştirir). */}
                <div id="online-order-strip-slot" />

                {/* Restoran sitesi düzenleyicisi ekranın tamamını kullanır (kendi kaydırması var). */}
                <main className={cn('flex-1', pathname === '/owner/site' ? 'min-h-0 overflow-hidden' : 'overflow-auto px-4 pt-4 pb-24 sm:px-6 sm:pt-6 lg:pb-6')}>
                    <Outlet />
                </main>
            </div>

            {!companyMode && <QuickAccessPanel />}
            {!companyMode && <OverdueAlerts />}
            {!companyMode && <BillRequestAlerts actionPath="/admin/tables" />}
            {!companyMode && <WaiterCallAlerts variant="manager" />}
            {!companyMode && <OrderRequestAlerts variant="manager" />}
            {!companyMode && <CustomerActivityAlerts variant="manager" />}
        </div>
    );
}
