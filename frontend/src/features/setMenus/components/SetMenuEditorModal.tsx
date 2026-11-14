import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Crop, Image as ImageIcon, Plus, Trash2, Upload, X } from 'lucide-react';
import type { Category } from '@/features/categories/types';
import type { ProductWithCost } from '@/features/products/types';
import ImageCropModal from '@/features/products/components/ImageCropModal';
import { Modal, ModalTitle } from '@/components/ui/modal';
import { Switch } from '@/components/ui/switch';
import { getApiErrorMessage } from '@/lib/apiError';
import { formatPrice } from '@/lib/format';
import { inputClass, labelClass } from '@/lib/formStyles';
import { cn } from '@/lib/utils';
import { setMenuService } from '../api/setMenuService';
import type { SetMenu, SetMenuInput } from '../types';
import { marginText } from '../setMenuCost';

interface OptionDraft { key: string; productId: string; surcharge: string; isDefault: boolean; }
// id: sunucudaki bölümün id'si (yeni bölümde yok). Kaydederken geri gönderilir ki bölüm yerinde güncellensin.
interface SlotDraft { key: string; id?: string; name: string; options: OptionDraft[]; }

let keySeq = 0;
const newKey = () => `k${++keySeq}`;
const blankOption = (): OptionDraft => ({ key: newKey(), productId: '', surcharge: '', isDefault: false });
const blankSlot = (name = ''): SlotDraft => ({ key: newKey(), name, options: [blankOption()] });

function draftsFrom(menu: SetMenu | null): SlotDraft[] {
    if (!menu) return [blankSlot('Ana yemek'), blankSlot('İçecek')];
    return menu.slots.map(slot => ({
        key: newKey(),
        id: slot.id,
        name: slot.name,
        options: slot.options.map(o => ({
            key: newKey(),
            productId: o.productId,
            surcharge: o.surcharge > 0 ? String(o.surcharge) : '',
            isDefault: o.isDefault && slot.options.length > 1,
        })),
    }));
}

interface SetMenuEditorModalProps {
    /** null: yeni menü. */
    menu: SetMenu | null;
    products: ProductWithCost[];
    categories: Category[];
    onClose: () => void;
    onSaved: () => void;
}

// Menü düzenleyici: ad, fiyat, görsel, satış durumu ve bölümler. Bölüm tek ürünlüyse sabittir; birden çok ürün
// varsa garson birini seçer, seçenek ek ücret alabilir, biri varsayılan olabilir. Tahmini maliyet varsayılan
// (yoksa ilk) seçeneklerin ürün maliyetlerinin toplamıdır.
export default function SetMenuEditorModal({ menu, products, categories, onClose, onSaved }: SetMenuEditorModalProps) {
    const [name, setName] = useState(menu?.name ?? '');
    const [description, setDescription] = useState(menu?.description ?? '');
    const [price, setPrice] = useState(menu ? String(menu.price) : '');
    const [isActive, setIsActive] = useState(menu?.isActive ?? true);
    const [categoryId, setCategoryId] = useState(menu?.categoryId ?? '');
    const [slots, setSlots] = useState<SlotDraft[]>(() => draftsFrom(menu));
    const [isSaving, setIsSaving] = useState(false);
    const [cropSource, setCropSource] = useState<{ src: string; revokeOnClose: boolean } | null>(null);
    const [pendingImage, setPendingImage] = useState<{ blob: Blob; previewUrl: string } | null>(null);

    const productById = useMemo(() => new Map(products.map(p => [p.id, p])), [products]);
    const productsByCategory = useMemo(() => {
        const groups = new Map<string, ProductWithCost[]>();
        for (const p of products) groups.set(p.categoryName, [...(groups.get(p.categoryName) ?? []), p]);
        return [...groups.entries()];
    }, [products]);

    const priceValue = Number(price) || 0;
    const estimatedCost = slots.reduce((sum, slot) => {
        const chosen = slot.options.find(o => o.isDefault) ?? slot.options[0];
        return sum + (productById.get(chosen?.productId ?? '')?.cost ?? 0);
    }, 0);
    const margin = marginText(priceValue, estimatedCost);

    /* ── Bölüm ve seçenek düzenleme ── */
    const updateSlot = (slotKey: string, change: (slot: SlotDraft) => SlotDraft) =>
        setSlots(prev => prev.map(s => s.key === slotKey ? change(s) : s));
    const updateOption = (slotKey: string, optionKey: string, change: Partial<OptionDraft>) =>
        updateSlot(slotKey, s => ({ ...s, options: s.options.map(o => o.key === optionKey ? { ...o, ...change } : o) }));
    // Varsayılan tek olur; seçili olana yeniden basmak varsayılanı kaldırır (garson her seferinde seçer).
    const toggleDefault = (slotKey: string, optionKey: string) =>
        updateSlot(slotKey, s => ({ ...s, options: s.options.map(o => ({ ...o, isDefault: o.key === optionKey ? !o.isDefault : false })) }));
    const removeOption = (slotKey: string, optionKey: string) =>
        updateSlot(slotKey, s => {
            const options = s.options.filter(o => o.key !== optionKey);
            return { ...s, options: options.length === 1 ? [{ ...options[0], isDefault: false, surcharge: '' }] : options };
        });

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
        closeCropModal();
    };
    const imageSrc = pendingImage?.previewUrl ?? menu?.imageUrl;

    /* ── Kaydet ── */
    const validationError = (): string | null => {
        if (!name.trim()) return 'Menü adı boş olamaz.';
        if (priceValue <= 0) return 'Menü fiyatı 0\'dan büyük olmalı.';
        if (slots.length === 0) return 'Menüde en az bir bölüm olmalı.';
        for (const slot of slots) {
            if (!slot.name.trim()) return 'Her bölümün bir adı olmalı.';
            if (slot.options.some(o => !o.productId)) return `"${slot.name}" bölümünde ürün seçilmemiş satır var.`;
            if (slot.options.some(o => Number(o.surcharge || 0) < 0)) return 'Ek ücret 0\'dan küçük olamaz.';
        }
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
            price: priceValue,
            isActive,
            sortOrder: menu?.sortOrder ?? 0,
            categoryId: categoryId || null,
            slots: slots.map(slot => ({
                id: slot.id,
                name: slot.name.trim(),
                options: slot.options.map(o => ({ productId: o.productId, surcharge: Number(o.surcharge || 0), isDefault: o.isDefault })),
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
                <div className="relative mx-4 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-xl dark:bg-[#26221e]">
                    <div className="flex items-center justify-between border-b border-border px-6 pb-4 pt-6">
                        <ModalTitle className="text-xl font-bold text-foreground">{menu ? 'Menüyü Düzenle' : 'Menü Ekle'}</ModalTitle>
                        <button type="button" onClick={onClose} aria-label="Kapat" className="text-muted-foreground transition-colors hover:text-foreground">
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    <div className="space-y-5 px-6 py-5">
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
                                <input id="set-menu-image" type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleImageFileSelected} />
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label htmlFor="set-menu-name" className={labelClass}>Menü adı</label>
                                    <input id="set-menu-name" className={inputClass} placeholder="Adana Menü" value={name} onChange={e => setName(e.target.value)} autoFocus />
                                </div>
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div>
                                        <label htmlFor="set-menu-price" className={labelClass}>Fiyat (₺)</label>
                                        <input id="set-menu-price" type="number" min={0} step="0.01" className={inputClass} placeholder="₺" value={price} onChange={e => setPrice(e.target.value)} />
                                    </div>
                                    <div>
                                        <label htmlFor="set-menu-category" className={labelClass}>
                                            Kategori <span className="font-normal normal-case tracking-normal">(isteğe bağlı)</span>
                                        </label>
                                        <select id="set-menu-category" className={inputClass} value={categoryId} onChange={e => setCategoryId(e.target.value)}>
                                            <option value="">Yok (raporda "Menüler")</option>
                                            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label htmlFor="set-menu-description" className={labelClass}>
                                Açıklama <span className="font-normal normal-case tracking-normal">(isteğe bağlı)</span>
                            </label>
                            <input id="set-menu-description" className={inputClass} maxLength={160} placeholder="Adana kebap, içecek ve patates" value={description} onChange={e => setDescription(e.target.value)} />
                        </div>

                        {/* Bölümler */}
                        <div className="space-y-3">
                            <div className="flex items-baseline justify-between">
                                <span className={labelClass}>Menünün içeriği</span>
                                <span className="text-xs text-muted-foreground">Tek ürünlü bölüm sabittir; birden çok ürün varsa garson seçer.</span>
                            </div>

                            {slots.map((slot, slotIndex) => (
                                <div key={slot.key} className="space-y-2 rounded-xl border border-border p-3">
                                    <div className="flex items-center gap-2">
                                        <input
                                            aria-label={`${slotIndex + 1}. bölümün adı`}
                                            className={cn(inputClass, 'py-2 font-semibold')}
                                            placeholder="Bölüm adı (ör. İçecek)"
                                            value={slot.name}
                                            onChange={e => updateSlot(slot.key, s => ({ ...s, name: e.target.value }))}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setSlots(prev => prev.filter(s => s.key !== slot.key))}
                                            disabled={slots.length === 1}
                                            aria-label={`${slot.name || 'Bölümü'} sil`}
                                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-destructive disabled:opacity-30"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>

                                    {slot.options.map(option => {
                                        const usedElsewhere = new Set(slot.options.filter(o => o.key !== option.key).map(o => o.productId));
                                        const product = productById.get(option.productId);
                                        return (
                                            <div key={option.key} className="flex flex-wrap items-center gap-2 pl-2 sm:flex-nowrap">
                                                <select
                                                    aria-label="Ürün"
                                                    className={cn(inputClass, 'min-w-0 flex-1 py-2')}
                                                    value={option.productId}
                                                    onChange={e => updateOption(slot.key, option.key, { productId: e.target.value })}
                                                >
                                                    <option value="">Ürün seçin</option>
                                                    {productsByCategory.map(([categoryName, items]) => (
                                                        <optgroup key={categoryName} label={categoryName}>
                                                            {items.map(p => (
                                                                <option key={p.id} value={p.id} disabled={usedElsewhere.has(p.id)}>
                                                                    {p.name}{p.isActive ? '' : ' (satış dışı)'}
                                                                </option>
                                                            ))}
                                                        </optgroup>
                                                    ))}
                                                </select>
                                                {slot.options.length > 1 && (
                                                    <>
                                                        <input
                                                            aria-label="Ek ücret"
                                                            type="number"
                                                            min={0}
                                                            step="0.01"
                                                            className={cn(inputClass, 'w-28 py-2')}
                                                            placeholder="+₺ ek"
                                                            value={option.surcharge}
                                                            onChange={e => updateOption(slot.key, option.key, { surcharge: e.target.value })}
                                                        />
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
                                                        <button
                                                            type="button"
                                                            onClick={() => removeOption(slot.key, option.key)}
                                                            aria-label={`${product?.name ?? 'Seçeneği'} çıkar`}
                                                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-destructive"
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        );
                                    })}

                                    <button
                                        type="button"
                                        onClick={() => updateSlot(slot.key, s => ({ ...s, options: [...s.options, blankOption()] }))}
                                        className="ml-2 inline-flex items-center gap-1 text-xs font-medium text-rb-accent hover:opacity-80"
                                    >
                                        <Plus className="h-3.5 w-3.5" />
                                        {slot.options.length === 1 ? 'Seçenek ekle (garson seçsin)' : 'Seçenek ekle'}
                                    </button>
                                </div>
                            ))}

                            <button
                                type="button"
                                onClick={() => setSlots(prev => [...prev, blankSlot()])}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-border px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                            >
                                <Plus className="h-4 w-4" />
                                Bölüm ekle
                            </button>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-muted/50 px-4 py-3 text-sm">
                            <div>
                                <p className="text-muted-foreground">
                                    Tahmini maliyet: <span className="font-semibold text-foreground">₺{formatPrice(estimatedCost)}</span>
                                </p>
                                {margin && <p className={cn('text-xs', margin.isLoss ? 'text-destructive' : 'text-muted-foreground')}>{margin.text}</p>}
                                <p className="text-xs text-muted-foreground">Varsayılan (yoksa ilk) seçeneklerin ürün maliyetleriyle. Yalnızca yöneticiler görür.</p>
                            </div>
                            <Switch
                                checked={isActive}
                                onCheckedChange={setIsActive}
                                label={<span className="text-sm text-muted-foreground">{isActive ? 'Satışta' : 'Satış dışı'}</span>}
                            />
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
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

            {cropSource && <ImageCropModal imageSrc={cropSource.src} onCancel={closeCropModal} onConfirm={handleCropConfirm} />}
        </>
    );
}
