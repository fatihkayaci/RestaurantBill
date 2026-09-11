import { useEffect, useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Lock, MapPin, Phone, Settings, User } from "lucide-react";
import { toast } from "sonner";
import { branchService } from "@/features/branches/api/branchService";
import type { Branch } from "@/features/branches/types";
import { ROOT_DOMAIN } from "@/lib/tenant";

const infoRowClass = "flex items-center justify-between text-sm py-2 border-b border-border last:border-0";
const labelClass = "text-muted-foreground";
const valueClass = "text-foreground font-medium text-right";

function formatTL(amount: number): string {
    return `₺${amount.toLocaleString('tr-TR')}`;
}

interface InfoRow {
    label: string;
    value?: string;
}

function InfoCard({ icon: Icon, title, rows }: { icon: typeof User; title: string; rows: InfoRow[] }) {
    return (
        <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-1.5 mb-2">
                <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{title}</h2>
            </div>
            <div>
                {rows.map(row => (
                    <div key={row.label} className={infoRowClass}>
                        <span className={labelClass}>{row.label}</span>
                        <span className={valueClass}>{row.value || "—"}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function RestaurantPage() {
    const [branch, setBranch] = useState<Branch | null>(null);
    const [loading, setLoading] = useState(true);
    const qrRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        branchService.getMyBranch()
            .then(setBranch)
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const branchLocation = branch ? [branch.district, branch.city].filter(Boolean).join(', ') : '';
    const restaurantUrl = branch?.slug ? `https://${branch.slug}.${ROOT_DOMAIN}` : "";

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(restaurantUrl);
            toast.success('Bağlantı kopyalandı.');
        } catch {
            toast.error('Bağlantı kopyalanamadı.');
        }
    };

    const handleDownloadPng = () => {
        const canvas = qrRef.current;
        if (!canvas) return;
        const link = document.createElement('a');
        link.download = `${branch?.slug || 'restoran'}-qr.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    };

    return (
        <div className="space-y-4">
            <div className="mb-2">
                <h1 className="text-2xl font-serif font-bold text-foreground">Restoran</h1>
                <p className="text-sm text-muted-foreground mt-0.5">Şube bilgileri (salt okunur)</p>
            </div>

            {/* Restaurant Header Card */}
            <div className="rounded-2xl bg-sidebar p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full border-2 border-rb-amber flex items-center justify-center shrink-0">
                        <div className="w-3.5 h-3.5 rounded-full border-2 border-rb-amber" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <p className="text-sidebar-foreground font-serif font-bold text-base leading-tight">
                                {branch?.branchName || (loading ? "Yükleniyor..." : "—")}
                            </p>
                            {branch && (
                                <span className="text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded bg-rb-green-bg text-rb-green">
                                    Aktif
                                </span>
                            )}
                        </div>
                        <p className="text-sidebar-foreground/50 text-xs mt-0.5">{branchLocation || "—"}</p>
                    </div>
                </div>

                <div className="flex items-center gap-6 sm:gap-8 sm:border-l sm:border-white/10 sm:pl-6">
                    <div className="text-center">
                        <p className="font-serif text-xl font-bold text-sidebar-foreground tabular-nums">{branch?.tableCount ?? "—"}</p>
                        <p className="text-[10px] uppercase tracking-widest text-sidebar-foreground/40 mt-0.5">Masa</p>
                    </div>
                    <div className="text-center border-l border-white/10 pl-6 sm:pl-8">
                        <p className="font-serif text-xl font-bold text-sidebar-foreground tabular-nums">{branch?.staffCount ?? "—"}</p>
                        <p className="text-[10px] uppercase tracking-widest text-sidebar-foreground/40 mt-0.5">Personel</p>
                    </div>
                    <div className="text-center border-l border-white/10 pl-6 sm:pl-8">
                        <p className="font-serif text-xl font-bold text-sidebar-foreground tabular-nums">{branch ? formatTL(branch.revenue) : "—"}</p>
                        <p className="text-[10px] uppercase tracking-widest text-sidebar-foreground/40 mt-0.5">Toplam Ciro</p>
                    </div>
                </div>
            </div>

            <div className="rounded-xl bg-rb-amber-bg border border-rb-amber/20 px-4 py-3 flex items-center gap-2 text-sm text-rb-amber">
                <Lock className="w-4 h-4 shrink-0" />
                <span>Bu bilgiler şube sahibi (Owner) tarafından yönetilir. Değişiklik için Owner paneline başvurun.</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-4 items-start">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <InfoCard icon={User} title="Kimlik" rows={[
                        { label: 'Şube Adı', value: branch?.branchName },
                        { label: 'Yönetici', value: branch?.managerName },
                    ]} />
                    <InfoCard icon={Phone} title="İletişim" rows={[
                        { label: 'Telefon', value: branch?.number },
                        { label: 'E-posta', value: branch?.email },
                    ]} />
                    <InfoCard icon={MapPin} title="Konum" rows={[
                        { label: 'Şehir', value: branch?.city },
                        { label: 'İlçe', value: branch?.district },
                        { label: 'Açık Adres', value: branch?.openAddress },
                    ]} />
                    <InfoCard icon={Settings} title="Operasyon" rows={[
                        { label: 'Vergi Oranı', value: branch ? `%${branch.taxRate}` : undefined },
                        { label: 'Gün Sonu Saati', value: branch?.dayEndTime },
                        { label: 'Saat Dilimi', value: branch?.timeZoneId },
                    ]} />
                </div>

                {/* Restoran QR Kodu */}
                <div className="rounded-xl border border-border bg-card p-5 h-full flex flex-col">
                    <h2 className="text-base font-semibold text-foreground">Restoran QR Kodu</h2>
                    <p className="text-xs text-muted-foreground mt-0.5 mb-4">Masalarda müşteriyi dijital menüye götürür</p>
                    <div className="flex flex-col items-center gap-3 py-2 flex-1 justify-center">
                        {restaurantUrl ? (
                            <div className="p-3 rounded-lg bg-white">
                                <QRCodeCanvas ref={qrRef} value={restaurantUrl} size={176} />
                            </div>
                        ) : (
                            <div className="w-44 h-44 rounded-lg border border-dashed border-border flex items-center justify-center text-xs text-muted-foreground text-center px-3">
                                Adres henüz belirlenmedi
                            </div>
                        )}
                        <p className="text-sm text-foreground font-medium break-all text-center">
                            {restaurantUrl ? restaurantUrl.replace(/^https?:\/\//, '') : "—"}
                        </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                        <button
                            onClick={handleCopyLink}
                            disabled={!restaurantUrl}
                            className="rounded-lg bg-rb-gold text-rb-gold-foreground text-sm font-semibold py-2.5 hover:opacity-90 disabled:opacity-50 transition-opacity"
                        >
                            Bağlantıyı Kopyala
                        </button>
                        <button
                            onClick={handleDownloadPng}
                            disabled={!restaurantUrl}
                            className="rounded-lg border border-border text-sm font-semibold py-2.5 text-foreground hover:bg-muted disabled:opacity-50 transition-colors"
                        >
                            PNG İndir
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
