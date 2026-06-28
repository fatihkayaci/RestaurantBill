import { Outlet } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { UtensilsCrossed, LogOut, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { authService } from '@/features/auth/api/authService';
import { restaurantService } from '@/features/admin/api/restaurantService';
import RestaurantSetupForm from '@/features/admin/components/RestaurantSetupForm';
import { useNavigate } from 'react-router-dom';

export default function WaiterLayout() {
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
        <div className="min-h-screen bg-background">
            <header className="sticky top-0 z-50 w-full border-b bg-card">
                <div className="flex h-16 items-center justify-between px-4 md:px-6">
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                            <UtensilsCrossed className="h-5 w-5" />
                        </div>
                        <div>
                            <h1 className="text-lg font-semibold">{restaurantName}</h1>
                            <p className="text-xs text-muted-foreground">Garson Paneli</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="icon" className="relative">
                            <Bell className="h-5 w-5" />
                        </Button>
                        <Button variant="destructive" className="gap-2 font-semibold" onClick={handleLogout}>
                            <LogOut className="w-4 h-4" />
                            Çıkış Yap
                        </Button>
                    </div>
                </div>
            </header>
            <main className="container mx-auto px-4 py-6">
                <Outlet />
            </main>
        </div>
    );
}
