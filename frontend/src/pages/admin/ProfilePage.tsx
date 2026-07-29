import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { userService } from "@/features/admin/api/userService";
import type { UpdateUser } from "@/features/admin/types";
import { jwtDecode } from "jwt-decode";
import { cn } from "@/lib/utils";

const profileSchema = z.object({
    fullName: z.string().min(1, "Ad soyad zorunludur."),
    email: z.string().email("Geçerli bir e-posta girin.").or(z.literal("")),
    phoneNumber: z.string().optional(),
});

type ProfileForm = z.infer<typeof profileSchema>;

const roleLabel: Record<number, string> = {
    1: "Yönetici", 2: "Garson", 3: "Kasiyer", 4: "Mutfak",
};

const inputClass = "w-full rounded-lg border border-border bg-[rgb(245,240,232)] dark:bg-[#2a2520] px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring";
const labelClass = "block text-[11px] font-semibold tracking-widest uppercase text-muted-foreground mb-1.5";

export default function Profile() {
    const [userId, setUserId] = useState<string | null>(null);
    const [userCode, setUserCode] = useState("");
    const [role, setRole] = useState(1);
    const [userName, setUserName] = useState("");
    const [initials, setInitials] = useState("A");

    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [passwordError, setPasswordError] = useState("");
    const [passwordLoading, setPasswordLoading] = useState(false);

    const profileForm = useForm<ProfileForm>({
        resolver: zodResolver(profileSchema),
        defaultValues: { fullName: "", email: "", phoneNumber: "" },
    });

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (token) {
            const decoded: Record<string, string> = jwtDecode(token);
            setUserId(decoded["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"]);
        }

        userService.getCurrentUser().then(u => {
            setUserCode(u.userCode);
            setRole(u.role);
            setUserName(u.userName);
            setInitials(u.fullName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase());
            profileForm.reset({ fullName: u.fullName, email: u.email ?? "", phoneNumber: u.phoneNumber ?? "" });
        }).catch(console.error);
    }, []);

    const onProfileSubmit = async (data: ProfileForm) => {
        if (!userId) return;
        try {
            const payload: UpdateUser = {
                id: userId,
                fullName: data.fullName,
                userName: userName,
                email: data.email,
                phoneNumber: data.phoneNumber ?? "",
                userCode,
                role,
            };
            await userService.updateUser(payload);
            setInitials(data.fullName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase());
            toast.success("Profil güncellendi.");
        } catch {
            toast.error("Profil güncellenirken bir hata oluştu.");
        }
    };

    const onPasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setPasswordError("");
        if (!newPassword || newPassword.length < 6) { setPasswordError("Yeni şifre en az 6 karakter olmalıdır."); return; }
        if (newPassword !== confirmPassword) { setPasswordError("Şifreler eşleşmiyor."); return; }
        if (!userId) return;
        setPasswordLoading(true);
        try {
            const payload: UpdateUser = {
                id: userId,
                fullName: profileForm.getValues("fullName"),
                userName,
                email: profileForm.getValues("email"),
                phoneNumber: profileForm.getValues("phoneNumber") ?? "",
                password: newPassword,
                userCode,
                role,
            };
            await userService.updateUser(payload);
            toast.success("Şifre güncellendi.");
            setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
        } catch {
            toast.error("Şifre güncellenirken bir hata oluştu.");
        } finally {
            setPasswordLoading(false);
        }
    };

    return (
        <div className="space-y-1">
            {/* Page Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-serif font-bold text-foreground">Profil Ayarları</h1>
                <p className="text-sm text-muted-foreground mt-0.5">Hesap bilgileri</p>
            </div>

            <div className="max-w-xl space-y-4">
                {/* User Header Card */}
                <div className="rounded-xl bg-[#1c1917] dark:bg-[#0f0e0d] p-5 flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full border-2 border-purple-400 flex items-center justify-center shrink-0 bg-purple-900/40">
                        <span className="text-purple-300 text-lg font-bold">{initials}</span>
                    </div>
                    <div>
                        <p className="text-white font-bold text-lg leading-tight">
                            {profileForm.watch("fullName") || "—"}
                        </p>
                        <p className="text-purple-400 text-[10px] font-semibold tracking-widest uppercase mt-0.5">
                            {roleLabel[role] ?? "Yönetici"}
                        </p>
                    </div>
                </div>

                {/* Kişisel Bilgiler */}
                <div className="rounded-xl border border-border bg-card p-5">
                    <h2 className="text-base font-semibold text-foreground mb-4">Kişisel Bilgiler</h2>
                    <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                        <div>
                            <label className={labelClass}>Ad Soyad</label>
                            <input className={cn(inputClass, profileForm.formState.errors.fullName && "border-destructive")} {...profileForm.register("fullName")} />
                            {profileForm.formState.errors.fullName && <p className="text-xs text-destructive mt-1">{profileForm.formState.errors.fullName.message}</p>}
                        </div>
                        <div>
                            <label className={labelClass}>E-posta</label>
                            <input type="email" className={cn(inputClass, profileForm.formState.errors.email && "border-destructive")} {...profileForm.register("email")} />
                            {profileForm.formState.errors.email && <p className="text-xs text-destructive mt-1">{profileForm.formState.errors.email.message}</p>}
                        </div>
                        <div>
                            <label className={labelClass}>Telefon</label>
                            <input className={inputClass} placeholder="0532 000 00 00" {...profileForm.register("phoneNumber")} />
                        </div>
                        <div className="flex justify-end">
                            <button
                                type="submit"
                                disabled={profileForm.formState.isSubmitting}
                                className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium transition-colors"
                            >
                                {profileForm.formState.isSubmitting ? "Kaydediliyor..." : "Bilgileri Kaydet →"}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Şifre Değiştir */}
                <div className="rounded-xl border border-border bg-card p-5">
                    <h2 className="text-base font-semibold text-foreground mb-4">Şifre Değiştir</h2>
                    <form onSubmit={onPasswordSubmit} className="space-y-4">
                        <div>
                            <label className={labelClass}>Mevcut Şifre</label>
                            <input
                                type="password"
                                className={inputClass}
                                placeholder="Mevcut şifreniz..."
                                value={currentPassword}
                                onChange={e => setCurrentPassword(e.target.value)}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className={labelClass}>Yeni Şifre</label>
                                <input
                                    type="password"
                                    className={cn(inputClass, passwordError && "border-destructive")}
                                    placeholder="Yeni şifre..."
                                    value={newPassword}
                                    onChange={e => setNewPassword(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className={labelClass}>Şifre Tekrar</label>
                                <input
                                    type="password"
                                    className={cn(inputClass, passwordError && "border-destructive")}
                                    placeholder="Şifreyi tekrar girin..."
                                    value={confirmPassword}
                                    onChange={e => setConfirmPassword(e.target.value)}
                                />
                            </div>
                        </div>
                        {passwordError && <p className="text-xs text-destructive">{passwordError}</p>}
                        <div className="flex justify-end">
                            <button
                                type="submit"
                                disabled={passwordLoading}
                                className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium transition-colors"
                            >
                                {passwordLoading ? "Güncelleniyor..." : "Şifreyi Güncelle →"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
