import { useEffect, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, Check, Copy, ListChecks, PanelRightClose, X } from 'lucide-react';
import { toast } from 'sonner';
import { categoryService } from '@/features/categories/api/categoryService';
import { productService } from '@/features/products/api/productService';
import { tableService } from '@/features/tables/api/tableService';
import { regionService } from '@/features/regions/api/regionService';
import { cashRegisterService } from '@/features/cashier/api/cashRegisterService';
import { userService } from '@/features/users/api/userService';
import { branchService } from '@/features/branches/api/branchService';
import { ROOT_DOMAIN } from '@/lib/tenant';
import { DATA_CHANGED_EVENT } from '@/lib/axiosInstance';
import { cn } from '@/lib/utils';

interface Step {
    key: string;
    label: string;
    hint: string;
    to: string;
    done: boolean;
    /** Tamamlanan adımın altında: "3 kategori", "2 bölge · 12 masa". */
    summary: string;
}

const OPEN_KEY = 'setup-panel:open';

function readOpen(): boolean {
    try { return localStorage.getItem(OPEN_KEY) !== '0'; } catch { return true; }
}

function plural(n: number, noun: string) {
    return `${n} ${noun}`;
}

// Şube modunda her sayfada sağda duran kurulum listesi. Tasarım: canvas "Kurulum Paneli".
// Sayfa değiştikçe adımlar yeniden sayılır; kurulum bitince "tamamlandı" ekranı gösterir,
// kullanıcı kaldırınca bir daha gelmez. Zaten tamam olan şubelerde hiç görünmez.
export default function SetupPanel() {
    const location = useLocation();
    const [steps, setSteps] = useState<Step[] | null>(null);
    const [slug, setSlug] = useState<string | null>(null);
    const [open, setOpen] = useState(readOpen);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [dismissed, setDismissed] = useState(false);
    const [sawIncomplete, setSawIncomplete] = useState(false);
    // Her başarılı yazma isteğinde artar; adımlar yeniden sayılır (masa eklenince tik hemen gelsin).
    const [changeTick, setChangeTick] = useState(0);

    useEffect(() => {
        const bump = () => setChangeTick(t => t + 1);
        window.addEventListener(DATA_CHANGED_EVENT, bump);
        return () => window.removeEventListener(DATA_CHANGED_EVENT, bump);
    }, []);

    useEffect(() => {
        let cancelled = false;
        const count = <T,>(p: Promise<T[]>) => p.then(r => r.length).catch(() => 0);

        Promise.all([
            count(categoryService.getCategories()),
            count(productService.getProducts()),
            count(regionService.getRegions()),
            count(tableService.getTables()),
            count(cashRegisterService.getCashRegisters()),
            count(userService.getUsersByRestaurantId()),
            branchService.getMyBranch().then(b => b.slug || null).catch(() => null),
        ]).then(([categories, products, regions, tables, registers, staff, branchSlug]) => {
            if (cancelled) return;
            setSlug(branchSlug);
            const next: Step[] = [
                { key: 'category', label: 'Kategori ekle', hint: 'Ana yemekler, içecekler gibi menü başlıkları', to: '/admin/menu', done: categories > 0, summary: plural(categories, 'kategori') },
                { key: 'product', label: 'Ürün ekle', hint: 'Fiyatlarıyla birlikte menüdeki ürünler', to: '/admin/menu', done: products > 0, summary: plural(products, 'ürün') },
                { key: 'region', label: 'Bölge ekle', hint: 'Salon, Bahçe gibi masa grupları; her masa bir bölgeye bağlıdır', to: '/admin/tables', done: regions > 0, summary: plural(regions, 'bölge') },
                { key: 'table', label: 'Masaları tanımla', hint: 'Garsonlar bu masalara sipariş açar', to: '/admin/tables', done: tables > 0, summary: plural(tables, 'masa') },
                { key: 'register', label: 'Kasa aç', hint: 'Ödemelerin ve vardiyaların bağlanacağı kasa', to: '/admin/cash-registers', done: registers > 0, summary: plural(registers, 'kasa') },
                { key: 'staff', label: 'Personel ekle', hint: 'Garson, mutfak ve kasiyer hesapları', to: '/admin/staff', done: staff > 0, summary: plural(staff, 'çalışan') },
            ];
            if (next.some(s => !s.done)) setSawIncomplete(true);
            setSteps(next);
        });

        return () => { cancelled = true; };
    }, [location.pathname, changeTick]);

    const toggleOpen = () => {
        setOpen(v => {
            const next = !v;
            try { localStorage.setItem(OPEN_KEY, next ? '1' : '0'); } catch { /* özel pencere */ }
            return next;
        });
    };

    if (!steps || dismissed) return null;
    const doneCount = steps.filter(s => s.done).length;
    const allDone = doneCount === steps.length;
    // Kurulumu zaten bitmiş bir şubeye bu oturumda hiç eksik göstermediysek paneli hiç açma.
    if (allDone && !sawIncomplete) return null;

    const loginAddress = slug ? `${slug}.${ROOT_DOMAIN}` : null;
    const nextStep = steps.find(s => !s.done) ?? null;
    const isOnPage = (step: Step) => location.pathname.startsWith(step.to);
    const progress = Math.round((doneCount / steps.length) * 100);

    const copyAddress = async () => {
        if (!loginAddress) return;
        try {
            await navigator.clipboard.writeText(`https://${loginAddress}`);
            toast.success('Giriş adresi kopyalandı.');
        } catch {
            toast.error('Kopyalanamadı, adresi elle seçip kopyalayın.');
        }
    };

    const addressBox = loginAddress && (
        <div className="space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">Personel giriş adresi</p>
            <div className="flex h-[38px] items-center gap-2 rounded-[9px] border border-border bg-background pl-2.5 pr-1.5">
                <span className="min-w-0 flex-1 truncate font-mono text-[12.5px] text-foreground">{loginAddress}</span>
                <button
                    type="button"
                    onClick={copyAddress}
                    aria-label="Adresi kopyala"
                    className="flex h-7 w-7 items-center justify-center rounded-md bg-card text-muted-foreground transition-colors hover:text-foreground"
                >
                    <Copy className="h-3.5 w-3.5" />
                </button>
            </div>
        </div>
    );

    const body = allDone ? (
        <div className="flex flex-1 flex-col items-center justify-center px-5 py-8 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-rb-green-bg">
                <Check className="h-6 w-6 text-rb-green" strokeWidth={2.2} aria-hidden="true" />
            </span>
            <h3 className="mt-4 font-serif text-[22px] font-bold text-foreground">Kurulum tamamlandı</h3>
            <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">Restoran çalışmaya hazır. Personel bu adresten giriş yapabilir.</p>
            {loginAddress && <div className="mt-4 w-full text-left">{addressBox}</div>}
            <button
                type="button"
                onClick={() => setDismissed(true)}
                className="mt-4 h-9 rounded-[9px] bg-rb-gold px-4 text-[13px] font-semibold text-rb-gold-foreground transition-opacity hover:opacity-90"
            >
                Paneli kaldır
            </button>
        </div>
    ) : (
        <>
            <ol className="flex-1 space-y-0.5 overflow-y-auto px-2.5 py-2">
                {steps.map((step, index) => {
                    const isNext = step === nextStep;
                    const here = isOnPage(step);
                    return (
                        <li
                            key={step.key}
                            className={cn(
                                'flex items-start gap-3 rounded-[10px] p-2.5',
                                isNext && 'border border-rb-gold/50 bg-rb-gold-bg py-3'
                            )}
                        >
                            <span className={cn(
                                'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                                step.done ? 'bg-rb-green text-white'
                                    : isNext ? 'bg-rb-gold text-rb-gold-foreground'
                                        : 'bg-rb-gold/20 text-rb-amber'
                            )}>
                                {step.done ? <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" /> : index + 1}
                            </span>
                            <div className="min-w-0 flex-1">
                                <p className={cn(
                                    'text-sm font-semibold',
                                    step.done ? 'text-rb-green line-through decoration-rb-green/50' : 'text-foreground'
                                )}>
                                    {step.label}
                                </p>
                                <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
                                    {step.done ? step.summary : here && isNext ? `${step.hint}. Şu an bu sayfadasın.` : step.hint}
                                </p>
                                {isNext && !here && (
                                    <Link
                                        to={step.to}
                                        onClick={() => setMobileOpen(false)}
                                        className="mt-2 inline-flex items-center gap-1 text-[13px] font-semibold text-rb-amber hover:underline"
                                    >
                                        Başla <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden="true" />
                                    </Link>
                                )}
                            </div>
                        </li>
                    );
                })}
            </ol>
            {loginAddress && <div className="border-t border-border px-4 pb-4 pt-3.5">{addressBox}</div>}
        </>
    );

    const header = (onClose: () => void, closeIcon: ReactNode, closeLabel: string) => (
        <div className="space-y-3 border-b border-border px-5 pb-4 pt-5">
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-rb-gold-bg">
                        <ListChecks className="h-4 w-4 text-rb-amber" aria-hidden="true" />
                    </span>
                    <div>
                        <h2 className="font-serif text-[21px] font-bold leading-none text-foreground">Kurulum</h2>
                        <p className="mt-1 text-xs text-muted-foreground">{doneCount} / {steps.length} tamamlandı</p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    aria-label={closeLabel}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                    {closeIcon}
                </button>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
                <div className="h-full bg-rb-gold transition-all" style={{ width: `${progress}%` }} />
            </div>
        </div>
    );

    // Kapalı ray: ilerleme halkası + dikey "Kurulum".
    const ringLength = 2 * Math.PI * 11;

    return (
        <>
            {/* Masaüstü: sağda panel ya da ince ray */}
            <aside
                className={cn(
                    'hidden md:flex shrink-0 flex-col border-l border-border bg-card transition-[width] duration-300 ease-in-out',
                    open ? 'w-[300px]' : 'w-11'
                )}
            >
                {open ? (
                    <>
                        {header(toggleOpen, <PanelRightClose className="h-4 w-4" />, 'Paneli kapat')}
                        {body}
                    </>
                ) : (
                    <div className="flex flex-col items-center pt-4">
                        <button
                            type="button"
                            onClick={toggleOpen}
                            aria-label={`Kurulum panelini aç, ${doneCount} / ${steps.length} tamamlandı`}
                            className="flex w-9 flex-col items-center gap-2.5 rounded-full border border-rb-gold/50 bg-rb-gold-bg pb-3 pt-2.5 text-foreground transition-colors hover:bg-rb-gold/20"
                        >
                            <span className="relative flex h-[26px] w-[26px] items-center justify-center">
                                <svg aria-hidden="true" width="26" height="26" viewBox="0 0 26 26" className="absolute inset-0 -rotate-90">
                                    <circle cx="13" cy="13" r="11" fill="none" className="stroke-black/10 dark:stroke-white/10" strokeWidth="3" />
                                    <circle cx="13" cy="13" r="11" fill="none" className="stroke-rb-gold" strokeWidth="3" strokeLinecap="round"
                                        strokeDasharray={ringLength} strokeDashoffset={ringLength * (1 - doneCount / steps.length)} />
                                </svg>
                                <span className="relative text-[9px] font-bold text-rb-amber">{doneCount}/{steps.length}</span>
                            </span>
                            <span className="rotate-180 text-[11px] font-bold uppercase tracking-[0.12em] text-rb-amber [writing-mode:vertical-rl]">Kurulum</span>
                        </button>
                    </div>
                )}
            </aside>

            {/* Mobil: sağ altta düğme, panel alttan açılır */}
            <button
                type="button"
                onClick={() => setMobileOpen(true)}
                aria-label={`Kurulum panelini aç, ${doneCount} / ${steps.length} tamamlandı`}
                className="md:hidden fixed bottom-5 right-5 z-40 flex h-12 items-center gap-2 rounded-full border border-rb-gold/50 bg-card px-4 text-sm font-semibold text-foreground shadow-lg"
            >
                <ListChecks className="h-4 w-4 text-rb-amber" aria-hidden="true" />
                Kurulum {doneCount}/{steps.length}
            </button>
            {mobileOpen && (
                <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end bg-black/50" onClick={() => setMobileOpen(false)}>
                    <div
                        className="flex max-h-[85vh] flex-col rounded-t-2xl bg-card animate-in slide-in-from-bottom duration-200"
                        onClick={e => e.stopPropagation()}
                    >
                        {header(() => setMobileOpen(false), <X className="h-4 w-4" />, 'Kapat')}
                        {body}
                    </div>
                </div>
            )}
        </>
    );
}
