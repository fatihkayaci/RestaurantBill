import { Button } from '@/components/ui/button'
import { UtensilsCrossed, Bell } from 'lucide-react'
import { authService } from "../api/authService";
import { useNavigate } from "react-router-dom";
import { LogOut } from 'lucide-react'

export default function Header() {
    
    const navigate = useNavigate();
    const handleLogout = () => {
        authService.logout();
        navigate('/login');
    };
    return (
        
        <header className="sticky top-0 z-50 w-full border-b bg-card">
            <div className="flex h-16 items-center justify-between px-4 md:px-6">
                <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <UtensilsCrossed className="h-5 w-5" />
                </div>
                <div>
                    <h1 className="text-lg font-semibold">La Bella Cucina</h1>
                    <p className="text-xs text-muted-foreground">Restaurant Management</p>
                </div>
                </div>
                
                <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] text-white">
                    3
                    </span>
                </Button>
                <Button 
                    variant="destructive" 
                    className="gap-2 font-semibold" 
                    onClick={handleLogout}
                >
                    <LogOut className="w-4 h-4" />
                    Çıkış Yap
                </Button>
                </div>
            </div>
        </header>
    );
}