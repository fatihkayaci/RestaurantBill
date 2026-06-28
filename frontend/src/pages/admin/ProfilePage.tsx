import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { userService } from "@/features/admin/api/userService";
import { restaurantService } from "@/features/admin/api/restaurantService";
import type { UpdateUser } from "@/features/admin/types";
import type { CreateRestaurant } from "@/features/admin/types";
import { jwtDecode } from "jwt-decode";

const profileSchema = z.object({
    fullName: z.string().min(1, "Ad soyad zorunludur."),
    userName: z.string().min(3, "Kullanıcı adı en az 3 karakter olmalıdır."),
    email: z.email("Geçerli bir e-posta adresi girin.").or(z.literal("")),
    phoneNumber: z.string().optional(),
    password: z.string().min(6, "Şifre en az 6 karakter olmalıdır.").or(z.literal("")),
});

const restaurantSchema = z.object({
    name: z.string().min(1, "Restoran adı zorunludur."),
    phoneNumber: z.string().optional(),
    mobilePhoneNumber: z.string().optional(),
    email: z.email("Geçerli bir e-posta adresi girin.").or(z.literal("")),
    city: z.string().optional(),
    district: z.string().optional(),
});

type ProfileForm = z.infer<typeof profileSchema>;
type RestaurantForm = z.infer<typeof restaurantSchema>;

export default function Profile() {
    const [userId, setUserId] = useState<number | null>(null);
    const [userCode, setUserCode] = useState<string>("");
    const [role, setRole] = useState<number>(1);

    const profileForm = useForm<ProfileForm>({
        resolver: zodResolver(profileSchema),
        defaultValues: { fullName: "", userName: "", email: "", phoneNumber: "", password: "" },
    });

    const restaurantForm = useForm<RestaurantForm>({
        resolver: zodResolver(restaurantSchema),
        defaultValues: { name: "", phoneNumber: "", mobilePhoneNumber: "", email: "", city: "", district: "" },
    });

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (token) {
            const decoded: { [key: string]: string } = jwtDecode(token);
            const id = parseInt(decoded["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"]);
            setUserId(id);
        }

        restaurantService.getMyRestaurant().then(r => {
            restaurantForm.reset({
                name: r.name,
                phoneNumber: r.phoneNumber,
                mobilePhoneNumber: r.mobilePhoneNumber,
                email: r.email,
                city: r.city,
                district: r.district,
            });
        }).catch(console.error);

        userService.getCurrentUser().then(u => {
            setUserCode(u.userCode);
            setRole(u.role);
            profileForm.reset({
                fullName: u.fullName,
                userName: u.userName,
                email: u.email ?? "",
                phoneNumber: u.phoneNumber ?? "",
                password: "",
            });
        }).catch(console.error);
    }, []);

    const onProfileSubmit = async (data: ProfileForm) => {
        if (!userId) return;
        try {
            const payload: UpdateUser = {
                id: String(userId),
                fullName: data.fullName,
                userName: data.userName,
                email: data.email,
                phoneNumber: data.phoneNumber ?? "",
                password: data.password || undefined,
                userCode: userCode,
                role: role,
            };
            await userService.updateUser(payload);
            toast.success("Profil güncellendi.");
            profileForm.setValue("password", "");
        } catch {
            toast.error("Profil güncellenirken bir hata oluştu.");
        }
    };

    const onRestaurantSubmit = async (data: RestaurantForm) => {
        try {
            const payload: CreateRestaurant = {
                name: data.name,
                phoneNumber: data.phoneNumber ?? "",
                mobilePhoneNumber: data.mobilePhoneNumber ?? "",
                email: data.email,
                city: data.city ?? "",
                district: data.district ?? "",
            };
            await restaurantService.update(payload);
            toast.success("Restoran bilgileri güncellendi.");
        } catch {
            toast.error("Restoran bilgileri güncellenirken bir hata oluştu.");
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
                <CardHeader>
                    <CardTitle>Profil Bilgileri</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                        <div className="space-y-2">
                            <Label>Ad Soyad</Label>
                            <Input {...profileForm.register("fullName")} />
                            {profileForm.formState.errors.fullName && (
                                <p className="text-sm text-destructive">{profileForm.formState.errors.fullName.message}</p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label>Kullanıcı Adı</Label>
                            <Input {...profileForm.register("userName")} />
                            {profileForm.formState.errors.userName && (
                                <p className="text-sm text-destructive">{profileForm.formState.errors.userName.message}</p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label>E-posta</Label>
                            <Input type="email" {...profileForm.register("email")} />
                            {profileForm.formState.errors.email && (
                                <p className="text-sm text-destructive">{profileForm.formState.errors.email.message}</p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label>Telefon</Label>
                            <Input {...profileForm.register("phoneNumber")} placeholder="0532 000 00 00" />
                        </div>
                        <div className="space-y-2">
                            <Label>Yeni Şifre</Label>
                            <Input type="password" {...profileForm.register("password")} placeholder="Değiştirmek için yeni şifre girin" />
                            {profileForm.formState.errors.password && (
                                <p className="text-sm text-destructive">{profileForm.formState.errors.password.message}</p>
                            )}
                        </div>
                        <Button type="submit" disabled={profileForm.formState.isSubmitting}>
                            {profileForm.formState.isSubmitting ? "Kaydediliyor..." : "Kaydet"}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Restoran Bilgileri</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={restaurantForm.handleSubmit(onRestaurantSubmit)} className="space-y-4">
                        <div className="space-y-2">
                            <Label>Restoran Adı</Label>
                            <Input {...restaurantForm.register("name")} />
                            {restaurantForm.formState.errors.name && (
                                <p className="text-sm text-destructive">{restaurantForm.formState.errors.name.message}</p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label>Telefon</Label>
                            <Input {...restaurantForm.register("phoneNumber")} placeholder="0212 000 00 00" />
                        </div>
                        <div className="space-y-2">
                            <Label>Cep Telefonu</Label>
                            <Input {...restaurantForm.register("mobilePhoneNumber")} placeholder="0532 000 00 00" />
                        </div>
                        <div className="space-y-2">
                            <Label>E-posta</Label>
                            <Input type="email" {...restaurantForm.register("email")} />
                            {restaurantForm.formState.errors.email && (
                                <p className="text-sm text-destructive">{restaurantForm.formState.errors.email.message}</p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label>Şehir</Label>
                            <Input {...restaurantForm.register("city")} />
                        </div>
                        <div className="space-y-2">
                            <Label>İlçe</Label>
                            <Input {...restaurantForm.register("district")} />
                        </div>
                        <Button type="submit" disabled={restaurantForm.formState.isSubmitting}>
                            {restaurantForm.formState.isSubmitting ? "Kaydediliyor..." : "Kaydet"}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}

