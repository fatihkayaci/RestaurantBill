import { Link } from "react-router-dom";
import { useTheme } from "next-themes";
import { useState } from "react";
import PublicNav from "@/components/layout/PublicNav";
import PublicFooter from "@/components/layout/PublicFooter";

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

type BillingPeriod = {
    key: "monthly" | "quarterly" | "yearly";
    label: string;
    months: number;
    priceTotal: number;
    priceMonthlyEquivalent: number;
    discountLabel?: string;
};

const BILLING_PERIODS: BillingPeriod[] = [
    { key: "monthly", label: "Aylık", months: 1, priceTotal: 600, priceMonthlyEquivalent: 600 },
    { key: "quarterly", label: "3 Aylık", months: 3, priceTotal: 1620, priceMonthlyEquivalent: 540, discountLabel: "%10 tasarruf" },
    { key: "yearly", label: "Yıllık", months: 12, priceTotal: 5760, priceMonthlyEquivalent: 480, discountLabel: "%20 tasarruf" },
];

const PLAN_FEATURES: string[] = [
    "Garson sipariş yönetimi",
    "Mutfak ekranı",
    "Kasiyer & ödeme yönetimi",
    "Admin paneli & raporlar",
    "Sınırsız masa",
    "Rezervasyon yönetimi",
    "Gerçek zamanlı senkronizasyon",
    "E-posta desteği",
];

const FAQ_DEFS: { q: string; a: string }[] = [
    { q: "Ücretsiz deneme süresi var mı?", a: "Evet, 14 gün ücretsiz deneme sunuyoruz. Kredi kartı gerekmez." },
    { q: "Deneme sonrasında otomatik ücretlendirme olur mu?", a: "Hayır. Deneme süresi bitince siz karar verirsiniz; otomatik yenileme isteğe bağlıdır ve dilediğiniz zaman açıp kapatabilirsiniz." },
    { q: "Faturalama periyodunu değiştirebilir miyim?", a: "Evet, aylık, 3 aylık ve yıllık periyotlar arasında istediğiniz zaman geçiş yapabilirsiniz." },
    { q: "İptal ve iade nasıl işliyor?", a: "Satın alma sonrası 14 gün içinde koşulsuz iade alabilirsiniz; sonrasında kullanılmayan süre için iade yapılır. Detaylar için İptal & İade sayfamıza bakabilirsiniz." },
];

export default function LandingPage() {
    const { theme } = useTheme();
    const isDark = theme === "dark";
    const [billingKey, setBillingKey] = useState<BillingPeriod["key"]>("monthly");
    const billing = BILLING_PERIODS.find((p) => p.key === billingKey)!;

    return (
        <div className="min-h-screen bg-[#f5f0e8] dark:bg-[#18140f] text-[#2a1f14] dark:text-[#f2ede4] font-sans">
            <PublicNav links={NAV_LINKS} />

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

            {/* ── PRICING ── */}
            <section id="pricing" className="px-6 md:px-15 py-20 bg-black/2 dark:bg-white/1 border-t border-b border-[#e8e0d0] dark:border-[#3d3528] [content-visibility:auto] [contain-intrinsic-size:auto_1400px]">
                <div className="text-center mb-11 flex flex-col items-center gap-5">
                    <div
                        className="inline-block rounded-full px-3.5 py-1 text-[11px] font-bold tracking-[0.6px] uppercase"
                        style={{ background: ACCENT.bg, color: ACCENT.color }}
                    >
                        Fiyatlandırma
                    </div>
                    <h2 className="font-serif text-3xl md:text-[44px] font-bold leading-tight whitespace-pre-line">
                        {"Tek Plan,\nTüm Özellikler"}
                    </h2>
                    <p className="text-[15px] leading-relaxed max-w-130 text-[#a39080] dark:text-[#7a6e60]">
                        14 gün ücretsiz deneyin. Kredi kartı gerekmez. İstediğiniz zaman iptal edin.
                    </p>

                    {/* Billing period toggle */}
                    <div className="flex items-center gap-1.5 p-1.5 rounded-full bg-black/5 dark:bg-white/6 border border-[#e8e0d0] dark:border-white/10">
                        {BILLING_PERIODS.map((period) => (
                            <button
                                key={period.key}
                                onClick={() => setBillingKey(period.key)}
                                className="px-4 py-2 rounded-full text-[13px] font-semibold transition-colors"
                                style={{
                                    background: billingKey === period.key ? GREEN.color : "transparent",
                                    color: billingKey === period.key ? "#FFFFFF" : undefined,
                                }}
                            >
                                {period.label}
                                {period.discountLabel && (
                                    <span
                                        className="ml-1.5 text-[10px] font-bold"
                                        style={{ color: billingKey === period.key ? "rgba(255,255,255,0.8)" : GREEN.color }}
                                    >
                                        {period.discountLabel}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Plan card */}
                <div className="max-w-115 mx-auto mb-16">
                    <div
                        className="relative overflow-hidden rounded-[20px] p-8 flex flex-col gap-4 border-2 bg-[#1c1510] dark:bg-[#0e0b08]"
                        style={{ borderColor: ACCENT.color, boxShadow: `0 20px 60px ${ACCENT.bg}` }}
                    >
                        <div className="font-serif text-[26px] font-bold leading-none" style={{ color: "#f2ede4" }}>
                            Sophram Aboneliği
                        </div>
                        <div className="text-[13px] leading-tight" style={{ color: "rgba(242,237,228,0.55)" }}>
                            Tek şubeli restoranlar için tüm özellikler dahil
                        </div>

                        <div className="flex items-baseline gap-0.75">
                            <span className="text-xl font-semibold mb-1.5" style={{ color: "#f2ede4" }}>
                                ₺
                            </span>
                            <span className="font-serif text-[52px] font-bold leading-none" style={{ color: "#f2ede4" }}>
                                {billing.priceMonthlyEquivalent.toLocaleString("tr-TR")}
                            </span>
                            <span className="text-[13px] ml-0.5" style={{ color: "rgba(242,237,228,0.45)" }}>
                                /ay
                            </span>
                        </div>
                        <div className="text-[12px]" style={{ color: "rgba(242,237,228,0.45)" }}>
                            {billing.months === 1
                                ? "Her ay faturalandırılır"
                                : `${billing.label} peşin · toplam ${billing.priceTotal.toLocaleString("tr-TR")} ₺`}
                        </div>

                        <div className="h-px" style={{ background: "rgba(255,255,255,0.1)" }} />

                        <div className="flex flex-col flex-1">
                            {PLAN_FEATURES.map((feat) => (
                                <div key={feat} className="flex items-center gap-2.25 py-1.25">
                                    <div
                                        className="w-4.5 h-4.5 rounded-md shrink-0 flex items-center justify-center"
                                        style={{ background: ACCENT.bg, color: ACCENT.color }}
                                    >
                                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                                            <path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </div>
                                    <span className="text-[13px]" style={{ color: "#f2ede4" }}>
                                        {feat}
                                    </span>
                                </div>
                            ))}
                        </div>

                        <Link
                            to="/login"
                            className="w-full text-center py-3.25 rounded-xl text-sm font-bold mt-2 transition-opacity hover:opacity-90"
                            style={{ background: ACCENT.color, color: "#FFFFFF" }}
                        >
                            14 Gün Ücretsiz Dene
                        </Link>
                    </div>
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

            <PublicFooter />
        </div>
    );
}
