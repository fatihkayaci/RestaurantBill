import { Outlet, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { authService } from '@/features/auth/api/authService';
import { restaurantService } from '@/features/admin/api/restaurantService';
import { userService } from '@/features/admin/api/userService';
import type { User } from '@/features/admin/types';

export default function WaiterLayout() {
    const { theme, setTheme } = useTheme();
    const isDark = theme === 'dark';
    const navigate = useNavigate();

    const [restaurantName, setRestaurantName] = useState('');
    const [currentUser, setCurrentUser] = useState<User | null>(null);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) { navigate('/login'); return; }

        restaurantService.getMyRestaurant()
            .then(r => setRestaurantName(r.name))
            .catch(() => {});

        userService.getCurrentUser()
            .then(u => setCurrentUser(u))
            .catch(() => {});
    }, [navigate]);

    const handleLogout = () => {
        authService.logout();
        navigate('/login');
    };

    const initials = currentUser?.fullName
        ?.split(' ')
        .map(n => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase() ?? '?';

    const shortName = currentUser?.fullName
        ? (() => {
            const parts = currentUser.fullName.split(' ');
            return parts.length > 1
                ? `${parts[0]} ${parts[parts.length - 1][0]}.`
                : parts[0];
        })()
        : '';

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <header className="h-14 bg-[#1c1917] dark:bg-[#0f0e0d] flex items-center justify-between px-5 shrink-0 z-10">
                {/* Sol: Logo + İsim + Rol */}
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full border-2 border-amber-400 flex items-center justify-center shrink-0">
                        <div className="w-3 h-3 rounded-full border-2 border-amber-400" />
                    </div>
                    <div>
                        <p className="text-white font-serif font-bold text-base leading-none">
                            {restaurantName || 'RestaurantBill'}
                        </p>
                        <p className="text-amber-400 text-[10px] font-semibold tracking-widest uppercase mt-0.5">
                            Garson
                        </p>
                    </div>
                </div>

                {/* Sağ: TR/EN + Dark mode + Kullanıcı */}
                <div className="flex items-center gap-4">
                    {/* Dark mode toggle */}
                    <button
                        onClick={() => setTheme(isDark ? 'light' : 'dark')}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 focus:outline-none ${
                            isDark ? 'bg-blue-500' : 'bg-gray-600'
                        }`}
                    >
                        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform duration-200 ${
                            isDark ? 'translate-x-4' : 'translate-x-0.5'
                        }`} />
                    </button>

                    {/* Kullanıcı */}
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                        title="Çıkış Yap"
                    >
                        <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center shrink-0">
                            <span className="text-white text-xs font-bold">{initials}</span>
                        </div>
                        {shortName && (
                            <span className="text-white text-sm font-medium hidden sm:block">{shortName}</span>
                        )}
                    </button>
                </div>
            </header>

            <div className="flex-1 overflow-auto">
                <Outlet />
            </div>
        </div>
    );
}
