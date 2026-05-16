import { authService } from "../api/authService";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

const registerSchema = z.object({
    fullName: z.string().min(1, "Ad Soyad zorunludur."),
    userName: z.string().min(3, "Kullanıcı adı en az 3 karakter olmalıdır."),
    email: z.email("Geçerli bir e-posta adresi girin."),
    password: z.string().min(6, "Şifre en az 6 karakter olmalıdır."),
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterPage() {

    const navigate = useNavigate();
    const {register, handleSubmit, formState: { errors, isSubmitting }} = useForm<RegisterForm>({
        resolver: zodResolver(registerSchema),
    });

    const onSubmit = async (data: RegisterForm) => {
        try {
            await authService.register(data);
            navigate("/login");
        } catch (error: unknown) {
            const err = error as { response?: { data?: { message?: string } } };
            toast.error(err.response?.data?.message ?? "Bilinmeyen bir hata oluştu");
        }
    };

    return (
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
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

                        <div className="space-y-2">
                            <Label htmlFor="fullName">Ad Soyad</Label>
                            <Input
                                id="fullName"
                                type="text"
                                placeholder="Ad Soyad"
                                {...register("fullName")}
                            />
                            {errors.fullName && (
                                <p className="text-sm text-destructive">{errors.fullName.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="userName">Kullanıcı Adı</Label>
                            <Input
                                id="userName"
                                type="text"
                                placeholder="kullanici_adi"
                                {...register("userName")}
                            />
                            {errors.userName && (
                                <p className="text-sm text-destructive">{errors.userName.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="ornek@mail.com"
                                {...register("email")}
                            />
                            {errors.email && (
                                <p className="text-sm text-destructive">{errors.email.message}</p>
                            )}
                        </div>

<div className="space-y-2">
                            <Label htmlFor="password">Şifre</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                {...register("password")}
                            />
                            {errors.password && (
                                <p className="text-sm text-destructive">{errors.password.message}</p>
                            )}
                        </div>

                        <Button type="submit" className="w-full mt-2" disabled={isSubmitting}>
                            {isSubmitting ? "Kayıt yapılıyor..." : "Kayıt Ol"}
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
    );
}
