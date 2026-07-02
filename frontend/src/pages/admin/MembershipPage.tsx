import { Gem, CreditCard, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const inputLikeCard = 'rounded-xl border border-border bg-card p-5';
const sectionLabelClass = 'text-[11px] font-semibold tracking-widest uppercase text-muted-foreground';

const plan = {
    name: 'Profesyonel',
    status: 'AKTİF',
    price: '₺999',
    billingCycle: 'Aylık faturalama',
    nextRenewal: '1 Ağustos 2026',
};

const usageStats = [
    { label: 'Masa Sayısı', value: '12', limitLabel: 'Sınırsız' },
    { label: 'Kullanıcı', value: '6', limitLabel: '/10 limit', progress: 60 },
    { label: 'Sipariş (Bu Ay)', value: '847', limitLabel: 'Sınırsız' },
    { label: 'Aktif Menü Ürünü', value: '14', limitLabel: 'Sınırsız' },
];

const billingInfo = [
    { label: 'Plan', value: plan.name },
    { label: 'Faturalama', value: "Aylık · Her ayın 1'i" },
    { label: 'Sonraki Ödeme', value: plan.nextRenewal },
    { label: 'Tutar', value: plan.price },
];

const paymentMethod = {
    brand: 'Visa',
    last4: '4242',
    expiry: '09/28',
};

export default function MembershipPage() {
    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-serif font-bold text-foreground">Üyelik &amp; Abonelik</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">Plan, kullanım ve fatura yönetimi</p>
                </div>
                <button className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-accent transition-colors">
                    Tüm Planları Gör <ArrowRight className="w-3.5 h-3.5" />
                </button>
            </div>

            {/* Current Plan Card */}
            <div className="rounded-xl bg-[#1c1917] dark:bg-[#0f0e0d] p-6 flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                        <Gem className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <p className="text-white font-serif font-bold text-lg leading-none">{plan.name}</p>
                            <span className="text-[10px] font-semibold uppercase tracking-wide rounded-full px-2 py-0.5 bg-green-500/15 text-green-400 border border-green-500/30">
                                {plan.status}
                            </span>
                        </div>
                        <p className="text-white/50 text-sm mt-1.5">{plan.price} / ay · {plan.billingCycle}</p>
                        <p className="text-white/30 text-xs mt-0.5">Sonraki yenileme: {plan.nextRenewal}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button className="px-4 py-2 rounded-lg border border-white/15 text-white/80 text-sm font-medium hover:bg-white/5 transition-colors">
                        İptal Et
                    </button>
                    <button className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors">
                        Plan Değiştir
                    </button>
                </div>
            </div>

            {/* Usage */}
            <div className="space-y-3">
                <p className={sectionLabelClass}>Kullanım</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {usageStats.map((stat) => (
                        <div key={stat.label} className={inputLikeCard}>
                            <div className="flex items-center justify-between">
                                <p className={sectionLabelClass}>{stat.label}</p>
                                <span className="text-xs text-muted-foreground">{stat.limitLabel}</span>
                            </div>
                            <p className="text-3xl font-serif font-bold text-foreground mt-2">{stat.value}</p>
                            {stat.progress !== undefined && (
                                <div className="mt-3 space-y-1">
                                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                                        <div
                                            className="h-full rounded-full bg-green-500"
                                            style={{ width: `${stat.progress}%` }}
                                        />
                                    </div>
                                    <p className="text-xs text-green-500">%{stat.progress}</p>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Billing Info + Payment Method */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className={inputLikeCard}>
                    <h2 className="text-base font-semibold text-foreground mb-4">Faturalama Bilgileri</h2>
                    <div className="space-y-3">
                        {billingInfo.map((row) => (
                            <div key={row.label} className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">{row.label}</span>
                                <span className="text-foreground font-medium">{row.value}</span>
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-end mt-4">
                        <button className="px-4 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-accent transition-colors">
                            Bilgileri Düzenle
                        </button>
                    </div>
                </div>

                <div className={inputLikeCard}>
                    <h2 className="text-base font-semibold text-foreground mb-4">Ödeme Yöntemi</h2>
                    <div className="flex items-center justify-between rounded-lg border border-border p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                                <CreditCard className="w-5 h-5 text-foreground" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-foreground">
                                    {paymentMethod.brand} •••• •••• •••• {paymentMethod.last4}
                                </p>
                                <p className="text-xs text-muted-foreground mt-0.5">Son Kullanma: {paymentMethod.expiry}</p>
                            </div>
                        </div>
                        <span className="text-[10px] font-semibold uppercase tracking-wide rounded-full px-2 py-0.5 bg-blue-500/10 text-blue-500 border border-blue-500/30 shrink-0">
                            Varsayılan
                        </span>
                    </div>
                    <div className="flex justify-end mt-4">
                        <button className="px-4 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-accent transition-colors">
                            Kartı Güncelle
                        </button>
                    </div>
                </div>
            </div>

            {/* Billing History */}
            <div className="space-y-3">
                <p className={sectionLabelClass}>Fatura Geçmişi</p>
                <div className={cn(inputLikeCard, 'text-sm text-muted-foreground')}>
                    Henüz bir fatura geçmişi bulunmuyor.
                </div>
            </div>

            {/* Upgrade Banner */}
            <div className="rounded-xl border border-border bg-accent/50 p-5 flex items-center justify-between gap-4 flex-wrap">
                <div>
                    <p className="text-sm font-semibold text-foreground">Daha fazlasına ihtiyacınız var mı?</p>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        Bir üst plana geçerek sınırsız masa, daha fazla kullanıcı ve 7/24 destek kazanın.
                    </p>
                </div>
                <button className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors shrink-0">
                    Planı Yükselt <ArrowRight className="w-3.5 h-3.5" />
                </button>
            </div>
        </div>
    );
}
