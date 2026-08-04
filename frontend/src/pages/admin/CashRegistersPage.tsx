import { useEffect, useState } from 'react';
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { X, Pencil, ArrowDownCircle, ArrowUpCircle, ArrowLeftRight, Wallet } from 'lucide-react';
import axios from 'axios';
import type { CashRegister, CashRegisterStatus } from '@/features/cashier/types';
import { cashRegisterService } from '@/features/cashier/api/cashRegisterService';
import { cn } from '@/lib/utils';

const inputClass = "w-full rounded-lg border border-border bg-[rgb(245,240,232)] dark:bg-[#2a2520] px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring";
const labelClass = "block text-[11px] font-semibold tracking-widest uppercase text-muted-foreground mb-1.5";

export default function CashRegisters() {
    const [registers, setRegisters] = useState<CashRegister[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<CashRegister | null>(null);
    const [name, setName] = useState('');
    const [balanceInput, setBalanceInput] = useState<string>('');
    const [status, setStatus] = useState<CashRegisterStatus>(1);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    const [txTarget, setTxTarget] = useState<CashRegister | null>(null);
    const [txType, setTxType] = useState<1 | 2>(1);
    const [txAmount, setTxAmount] = useState<string>('');
    const [txError, setTxError] = useState<string | null>(null);

    const [transferSource, setTransferSource] = useState<CashRegister | null>(null);
    const [transferDestinationId, setTransferDestinationId] = useState<string | ''>('');
    const [transferAmount, setTransferAmount] = useState<string>('');
    const [transferError, setTransferError] = useState<string | null>(null);

    const totalBalance = registers.reduce((sum, r) => sum + r.balance, 0);
    const openCount = registers.filter(r => r.status === 1).length;

    const refresh = async () => {
        try {
            const data = await cashRegisterService.getCashRegisters();
            setRegisters(data);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => { refresh(); }, []);

    const openCreateModal = () => {
        setEditTarget(null);
        setName('');
        setBalanceInput('');
        setStatus(1);
        setFieldErrors({});
        setIsModalOpen(true);
    };

    const openEditModal = (r: CashRegister) => {
        setEditTarget(r);
        setName(r.name);
        setBalanceInput(r.balance.toString());
        setStatus(r.status);
        setFieldErrors({});
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const errors: Record<string, string> = {};
        if (!name.trim()) errors.name = 'Kasa adı boş olamaz.';
        else if (name.length > 50) errors.name = 'En fazla 50 karakter.';
        const balanceNum = balanceInput === '' ? 0 : Number(balanceInput);
        if (isNaN(balanceNum) || balanceNum < 0) errors.balance = 'Geçerli bir bakiye giriniz.';
        if (Object.keys(errors).length > 0) { setFieldErrors(errors); return; }
        setFieldErrors({});
        try {
            if (editTarget) {
                await cashRegisterService.updateCashRegister(editTarget.id, name, balanceNum, status);
            } else {
                await cashRegisterService.createCashRegister(name, balanceNum, status);
            }
            await refresh();
            setIsModalOpen(false);
        } catch (err: unknown) {
            if (axios.isAxiosError(err)) {
                const backendErrors = err.response?.data?.errors as Record<string, string[]> | undefined;
                if (backendErrors) {
                    const mapped: Record<string, string> = {};
                    for (const key in backendErrors) mapped[key.charAt(0).toLowerCase() + key.slice(1)] = backendErrors[key][0];
                    setFieldErrors(mapped);
                }
            }
        }
    };

    const closeDeleteDialog = () => {
        setDeleteTargetId(null);
        setDeleteError(null);
    };

    const handleDelete = async () => {
        if (deleteTargetId === null) return;
        try {
            await cashRegisterService.deleteCashRegister(deleteTargetId);
            setRegisters(prev => prev.filter(r => r.id !== deleteTargetId));
            setDeleteTargetId(null);
        } catch (err: unknown) {
            if (axios.isAxiosError(err)) {
                setDeleteError(err.response?.data?.error ?? err.response?.data?.message ?? 'Kasa silinemedi.');
            }
        }
    };

    const openTxDialog = (r: CashRegister, type: 1 | 2) => {
        setTxTarget(r);
        setTxType(type);
        setTxAmount('');
        setTxError(null);
    };

    const closeTxDialog = () => {
        setTxTarget(null);
        setTxAmount('');
        setTxError(null);
    };

    const handleTxSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!txTarget) return;
        const amount = Number(txAmount);
        if (isNaN(amount) || amount <= 0) { setTxError('Geçerli bir tutar giriniz.'); return; }
        setTxError(null);
        try {
            await cashRegisterService.addTransaction(txTarget.id, txType, amount);
            await refresh();
            closeTxDialog();
        } catch (err: unknown) {
            if (axios.isAxiosError(err)) {
                setTxError(err.response?.data?.error ?? err.response?.data?.message ?? 'İşlem gerçekleştirilemedi.');
            }
        }
    };

    const openTransferDialog = (r: CashRegister) => {
        setTransferSource(r);
        setTransferDestinationId('');
        setTransferAmount('');
        setTransferError(null);
    };

    const closeTransferDialog = () => {
        setTransferSource(null);
        setTransferDestinationId('');
        setTransferAmount('');
        setTransferError(null);
    };

    const handleTransferSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!transferSource || transferDestinationId === '') return;
        const amount = Number(transferAmount);
        if (isNaN(amount) || amount <= 0) { setTransferError('Geçerli bir tutar giriniz.'); return; }
        setTransferError(null);
        try {
            await cashRegisterService.transferBetweenCashRegisters(transferSource.id, transferDestinationId, amount);
            await refresh();
            closeTransferDialog();
        } catch (err: unknown) {
            if (axios.isAxiosError(err)) {
                setTransferError(err.response?.data?.error ?? err.response?.data?.message ?? 'Aktarım gerçekleştirilemedi.');
            }
        }
    };

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-serif font-bold text-foreground">Kasalar</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">{registers.length} kasa</p>
                </div>
                <button
                    onClick={openCreateModal}
                    className="flex items-center gap-1.5 bg-rb-accent hover:opacity-90 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                >
                    + Kasa Ekle
                </button>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-3 gap-4">
                <div className="rounded-xl border border-rb-green/30 bg-rb-green-bg p-5">
                    <p className="text-[11px] font-semibold tracking-widest uppercase text-rb-green">Toplam Bakiye</p>
                    <p className="text-3xl font-bold text-foreground mt-2">₺{totalBalance.toFixed(0)}</p>
                    <p className="text-xs text-muted-foreground mt-1">tüm kasalar</p>
                </div>
                <div className="rounded-xl border border-rb-accent/30 bg-rb-accent-bg p-5">
                    <p className="text-[11px] font-semibold tracking-widest uppercase text-rb-accent">Toplam Kasa</p>
                    <p className="text-3xl font-bold text-foreground mt-2">{registers.length}</p>
                    <p className="text-xs text-muted-foreground mt-1">kayıtlı</p>
                </div>
                <div className="rounded-xl border border-rb-amber/30 bg-rb-amber-bg p-5">
                    <p className="text-[11px] font-semibold tracking-widest uppercase text-rb-amber">Açık Kasa</p>
                    <p className="text-3xl font-bold text-foreground mt-2">{openCount}</p>
                    <p className="text-xs text-muted-foreground mt-1">aktif</p>
                </div>
            </div>

            {/* Kasa Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {registers.map(r => (
                    <div
                        key={r.id}
                        className={cn(
                            "rounded-xl border p-5 flex flex-col gap-4",
                            r.status === 1
                                ? "bg-card border-border"
                                : "bg-muted/30 border-border"
                        )}
                    >
                        {/* Top row */}
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2.5">
                                <div className={cn(
                                    "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
                                    r.status === 1 ? "bg-rb-green-bg" : "bg-muted"
                                )}>
                                    <Wallet className={cn("h-4 w-4", r.status === 1 ? "text-rb-green" : "text-muted-foreground")} />
                                </div>
                                <p className="font-semibold text-foreground">{r.name}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => openEditModal(r)} className="text-muted-foreground hover:text-foreground transition-colors">
                                    <Pencil className="h-3.5 w-3.5" />
                                </button>
                                <button onClick={() => setDeleteTargetId(r.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        </div>

                        {/* Balance */}
                        <div>
                            <p className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground">Bakiye</p>
                            <p className="text-2xl font-bold text-foreground mt-1">₺{r.balance.toFixed(2)}</p>
                        </div>

                        {/* Status + actions */}
                        <div className="flex items-center justify-between">
                            <span className={cn(
                                "text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded",
                                r.status === 1
                                    ? "bg-rb-green-bg text-rb-green"
                                    : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                            )}>
                                {r.status === 1 ? 'Açık' : 'Kapalı'}
                            </span>
                            <div className="flex items-center gap-2">
                                <button
                                    disabled={r.status !== 1}
                                    onClick={() => openTxDialog(r, 1)}
                                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-border text-xs font-medium text-rb-green hover:bg-rb-green-bg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ArrowDownCircle className="h-3.5 w-3.5" />
                                    Giriş
                                </button>
                                <button
                                    disabled={r.status !== 1}
                                    onClick={() => openTxDialog(r, 2)}
                                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-border text-xs font-medium text-rb-red hover:bg-rb-red-bg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ArrowUpCircle className="h-3.5 w-3.5" />
                                    Çıkış
                                </button>
                                <button
                                    disabled={r.status !== 1 || registers.filter(x => x.id !== r.id && x.status === 1).length === 0}
                                    onClick={() => openTransferDialog(r)}
                                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-border text-xs font-medium text-rb-accent hover:bg-rb-accent-bg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ArrowLeftRight className="h-3.5 w-3.5" />
                                    Aktar
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Kasa Ekle / Düzenle Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
                    <div className="relative bg-white dark:bg-[#26221e] rounded-2xl shadow-xl w-full max-w-sm mx-4 overflow-hidden">
                        <div className="px-6 pt-6 pb-4 border-b border-border flex items-center justify-between">
                            <h2 className="text-xl font-bold text-foreground">
                                {editTarget ? 'Kasayı Düzenle' : 'Kasa Ekle'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
                            <div>
                                <label className={labelClass}>Kasa Adı</label>
                                <input
                                    className={cn(inputClass, fieldErrors.name && "border-destructive")}
                                    placeholder="Ana Kasa"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    autoFocus
                                />
                                {fieldErrors.name && <p className="text-xs text-destructive mt-1">{fieldErrors.name}</p>}
                            </div>

                            <div>
                                <label className={labelClass}>{editTarget ? 'Mevcut Bakiye (₺)' : 'Açılış Bakiyesi (₺)'}</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    className={cn(inputClass, fieldErrors.balance && "border-destructive")}
                                    placeholder="0.00"
                                    value={balanceInput}
                                    onChange={e => setBalanceInput(e.target.value)}
                                />
                                {fieldErrors.balance && <p className="text-xs text-destructive mt-1">{fieldErrors.balance}</p>}
                            </div>

                            <div>
                                <label className={labelClass}>Durum</label>
                                <select
                                    className={inputClass}
                                    value={status}
                                    onChange={e => setStatus(Number(e.target.value) as CashRegisterStatus)}
                                >
                                    <option value={1}>Açık</option>
                                    <option value={2}>Kapalı</option>
                                </select>
                            </div>
                        </form>

                        <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-3">
                            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm rounded-lg border border-border text-foreground hover:bg-muted transition-colors">İptal</button>
                            <button type="button" onClick={handleSubmit} className="px-4 py-2 text-sm rounded-lg bg-rb-accent hover:opacity-90 text-white font-medium transition-colors">
                                {editTarget ? 'Kaydet' : 'Ekle'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Para Giriş / Çıkış Modal */}
            {txTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeTxDialog} />
                    <div className="relative bg-white dark:bg-[#26221e] rounded-2xl shadow-xl w-full max-w-sm mx-4 overflow-hidden">
                        <div className="px-6 pt-6 pb-4 border-b border-border flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-bold text-foreground">
                                    {txType === 1 ? 'Para Girişi' : 'Para Çıkışı'}
                                </h2>
                                <p className="text-sm text-muted-foreground mt-0.5">{txTarget.name}</p>
                            </div>
                            <button onClick={closeTxDialog} className="text-muted-foreground hover:text-foreground transition-colors">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={handleTxSubmit} className="px-6 py-5">
                            <label className={labelClass}>Tutar (₺)</label>
                            <input
                                type="number"
                                step="0.01"
                                min="0.01"
                                className={cn(inputClass, txError && "border-destructive")}
                                placeholder="0.00"
                                value={txAmount}
                                onChange={e => setTxAmount(e.target.value)}
                                autoFocus
                            />
                            {txError && <p className="text-xs text-destructive mt-1">{txError}</p>}
                            <p className="text-xs text-muted-foreground mt-2">
                                Mevcut bakiye: ₺{txTarget.balance.toFixed(2)}
                            </p>
                        </form>

                        <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-3">
                            <button type="button" onClick={closeTxDialog} className="px-4 py-2 text-sm rounded-lg border border-border text-foreground hover:bg-muted transition-colors">İptal</button>
                            <button
                                type="button"
                                onClick={handleTxSubmit}
                                className={cn(
                                    "px-4 py-2 text-sm rounded-lg text-white font-medium transition-colors",
                                    txType === 1 ? "bg-rb-green hover:opacity-90" : "bg-rb-red hover:opacity-90"
                                )}
                            >
                                Onayla
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Kasalar Arası Aktarım Modal */}
            {transferSource && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeTransferDialog} />
                    <div className="relative bg-white dark:bg-[#26221e] rounded-2xl shadow-xl w-full max-w-sm mx-4 overflow-hidden">
                        <div className="px-6 pt-6 pb-4 border-b border-border flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-bold text-foreground">Kasalar Arası Aktarım</h2>
                                <p className="text-sm text-muted-foreground mt-0.5">{transferSource.name}</p>
                            </div>
                            <button onClick={closeTransferDialog} className="text-muted-foreground hover:text-foreground transition-colors">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={handleTransferSubmit} className="px-6 py-5 space-y-4">
                            <div>
                                <label className={labelClass}>Hedef Kasa</label>
                                <select
                                    className={inputClass}
                                    value={transferDestinationId}
                                    onChange={e => setTransferDestinationId(e.target.value)}
                                >
                                    <option value="">Seçiniz</option>
                                    {registers.filter(x => x.id !== transferSource.id && x.status === 1).map(x => (
                                        <option key={x.id} value={x.id}>{x.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className={cn(labelClass, "mb-0")}>Tutar (₺)</label>
                                    <button
                                        type="button"
                                        onClick={() => setTransferAmount(transferSource.balance.toString())}
                                        className="text-[11px] font-semibold text-rb-accent hover:opacity-80 transition-colors"
                                    >
                                        Tümünü Yaz
                                    </button>
                                </div>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    className={cn(inputClass, transferError && "border-destructive")}
                                    placeholder="0.00"
                                    value={transferAmount}
                                    onChange={e => setTransferAmount(e.target.value)}
                                    autoFocus
                                />
                                {transferError && <p className="text-xs text-destructive mt-1">{transferError}</p>}
                                <p className="text-xs text-muted-foreground mt-2">
                                    Mevcut bakiye: ₺{transferSource.balance.toFixed(2)}
                                </p>
                            </div>
                        </form>

                        <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-3">
                            <button type="button" onClick={closeTransferDialog} className="px-4 py-2 text-sm rounded-lg border border-border text-foreground hover:bg-muted transition-colors">İptal</button>
                            <button
                                type="button"
                                onClick={handleTransferSubmit}
                                disabled={transferDestinationId === ''}
                                className="px-4 py-2 text-sm rounded-lg bg-rb-accent hover:opacity-90 text-white font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                Aktar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirm */}
            <AlertDialog open={deleteTargetId !== null} onOpenChange={open => !open && closeDeleteDialog()}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Kasayı sil</AlertDialogTitle>
                        <AlertDialogDescription>
                            {deleteError ?? "Bu kasa kalıcı olarak silinecek. Bu işlem geri alınamaz."}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>İptal</AlertDialogCancel>
                        {!deleteError && (
                            <Button variant="destructive" onClick={handleDelete}>Sil</Button>
                        )}
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
