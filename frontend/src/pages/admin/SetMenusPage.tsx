import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Image as ImageIcon, Layers, Pencil, Star } from 'lucide-react';
import { setMenuService } from '@/features/setMenus/api/setMenuService';
import { toSetMenuInput, type SetMenu } from '@/features/setMenus/types';
import { marginText } from '@/features/setMenus/setMenuCost';
import SetMenuEditorModal from '@/features/setMenus/components/SetMenuEditorModal';
import { productService } from '@/features/products/api/productService';
import type { ProductWithCost } from '@/features/products/types';
import { categoryService } from '@/features/categories/api/categoryService';
import type { Category } from '@/features/categories/types';
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Switch } from '@/components/ui/switch';
import { getApiErrorMessage } from '@/lib/apiError';
import { formatPrice } from '@/lib/format';
import { cn } from '@/lib/utils';
import { SortableList, SortableRow } from '@/components/dnd/SortableList';
import { SortModeBanner, SortModeButton } from '@/components/dnd/SortMode';

// "İçecek: Ayran / Kola (+10 ₺)" — kartta menünün içeriği tek bakışta.
function slotSummary(menu: SetMenu): string[] {
    return menu.slots.map(slot => {
        const options = slot.options
            .map(o => `${o.productName}${o.isProductActive ? '' : ' (satış dışı)'}${o.surcharge > 0 ? ` (+${formatPrice(o.surcharge)} ₺)` : ''}`)
            .join(' / ');
        return slot.isFixed ? options : `${slot.name}: ${options}`;
    });
}

// Set menüler ("Adana Menü"): sabit fiyatlı paketler. Siparişte tek satır, mutfakta içindeki ürünler ayrı ayrı.
export default function SetMenusPage() {
    const [menus, setMenus] = useState<SetMenu[]>([]);
    const [products, setProducts] = useState<ProductWithCost[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loaded, setLoaded] = useState(false);
    const [sorting, setSorting] = useState(false);
    // undefined: kapalı, null: yeni menü.
    const [editing, setEditing] = useState<SetMenu | null | undefined>(undefined);
    const [deleteTarget, setDeleteTarget] = useState<SetMenu | null>(null);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    const loadMenus = useCallback(() => setMenuService.getSetMenusWithCost().then(setMenus), []);

    useEffect(() => {
        Promise.all([
            loadMenus(),
            productService.getProductsWithCost().then(setProducts),
            categoryService.getCategories().then(setCategories),
        ]).catch(console.error).finally(() => setLoaded(true));
    }, [loadMenus]);

    const handleToggleActive = async (menu: SetMenu) => {
        try {
            await setMenuService.updateSetMenu(menu.id, { ...toSetMenuInput(menu), isActive: !menu.isActive });
            setMenus(prev => prev.map(m => m.id === menu.id ? { ...m, isActive: !m.isActive } : m));
        } catch (err) {
            toast.error(getApiErrorMessage(err, 'Menü güncellenemedi.'));
        }
    };

    const handleToggleFeatured = async (menu: SetMenu) => {
        try {
            await setMenuService.updateSetMenu(menu.id, { ...toSetMenuInput(menu), isFeatured: !menu.isFeatured });
            setMenus(prev => prev.map(m => m.id === menu.id ? { ...m, isFeatured: !m.isFeatured } : m));
        } catch (err) {
            toast.error(getApiErrorMessage(err, 'Menü güncellenemedi.'));
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            await setMenuService.deleteSetMenu(deleteTarget.id);
            setMenus(prev => prev.filter(m => m.id !== deleteTarget.id));
            setDeleteTarget(null);
        } catch (err) {
            setDeleteError(getApiErrorMessage(err, 'Menü silinemedi.'));
        }
    };

    const closeDeleteDialog = () => {
        setDeleteTarget(null);
        setDeleteError(null);
    };

    const handleSaved = () => {
        setEditing(undefined);
        loadMenus().catch(console.error);
    };

    const activeCount = menus.filter(m => m.isActive).length;

    // Sürükle-bırak sonrası sıra hemen kaydedilir; hata olursa eski sıra geri gelir.
    const handleReorder = async (next: SetMenu[]) => {
        const previous = menus;
        setMenus(next);
        try {
            await setMenuService.reorderSetMenus(next.map(m => m.id));
            toast.success('Menü sırası kaydedildi.');
        } catch (err) {
            setMenus(previous);
            toast.error(getApiErrorMessage(err, 'Menü sırası kaydedilemedi.'));
        }
    };

    return (
        <div className="space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-serif font-bold text-foreground">Set menüler</h1>
                    <p className="mt-0.5 text-sm text-muted-foreground">{activeCount} aktif menü</p>
                </div>
                <div className="flex items-center gap-2">
                    {menus.length > 1 && <SortModeButton active={sorting} onToggle={() => setSorting(v => !v)} />}
                    {!sorting && (
                        <button
                            type="button"
                            onClick={() => setEditing(null)}
                            disabled={products.length === 0}
                            className="flex items-center gap-1.5 rounded-lg bg-rb-gold px-4 py-2 text-sm font-medium text-rb-gold-foreground transition-colors hover:opacity-90 disabled:opacity-50"
                        >
                            + Menü Ekle
                        </button>
                    )}
                </div>
            </div>

            {sorting && menus.length > 1 ? (
                <div className="space-y-4">
                    <SortModeBanner>
                        Menüleri tutamaktan tutup sürükleyin (telefonda basılı tutun). Bırakınca sıra kaydedilir; restoran sitesinde,
                        QR menüde, online siparişte ve garson ekranında bu sırayla görünür.
                    </SortModeBanner>
                    <SortableList
                        items={menus}
                        getName={m => m.name}
                        onReorder={next => void handleReorder(next)}
                        className="flex max-w-2xl flex-col gap-2"
                        renderItem={(menu, state) => (
                            <SortableRow state={state} label={`${menu.name} menüsünü taşı`}>
                                <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
                                    {menu.imageUrl
                                        ? <img src={menu.imageUrl} alt="" loading="lazy" draggable={false} className="size-full object-cover" />
                                        : <ImageIcon className="size-4 text-muted-foreground" aria-hidden="true" />}
                                </div>
                                <div className="flex min-w-0 flex-1 flex-col">
                                    <span className={cn('truncate text-sm font-semibold', menu.isActive ? 'text-foreground' : 'text-muted-foreground')}>{menu.name}</span>
                                    <span className="truncate text-xs text-muted-foreground">
                                        {menu.isActive ? (menu.categoryName ?? 'Set menü') : 'Satış dışı'}
                                    </span>
                                </div>
                                <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">{formatPrice(menu.price)} ₺</span>
                            </SortableRow>
                        )}
                    />
                </div>
            ) : !loaded ? null : menus.length === 0 ? (
                <EmptyState
                    icon={Layers}
                    title={products.length === 0 ? 'Önce yemek ekleyin' : 'Henüz menü yok'}
                    description={products.length === 0
                        ? 'Set menüler Yemeklerimiz\'deki ürünlerden oluşur. Önce ürünleri ekleyin.'
                        : 'Birkaç ürünü tek fiyatla satın: "Adana Menü" = Adana Kebap + içecek seçimi + patates. Hesapta tek satır, mutfakta her ürün kendi istasyonunda.'}
                    action={products.length === 0 ? undefined : { label: 'İlk menüyü ekle', onClick: () => setEditing(null) }}
                    link={products.length === 0 ? { label: 'Yemeklerimiz\'e git', to: '/admin/menu' } : undefined}
                />
            ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {menus.map(menu => {
                        const margin = marginText(menu.price, menu.estimatedCost ?? 0);
                        const hasInactiveProduct = menu.slots.some(s => s.options.some(o => !o.isProductActive));
                        return (
                            <div key={menu.id} className="flex h-full flex-col gap-3 rounded-xl border border-border bg-card p-4">
                                <div className="flex aspect-video items-center justify-center overflow-hidden rounded-lg bg-muted">
                                    {menu.imageUrl
                                        ? <img src={menu.imageUrl} alt={menu.name} loading="lazy" className="h-full w-full object-cover" />
                                        : <ImageIcon className="h-6 w-6 text-muted-foreground/40" />}
                                </div>

                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-foreground">{menu.name}</p>
                                        {menu.categoryName && <p className="truncate text-xs text-muted-foreground">{menu.categoryName}</p>}
                                    </div>
                                    <div className="flex shrink-0 items-center gap-1.5">
                                        <span className={cn(
                                            'rounded-full px-2 py-0.5 text-xs font-bold uppercase tracking-wide',
                                            menu.isActive ? 'bg-rb-green-bg text-rb-green' : 'bg-muted text-muted-foreground'
                                        )}>
                                            {menu.isActive ? 'Aktif' : 'Pasif'}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => handleToggleFeatured(menu)}
                                            aria-pressed={menu.isFeatured}
                                            aria-label={menu.isFeatured ? `${menu.name} menüsünü şefin tavsiyesinden çıkar` : `${menu.name} menüsünü şefin tavsiyesine koy`}
                                            title={menu.isFeatured ? 'Şefin tavsiyesinde (çıkarmak için tıkla)' : 'Şefin tavsiyesine koy'}
                                            className={cn(
                                                'flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-muted',
                                                menu.isFeatured ? 'text-rb-gold' : 'text-muted-foreground hover:text-foreground'
                                            )}
                                        >
                                            <Star className={cn('h-3.5 w-3.5', menu.isFeatured && 'fill-current')} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setEditing(menu)}
                                            aria-label={`${menu.name} menüsünü düzenle`}
                                            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                        >
                                            <Pencil className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                </div>

                                <ul className="space-y-0.5 text-xs text-muted-foreground">
                                    {slotSummary(menu).map(line => <li key={line}>{line}</li>)}
                                </ul>
                                {hasInactiveProduct && (
                                    <p className="text-xs text-destructive">"Satış dışı" işaretli ürün siparişte seçilemez.</p>
                                )}

                                <div className="mt-auto space-y-3">
                                    <div className="flex items-baseline justify-between gap-2">
                                        <p className="text-lg font-bold text-foreground">{formatPrice(menu.price)} ₺</p>
                                        {margin && (
                                            <p className={cn('truncate text-xs', margin.isLoss ? 'text-destructive' : 'text-muted-foreground')}
                                                title={`Tahmini maliyet ${formatPrice(menu.estimatedCost ?? 0)} ₺ (varsayılan seçeneklerle)`}>
                                                {margin.text}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
                                        <Switch
                                            checked={menu.isActive}
                                            onCheckedChange={() => handleToggleActive(menu)}
                                            label={<span className="text-xs text-muted-foreground">{menu.isActive ? 'Satışta' : 'Satış dışı'}</span>}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setDeleteTarget(menu)}
                                            className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive"
                                        >
                                            Sil
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {editing !== undefined && (
                <SetMenuEditorModal
                    menu={editing}
                    products={products}
                    categories={categories}
                    onClose={() => setEditing(undefined)}
                    onSaved={handleSaved}
                />
            )}

            <AlertDialog open={deleteTarget !== null} onOpenChange={open => !open && closeDeleteDialog()}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Menüyü sil</AlertDialogTitle>
                        <AlertDialogDescription>
                            {deleteError ?? `${deleteTarget?.name ?? 'Bu menü'} silinsin mi? Bu işlem geri alınamaz.`}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>İptal</AlertDialogCancel>
                        {!deleteError && <Button variant="destructive" onClick={handleDelete}>Sil</Button>}
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
