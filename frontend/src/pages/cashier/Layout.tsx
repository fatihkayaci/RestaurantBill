import { Outlet, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { authService } from '@/features/auth/api/authService';
import { userService } from '@/features/users/api/userService';
import ShiftStartGate from './components/ShiftStartGate';
import EndShiftModal from './components/EndShiftModal';
import HeaderClock from '@/components/layout/HeaderClock';
import HeaderThemeToggle from '@/components/layout/HeaderThemeToggle';
import HeaderLogoutButton from '@/components/layout/HeaderLogoutButton';
import sophramLogo from '@/assets/sophram-logo-yan.svg';

export default function CashierLayout() {
    const navigate = useNavigate();

    const [restaurantName, setRestaurantName] = useState('');
    const [shiftGateResolved, setShiftGateResolved] = useState(false);
    const [showEndShiftModal, setShowEndShiftModal] = useState(false);

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
                <div className="flex items-center gap-3">
                    <img src={sophramLogo} alt="Sophram" className="h-18 w-auto shrink-0" />

                    <div className="w-px h-6.5 bg-white/10 shrink-0" />

                    <div className="flex items-center gap-1.5">
                        <span className="w-1.75 h-1.75 rounded-full bg-rb-green shrink-0" style={{ boxShadow: '0 0 0 3px rgba(69,200,122,0.15)' }} />
                        <div>
                            <p className="text-sidebar-foreground font-serif font-bold text-base leading-none">
                                {restaurantName || 'Sophram'}
                            </p>
                            <p className="text-rb-amber text-[10px] font-semibold tracking-widest uppercase mt-0.5">
                                Kasiyer
                            </p>
                        </div>
                    </div>
                </div>

                {/* Sayaçlar, CashierDashboardPage tarafından portal ile buraya enjekte edilir */}
                <div id="cashier-stats-slot" className="hidden lg:flex items-center gap-0.5" />

                <div className="flex items-center gap-3">
                    {shiftGateResolved && (
                        <button
                            onClick={() => setShowEndShiftModal(true)}
                            className="text-xs font-semibold text-rb-red border border-rb-red/40 bg-rb-red-bg rounded-full px-3 py-1.5 hover:opacity-80 transition-opacity"
                        >
                            Vardiyayı Bitir
                        </button>
                    )}

                    <HeaderClock />
                    <div className="w-px h-6.5 bg-white/10 shrink-0" />
                    <HeaderThemeToggle />
                    <HeaderLogoutButton onClick={handleLogout} />
                </div>
            </header>

            <div className="flex-1 overflow-auto flex flex-col">
                {shiftGateResolved
                    ? <Outlet />
                    : <ShiftStartGate onResolved={() => setShiftGateResolved(true)} />}
            </div>

            {showEndShiftModal && (
                <EndShiftModal
                    onClose={() => setShowEndShiftModal(false)}
                    onShiftClosed={() => {
                        setShowEndShiftModal(false);
                        setShiftGateResolved(false);
                    }}
                />
            )}
        </div>
    );
}
