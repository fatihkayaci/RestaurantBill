import { Outlet, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { authService } from '@/features/auth/api/authService';
import { userService } from '@/features/users/api/userService';
import HeaderClock from '@/components/layout/HeaderClock';
import HeaderThemeToggle from '@/components/layout/HeaderThemeToggle';
import HeaderLogoutButton from '@/components/layout/HeaderLogoutButton';
import sophramLogo from '@/assets/sophram-logo-yan.svg';

export default function WaiterLayout() {
    const navigate = useNavigate();

    const [restaurantName, setRestaurantName] = useState('');

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) { navigate('/login'); return; }

        userService.getCurrentUser()
            .then(u => setRestaurantName(u.restaurantName ?? ''))
            .catch(() => {});
    }, [navigate]);

    const handleLogout = () => {
        authService.logout();
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-[#F1ECE4] dark:bg-background flex flex-col">
            <header className="min-h-16 bg-sidebar flex items-center justify-between gap-3 px-4 sm:px-8 py-2 shrink-0 z-10">
                {/* Sol: Logo + İsim + Rol */}
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <img src={sophramLogo} alt="Sophram" className="h-12 sm:h-18 w-auto shrink-0" />

                    <div className="hidden sm:block w-px h-6.5 bg-white/10 shrink-0" />

                    <div className="flex items-center gap-1.5 min-w-0">
                        <span className="w-2 h-2 rounded-full bg-rb-green shrink-0" style={{ boxShadow: '0 0 0 3px rgba(69,200,122,0.15)' }} />
                        <div className="min-w-0">
                            <p className="text-sidebar-foreground font-serif font-bold text-xl sm:text-2xl leading-tight truncate">
                                {restaurantName || 'Sophram'}
                            </p>
                            <p className="text-rb-amber text-xs font-semibold tracking-widest uppercase mt-0.5">
                                Garson
                            </p>
                        </div>
                    </div>
                </div>

                {/* Sağ: saat + tema + çıkış */}
                <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                    <HeaderClock large />
                    <div className="hidden sm:block w-px h-6.5 bg-white/10 shrink-0" />
                    <HeaderThemeToggle large />
                    <HeaderLogoutButton onClick={handleLogout} large />
                </div>
            </header>

            <div className="flex-1 overflow-auto">
                <Outlet />
            </div>
        </div>
    );
}
