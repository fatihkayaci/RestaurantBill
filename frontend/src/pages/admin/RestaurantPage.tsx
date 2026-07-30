import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { restaurantService } from "@/features/admin/api/restaurantService";
import type { Restaurant } from "@/features/admin/types";
import { ROOT_DOMAIN } from "@/lib/tenant";

const infoRowClass = "flex items-center justify-between text-sm py-2 border-b border-border last:border-0";
const labelClass = "text-muted-foreground";
const valueClass = "text-foreground font-medium";

export default function RestaurantPage() {
    const [restaurant, setRestaurant] = useState<Restaurant | null>(null);

    useEffect(() => {
        restaurantService.getMyRestaurant().then(setRestaurant).catch(console.error);
    }, []);

    const restaurantLocation = restaurant ? [restaurant.district, restaurant.city].filter(Boolean).join(', ') : '';
    const restaurantUrl = restaurant?.slug ? `https://${restaurant.slug}.${ROOT_DOMAIN}` : "";

    return (
        <div className="space-y-4">
            <div className="mb-2">
                <h1 className="text-2xl font-serif font-bold text-foreground">Restoran</h1>
                <p className="text-sm text-muted-foreground mt-0.5">Restoran bilgileri (salt okunur)</p>
            </div>

            {/* Restaurant Header Card */}
            <div className="rounded-xl bg-sidebar p-5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full border-2 border-rb-amber flex items-center justify-center shrink-0">
                    <div className="w-3.5 h-3.5 rounded-full border-2 border-rb-amber" />
                </div>
                <div>
                    <p className="text-sidebar-foreground font-serif font-bold text-base leading-tight">
                        {restaurant?.name || "—"}
                    </p>
                    <p className="text-sidebar-foreground/50 text-xs mt-0.5">{restaurantLocation || "—"}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
                {/* Restoran Bilgileri */}
                <div className="rounded-xl border border-border bg-card p-5">
                    <h2 className="text-base font-semibold text-foreground mb-2">Restoran Bilgileri</h2>
                    <div>
                        <div className={infoRowClass}>
                            <span className={labelClass}>Restoran Adı</span>
                            <span className={valueClass}>{restaurant?.name || "—"}</span>
                        </div>
                        <div className={infoRowClass}>
                            <span className={labelClass}>Sabit Telefon</span>
                            <span className={valueClass}>{restaurant?.phoneNumber || "—"}</span>
                        </div>
                        <div className={infoRowClass}>
                            <span className={labelClass}>Cep Telefonu</span>
                            <span className={valueClass}>{restaurant?.mobilePhoneNumber || "—"}</span>
                        </div>
                        <div className={infoRowClass}>
                            <span className={labelClass}>E-posta</span>
                            <span className={valueClass}>{restaurant?.email || "—"}</span>
                        </div>
                        <div className={infoRowClass}>
                            <span className={labelClass}>Şehir</span>
                            <span className={valueClass}>{restaurant?.city || "—"}</span>
                        </div>
                        <div className={infoRowClass}>
                            <span className={labelClass}>İlçe</span>
                            <span className={valueClass}>{restaurant?.district || "—"}</span>
                        </div>
                    </div>
                </div>

                {/* Restoran QR Kodu */}
                <div className="rounded-xl border border-border bg-card p-5">
                    <h2 className="text-base font-semibold text-foreground mb-4">Restoran QR Kodu</h2>
                    <div className="flex flex-col items-center gap-3 py-2">
                        {restaurantUrl ? (
                            <div className="p-3 rounded-lg bg-white">
                                <QRCodeSVG value={restaurantUrl} size={176} />
                            </div>
                        ) : (
                            <div className="w-44 h-44 rounded-lg border border-dashed border-border flex items-center justify-center text-xs text-muted-foreground text-center px-3">
                                Adres henüz belirlenmedi
                            </div>
                        )}
                        <p className="text-sm text-foreground font-medium break-all text-center">
                            {restaurantUrl || "—"}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
