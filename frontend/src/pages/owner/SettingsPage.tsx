import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import axios from "axios";
import { companyService } from "@/features/companies/api/companyService";
import { ROOT_DOMAIN } from "@/lib/tenant";
import { slugify } from "@/lib/slug";
import { cn } from "@/lib/utils";

const inputClass = "w-full rounded-lg border border-border bg-[rgb(245,240,232)] dark:bg-[#2a2520] px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring";
const labelClass = "block text-[11px] font-semibold tracking-widest uppercase text-muted-foreground mb-1.5";

export default function SettingsPage() {
    const [companyId, setCompanyId] = useState<string | null>(null);

    const [name, setName] = useState("");
    const [nameError, setNameError] = useState<string | null>(null);
    const [nameSaving, setNameSaving] = useState(false);

    const [slug, setSlug] = useState("");
    const [slugError, setSlugError] = useState<string | null>(null);
    const [slugSaving, setSlugSaving] = useState(false);

    useEffect(() => {
        companyService.getMyCompany().then(company => {
            setCompanyId(company.id);
            setName(company.name);
            setSlug(company.slug);
        }).catch(console.error);
    }, []);

    const cleanSlug = slugify(slug);

    const handleNameSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            setNameError("Marka adı boş bırakılamaz.");
            return;
        }
        setNameError(null);
        setNameSaving(true);
        try {
            await companyService.updateCompany({ name: name.trim() });
            toast.success("Marka ayarları güncellendi.");
        } catch (err: unknown) {
            if (axios.isAxiosError(err)) {
                setNameError(err.response?.data?.error ?? err.response?.data?.message ?? "Marka ayarları güncellenirken bir hata oluştu.");
            }
        } finally {
            setNameSaving(false);
        }
    };

    const handleSlugSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!companyId) return;
        if (!cleanSlug) {
            setSlugError("Geçerli bir adres girin.");
            return;
        }
        setSlugError(null);
        setSlugSaving(true);
        try {
            await companyService.setBranchSlug(companyId, cleanSlug);
            setSlug(cleanSlug);
            toast.success("Adres güncellendi.");
        } catch (err: unknown) {
            if (axios.isAxiosError(err)) {
                setSlugError(err.response?.data?.error ?? err.response?.data?.message ?? "Adres ayarlanırken bir hata oluştu.");
            }
        } finally {
            setSlugSaving(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="mb-2">
                <h1 className="text-2xl font-serif font-bold text-foreground">Marka Ayarları</h1>
                <p className="text-sm text-muted-foreground mt-0.5">Marka kimliği ve adres</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
                {/* Marka Kimliği */}
                <div className="rounded-xl border border-border bg-card p-5">
                    <h2 className="text-base font-semibold text-foreground mb-4">Marka Kimliği</h2>
                    <form onSubmit={handleNameSubmit} className="space-y-4">
                        <div>
                            <label className={labelClass}>Marka Adı</label>
                            <input
                                className={cn(inputClass, nameError && "border-destructive")}
                                value={name}
                                onChange={e => setName(e.target.value)}
                            />
                            {nameError && <p className="text-xs text-destructive mt-1">{nameError}</p>}
                        </div>
                        <div className="flex justify-end">
                            <button
                                type="submit"
                                disabled={nameSaving}
                                className="px-5 py-2 rounded-lg bg-rb-gold hover:opacity-90 disabled:opacity-60 text-rb-gold-foreground text-sm font-medium transition-colors"
                            >
                                {nameSaving ? "Kaydediliyor..." : "Marka Ayarlarını Kaydet"}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Slug */}
                <div className="rounded-xl border border-border bg-card p-5">
                    <h2 className="text-base font-semibold text-foreground mb-4">Adres</h2>
                    <form onSubmit={handleSlugSubmit} className="space-y-4">
                        <div>
                            <label className={labelClass}>Adres</label>
                            <input
                                className={cn(inputClass, slugError && "border-destructive")}
                                placeholder="restoran-adiniz"
                                value={slug}
                                onChange={e => setSlug(e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground mt-1 truncate">
                                {cleanSlug ? `${cleanSlug}.${ROOT_DOMAIN}` : `—.${ROOT_DOMAIN}`}
                            </p>
                            {slugError && <p className="text-xs text-destructive mt-1">{slugError}</p>}
                        </div>

                        {cleanSlug && (
                            <div className="flex flex-col items-center gap-2 py-2">
                                <div className="p-3 rounded-lg bg-white">
                                    <QRCodeSVG value={`https://${cleanSlug}.${ROOT_DOMAIN}`} size={140} />
                                </div>
                            </div>
                        )}

                        <div className="flex justify-end">
                            <button
                                type="submit"
                                disabled={slugSaving}
                                className="px-5 py-2 rounded-lg bg-rb-gold hover:opacity-90 disabled:opacity-60 text-rb-gold-foreground text-sm font-medium transition-colors"
                            >
                                {slugSaving ? "Kaydediliyor..." : "Adresi Kaydet"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
