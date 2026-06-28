import { Outlet } from 'react-router-dom';
import { ChefHat, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { authService } from '@/features/auth/api/authService';
import { useNavigate } from 'react-router-dom';

export default function KitchenLayout() {
    const navigate = useNavigate();

    const handleLogout = () => {
        authService.logout();
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-background">
            <header className="sticky top-0 z-50 w-full border-b bg-card">
                <div className="flex h-16 items-center justify-between px-4 md:px-6">
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-500 text-white">
                            <ChefHat className="h-5 w-5" />
                        </div>
                        <div>
                            <h1 className="text-lg font-semibold">Mutfak Ekranı</h1>
                            <p className="text-xs text-muted-foreground">Kitchen Display System</p>
                        </div>
                    </div>
                    <Button variant="destructive" className="gap-2 font-semibold" onClick={handleLogout}>
                        <LogOut className="w-4 h-4" />
                        Çıkış Yap
                    </Button>
                </div>
            </header>
            <main className="container mx-auto px-4 py-6">
                <Outlet />
            </main>
        </div>
    );
}
