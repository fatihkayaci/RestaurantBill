import { useState } from "react";
import { restaurantService } from "../api/restaurantService";
import type { CreateRestaurant } from "../features/Restaurants/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Utensils } from "lucide-react";

export default function RestaurantSetupForm() {
    const [form, setForm] = useState<CreateRestaurant>({
        name: '',
        phoneNumber: '',
        mobilePhoneNumber: '',
        email: '',
        city: '',
        district: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: { preventDefault: () => void }) => {
        e.preventDefault();
        try {
            setIsSubmitting(true);
            await restaurantService.create(form);
            window.location.reload();
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <Card className="w-full max-w-lg shadow-xl">
                <CardHeader className="pb-4">
                    <div className="flex items-center gap-3 mb-1">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                            <Utensils className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <CardTitle className="text-xl">Restoran Bilgileri</CardTitle>
                            <p className="text-sm text-muted-foreground mt-0.5">Başlamak için restoran bilgilerini girin</p>
                        </div>
                    </div>
                </CardHeader>

                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="name">Restoran Adı</Label>
                            <Input
                                id="name"
                                type="text"
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                placeholder="Restoran Adı"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="phone">Telefon</Label>
                                <Input
                                    id="phone"
                                    type="text"
                                    value={form.phoneNumber}
                                    onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
                                    placeholder="0212 000 00 00"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="mobile">Cep Telefonu</Label>
                                <Input
                                    id="mobile"
                                    type="text"
                                    value={form.mobilePhoneNumber}
                                    onChange={(e) => setForm({ ...form, mobilePhoneNumber: e.target.value })}
                                    placeholder="0532 000 00 00"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                value={form.email}
                                onChange={(e) => setForm({ ...form, email: e.target.value })}
                                placeholder="restoran@mail.com"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="city">Şehir</Label>
                                <Input
                                    id="city"
                                    type="text"
                                    value={form.city}
                                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                                    placeholder="İstanbul"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="district">İlçe</Label>
                                <Input
                                    id="district"
                                    type="text"
                                    value={form.district}
                                    onChange={(e) => setForm({ ...form, district: e.target.value })}
                                    placeholder="Kadıköy"
                                />
                            </div>
                        </div>

                        <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
                            {isSubmitting ? "Kaydediliyor..." : "Kaydet ve Devam Et"}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}