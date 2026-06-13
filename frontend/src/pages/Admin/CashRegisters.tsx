import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Plus,
    MoreHorizontal,
    Pencil,
    Trash2,
    Wallet,
    ArrowDownCircle,
    ArrowUpCircle,
    Banknote,
} from 'lucide-react';
import axios from 'axios';
import type { CashRegister, CashRegisterStatus } from '../../features/cashRegisters/types';
import { cashRegisterService } from '../../api/cashRegisterService';

const statusLabel: Record<CashRegisterStatus, string> = {
    1: 'Açık',
    2: 'Kapalı',
};

export default function CashRegisters() {
    const [registers, setRegisters] = useState<CashRegister[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<CashRegister | null>(null);
    const [name, setName] = useState('');
    const [balanceInput, setBalanceInput] = useState<string>('');
    const [status, setStatus] = useState<CashRegisterStatus>(1);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);

    const [txTarget, setTxTarget] = useState<CashRegister | null>(null);
    const [txType, setTxType] = useState<1 | 2>(1);
    const [txAmount, setTxAmount] = useState<string>('');

    const totalBalance = registers.reduce((sum, r) => sum + r.balance, 0);
    const openCount = registers.filter(r => r.status === 1).length;

    const refresh = async () => {
        try {
            const data = await cashRegisterService.getCashRegisters();
            setRegisters(data);
        } catch (error) {
            console.error('Kasalar çekilirken hata oluştu:', error);
        }
    };

    useEffect(() => {
        refresh();
    }, []);

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
        else if (name.length > 50) errors.name = 'Kasa adı en fazla 50 karakter olabilir.';
        const balanceNum = balanceInput === '' ? 0 : Number(balanceInput);
        if (isNaN(balanceNum) || balanceNum < 0)
            errors.balance = 'Geçerli bir bakiye giriniz.';

        if (Object.keys(errors).length > 0) {
            setFieldErrors(errors);
            return;
        }

        setFieldErrors({});
        try {
            if (editTarget) {
                await cashRegisterService.updateCashRegister(
                    editTarget.id,
                    name,
                    balanceNum,
                    status
                );
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
                    for (const key in backendErrors) {
                        mapped[key.charAt(0).toLowerCase() + key.slice(1)] = backendErrors[key][0];
                    }
                    setFieldErrors(mapped);
                }
            }
        }
    };

    const handleDelete = async () => {
        if (deleteTargetId === null) return;
        await cashRegisterService.deleteCashRegister(deleteTargetId);
        setRegisters(prev => prev.filter(r => r.id !== deleteTargetId));
        setDeleteTargetId(null);
    };

    const openTxDialog = (r: CashRegister, type: 1 | 2) => {
        setTxTarget(r);
        setTxType(type);
        setTxAmount('');
    };

    const handleTxSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!txTarget) return;
        const amount = Number(txAmount);
        if (isNaN(amount) || amount <= 0) return;
        try {
            await cashRegisterService.addTransaction(txTarget.id, txType, amount);
            await refresh();
            setTxTarget(null);
            setTxAmount('');
        } catch (error) {
            console.error('İşlem eklenirken hata oluştu:', error);
        }
    };

    return (
        <>
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Kasa Yönetimi</h2>
                <Button className="gap-2" onClick={openCreateModal}>
                    <Plus className="h-4 w-4" />
                    Kasa Ekle
                </Button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <Card>
                    <CardContent className="flex items-center gap-3 p-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
                            <Banknote className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Toplam Bakiye</p>
                            <p className="text-2xl font-bold">{totalBalance.toFixed(2)} ₺</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="flex items-center gap-3 p-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                            <Wallet className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Toplam Kasa</p>
                            <p className="text-2xl font-bold">{registers.length}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="flex items-center gap-3 p-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
                            <Wallet className="h-5 w-5 text-amber-600" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Açık Kasa</p>
                            <p className="text-2xl font-bold">{openCount}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {registers.map(r => (
                    <Card
                        key={r.id}
                        className={
                            r.status === 1
                                ? 'border-green-300 bg-green-50'
                                : 'border-gray-300 bg-gray-50'
                        }
                    >
                        <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                                        <Wallet className="h-5 w-5 text-primary" />
                                    </div>
                                    <div>
                                        <p className="font-semibold">{r.name}</p>
                                    </div>
                                </div>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem
                                            className="gap-2 cursor-pointer"
                                            onClick={() => openEditModal(r)}
                                        >
                                            <Pencil className="h-4 w-4" /> Düzenle
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            className="gap-2 text-destructive cursor-pointer"
                                            onClick={() => setDeleteTargetId(r.id)}
                                        >
                                            <Trash2 className="h-4 w-4" /> Sil
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>

                            <div className="mb-3">
                                <p className="text-xs text-muted-foreground">İçindeki Para</p>
                                <p className="text-2xl font-bold">{r.balance.toFixed(2)} ₺</p>
                            </div>

                            <div className="flex items-center justify-between mb-3">
                                <Badge
                                    variant="outline"
                                    className={
                                        r.status === 1
                                            ? 'bg-green-50 text-green-700 border-green-200'
                                            : 'bg-gray-100 text-gray-700 border-gray-200'
                                    }
                                >
                                    {statusLabel[r.status]}
                                </Badge>
                                {r.status === 1 && r.openedAt && (
                                    <span className="text-xs text-muted-foreground">
                                        Açılış: {r.openedAt}
                                    </span>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="gap-1"
                                    disabled={r.status !== 1}
                                    onClick={() => openTxDialog(r, 1)}
                                >
                                    <ArrowDownCircle className="h-4 w-4 text-green-600" />
                                    Giriş
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="gap-1"
                                    disabled={r.status !== 1}
                                    onClick={() => openTxDialog(r, 2)}
                                >
                                    <ArrowUpCircle className="h-4 w-4 text-red-600" />
                                    Çıkış
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editTarget ? 'Kasayı Düzenle' : 'Yeni Kasa Ekle'}</DialogTitle>
                        <DialogDescription aria-describedby={undefined} />
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="flex flex-col gap-4 py-4">
                        <div className="flex flex-col gap-2">
                            <Label>Kasa Adı</Label>
                            <Input
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="Ana Kasa"
                            />
                            {fieldErrors.name && (
                                <p className="text-sm text-destructive">{fieldErrors.name}</p>
                            )}
                        </div>

                        <div className="flex flex-col gap-2">
                            <Label>{editTarget ? 'Mevcut Bakiye (₺)' : 'Açılış Bakiyesi (₺)'}</Label>
                            <Input
                                type="number"
                                step="0.01"
                                value={balanceInput}
                                onChange={e => setBalanceInput(e.target.value)}
                                placeholder="0.00"
                            />
                            {fieldErrors.balance && (
                                <p className="text-sm text-destructive">{fieldErrors.balance}</p>
                            )}
                        </div>

                        <div className="flex flex-col gap-2">
                            <Label>Durum</Label>
                            <Select
                                value={status.toString()}
                                onValueChange={v => setStatus(Number(v) as CashRegisterStatus)}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="1">Açık</SelectItem>
                                    <SelectItem value="2">Kapalı</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <DialogFooter className="mt-4">
                            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                                İptal
                            </Button>
                            <Button type="submit">{editTarget ? 'Kaydet' : 'Ekle'}</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={txTarget !== null} onOpenChange={open => !open && setTxTarget(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {txType === 1 ? 'Kasaya Para Girişi' : 'Kasadan Para Çıkışı'} —{' '}
                            {txTarget?.name}
                        </DialogTitle>
                        <DialogDescription aria-describedby={undefined} />
                    </DialogHeader>

                    <form onSubmit={handleTxSubmit} className="flex flex-col gap-4 py-4">
                        <div className="flex flex-col gap-2">
                            <Label>Tutar (₺)</Label>
                            <Input
                                type="number"
                                step="0.01"
                                min="0.01"
                                value={txAmount}
                                onChange={e => setTxAmount(e.target.value)}
                                placeholder="0.00"
                                autoFocus
                            />
                            {txTarget && (
                                <p className="text-xs text-muted-foreground">
                                    Mevcut bakiye: {txTarget.balance.toFixed(2)} ₺
                                </p>
                            )}
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setTxTarget(null)}>
                                İptal
                            </Button>
                            <Button type="submit">Onayla</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <AlertDialog
                open={deleteTargetId !== null}
                onOpenChange={open => !open && setDeleteTargetId(null)}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Kasayı sil?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Bu kasa kalıcı olarak silinecek. Bu işlem geri alınamaz.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>İptal</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete}>Sil</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
