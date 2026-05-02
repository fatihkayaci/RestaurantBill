import { useState } from "react";
import { authService } from "../api/authService";
import { useNavigate } from "react-router-dom";
import type { Register } from "../features/auths/types";

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

export default function RegisterPage() {
    
    const navigate = useNavigate();
    const [form, setForm] = useState<Register>({
        fullName: '',
        userName: '',
        email: '',
        userCode: '',
        password: ''
    });

    const handleSubmit = async (e: any) => {
        e.preventDefault();
        try {
            await authService.register(form);
            navigate("/login");
        } catch (error: any) {
            console.log(error.response?.data || "Bilinmeyen bir hata oluştu");
        }
    }
        
    return(
        <div className="min-h-screen bg-background flex items-center justify-center p-4 py-10">
            <Card className="w-full max-w-md">
                
                <CardHeader className="space-y-2 text-center">
                    <CardTitle className="text-3xl font-bold tracking-tight">
                        Kayıt Ol
                    </CardTitle>
                    <CardDescription>
                        Yeni hesap oluşturun
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-5"> 
                        
                        <div className="space-y-2">
                            <Label htmlFor="fullName">Ad Soyad</Label>
                            <Input
                                id="fullName"
                                type="text"
                                value={form.fullName}
                                onChange={(e) => setForm({...form, fullName: e.target.value})}
                                placeholder="Ad Soyad"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="userName">Kullanıcı Adı</Label>
                            <Input
                                id="userName"
                                type="text"
                                value={form.userName}
                                onChange={(e) => setForm({...form, userName: e.target.value})}
                                placeholder="kullanici_adi"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                value={form.email}
                                onChange={(e) => setForm({...form, email: e.target.value})}
                                placeholder="ornek@mail.com"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password">Şifre</Label>
                            <Input
                                id="password"
                                type="password"
                                value={form.password}
                                onChange={(e) => setForm({...form, password: e.target.value})}
                                placeholder="••••••••"
                                required
                            />
                        </div>

                        <Button type="submit" className="w-full mt-2">
                            Kayıt Ol
                        </Button>
                    </form>
                </CardContent>

                <CardFooter className="flex justify-center border-t pt-6">
                    <p className="text-sm text-muted-foreground">
                        Hesabın var mı?{' '}
                        <span 
                            onClick={() => navigate('/login')} 
                            className="text-primary cursor-pointer hover:underline font-medium"
                        >
                            Giriş Yap
                        </span>
                    </p>
                </CardFooter>

            </Card>
        </div>
    )
}