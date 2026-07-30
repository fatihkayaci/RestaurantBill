import { useEffect, useState } from "react";
import { X, Pencil } from 'lucide-react';
import axios from "axios";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import { restaurantService } from "@/features/admin/api/restaurantService";
import type { Branch, CreateRestaurant } from "@/features/admin/types";
import { ROOT_DOMAIN } from "@/lib/tenant";
import { cn } from "@/lib/utils";

const inputClass = "w-full rounded-lg border border-border bg-[rgb(245,240,232)] dark:bg-[#2a2520] px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring";
const labelClass = "block text-[11px] font-semibold tracking-widest uppercase text-muted-foreground mb-1.5";

const slugify = (value: string) =>
    value
        .toLowerCase()
        .replace(/[şŞ]/g, "s")
        .replace(/[ğĞ]/g, "g")
        .replace(/[üÜ]/g, "u")
        .replace(/[öÖ]/g, "o")
        .replace(/[çÇ]/g, "c")
        .replace(/[ıİ]/g, "i")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

export default function BranchesPage() {
    const [branches, setBranches] = useState<Branch[]>([]);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [name, setName] = useState('');
    const [nameError, setNameError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    const [slugTarget, setSlugTarget] = useState<Branch | null>(null);
    const [isEditingSlug, setIsEditingSlug] = useState(false);
    const [slugInput, setSlugInput] = useState('');
    const [slugError, setSlugError] = useState<string | null>(null);
    const [slugSaving, setSlugSaving] = useState(false);

    const [infoForm, setInfoForm] = useState<CreateRestaurant>({ name: '', phoneNumber: '', mobilePhoneNumber: '', email: '', city: '', district: '' });
    const [infoErrors, setInfoErrors] = useState<Record<string, string>>({});
    const [infoSaving, setInfoSaving] = useState(false);

    const loadBranches = () => {
        restaurantService.getMyBranches()
            .then(setBranches)
            .catch(console.error);
    };

    useEffect(() => {
        loadBranches();
    }, []);

    const openCreateModal = () => {
        setName('');
        setNameError(null);
        setIsModalOpen(true);
    };

    const openSlugModal = (branch: Branch) => {
        setSlugTarget(branch);
        setIsEditingSlug(false);
        setSlugInput('');
        setSlugError(null);
        setInfoForm({
            name: branch.name,
            phoneNumber: branch.phoneNumber,
            mobilePhoneNumber: branch.mobilePhoneNumber,
            email: branch.email,
            city: branch.city,
            district: branch.district,
        });
        setInfoErrors({});
    };

    const handleInfoSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!slugTarget) return;
        const errors: Record<string, string> = {};
        if (!infoForm.name.trim()) errors.name = 'Şube adı boş bırakılamaz.';
        if (infoForm.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(infoForm.email)) errors.email = 'Geçerli bir e-posta giriniz.';
        if (Object.keys(errors).length > 0) {
            setInfoErrors(errors);
            return;
        }
        setInfoErrors({});
        setInfoSaving(true);
        try {
            await restaurantService.updateBranch(slugTarget.id, infoForm);
            setSlugTarget(prev => prev ? { ...prev, ...infoForm } : null);
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

    const startEditSlug = () => {
        if (!slugTarget) return;
        setSlugInput(slugTarget.slug);
        setSlugError(null);
        setIsEditingSlug(true);
    };

    const cleanSlugInput = slugify(slugInput);

    const handleSlugSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!slugTarget) return;
        if (!cleanSlugInput) {
            setSlugError('Geçerli bir adres girin.');
            return;
        }
        setSlugError(null);
        setSlugSaving(true);
        try {
            await restaurantService.setBranchSlug(slugTarget.id, cleanSlugInput);
            loadBranches();
            setSlugTarget(null);
        } catch (err: unknown) {
            if (axios.isAxiosError(err)) {
                setSlugError(err.response?.data?.error ?? err.response?.data?.message ?? 'Adres ayarlanırken bir hata oluştu.');
            }
        } finally {
            setSlugSaving(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            setNameError('Şube adı boş bırakılamaz.');
            return;
        }
        setNameError(null);
        setSaving(true);
        try {
            await restaurantService.createBranch(name.trim());
            loadBranches();
            setIsModalOpen(false);
        } catch (err: unknown) {
            if (axios.isAxiosError(err)) {
                setNameError(err.response?.data?.error ?? err.response?.data?.message ?? 'Şube eklenirken bir hata oluştu.');
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
                    const isActive = !!branch.slug;
                    const address = [branch.district, branch.city].filter(Boolean).join(', ');
                    return (
                        <div
                            key={branch.id}
                            onClick={() => openSlugModal(branch)}
                            className="rounded-xl border border-border bg-card p-5 cursor-pointer hover:border-rb-gold/50 transition-colors"
                        >
                            <div className="flex items-start justify-between gap-2">
                                <h2 className="text-lg font-serif font-bold text-foreground">{branch.name}</h2>
                                <span className={cn(
                                    "shrink-0 text-[10px] font-semibold uppercase tracking-wide rounded-full px-2 py-0.5 border",
                                    isActive
                                        ? "bg-rb-green-bg text-rb-green border-rb-green/30"
                                        : "bg-rb-amber-bg text-rb-amber border-rb-amber/30"
                                )}>
                                    {isActive ? 'AKTİF' : 'KURULUM AŞAMASINDA'}
                                </span>
                            </div>
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
                            {!isActive && (
                                <p className="mt-3 text-xs font-medium text-rb-accent">
                                    Kurulumu tamamlamak için lütfen tıklayın
                                </p>
                            )}
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

                        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
                            <div>
                                <label className={labelClass}>Şube Adı</label>
                                <input
                                    className={cn(inputClass, nameError && "border-destructive")}
                                    placeholder="Örn. Kadıköy Şubesi"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                />
                                {nameError && <p className="text-xs text-destructive mt-1">{nameError}</p>}
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

            {/* Branch Detail / Slug Setup Modal */}
            {slugTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSlugTarget(null)} />
                    <div className="relative bg-white dark:bg-[#26221e] rounded-2xl shadow-xl w-full max-w-lg mx-4 overflow-hidden max-h-[85vh] flex flex-col">
                        <div className="px-6 pt-6 pb-4 flex items-center justify-between shrink-0">
                            <h2 className="text-xl font-bold text-foreground">{slugTarget.name}</h2>
                            <button
                                onClick={() => setSlugTarget(null)}
                                className="text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="overflow-y-auto">
                        {/* Şube Bilgileri */}
                        <form onSubmit={handleInfoSubmit} className="px-6 pb-5 space-y-3">
                            <p className={labelClass}>Şube Bilgileri</p>
                            <div>
                                <label className={labelClass}>Şube Adı</label>
                                <input
                                    className={cn(inputClass, infoErrors.name && "border-destructive")}
                                    value={infoForm.name}
                                    onChange={e => setInfoForm({ ...infoForm, name: e.target.value })}
                                />
                                {infoErrors.name && <p className="text-xs text-destructive mt-1">{infoErrors.name}</p>}
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className={labelClass}>Telefon</label>
                                    <input
                                        className={inputClass}
                                        placeholder="0212 000 00 00"
                                        value={infoForm.phoneNumber}
                                        onChange={e => setInfoForm({ ...infoForm, phoneNumber: e.target.value })}
                                    />
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
                                    <input
                                        className={inputClass}
                                        value={infoForm.city}
                                        onChange={e => setInfoForm({ ...infoForm, city: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className={labelClass}>İlçe</label>
                                    <input
                                        className={inputClass}
                                        value={infoForm.district}
                                        onChange={e => setInfoForm({ ...infoForm, district: e.target.value })}
                                    />
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

                        <div className="border-t border-border" />

                        {slugTarget.slug && !isEditingSlug ? (
                            <div className="px-6 pb-6 flex flex-col items-center gap-3">
                                <div className="p-3 rounded-lg bg-white">
                                    <QRCodeSVG value={`https://${slugTarget.slug}.${ROOT_DOMAIN}`} size={176} />
                                </div>
                                <p className="text-sm text-foreground font-medium break-all text-center">
                                    {slugTarget.slug}.{ROOT_DOMAIN}
                                </p>
                                <button
                                    type="button"
                                    onClick={startEditSlug}
                                    className="flex items-center gap-1.5 text-xs font-medium text-rb-accent hover:underline"
                                >
                                    <Pencil className="h-3.5 w-3.5" />
                                    Adresi Değiştir
                                </button>
                            </div>
                        ) : (
                            <>
                                <p className="px-6 text-sm text-muted-foreground">
                                    {slugTarget.name} şubesine bu adresten erişilecek.
                                </p>

                                <form onSubmit={handleSlugSubmit} className="px-6 py-5 space-y-2">
                                    <label className={labelClass}>Adres</label>
                                    <input
                                        className={cn(inputClass, slugError && "border-destructive")}
                                        placeholder="sube-adresi"
                                        value={slugInput}
                                        onChange={e => setSlugInput(e.target.value)}
                                    />
                                    <p className="text-xs text-muted-foreground truncate">
                                        {cleanSlugInput ? `${cleanSlugInput}.${ROOT_DOMAIN}` : `—.${ROOT_DOMAIN}`}
                                    </p>
                                    {slugError && <p className="text-xs text-destructive">{slugError}</p>}
                                </form>
                            </>
                        )}
                        </div>

                        <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-3 shrink-0">
                            <button
                                type="button"
                                onClick={() => (isEditingSlug ? setIsEditingSlug(false) : setSlugTarget(null))}
                                className="px-4 py-2 text-sm rounded-lg border border-border text-foreground hover:bg-muted transition-colors"
                            >
                                {slugTarget.slug && !isEditingSlug ? 'Kapat' : 'İptal'}
                            </button>
                            {(!slugTarget.slug || isEditingSlug) && (
                                <button
                                    type="button"
                                    onClick={handleSlugSubmit}
                                    disabled={slugSaving}
                                    className="px-4 py-2 text-sm rounded-lg bg-rb-gold hover:opacity-90 disabled:opacity-60 text-rb-gold-foreground font-medium transition-colors"
                                >
                                    {slugSaving ? 'Kaydediliyor...' : 'Kaydet'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
