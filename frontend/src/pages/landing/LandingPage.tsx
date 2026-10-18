import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, ChevronDown } from "lucide-react";
import PublicNav from "@/components/layout/PublicNav";
import PublicFooter from "@/components/layout/PublicFooter";
import ProductPreview from "./ProductPreview";
import {
    BILLING_PERIODS,
    FAQ,
    FEATURES,
    FLOW_STEPS,
    HIGHLIGHTS,
    NAV_LINKS,
    PLAN_FEATURES,
    ROLES,
    TONE,
    type BillingPeriod,
} from "./content";

const GOLD = "#C8A96E";
const SECTION_X = "px-5 sm:px-8 lg:px-15";

export default function LandingPage() {
    return (
        <div className="min-h-screen bg-[#f5f0e8] dark:bg-[#18140f] text-[#2a1f14] dark:text-[#f2ede4] font-sans">
            <PublicNav links={NAV_LINKS} />
            <main>
                <Hero />
                <Highlights />
                <OrderFlow />
                <Features />
                <Roles />
                <Pricing />
                <Faq />
                <FinalCta />
            </main>
            <PublicFooter />
        </div>
    );
}

function SectionHeading({ eyebrow, title, desc }: { eyebrow: string; title: ReactNode; desc?: string }) {
    return (
        <div className="text-center mb-10 md:mb-14 flex flex-col items-center gap-3">
            <span className="rounded-full px-3.5 py-1 text-[11px] font-bold tracking-[0.6px] uppercase bg-rb-gold-bg text-[#9A7B3F] dark:text-rb-gold">
                {eyebrow}
            </span>
            <h2 className="font-serif text-[32px] md:text-[44px] font-bold leading-[1.1] text-balance">{title}</h2>
            {desc && <p className="text-[15px] leading-relaxed max-w-xl text-rb-text-sub text-balance">{desc}</p>}
        </div>
    );
}

function Hero() {
    return (
        <section
            className={`${SECTION_X} pt-14 md:pt-20 pb-16 md:pb-24 relative overflow-hidden`}
            style={{ background: "linear-gradient(160deg, #120E0A 0%, #241A12 55%, #120E0A 100%)" }}
        >
            <div
                aria-hidden
                className="absolute -top-40 -right-40 w-120 h-120 rounded-full blur-3xl opacity-25 pointer-events-none"
                style={{ background: `radial-gradient(circle, ${GOLD} 0%, transparent 70%)` }}
            />
            <div className="max-w-300 mx-auto grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] gap-12 lg:gap-14 items-center relative">
                <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <span className="inline-flex items-center gap-2 self-start rounded-full px-3.5 py-1.5 bg-[rgba(200,169,110,0.12)] border border-[rgba(200,169,110,0.25)] text-[11px] font-bold tracking-[0.4px] text-[#C8A96E]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#C8A96E] animate-pulse" />
                        RESTORAN YÖNETİM SİSTEMİ
                    </span>

                    <h1 className="font-serif text-[44px] sm:text-[56px] lg:text-[64px] font-bold leading-[1.02] tracking-[-0.5px] text-[#f2ede4]">
                        Siparişten hesaba,
                        <br />
                        <em className="italic text-[#C8A96E]">tek akışta.</em>
                    </h1>
                    <p className="text-base leading-relaxed max-w-lg text-[rgba(242,237,228,0.68)]">
                        Sophram garsonu, mutfağı, kasayı ve yönetimi aynı anda çalışan tek bir sisteme bağlar. Sipariş mutfağa saniyesinde düşer,
                        hesap kasada tek dokunuşla kapanır. Kurulum yok — tarayıcıdan açın, başlayın.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-3">
                        <Link
                            to="/login"
                            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[#C8A96E] text-[#1c1510] text-sm font-bold hover:bg-[#d6b97f] transition-colors"
                        >
                            14 Gün Ücretsiz Dene <ArrowRight size={16} />
                        </Link>
                        <a
                            href="#flow"
                            className="inline-flex items-center justify-center px-6 py-3.5 rounded-xl border border-white/20 text-sm font-semibold text-[rgba(242,237,228,0.85)] hover:bg-white/5 transition-colors"
                        >
                            Nasıl çalışır?
                        </a>
                    </div>

                    <ul className="flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-[rgba(242,237,228,0.6)]">
                        {["Kredi kartı gerekmez", "Kurulum gerektirmez", "İstediğiniz zaman iptal"].map((t) => (
                            <li key={t} className="flex items-center gap-1.5">
                                <Check size={14} className="text-[#45C87A]" /> {t}
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="relative animate-in fade-in duration-1000 delay-200">
                    <ProductPreview />
                </div>
            </div>
        </section>
    );
}

function Highlights() {
    return (
        <section className={`${SECTION_X} border-b border-[#e8e0d0] dark:border-[#3d3528]`}>
            <div className="max-w-300 mx-auto grid grid-cols-2 lg:grid-cols-4">
                {HIGHLIGHTS.map(({ icon: Icon, title, desc }, i) => (
                    <div
                        key={title}
                        className={`flex flex-col sm:flex-row gap-3 py-6 sm:py-8 px-2 sm:px-5 ${i % 2 === 1 ? "border-l" : ""} ${i >= 2 ? "border-t lg:border-t-0" : ""} ${i === 2 ? "lg:border-l" : ""} border-[#e8e0d0] dark:border-[#3d3528]`}
                    >
                        <span className="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center bg-rb-gold-bg text-[#9A7B3F] dark:text-rb-gold">
                            <Icon size={19} />
                        </span>
                        <div>
                            <div className="text-sm font-bold">{title}</div>
                            <div className="text-[13px] leading-snug text-rb-text-sub mt-0.5">{desc}</div>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}

function OrderFlow() {
    return (
        <section id="flow" className={`${SECTION_X} py-20 md:py-24 scroll-mt-16`}>
            <SectionHeading
                eyebrow="Nasıl Çalışır"
                title={<>Bir siparişin yolculuğu</>}
                desc="Kimse mutfağa koşmaz, kimse fiş taşımaz. Her adım ilgili ekrana anında düşer."
            />
            <ol className="max-w-300 mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-0">
                {FLOW_STEPS.map(({ icon: Icon, tone, who, title, desc }, i) => (
                    <li key={title} className="relative flex lg:flex-col gap-4 lg:items-center lg:text-center lg:px-5">
                        {i < FLOW_STEPS.length - 1 && (
                            <span
                                aria-hidden
                                className="hidden lg:block absolute top-7 h-px left-[calc(50%+36px)] right-[calc(-50%+36px)]"
                                style={{ background: `linear-gradient(to right, ${GOLD}, rgba(200,169,110,0.15))` }}
                            />
                        )}
                        <div className="relative shrink-0">
                            <span
                                className="w-14 h-14 rounded-2xl flex items-center justify-center bg-white dark:bg-[#2a2318] border border-[#e8e0d0] dark:border-[#3d3528] shadow-sm"
                                style={{ color: TONE[tone].color }}
                            >
                                <Icon size={24} />
                            </span>
                            <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-[#C8A96E] text-[#1c1510] text-[11px] font-bold flex items-center justify-center">
                                {i + 1}
                            </span>
                        </div>
                        <div className="flex flex-col gap-1 lg:items-center">
                            <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: TONE[tone].color }}>{who}</span>
                            <span className="font-serif text-xl font-bold">{title}</span>
                            <span className="text-[13px] leading-relaxed text-rb-text-sub max-w-60">{desc}</span>
                        </div>
                    </li>
                ))}
            </ol>
        </section>
    );
}

function Features() {
    return (
        <section id="features" className={`${SECTION_X} py-20 md:py-24 bg-black/2 dark:bg-white/2 border-y border-[#e8e0d0] dark:border-[#3d3528] scroll-mt-16`}>
            <SectionHeading
                eyebrow="Özellikler"
                title={<>Restoranın ihtiyacı olan her şey,<br className="hidden md:block" /> tek yerde</>}
                desc="Salondan mutfağa, kasadan rapora kadar ayrı ayrı programlara ihtiyaç duymadan."
            />
            <div className="max-w-300 mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {FEATURES.map(({ icon: Icon, tone, title, desc, points }) => (
                    <article
                        key={title}
                        className="rounded-2xl p-6 flex flex-col gap-3 border border-[#e8e0d0] dark:border-[#3d3528] bg-white dark:bg-[#221d16] hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/5 transition-[transform,box-shadow] duration-200"
                    >
                        <span className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: TONE[tone].bg, color: TONE[tone].color }}>
                            <Icon size={21} />
                        </span>
                        <h3 className="font-serif text-xl font-bold">{title}</h3>
                        <p className="text-[13px] leading-relaxed text-rb-text-sub flex-1">{desc}</p>
                        <ul className="flex flex-col gap-1.5 mt-1 pt-3 border-t border-[#e8e0d0] dark:border-[#3d3528]">
                            {points.map((p) => (
                                <li key={p} className="flex items-start gap-2 text-[13px]">
                                    <Check size={14} className="mt-0.5 shrink-0" style={{ color: TONE[tone].color }} />
                                    <span>{p}</span>
                                </li>
                            ))}
                        </ul>
                    </article>
                ))}
            </div>
        </section>
    );
}

function Roles() {
    const [activeKey, setActiveKey] = useState(ROLES[0].key);
    const role = ROLES.find((r) => r.key === activeKey)!;
    const tone = TONE[role.tone];
    const RoleIcon = role.icon;

    return (
        <section id="roles" className={`${SECTION_X} py-20 md:py-24 scroll-mt-16`}>
            <SectionHeading
                eyebrow="Roller"
                title={<>Herkese kendi ekranı</>}
                desc="Her çalışan yalnızca işi için gereken ekranı görür. Yetkiler role göre ayrılır, karışıklık olmaz."
            />
            <div className="max-w-250 mx-auto grid grid-cols-1 md:grid-cols-[260px_1fr] gap-4">
                <div className="flex flex-wrap md:flex-col md:flex-nowrap gap-2" role="tablist" aria-label="Roller">
                    {ROLES.map((r) => {
                        const Icon = r.icon;
                        const selected = r.key === activeKey;
                        return (
                            <button
                                key={r.key}
                                type="button"
                                role="tab"
                                aria-selected={selected}
                                onClick={() => setActiveKey(r.key)}
                                className={`flex items-center gap-2.5 md:gap-3 rounded-xl px-3 py-2 md:px-4 md:py-3 text-left border transition-colors ${
                                    selected
                                        ? "bg-white dark:bg-[#221d16] border-[#e8e0d0] dark:border-[#3d3528] shadow-sm"
                                        : "border-transparent hover:bg-black/3 dark:hover:bg-white/4"
                                }`}
                            >
                                <span
                                    className="w-7 h-7 md:w-9 md:h-9 rounded-lg flex items-center justify-center shrink-0"
                                    style={{ background: TONE[r.tone].bg, color: TONE[r.tone].color }}
                                >
                                    <Icon size={18} />
                                </span>
                                <span className="flex flex-col">
                                    <span className="text-sm font-bold whitespace-nowrap">{r.name}</span>
                                    <span className="hidden md:block text-xs text-rb-text-sub">{r.tagline}</span>
                                </span>
                            </button>
                        );
                    })}
                </div>

                <div
                    key={role.key}
                    role="tabpanel"
                    className="rounded-2xl p-6 md:p-8 border border-[#e8e0d0] dark:border-[#3d3528] bg-white dark:bg-[#221d16] animate-in fade-in duration-300"
                >
                    <div className="flex items-center gap-4 mb-4">
                        <span className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0" style={{ background: tone.bg, color: tone.color }}>
                            <RoleIcon size={26} />
                        </span>
                        <div>
                            <h3 className="font-serif text-[28px] font-bold leading-tight">{role.name}</h3>
                            <p className="text-sm font-semibold" style={{ color: tone.color }}>{role.tagline}</p>
                        </div>
                    </div>
                    <p className="text-[15px] leading-relaxed text-rb-text-sub mb-5">{role.desc}</p>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {role.points.map((p) => (
                            <li key={p} className="flex items-start gap-2.5 rounded-xl px-3.5 py-3 bg-[#f5f0e8] dark:bg-[#18140f] text-[13px]">
                                <Check size={15} className="mt-0.5 shrink-0" style={{ color: tone.color }} />
                                <span>{p}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </section>
    );
}

function Pricing() {
    const [billingKey, setBillingKey] = useState<BillingPeriod["key"]>("monthly");
    const billing = BILLING_PERIODS.find((p) => p.key === billingKey)!;

    return (
        <section id="pricing" className={`${SECTION_X} py-20 md:py-24 bg-black/2 dark:bg-white/2 border-y border-[#e8e0d0] dark:border-[#3d3528] scroll-mt-16`}>
            <SectionHeading
                eyebrow="Fiyatlandırma"
                title={<>Tek plan, tüm özellikler</>}
                desc="Gizli ücret yok, özellik kısıtlaması yok. 14 gün ücretsiz deneyin, beğenirseniz devam edin."
            />

            <div className="flex justify-center mb-8">
                <div className="inline-flex items-center gap-1 p-1 rounded-full bg-black/5 dark:bg-white/6 border border-[#e8e0d0] dark:border-white/10" role="radiogroup" aria-label="Faturalama dönemi">
                    {BILLING_PERIODS.map((period) => {
                        const selected = billingKey === period.key;
                        return (
                            <button
                                key={period.key}
                                type="button"
                                role="radio"
                                aria-checked={selected}
                                onClick={() => setBillingKey(period.key)}
                                className={`flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-full text-[13px] font-semibold whitespace-nowrap transition-colors ${
                                    selected ? "bg-[#1c1510] text-[#f2ede4] dark:bg-[#C8A96E] dark:text-[#1c1510]" : "text-rb-text-sub hover:text-[#2a1f14] dark:hover:text-[#f2ede4]"
                                }`}
                            >
                                {period.label}
                                {period.discountLabel && (
                                    <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${selected ? "bg-[#45C87A] text-[#0e0b08]" : "bg-rb-green-bg text-rb-green"}`}>
                                        −{period.discountLabel}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="max-w-md mx-auto">
                <div className="relative overflow-hidden rounded-3xl p-8 flex flex-col gap-5 bg-[#1c1510] dark:bg-[#0e0b08] border border-[rgba(200,169,110,0.4)] shadow-[0_24px_60px_rgba(28,21,16,0.25)]">
                    <div
                        aria-hidden
                        className="absolute -top-24 -right-24 w-64 h-64 rounded-full blur-3xl opacity-20 pointer-events-none"
                        style={{ background: `radial-gradient(circle, ${GOLD} 0%, transparent 70%)` }}
                    />
                    <div>
                        <div className="font-serif text-[26px] font-bold leading-none text-[#f2ede4]">Sophram</div>
                        <div className="text-[13px] mt-2 text-[rgba(242,237,228,0.6)]">Tüm özellikler dahil, kısıtlama yok</div>
                    </div>

                    <div>
                        <div className="flex items-baseline gap-1 text-[#f2ede4]">
                            <span className="text-xl font-semibold">₺</span>
                            <span className="font-serif text-[56px] font-bold leading-none">{billing.priceMonthlyEquivalent.toLocaleString("tr-TR")}</span>
                            <span className="text-sm text-[rgba(242,237,228,0.5)]">/ ay</span>
                        </div>
                        <div className="text-[12px] mt-1.5 text-[rgba(242,237,228,0.5)]">
                            {billing.months === 1
                                ? "Her ay faturalandırılır"
                                : `${billing.label} peşin · toplam ₺${billing.priceTotal.toLocaleString("tr-TR")}`}
                        </div>
                    </div>

                    <ul className="flex flex-col gap-2.5 pt-5 border-t border-white/10">
                        {PLAN_FEATURES.map((feat) => (
                            <li key={feat} className="flex items-center gap-2.5 text-[14px] text-[#f2ede4]">
                                <span className="w-5 h-5 rounded-md shrink-0 flex items-center justify-center bg-[rgba(200,169,110,0.15)] text-[#C8A96E]">
                                    <Check size={12} strokeWidth={3} />
                                </span>
                                {feat}
                            </li>
                        ))}
                    </ul>

                    <Link
                        to="/login"
                        className="w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold bg-[#C8A96E] text-[#1c1510] hover:bg-[#d6b97f] transition-colors"
                    >
                        14 Gün Ücretsiz Dene <ArrowRight size={16} />
                    </Link>
                    <p className="text-center text-[12px] text-[rgba(242,237,228,0.45)] -mt-2">Kredi kartı gerekmez</p>
                </div>
            </div>
        </section>
    );
}

function Faq() {
    return (
        <section id="faq" className={`${SECTION_X} py-20 md:py-24 scroll-mt-16`}>
            <SectionHeading eyebrow="SSS" title={<>Sıkça sorulan sorular</>} />
            <div className="max-w-3xl mx-auto flex flex-col gap-3">
                {FAQ.map((item) => (
                    <details
                        key={item.q}
                        className="group rounded-2xl border border-[#e8e0d0] dark:border-[#3d3528] bg-white dark:bg-[#221d16] open:shadow-sm"
                    >
                        <summary className="flex items-center justify-between gap-4 cursor-pointer list-none px-5 py-4 text-[15px] font-semibold [&::-webkit-details-marker]:hidden">
                            {item.q}
                            <ChevronDown size={18} className="shrink-0 text-rb-text-sub transition-transform group-open:rotate-180" />
                        </summary>
                        <p className="px-5 pb-5 -mt-1 text-[14px] leading-relaxed text-rb-text-sub">
                            {item.a}
                            {item.q.startsWith("İptal") && (
                                <>
                                    {" "}
                                    <Link to="/iptal-ve-iade" className="underline underline-offset-2 hover:text-[#2a1f14] dark:hover:text-[#f2ede4]">
                                        İptal & İade politikası
                                    </Link>
                                </>
                            )}
                        </p>
                    </details>
                ))}
            </div>
        </section>
    );
}

function FinalCta() {
    return (
        <section className={`${SECTION_X} py-20 md:py-24 text-center bg-[#1c1510] dark:bg-[#0e0b08] relative overflow-hidden`}>
            <div
                aria-hidden
                className="absolute left-1/2 -translate-x-1/2 -bottom-60 w-160 h-120 rounded-full blur-3xl opacity-20 pointer-events-none"
                style={{ background: `radial-gradient(circle, ${GOLD} 0%, transparent 70%)` }}
            />
            <div className="max-w-xl mx-auto flex flex-col items-center gap-5 relative">
                <h2 className="font-serif text-[38px] md:text-[48px] font-bold leading-tight text-[#f2ede4] text-balance">
                    Bu akşamki servisi Sophram ile yapın
                </h2>
                <p className="text-[15px] leading-relaxed text-[rgba(242,237,228,0.6)] text-balance">
                    Hesabınızı oluşturun, menünüzü ve masalarınızı ekleyin, ekibinizi davet edin. 14 gün boyunca tüm özellikler ücretsiz.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                    <Link
                        to="/login"
                        className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-[#C8A96E] text-[#1c1510] text-sm font-bold hover:bg-[#d6b97f] transition-colors"
                    >
                        Ücretsiz Hesap Oluştur <ArrowRight size={16} />
                    </Link>
                    <a
                        href="#pricing"
                        className="inline-flex items-center justify-center px-7 py-3.5 rounded-xl border border-white/20 text-sm font-semibold text-[rgba(242,237,228,0.85)] hover:bg-white/5 transition-colors"
                    >
                        Fiyatları İncele
                    </a>
                </div>
                <p className="text-xs text-[rgba(242,237,228,0.45)]">Kredi kartı gerekmez · 14 gün ücretsiz · İstediğiniz zaman iptal</p>
            </div>
        </section>
    );
}
