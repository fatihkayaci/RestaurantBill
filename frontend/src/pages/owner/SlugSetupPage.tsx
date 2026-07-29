import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import axios from "axios";
import { restaurantService } from "@/features/admin/api/restaurantService";
import { ROOT_DOMAIN } from "@/lib/tenant";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const slugify = (value: string) =>
    value
        .toLowerCase()
        .replace(/[şŞ]/g, "s")
        .replace(/[ğĞ]/g, "g")
        .replace(/[üÜ]/g, "u")
        .replace(/[öÖ]/g, "o")
        .replace(/[çÇ]/g, "c")
        .replace(/[ıİ]/g, "i")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

export default function SlugSetupPage() {
    const navigate = useNavigate();
    const [slug, setSlug] = useState("");
    const [loading, setLoading] = useState(false);

    const cleanSlug = slugify(slug);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!cleanSlug) {
            toast.error("Geçerli bir adres girin.");
            return;
        }
        try {
            setLoading(true);
            await restaurantService.setSlug(cleanSlug);
            toast.success(`Restoran adresiniz ayarlandı: ${cleanSlug}.${ROOT_DOMAIN}`);
            navigate("/owner");
        } catch (error) {
            if (axios.isAxiosError(error)) {
                toast.error(error.response?.data?.error ?? "Adres ayarlanamadı.");
            } else {
                console.log("Beklenmeyen hata:", error);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-[#f5f0e8] dark:bg-[#18140f] p-6">
            <div className="w-full max-w-md bg-[#fdfaf5] dark:bg-[#221d16] rounded-2xl border border-[#e8e0d0] dark:border-[#3d3528] shadow-[0_24px_64px_rgba(0,0,0,0.08)] dark:shadow-[0_24px_64px_rgba(0,0,0,0.4)] p-7">
                <h1 className="text-2xl font-serif font-bold text-gray-900 dark:text-[#f2ede4]">
                    Restoran Adresinizi Belirleyin
                </h1>
                <p className="text-[13px] mt-1.5" style={{ color: "#a39080" }}>
                    Restoranınıza bu adresten erişilecek, dilediğiniz zaman kolayca hatırlayabileceğiniz bir adres seçin.
                </p>

                <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[11px] font-bold uppercase tracking-[0.5px]" style={{ color: "#a39080" }}>
                            Adres
                        </label>
                        <Input
                            value={slug}
                            onChange={(e) => setSlug(e.target.value)}
                            placeholder="restoran-adiniz"
                            className="border-[#e8e0d0] dark:border-[#3d3528] dark:bg-white/5 dark:text-[#f2ede4] focus:border-blue-400 rounded-2.5 h-11 text-sm"
                        />
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                            {cleanSlug ? `${cleanSlug}.${ROOT_DOMAIN}` : `—.${ROOT_DOMAIN}`}
                        </p>
                    </div>

                    <Button
                        type="submit"
                        disabled={loading}
                        className="w-full h-11.5 rounded-xl bg-[#2b7fff] hover:bg-blue-600 text-white font-bold text-sm"
                    >
                        {loading ? "Kaydediliyor..." : "Adresi Kaydet →"}
                    </Button>
                </form>
            </div>
        </div>
    );
}
