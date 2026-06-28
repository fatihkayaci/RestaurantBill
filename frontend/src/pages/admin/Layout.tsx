import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import {
    LayoutDashboard, UtensilsCrossed, Tag, Users,
    LayoutGrid, Wallet, BarChart3, UserCircle, LogOut, ShieldCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { authService } from '@/features/auth/api/authService';
import { restaurantService } from '@/features/admin/api/restaurantService';
import RestaurantSetupForm from '@/features/admin/components/RestaurantSetupForm';
import { cn } from '@/lib/utils';

const navItems = [
    { to: '/admin/overview', icon: LayoutDashboard, label: 'Genel Bakış' },
    { to: '/admin/menu', icon: UtensilsCrossed, label: 'Menü' },
    { to: '/admin/categories', icon: Tag, label: 'Kategoriler' },
    { to: '/admin/staff', icon: Users, label: 'Personel' },
    { to: '/admin/tables', icon: LayoutGrid, label: 'Masalar' },
    { to: '/admin/cash-registers', icon: Wallet, label: 'Kasalar' },
    { to: '/admin/reports', icon: BarChart3, label: 'Raporlar' },
    { to: '/admin/profile', icon: UserCircle, label: 'Profil' },
];

export default function AdminLayout() {
    const [needsSetup, setNeedsSetup] = useState<boolean | null>(null);
    const [restaurantName, setRestaurantName] = useState('');
    const navigate = useNavigate();

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
    }, []);

    const handleLogout = () => {
        authService.logout();
        navigate('/login');
    };

    if (needsSetup === null) return null;
    if (needsSetup) return <RestaurantSetupForm onComplete={(name: string) => { setRestaurantName(name); setNeedsSetup(false); }} />;

    return (
        <div className="flex min-h-screen bg-background">
            <aside className="w-64 shrink-0 border-r bg-card flex flex-col">
                <div className="flex h-16 items-center gap-3 px-4 border-b">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                        <ShieldCheck className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="font-semibold text-sm leading-none">{restaurantName}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Yönetici Paneli</p>
                    </div>
                </div>

                <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
                    {navItems.map(({ to, icon: Icon, label }) => (
                        <NavLink
                            key={to}
                            to={to}
                            className={({ isActive }) =>
                                cn(
                                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                                    isActive
                                        ? 'bg-primary text-primary-foreground'
                                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                )
                            }
                        >
                            <Icon className="h-4 w-4 shrink-0" />
                            {label}
                        </NavLink>
                    ))}
                </nav>

                <div className="p-3 border-t">
                    <Button
                        variant="ghost"
                        className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        onClick={handleLogout}
                    >
                        <LogOut className="h-4 w-4" />
                        Çıkış Yap
                    </Button>
                </div>
            </aside>

            <main className="flex-1 overflow-auto p-6">
                <Outlet />
            </main>
        </div>
    );
}
