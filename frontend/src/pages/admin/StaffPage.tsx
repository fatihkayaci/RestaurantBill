import { useEffect, useState } from "react";
import { Search, X, Pencil, Users } from 'lucide-react';
import { EmptyState, SearchEmptyState } from '@/components/ui/empty-state';
import { toast } from "sonner";
import { userService } from "@/features/users/api/userService";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import type { CreateUser, User } from "@/features/users/types";
import axios from "axios";
import { cn } from "@/lib/utils";
import { Switch } from '@/components/ui/switch';
import { Modal, ModalTitle } from '@/components/ui/modal';
import { inputClass, labelClass } from '@/lib/formStyles';
import { regionService } from '@/features/regions/api/regionService';
import type { Region } from '@/features/regions/types';
import { categoryService } from '@/features/categories/api/categoryService';
import type { Category } from '@/features/categories/types';
import { tableService } from '@/features/tables/api/tableService';
import type { Table } from '@/features/tables/types';

const roleMap: Record<number, string> = { 1: "Admin", 2: "Garson", 3: "Kasiyer", 4: "Mutfak", 6: "Kurye" };

// Bölge/masa kapsamı garsonda ve kasiyerde, garson yetkileri yalnızca garsonda, kasiyer yetkileri yalnızca kasiyerde,
// menü kategorileri yalnızca mutfakta.
const WAITER = 2;
const CASHIER = 3;
const KITCHEN = 4;
const usesRegions = (role: number) => role === WAITER || role === CASHIER;
const usesCategories = (role: number) => role === KITCHEN;
const hasAccessTab = (role: number) => usesRegions(role) || usesCategories(role) || role === CASHIER;
const accessTabLabel: Record<number, string> = { [WAITER]: 'Bölge ve Yetkiler', [CASHIER]: 'Bölge ve Yetkiler', [KITCHEN]: 'Kategoriler' };
// Bölge/masa açıklamalarında rolün adı: "Garson yalnızca ...", "Kasiyer yalnızca ...".
const scopedRoleNoun = (role: number) => (role === CASHIER ? 'Kasiyer' : 'Garson');

type PermissionKey = 'canTakeOrders' | 'canTakePayment' | 'canCancelAndDiscount' | 'canTransferAndReserve';

const WAITER_PERMISSIONS: { key: PermissionKey; label: string; short: string; hint: string }[] = [
    { key: 'canTakeOrders', label: 'Masa aç / sipariş al', short: 'Sipariş', hint: 'Boş masada sipariş başlatır, siparişe ürün ekler.' },
    { key: 'canTakePayment', label: 'Hesap al (ödeme)', short: 'Ödeme', hint: 'Masanın hesabını kapatır; nakit, kart, IBAN ödeme alır.' },
    { key: 'canCancelAndDiscount', label: 'İptal ve indirim', short: 'İptal/İndirim', hint: 'Gönderilmiş ürünü ya da siparişi iptal eder, indirim/ikram uygular.' },
    { key: 'canTransferAndReserve', label: 'Masa taşı ve rezervasyon', short: 'Taşıma/Rezervasyon', hint: 'Masa taşır/birleştirir, rezervasyonları ve QR sipariş taleplerini yönetir.' },
];

// Yeni garson yalnızca sipariş alabilir; diğer yetkileri yönetici açar.
const DEFAULT_WAITER_PERMISSIONS: Record<PermissionKey, boolean> = {
    canTakeOrders: true, canTakePayment: false, canCancelAndDiscount: false, canTransferAndReserve: false,
};

type CashierPermissionKey = 'canApplyDiscount' | 'canTransferTables' | 'canViewDelivery';

const CASHIER_PERMISSIONS: { key: CashierPermissionKey; label: string; short: string; hint: string }[] = [
    { key: 'canApplyDiscount', label: 'İndirim ve ikram', short: 'İndirim', hint: 'Ödeme alırken yüzde ya da tutar olarak indirim, tamamı ikram uygular.' },
    { key: 'canTransferTables', label: 'Masa taşı / birleştir', short: 'Taşıma', hint: 'Açık hesabı başka masaya taşır ya da iki masayı birleştirir.' },
    { key: 'canViewDelivery', label: 'Paket siparişler', short: 'Paket', hint: 'Online paket siparişleri görür, onaylar ve hesabını alır. Kapalıysa "Paket siparişler" sekmesi görünmez.' },
];

// Kasiyer bugüne kadar hepsini yapabiliyordu; yeni kasiyer de aynı yetkilerle başlar, indirim sınırı yoktur (%100).
const DEFAULT_CASHIER_PERMISSIONS = { canApplyDiscount: true, maxDiscountPercent: 100, canTransferTables: true, canViewDelivery: true };

const byTableName = (a: Table, b: Table) => a.name.localeCompare(b.name, 'tr', { numeric: true });

// "Masa 1", "Masa 2", "Masa 5" → "Masa 1, 2, 5". Adlar aynı ön ek + numara biçiminde değilse olduğu gibi yazılır.
function compactTableNames(names: string[]): string {
    const parts = names.map(name => /^(.*?)(\d+)$/.exec(name));
    const prefix = parts[0]?.[1];
    if (parts.every(p => p && p[1] === prefix)) {
        return `${prefix}${parts.map(p => p![2]).join(', ')}`;
    }
    return names.join(', ');
}

// Garsonun/kasiyerin bölge başına kapsamı. restricted = "Seçili masalar" (yalnızca tables), değilse bölgenin tamamı.
// Silinmiş ya da artık o bölgede olmayan masalar sayılmaz; sunucu da onları yok sayar.
type RegionCoverage = { regionId: string; restricted: boolean; tables: Table[] };

function waiterCoverage(regionIds: string[], restrictedRegionIds: string[], tableIds: string[], tables: Table[]): RegionCoverage[] {
    const picked = new Set(tableIds);
    return regionIds.map(regionId => ({
        regionId,
        restricted: restrictedRegionIds.includes(regionId),
        tables: tables.filter(t => t.regionId === regionId && picked.has(t.id)).sort(byTableName),
    }));
}

function coverageLabel(c: RegionCoverage): string {
    if (!c.restricted) return 'tümü';
    if (c.tables.length === 0) return 'masa yok';
    return compactTableNames(c.tables.map(t => t.name));
}

const roleStyle: Record<number, { avatar: string; badge: string }> = {
    1: { avatar: 'bg-rb-purple-bg text-rb-purple', badge: 'bg-rb-purple-bg text-rb-purple' },
    2: { avatar: 'bg-rb-accent-bg text-rb-accent', badge: 'bg-rb-accent-bg text-rb-accent' },
    3: { avatar: 'bg-rb-green-bg text-rb-green', badge: 'bg-rb-green-bg text-rb-green' },
    4: { avatar: 'bg-rb-amber-bg text-rb-amber', badge: 'bg-rb-amber-bg text-rb-amber' },
    6: { avatar: 'bg-rb-orange-bg text-rb-orange', badge: 'bg-rb-orange-bg text-rb-orange' },
};


export default function StaffPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [search, setSearch] = useState('');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editUser, setEditUser] = useState<User | null>(null);
    const [loaded, setLoaded] = useState(false);
    const [form, setForm] = useState<CreateUser>({
        fullName: '', userName: '', email: '', phoneNumber: '',
        passwordHash: '', role: 2
    });
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'personal' | 'login' | 'access'>('personal');
    const [regions, setRegions] = useState<Region[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [tables, setTables] = useState<Table[]>([]);

    useEffect(() => {
        userService.getUsersByRestaurantId()
            .then(setUsers)
            .catch(console.error)
            .finally(() => setLoaded(true));
        regionService.getRegions()
            .then(setRegions)
            .catch(console.error);
        categoryService.getCategories()
            .then(setCategories)
            .catch(console.error);
        tableService.getTables()
            .then(setTables)
            .catch(console.error);
    }, []);

    const regionNameById = new Map(regions.map(r => [r.id, r.name]));
    const categoryNameById = new Map(categories.map(c => [c.id, c.name]));

    // Bölgeyi "Tüm masalar"a döndürür: masa masa işareti kalkar, bölgeden seçilmiş masalar bırakılır.
    // Listede bulunmayan (silinmiş) masaları sunucu atar.
    const withoutRegionRestriction = (prev: CreateUser, regionId: string): CreateUser => ({
        ...prev,
        restrictedRegionIds: (prev.restrictedRegionIds ?? []).filter(id => id !== regionId),
        tableIds: (prev.tableIds ?? []).filter(id => tables.find(t => t.id === id)?.regionId !== regionId),
    });

    const toggleRegion = (regionId: string) => {
        setForm(prev => {
            const current = prev.regionIds ?? [];
            if (current.includes(regionId)) {
                return { ...withoutRegionRestriction(prev, regionId), regionIds: current.filter(id => id !== regionId) };
            }
            return { ...prev, regionIds: [...current, regionId] };
        });
    };

    // Bölge satırındaki "Tüm masalar" / "Seçili masalar" seçimi.
    const setRegionRestricted = (regionId: string, restricted: boolean) => {
        setForm(prev => restricted
            ? { ...prev, restrictedRegionIds: [...(prev.restrictedRegionIds ?? []).filter(id => id !== regionId), regionId] }
            : withoutRegionRestriction(prev, regionId));
    };

    const toggleTable = (tableId: string) => {
        setForm(prev => {
            const current = prev.tableIds ?? [];
            return {
                ...prev,
                tableIds: current.includes(tableId) ? current.filter(id => id !== tableId) : [...current, tableId],
            };
        });
    };

    const toggleCategory = (categoryId: string) => {
        setForm(prev => {
            const current = prev.categoryIds ?? [];
            return {
                ...prev,
                categoryIds: current.includes(categoryId) ? current.filter(id => id !== categoryId) : [...current, categoryId],
            };
        });
    };

    const generatePassword = () => {
        const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    };

    const openCreateModal = () => {
        setEditUser(null);
        setForm({
            fullName: '', userName: '', email: '', phoneNumber: '', passwordHash: generatePassword(), role: 2,
            regionIds: [], restrictedRegionIds: [], tableIds: [], categoryIds: [], ...DEFAULT_WAITER_PERMISSIONS, ...DEFAULT_CASHIER_PERMISSIONS,
        });
        setFieldErrors({});
        setActiveTab('personal');
        setIsModalOpen(true);
    };

    const openEditModal = (user: User) => {
        setEditUser(user);
        // Garson olmayan biri garsona çevrilirse yeni garson varsayılanlarıyla başlar.
        const permissions = user.role === WAITER
            ? {
                canTakeOrders: user.canTakeOrders ?? true,
                canTakePayment: user.canTakePayment ?? false,
                canCancelAndDiscount: user.canCancelAndDiscount ?? false,
                canTransferAndReserve: user.canTransferAndReserve ?? false,
            }
            : DEFAULT_WAITER_PERMISSIONS;
        const cashierPermissions = user.role === CASHIER
            ? {
                canApplyDiscount: user.canApplyDiscount ?? true,
                maxDiscountPercent: user.maxDiscountPercent ?? 100,
                canTransferTables: user.canTransferTables ?? true,
                canViewDelivery: user.canViewDelivery ?? true,
            }
            : DEFAULT_CASHIER_PERMISSIONS;
        setForm({
            fullName: user.fullName, userName: user.userName, email: user.email, phoneNumber: user.phoneNumber, passwordHash: '', role: user.role,
            regionIds: usesRegions(user.role) ? (user.regionIds ?? []) : [],
            restrictedRegionIds: usesRegions(user.role) ? (user.restrictedRegionIds ?? []) : [],
            tableIds: usesRegions(user.role) ? (user.tableIds ?? []) : [],
            categoryIds: usesCategories(user.role) ? (user.categoryIds ?? []) : [],
            ...permissions,
            ...cashierPermissions,
        });
        setFieldErrors({});
        setActiveTab('personal');
        setIsModalOpen(true);
    };

    const personalFields = ['fullName', 'email', 'phoneNumber'];
    const loginFields = ['userName', 'passwordHash'];

    const handleDelete = async () => {
        if (!deleteTargetId) return;
        try {
            await userService.deleteUser(deleteTargetId);
            setUsers(prev => prev.filter(u => u.id !== deleteTargetId));
            toast.success('Çalışan silindi.');
        } catch (err: unknown) {
            if (axios.isAxiosError(err)) {
                toast.error(err.response?.data?.error ?? err.response?.data?.message ?? 'Çalışan silinemedi.');
            }
        } finally {
            setDeleteTargetId(null);
        }
    };

    const toggleActive = async (user: User) => {
        try {
            await userService.updateUser({
                id: user.id, fullName: user.fullName, userName: user.userName, email: user.email,
                phoneNumber: user.phoneNumber, role: user.role, isActive: !user.isActive
            });
            setUsers(prev => prev.map(u => u.id === user.id ? { ...u, isActive: !u.isActive } : u));
            toast.success(user.isActive ? 'Çalışan pasif yapıldı.' : 'Çalışan aktif yapıldı.');
        } catch (err: unknown) {
            if (axios.isAxiosError(err)) {
                toast.error(err.response?.data?.error ?? err.response?.data?.message ?? 'Durum güncellenemedi.');
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const errors: Record<string, string> = {};
        if (!form.fullName.trim()) errors.fullName = 'Ad soyad boş bırakılamaz.';
        else if (form.fullName.length > 100) errors.fullName = 'En fazla 100 karakter.';
        if (!form.userName.trim()) errors.userName = 'Kullanıcı adı boş bırakılamaz.';
        else if (form.userName.length > 50) errors.userName = 'En fazla 50 karakter.';
        if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = 'Geçerli bir e-posta giriniz.';
        if (!editUser) {
            if (!form.passwordHash) errors.passwordHash = 'Şifre boş bırakılamaz.';
            else if (form.passwordHash.length < 6) errors.passwordHash = 'En az 6 karakter.';
        } else if (form.passwordHash && form.passwordHash.length < 6) {
            errors.passwordHash = 'En az 6 karakter.';
        }
        const isCashier = form.role === CASHIER;
        // İndirim kapalıyken sınır gönderilmez, kayıtlı değer korunur.
        const limitsDiscount = isCashier && (form.canApplyDiscount ?? true);
        const maxDiscountPercent = form.maxDiscountPercent ?? 100;
        if (limitsDiscount && (!Number.isInteger(maxDiscountPercent) || maxDiscountPercent < 1 || maxDiscountPercent > 100)) {
            errors.maxDiscountPercent = 'İndirim sınırı %1 ile %100 arasında olmalı.';
        }
        if (Object.keys(errors).length > 0) {
            setFieldErrors(errors);
            if (personalFields.some(f => errors[f]) && !loginFields.some(f => errors[f])) setActiveTab('personal');
            else if (loginFields.some(f => errors[f])) setActiveTab('login');
            else if (errors.maxDiscountPercent) setActiveTab('access');
            return;
        }
        setFieldErrors({});
        // Bölgeler garsonda ve kasiyerde, garson yetkileri yalnızca garsonda, kasiyer yetkileri yalnızca kasiyerde, kategoriler
        // yalnızca mutfakta gönderilir.
        const isWaiter = form.role === WAITER;
        const payload: CreateUser = {
            ...form,
            regionIds: usesRegions(form.role) ? (form.regionIds ?? []) : [],
            // Tüm bölgelere bakan garsonda/kasiyerde masa seçimi anlamsız; sunucu da aynı kuralı uygular.
            restrictedRegionIds: usesRegions(form.role) && (form.regionIds?.length ?? 0) > 0 ? (form.restrictedRegionIds ?? []) : [],
            tableIds: usesRegions(form.role) && (form.regionIds?.length ?? 0) > 0 ? (form.tableIds ?? []) : [],
            categoryIds: usesCategories(form.role) ? (form.categoryIds ?? []) : [],
            canTakeOrders: isWaiter ? form.canTakeOrders : undefined,
            canTakePayment: isWaiter ? form.canTakePayment : undefined,
            canCancelAndDiscount: isWaiter ? form.canCancelAndDiscount : undefined,
            canTransferAndReserve: isWaiter ? form.canTransferAndReserve : undefined,
            canApplyDiscount: isCashier ? form.canApplyDiscount : undefined,
            maxDiscountPercent: limitsDiscount ? maxDiscountPercent : undefined,
            canTransferTables: isCashier ? form.canTransferTables : undefined,
            canViewDelivery: isCashier ? form.canViewDelivery : undefined,
        };
        try {
            if (editUser) {
                await userService.updateUser({ id: editUser.id, ...payload, password: form.passwordHash, isActive: editUser.isActive });
            } else {
                await userService.createUser(payload);
            }
            const updated = await userService.getUsersByRestaurantId();
            setUsers(updated);
            setIsModalOpen(false);
            toast.success(editUser ? 'Çalışan güncellendi.' : 'Çalışan eklendi.');
        } catch (err: unknown) {
            if (axios.isAxiosError(err)) {
                const data = err.response?.data;
                const backendErrors = data?.errors as Record<string, string[]> | undefined;
                if (backendErrors) {
                    const mapped: Record<string, string> = {};
                    for (const key in backendErrors) mapped[key.charAt(0).toLowerCase() + key.slice(1)] = backendErrors[key][0];
                    setFieldErrors(mapped);
                    if (personalFields.some(f => mapped[f]) && !loginFields.some(f => mapped[f])) setActiveTab('personal');
                    else if (loginFields.some(f => mapped[f])) setActiveTab('login');
                } else if (data?.error ?? data?.message) {
                    const message = (data.error ?? data.message) as string;
                    const duplicateFieldMap: Record<string, string> = {
                        'kullanıcı adı': 'userName',
                        'e-posta': 'email',
                    };
                    const duplicateField = Object.entries(duplicateFieldMap).find(([phrase]) => message.includes(phrase))?.[1];
                    if (duplicateField) {
                        setFieldErrors({ [duplicateField]: message });
                        setActiveTab(personalFields.includes(duplicateField) ? 'personal' : 'login');
                    } else {
                        toast.error(message);
                    }
                } else {
                    toast.error('Bir hata oluştu.');
                }
            }
        }
    };

    const filtered = users.filter(u => u.fullName.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-serif font-bold text-foreground">Çalışanlar</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">{users.length} çalışan</p>
                </div>
                <button
                    onClick={openCreateModal}
                    className="flex items-center gap-1.5 bg-rb-gold hover:opacity-90 text-rb-gold-foreground text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                >
                    + Çalışan Ekle
                </button>
            </div>

            {/* Search */}
            <div className="relative w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                    className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-border bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    placeholder="Çalışan ara..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
            </div>

            {/* Kartlar */}
            {!loaded ? null : users.length === 0 ? (
                <EmptyState
                    icon={Users}
                    title="Henüz çalışan yok"
                    description="Garson, mutfak ve kasiyer hesapları oluştur. Her biri kullanıcı adıyla giriş yapar."
                    action={{ label: 'İlk çalışanı ekle', onClick: openCreateModal }}
                    hint="Kurulum listesinde 6. adım · son adım"
                />
            ) : filtered.length === 0 ? (
                <SearchEmptyState query={search} noun="çalışan" onClear={() => setSearch('')} />
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filtered.map(user => {
                        const style = roleStyle[user.role] ?? roleStyle[1];
                        const initials = user.fullName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
                        const isActive = user.isActive;
                        return (
                            // Kart tam yükseklikte bir sütun: alt kısım (çizgi + erişim/sil) mt-auto ile dibe itilir ki
                            // aynı satırdaki kartların çizgileri, rozet sayısından bağımsız aynı hizada olsun.
                            <div key={user.id} className="flex h-full flex-col gap-3 rounded-xl border border-border bg-card p-4">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className={cn("w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0", style.avatar)}>
                                            {initials}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-semibold text-foreground text-sm truncate">{user.fullName}</p>
                                            <p className="text-xs text-muted-foreground truncate">@{user.userName}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <span className={cn(
                                            "px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase",
                                            isActive ? "bg-rb-green-bg text-rb-green" : "bg-muted text-muted-foreground"
                                        )}>
                                            {isActive ? 'Aktif' : 'Pasif'}
                                        </span>
                                        <button
                                            onClick={() => openEditModal(user)}
                                            className="text-muted-foreground hover:text-foreground transition-colors"
                                        >
                                            <Pencil className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                    <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase", style.badge)}>
                                        {roleMap[user.role] ?? 'Bilinmiyor'}
                                    </span>
                                    {usesRegions(user.role) && (user.regionIds?.length ?? 0) === 0 && (
                                        <span className="truncate text-right" title="Bölgeler">Tüm bölgeler</span>
                                    )}
                                    {usesCategories(user.role) && (user.categoryIds?.length ?? 0) === 0 && (
                                        <span className="truncate text-right" title="Kategoriler">Tüm kategoriler</span>
                                    )}
                                </div>

                                {usesRegions(user.role) && (user.regionIds?.length ?? 0) > 0 && (
                                    // Bölge başına bir rozet: "Bahçe: Masa 1, 2, 5", "Salon: tümü", "Teras: masa yok".
                                    <div className="flex flex-wrap gap-1" aria-label="Bölgeler ve masalar">
                                        {waiterCoverage(user.regionIds ?? [], user.restrictedRegionIds ?? [], user.tableIds ?? [], tables).map(c => (
                                            <span
                                                key={c.regionId}
                                                className={cn(
                                                    "px-1.5 py-0.5 rounded text-[10px] font-medium",
                                                    c.restricted && c.tables.length === 0 ? "bg-rb-amber-bg text-rb-amber" : "bg-rb-accent-bg text-rb-accent"
                                                )}
                                            >
                                                {regionNameById.get(c.regionId) ?? '—'}: {coverageLabel(c)}
                                            </span>
                                        ))}
                                    </div>
                                )}

                                {usesCategories(user.role) && (user.categoryIds?.length ?? 0) > 0 && (
                                    <div className="flex flex-wrap gap-1" aria-label="Mutfak kategorileri">
                                        {(user.categoryIds ?? []).map(id => (
                                            <span key={id} className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-rb-amber-bg text-rb-amber">
                                                {categoryNameById.get(id) ?? '—'}
                                            </span>
                                        ))}
                                    </div>
                                )}

                                {user.role === WAITER && (
                                    <div className="flex flex-wrap gap-1" aria-label="Garson yetkileri">
                                        {WAITER_PERMISSIONS.map(p => {
                                            const on = user[p.key] ?? false;
                                            return (
                                                <span
                                                    key={p.key}
                                                    title={`${p.label}: ${on ? 'açık' : 'kapalı'}`}
                                                    className={cn(
                                                        "px-1.5 py-0.5 rounded text-[10px] font-medium",
                                                        on ? "bg-rb-green-bg text-rb-green" : "bg-muted text-muted-foreground line-through"
                                                    )}
                                                >
                                                    {p.short}
                                                </span>
                                            );
                                        })}
                                    </div>
                                )}

                                {user.role === CASHIER && (
                                    <div className="flex flex-wrap gap-1" aria-label="Kasiyer yetkileri">
                                        {CASHIER_PERMISSIONS.map(p => {
                                            const on = user[p.key] ?? true;
                                            return (
                                                <span
                                                    key={p.key}
                                                    title={`${p.label}: ${on ? 'açık' : 'kapalı'}`}
                                                    className={cn(
                                                        "px-1.5 py-0.5 rounded text-[10px] font-medium",
                                                        on ? "bg-rb-green-bg text-rb-green" : "bg-muted text-muted-foreground line-through"
                                                    )}
                                                >
                                                    {p.short}
                                                </span>
                                            );
                                        })}
                                        {(user.canApplyDiscount ?? true) && (user.maxDiscountPercent ?? 100) < 100 && (
                                            <span title="Bir ödemede uygulanabilecek en yüksek indirim" className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-rb-amber-bg text-rb-amber">
                                                En fazla %{user.maxDiscountPercent}
                                            </span>
                                        )}
                                    </div>
                                )}

                                <div className="mt-auto border-t border-border pt-3 flex items-center justify-between gap-2">
                                    <Switch
                                        checked={isActive}
                                        onCheckedChange={() => toggleActive(user)}
                                        label={<span className="text-xs text-muted-foreground">{isActive ? 'Erişim açık' : 'Erişim kapalı'}</span>}
                                    />
                                    <button
                                        onClick={() => setDeleteTargetId(user.id)}
                                        className="text-xs px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:text-destructive hover:border-destructive/40 transition-colors shrink-0"
                                    >
                                        Sil
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modal */}
            {isModalOpen && (
                <Modal onClose={() => setIsModalOpen(false)} overlayClassName="bg-black/40 backdrop-blur-sm">
                    <div className="relative bg-white dark:bg-[#26221e] rounded-2xl shadow-xl w-full max-w-md mx-4 flex flex-col overflow-hidden max-h-[calc(100dvh-2rem)] sm:max-h-[90vh]">
                        <div className="shrink-0 px-6 pt-6 pb-4 flex items-center justify-between">
                            <ModalTitle className="text-xl font-bold text-foreground">
                                {editUser ? 'Çalışanı Düzenle' : 'Çalışan Ekle'}
                            </ModalTitle>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="shrink-0 px-6 pt-4 flex items-center gap-1 border-b border-border">
                            <button
                                type="button"
                                onClick={() => setActiveTab('personal')}
                                className={cn(
                                    "px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
                                    activeTab === 'personal'
                                        ? "border-rb-accent text-foreground"
                                        : "border-transparent text-muted-foreground hover:text-foreground"
                                )}
                            >
                                Kişisel Bilgiler
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('login')}
                                className={cn(
                                    "px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
                                    activeTab === 'login'
                                        ? "border-rb-accent text-foreground"
                                        : "border-transparent text-muted-foreground hover:text-foreground"
                                )}
                            >
                                Giriş Bilgileri
                            </button>
                            {hasAccessTab(form.role) && (
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('access')}
                                    className={cn(
                                        "px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
                                        activeTab === 'access'
                                            ? "border-rb-accent text-foreground"
                                            : "border-transparent text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    {accessTabLabel[form.role]}
                                </button>
                            )}
                        </div>

                        <form onSubmit={handleSubmit} className="min-h-0 flex-1 overflow-y-auto px-6 py-5 space-y-4">
                            {activeTab === 'personal' && (
                                <>
                                    <div>
                                        <label className={labelClass}>Ad Soyad *</label>
                                        <input
                                            className={cn(inputClass, fieldErrors.fullName && "border-destructive")}
                                            placeholder="Ad Soyad..."
                                            value={form.fullName}
                                            onChange={e => setForm({ ...form, fullName: e.target.value })}
                                        />
                                        {fieldErrors.fullName && <p className="text-xs text-destructive mt-1">{fieldErrors.fullName}</p>}
                                    </div>

                                    <div>
                                        <label className={labelClass}>E-posta</label>
                                        <input
                                            type="email"
                                            className={cn(inputClass, fieldErrors.email && "border-destructive")}
                                            placeholder="ornek@mail.com"
                                            value={form.email ?? ''}
                                            onChange={e => setForm({ ...form, email: e.target.value })}
                                        />
                                        {fieldErrors.email && <p className="text-xs text-destructive mt-1">{fieldErrors.email}</p>}
                                    </div>

                                    <div>
                                        <label className={labelClass}>Telefon</label>
                                        <input
                                            className={inputClass}
                                            placeholder="0532 000 00 00"
                                            value={form.phoneNumber}
                                            onChange={e => setForm({ ...form, phoneNumber: e.target.value })}
                                        />
                                    </div>
                                </>
                            )}

                            {activeTab === 'login' && (
                                <>
                                    <div>
                                        <label className={labelClass}>Kullanıcı Adı *</label>
                                        <input
                                            className={cn(inputClass, fieldErrors.userName && "border-destructive")}
                                            placeholder="kullanici_adi"
                                            value={form.userName}
                                            onChange={e => setForm({ ...form, userName: e.target.value })}
                                        />
                                        {fieldErrors.userName && <p className="text-xs text-destructive mt-1">{fieldErrors.userName}</p>}
                                    </div>

                                    <div>
                                        <label className={labelClass}>Rol *</label>
                                        <select
                                            className={inputClass}
                                            value={form.role}
                                            onChange={e => setForm({ ...form, role: Number(e.target.value) })}
                                        >
                                            <option value={2}>Garson</option>
                                            <option value={3}>Kasiyer</option>
                                            <option value={4}>Mutfak</option>
                                            <option value={6}>Kurye</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className={labelClass}>Şifre * {editUser && <span className="normal-case font-normal text-muted-foreground">(boş bırakırsanız değişmez)</span>}</label>
                                        <input
                                            type="text"
                                            className={cn(inputClass, fieldErrors.passwordHash && "border-destructive")}
                                            placeholder={editUser ? "Yeni şifre..." : "Şifre..."}
                                            value={form.passwordHash}
                                            onChange={e => setForm({ ...form, passwordHash: e.target.value })}
                                        />
                                        {fieldErrors.passwordHash && <p className="text-xs text-destructive mt-1">{fieldErrors.passwordHash}</p>}
                                    </div>
                                </>
                            )}

                            {activeTab === 'access' && usesCategories(form.role) && (
                                <div>
                                    <label className={labelClass}>Kategoriler</label>
                                    {categories.length === 0 ? (
                                        <p className="text-xs text-muted-foreground">Bu şubede henüz menü kategorisi yok.</p>
                                    ) : (
                                        <div className="flex flex-wrap gap-2">
                                            {categories.map(category => {
                                                const selected = form.categoryIds?.includes(category.id) ?? false;
                                                return (
                                                    <button
                                                        key={category.id}
                                                        type="button"
                                                        role="checkbox"
                                                        aria-checked={selected}
                                                        onClick={() => toggleCategory(category.id)}
                                                        className={cn(
                                                            "px-3 py-1.5 rounded-full border text-sm transition-colors",
                                                            selected
                                                                ? "border-rb-accent bg-rb-accent-bg text-rb-accent font-medium"
                                                                : "border-border text-muted-foreground hover:text-foreground"
                                                        )}
                                                    >
                                                        {category.name}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                    <p className="text-xs text-muted-foreground mt-1.5">
                                        Boş bırakılırsa tüm kategoriler. Mutfak ekranında yalnızca seçili kategorilerdeki ürünler görünür
                                        (ör. ızgara ustası aynı masanın tatlılarını görmez).
                                    </p>
                                </div>
                            )}

                            {activeTab === 'access' && form.role === CASHIER && (
                                <div>
                                    <label className={labelClass}>Kasiyer yetkileri</label>
                                    <div className="space-y-3">
                                        {CASHIER_PERMISSIONS.map(p => (
                                            <div key={p.key}>
                                                <Switch
                                                    checked={form[p.key] ?? true}
                                                    onCheckedChange={checked => setForm(prev => ({ ...prev, [p.key]: checked }))}
                                                    label={<span className="text-sm text-foreground">{p.label}</span>}
                                                />
                                                <p className="text-xs text-muted-foreground mt-0.5 pl-11">{p.hint}</p>
                                            </div>
                                        ))}
                                    </div>

                                    {(form.canApplyDiscount ?? true) && (
                                        <div className="mt-4">
                                            <label className={labelClass}>En yüksek indirim (%)</label>
                                            <input
                                                type="number"
                                                inputMode="numeric"
                                                min={1}
                                                max={100}
                                                step={1}
                                                className={cn(inputClass, fieldErrors.maxDiscountPercent && "border-destructive")}
                                                value={Number.isNaN(form.maxDiscountPercent) ? '' : (form.maxDiscountPercent ?? 100)}
                                                onChange={e => setForm({ ...form, maxDiscountPercent: e.target.valueAsNumber })}
                                            />
                                            {fieldErrors.maxDiscountPercent
                                                ? <p className="text-xs text-destructive mt-1">{fieldErrors.maxDiscountPercent}</p>
                                                : <p className="text-xs text-muted-foreground mt-1.5">Bir ödemede uygulanabilecek en yüksek indirim. 100 = sınırsız (tamamı ikram dahil).</p>}
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'access' && usesRegions(form.role) && (
                                <>
                                    <div>
                                        <label className={labelClass}>Bölgeler</label>
                                        {regions.length === 0 ? (
                                            <p className="text-xs text-muted-foreground">Bu şubede henüz bölge yok.</p>
                                        ) : (
                                            <div className="flex flex-wrap gap-2">
                                                {regions.map(region => {
                                                    const selected = form.regionIds?.includes(region.id) ?? false;
                                                    return (
                                                        <button
                                                            key={region.id}
                                                            type="button"
                                                            role="checkbox"
                                                            aria-checked={selected}
                                                            onClick={() => toggleRegion(region.id)}
                                                            className={cn(
                                                                "px-3 py-1.5 rounded-full border text-sm transition-colors",
                                                                selected
                                                                    ? "border-rb-accent bg-rb-accent-bg text-rb-accent font-medium"
                                                                    : "border-border text-muted-foreground hover:text-foreground"
                                                            )}
                                                        >
                                                            {region.name}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}
                                        <p className="text-xs text-muted-foreground mt-1.5">
                                            Boş bırakılırsa tüm bölgeler. {scopedRoleNoun(form.role)} yalnızca seçili bölgelerin masalarını görür
                                            {form.role === CASHIER && '; paket siparişler "Paket siparişler" yetkisine bağlıdır'}.
                                        </p>
                                    </div>

                                    <div>
                                        <label className={labelClass}>Masalar</label>
                                        {(form.regionIds?.length ?? 0) === 0 ? (
                                            <p className="text-xs text-muted-foreground">Masa seçmek için önce bölge seçin.</p>
                                        ) : (
                                            <div className="space-y-2">
                                                {waiterCoverage(form.regionIds ?? [], form.restrictedRegionIds ?? [], form.tableIds ?? [], tables).map(({ regionId, restricted, tables: picked }) => {
                                                    const regionTables = tables.filter(t => t.regionId === regionId).sort(byTableName);
                                                    return (
                                                        <div key={regionId} className="rounded-lg border border-border p-3 space-y-2">
                                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                                <span className="text-sm font-medium text-foreground">{regionNameById.get(regionId) ?? '—'}</span>
                                                                <div role="radiogroup" aria-label="Masa kapsamı" className="flex gap-1">
                                                                    {[{ value: false, label: 'Tüm masalar' }, { value: true, label: 'Seçili masalar' }].map(option => (
                                                                        <button
                                                                            key={option.label}
                                                                            type="button"
                                                                            role="radio"
                                                                            aria-checked={restricted === option.value}
                                                                            onClick={() => setRegionRestricted(regionId, option.value)}
                                                                            className={cn(
                                                                                "min-h-11 px-3 rounded-lg border text-sm transition-colors",
                                                                                restricted === option.value
                                                                                    ? "border-rb-accent bg-rb-accent-bg text-rb-accent font-medium"
                                                                                    : "border-border text-muted-foreground hover:text-foreground"
                                                                            )}
                                                                        >
                                                                            {option.label}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                            {restricted && (
                                                                <div className="flex flex-wrap gap-2">
                                                                    {regionTables.map(table => {
                                                                        const selected = picked.some(t => t.id === table.id);
                                                                        return (
                                                                            <button
                                                                                key={table.id}
                                                                                type="button"
                                                                                role="checkbox"
                                                                                aria-checked={selected}
                                                                                onClick={() => toggleTable(table.id)}
                                                                                className={cn(
                                                                                    "min-h-11 min-w-11 px-3 rounded-lg border text-sm transition-colors",
                                                                                    selected
                                                                                        ? "border-rb-accent bg-rb-accent-bg text-rb-accent font-medium"
                                                                                        : "border-border text-muted-foreground hover:text-foreground"
                                                                                )}
                                                                            >
                                                                                {table.name}
                                                                            </button>
                                                                        );
                                                                    })}
                                                                    {regionTables.length === 0 && (
                                                                        <p className="text-xs text-muted-foreground self-center">Bu bölgede masa yok.</p>
                                                                    )}
                                                                </div>
                                                            )}
                                                            {restricted && picked.length === 0 && (
                                                                <p className="text-xs text-rb-amber">
                                                                    Bu bölgede hiç masa seçilmedi. {scopedRoleNoun(form.role)} bu bölgede hiçbir masaya bakamaz.
                                                                </p>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                        <p className="text-xs text-muted-foreground mt-1.5">
                                            "Seçili masalar" denen bölgede {scopedRoleNoun(form.role).toLocaleLowerCase('tr')} yalnızca işaretli masalara bakar; seçili masa silinir ya da
                                            taşınırsa o bölgede yetkisi daralır, genişlemez.
                                        </p>
                                    </div>

                                    {form.role === WAITER && (
                                        <div>
                                            <label className={labelClass}>Yetkiler</label>
                                            <div className="space-y-3">
                                                {WAITER_PERMISSIONS.map(p => (
                                                    <div key={p.key}>
                                                        <Switch
                                                            checked={form[p.key] ?? false}
                                                            onCheckedChange={checked => setForm(prev => ({ ...prev, [p.key]: checked }))}
                                                            label={<span className="text-sm text-foreground">{p.label}</span>}
                                                        />
                                                        <p className="text-xs text-muted-foreground mt-0.5 pl-11">{p.hint}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </form>

                        <div className="shrink-0 px-6 py-4 border-t border-border flex items-center justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setIsModalOpen(false)}
                                className="px-4 py-2 text-sm rounded-lg border border-border text-foreground hover:bg-muted transition-colors"
                            >
                                İptal
                            </button>
                            <button
                                type="button"
                                onClick={handleSubmit}
                                className="px-4 py-2 text-sm rounded-lg bg-rb-gold hover:opacity-90 text-rb-gold-foreground font-medium transition-colors"
                            >
                                Kaydet
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Delete Confirm */}
            <AlertDialog open={deleteTargetId !== null} onOpenChange={open => !open && setDeleteTargetId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Çalışanı sil</AlertDialogTitle>
                        <AlertDialogDescription>
                            Bu çalışanı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>İptal</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Sil
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
