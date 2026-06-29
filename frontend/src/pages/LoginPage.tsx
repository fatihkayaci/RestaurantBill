import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";
import { useTheme } from "next-themes";
import { authService } from "@/features/auth/api/authService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type TabType = "login" | "register";

const SIDEBAR_FEATURES = [
    "Garson sipariş yönetimi",
    "Mutfak ekran takibi",
    "Anlık hesap & ödeme",
    "Admin dashboard & raporlar",
];

export default function LoginPage() {
    const navigate = useNavigate();
    const { theme, setTheme } = useTheme();
    const isDark = theme === "dark";
    const [activeTab, setActiveTab] = useState<TabType>("login");

    // Login state
    const [loginField, setLoginField] = useState("");
    const [loginPassword, setLoginPassword] = useState("");
    const [showLoginPassword, setShowLoginPassword] = useState(false);
    const [loginLoading, setLoginLoading] = useState(false);

    // Register state
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [regEmail, setRegEmail] = useState("");
    const [regPassword, setRegPassword] = useState("");
    const [regConfirm, setRegConfirm] = useState("");
    const [showRegPassword, setShowRegPassword] = useState(false);
    const [regLoading, setRegLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!loginField || !loginPassword) {
            toast.error("Tüm alanları doldurun.");
            return;
        }
        try {
            setLoginLoading(true);
            const token = await authService.login(loginField, loginPassword);
            localStorage.setItem("token", token);
            const decoded: any = jwtDecode(token);
            const role = decoded["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"];
            if (role === "Admin") navigate("/admin");
            else if (role === "Kitchen") navigate("/kitchen");
            else if (role === "Cashier") navigate("/cashier");
            else navigate("/waiter");
        } catch (error: any) {
            toast.error(error.response?.data?.message ?? error.response?.data ?? "Giriş başarısız.");
        } finally {
            setLoginLoading(false);
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!firstName || !lastName || !regEmail || !regPassword || !regConfirm) {
            toast.error("Tüm alanları doldurun.");
            return;
        }
        if (regPassword !== regConfirm) {
            toast.error("Şifreler eşleşmiyor.");
            return;
        }
        if (regPassword.length < 6) {
            toast.error("Şifre en az 6 karakter olmalıdır.");
            return;
        }
        try {
            setRegLoading(true);
            await authService.register({
                fullName: `${firstName} ${lastName}`,
                userName: regEmail,
                email: regEmail,
                password: regPassword,
            });
            toast.success("Hesap oluşturuldu! Giriş yapabilirsiniz.");
            setActiveTab("login");
        } catch (error: any) {
            toast.error(error.response?.data?.message ?? error.response?.data ?? "Kayıt başarısız.");
        } finally {
            setRegLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen">
            {/* ── Sol Sidebar ── */}
            <aside className="hidden lg:flex w-100 shrink-0 flex-col bg-[#1c1510] text-white px-10 pt-12 pb-8">
                <div className="flex items-center gap-3 mb-6">
                    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                        <circle cx="16" cy="16" r="14" stroke="#C8A96E" strokeWidth="2"/>
                        <circle cx="16" cy="16" r="6" fill="#C8A96E"/>
                        <circle cx="16" cy="16" r="10" stroke="#C8A96E" strokeWidth="1" strokeDasharray="3 4"/>
                    </svg>
                </div>

                <h1 className="text-4xl font-serif font-bold leading-none tracking-[0.5px]">
                    RestaurantBill
                </h1>
                <p className="text-[13px] italic mt-1.5" style={{ color: "rgba(242,237,228,0.45)" }}>Restoran Yönetim Sistemi</p>

                <div className="w-10 h-0.5 my-7" style={{ background: "rgba(200,169,110,0.4)" }} />

                <ul className="space-y-1 flex-1">
                    {SIDEBAR_FEATURES.map((feature) => (
                        <li key={feature} className="flex items-center gap-2.5 py-1">
                            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "rgba(200,169,110,0.6)" }} />
                            <span className="text-[13px]" style={{ color: "rgba(242,237,228,0.6)" }}>{feature}</span>
                        </li>
                    ))}
                </ul>

                <button
                    onClick={() => setTheme(isDark ? "light" : "dark")}
                    className={`relative inline-flex h-5.5 w-10.5 items-center rounded-full transition-colors duration-300 focus:outline-none ${
                        isDark ? "bg-blue-500" : "bg-white/15"
                    }`}
                >
                    <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-all duration-200 ${
                            isDark ? "translate-x-5.75" : "translate-x-0.75"
                        }`}
                    />
                </button>
            </aside>

            {/* ── Sağ Alan ── */}
            <main className="flex-1 bg-[#f5f0e8] dark:bg-[#18140f] flex items-center justify-center p-10">
                <div className="w-full max-w-115 bg-[#fdfaf5] dark:bg-[#221d16] rounded-2xl border border-[#e8e0d0] dark:border-[#3d3528] shadow-[0_24px_64px_rgba(0,0,0,0.08)] dark:shadow-[0_24px_64px_rgba(0,0,0,0.4)] overflow-hidden">

                    {/* Tabs */}
                    <div className="flex border-b border-[#e8e0d0] dark:border-[#3d3528] px-6 relative">
                        {(["login", "register"] as TabType[]).map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`flex-1 py-4 text-[13px] font-semibold transition-colors relative z-10 ${
                                    activeTab === tab
                                        ? "text-gray-900 dark:text-[#f2ede4]"
                                        : "text-[#a39080] dark:text-[#7a6e60] hover:text-gray-600 dark:hover:text-[#a89880]"
                                }`}
                            >
                                {tab === "login" ? "Giriş Yap" : "Kayıt Ol"}
                            </button>
                        ))}
                        <div
                            className={`absolute bottom-0 h-0.5 w-1/2 bg-blue-500 rounded-t-sm transition-all duration-250 ease-in-out ${
                                activeTab === "login" ? "left-0" : "left-1/2"
                            }`}
                        />
                    </div>

                    <div className="px-7 pt-7 pb-6">
                        {/* ── GİRİŞ FORMU ── */}
                        {activeTab === "login" && (
                            <form onSubmit={handleLogin} className="space-y-4.5">
                                <div>
                                    <h2 className="text-[26px] font-serif font-bold leading-[1.1] text-gray-900 dark:text-[#f2ede4]">
                                        Tekrar Hoşgeldiniz
                                    </h2>
                                    <p className="text-[13px] mt-1" style={{ color: "#a39080" }}>
                                        Devam etmek için giriş yapın
                                    </p>
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[11px] font-bold uppercase tracking-[0.5px]" style={{ color: "#a39080" }}>
                                        KULLANICI ADI
                                    </label>
                                    <Input
                                        value={loginField}
                                        onChange={(e) => setLoginField(e.target.value)}
                                        placeholder="kullanici_adi"
                                        className="border-[#e8e0d0] dark:border-[#3d3528] dark:bg-white/5 dark:text-[#f2ede4] focus:border-blue-400 rounded-2.5 h-11 text-sm"
                                    />
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[11px] font-bold uppercase tracking-[0.5px]" style={{ color: "#a39080" }}>
                                            ŞİFRE
                                        </label>
                                        <button type="button" className="text-[11px] font-semibold text-blue-500 hover:underline">
                                            Şifremi unuttum
                                        </button>
                                    </div>
                                    <div className="relative">
                                        <Input
                                            type={showLoginPassword ? "text" : "password"}
                                            value={loginPassword}
                                            onChange={(e) => setLoginPassword(e.target.value)}
                                            placeholder="Şifreniz..."
                                            className="border-[#e8e0d0] dark:border-[#3d3528] dark:bg-white/5 dark:text-[#f2ede4] focus:border-blue-400 rounded-2.5 h-11 pr-10 text-sm"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowLoginPassword(!showLoginPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#a39080] hover:text-gray-600"
                                        >
                                            {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>

                                <Button
                                    type="submit"
                                    disabled={loginLoading}
                                    className="w-full h-11.5 rounded-xl bg-[#2b7fff] hover:bg-blue-600 text-white font-bold text-sm mt-0.5"
                                >
                                    {loginLoading ? "Giriş yapılıyor..." : "Giriş Yap"}
                                </Button>

                                <p className="text-center text-[13px]" style={{ color: "#a39080" }}>
                                    Hesabınız yok mu?{" "}
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab("register")}
                                        className="text-blue-500 font-semibold hover:underline"
                                    >
                                        Kayıt olun
                                    </button>
                                </p>
                            </form>
                        )}

                        {/* ── KAYIT FORMU ── */}
                        {activeTab === "register" && (
                            <form onSubmit={handleRegister} className="space-y-4.5">
                                <div>
                                    <h2 className="text-[26px] font-serif font-bold leading-[1.1] text-gray-900 dark:text-[#f2ede4]">
                                        Hesap Oluştur
                                    </h2>
                                    <p className="text-[13px] mt-1" style={{ color: "#a39080" }}>
                                        Sisteme katılmak için kayıt olun
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[11px] font-bold uppercase tracking-[0.5px]" style={{ color: "#a39080" }}>
                                            AD
                                        </label>
                                        <Input
                                            value={firstName}
                                            onChange={(e) => setFirstName(e.target.value)}
                                            placeholder="Adınız..."
                                            className="border-[#e8e0d0] dark:border-[#3d3528] dark:bg-white/5 dark:text-[#f2ede4] focus:border-blue-400 rounded-2.5 h-11 text-sm"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[11px] font-bold uppercase tracking-[0.5px]" style={{ color: "#a39080" }}>
                                            SOYAD
                                        </label>
                                        <Input
                                            value={lastName}
                                            onChange={(e) => setLastName(e.target.value)}
                                            placeholder="Soyadınız..."
                                            className="border-[#e8e0d0] dark:border-[#3d3528] dark:bg-white/5 dark:text-[#f2ede4] focus:border-blue-400 rounded-2.5 h-11 text-sm"
                                        />
                                    </div>
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[11px] font-bold uppercase tracking-[0.5px]" style={{ color: "#a39080" }}>
                                        E-POSTA
                                    </label>
                                    <Input
                                        type="email"
                                        value={regEmail}
                                        onChange={(e) => setRegEmail(e.target.value)}
                                        placeholder="ornek@restoran.com"
                                        className="border-[#e8e0d0] dark:border-[#3d3528] dark:bg-white/5 dark:text-[#f2ede4] focus:border-blue-400 rounded-2.5 h-11 text-sm"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[11px] font-bold uppercase tracking-[0.5px]" style={{ color: "#a39080" }}>
                                            ŞİFRE
                                        </label>
                                        <div className="relative">
                                            <Input
                                                type={showRegPassword ? "text" : "password"}
                                                value={regPassword}
                                                onChange={(e) => setRegPassword(e.target.value)}
                                                placeholder="Şifreniz..."
                                                className="border-[#e8e0d0] dark:border-[#3d3528] dark:bg-white/5 dark:text-[#f2ede4] focus:border-blue-400 rounded-2.5 h-11 pr-10 text-sm"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowRegPassword(!showRegPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#a39080] hover:text-gray-600"
                                            >
                                                {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[11px] font-bold uppercase tracking-[0.5px]" style={{ color: "#a39080" }}>
                                            ŞİFRE TEKRAR
                                        </label>
                                        <Input
                                            type="password"
                                            value={regConfirm}
                                            onChange={(e) => setRegConfirm(e.target.value)}
                                            placeholder="Tekrar girin..."
                                            className="border-[#e8e0d0] dark:border-[#3d3528] dark:bg-white/5 dark:text-[#f2ede4] focus:border-blue-400 rounded-2.5 h-11 text-sm"
                                        />
                                    </div>
                                </div>

                                <Button
                                    type="submit"
                                    disabled={regLoading}
                                    className="w-full h-11.5 rounded-xl bg-[#2b7fff] hover:bg-blue-600 text-white font-bold text-sm mt-0.5"
                                >
                                    {regLoading ? "Hesap oluşturuluyor..." : "Hesap Oluştur"}
                                </Button>

                                <p className="text-center text-[13px]" style={{ color: "#a39080" }}>
                                    Zaten hesabınız var mı?{" "}
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab("login")}
                                        className="text-blue-500 font-semibold hover:underline"
                                    >
                                        Giriş yapın
                                    </button>
                                </p>
                            </form>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
