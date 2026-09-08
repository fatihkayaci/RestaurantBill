import { useEffect, useState } from 'react';
import { Calendar, RefreshCw } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { reportService } from '@/features/reports/api/reportService';
import { useReportFilter, presetRange, type DatePreset } from '@/features/reports/hooks/useReportFilter';
import { useReportTabData } from '@/features/reports/hooks/useReportTabData';
import { branchService } from '@/features/branches/api/branchService';
import type { Branch } from '@/features/branches/types';
import { cn } from '@/lib/utils';
import SalesTab from './tabs/SalesTab';
import ShiftsTab from './tabs/ShiftsTab';
import ProductsTab from './tabs/ProductsTab';
import StaffTab from './tabs/StaffTab';
import DiscountsTab from './tabs/DiscountsTab';
import TaxTab from './tabs/TaxTab';

interface Props {
    role: 'admin' | 'owner';
}

const PRESETS: { key: DatePreset; label: string }[] = [
    { key: 'today', label: 'Bugün' },
    { key: 'yesterday', label: 'Dün' },
    { key: 'week', label: 'Bu Hafta' },
    { key: 'month', label: 'Bu Ay' },
];

export default function ReportsPage({ role }: Props) {
    const { from, to, branchId, tab, setPreset, setCustomRange, setBranch, setTab } = useReportFilter('sales');
    const [branches, setBranches] = useState<Branch[]>([]);
    const [refreshing, setRefreshing] = useState(false);

    const filter = { from, to, branchId };

    const sales = useReportTabData('sales', tab, filter, reportService.getSalesReport);
    const shifts = useReportTabData('shifts', tab, filter, reportService.getShiftReport);
    const products = useReportTabData('products', tab, filter, reportService.getProductReport);
    const staff = useReportTabData('staff', tab, filter, reportService.getStaffReport);
    const discounts = useReportTabData('discounts', tab, filter, reportService.getDiscountReport);
    const tax = useReportTabData('tax', tab, filter, reportService.getTaxReport);

    const byTab = { sales, shifts, products, staff, discounts, tax };
    const active = byTab[tab as keyof typeof byTab] ?? sales;

    useEffect(() => {
        if (role === 'owner') {
            branchService.getMyBranches().then(setBranches).catch(console.error);
        }
    }, [role]);

    const handleRefresh = () => {
        setRefreshing(true);
        active.load(true).finally(() => setRefreshing(false));
    };

    const activePreset = PRESETS.find(p => {
        const range = presetRange(p.key);
        return range.from === from && range.to === to;
    })?.key;

    const isSingleDay = from === to;
    const showBranchComparison = !branchId && branches.length > 1;

    return (
        <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-serif font-bold text-foreground">Raporlar</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        {role === 'owner' ? 'Şubeler genelinde satış ve kasa raporları' : 'Şubenizin satış ve kasa raporları'}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {active.updatedAt && (
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                            Son güncelleme: {active.updatedAt.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    )}
                    <button
                        type="button"
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className="flex items-center justify-center rounded-lg border border-border p-2 text-muted-foreground hover:bg-muted/50 transition-colors disabled:opacity-60"
                    >
                        <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
                    </button>
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1 rounded-lg border border-border p-0.5">
                    {PRESETS.map(p => (
                        <button
                            key={p.key}
                            type="button"
                            onClick={() => setPreset(p.key)}
                            className={cn(
                                'px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                                activePreset === p.key ? 'bg-rb-accent text-white' : 'text-muted-foreground hover:text-foreground'
                            )}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-1.5">
                    <div className="relative">
                        <Calendar className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <input
                            type="date"
                            value={from}
                            max={to}
                            onChange={e => setCustomRange(e.target.value || from, to)}
                            className="rounded-lg border border-border bg-background pl-8 pr-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                        />
                    </div>
                    <span className="text-xs text-muted-foreground">—</span>
                    <input
                        type="date"
                        value={to}
                        min={from}
                        onChange={e => setCustomRange(from, e.target.value || to)}
                        className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                </div>

                {role === 'owner' && (
                    <select
                        value={branchId ?? 'all'}
                        onChange={e => setBranch(e.target.value === 'all' ? undefined : e.target.value)}
                        className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                        <option value="all">Tüm Şubeler</option>
                        {branches.map(b => (
                            <option key={b.id} value={b.id}>{b.branchName}</option>
                        ))}
                    </select>
                )}
            </div>

            <Tabs value={tab} onValueChange={setTab}>
                <TabsList className="flex-wrap h-auto">
                    <TabsTrigger value="sales">Satış</TabsTrigger>
                    <TabsTrigger value="shifts">Kasa &amp; Vardiya</TabsTrigger>
                    <TabsTrigger value="products">Ürünler</TabsTrigger>
                    <TabsTrigger value="staff">Personel</TabsTrigger>
                    <TabsTrigger value="discounts">İndirim &amp; İptal</TabsTrigger>
                    <TabsTrigger value="tax">Mali (KDV)</TabsTrigger>
                </TabsList>

                <TabsContent value="sales">
                    <SalesTab data={sales.data} loading={sales.loading} isSingleDay={isSingleDay} role={role} showBranchComparison={showBranchComparison} />
                </TabsContent>

                <TabsContent value="shifts">
                    <ShiftsTab
                        data={shifts.data}
                        loading={shifts.loading}
                        role={role}
                        showBranchSummary={showBranchComparison}
                        onChanged={() => shifts.load(true)}
                    />
                </TabsContent>

                <TabsContent value="products">
                    <ProductsTab data={products.data} loading={products.loading} />
                </TabsContent>

                <TabsContent value="staff">
                    <StaffTab data={staff.data} loading={staff.loading} />
                </TabsContent>

                <TabsContent value="discounts">
                    <DiscountsTab data={discounts.data} loading={discounts.loading} />
                </TabsContent>

                <TabsContent value="tax">
                    <TaxTab data={tax.data} loading={tax.loading} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
