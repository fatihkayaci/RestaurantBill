import { useEffect, useState } from 'react';
import { Gem, CreditCard, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { membershipService } from '@/features/memberships/api/membershipService';
import { userService } from '@/features/users/api/userService';
import { statsService } from '@/features/stats/api/statsService';
import { tableService } from '@/features/tables/api/tableService';
import { productService } from '@/features/products/api/productService';
import { MembershipPlanType, MembershipStatus, type Membership } from '@/features/memberships/types';

const inputLikeCard = 'rounded-xl border border-border bg-card p-5';
const sectionLabelClass = 'text-[11px] font-semibold tracking-widest uppercase text-muted-foreground';

const planTypeLabel: Record<MembershipPlanType, string> = {
    [MembershipPlanType.Free]: 'Ücretsiz',
    [MembershipPlanType.Basic]: 'Başlangıç',
    [MembershipPlanType.Premium]: 'Premium',
};

const statusLabel: Record<MembershipStatus, string> = {
    [MembershipStatus.Active]: 'AKTİF',
    [MembershipStatus.Expired]: 'SÜRESİ DOLDU',
    [MembershipStatus.Cancelled]: 'İPTAL EDİLDİ',
};

const statusBadgeClass: Record<MembershipStatus, string> = {
    [MembershipStatus.Active]: 'bg-rb-green-bg text-rb-green border-rb-green/30',
    [MembershipStatus.Expired]: 'bg-rb-red-bg text-rb-red border-rb-red/30',
    [MembershipStatus.Cancelled]: 'bg-white/10 text-white/50 border-white/20',
};

const formatDate = (isoDate: string) =>
    new Date(isoDate).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });

const paymentMethod = {
    brand: 'Visa',
    last4: '4242',
    expiry: '09/28',
};

export default function MembershipPage() {
    const [membership, setMembership] = useState<Membership | null>(null);
    const [loading, setLoading] = useState(true);

    const [usage, setUsage] = useState({ tables: 0, staff: 0, orders: 0, activeProducts: 0 });
    const [usageLoading, setUsageLoading] = useState(true);

    useEffect(() => {
        membershipService.getMyMembership()
            .then(setMembership)
            .catch(() => setMembership(null))
            .finally(() => setLoading(false));

        Promise.all([
            tableService.getTables(),
            userService.getUsersByRestaurantId(),
            productService.getProducts(),
            statsService.getOverview(),
        ]).then(([tables, staff, products, stats]) => {
            setUsage({
                tables: tables.length,
                staff: staff.length,
                orders: stats.totalOrders,
                activeProducts: products.filter(p => p.isActive).length,
            });
        }).catch(console.error).finally(() => setUsageLoading(false));
    }, []);

    const planName = membership ? planTypeLabel[membership.planType] : '—';
    const status = membership?.status ?? MembershipStatus.Active;
    const nextRenewal = membership ? formatDate(membership.endDate) : '—';

    const billingInfo = [
        { label: 'Plan', value: planName },
        { label: 'Durum', value: membership ? statusLabel[membership.status] : '—' },
        { label: 'Başlangıç', value: membership ? formatDate(membership.startDate) : '—' },
        { label: 'Sonraki Yenileme', value: nextRenewal },
    ];

    const usageStats = [
        { label: 'Masa Sayısı', value: usageLoading ? '—' : String(usage.tables) },
        { label: 'Çalışan', value: usageLoading ? '—' : String(usage.staff) },
        { label: 'Toplam Sipariş', value: usageLoading ? '—' : String(usage.orders) },
        { label: 'Aktif Menü Ürünü', value: usageLoading ? '—' : String(usage.activeProducts) },
    ];

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
            <div className="rounded-xl bg-sidebar p-6 flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                        <Gem className="w-5 h-5 text-rb-accent" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <p className="text-sidebar-foreground font-serif font-bold text-lg leading-none">
                                {loading ? '—' : planName}
                            </p>
                            <span className={cn(
                                'text-[10px] font-semibold uppercase tracking-wide rounded-full px-2 py-0.5 border',
                                statusBadgeClass[status]
                            )}>
                                {statusLabel[status]}
                            </span>
                        </div>
                        <p className="text-sidebar-foreground/30 text-xs mt-1.5">
                            {loading ? '—' : `Sonraki yenileme: ${nextRenewal}`}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button className="px-4 py-2 rounded-lg border border-white/15 text-sidebar-foreground/80 text-sm font-medium hover:bg-white/5 transition-colors">
                        İptal Et
                    </button>
                    <button className="px-4 py-2 rounded-lg bg-rb-accent hover:opacity-90 text-white text-sm font-medium transition-colors">
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
                            <p className={sectionLabelClass}>{stat.label}</p>
                            <p className="text-3xl font-serif font-bold text-foreground mt-2">{stat.value}</p>
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
                        <span className="text-[10px] font-semibold uppercase tracking-wide rounded-full px-2 py-0.5 bg-rb-accent-bg text-rb-accent border border-rb-accent/30 shrink-0">
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
                <button className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-rb-accent hover:opacity-90 text-white text-sm font-medium transition-colors shrink-0">
                    Planı Yükselt <ArrowRight className="w-3.5 h-3.5" />
                </button>
            </div>
        </div>
    );
}
