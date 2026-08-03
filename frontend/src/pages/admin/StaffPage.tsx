import { useEffect, useState } from "react";
import { Search, X, Pencil } from 'lucide-react';
import { toast } from "sonner";
import { userService } from "@/features/users/api/userService";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import type { CreateUser, User } from "@/features/users/types";
import axios from "axios";
import { cn } from "@/lib/utils";

const roleMap: Record<number, string> = { 1: "Admin", 2: "Garson", 3: "Kasiyer", 4: "Mutfak" };

const roleStyle: Record<number, { avatar: string; badge: string }> = {
    1: { avatar: 'bg-rb-purple-bg text-rb-purple', badge: 'bg-rb-purple-bg text-rb-purple' },
    2: { avatar: 'bg-rb-accent-bg text-rb-accent', badge: 'bg-rb-accent-bg text-rb-accent' },
    3: { avatar: 'bg-rb-green-bg text-rb-green', badge: 'bg-rb-green-bg text-rb-green' },
    4: { avatar: 'bg-rb-amber-bg text-rb-amber', badge: 'bg-rb-amber-bg text-rb-amber' },
};

const inputClass = "w-full rounded-lg border border-border bg-[rgb(245,240,232)] dark:bg-[#2a2520] px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring";
const labelClass = "block text-[11px] font-semibold tracking-widest uppercase text-muted-foreground mb-1.5";

export default function StaffPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [search, setSearch] = useState('');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editUser, setEditUser] = useState<User | null>(null);
    const [form, setForm] = useState<CreateUser>({
        fullName: '', userName: '', email: '', phoneNumber: '',
        passwordHash: '', role: 2
    });
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'personal' | 'login'>('personal');

    useEffect(() => {
        userService.getUsersByRestaurantId()
            .then(setUsers)
            .catch(console.error);
    }, []);

    const generatePassword = () => {
        const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    };

    const openCreateModal = () => {
        setEditUser(null);
        setForm({ fullName: '', userName: '', email: '', phoneNumber: '', passwordHash: generatePassword(), role: 2 });
        setFieldErrors({});
        setActiveTab('personal');
        setIsModalOpen(true);
    };

    const openEditModal = (user: User) => {
        setEditUser(user);
        setForm({ fullName: user.fullName, userName: user.userName, email: user.email, phoneNumber: user.phoneNumber, passwordHash: '', role: user.role });
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
        if (Object.keys(errors).length > 0) {
            setFieldErrors(errors);
            if (personalFields.some(f => errors[f]) && !loginFields.some(f => errors[f])) setActiveTab('personal');
            else if (loginFields.some(f => errors[f])) setActiveTab('login');
            return;
        }
        setFieldErrors({});
        try {
            if (editUser) {
                await userService.updateUser({ id: editUser.id, ...form, password: form.passwordHash, isActive: editUser.isActive });
            } else {
                await userService.createUser(form);
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
                    className="flex items-center gap-1.5 bg-rb-accent hover:opacity-90 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
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

            {/* Table */}
            <div className="rounded-xl border border-border bg-card overflow-hidden">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-border">
                            <th className="text-left text-[11px] font-semibold tracking-widest uppercase text-muted-foreground px-5 py-3">Ad Soyad</th>
                            <th className="text-left text-[11px] font-semibold tracking-widest uppercase text-muted-foreground px-4 py-3">Kullanıcı Adı</th>
                            <th className="text-left text-[11px] font-semibold tracking-widest uppercase text-muted-foreground px-4 py-3">Rol</th>
                            <th className="text-left text-[11px] font-semibold tracking-widest uppercase text-muted-foreground px-4 py-3">Başlangıç</th>
                            <th className="text-left text-[11px] font-semibold tracking-widest uppercase text-muted-foreground px-4 py-3">Durum</th>
                            <th className="text-left text-[11px] font-semibold tracking-widest uppercase text-muted-foreground px-4 py-3">İşlem</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map(user => {
                            const style = roleStyle[user.role] ?? roleStyle[1];
                            const initials = user.fullName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
                            const isActive = user.isActive;
                            return (
                                <tr key={user.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                                    <td className="px-5 py-3.5">
                                        <div className="flex items-center gap-3">
                                            <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0", style.avatar)}>
                                                {initials}
                                            </div>
                                            <span className="font-medium text-foreground">
                                                {user.fullName}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3.5 text-muted-foreground">{user.userName}</td>
                                    <td className="px-4 py-3.5">
                                        <span className={cn("inline-block px-3 py-0.5 rounded-full text-xs font-semibold tracking-wide uppercase", style.badge)}>
                                            {roleMap[user.role] ?? 'Bilinmiyor'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3.5 text-muted-foreground">—</td>
                                    <td className="px-4 py-3.5">
                                        <button
                                            onClick={() => toggleActive(user)}
                                            className={cn(
                                                "relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 focus:outline-none",
                                                isActive ? "bg-rb-green" : "bg-gray-300 dark:bg-gray-600"
                                            )}
                                        >
                                            <span className={cn(
                                                "inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform duration-200",
                                                isActive ? "translate-x-4" : "translate-x-0.5"
                                            )} />
                                        </button>
                                    </td>
                                    <td className="px-4 py-3.5">
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => openEditModal(user)}
                                                className="text-muted-foreground hover:text-foreground transition-colors"
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => setDeleteTargetId(user.id)}
                                                className="text-muted-foreground hover:text-destructive transition-colors"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                        {filtered.length === 0 && (
                            <tr>
                                <td colSpan={6} className="px-5 py-10 text-center text-sm text-muted-foreground">
                                    Çalışan bulunamadı.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
                    <div className="relative bg-white dark:bg-[#26221e] rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
                        <div className="px-6 pt-6 pb-4 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-foreground">
                                {editUser ? 'Çalışanı Düzenle' : 'Çalışan Ekle'}
                            </h2>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="px-6 pt-4 flex items-center gap-1 border-b border-border">
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
                        </div>

                        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
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
                                        </select>
                                    </div>

                                    <div>
                                        <label className={labelClass}>Şifre * {editUser && <span className="normal-case font-normal text-muted-foreground">(boş bırakırsan değişmez)</span>}</label>
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
                        </form>

                        <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-3">
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
                                className="px-4 py-2 text-sm rounded-lg bg-rb-accent hover:opacity-90 text-white font-medium transition-colors"
                            >
                                Kaydet
                            </button>
                        </div>
                    </div>
                </div>
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
