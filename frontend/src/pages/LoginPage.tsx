import { useState } from "react";
import { authService } from "../api/authService";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from 'jwt-decode';

// shadcn/ui bileşenleri
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
    Card, 
    CardContent, 
    CardDescription, 
    CardFooter, 
    CardHeader, 
    CardTitle 
} from "@/components/ui/card";

export default function LoginPage() {

    const [userName, setUserName] = useState<string>("");
    const [password, setPassword] = useState<string>("");
    const navigate = useNavigate();

    const handleSubmitUser = async (e: any) => {
        e.preventDefault();
        try {
            if (!userName || !password) return;
            const result = await authService.login(userName, password);
            localStorage.setItem("token", result);
            const decoded: any = jwtDecode(result);
            const role = decoded['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'];

            if (role === 'Admin') navigate('/admin');
            else if(role === 'Kitchen') navigate('/kitchen')
            else navigate('/');
            
        } catch (error: any) {
            console.log(error.response?.data || "Bilinmeyen bir hata oluştu");
        }
    }
    
    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="space-y-2 text-center">
                    <CardTitle className="text-3xl font-bold tracking-tight">
                        RestaurantBill
                    </CardTitle>
                    <CardDescription>
                        Sisteme giriş yapın
                    </CardDescription>
                </CardHeader>
                
                <CardContent>
                    <form onSubmit={handleSubmitUser} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="username">Kullanıcı Adı</Label>
                            <Input
                                id="username"
                                value={userName}
                                onChange={(e) => setUserName(e.target.value)}
                                type="text"
                                placeholder="kullanici_adi"
                                required
                            />
                        </div>
                        
                        <div className="space-y-2">
                            <Label htmlFor="password">Şifre</Label>
                            <Input
                                id="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                type="password"
                                placeholder="••••••••"
                                required
                            />
                        </div>

                        <Button type="submit" className="w-full">
                            Giriş Yap
                        </Button>
                    </form>
                </CardContent>

                <CardFooter className="flex justify-center">
                    <p className="text-sm text-muted-foreground">
                        Hesabın yok mu?{' '}
                        <span 
                            onClick={() => navigate('/register')} 
                            className="text-primary cursor-pointer hover:underline font-medium"
                        >
                            Kayıt Ol
                        </span>
                    </p>
                </CardFooter>
            </Card>
        </div>
    );
}