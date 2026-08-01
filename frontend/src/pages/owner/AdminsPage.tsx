import { useEffect, useState } from "react";
import { X, Pencil } from 'lucide-react';
import { toast } from "sonner";
import { userService } from "@/features/users/api/userService";
import { branchService } from "@/features/branches/api/branchService";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import type { Branch } from "@/features/branches/types";
import type { CreateUser, User } from "@/features/users/types";
import axios from "axios";
import { cn } from "@/lib/utils";
import { isValidEmail, isValidPhone } from "@/lib/validators";

const ADMIN_ROLE = 1;

const inputClass = "w-full rounded-lg border border-border bg-[rgb(245,240,232)] dark:bg-[#2a2520] px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring";
const labelClass = "block text-[11px] font-semibold tracking-widest uppercase text-muted-foreground mb-1.5";

export default function AdminsPage() {
    const [admins, setAdmins] = useState<User[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editAdmin, setEditAdmin] = useState<User | null>(null);
    const [form, setForm] = useState<CreateUser>({
        fullName: '', userName: '', email: '', phoneNumber: '',
        passwordHash: '', userCode: '', role: ADMIN_ROLE, branchId: undefined
    });
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'personal' | 'login'>('personal');

    const loadAdmins = () => {
        userService.getUsersByRestaurantId()
            .then(users => setAdmins(users.filter(u => u.role === ADMIN_ROLE)))
            .catch(console.error);
    };

    useEffect(() => {
        loadAdmins();
        branchService.getMyBranches()
            .then(setBranches)
            .catch(console.error);
    }, []);

    const generatePassword = () => {
        const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    };

    const generateUserCode = () => {
        const numbers = admins.map(u => parseInt(u.userCode.replace(/\D/g, ''), 10)).filter(n => !isNaN(n));
        const next = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
        return `ADM-${String(next).padStart(3, '0')}`;
    };

    const openCreateModal = () => {
        setEditAdmin(null);
        setForm({ fullName: '', userName: '', email: '', phoneNumber: '', passwordHash: generatePassword(), userCode: generateUserCode(), role: ADMIN_ROLE, branchId: branches[0]?.id });
        setFieldErrors({});
        setActiveTab('personal');
        setIsModalOpen(true);
    };

    const openEditModal = (admin: User) => {
        setEditAdmin(admin);
        setForm({ fullName: admin.fullName, userName: admin.userName, email: admin.email, phoneNumber: admin.phoneNumber, passwordHash: '', userCode: admin.userCode, role: ADMIN_ROLE, branchId: admin.branchId });
        setFieldErrors({});
        setActiveTab('personal');
        setIsModalOpen(true);
    };

    const personalFields = ['fullName', 'email', 'phoneNumber', 'branchId'];
    const loginFields = ['userName', 'userCode', 'passwordHash'];

    const handleDelete = async () => {
        if (!deleteTargetId) return;
        try {
            await userService.deleteUser(deleteTargetId);
            setAdmins(prev => prev.filter(u => u.id !== deleteTargetId));
            toast.success('Admin silindi.');
        } catch (err: unknown) {
            if (axios.isAxiosError(err)) {
                toast.error(err.response?.data?.error ?? err.response?.data?.message ?? 'Admin silinemedi.');
            }
        } finally {
            setDeleteTargetId(null);
        }
    };

    const toggleActive = async (admin: User) => {
        try {
            await userService.updateUser({
                id: admin.id, fullName: admin.fullName, userName: admin.userName, email: admin.email,
                phoneNumber: admin.phoneNumber, userCode: admin.userCode, role: ADMIN_ROLE, isActive: !admin.isActive
            });
            setAdmins(prev => prev.map(u => u.id === admin.id ? { ...u, isActive: !u.isActive } : u));
            toast.success(admin.isActive ? 'Admin pasif yapıldı.' : 'Admin aktif yapıldı.');
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
        if (form.email && !isValidEmail(form.email)) errors.email = 'Geçerli bir e-posta giriniz.';
        if (!form.phoneNumber.trim()) errors.phoneNumber = 'Telefon numarası boş bırakılamaz.';
        else if (!isValidPhone(form.phoneNumber)) errors.phoneNumber = 'Geçerli bir telefon numarası giriniz.';
        if (!form.branchId) errors.branchId = 'Şube seçilmelidir.';
        if (!editAdmin) {
            if (!form.passwordHash) errors.passwordHash = 'Şifre boş bırakılamaz.';
            else if (form.passwordHash.length < 6) errors.passwordHash = 'En az 6 karakter.';
            if (!form.userCode.trim()) errors.userCode = 'Kullanıcı kodu boş bırakılamaz.';
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
            if (editAdmin) {
                await userService.updateUser({ id: editAdmin.id, ...form, role: ADMIN_ROLE, password: form.passwordHash, isActive: editAdmin.isActive });
            } else {
                await userService.createUser({ ...form, role: ADMIN_ROLE });
            }
            loadAdmins();
            setIsModalOpen(false);
            toast.success(editAdmin ? 'Admin güncellendi.' : 'Admin eklendi.');
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
                        'kullanıcı kodu': 'userCode',
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

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-serif font-bold text-foreground">Adminler</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">{admins.length} admin hesabı</p>
                </div>
                <button
                    onClick={openCreateModal}
                    className="flex items-center gap-1.5 bg-rb-gold hover:opacity-90 text-rb-gold-foreground text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                >
                    + Admin Ekle
                </button>
            </div>

            {/* Table */}
            <div className="rounded-xl border border-border bg-card overflow-hidden">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-border">
                            <th className="text-left text-[11px] font-semibold tracking-widest uppercase text-muted-foreground px-5 py-3">Ad Soyad</th>
                            <th className="text-left text-[11px] font-semibold tracking-widest uppercase text-muted-foreground px-4 py-3">Şube</th>
                            <th className="text-left text-[11px] font-semibold tracking-widest uppercase text-muted-foreground px-4 py-3">E-posta</th>
                            <th className="text-left text-[11px] font-semibold tracking-widest uppercase text-muted-foreground px-4 py-3">Durum</th>
                            <th className="text-left text-[11px] font-semibold tracking-widest uppercase text-muted-foreground px-4 py-3">İşlem</th>
                        </tr>
                    </thead>
                    <tbody>
                        {admins.map(admin => {
                            const initials = admin.fullName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
                            return (
                                <tr key={admin.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                                    <td className="px-5 py-3.5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 bg-rb-purple-bg text-rb-purple">
                                                {initials}
                                            </div>
                                            <span className="font-medium text-foreground">{admin.fullName}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3.5 text-muted-foreground">{admin.branchName || '—'}</td>
                                    <td className="px-4 py-3.5 text-muted-foreground">{admin.email || '—'}</td>
                                    <td className="px-4 py-3.5">
                                        <button
                                            onClick={() => toggleActive(admin)}
                                            className={cn(
                                                "relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 focus:outline-none",
                                                admin.isActive ? "bg-rb-green" : "bg-gray-300 dark:bg-gray-600"
                                            )}
                                        >
                                            <span className={cn(
                                                "inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform duration-200",
                                                admin.isActive ? "translate-x-4" : "translate-x-0.5"
                                            )} />
                                        </button>
                                    </td>
                                    <td className="px-4 py-3.5">
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => openEditModal(admin)}
                                                className="text-muted-foreground hover:text-foreground transition-colors"
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => setDeleteTargetId(admin.id)}
                                                className="text-muted-foreground hover:text-destructive transition-colors"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                        {admins.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-5 py-10 text-center text-sm text-muted-foreground">
                                    Admin bulunamadı.
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
                                {editAdmin ? 'Admini Düzenle' : 'Admin Ekle'}
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
                                        ? "border-rb-gold text-foreground"
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
                                        ? "border-rb-gold text-foreground"
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
                                        <label className={labelClass}>Şube *</label>
                                        <select
                                            className={cn(inputClass, fieldErrors.branchId && "border-destructive")}
                                            value={form.branchId ?? ''}
                                            onChange={e => setForm({ ...form, branchId: e.target.value || undefined })}
                                        >
                                            <option value="">Şube seçiniz...</option>
                                            {branches.map(branch => (
                                                <option key={branch.id} value={branch.id}>{branch.branchName}</option>
                                            ))}
                                        </select>
                                        {fieldErrors.branchId && <p className="text-xs text-destructive mt-1">{fieldErrors.branchId}</p>}
                                    </div>

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
                                        <label className={labelClass}>Telefon *</label>
                                        <input
                                            className={cn(inputClass, fieldErrors.phoneNumber && "border-destructive")}
                                            placeholder="0532 000 00 00"
                                            value={form.phoneNumber}
                                            onChange={e => setForm({ ...form, phoneNumber: e.target.value })}
                                        />
                                        {fieldErrors.phoneNumber && <p className="text-xs text-destructive mt-1">{fieldErrors.phoneNumber}</p>}
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
                                        <label className={labelClass}>Kullanıcı Kodu</label>
                                        <input
                                            className={cn(inputClass, fieldErrors.userCode && "border-destructive")}
                                            placeholder="ADM-001"
                                            value={form.userCode}
                                            onChange={e => setForm({ ...form, userCode: e.target.value })}
                                        />
                                        {fieldErrors.userCode && <p className="text-xs text-destructive mt-1">{fieldErrors.userCode}</p>}
                                    </div>

                                    <div>
                                        <label className={labelClass}>Şifre * {editAdmin && <span className="normal-case font-normal text-muted-foreground">(boş bırakırsan değişmez)</span>}</label>
                                        <input
                                            type="text"
                                            className={cn(inputClass, fieldErrors.passwordHash && "border-destructive")}
                                            placeholder={editAdmin ? "Yeni şifre..." : "Şifre..."}
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
                                className="px-4 py-2 text-sm rounded-lg bg-rb-gold hover:opacity-90 text-rb-gold-foreground font-medium transition-colors"
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
                        <AlertDialogTitle>Admini sil</AlertDialogTitle>
                        <AlertDialogDescription>
                            Bu admini silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
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
