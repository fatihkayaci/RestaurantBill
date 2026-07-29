import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import {
    LayoutDashboard, UtensilsCrossed, Users,
    LayoutGrid, Wallet, BarChart3, UserCircle, Store
} from 'lucide-react';
import { authService } from '@/features/auth/api/authService';
import { restaurantService } from '@/features/admin/api/restaurantService';
import { userService } from '@/features/admin/api/userService';
import RestaurantSetupForm from '@/features/admin/components/RestaurantSetupForm';
import type { User } from '@/features/admin/types';
import { cn } from '@/lib/utils';

const navItems = [
    { to: '/admin/overview', icon: LayoutDashboard, label: 'Genel Bakış' },
    { to: '/admin/staff', icon: Users, label: 'Çalışanlar' },
    { to: '/admin/tables', icon: LayoutGrid, label: 'Masalar' },
    { to: '/admin/menu', icon: UtensilsCrossed, label: 'Menü' },
    { to: '/admin/cash-registers', icon: Wallet, label: 'Kasalar' },
    { to: '/admin/reports', icon: BarChart3, label: 'Raporlar' },
    { to: '/admin/restaurant', icon: Store, label: 'Restoran' },
    { to: '/admin/profile', icon: UserCircle, label: 'Profil' },
];

export default function AdminLayout() {
    const { theme, setTheme } = useTheme();
    const isDark = theme === 'dark';
    const navigate = useNavigate();

    const [needsSetup, setNeedsSetup] = useState<boolean | null>(null);
    const [restaurantName, setRestaurantName] = useState('');
    const [currentUser, setCurrentUser] = useState<User | null>(null);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            setNeedsSetup(false);
            return;
        }
        restaurantService.getMyRestaurant()
            .then((restaurant) => {
                setRestaurantName(restaurant.name);
                setNeedsSetup(!restaurant.name);
            })
            .catch(() => setNeedsSetup(false));

        userService.getCurrentUser()
            .then(u => setCurrentUser(u))
            .catch(() => {});
    }, []);

    const handleLogout = () => {
        authService.logout();
        navigate('/login');
    };

    const initials = currentUser?.fullName
        ?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() ?? 'A';

    const displayName = currentUser?.fullName ?? 'Admin';

    if (needsSetup === null) return null;
    if (needsSetup) return (
        <RestaurantSetupForm
            onComplete={(name: string) => { setRestaurantName(name); setNeedsSetup(false); }}
        />
    );

    return (
        <div className="flex h-screen bg-background">
            <aside className="w-52 shrink-0 bg-[#1c1917] dark:bg-[#0f0e0d] flex flex-col">
                {/* Logo */}
                <div className="flex items-center gap-3 px-5 py-5">
                    <div className="w-8 h-8 rounded-full border-2 border-amber-400 flex items-center justify-center shrink-0">
                        <div className="w-3 h-3 rounded-full border-2 border-amber-400" />
                    </div>
                    <div>
                        <p className="text-white font-serif font-bold text-base leading-none truncate max-w-25">
                            {restaurantName || 'Restaurant'}
                        </p>
                        <p className="text-amber-400 text-[10px] font-semibold tracking-widest uppercase mt-0.5">
                            Admin
                        </p>
                    </div>
                </div>

                {/* Nav */}
                <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
                    {navItems.map(({ to, label }) => (
                        <NavLink
                            key={to}
                            to={to}
                            className={({ isActive }) =>
                                cn(
                                    'flex items-center gap-2.5 px-3 py-2 rounded text-sm transition-colors',
                                    isActive
                                        ? 'text-white'
                                        : 'text-white/40 hover:text-white/70'
                                )
                            }
                        >
                            {({ isActive }) => (
                                <>
                                    <span className={cn('text-[10px] leading-none', isActive ? 'text-amber-400' : 'text-white/25')}>
                                        {isActive ? '◆' : '○'}
                                    </span>
                                    {label}
                                </>
                            )}
                        </NavLink>
                    ))}
                </nav>

                {/* Bottom */}
                <div className="px-4 py-4 border-t border-white/10 space-y-3">
                    <button
                        onClick={() => setTheme(isDark ? 'light' : 'dark')}
                        className={cn(
                            'relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 focus:outline-none',
                            isDark ? 'bg-blue-500' : 'bg-gray-600'
                        )}
                    >
                        <span className={cn(
                            'inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform duration-200',
                            isDark ? 'translate-x-4' : 'translate-x-0.5'
                        )} />
                    </button>

                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 w-full hover:opacity-80 transition-opacity"
                        title="Çıkış Yap"
                    >
                        <div className="w-7 h-7 rounded-full bg-amber-500 flex items-center justify-center shrink-0">
                            <span className="text-white text-xs font-bold">{initials}</span>
                        </div>
                        <span className="text-white/70 text-sm truncate">{displayName}</span>
                    </button>
                </div>
            </aside>

            <main className="flex-1 overflow-auto p-6">
                <Outlet />
            </main>
        </div>
    );
}
