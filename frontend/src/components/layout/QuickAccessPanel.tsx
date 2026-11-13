import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { QRCodeCanvas, QRCodeSVG } from 'qrcode.react';
import { ArrowRight, Check, ChevronDown, Copy, Download, MessageCircle, PanelRightClose, Share2, X, Zap } from 'lucide-react';
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

// Telefonda/tablette cihazın kendi paylaşım menüsü; masaüstünde WhatsApp + kopyala seçenekleri.
function canNativeShare(): boolean {
    return typeof navigator.share === 'function' && window.matchMedia('(pointer: coarse)').matches;
}

interface AddressCardProps {
    /** Paylaşım başlığı ve QR'ın erişilebilir adı: "Personel giriş adresi". */
    title: string;
    /** Ekranda görünen, https'siz adres: "demo.sophram.com/login". */
    address: string;
    description: string;
    /** İndirilen PNG'nin adı. */
    fileName: string;
}

// QR + adres + paylaş/indir kartı. Personel girişi ve müşteri sitesi aynı kartı kullanır.
function AddressCard({ title, address, description, fileName }: AddressCardProps) {
    const [shareMenuOpen, setShareMenuOpen] = useState(false);
    const downloadQrRef = useRef<HTMLCanvasElement>(null);
    const url = `https://${address}`;

    const copyAddress = async () => {
        try {
            await navigator.clipboard.writeText(url);
            toast.success('Adres kopyalandı.');
        } catch {
            toast.error('Kopyalanamadı, adresi elle seçip kopyalayın.');
        }
    };

    const share = async () => {
        if (!canNativeShare()) {
            setShareMenuOpen(v => !v);
            return;
        }
        try {
            await navigator.share({ title, text: title, url });
        } catch (err) {
            // Kullanıcı paylaşım menüsünü kapattıysa sessiz kal; başka hatada seçenekleri göster.
            if (!(err instanceof DOMException && err.name === 'AbortError')) setShareMenuOpen(true);
        }
    };

    const downloadQr = () => {
        const canvas = downloadQrRef.current;
        if (!canvas) return;
        const link = document.createElement('a');
        link.download = fileName;
        link.href = canvas.toDataURL('image/png');
        link.click();
    };

    return (
        <div className="space-y-3">
            {/* "QR indir" için görünmeyen, baskıya uygun büyük kopya */}
            <QRCodeCanvas ref={downloadQrRef} value={url} size={512} marginSize={2} className="hidden" aria-hidden="true" />

            <div className="flex justify-center rounded-[14px] border border-border bg-white p-4">
                <QRCodeSVG value={url} size={160} role="img" aria-label={`${title} QR kodu`} />
            </div>
            <div className="flex h-11 items-center gap-1.5 rounded-[10px] border border-border bg-background pl-3 pr-1">
                <span className="min-w-0 flex-1 truncate font-mono text-[13px] text-foreground">{address}</span>
                <button
                    type="button"
                    onClick={copyAddress}
                    aria-label="Adresi kopyala"
                    className="flex h-9 w-9 items-center justify-center rounded-lg bg-card text-rb-text-sub transition-colors hover:text-foreground"
                >
                    <Copy className="h-[15px] w-[15px]" aria-hidden="true" />
                </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
                <button
                    type="button"
                    onClick={share}
                    aria-expanded={canNativeShare() ? undefined : shareMenuOpen}
                    className="flex h-11 items-center justify-center gap-1.5 rounded-[10px] bg-rb-gold text-[13.5px] font-semibold text-rb-gold-foreground transition-opacity hover:opacity-90"
                >
                    <Share2 className="h-[15px] w-[15px]" aria-hidden="true" />
                    Paylaş
                </button>
                <button
                    type="button"
                    onClick={downloadQr}
                    className="flex h-11 items-center justify-center gap-1.5 rounded-[10px] border border-border bg-card text-[13.5px] font-semibold text-foreground transition-colors hover:bg-muted"
                >
                    <Download className="h-[15px] w-[15px]" aria-hidden="true" />
                    QR indir
                </button>
            </div>
            {shareMenuOpen && (
                <div className="overflow-hidden rounded-[10px] border border-border">
                    <a
                        href={`https://wa.me/?text=${encodeURIComponent(`${title}: ${url}`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setShareMenuOpen(false)}
                        className="flex h-11 items-center gap-2.5 px-3 text-[13.5px] font-medium text-foreground transition-colors hover:bg-muted"
                    >
                        <MessageCircle className="h-4 w-4 text-rb-green" aria-hidden="true" />
                        WhatsApp ile gönder
                    </a>
                    <button
                        type="button"
                        onClick={() => { setShareMenuOpen(false); void copyAddress(); }}
                        className="flex h-11 w-full items-center gap-2.5 border-t border-border px-3 text-left text-[13.5px] font-medium text-foreground transition-colors hover:bg-muted"
                    >
                        <Copy className="h-4 w-4 text-rb-text-sub" aria-hidden="true" />
                        Bağlantıyı kopyala
                    </button>
                </div>
            )}
            <p className="text-xs leading-relaxed text-rb-text-sub">{description}</p>
        </div>
    );
}

// Şube modunda her sayfada sağda duran "Hızlı Erişim" paneli. Tasarım: canvas "Hızlı Erişim Paneli".
// Bölümlerden oluşur: personel giriş ve müşteri sitesi adresleri (QR + paylaş) ve kurulum listesi. Kurulum sürerken
// liste üstte durur; bitince tek satıra iner ve adres kartı öne geçer. Panel kaldırılmaz, yalnızca daraltılır.
// Yeni bir kart eklemek için gövdeye bir <section> daha koymak yeterli.
export default function QuickAccessPanel() {
    const location = useLocation();
    const [steps, setSteps] = useState<Step[] | null>(null);
    const [slug, setSlug] = useState<string | null>(null);
    const [open, setOpen] = useState(readOpen);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [setupExpanded, setSetupExpanded] = useState(false);
    const [addressTab, setAddressTab] = useState<'staff' | 'customer'>('staff');
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
            setSteps([
                { key: 'category', label: 'Kategori ekle', hint: 'Ana yemekler, içecekler gibi menü başlıkları', to: '/admin/menu', done: categories > 0, summary: plural(categories, 'kategori') },
                { key: 'product', label: 'Ürün ekle', hint: 'Fiyatlarıyla birlikte menüdeki ürünler', to: '/admin/menu', done: products > 0, summary: plural(products, 'ürün') },
                { key: 'region', label: 'Bölge ekle', hint: 'Salon, Bahçe gibi masa grupları; her masa bir bölgeye bağlıdır', to: '/admin/tables', done: regions > 0, summary: plural(regions, 'bölge') },
                { key: 'table', label: 'Masaları tanımla', hint: 'Garsonlar bu masalara sipariş açar', to: '/admin/tables', done: tables > 0, summary: plural(tables, 'masa') },
                { key: 'register', label: 'Kasa aç', hint: 'Ödemelerin ve vardiyaların bağlanacağı kasa', to: '/admin/cash-registers', done: registers > 0, summary: plural(registers, 'kasa') },
                { key: 'staff', label: 'Kullanıcı ekle', hint: 'Garson, mutfak ve kasiyer hesapları', to: '/admin/staff', done: staff > 0, summary: plural(staff, 'kullanıcı') },
            ]);
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

    if (!steps) return null;
    const doneCount = steps.filter(s => s.done).length;
    const allDone = doneCount === steps.length;

    const nextStep = steps.find(s => !s.done) ?? null;
    const isOnPage = (step: Step) => location.pathname.startsWith(step.to);
    const progress = Math.round((doneCount / steps.length) * 100);

    // Alan adının kökü müşteri sitesi (menü, rezervasyon); personel /login'den girer.
    const siteAddress = slug ? `${slug}.${ROOT_DOMAIN}` : null;
    const addressTabs = [
        { key: 'staff' as const, label: 'Personel' },
        { key: 'customer' as const, label: 'Müşteri' },
    ];
    // İki adres sekmeli: aynı anda tek QR görünür. key, sekme değişince paylaş menüsünü sıfırlar.
    const addressSection = siteAddress && (
        <section className="space-y-3 px-5 pb-5 pt-4">
            <div role="tablist" aria-label="QR adresleri" className="grid grid-cols-2 gap-1 rounded-[10px] bg-muted p-1">
                {addressTabs.map(tab => {
                    const active = addressTab === tab.key;
                    return (
                        <button
                            key={tab.key}
                            type="button"
                            role="tab"
                            aria-selected={active}
                            onClick={() => setAddressTab(tab.key)}
                            className={cn(
                                'h-9 rounded-lg text-[13px] font-semibold transition-colors',
                                active ? 'bg-card text-foreground shadow-sm' : 'text-rb-text-sub hover:text-foreground'
                            )}
                        >
                            {tab.label}
                        </button>
                    );
                })}
            </div>
            {addressTab === 'staff' ? (
                <AddressCard
                    key="staff"
                    title="Personel giriş adresi"
                    address={`${siteAddress}/login`}
                    description="Personel bu adresi açarak ya da QR kodu okutarak giriş yapar."
                    fileName={`${slug}-personel-qr.png`}
                />
            ) : (
                <AddressCard
                    key="customer"
                    title="Müşteri adresi"
                    address={siteAddress}
                    description="Müşteriler bu QR'ı okutunca restoranın sitesi açılır: menüye bakar, rezervasyon isteği gönderir."
                    fileName={`${slug}-musteri-qr.png`}
                />
            )}
        </section>
    );

    const stepList = (
        <ol className="space-y-0.5">
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
                            step.done ? 'bg-rb-green text-rb-green-foreground'
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
                                {step.done ? step.summary : here && isNext ? `${step.hint}. Şu an bu sayfadasınız.` : step.hint}
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
    );

    // Kurulum sürerken: başlık + ilerleme + adımlar, panelin en üstünde.
    const setupInProgress = (
        <section className="space-y-2.5 border-b border-border px-2.5 pb-3 pt-4">
            <div className="space-y-2 px-2.5">
                <div className="flex items-baseline justify-between">
                    <h3 className="text-sm font-semibold text-foreground">Kurulum</h3>
                    <span className="text-xs text-rb-text-sub">{doneCount} / {steps.length} tamamlandı</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
                    <div className="h-full bg-rb-gold transition-all" style={{ width: `${progress}%` }} />
                </div>
            </div>
            {stepList}
        </section>
    );

    // Kurulum bitince: tek satır; tıklanınca adımlar ve özetleri açılır.
    const setupDone = (
        <section className="border-t border-border px-3 py-1.5">
            <button
                type="button"
                onClick={() => setSetupExpanded(v => !v)}
                aria-expanded={setupExpanded}
                className="flex min-h-14 w-full items-center gap-3 rounded-[10px] p-2 text-left transition-colors hover:bg-muted"
            >
                <span className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full bg-rb-green">
                    <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-foreground">Kurulum</span>
                    <span className="block text-xs text-rb-text-sub">{doneCount} / {steps.length} tamamlandı</span>
                </span>
                <ChevronDown className={cn('h-4 w-4 text-rb-text-sub transition-transform', setupExpanded && 'rotate-180')} aria-hidden="true" />
            </button>
            {setupExpanded && <div className="pb-2">{stepList}</div>}
        </section>
    );

    const body = (
        <div className="flex-1 overflow-y-auto">
            {allDone ? <>{addressSection}{setupDone}</> : <>{setupInProgress}{addressSection}</>}
        </div>
    );

    const header = (onClose: () => void, closeIcon: ReactNode, closeLabel: string) => (
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 pb-4 pt-5">
            <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-rb-gold-bg">
                    <Zap className="h-4 w-4 text-rb-amber" aria-hidden="true" />
                </span>
                <h2 className="font-serif text-[22px] font-bold leading-none text-foreground">Hızlı Erişim</h2>
            </div>
            <button
                type="button"
                onClick={onClose}
                aria-label={closeLabel}
                className="-mr-2 flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
                {closeIcon}
            </button>
        </div>
    );

    const openLabel = allDone
        ? 'Hızlı erişim panelini aç'
        : `Hızlı erişim panelini aç, kurulum ${doneCount} / ${steps.length} tamamlandı`;
    // Kapalı ray: kurulum sürerken ilerleme halkası, bitince şimşek simgesi + dikey "Hızlı Erişim".
    const ringLength = 2 * Math.PI * 11;

    return (
        <>
            {/* Masaüstü: sağda panel ya da ince ray */}
            <aside
                aria-label="Hızlı erişim"
                className={cn(
                    'hidden md:flex shrink-0 flex-col border-l border-border bg-card transition-[width] duration-300 ease-in-out',
                    open ? 'w-[300px]' : 'w-11'
                )}
            >
                {open ? (
                    <>
                        {header(toggleOpen, <PanelRightClose className="h-4 w-4" />, 'Paneli daralt')}
                        {body}
                    </>
                ) : (
                    <div className="flex flex-col items-center pt-4">
                        <button
                            type="button"
                            onClick={toggleOpen}
                            aria-label={openLabel}
                            className="flex w-9 flex-col items-center gap-2.5 rounded-full border border-rb-gold/50 bg-rb-gold-bg pb-3 pt-2.5 text-foreground transition-colors hover:bg-rb-gold/20"
                        >
                            {allDone ? (
                                <Zap className="h-4 w-4 text-rb-amber" aria-hidden="true" />
                            ) : (
                                <span className="relative flex h-[26px] w-[26px] items-center justify-center">
                                    <svg aria-hidden="true" width="26" height="26" viewBox="0 0 26 26" className="absolute inset-0 -rotate-90">
                                        <circle cx="13" cy="13" r="11" fill="none" className="stroke-black/10 dark:stroke-white/10" strokeWidth="3" />
                                        <circle cx="13" cy="13" r="11" fill="none" className="stroke-rb-gold" strokeWidth="3" strokeLinecap="round"
                                            strokeDasharray={ringLength} strokeDashoffset={ringLength * (1 - doneCount / steps.length)} />
                                    </svg>
                                    <span className="relative text-[9px] font-bold text-rb-amber">{doneCount}/{steps.length}</span>
                                </span>
                            )}
                            <span className="rotate-180 text-[11px] font-bold uppercase tracking-[0.12em] text-rb-amber [writing-mode:vertical-rl]">Hızlı Erişim</span>
                        </button>
                    </div>
                )}
            </aside>

            {/* Mobil: sağ altta düğme, panel alttan açılır */}
            <button
                type="button"
                onClick={() => setMobileOpen(true)}
                aria-label={openLabel}
                className="md:hidden fixed bottom-5 right-5 z-40 flex h-12 items-center gap-2 rounded-full border border-rb-gold/50 bg-card px-4 text-sm font-semibold text-foreground shadow-lg"
            >
                <Zap className="h-4 w-4 text-rb-amber" aria-hidden="true" />
                {allDone ? 'Hızlı Erişim' : `Kurulum ${doneCount}/${steps.length}`}
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
