import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { LayoutDashboard, Building2, UserCog, CreditCard, Palette, BarChart3, History, Moon, ChevronRight } from 'lucide-react';
import { authService } from '@/features/auth/api/authService';
import { companyService } from '@/features/companies/api/companyService';
import { userService } from '@/features/users/api/userService';
import type { User } from '@/features/users/types';
import { cn } from '@/lib/utils';
import sophramLogo from '@/assets/sophram-logo-yazisiz.svg';

const navItems = [
    { to: '/owner/overview', icon: LayoutDashboard, label: 'Genel Bakış' },
    { to: '/owner/branches', icon: Building2, label: 'Şubeler' },
    { to: '/owner/admins', icon: UserCog, label: 'Adminler' },
    { to: '/owner/membership', icon: CreditCard, label: 'Üyelik & Fatura' },
    { to: '/owner/branding', icon: Palette, label: 'Marka Ayarları' },
    { to: '/owner/reports', icon: BarChart3, label: 'Finansal Rapor' },
    { to: '/owner/audit-log', icon: History, label: 'Denetim Kaydı' },
];

export default function OwnerLayout() {
    const { theme, setTheme } = useTheme();
    const isDark = theme === 'dark';
    const navigate = useNavigate();

    const [restaurantName, setRestaurantName] = useState('');
    const [currentUser, setCurrentUser] = useState<User | null>(null);

    useEffect(() => {
        companyService.getMyCompany()
            .then((company) => setRestaurantName(company.name))
            .catch(() => {});

        userService.getCurrentUser()
            .then(u => setCurrentUser(u))
            .catch(() => {});
    }, []);

    const handleLogout = () => {
        authService.logout();
        navigate('/login');
    };

    const initials = currentUser?.fullName
        ?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() ?? 'O';

    const displayName = currentUser?.fullName ?? 'Owner';

    return (
        <div className="flex h-screen bg-background">
            <aside className="w-52 shrink-0 bg-sidebar flex flex-col">
                {/* Logo */}
                <div className="flex items-center justify-center px-5 py-5">
                    <img src={sophramLogo} alt="Sophram" className="h-18 w-auto shrink-0" />
                </div>

                {/* Nav */}
                <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
                    {navItems.map(({ to, icon: Icon, label }) => (
                        <NavLink
                            key={to}
                            to={to}
                            className={({ isActive }) =>
                                cn(
                                    'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors',
                                    isActive
                                        ? 'bg-white/10 text-sidebar-foreground'
                                        : 'text-sidebar-foreground/40 hover:text-sidebar-foreground/70'
                                )
                            }
                        >
                            {({ isActive }) => (
                                <>
                                    <Icon className={cn('w-4 h-4 shrink-0', isActive ? 'text-rb-gold' : 'text-sidebar-foreground/30')} />
                                    {label}
                                </>
                            )}
                        </NavLink>
                    ))}
                </nav>

                {/* Bottom */}
                <div className="px-4 py-4 border-t border-white/10 space-y-3">
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-rb-green shrink-0" />
                        <div className="min-w-0">
                            <p className="text-sidebar-foreground font-serif font-bold text-base leading-none truncate">
                                {restaurantName || 'Sophram'}
                            </p>
                            <p className="text-rb-gold text-[10px] font-semibold tracking-widest uppercase mt-0.5">
                                Owner
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sidebar-foreground/70 text-sm">
                            <Moon className="w-4 h-4" />
                            Koyu Tema
                        </div>
                        <button
                            onClick={() => setTheme(isDark ? 'light' : 'dark')}
                            className={cn(
                                'relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 focus:outline-none',
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
                        className="flex items-center gap-2.5 w-full rounded-xl bg-white/5 hover:bg-white/10 px-3 py-2.5 transition-colors"
                        title="Çıkış Yap"
                    >
                        <div className="w-8 h-8 rounded-full bg-rb-gold flex items-center justify-center shrink-0">
                            <span className="text-rb-gold-foreground text-sm font-bold">{initials}</span>
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                            <p className="text-sidebar-foreground text-sm font-medium truncate">{displayName}</p>
                            <p className="text-sidebar-foreground/40 text-xs truncate">{currentUser?.email}</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-sidebar-foreground/30 shrink-0" />
                    </button>
                </div>
            </aside>

            <main className="flex-1 overflow-auto p-6">
                <Outlet />
            </main>
        </div>
    );
}
