import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Check, Crop, Image as ImageIcon, Images, Plus, Trash2, Upload, X } from 'lucide-react';
import type { Category } from '@/features/categories/types';
import type { ProductWithCost } from '@/features/products/types';
import ImageCropModal from '@/features/products/components/ImageCropModal';
import StockImagePickerModal from '@/features/stockImages/components/StockImagePickerModal';
import type { StockImage } from '@/features/stockImages/api/stockImageService';
import { Modal, ModalTitle } from '@/components/ui/modal';
import { Switch } from '@/components/ui/switch';
import { getApiErrorMessage } from '@/lib/apiError';
import { formatPrice } from '@/lib/format';
import { inputClass, labelClass } from '@/lib/formStyles';
import { cn } from '@/lib/utils';
import { setMenuService } from '../api/setMenuService';
import { DiscountType, type SetMenu, type SetMenuInput } from '../types';
import { marginText } from '../setMenuCost';
import { applyDiscount, discountError, slotBasePrice, surchargeOf } from '../setMenuPricing';

interface OptionDraft { key: string; productId: string; isDefault: boolean; discountType: DiscountType; discountValue: string; }
// id: sunucudaki bölümün id'si (yeni bölümde yok). Kaydederken geri gönderilir ki bölüm yerinde güncellensin.
interface SlotDraft { key: string; id?: string; categoryId: string; options: OptionDraft[]; }

let keySeq = 0;
const newKey = () => `k${++keySeq}`;
const blankSlot = (): SlotDraft => ({ key: newKey(), categoryId: '', options: [] });
const optionFor = (productId: string): OptionDraft =>
    ({ key: newKey(), productId, isDefault: false, discountType: DiscountType.None, discountValue: '' });

function draftsFrom(menu: SetMenu | null): SlotDraft[] {
    if (!menu) return [blankSlot(), blankSlot()];
    return menu.slots.map(slot => ({
        key: newKey(),
        id: slot.id,
        categoryId: slot.categoryId ?? '',
        options: slot.options.map(o => ({
            key: newKey(),
            productId: o.productId,
            isDefault: o.isDefault && slot.options.length > 1,
            discountType: o.discountType,
            discountValue: o.discountType === DiscountType.None ? '' : String(o.discountValue),
        })),
    }));
}

const discountNumber = (type: DiscountType, value: string) => type === DiscountType.None ? 0 : Number(value) || 0;

/* ── İndirim girişi: Yok / % / ₺ + değer ── */
interface DiscountInputProps {
    type: DiscountType;
    value: string;
    onChange: (type: DiscountType, value: string) => void;
    label: string;
    compact?: boolean;
}

function DiscountInput({ type, value, onChange, label, compact }: DiscountInputProps) {
    const choices: { type: DiscountType; text: string }[] = [
        { type: DiscountType.None, text: 'İndirim yok' },
        { type: DiscountType.Percent, text: '%' },
        { type: DiscountType.Amount, text: '₺' },
    ];
    return (
        <div className="flex items-center gap-1.5" role="group" aria-label={label}>
            <div className="flex overflow-hidden rounded-md border border-border">
                {choices.map(c => (
                    <button
                        key={c.type}
                        type="button"
                        aria-pressed={type === c.type}
                        onClick={() => onChange(c.type, c.type === DiscountType.None ? '' : value)}
                        className={cn(
                            'px-2 py-1 text-xs font-semibold transition-colors',
                            type === c.type ? 'bg-rb-gold text-rb-gold-foreground' : 'text-muted-foreground hover:bg-muted'
                        )}
                    >
                        {c.type === DiscountType.None && compact ? 'Yok' : c.text}
                    </button>
                ))}
            </div>
            {type !== DiscountType.None && (
                <input
                    aria-label={`${label} değeri`}
                    type="number"
                    min={0}
                    max={type === DiscountType.Percent ? 100 : undefined}
                    step="0.01"
                    className={cn(inputClass, 'w-20 px-2 py-1 text-sm')}
                    placeholder={type === DiscountType.Percent ? '%' : '₺'}
                    value={value}
                    onChange={e => onChange(type, e.target.value)}
                />
            )}
        </div>
    );
}

interface SetMenuEditorModalProps {
    /** null: yeni menü. */
    menu: SetMenu | null;
    products: ProductWithCost[];
    categories: Category[];
    onClose: () => void;
    onSaved: () => void;
}

// Menü düzenleyici. Her bölüm bir kategoridir; o kategorinin ürünleri resimli kartlarla seçilir. Bölümde tek ürün
// varsa sabittir, birden çok ürün varsa garson seçer. Fiyat elle girilmez: ürün fiyatları − ürün indirimleri toplanır,
// üstüne menü indirimi uygulanır. Seçenekler arasındaki fiyat farkı ek ücret olur (Ayran 30, Kola 40 → Kola +10 ₺).
export default function SetMenuEditorModal({ menu, products, categories, onClose, onSaved }: SetMenuEditorModalProps) {
    const [name, setName] = useState(menu?.name ?? '');
    const [description, setDescription] = useState(menu?.description ?? '');
    const [isActive, setIsActive] = useState(menu?.isActive ?? true);
    const [isFeatured, setIsFeatured] = useState(menu?.isFeatured ?? false);
    const [categoryId, setCategoryId] = useState(menu?.categoryId ?? '');
    const [menuDiscountType, setMenuDiscountType] = useState<DiscountType>(menu?.discountType ?? DiscountType.None);
    const [menuDiscountValue, setMenuDiscountValue] = useState(
        menu && menu.discountType !== DiscountType.None ? String(menu.discountValue) : '');
    const [slots, setSlots] = useState<SlotDraft[]>(() => draftsFrom(menu));
    const [isSaving, setIsSaving] = useState(false);
    const [cropSource, setCropSource] = useState<{ src: string; revokeOnClose: boolean } | null>(null);
    const [pendingImage, setPendingImage] = useState<{ blob: Blob; previewUrl: string } | null>(null);
    // Hazır görsel seçimi: yüklenen görsel gibi kaydedince uygulanır (yeni menüde oluşturduktan sonra).
    const [pendingStock, setPendingStock] = useState<StockImage | null>(null);
    const [isStockPickerOpen, setIsStockPickerOpen] = useState(false);

    const productById = useMemo(() => new Map(products.map(p => [p.id, p])), [products]);
    const categoryById = useMemo(() => new Map(categories.map(c => [c.id, c])), [categories]);
    const productsOfCategory = useMemo(() => {
        const groups = new Map<string, ProductWithCost[]>();
        for (const p of products) groups.set(p.categoryId, [...(groups.get(p.categoryId) ?? []), p]);
        return groups;
    }, [products]);

    /* ── Fiyat (canlı önizleme; kaydedilen fiyatı sunucu aynı kuralla hesaplar) ── */
    const optionPrice = (o: OptionDraft) =>
        applyDiscount(productById.get(o.productId)?.price ?? 0, o.discountType, discountNumber(o.discountType, o.discountValue));
    const slotBase = (slot: SlotDraft) => slotBasePrice(slot.options.map(o => ({ price: optionPrice(o), isDefault: o.isDefault })));
    const listPrice = slots.reduce((sum, slot) => sum + slotBase(slot), 0);
    const menuDiscount = discountNumber(menuDiscountType, menuDiscountValue);
    const menuPrice = applyDiscount(listPrice, menuDiscountType, menuDiscount);

    const estimatedCost = slots.reduce((sum, slot) => {
        const chosen = slot.options.find(o => o.isDefault) ?? slot.options[0];
        return sum + (productById.get(chosen?.productId ?? '')?.cost ?? 0);
    }, 0);
    const margin = marginText(menuPrice, estimatedCost);

    /* ── Bölüm ve seçenek düzenleme ── */
    const updateSlot = (slotKey: string, change: (slot: SlotDraft) => SlotDraft) =>
        setSlots(prev => prev.map(s => s.key === slotKey ? change(s) : s));
    const updateOption = (slotKey: string, optionKey: string, change: Partial<OptionDraft>) =>
        updateSlot(slotKey, s => ({ ...s, options: s.options.map(o => o.key === optionKey ? { ...o, ...change } : o) }));
    // Kategori değişince o kategoriye ait olmayan seçenekler çıkarılır.
    const changeCategory = (slotKey: string, newCategoryId: string) =>
        updateSlot(slotKey, s => ({
            ...s,
            categoryId: newCategoryId,
            options: s.options.filter(o => productById.get(o.productId)?.categoryId === newCategoryId),
        }));
    // Karta basmak ürünü bölüme ekler ya da çıkarır.
    const toggleProduct = (slotKey: string, productId: string) =>
        updateSlot(slotKey, s => {
            const exists = s.options.some(o => o.productId === productId);
            const options = exists ? s.options.filter(o => o.productId !== productId) : [...s.options, optionFor(productId)];
            return { ...s, options: options.length === 1 ? [{ ...options[0], isDefault: false }] : options };
        });
    // Varsayılan tek olur; seçili olana yeniden basmak varsayılanı kaldırır (garson her seferinde seçer).
    const toggleDefault = (slotKey: string, optionKey: string) =>
        updateSlot(slotKey, s => ({ ...s, options: s.options.map(o => ({ ...o, isDefault: o.key === optionKey ? !o.isDefault : false })) }));

    /* ── Görsel ── */
    const closeCropModal = () => setCropSource(prev => {
        if (prev?.revokeOnClose) URL.revokeObjectURL(prev.src);
        return null;
    });
    const handleImageFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (file) setCropSource({ src: URL.createObjectURL(file), revokeOnClose: true });
    };
    const handleCropConfirm = (blob: Blob) => {
        setPendingImage(prev => {
            if (prev) URL.revokeObjectURL(prev.previewUrl);
            return { blob, previewUrl: URL.createObjectURL(blob) };
        });
        setPendingStock(null);
        closeCropModal();
    };
    const handleStockSelected = (image: StockImage) => {
        setPendingImage(prev => {
            if (prev) URL.revokeObjectURL(prev.previewUrl);
            return null;
        });
        setPendingStock(image);
        setIsStockPickerOpen(false);
    };
    const imageSrc = pendingImage?.previewUrl ?? pendingStock?.url ?? menu?.imageUrl;

    /* ── Kaydet ── */
    const validationError = (): string | null => {
        if (!name.trim()) return 'Menü adı boş olamaz.';
        if (slots.length === 0) return 'Menüde en az bir bölüm olmalı.';
        for (const [index, slot] of slots.entries()) {
            if (!slot.categoryId) return `${index + 1}. bölüm için kategori seçin.`;
            const slotName = categoryById.get(slot.categoryId)?.name ?? `${index + 1}. bölüm`;
            if (slot.options.length === 0) return `"${slotName}" bölümünden en az bir ürün seçin.`;
            for (const o of slot.options) {
                const error = discountError(o.discountType, discountNumber(o.discountType, o.discountValue));
                if (error) return `${productById.get(o.productId)?.name ?? 'Ürün'}: ${error}`;
            }
        }
        const menuError = discountError(menuDiscountType, menuDiscount);
        if (menuError) return `Menü indirimi: ${menuError}`;
        if (menuPrice <= 0) return 'İndirimlerden sonra menü fiyatı 0\'dan büyük olmalı.';
        return null;
    };

    const handleSave = async () => {
        const error = validationError();
        if (error) {
            toast.error(error);
            return;
        }
        const input: SetMenuInput = {
            name: name.trim(),
            description: description.trim(),
            discountType: menuDiscountType,
            discountValue: menuDiscount,
            isActive,
            isFeatured,
            sortOrder: menu?.sortOrder ?? 0,
            categoryId: categoryId || null,
            slots: slots.map(slot => ({
                id: slot.id,
                name: categoryById.get(slot.categoryId)?.name ?? '',
                categoryId: slot.categoryId,
                options: slot.options.map(o => ({
                    productId: o.productId,
                    isDefault: o.isDefault,
                    discountType: o.discountType,
                    discountValue: discountNumber(o.discountType, o.discountValue),
                })),
            })),
        };

        setIsSaving(true);
        try {
            let id = menu?.id;
            if (id) await setMenuService.updateSetMenu(id, input);
            else id = await setMenuService.createSetMenu(input);

            if (pendingImage) {
                try {
                    await setMenuService.uploadSetMenuImage(id, pendingImage.blob);
                } catch (err) {
                    toast.error(getApiErrorMessage(err, 'Menü kaydedildi ama görsel yüklenemedi.'));
                }
            } else if (pendingStock) {
                try {
                    await setMenuService.setStockImage(id, pendingStock.id);
                } catch (err) {
                    toast.error(getApiErrorMessage(err, 'Menü kaydedildi ama hazır görsel uygulanamadı.'));
                }
            }
            toast.success(menu ? 'Menü güncellendi.' : 'Menü eklendi.');
            onSaved();
        } catch (err) {
            toast.error(getApiErrorMessage(err, 'Menü kaydedilemedi.'));
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <>
            <Modal onClose={onClose} closeOnOverlay={false} overlayClassName="bg-black/40 backdrop-blur-sm">
                <div className="relative mx-4 flex max-h-[calc(100dvh-2rem)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl sm:max-h-[90dvh] dark:bg-[#26221e]">
                    <div className="flex shrink-0 items-center justify-between border-b border-border px-6 pb-4 pt-6">
                        <ModalTitle className="text-xl font-bold text-foreground">{menu ? 'Menüyü Düzenle' : 'Menü Ekle'}</ModalTitle>
                        <button type="button" onClick={onClose} aria-label="Kapat" className="text-muted-foreground transition-colors hover:text-foreground">
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[180px_1fr]">
                            <div>
                                <span className={labelClass}>Görsel</span>
                                <div className="flex aspect-video items-center justify-center overflow-hidden rounded-lg border border-dashed border-border bg-muted/50">
                                    {imageSrc
                                        ? <img src={imageSrc} alt={name || 'Menü görseli'} className="h-full w-full object-cover" />
                                        : <ImageIcon className="h-6 w-6 text-muted-foreground" />}
                                </div>
                                <div className="mt-2 flex items-center gap-3">
                                    <label htmlFor="set-menu-image" className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-rb-accent hover:opacity-80">
                                        <Upload className="h-3.5 w-3.5" />
                                        {imageSrc ? 'Değiştir' : 'Görsel seç'}
                                    </label>
                                    {imageSrc && (
                                        <button type="button" onClick={() => setCropSource({ src: imageSrc, revokeOnClose: false })}
                                            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground">
                                            <Crop className="h-3.5 w-3.5" />
                                            Kırp
                                        </button>
                                    )}
                                </div>
                                <button type="button" onClick={() => setIsStockPickerOpen(true)}
                                    className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-medium text-rb-accent hover:opacity-80">
                                    <Images className="h-3.5 w-3.5" />
                                    Hazır görsellerden seç
                                </button>
                                {pendingStock && (
                                    <p className="mt-1 text-xs text-muted-foreground">Hazır görsel: {pendingStock.title}</p>
                                )}
                                <input id="set-menu-image" type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleImageFileSelected} />
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label htmlFor="set-menu-name" className={labelClass}>Menü adı</label>
                                    <input id="set-menu-name" className={inputClass} placeholder="Adana Menü" value={name} onChange={e => setName(e.target.value)} autoFocus />
                                </div>
                                <div>
                                    <label htmlFor="set-menu-category" className={labelClass}>
                                        Menünün kategorisi <span className="font-normal normal-case tracking-normal">(isteğe bağlı)</span>
                                    </label>
                                    <select id="set-menu-category" className={inputClass} value={categoryId} onChange={e => setCategoryId(e.target.value)}>
                                        <option value="">Yok (raporda "Menüler")</option>
                                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="set-menu-description" className={labelClass}>
                                        Açıklama <span className="font-normal normal-case tracking-normal">(isteğe bağlı)</span>
                                    </label>
                                    <input id="set-menu-description" className={inputClass} maxLength={160} placeholder="Adana kebap, içecek ve patates" value={description} onChange={e => setDescription(e.target.value)} />
                                </div>
                            </div>
                        </div>

                        {/* Bölümler */}
                        <div className="space-y-3">
                            <div className="flex flex-wrap items-baseline justify-between gap-2">
                                <span className={labelClass}>Menünün içeriği</span>
                                <span className="text-xs text-muted-foreground">Tek ürün seçilen bölüm sabittir; birden çok ürün seçilirse garson seçer.</span>
                            </div>

                            {slots.map((slot, slotIndex) => {
                                const categoryProducts = productsOfCategory.get(slot.categoryId) ?? [];
                                const selectedIds = new Set(slot.options.map(o => o.productId));
                                const base = slotBase(slot);
                                return (
                                    <div key={slot.key} className="space-y-3 rounded-xl border border-border p-3">
                                        <div className="flex items-center gap-2">
                                            <select
                                                aria-label={`${slotIndex + 1}. bölümün kategorisi`}
                                                className={cn(inputClass, 'py-2 font-semibold')}
                                                value={slot.categoryId}
                                                onChange={e => changeCategory(slot.key, e.target.value)}
                                            >
                                                <option value="">Kategori seçin (ör. İçecekler)</option>
                                                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                            </select>
                                            <button
                                                type="button"
                                                onClick={() => setSlots(prev => prev.filter(s => s.key !== slot.key))}
                                                disabled={slots.length === 1}
                                                aria-label={`${slotIndex + 1}. bölümü sil`}
                                                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-destructive disabled:opacity-30"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>

                                        {/* Kategorinin ürünleri: resimli kartlar, basınca eklenir/çıkarılır */}
                                        {!slot.categoryId ? (
                                            <p className="rounded-lg bg-muted/50 px-3 py-4 text-center text-sm text-muted-foreground">Ürünleri görmek için önce kategori seçin.</p>
                                        ) : categoryProducts.length === 0 ? (
                                            <p className="rounded-lg bg-muted/50 px-3 py-4 text-center text-sm text-muted-foreground">Bu kategoride ürün yok.</p>
                                        ) : (
                                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                                                {categoryProducts.map(p => {
                                                    const selected = selectedIds.has(p.id);
                                                    return (
                                                        <button
                                                            key={p.id}
                                                            type="button"
                                                            aria-pressed={selected}
                                                            onClick={() => toggleProduct(slot.key, p.id)}
                                                            className={cn(
                                                                'relative overflow-hidden rounded-lg border text-left transition-colors',
                                                                selected ? 'border-rb-gold ring-2 ring-rb-gold' : 'border-border hover:border-muted-foreground',
                                                                !p.isActive && 'border-dashed bg-muted/40'
                                                            )}
                                                            title={p.isActive ? undefined : 'Satış dışı: menüde görünür ama siparişte seçilemez'}
                                                        >
                                                            {/* Satış dışı ürün: soluk ve gri, üstünde etiket; pasif olduğu ilk bakışta belli olsun. */}
                                                            <div className={cn('relative flex aspect-[4/3] items-center justify-center bg-muted/50', !p.isActive && 'opacity-45 grayscale')}>
                                                                {p.imageUrl
                                                                    ? <img src={p.imageUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
                                                                    : <ImageIcon className="h-5 w-5 text-muted-foreground" />}
                                                            </div>
                                                            {!p.isActive && (
                                                                <span className="absolute left-1.5 top-1.5 rounded-full bg-foreground/80 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-background">
                                                                    Satış dışı
                                                                </span>
                                                            )}
                                                            <div className={cn('px-2 py-1.5', !p.isActive && 'opacity-60')}>
                                                                <p className={cn('truncate text-sm font-medium text-foreground', !p.isActive && 'line-through decoration-muted-foreground/60')}>{p.name}</p>
                                                                <p className="text-xs text-muted-foreground">{formatPrice(p.price)} ₺</p>
                                                            </div>
                                                            {selected && (
                                                                <span className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-rb-gold text-rb-gold-foreground">
                                                                    <Check className="h-4 w-4" />
                                                                </span>
                                                            )}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}

                                        {/* Seçilen ürünler: fiyat, indirim, ek ücret, varsayılan */}
                                        {slot.options.length > 0 && (
                                            <div className="space-y-2 border-t border-border pt-3">
                                                {slot.options.map(option => {
                                                    const product = productById.get(option.productId);
                                                    const price = optionPrice(option);
                                                    const surcharge = surchargeOf(price, base);
                                                    const discounted = product && price < product.price;
                                                    return (
                                                        <div key={option.key} className={cn('flex flex-wrap items-center gap-x-3 gap-y-2', product && !product.isActive && 'opacity-55')}>
                                                            <div className="min-w-0 flex-1">
                                                                <p className="truncate text-sm font-medium text-foreground">
                                                                    {product?.name ?? 'Silinmiş ürün'}
                                                                    {product && !product.isActive && (
                                                                        <span className="ml-2 rounded-full bg-muted px-1.5 py-0.5 align-middle text-xs font-bold uppercase tracking-wide text-muted-foreground">Satış dışı</span>
                                                                    )}
                                                                </p>
                                                                <p className="text-xs text-muted-foreground">
                                                                    {discounted && <span className="mr-1 line-through">{formatPrice(product.price)} ₺</span>}
                                                                    <span className="font-semibold text-foreground">{formatPrice(price)} ₺</span>
                                                                    {slot.options.length > 1 && surcharge > 0 && <span className="ml-1.5 text-rb-accent">+{formatPrice(surcharge)} ₺ ek ücret</span>}
                                                                </p>
                                                            </div>
                                                            <DiscountInput
                                                                compact
                                                                label={`${product?.name ?? 'Ürün'} indirimi`}
                                                                type={option.discountType}
                                                                value={option.discountValue}
                                                                onChange={(type, value) => updateOption(slot.key, option.key, { discountType: type, discountValue: value })}
                                                            />
                                                            {slot.options.length > 1 && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => toggleDefault(slot.key, option.key)}
                                                                    aria-pressed={option.isDefault}
                                                                    className={cn(
                                                                        'shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors',
                                                                        option.isDefault ? 'border-rb-gold bg-rb-gold text-rb-gold-foreground' : 'border-border text-muted-foreground hover:bg-muted'
                                                                    )}
                                                                >
                                                                    Varsayılan
                                                                </button>
                                                            )}
                                                            <button
                                                                type="button"
                                                                onClick={() => toggleProduct(slot.key, option.productId)}
                                                                aria-label={`${product?.name ?? 'Seçeneği'} çıkar`}
                                                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-destructive"
                                                            >
                                                                <X className="h-4 w-4" />
                                                            </button>
                                                        </div>
                                                    );
                                                })}
                                                {slot.options.length > 1 && (
                                                    <p className="text-xs text-muted-foreground">
                                                        Menü fiyatına {slot.options.some(o => o.isDefault) ? 'varsayılan' : 'en ucuz'} ürün girer ({formatPrice(base)} ₺); daha pahalı seçenek farkı ek ücret olarak alır.
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}

                            <button
                                type="button"
                                onClick={() => setSlots(prev => [...prev, blankSlot()])}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-border px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                            >
                                <Plus className="h-4 w-4" />
                                Bölüm ekle
                            </button>
                        </div>

                        {/* Fiyat özeti */}
                        <div className="space-y-3 rounded-xl bg-muted/50 px-4 py-3 text-sm">
                            <div className="flex items-center justify-between gap-3">
                                <span className="text-muted-foreground">Ürünlerin toplamı</span>
                                <span className="font-medium text-foreground">{formatPrice(listPrice)} ₺</span>
                            </div>
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="text-muted-foreground">Menü indirimi</span>
                                <DiscountInput
                                    label="Menü indirimi"
                                    type={menuDiscountType}
                                    value={menuDiscountValue}
                                    onChange={(type, value) => { setMenuDiscountType(type); setMenuDiscountValue(value); }}
                                />
                            </div>
                            <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
                                <span className="font-semibold text-foreground">Menü fiyatı</span>
                                <span className="text-lg font-bold text-foreground">{formatPrice(menuPrice)} ₺</span>
                            </div>
                            <div className="flex flex-wrap items-end justify-between gap-3">
                                <div>
                                    <p className="text-muted-foreground">
                                        Tahmini maliyet: <span className="font-semibold text-foreground">{formatPrice(estimatedCost)} ₺</span>
                                    </p>
                                    {margin && <p className={cn('text-xs', margin.isLoss ? 'text-destructive' : 'text-muted-foreground')}>{margin.text}</p>}
                                    <p className="text-xs text-muted-foreground">Ürün fiyatı değişince menü fiyatı kendiliğinden güncellenir. Maliyeti yalnızca yöneticiler görür.</p>
                                </div>
                                <Switch
                                    checked={isActive}
                                    onCheckedChange={setIsActive}
                                    label={<span className="text-sm text-muted-foreground">{isActive ? 'Satışta' : 'Satış dışı'}</span>}
                                />
                            </div>
                            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border px-3 py-2.5">
                                <input
                                    type="checkbox"
                                    className="mt-0.5 h-4 w-4 accent-[var(--rb-gold)]"
                                    checked={isFeatured}
                                    onChange={e => setIsFeatured(e.target.checked)}
                                />
                                <span className="flex flex-col">
                                    <span className="text-sm font-medium text-foreground">Şefin tavsiyesine koy</span>
                                    <span className="text-xs text-muted-foreground">Restoran sitesinde, QR masa menüsünde ve paket siparişte öne çıkan ürünlerin yanında gösterilir.</span>
                                </span>
                            </label>
                        </div>
                    </div>

                    <div className="flex shrink-0 items-center justify-end gap-3 border-t border-border px-6 py-4">
                        <button type="button" onClick={onClose} disabled={isSaving}
                            className="rounded-lg border border-border px-4 py-2 text-sm text-foreground transition-colors hover:bg-muted disabled:opacity-50">
                            İptal
                        </button>
                        <button type="button" onClick={handleSave} disabled={isSaving}
                            className="rounded-lg bg-rb-gold px-4 py-2 text-sm font-medium text-rb-gold-foreground transition-colors hover:opacity-90 disabled:opacity-50">
                            {isSaving ? 'Kaydediliyor...' : 'Kaydet'}
                        </button>
                    </div>
                </div>
            </Modal>

            {isStockPickerOpen && (
                <StockImagePickerModal initialQuery={name} onClose={() => setIsStockPickerOpen(false)} onSelect={handleStockSelected} />
            )}
            {cropSource && <ImageCropModal imageSrc={cropSource.src} onCancel={closeCropModal} onConfirm={handleCropConfirm} />}
        </>
    );
}
