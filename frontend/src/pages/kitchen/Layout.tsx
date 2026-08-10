import { Outlet, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { authService } from '@/features/auth/api/authService';
import { userService } from '@/features/users/api/userService';
import HeaderClock from '@/components/layout/HeaderClock';
import HeaderThemeToggle from '@/components/layout/HeaderThemeToggle';
import HeaderLogoutButton from '@/components/layout/HeaderLogoutButton';
import sophramLogo from '@/assets/sophram-logo-yan.svg';

export default function KitchenLayout() {
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
        <div className="min-h-screen bg-background flex flex-col">
            <header className="min-h-14 bg-sidebar flex items-center justify-between px-5 py-2 shrink-0 z-10">
                {/* Sol: Logo + İsim + Rol */}
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-0">
                        <img src={sophramLogo} alt="Sophram" className="h-18 w-auto shrink-0" />
                    </div>

                    <div className="w-px h-6.5 bg-white/10 shrink-0" />

                    <div className="flex items-center gap-1.5">
                        <span className="w-1.75 h-1.75 rounded-full bg-rb-green shrink-0" style={{ boxShadow: '0 0 0 3px rgba(69,200,122,0.15)' }} />
                        <div>
                            <p className="text-sidebar-foreground font-serif font-bold text-base leading-none">
                                {restaurantName || 'Sophram'}
                            </p>
                            <p className="text-rb-amber text-[10px] font-semibold tracking-widest uppercase mt-0.5">
                                Mutfak
                            </p>
                        </div>
                    </div>
                </div>

                {/* Orta: canlı sayaçlar */}
                <div className="flex items-center gap-0.5" id="kitchen-stats-slot" />

                {/* Sağ: saat + tema + çıkış */}
                <div className="flex items-center gap-3">
                    <HeaderClock />
                    <div className="w-px h-6.5 bg-white/10 shrink-0" />
                    <HeaderThemeToggle />
                    <HeaderLogoutButton onClick={handleLogout} />
                </div>
            </header>

            <div className="flex-1 overflow-hidden flex flex-col">
                <Outlet />
            </div>
        </div>
    );
}
