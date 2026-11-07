import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, Copy, Link2 } from 'lucide-react';
import { toast } from 'sonner';
import { categoryService } from '@/features/categories/api/categoryService';
import { productService } from '@/features/products/api/productService';
import { tableService } from '@/features/tables/api/tableService';
import { cashRegisterService } from '@/features/cashier/api/cashRegisterService';
import { userService } from '@/features/users/api/userService';
import { branchService } from '@/features/branches/api/branchService';
import { ROOT_DOMAIN } from '@/lib/tenant';
import { cn } from '@/lib/utils';

interface Step {
    key: string;
    label: string;
    hint: string;
    to: string;
    done: boolean;
}

// Yeni açılmış (boş) bir şubede "şimdi ne yapmalıyım" sorusuna cevap: sırayla kurulum adımları.
// Her adım tamamlanınca tik alır; hepsi bitince kart kendini gizler.
export default function SetupChecklist() {
    const [steps, setSteps] = useState<Step[] | null>(null);
    const [slug, setSlug] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        const count = <T,>(p: Promise<T[]>) => p.then(r => r.length).catch(() => 0);

        Promise.all([
            count(categoryService.getCategories()),
            count(productService.getProducts()),
            count(tableService.getTables()),
            count(cashRegisterService.getCashRegisters()),
            count(userService.getUsersByRestaurantId()),
            branchService.getMyBranch().then(b => b.slug || null).catch(() => null),
        ]).then(([categories, products, tables, registers, staff, branchSlug]) => {
            if (cancelled) return;
            setSlug(branchSlug);
            setSteps([
                { key: 'category', label: 'Kategori ekle', hint: 'Ana yemekler, içecekler gibi menü başlıkları', to: '/admin/menu', done: categories > 0 },
                { key: 'product', label: 'Ürün ekle', hint: 'Fiyatlarıyla birlikte menüdeki ürünler', to: '/admin/menu', done: products > 0 },
                { key: 'table', label: 'Masaları tanımla', hint: 'Bölgeler ve masalar; garson ekranında bunlar görünür', to: '/admin/tables', done: tables > 0 },
                { key: 'register', label: 'Kasa aç', hint: 'Ödemelerin ve vardiyaların bağlanacağı kasa', to: '/admin/cash-registers', done: registers > 0 },
                { key: 'staff', label: 'Personel ekle', hint: 'Garson, mutfak ve kasiyer hesapları', to: '/admin/staff', done: staff > 0 },
            ]);
        });

        return () => { cancelled = true; };
    }, []);

    if (!steps) return null;
    const doneCount = steps.filter(s => s.done).length;
    if (doneCount === steps.length) return null;

    const loginAddress = slug ? `${slug}.${ROOT_DOMAIN}` : null;

    const copyAddress = async () => {
        if (!loginAddress) return;
        try {
            await navigator.clipboard.writeText(`https://${loginAddress}`);
            toast.success('Giriş adresi kopyalandı.');
        } catch {
            toast.error('Kopyalanamadı, adresi elle seçip kopyalayın.');
        }
    };

    return (
        <section className="rounded-xl border border-rb-gold/40 bg-rb-gold-bg p-5 space-y-4">
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h2 className="font-serif text-lg font-bold text-foreground">Kurulumu tamamla</h2>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        Restoranın çalışmaya hazır olması için kalan adımlar.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="h-1.5 w-28 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                        <div className="h-full bg-rb-gold transition-all" style={{ width: `${(doneCount / steps.length) * 100}%` }} />
                    </div>
                    <span className="text-xs font-semibold text-muted-foreground">{doneCount}/{steps.length}</span>
                </div>
            </div>

            <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                {steps.map((step, index) => (
                    <li key={step.key}>
                        <Link
                            to={step.to}
                            className={cn(
                                'flex h-full flex-col gap-2 rounded-lg border p-3 transition-colors',
                                step.done
                                    ? 'border-rb-green/30 bg-rb-green-bg'
                                    : 'border-border bg-card hover:border-rb-gold/60'
                            )}
                        >
                            <div className="flex items-center gap-2">
                                <span className={cn(
                                    'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold',
                                    step.done ? 'bg-rb-green text-white' : 'bg-rb-gold/20 text-rb-amber'
                                )}>
                                    {step.done ? <Check className="h-3.5 w-3.5" /> : index + 1}
                                </span>
                                <span className={cn('text-sm font-semibold', step.done ? 'text-rb-green line-through decoration-rb-green/50' : 'text-foreground')}>
                                    {step.label}
                                </span>
                            </div>
                            <p className="text-xs text-muted-foreground leading-snug">{step.hint}</p>
                            {!step.done && (
                                <span className="mt-auto inline-flex items-center gap-1 text-xs font-medium text-rb-amber">
                                    Başla <ArrowRight className="h-3 w-3" />
                                </span>
                            )}
                        </Link>
                    </li>
                ))}
            </ol>

            {loginAddress && (
                <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5">
                    <Link2 className="h-4 w-4 text-rb-gold shrink-0" />
                    <div className="min-w-0 flex-1">
                        <p className="text-xs text-muted-foreground">Personel giriş adresi</p>
                        <p className="font-mono text-sm text-foreground truncate">{loginAddress}</p>
                    </div>
                    <button
                        type="button"
                        onClick={copyAddress}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
                    >
                        <Copy className="h-3.5 w-3.5" /> Kopyala
                    </button>
                </div>
            )}
        </section>
    );
}
