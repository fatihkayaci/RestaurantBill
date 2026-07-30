import { Outlet, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { authService } from '@/features/auth/api/authService';
import { restaurantService } from '@/features/admin/api/restaurantService';

export default function KitchenLayout() {
    const { theme, setTheme } = useTheme();
    const isDark = theme === 'dark';
    const navigate = useNavigate();

    const [restaurantName, setRestaurantName] = useState('');

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) { navigate('/login'); return; }

        restaurantService.getMyRestaurant()
            .then(r => setRestaurantName(r.name))
            .catch(() => {});
    }, [navigate]);

    const handleLogout = () => {
        authService.logout();
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <header className="h-14 bg-sidebar flex items-center justify-between px-5 shrink-0 z-10">
                {/* Sol: Logo + İsim + Rol */}
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full border-2 border-rb-amber flex items-center justify-center shrink-0">
                        <div className="w-3 h-3 rounded-full border-2 border-rb-amber" />
                    </div>
                    <div>
                        <p className="text-sidebar-foreground font-serif font-bold text-base leading-none">
                            {restaurantName || 'RestaurantBill'}
                        </p>
                        <p className="text-rb-amber text-[10px] font-semibold tracking-widest uppercase mt-0.5">
                            Mutfak
                        </p>
                    </div>
                </div>

                {/* Sağ: stats slot + dark mode + çıkış */}
                <div className="flex items-center gap-4">
                    {/* Stats, DashboardPage tarafından portal ile buraya enjekte edilir */}
                    <div id="kitchen-stats-slot" className="flex items-center gap-2" />

                    <button
                        onClick={() => setTheme(isDark ? 'light' : 'dark')}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 focus:outline-none ${isDark ? 'bg-rb-accent' : 'bg-gray-600'}`}
                    >
                        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform duration-200 ${isDark ? 'translate-x-4' : 'translate-x-0.5'}`} />
                    </button>

                    <button
                        onClick={handleLogout}
                        className="text-gray-400 hover:text-sidebar-foreground text-xs transition-colors"
                        title="Çıkış Yap"
                    >
                        Çıkış
                    </button>
                </div>
            </header>

            <div className="flex-1 overflow-hidden flex flex-col">
                <Outlet />
            </div>
        </div>
    );
}
