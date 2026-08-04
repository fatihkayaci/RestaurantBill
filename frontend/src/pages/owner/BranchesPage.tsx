import { useEffect, useState } from "react";
import { X } from 'lucide-react';
import axios from "axios";
import { toast } from "sonner";
import { branchService } from "@/features/branches/api/branchService";
import type { Branch, CreateBranch, UpdateBranch } from "@/features/branches/types";
import { getTurkeyProvinces, type Province } from "@/lib/turkeyLocations";
import { cn } from "@/lib/utils";

const inputClass = "w-full rounded-lg border border-border bg-[rgb(245,240,232)] dark:bg-[#2a2520] px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring";
const labelClass = "block text-[11px] font-semibold tracking-widest uppercase text-muted-foreground mb-1.5";

const isValidPhone = (value: string) => {
    if (!value.trim()) return true;
    const digits = value.replace(/\D/g, '').replace(/^90/, '').replace(/^0/, '');
    return /^\d{10}$/.test(digits);
};

export default function BranchesPage() {
    const [branches, setBranches] = useState<Branch[]>([]);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [createForm, setCreateForm] = useState<CreateBranch>({ name: '', managerName: '', phoneNumber: '', email: '', city: '', district: '', openAddress: '', taxRate: '' });
    const [createErrors, setCreateErrors] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);

    const [editTarget, setEditTarget] = useState<Branch | null>(null);

    const [infoForm, setInfoForm] = useState<UpdateBranch>({ name: '', managerName: '', phoneNumber: '', email: '', city: '', district: '', openAddress: '', taxRate: '' });
    const [infoErrors, setInfoErrors] = useState<Record<string, string>>({});
    const [infoSaving, setInfoSaving] = useState(false);

    const [provinces, setProvinces] = useState<Province[]>([]);
    const districtsFor = (cityName: string) => provinces.find(p => p.name === cityName)?.districts ?? [];

    const loadBranches = () => {
        branchService.getMyBranches()
            .then(setBranches)
            .catch(console.error);
    };

    useEffect(() => {
        loadBranches();
        getTurkeyProvinces().then(setProvinces).catch(console.error);
    }, []);

    const openCreateModal = () => {
        setCreateForm({ name: '', managerName: '', phoneNumber: '', email: '', city: '', district: '', openAddress: '', taxRate: '' });
        setCreateErrors({});
        setIsModalOpen(true);
    };

    const openEditModal = (branch: Branch) => {
        setEditTarget(branch);
        setInfoForm({
            name: branch.branchName,
            managerName: branch.managerName,
            phoneNumber: branch.number,
            email: branch.email,
            city: branch.city,
            district: branch.district,
            openAddress: branch.openAddress,
            taxRate: String(branch.taxRate),
        });
        setInfoErrors({});
    };

    const handleInfoSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editTarget) return;
        const errors: Record<string, string> = {};
        if (!infoForm.name.trim()) errors.name = 'Şube adı boş bırakılamaz.';
        if (infoForm.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(infoForm.email)) errors.email = 'Geçerli bir e-posta giriniz.';
        if (!isValidPhone(infoForm.phoneNumber)) errors.phoneNumber = 'Geçerli bir telefon numarası giriniz.';
        const infoTaxRate = Number(infoForm.taxRate);
        if (infoForm.taxRate.trim() === '' || Number.isNaN(infoTaxRate) || infoTaxRate < 0 || infoTaxRate > 100) {
            errors.taxRate = 'KDV oranı 0 ile 100 arasında olmalıdır.';
        }
        if (Object.keys(errors).length > 0) {
            setInfoErrors(errors);
            return;
        }
        setInfoErrors({});
        setInfoSaving(true);
        try {
            await branchService.updateBranch(editTarget.id, infoForm);
            setEditTarget(prev => prev ? {
                ...prev,
                branchName: infoForm.name,
                managerName: infoForm.managerName,
                number: infoForm.phoneNumber,
                email: infoForm.email,
                city: infoForm.city,
                district: infoForm.district,
                openAddress: infoForm.openAddress,
                taxRate: infoTaxRate,
            } : null);
            loadBranches();
            toast.success('Şube bilgileri güncellendi.');
        } catch (err: unknown) {
            if (axios.isAxiosError(err)) {
                toast.error(err.response?.data?.error ?? err.response?.data?.message ?? 'Şube bilgileri güncellenirken bir hata oluştu.');
            }
        } finally {
            setInfoSaving(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const errors: Record<string, string> = {};
        if (!createForm.name.trim()) errors.name = 'Şube adı boş bırakılamaz.';
        if (createForm.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(createForm.email)) errors.email = 'Geçerli bir e-posta giriniz.';
        if (!isValidPhone(createForm.phoneNumber)) errors.phoneNumber = 'Geçerli bir telefon numarası giriniz.';
        const createTaxRate = Number(createForm.taxRate);
        if (createForm.taxRate.trim() === '' || Number.isNaN(createTaxRate) || createTaxRate < 0 || createTaxRate > 100) {
            errors.taxRate = 'KDV oranı 0 ile 100 arasında olmalıdır.';
        }
        if (Object.keys(errors).length > 0) {
            setCreateErrors(errors);
            return;
        }
        setCreateErrors({});
        setSaving(true);
        try {
            await branchService.createBranch(createForm);
            loadBranches();
            setIsModalOpen(false);
        } catch (err: unknown) {
            if (axios.isAxiosError(err)) {
                setCreateErrors({ name: err.response?.data?.error ?? err.response?.data?.message ?? 'Şube eklenirken bir hata oluştu.' });
            }
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-serif font-bold text-foreground">Şubeler</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">{branches.length} şube</p>
                </div>
                <button
                    onClick={openCreateModal}
                    className="flex items-center gap-1.5 bg-rb-gold hover:opacity-90 text-rb-gold-foreground text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                >
                    + Şube Ekle
                </button>
            </div>

            {/* Branch Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {branches.map(branch => {
                    const address = [branch.district, branch.city].filter(Boolean).join(', ');
                    return (
                        <div
                            key={branch.id}
                            onClick={() => openEditModal(branch)}
                            className="rounded-xl border border-border bg-card p-5 cursor-pointer hover:border-rb-gold/50 transition-colors"
                        >
                            <h2 className="text-lg font-serif font-bold text-foreground">{branch.branchName}</h2>
                            <p className="mt-1 text-sm text-muted-foreground">
                                {address || '—'}
                            </p>
                            <div className="mt-4 pt-4 border-t border-border grid grid-cols-3 gap-2 text-center">
                                <div>
                                    <p className="text-lg font-serif font-bold text-foreground">{branch.tableCount ?? 0}</p>
                                    <p className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground">Masa</p>
                                </div>
                                <div>
                                    <p className="text-lg font-serif font-bold text-foreground">{branch.staffCount ?? 0}</p>
                                    <p className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground">Personel</p>
                                </div>
                                <div>
                                    <p className="text-lg font-serif font-bold text-foreground">₺{(branch.revenue ?? 0).toFixed(0)}</p>
                                    <p className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground">Ciro</p>
                                </div>
                            </div>
                            <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Yönetici</span>
                                <span className="font-semibold text-foreground">{branch.managerName || '—'}</span>
                            </div>
                        </div>
                    );
                })}
                {branches.length === 0 && (
                    <div className="rounded-xl border border-border bg-card p-8 text-sm text-muted-foreground text-center col-span-full">
                        Henüz şube bulunmuyor.
                    </div>
                )}
            </div>

            {/* Create Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
                    <div className="relative bg-white dark:bg-[#26221e] rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
                        <div className="px-6 pt-6 pb-4 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-foreground">Şube Ekle</h2>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className={labelClass}>Şube Adı</label>
                                    <input
                                        className={cn(inputClass, createErrors.name && "border-destructive")}
                                        placeholder="Örn. Kadıköy Şubesi"
                                        value={createForm.name}
                                        onChange={e => setCreateForm({ ...createForm, name: e.target.value })}
                                    />
                                    {createErrors.name && <p className="text-xs text-destructive mt-1">{createErrors.name}</p>}
                                </div>
                                <div>
                                    <label className={labelClass}>Yönetici Adı</label>
                                    <input
                                        className={inputClass}
                                        placeholder="Şube yöneticisi..."
                                        value={createForm.managerName}
                                        onChange={e => setCreateForm({ ...createForm, managerName: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className={labelClass}>Telefon</label>
                                    <input
                                        className={cn(inputClass, createErrors.phoneNumber && "border-destructive")}
                                        placeholder="0212 000 00 00"
                                        value={createForm.phoneNumber}
                                        onChange={e => setCreateForm({ ...createForm, phoneNumber: e.target.value })}
                                    />
                                    {createErrors.phoneNumber && <p className="text-xs text-destructive mt-1">{createErrors.phoneNumber}</p>}
                                </div>
                                <div>
                                    <label className={labelClass}>E-posta</label>
                                    <input
                                        type="email"
                                        className={cn(inputClass, createErrors.email && "border-destructive")}
                                        value={createForm.email}
                                        onChange={e => setCreateForm({ ...createForm, email: e.target.value })}
                                    />
                                    {createErrors.email && <p className="text-xs text-destructive mt-1">{createErrors.email}</p>}
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className={labelClass}>Şehir</label>
                                    <select
                                        className={inputClass}
                                        value={createForm.city}
                                        onChange={e => setCreateForm({ ...createForm, city: e.target.value, district: '' })}
                                    >
                                        <option value="">Seçiniz...</option>
                                        {provinces.map(p => (
                                            <option key={p.name} value={p.name}>{p.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className={labelClass}>İlçe</label>
                                    <select
                                        className={inputClass}
                                        value={createForm.district}
                                        onChange={e => setCreateForm({ ...createForm, district: e.target.value })}
                                        disabled={!createForm.city}
                                    >
                                        <option value="">Seçiniz...</option>
                                        {districtsFor(createForm.city).map(d => (
                                            <option key={d.id} value={d.name}>{d.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className={labelClass}>Açık Adres</label>
                                    <input
                                        className={inputClass}
                                        placeholder="Cadde, sokak, no..."
                                        value={createForm.openAddress}
                                        onChange={e => setCreateForm({ ...createForm, openAddress: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className={labelClass}>KDV Oranı (%)</label>
                                    <input
                                        type="number"
                                        min={0}
                                        max={100}
                                        step="0.01"
                                        className={cn(inputClass, createErrors.taxRate && "border-destructive")}
                                        placeholder="Örn. 10"
                                        value={createForm.taxRate}
                                        onChange={e => setCreateForm({ ...createForm, taxRate: e.target.value })}
                                    />
                                    {createErrors.taxRate && <p className="text-xs text-destructive mt-1">{createErrors.taxRate}</p>}
                                </div>
                            </div>
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
                                disabled={saving}
                                className="px-4 py-2 text-sm rounded-lg bg-rb-gold hover:opacity-90 disabled:opacity-60 text-rb-gold-foreground font-medium transition-colors"
                            >
                                {saving ? 'Kaydediliyor...' : 'Kaydet'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Branch Detail Modal */}
            {editTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setEditTarget(null)} />
                    <div className="relative bg-white dark:bg-[#26221e] rounded-2xl shadow-xl w-full max-w-lg mx-4 overflow-hidden max-h-[85vh] flex flex-col">
                        <div className="px-6 pt-6 pb-4 flex items-center justify-between shrink-0">
                            <h2 className="text-xl font-bold text-foreground">{editTarget.branchName}</h2>
                            <button
                                onClick={() => setEditTarget(null)}
                                className="text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="overflow-y-auto">
                        <form onSubmit={handleInfoSubmit} className="px-6 pb-6 space-y-3">
                            <p className={labelClass}>Şube Bilgileri</p>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className={labelClass}>Şube Adı</label>
                                    <input
                                        className={cn(inputClass, infoErrors.name && "border-destructive")}
                                        value={infoForm.name}
                                        onChange={e => setInfoForm({ ...infoForm, name: e.target.value })}
                                    />
                                    {infoErrors.name && <p className="text-xs text-destructive mt-1">{infoErrors.name}</p>}
                                </div>
                                <div>
                                    <label className={labelClass}>Yönetici Adı</label>
                                    <input
                                        className={inputClass}
                                        placeholder="Şube yöneticisi..."
                                        value={infoForm.managerName}
                                        onChange={e => setInfoForm({ ...infoForm, managerName: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className={labelClass}>Telefon</label>
                                    <input
                                        className={cn(inputClass, infoErrors.phoneNumber && "border-destructive")}
                                        placeholder="0212 000 00 00"
                                        value={infoForm.phoneNumber}
                                        onChange={e => setInfoForm({ ...infoForm, phoneNumber: e.target.value })}
                                    />
                                    {infoErrors.phoneNumber && <p className="text-xs text-destructive mt-1">{infoErrors.phoneNumber}</p>}
                                </div>
                                <div>
                                    <label className={labelClass}>E-posta</label>
                                    <input
                                        type="email"
                                        className={cn(inputClass, infoErrors.email && "border-destructive")}
                                        value={infoForm.email}
                                        onChange={e => setInfoForm({ ...infoForm, email: e.target.value })}
                                    />
                                    {infoErrors.email && <p className="text-xs text-destructive mt-1">{infoErrors.email}</p>}
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className={labelClass}>Şehir</label>
                                    <select
                                        className={inputClass}
                                        value={infoForm.city}
                                        onChange={e => setInfoForm({ ...infoForm, city: e.target.value, district: '' })}
                                    >
                                        <option value="">Seçiniz...</option>
                                        {provinces.map(p => (
                                            <option key={p.name} value={p.name}>{p.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className={labelClass}>İlçe</label>
                                    <select
                                        className={inputClass}
                                        value={infoForm.district}
                                        onChange={e => setInfoForm({ ...infoForm, district: e.target.value })}
                                        disabled={!infoForm.city}
                                    >
                                        <option value="">Seçiniz...</option>
                                        {districtsFor(infoForm.city).map(d => (
                                            <option key={d.id} value={d.name}>{d.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className={labelClass}>Açık Adres</label>
                                    <input
                                        className={inputClass}
                                        placeholder="Cadde, sokak, no..."
                                        value={infoForm.openAddress}
                                        onChange={e => setInfoForm({ ...infoForm, openAddress: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className={labelClass}>KDV Oranı (%)</label>
                                    <input
                                        type="number"
                                        min={0}
                                        max={100}
                                        step="0.01"
                                        className={cn(inputClass, infoErrors.taxRate && "border-destructive")}
                                        placeholder="Örn. 10"
                                        value={infoForm.taxRate}
                                        onChange={e => setInfoForm({ ...infoForm, taxRate: e.target.value })}
                                    />
                                    {infoErrors.taxRate && <p className="text-xs text-destructive mt-1">{infoErrors.taxRate}</p>}
                                </div>
                            </div>
                            <div className="flex justify-end">
                                <button
                                    type="submit"
                                    disabled={infoSaving}
                                    className="px-4 py-2 text-sm rounded-lg bg-rb-gold hover:opacity-90 disabled:opacity-60 text-rb-gold-foreground font-medium transition-colors"
                                >
                                    {infoSaving ? 'Kaydediliyor...' : 'Şube Bilgilerini Kaydet'}
                                </button>
                            </div>
                        </form>
                        </div>

                        <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-3 shrink-0">
                            <button
                                type="button"
                                onClick={() => setEditTarget(null)}
                                className="px-4 py-2 text-sm rounded-lg border border-border text-foreground hover:bg-muted transition-colors"
                            >
                                Kapat
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
