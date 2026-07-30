import { Link } from "react-router-dom";
import { useTheme } from "next-themes";
import { useState } from "react";

const ACCENT = { color: "var(--rb-accent)", bg: "var(--rb-accent-bg)" };
const GREEN = { color: "var(--rb-green)", bg: "var(--rb-green-bg)" };
const AMBER = { color: "var(--rb-amber)", bg: "var(--rb-amber-bg)" };
const PURPLE = { color: "var(--rb-purple)", bg: "var(--rb-purple-bg)" };
const ORANGE = { color: "#F07840", bg: "rgba(240,120,64,0.1)", border: "rgba(240,120,64,0.25)" };

const MOCK_ACCENT = "#5C9FFF";
const MOCK_GREEN = "#45C87A";
const MOCK_AMBER = "#E8B835";

const NAV_LINKS = [
    { label: "Özellikler", href: "#features" },
    { label: "Nasıl Çalışır", href: "#how" },
    { label: "Roller", href: "#roles" },
    { label: "Fiyatlandırma", href: "#pricing" },
];

const HERO_STATS = [
    { num: "500+", label: "Aktif Restoran" },
    { num: "2M+", label: "Aylık Sipariş" },
    { num: "%99", label: "Uptime" },
];

const MOCK_TABLES = [
    { num: "01", badge: "Dolu", amount: "₺240", ...ORANGE },
    { num: "02", badge: "Boş", amount: null, color: MOCK_GREEN, bg: "rgba(69,200,122,0.08)", border: "rgba(69,200,122,0.2)" },
    { num: "03", badge: "Dolu", amount: "₺185", ...ORANGE },
    { num: "04", badge: "Rezerve", amount: null, color: MOCK_AMBER, bg: "rgba(232,184,53,0.08)", border: "rgba(232,184,53,0.2)" },
    { num: "05", badge: "Dolu", amount: "₺420", ...ORANGE },
    { num: "06", badge: "Boş", amount: null, color: MOCK_GREEN, bg: "rgba(69,200,122,0.08)", border: "rgba(69,200,122,0.2)" },
    { num: "07", badge: "Dolu", amount: "₺890", ...ORANGE },
    { num: "08", badge: "Rezerve", amount: null, color: MOCK_AMBER, bg: "rgba(232,184,53,0.08)", border: "rgba(232,184,53,0.2)" },
    { num: "09", badge: "Dolu", amount: "₺315", ...ORANGE },
];

const TRUST_BRANDS = ["Çınar Mutfak", "Teras Brasserie", "Sultan Sofrası", "Bosphorus Grill", "Meze & More"];

const FEATURES = [
    { icon: "◎", name: "Garson Ekranı", desc: "Masa durumunu anlık görün, sipariş oluşturun ve gönderin. Tıkla, seç, gönder.", roleTag: "Garson", accent: ACCENT },
    { icon: "◈", name: "Mutfak Ekranı", desc: "Kanban tarzı iş akışı. Bekliyor → Hazırlanıyor → Hazır. 15dk+ siparişlerde uyarı.", roleTag: "Mutfak", accent: AMBER },
    { icon: "◉", name: "Kasiyer Paneli", desc: "Hesap yönetimi, nakit/kart/QR ödeme, para üstü hesabı ve işlem geçmişi.", roleTag: "Kasiyer", accent: GREEN },
    { icon: "▤", name: "Admin Dashboard", desc: "Çalışan, masa, menü yönetimi. Doluluk istatistikleri ve günlük ciro özeti.", roleTag: "Admin", accent: PURPLE },
    { icon: "○", name: "Dark / Light Mod", desc: "Göz yormayan karanlık mod. Mutfak gibi parlak ortamlar için açık mod seçeneği.", roleTag: "Tüm Roller", neutral: true },
    { icon: "⇄", name: "Gerçek Zamanlı Senkronizasyon", desc: "SignalR ile garson, mutfak ve kasiyer ekranları arasında anlık, canlı güncelleme.", roleTag: "Tüm Roller", neutral: true },
];

const STEPS = [
    { num: "01", title: "Kaydolun", desc: "Ücretsiz deneme ile hemen başlayın. Kredi kartı gerekmez." },
    { num: "02", title: "Rollerinizi Kurun", desc: "Garson, kasiyer, mutfak ve admin hesapları oluşturun." },
    { num: "03", title: "Masaları & Menüyü Ekleyin", desc: "Masa yerleşimini ve menünüzü birkaç dakikada tanımlayın." },
    { num: "04", title: "Kullanmaya Başlayın", desc: "Tüm personel aynı anda bağlanır. Siparişler gerçek zamanlı akar." },
];

const ROLES = [
    {
        icon: "◎", name: "Garson", accent: ACCENT,
        desc: "Masaları görür, sipariş alır ve mutfağa gönderir.",
        feats: ["Masa grid görünümü", "Yeni sipariş oluşturma", "Menü kategori filtresi"],
    },
    {
        icon: "◈", name: "Mutfak", accent: AMBER,
        desc: "Gelen siparişleri kanban tablosunda yönetir.",
        feats: ["Bekliyor / Hazırlanıyor / Hazır kolonları", "Gecikme uyarısı (15dk+)", "Anlık güncelleme"],
    },
    {
        icon: "◉", name: "Kasiyer", accent: GREEN,
        desc: "Hesap kapatır, ödeme alır, işlem geçmişini görür.",
        feats: ["Nakit / Kart / QR ödeme", "Para üstü hesabı", "Günlük ciro özeti"],
    },
    {
        icon: "◇", name: "Admin", accent: PURPLE,
        desc: "Tüm sistemi yönetir. Çalışan, masa, menü ve raporlar.",
        feats: ["Çalışan & yetki yönetimi", "Menü ürünleri & kategoriler", "Genel bakış dashboard"],
    },
];

const TESTIMONIALS = [
    { text: "Mutfak ekranı gerçekten hayat kurtardı. Garsonların not kağıdı koşturmakla vakit kaybetmesi bitti.", name: "Ahmet Yılmaz", rest: "Çınar Mutfak, İstanbul", initial: "A" },
    { text: "Admin paneli sayesinde tüm şubeleri tek yerden takip ediyoruz. Raporlar çok net ve anlaşılır.", name: "Selin Öztürk", rest: "Teras Brasserie, Ankara", initial: "S" },
    { text: "Kasiyer ekranında ödeme almak çok kolay. Müşteri bekletme süresi yarıya indi, şikayetler bitti.", name: "Mehmet Arslan", rest: "Bosphorus Grill, İzmir", initial: "M" },
];

type Feature = { text: string; inc: boolean };

type PlanDef = {
    key: string;
    name: string;
    icon: string;
    desc: string;
    priceMonthly: number;
    priceAnnual: number;
    accent: typeof GREEN;
    isPopular: boolean;
    features: Feature[];
};

const PLAN_DEFS: PlanDef[] = [
    {
        key: "starter",
        name: "Başlangıç",
        icon: "◎",
        desc: "Küçük işletmeler için temel özellikler",
        priceMonthly: 499,
        priceAnnual: 399,
        accent: GREEN,
        isPopular: false,
        features: [
            { text: "Garson sipariş yönetimi", inc: true },
            { text: "Mutfak ekranı", inc: true },
            { text: "Temel kasa & ödeme", inc: true },
            { text: "10 masa", inc: true },
            { text: "2 kullanıcı hesabı", inc: true },
            { text: "Admin paneli", inc: false },
            { text: "Raporlar & analitik", inc: false },
            { text: "7/24 destek", inc: false },
        ],
    },
    {
        key: "pro",
        name: "Profesyonel",
        icon: "◈",
        desc: "Büyüyen restoranlar için tam kapsamlı",
        priceMonthly: 999,
        priceAnnual: 799,
        accent: ACCENT,
        isPopular: true,
        features: [
            { text: "Garson sipariş yönetimi", inc: true },
            { text: "Mutfak ekranı", inc: true },
            { text: "Gelişmiş kasa & ödeme", inc: true },
            { text: "Sınırsız masa", inc: true },
            { text: "10 kullanıcı hesabı", inc: true },
            { text: "Admin paneli & raporlar", inc: true },
            { text: "Rezervasyon yönetimi", inc: true },
            { text: "E-posta desteği", inc: true },
        ],
    },
    {
        key: "enterprise",
        name: "Kurumsal",
        icon: "◉",
        desc: "Zincir restoranlar ve büyük işletmeler",
        priceMonthly: 2499,
        priceAnnual: 1999,
        accent: AMBER,
        isPopular: false,
        features: [
            { text: "Tüm Pro özellikler", inc: true },
            { text: "Çoklu şube yönetimi", inc: true },
            { text: "Özel entegrasyonlar", inc: true },
            { text: "Sınırsız kullanıcı", inc: true },
            { text: "Özel onboarding", inc: true },
            { text: "SLA garantisi", inc: true },
            { text: "7/24 telefon desteği", inc: true },
            { text: "Özel geliştirme", inc: true },
        ],
    },
];

const TABLE_ROW_DEFS: { feature: string; values: string[] }[] = [
    { feature: "Masa kapasitesi", values: ["10", "Sınırsız", "Sınırsız"] },
    { feature: "Kullanıcı hesabı", values: ["2", "10", "Sınırsız"] },
    { feature: "Garson ekranı", values: ["✓", "✓", "✓"] },
    { feature: "Mutfak ekranı", values: ["✓", "✓", "✓"] },
    { feature: "Kasa & ödeme", values: ["Temel", "Gelişmiş", "Gelişmiş"] },
    { feature: "Admin paneli", values: ["—", "✓", "✓"] },
    { feature: "Raporlar", values: ["—", "✓", "✓"] },
    { feature: "Çoklu şube", values: ["—", "—", "✓"] },
    { feature: "Destek", values: ["—", "E-posta", "7/24 Telefon"] },
];

const FAQ_DEFS: { q: string; a: string }[] = [
    { q: "Ücretsiz deneme süresi var mı?", a: "Evet, tüm planlarda 14 gün ücretsiz deneme sunuyoruz. Kredi kartı gerekmez." },
    { q: "İstediğim zaman plan değiştirebilir miyim?", a: "Evet, her zaman üst ya da alt plana geçiş yapabilirsiniz. Fark tutarı yansıtılır." },
    { q: "Faturalama nasıl çalışır?", a: "Aylık planlar her ay, yıllık planlar yılda bir faturalandırılır. İptal her zaman mümkündür." },
    { q: "Kurumsal plan için fiyat nasıl belirlenir?", a: "Kurumsal fiyatlandırma şube sayısı, kullanıcı sayısı ve özel gereksinimlere göre belirlenir." },
];

export default function LandingPage() {
    const { theme, setTheme } = useTheme();
    const isDark = theme === "dark";
    const [billing, setBilling] = useState<"monthly" | "annual">("monthly");
    const isAnnual = billing === "annual";

    return (
        <div className="min-h-screen bg-[#f5f0e8] dark:bg-[#18140f] text-[#2a1f14] dark:text-[#f2ede4] font-sans">
            {/* ── NAVBAR ── */}
            <nav className="sticky top-0 z-50 backdrop-blur-md bg-[#f5f0e8]/96 dark:bg-[#18140f]/96 border-b border-[#e8e0d0] dark:border-[#3d3528] px-6 md:px-15 py-3.5 flex items-center justify-between gap-6">
                <Link to="/" className="flex items-center gap-2.5 shrink-0">
                    <div className="w-8 h-8 rounded-lg bg-[rgba(200,169,110,0.1)] border border-[rgba(200,169,110,0.25)] flex items-center justify-center">
                        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                            <circle cx="9" cy="9" r="8" stroke="#C8A96E" strokeWidth="1.5" />
                            <circle cx="9" cy="9" r="3.5" fill="#C8A96E" />
                        </svg>
                    </div>
                    <span className="font-serif text-xl font-bold">RestaurantBill</span>
                </Link>

                <div className="hidden lg:flex items-center gap-7 flex-1 justify-center">
                    {NAV_LINKS.map((link) => (
                        <a
                            key={link.label}
                            href={link.href}
                            className="text-[13px] font-medium text-[#6b5e52] dark:text-[#a89880] hover:text-[#2a1f14] dark:hover:text-[#f2ede4] transition-colors"
                        >
                            {link.label}
                        </a>
                    ))}
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                    <button
                        onClick={() => setTheme(isDark ? "light" : "dark")}
                        className={`relative inline-flex h-5 w-9.5 items-center rounded-full transition-colors duration-300 focus:outline-none shrink-0 ${
                            isDark ? "bg-rb-accent" : "bg-black/10"
                        }`}
                    >
                        <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-all duration-200 ${
                                isDark ? "translate-x-5" : "translate-x-0.5"
                            }`}
                        />
                    </button>
                    <Link to="/login" className="px-4 py-1.75 rounded-lg bg-[#C8A96E] text-[13px] font-bold text-[#1c1510] hover:opacity-90 transition-opacity">
                        Giriş Yap
                    </Link>
                </div>
            </nav>

            {/* ── HERO ── */}
            <section
                className="px-6 md:px-15 pt-16 md:pt-24 pb-20 grid grid-cols-1 lg:grid-cols-2 gap-14 items-center relative overflow-hidden"
                style={{
                    background: isDark
                        ? "linear-gradient(160deg, #0A0804 0%, #18140F 50%, #0E0B08 100%)"
                        : "linear-gradient(160deg, #1C1510 0%, #2E2218 50%, #1C1510 100%)",
                }}
            >
                <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="inline-flex items-center gap-2 self-start rounded-full px-3.5 py-1.25 bg-[rgba(200,169,110,0.12)] border border-[rgba(200,169,110,0.25)]">
                        <div className="w-1.75 h-1.75 rounded-full bg-[#C8A96E] animate-pulse" />
                        <span className="text-[11px] font-bold tracking-[0.3px] text-[#C8A96E]">🍽 RESTORAN YÖNETİM SİSTEMİ</span>
                    </div>

                    <h1 className="font-serif text-[42px] md:text-[62px] font-bold leading-[1.05] tracking-[-0.5px] text-[#f2ede4]">
                        Restoranınızı
                        <br />
                        <em className="italic text-[#C8A96E]">Kusursuz Yönetin</em>
                    </h1>
                    <p className="text-[15px] leading-relaxed max-w-110" style={{ color: "rgba(242,237,228,0.55)" }}>
                        Garson, mutfak, kasiyer ve admin için birbirinden bağımsız ama tam entegre ekranlar. Tek platform, dört rol, sıfır karışıklık.
                    </p>

                    <div className="flex gap-3 items-center flex-wrap">
                        <Link to="/login" className="px-7 py-3.5 rounded-xl bg-[#C8A96E] text-[#1c1510] text-sm font-bold hover:opacity-90 transition-opacity">
                            14 Gün Ücretsiz Dene →
                        </Link>
                        <a
                            href="#pricing"
                            className="px-7 py-3.5 rounded-xl border text-sm font-semibold"
                            style={{ borderColor: "rgba(255,255,255,0.18)", color: "rgba(242,237,228,0.8)" }}
                        >
                            Fiyatları İncele
                        </a>
                    </div>

                    <div className="flex items-center mt-2">
                        {HERO_STATS.map((stat, i) => (
                            <div key={stat.label} className="flex items-center">
                                <div className="flex flex-col gap-0.75">
                                    <div className="font-serif text-[28px] font-bold leading-none text-[#f2ede4]">{stat.num}</div>
                                    <div className="text-[11px] font-medium tracking-[0.3px]" style={{ color: "rgba(242,237,228,0.4)" }}>
                                        {stat.label}
                                    </div>
                                </div>
                                {i < HERO_STATS.length - 1 && (
                                    <div className="w-px h-8 mx-6 shrink-0" style={{ background: "rgba(255,255,255,0.12)" }} />
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Floating dashboard mockup */}
                <div className="relative animate-in fade-in duration-1000 delay-300">
                    <div
                        className="rounded-2xl overflow-hidden border border-white/10 animate-[float_4s_ease-in-out_infinite]"
                        style={{ background: "#0E0B08", boxShadow: "0 32px 80px rgba(0,0,0,0.6)" }}
                    >
                        <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-white/7">
                            <div className="flex gap-1.25">
                                <div className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" />
                                <div className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E]" />
                                <div className="w-2.5 h-2.5 rounded-full bg-[#28C840]" />
                            </div>
                            <div className="flex gap-1">
                                <div className="px-2.5 py-1 rounded-md text-[10px] font-bold" style={{ background: "rgba(43,127,255,0.2)", color: MOCK_ACCENT }}>
                                    Garson
                                </div>
                                <div className="px-2.5 py-1 rounded-md text-[10px] font-medium" style={{ color: "rgba(242,237,228,0.35)" }}>
                                    Mutfak
                                </div>
                                <div className="px-2.5 py-1 rounded-md text-[10px] font-medium" style={{ color: "rgba(242,237,228,0.35)" }}>
                                    Kasiyer
                                </div>
                            </div>
                            <div className="flex items-center gap-1.25">
                                <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: MOCK_GREEN }} />
                                <span className="text-[10px]" style={{ color: "rgba(242,237,228,0.5)" }}>
                                    Canlı
                                </span>
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-1.5 p-3">
                            {MOCK_TABLES.map((t) => (
                                <div
                                    key={t.num}
                                    className="rounded-lg px-2.5 py-2 flex flex-col gap-1"
                                    style={{ background: t.bg, border: `1px solid ${t.border}` }}
                                >
                                    <div className="font-serif text-sm font-bold" style={{ color: "rgba(242,237,228,0.9)" }}>
                                        {t.num}
                                    </div>
                                    <div className="text-[9px] font-bold uppercase tracking-[0.5px]" style={{ color: t.color }}>
                                        {t.badge}
                                    </div>
                                    {t.amount && (
                                        <div className="font-serif text-[13px] font-bold" style={{ color: "rgba(242,237,228,0.85)" }}>
                                            {t.amount}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div
                        className="hidden md:flex absolute -top-4 -right-6 items-center gap-2 rounded-xl px-3.5 py-2.5 min-w-45 backdrop-blur-sm animate-[float_4s_ease-in-out_infinite]"
                        style={{
                            background: "var(--rb-surface2)",
                            border: "1px solid var(--rb-border)",
                            boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
                            animationDelay: "0.5s",
                        }}
                    >
                        <div className="w-2 h-2 rounded-full shrink-0 animate-pulse" style={{ background: MOCK_GREEN }} />
                        <span className="text-[11px] font-semibold whitespace-nowrap">Masa 7 → Sipariş gönderildi</span>
                    </div>
                    <div
                        className="hidden md:flex absolute bottom-5 -right-7 items-center gap-2 rounded-xl px-3.5 py-2.5 min-w-45 backdrop-blur-sm animate-[float_4s_ease-in-out_infinite]"
                        style={{
                            background: "var(--rb-surface2)",
                            border: "1px solid var(--rb-border)",
                            boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
                            animationDelay: "1s",
                        }}
                    >
                        <div className="w-2 h-2 rounded-full shrink-0 animate-pulse" style={{ background: MOCK_ACCENT }} />
                        <span className="text-[11px] font-semibold whitespace-nowrap">Masa 3 → Hazır! Servis bekliyor</span>
                    </div>
                </div>
            </section>

            {/* ── TRUST BAR ── */}
            <div className="px-6 md:px-15 py-5.5 border-t border-b border-[#e8e0d0] dark:border-[#3d3528] bg-black/2 dark:bg-white/1 flex items-center gap-8 flex-wrap">
                <span className="text-[11px] font-bold tracking-[0.6px] uppercase text-[#a39080] dark:text-[#7a6e60] shrink-0">
                    Güvenen Restoranlar
                </span>
                <div className="flex gap-7 items-center flex-wrap">
                    {TRUST_BRANDS.map((brand) => (
                        <span key={brand} className="font-serif text-base font-semibold tracking-[0.3px] text-[#a39080] dark:text-[#7a6e60]">
                            {brand}
                        </span>
                    ))}
                </div>
            </div>

            {/* ── FEATURES ── */}
            <section id="features" className="px-6 md:px-15 py-20 bg-[#f5f0e8] dark:bg-[#18140f] [content-visibility:auto] [contain-intrinsic-size:auto_900px]">
                <div className="text-center mb-13">
                    <div
                        className="inline-block rounded-full px-3.5 py-1 text-[11px] font-bold tracking-[0.6px] uppercase mb-4"
                        style={{ background: ACCENT.bg, color: ACCENT.color }}
                    >
                        Özellikler
                    </div>
                    <h2 className="font-serif text-3xl md:text-[44px] font-bold leading-tight whitespace-pre-line">
                        {"Her Rol İçin\nDoğru Araç"}
                    </h2>
                    <p className="text-[15px] leading-relaxed max-w-130 mx-auto mt-3 text-[#a39080] dark:text-[#7a6e60]">
                        Dört farklı rol, dört optimize edilmiş ekran. Herkes kendi işine odaklanır.
                    </p>
                </div>

                <div className="max-w-275 mx-auto grid grid-cols-1 md:grid-cols-3 gap-4">
                    {FEATURES.map((feat) => {
                        const color = feat.neutral ? "var(--rb-neutral)" : feat.accent!.color;
                        const colorBg = feat.neutral ? "var(--rb-neutral-bg)" : feat.accent!.bg;
                        return (
                            <div
                                key={feat.name}
                                className="rounded-2xl p-6 flex flex-col gap-3 border border-[#e8e0d0] dark:border-[#3d3528] bg-white dark:bg-[#2a2318] transition-transform hover:-translate-y-1"
                            >
                                <div className="w-12 h-12 rounded-[13px] flex items-center justify-center text-xl" style={{ background: colorBg, color }}>
                                    {feat.icon}
                                </div>
                                <div className="font-serif text-[17px] font-bold">{feat.name}</div>
                                <div className="text-[13px] leading-relaxed flex-1 text-[#a39080] dark:text-[#7a6e60]">{feat.desc}</div>
                                <div
                                    className="inline-block self-start rounded-md px-2.25 py-0.5 text-[10px] font-bold tracking-[0.4px]"
                                    style={{ background: colorBg, color }}
                                >
                                    {feat.roleTag}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* ── HOW IT WORKS ── */}
            <section id="how" className="px-6 md:px-15 py-20 bg-black/2 dark:bg-white/1 border-t border-b border-[#e8e0d0] dark:border-[#3d3528] [content-visibility:auto] [contain-intrinsic-size:auto_500px]">
                <div className="text-center mb-13">
                    <div
                        className="inline-block rounded-full px-3.5 py-1 text-[11px] font-bold tracking-[0.6px] uppercase mb-4"
                        style={{ background: ACCENT.bg, color: ACCENT.color }}
                    >
                        Nasıl Çalışır
                    </div>
                    <h2 className="font-serif text-3xl md:text-[44px] font-bold leading-tight whitespace-pre-line">
                        {"Dakikalar İçinde\nHazır Olun"}
                    </h2>
                </div>

                <div className="max-w-275 mx-auto grid grid-cols-1 md:grid-cols-4 gap-10 md:gap-0 relative">
                    {STEPS.map((step, i) => (
                        <div key={step.num} className="flex flex-col items-center text-center px-6 relative">
                            <div
                                className="w-13 h-13 rounded-full flex items-center justify-center font-serif text-xl font-bold mb-4 shrink-0 z-10 bg-[#C8A96E] text-[#1c1510]"
                            >
                                {step.num}
                            </div>
                            {i < STEPS.length - 1 && (
                                <div
                                    className="hidden md:block absolute top-6.5 h-0.5"
                                    style={{
                                        left: "calc(50% + 26px)",
                                        right: "calc(-50% + 26px)",
                                        background: "linear-gradient(to right, #C8A96E, rgba(200,169,110,0.15))",
                                    }}
                                />
                            )}
                            <div className="font-serif text-[17px] font-bold mb-2">{step.title}</div>
                            <div className="text-[13px] leading-relaxed text-[#a39080] dark:text-[#7a6e60]">{step.desc}</div>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── ROLES ── */}
            <section id="roles" className="px-6 md:px-15 py-20 bg-[#f5f0e8] dark:bg-[#18140f] [content-visibility:auto] [contain-intrinsic-size:auto_650px]">
                <div className="text-center mb-13">
                    <div
                        className="inline-block rounded-full px-3.5 py-1 text-[11px] font-bold tracking-[0.6px] uppercase mb-4"
                        style={{ background: ACCENT.bg, color: ACCENT.color }}
                    >
                        Roller
                    </div>
                    <h2 className="font-serif text-3xl md:text-[44px] font-bold leading-tight">Kim Ne Görür?</h2>
                    <p className="text-[15px] leading-relaxed max-w-130 mx-auto mt-3 text-[#a39080] dark:text-[#7a6e60]">
                        Her rol sadece kendi ihtiyacı olan ekranı görür. Karmaşıklık yok.
                    </p>
                </div>

                <div className="max-w-275 mx-auto grid grid-cols-1 md:grid-cols-4 gap-4">
                    {ROLES.map((role) => (
                        <div
                            key={role.name}
                            className="rounded-2xl p-5.5 flex flex-col gap-3 border border-[#e8e0d0] dark:border-[#3d3528] bg-white dark:bg-[#2a2318]"
                        >
                            <div
                                className="w-11.5 h-11.5 rounded-xl flex items-center justify-center text-xl"
                                style={{ background: role.accent.bg, color: role.accent.color }}
                            >
                                {role.icon}
                            </div>
                            <div className="font-serif text-[22px] font-bold">{role.name}</div>
                            <div className="text-[13px] leading-relaxed text-[#a39080] dark:text-[#7a6e60]">{role.desc}</div>
                            <div className="flex flex-col border-t border-[#e8e0d0] dark:border-[#3d3528] pt-2.5 mt-1">
                                {role.feats.map((f) => (
                                    <div key={f} className="flex items-center gap-1.75 py-1">
                                        <span className="text-[8px] shrink-0" style={{ color: role.accent.color }}>
                                            ▪
                                        </span>
                                        <span className="text-xs text-[#a39080] dark:text-[#7a6e60]">{f}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── TESTIMONIALS ── */}
            <section className="px-6 md:px-15 py-20 bg-black/2 dark:bg-white/1 border-t border-b border-[#e8e0d0] dark:border-[#3d3528] [content-visibility:auto] [contain-intrinsic-size:auto_500px]">
                <div className="text-center mb-13">
                    <h2 className="font-serif text-3xl md:text-[44px] font-bold leading-tight">Restoranlar Ne Diyor?</h2>
                </div>
                <div className="max-w-275 mx-auto grid grid-cols-1 md:grid-cols-3 gap-4">
                    {TESTIMONIALS.map((t) => (
                        <div key={t.name} className="rounded-2xl p-6 flex flex-col gap-4 border border-[#e8e0d0] dark:border-[#3d3528] bg-white dark:bg-[#2a2318]">
                            <div className="font-serif text-5xl leading-none h-8 overflow-hidden" style={{ color: ACCENT.color }}>
                                "
                            </div>
                            <div className="text-sm leading-relaxed italic flex-1 text-[#6b5e52] dark:text-[#a89880]">{t.text}</div>
                            <div className="flex items-center gap-3 mt-2">
                                <div
                                    className="w-9.5 h-9.5 rounded-full flex items-center justify-center text-sm font-extrabold shrink-0"
                                    style={{ background: ACCENT.bg, color: ACCENT.color }}
                                >
                                    {t.initial}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-bold">{t.name}</div>
                                    <div className="text-[11px] mt-0.5 text-[#a39080] dark:text-[#7a6e60]">{t.rest}</div>
                                </div>
                                <div className="text-sm tracking-[-1px]" style={{ color: AMBER.color }}>
                                    ★★★★★
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── PRICING ── */}
            <section id="pricing" className="px-6 md:px-15 py-20 bg-black/2 dark:bg-white/1 border-t border-b border-[#e8e0d0] dark:border-[#3d3528] [content-visibility:auto] [contain-intrinsic-size:auto_2200px]">
                <div className="text-center mb-11 flex flex-col items-center gap-5">
                    <div
                        className="inline-block rounded-full px-3.5 py-1 text-[11px] font-bold tracking-[0.6px] uppercase"
                        style={{ background: ACCENT.bg, color: ACCENT.color }}
                    >
                        Fiyatlandırma
                    </div>
                    <h2 className="font-serif text-3xl md:text-[44px] font-bold leading-tight whitespace-pre-line">
                        {"Restoranınız İçin\nDoğru Plan"}
                    </h2>
                    <p className="text-[15px] leading-relaxed max-w-130 text-[#a39080] dark:text-[#7a6e60]">
                        14 gün ücretsiz deneyin. Kredi kartı gerekmez. İstediğiniz zaman iptal edin.
                    </p>

                    {/* Billing toggle */}
                    <div className="flex items-center gap-3 px-4.5 py-2.5 rounded-full bg-black/5 dark:bg-white/6 border border-[#e8e0d0] dark:border-white/10">
                        <span
                            onClick={() => setBilling("monthly")}
                            className="text-[13px] cursor-pointer transition-all"
                            style={{ fontWeight: isAnnual ? 400 : 700 }}
                        >
                            Aylık
                        </span>
                        <div
                            onClick={() => setBilling(isAnnual ? "monthly" : "annual")}
                            className="relative w-9.5 h-5 rounded-full cursor-pointer shrink-0 transition-colors duration-300"
                            style={{ background: isAnnual ? GREEN.color : "var(--rb-toggle-track-off)" }}
                        >
                            <div
                                className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all duration-200"
                                style={{ left: isAnnual ? "20px" : "2px" }}
                            />
                        </div>
                        <span
                            onClick={() => setBilling("annual")}
                            className="text-[13px] cursor-pointer transition-all"
                            style={{ fontWeight: isAnnual ? 700 : 400 }}
                        >
                            Yıllık
                        </span>
                        <div className="rounded-full px-2.5 py-0.75 text-[11px] font-bold" style={{ background: GREEN.bg, color: GREEN.color }}>
                            %20 Tasarruf
                        </div>
                    </div>
                </div>

                {/* Plan cards */}
                <div className="max-w-275 mx-auto grid grid-cols-1 md:grid-cols-3 gap-5 items-start mb-16">
                    {PLAN_DEFS.map((plan) => {
                        const color = plan.accent.color;
                        const colorBg = plan.accent.bg;
                        const price = isAnnual ? plan.priceAnnual : plan.priceMonthly;
                        const saving = (plan.priceMonthly - plan.priceAnnual) * 12;

                        return (
                            <div
                                key={plan.key}
                                className={`relative overflow-hidden rounded-[20px] p-7 flex flex-col gap-3.5 border-2 ${
                                    plan.isPopular
                                        ? "bg-[#1c1510] dark:bg-[#0e0b08]"
                                        : "bg-white dark:bg-[#2a2318] border-[#e8e0d0] dark:border-[#3d3528]"
                                }`}
                                style={{
                                    borderColor: plan.isPopular ? color : undefined,
                                    boxShadow: plan.isPopular ? `0 20px 60px ${colorBg}` : "none",
                                }}
                            >
                                {plan.isPopular && (
                                    <div
                                        className="absolute top-5 right-5 rounded-full px-3 py-0.75 text-[11px] font-bold tracking-[0.4px] text-white"
                                        style={{ background: color }}
                                    >
                                        En Popüler
                                    </div>
                                )}

                                <div className="flex items-center justify-between">
                                    <div
                                        className="w-11 h-11 rounded-xl flex items-center justify-center text-lg"
                                        style={{ background: colorBg, color }}
                                    >
                                        {plan.icon}
                                    </div>
                                    {plan.isPopular && <div className="w-2 h-2 rounded-full" style={{ background: color }} />}
                                </div>

                                <div className="font-serif text-[28px] font-bold leading-none" style={{ color: plan.isPopular ? "#f2ede4" : undefined }}>
                                    {plan.name}
                                </div>
                                <div className="text-[13px] leading-tight" style={{ color: plan.isPopular ? "rgba(242,237,228,0.55)" : undefined }}>
                                    {plan.desc}
                                </div>

                                <div className="flex items-baseline gap-0.75">
                                    <span className="text-xl font-semibold mb-1.5" style={{ color: plan.isPopular ? "#f2ede4" : undefined }}>
                                        ₺
                                    </span>
                                    <span className="font-serif text-[52px] font-bold leading-none" style={{ color: plan.isPopular ? "#f2ede4" : undefined }}>
                                        {price.toLocaleString("tr-TR")}
                                    </span>
                                    <span className="text-[13px] ml-0.5" style={{ color: plan.isPopular ? "rgba(242,237,228,0.45)" : undefined }}>
                                        /ay
                                    </span>
                                </div>
                                {isAnnual && (
                                    <div className="text-[11px] font-bold rounded-md px-2.5 py-1 self-start" style={{ color, background: colorBg }}>
                                        {`Yıllık ödeme · ${saving.toLocaleString("tr-TR")} ₺ tasarruf`}
                                    </div>
                                )}

                                <div className="h-px" style={{ background: plan.isPopular ? "rgba(255,255,255,0.1)" : undefined }} />

                                <div className="flex flex-col flex-1">
                                    {plan.features.map((feat) => (
                                        <div key={feat.text} className="flex items-center gap-2.25 py-1.25">
                                            <div
                                                className="w-4.5 h-4.5 rounded-md shrink-0 flex items-center justify-center"
                                                style={{
                                                    background: feat.inc ? colorBg : "var(--rb-checkbox-off-bg)",
                                                    color: feat.inc ? color : "var(--rb-text-muted)",
                                                }}
                                            >
                                                {feat.inc ? (
                                                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                                                        <path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                                                    </svg>
                                                ) : (
                                                    <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                                                        <path d="M2 2l4 4M6 2L2 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                                                    </svg>
                                                )}
                                            </div>
                                            <span
                                                className="text-[13px]"
                                                style={{
                                                    color: feat.inc ? (plan.isPopular ? "#f2ede4" : undefined) : "var(--rb-text-muted)",
                                                    textDecoration: feat.inc ? "none" : "line-through",
                                                }}
                                            >
                                                {feat.text}
                                            </span>
                                        </div>
                                    ))}
                                </div>

                                <Link
                                    to="/login"
                                    className="w-full text-center py-3.25 rounded-xl text-sm font-bold mt-2 transition-opacity hover:opacity-90"
                                    style={{ background: plan.isPopular ? color : colorBg, color: plan.isPopular ? "#FFFFFF" : color }}
                                >
                                    {plan.key === "enterprise" ? "Satışla İletişime Geç" : "Ücretsiz Dene"}
                                </Link>
                            </div>
                        );
                    })}
                </div>

                {/* Feature comparison table */}
                <div className="font-serif text-2xl md:text-[32px] font-bold text-center mb-7">Özellik Karşılaştırması</div>
                <div className="max-w-225 mx-auto rounded-2xl border border-[#e8e0d0] dark:border-[#3d3528] bg-white dark:bg-[#2a2318] overflow-hidden overflow-x-auto mb-16">
                    <div className="flex items-center bg-black/3 dark:bg-white/4 border-b border-[#e8e0d0] dark:border-[#3d3528] min-w-150">
                        <div className="w-55 shrink-0 px-4 py-3.5 text-[11px] font-bold uppercase tracking-[0.5px] text-[#a39080] dark:text-[#7a6e60]">
                            Özellik
                        </div>
                        {PLAN_DEFS.map((plan) => (
                            <div key={plan.key} className="flex-1 text-center text-[13px] font-bold px-2.5 py-3.5">
                                {plan.name}
                            </div>
                        ))}
                    </div>

                    {TABLE_ROW_DEFS.map((row, i) => (
                        <div
                            key={row.feature}
                            className={`flex items-center border-b border-[#e8e0d0] dark:border-[#3d3528] min-w-150 ${
                                i % 2 === 0 ? "bg-black/1.5 dark:bg-white/1.5" : ""
                            }`}
                        >
                            <div className="w-55 shrink-0 px-4 py-3.25 text-[13px] font-medium text-[#6b5e52] dark:text-[#a89880]">{row.feature}</div>
                            {row.values.map((v, vi) => {
                                const plan = PLAN_DEFS[vi];
                                const color = plan.accent.color;
                                return (
                                    <div
                                        key={vi}
                                        className="flex-1 text-center px-2.5 py-3.25 text-[13px]"
                                        style={{
                                            fontWeight: v === "✓" ? 700 : v === "—" ? 400 : 500,
                                            color: v === "✓" ? color : v === "—" ? "var(--rb-text-muted)" : undefined,
                                        }}
                                    >
                                        {v}
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>

                {/* FAQ */}
                <div className="font-serif text-2xl md:text-[32px] font-bold text-center mb-8">Sıkça Sorulan Sorular</div>
                <div className="max-w-225 mx-auto grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {FAQ_DEFS.map((faq) => (
                        <div key={faq.q} className="rounded-2xl p-5 border border-[#e8e0d0] dark:border-[#3d3528] bg-white dark:bg-[#2a2318]">
                            <div className="text-[15px] font-semibold mb-2 leading-tight">{faq.q}</div>
                            <div className="text-[13px] leading-relaxed text-[#a39080] dark:text-[#7a6e60]">{faq.a}</div>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── FOOTER CTA ── */}
            <section className="px-6 md:px-15 py-20 text-center bg-[#1c1510] dark:bg-[#0e0b08]">
                <div className="max-w-140 mx-auto flex flex-col items-center gap-5">
                    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                        <circle cx="14" cy="14" r="12" stroke="#C8A96E" strokeWidth="1.5" />
                        <circle cx="14" cy="14" r="5" fill="#C8A96E" />
                        <circle cx="14" cy="14" r="8.5" stroke="#C8A96E" strokeWidth="1" strokeDasharray="3 4" />
                    </svg>
                    <h2 className="font-serif text-[46px] font-bold leading-tight text-[#f2ede4]">Bugün Başlayın</h2>
                    <p className="text-sm leading-relaxed" style={{ color: "rgba(242,237,228,0.45)" }}>
                        14 gün boyunca tüm özelliklere ücretsiz erişin. Kredi kartı, taahhüt yok.
                    </p>
                    <div className="flex gap-3">
                        <Link to="/login" className="px-7.5 py-3.5 rounded-xl bg-[#C8A96E] text-[#1c1510] text-sm font-bold hover:opacity-90 transition-opacity">
                            Ücretsiz Hesap Oluştur →
                        </Link>
                        <a
                            href="#pricing"
                            className="px-7.5 py-3.5 rounded-xl border text-sm font-semibold"
                            style={{ borderColor: "rgba(255,255,255,0.18)", color: "rgba(242,237,228,0.75)" }}
                        >
                            Planları İncele
                        </a>
                    </div>
                    <div className="text-xs" style={{ color: "rgba(242,237,228,0.28)" }}>
                        Kredi kartı gerekmez · 14 gün ücretsiz · İstediğiniz zaman iptal
                    </div>
                </div>
            </section>

            {/* ── FOOTER ── */}
            <footer className="px-6 md:px-15 py-5 border-t border-white/6 bg-[#1c1510] dark:bg-[#0e0b08]">
                <div className="flex justify-between items-center flex-wrap gap-3">
                    <div className="flex items-center gap-2">
                        <span className="font-serif text-[17px] font-bold" style={{ color: "rgba(242,237,228,0.6)" }}>
                            RestaurantBill
                        </span>
                        <span className="text-xs ml-3" style={{ color: "rgba(242,237,228,0.25)" }}>
                            © {new Date().getFullYear()} RestaurantBill
                        </span>
                    </div>
                    <div className="flex gap-5">
                        <a href="#pricing" className="text-[13px]" style={{ color: "rgba(242,237,228,0.4)" }}>
                            Fiyatlandırma
                        </a>
                        <Link to="/login" className="text-[13px]" style={{ color: "rgba(242,237,228,0.4)" }}>
                            Giriş Yap
                        </Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}
