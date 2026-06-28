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
            <aside className="hidden lg:flex w-80 shrink-0 flex-col bg-[#1c1917] text-white p-8">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-full border-2 border-amber-400 flex items-center justify-center">
                        <div className="w-4 h-4 rounded-full border-2 border-amber-400" />
                    </div>
                </div>

                <h1 className="text-3xl font-serif font-bold leading-tight">
                    RestaurantBill
                </h1>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Restoran Yönetim Sistemi</p>

                <div className="w-8 h-0.5 bg-amber-400 mt-5 mb-8" />

                <ul className="space-y-4 flex-1">
                    {SIDEBAR_FEATURES.map((feature) => (
                        <li key={feature} className="flex items-center gap-3 text-sm text-gray-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                            {feature}
                        </li>
                    ))}
                </ul>

                <button
                    onClick={() => setTheme(isDark ? "light" : "dark")}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none ${
                        isDark ? "bg-blue-500" : "bg-gray-600"
                    }`}
                >
                    <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
                            isDark ? "translate-x-6" : "translate-x-1"
                        }`}
                    />
                </button>
            </aside>

            {/* ── Sağ Alan ── */}
            <main className="flex-1 bg-[#f5f0e8] dark:bg-[#0f0e0d] flex items-center justify-center p-6">
                <div className="w-full max-w-md bg-white dark:bg-[#1c1917] rounded-2xl shadow-sm overflow-hidden">

                    {/* Tabs */}
                    <div className="flex border-b border-gray-100 dark:border-gray-700">
                        {(["login", "register"] as TabType[]).map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`flex-1 py-4 text-sm font-medium transition-colors ${
                                    activeTab === tab
                                        ? "text-gray-900 dark:text-white border-b-2 border-blue-500"
                                        : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                }`}
                            >
                                {tab === "login" ? "Giriş Yap" : "Kayıt Ol"}
                            </button>
                        ))}
                    </div>

                    <div className="p-8">
                        {/* ── GİRİŞ FORMU ── */}
                        {activeTab === "login" && (
                            <form onSubmit={handleLogin} className="space-y-5">
                                <div>
                                    <h2 className="text-2xl font-serif font-bold text-gray-900 dark:text-white">
                                        Tekrar Hoşgeldiniz
                                    </h2>
                                    <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                                        Devam etmek için giriş yapın
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5">
                                        KULLANICI ADI
                                    </label>
                                    <Input
                                        value={loginField}
                                        onChange={(e) => setLoginField(e.target.value)}
                                        placeholder="kullanici_adi"
                                        className="border-gray-200 dark:border-gray-600 dark:bg-[#252220] dark:text-white focus:border-blue-400 rounded-xl h-11"
                                    />
                                </div>

                                <div>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <label className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                                            ŞİFRE
                                        </label>
                                        <button type="button" className="text-xs text-blue-500 hover:underline">
                                            Şifremi unuttum
                                        </button>
                                    </div>
                                    <div className="relative">
                                        <Input
                                            type={showLoginPassword ? "text" : "password"}
                                            value={loginPassword}
                                            onChange={(e) => setLoginPassword(e.target.value)}
                                            placeholder="Şifreniz..."
                                            className="border-gray-200 dark:border-gray-600 dark:bg-[#252220] dark:text-white focus:border-blue-400 rounded-xl h-11 pr-10"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowLoginPassword(!showLoginPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                        >
                                            {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>

                                <Button
                                    type="submit"
                                    disabled={loginLoading}
                                    className="w-full h-11 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-semibold text-sm"
                                >
                                    {loginLoading ? "Giriş yapılıyor..." : "Giriş Yap"}
                                </Button>

                                <p className="text-center text-sm text-gray-400 dark:text-gray-500">
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
                            <form onSubmit={handleRegister} className="space-y-5">
                                <div>
                                    <h2 className="text-2xl font-serif font-bold text-gray-900 dark:text-white">
                                        Hesap Oluştur
                                    </h2>
                                    <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                                        Sisteme katılmak için kayıt olun
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5">
                                            AD
                                        </label>
                                        <Input
                                            value={firstName}
                                            onChange={(e) => setFirstName(e.target.value)}
                                            placeholder="Adınız..."
                                            className="border-gray-200 dark:border-gray-600 dark:bg-[#252220] dark:text-white focus:border-blue-400 rounded-xl h-11"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5">
                                            SOYAD
                                        </label>
                                        <Input
                                            value={lastName}
                                            onChange={(e) => setLastName(e.target.value)}
                                            placeholder="Soyadınız..."
                                            className="border-gray-200 dark:border-gray-600 dark:bg-[#252220] dark:text-white focus:border-blue-400 rounded-xl h-11"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5">
                                        E-POSTA
                                    </label>
                                    <Input
                                        type="email"
                                        value={regEmail}
                                        onChange={(e) => setRegEmail(e.target.value)}
                                        placeholder="ornek@restoran.com"
                                        className="border-gray-200 dark:border-gray-600 dark:bg-[#252220] dark:text-white focus:border-blue-400 rounded-xl h-11"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5">
                                            ŞİFRE
                                        </label>
                                        <div className="relative">
                                            <Input
                                                type={showRegPassword ? "text" : "password"}
                                                value={regPassword}
                                                onChange={(e) => setRegPassword(e.target.value)}
                                                placeholder="Şifreniz..."
                                                className="border-gray-200 dark:border-gray-600 dark:bg-[#252220] dark:text-white focus:border-blue-400 rounded-xl h-11 pr-10"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowRegPassword(!showRegPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                            >
                                                {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5">
                                            ŞİFRE TEKRAR
                                        </label>
                                        <Input
                                            type="password"
                                            value={regConfirm}
                                            onChange={(e) => setRegConfirm(e.target.value)}
                                            placeholder="Tekrar girin..."
                                            className="border-gray-200 dark:border-gray-600 dark:bg-[#252220] dark:text-white focus:border-blue-400 rounded-xl h-11"
                                        />
                                    </div>
                                </div>

                                <Button
                                    type="submit"
                                    disabled={regLoading}
                                    className="w-full h-11 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-semibold text-sm"
                                >
                                    {regLoading ? "Hesap oluşturuluyor..." : "Hesap Oluştur"}
                                </Button>

                                <p className="text-center text-sm text-gray-400 dark:text-gray-500">
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
