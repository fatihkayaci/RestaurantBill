import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { restaurantService } from "@/features/admin/api/restaurantService";
import type { CreateRestaurant } from "@/features/admin/types";
import { cn } from "@/lib/utils";

const restaurantSchema = z.object({
    name: z.string().min(1, "Restoran adı zorunludur."),
    phoneNumber: z.string().optional(),
    mobilePhoneNumber: z.string().optional(),
    email: z.string().email("Geçerli bir e-posta girin.").or(z.literal("")),
    city: z.string().optional(),
    district: z.string().optional(),
});

type RestaurantForm = z.infer<typeof restaurantSchema>;

const inputClass = "w-full rounded-lg border border-border bg-[rgb(245,240,232)] dark:bg-[#2a2520] px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring";
const labelClass = "block text-[11px] font-semibold tracking-widest uppercase text-muted-foreground mb-1.5";

export default function SettingsPage() {
    const [restaurantName, setRestaurantName] = useState("");
    const [restaurantLocation, setRestaurantLocation] = useState("");

    const restaurantForm = useForm<RestaurantForm>({
        resolver: zodResolver(restaurantSchema),
        defaultValues: { name: "", phoneNumber: "", mobilePhoneNumber: "", email: "", city: "", district: "" },
    });

    useEffect(() => {
        restaurantService.getMyRestaurant().then(r => {
            setRestaurantName(r.name);
            setRestaurantLocation([r.district, r.city].filter(Boolean).join(', '));
            restaurantForm.reset({
                name: r.name,
                phoneNumber: r.phoneNumber,
                mobilePhoneNumber: r.mobilePhoneNumber,
                email: r.email,
                city: r.city,
                district: r.district,
            });
        }).catch(console.error);
    }, []);

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
            setRestaurantName(data.name);
            setRestaurantLocation([data.district, data.city].filter(Boolean).join(', '));
            toast.success("Restoran bilgileri güncellendi.");
        } catch {
            toast.error("Restoran bilgileri güncellenirken bir hata oluştu.");
        }
    };

    return (
        <div className="max-w-xl space-y-4">
            <div className="mb-2">
                <h1 className="text-2xl font-serif font-bold text-foreground">Ayarlar</h1>
                <p className="text-sm text-muted-foreground mt-0.5">Restoran bilgileri</p>
            </div>

            {/* Restaurant Header Card */}
            <div className="rounded-xl bg-[#1c1917] dark:bg-[#0f0e0d] p-5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full border-2 border-amber-400 flex items-center justify-center shrink-0">
                    <div className="w-3.5 h-3.5 rounded-full border-2 border-amber-400" />
                </div>
                <div>
                    <p className="text-white font-serif font-bold text-base leading-tight">
                        {restaurantName || "—"}
                    </p>
                    <p className="text-white/50 text-xs mt-0.5">{restaurantLocation || "—"}</p>
                </div>
            </div>

            {/* Restoran Bilgileri */}
            <div className="rounded-xl border border-border bg-card p-5">
                <h2 className="text-base font-semibold text-foreground mb-4">Restoran Bilgileri</h2>
                <form onSubmit={restaurantForm.handleSubmit(onRestaurantSubmit)} className="space-y-4">
                    <div>
                        <label className={labelClass}>Restoran Adı</label>
                        <input className={cn(inputClass, restaurantForm.formState.errors.name && "border-destructive")} {...restaurantForm.register("name")} />
                        {restaurantForm.formState.errors.name && <p className="text-xs text-destructive mt-1">{restaurantForm.formState.errors.name.message}</p>}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className={labelClass}>Sabit Telefon</label>
                            <input className={inputClass} placeholder="0212 000 00 00" {...restaurantForm.register("phoneNumber")} />
                        </div>
                        <div>
                            <label className={labelClass}>Cep Telefonu</label>
                            <input className={inputClass} placeholder="0532 000 00 00" {...restaurantForm.register("mobilePhoneNumber")} />
                        </div>
                    </div>
                    <div>
                        <label className={labelClass}>E-posta</label>
                        <input type="email" className={cn(inputClass, restaurantForm.formState.errors.email && "border-destructive")} {...restaurantForm.register("email")} />
                        {restaurantForm.formState.errors.email && <p className="text-xs text-destructive mt-1">{restaurantForm.formState.errors.email.message}</p>}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className={labelClass}>Şehir</label>
                            <input className={inputClass} {...restaurantForm.register("city")} />
                        </div>
                        <div>
                            <label className={labelClass}>İlçe</label>
                            <input className={inputClass} {...restaurantForm.register("district")} />
                        </div>
                    </div>
                    <div className="flex justify-end">
                        <button
                            type="submit"
                            disabled={restaurantForm.formState.isSubmitting}
                            className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium transition-colors"
                        >
                            {restaurantForm.formState.isSubmitting ? "Kaydediliyor..." : "Restoran Bilgilerini Kaydet →"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
