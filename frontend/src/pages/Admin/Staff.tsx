import { useEffect, useState } from "react";
import { userService } from "../../api/userService";
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Pencil, Trash2, MoreHorizontal} from 'lucide-react'
import { DropdownMenu, DropdownMenuContent,DropdownMenuItem, DropdownMenuTrigger} from '@/components/ui/dropdown-menu'
import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter} from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select"
import type { CreateUser, User } from "@/features/auths/userTypes";
import axios from "axios";

export default function Staff() {
    const roleMap: Record<number, string> = {
        1: "Admin",
        2: "Garson",
        3: "Kasiyer",
        4: "Mutfak"
    };
    const [users, setUsers] = useState<User[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editUser, setEditUser] = useState<User | null>(null);
    const [form, setForm] = useState<CreateUser>({
        fullName: '', userName: '', email: '', phoneNumber: '',
        passwordHash: '', userCode: '', role: 2
    });
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        userService.getUsersByRestaurantId().then(setUsers).catch(console.error);
    }, []);

    const generatePassword = () => {
        const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    };

    const generateUserCode = () => {
        const numbers = users
            .map(u => parseInt(u.userCode.replace(/\D/g, ''), 10))
            .filter(n => !isNaN(n));
        const next = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
        return `USR-${String(next).padStart(3, '0')}`;
    };

    const openCreateModal = () => {
        setEditUser(null);
        setForm({ fullName: '', userName: '', email: '', phoneNumber: '', passwordHash: generatePassword(), userCode: generateUserCode(), role: 2 });
        setFieldErrors({});
        setIsModalOpen(true);
    };

    const openEditModal = (user: User) => {
        setEditUser(user);
        setForm({ fullName: user.fullName, userName: user.userName, email: user.email, phoneNumber: user.phoneNumber, passwordHash: '', userCode: user.userCode, role: user.role });
        setFieldErrors({});
        setIsModalOpen(true);
    };

    const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

    const handleDelete = async () => {
        if (deleteTargetId === null) return;
        await userService.deleteUser(deleteTargetId);
        setUsers(users.filter(u => u.id !== deleteTargetId));
        setDeleteTargetId(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const errors: Record<string, string> = {};
        if (!form.fullName.trim()) errors.fullName = 'Ad soyad boş bırakılamaz.';
        else if (form.fullName.length > 100) errors.fullName = 'Ad soyad en fazla 100 karakter olabilir.';

        if (!form.userName.trim()) errors.userName = 'Kullanıcı adı boş bırakılamaz.';
        else if (form.userName.length > 50) errors.userName = 'Kullanıcı adı en fazla 50 karakter olabilir.';

        if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
            errors.email = 'Geçerli bir e-posta adresi giriniz.';
        }

        if (form.phoneNumber && form.phoneNumber.length > 20) {
            errors.phoneNumber = 'Telefon numarası en fazla 20 karakter olabilir.';
        }

        if (!editUser) {
            if (!form.passwordHash) errors.passwordHash = 'Şifre boş bırakılamaz.';
            else if (form.passwordHash.length < 6) errors.passwordHash = 'Şifre en az 6 karakter olmalıdır.';
            if (!form.userCode.trim()) errors.userCode = 'Kullanıcı kodu boş bırakılamaz.';
        } else if (form.passwordHash && form.passwordHash.length < 6) {
            errors.passwordHash = 'Şifre en az 6 karakter olmalıdır.';
        }

        if (Object.keys(errors).length > 0) {
            setFieldErrors(errors);
            return;
        }

        setFieldErrors({});
        try {
            if (editUser) {
                console.log(form);
                await userService.updateUser({ id: editUser.id, ...form, password: form.passwordHash });
            } else {
                await userService.createUser(form);
            }
            const updated = await userService.getUsersByRestaurantId();
            setUsers(updated);
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

    return (
        <>
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Staff Members</h2>
                <Button className="gap-2" onClick={openCreateModal}>
                <Plus className="h-4 w-4"/>
                Add Staff
                </Button>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {users.map(user => (
                    <Card key={user.id}>
                        <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-lg">
                                        {user.fullName.split(' ').map(n => n[0]).join('')}
                                    </div>
                                    <div>
                                        <p className="font-semibold">{user.fullName}</p>
                                        <p className="text-sm text-muted-foreground">{user.email}</p>
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
                                            onClick={() => openEditModal(user)}
                                        >
                                            <Pencil className="h-4 w-4" /> Edit
                                        </DropdownMenuItem>
                                        
                                        <DropdownMenuItem 
                                            className="gap-2 text-destructive cursor-pointer" 
                                            onClick={() => setDeleteTargetId(user.id)}
                                        >
                                            <Trash2 className="h-4 w-4" /> Remove
                                        </DropdownMenuItem>

                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                            <div className="mt-3">
                                <Badge className="capitalize">{roleMap[user.role] || "Bilinmiyor"}</Badge>
                            </div>
                        </CardContent>
                    </Card>
                ))}

                <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                    <DialogContent className="flex flex-col max-h-[90vh]">
                        <DialogHeader>
                            <DialogTitle>
                                {editUser ? 'Kullanıcıyı Düzenle' : 'Yeni Kullanıcı Ekle'}
                            </DialogTitle>
                            <DialogDescription aria-describedby={undefined} />
                        </DialogHeader>

                        <form onSubmit={handleSubmit} className="flex flex-col gap-4 py-4 overflow-y-auto">
                            <div className="flex flex-col gap-2">
                                <Label>Ad Soyad</Label>
                                <Input
                                    value={form.fullName}
                                    onChange={e => setForm({ ...form, fullName: e.target.value })}
                                    placeholder="Ad Soyad"
                                />
                                {fieldErrors.fullName && <p className="text-sm text-destructive">{fieldErrors.fullName}</p>}
                            </div>

                            <div className="flex flex-col gap-2">
                                <Label>Kullanıcı Adı</Label>
                                <Input
                                    value={form.userName}
                                    onChange={e => setForm({ ...form, userName: e.target.value })}
                                    placeholder="kullanici_adi"
                                />
                                {fieldErrors.userName && <p className="text-sm text-destructive">{fieldErrors.userName}</p>}
                            </div>

                            <div className="flex flex-col gap-2">
                                <Label>Email</Label>
                                <Input
                                    type="email"
                                    value={form.email}
                                    onChange={e => setForm({ ...form, email: e.target.value })}
                                    placeholder="ornek@mail.com"
                                />
                                {fieldErrors.email && <p className="text-sm text-destructive">{fieldErrors.email}</p>}
                            </div>

                            <div className="flex flex-col gap-2">
                                <Label>Telefon</Label>
                                <Input
                                    value={form.phoneNumber}
                                    onChange={e => setForm({ ...form, phoneNumber: e.target.value })}
                                    placeholder="0532 000 00 00"
                                />
                                {fieldErrors.phoneNumber && <p className="text-sm text-destructive">{fieldErrors.phoneNumber}</p>}
                            </div>

                            <div className="flex flex-col gap-2">
                                <Label>Kullanıcı Kodu</Label>
                                <Input
                                    value={form.userCode}
                                    onChange={e => setForm({ ...form, userCode: e.target.value })}
                                    placeholder="USR001"
                                />
                                {fieldErrors.userCode && <p className="text-sm text-destructive">{fieldErrors.userCode}</p>}
                            </div>

                            <div className="flex flex-col gap-2">
                                <Label>Şifre</Label>
                                <Input
                                    type="text"
                                    value={form.passwordHash}
                                    onChange={e => setForm({ ...form, passwordHash: e.target.value })}
                                    placeholder={editUser ? "Değiştirmek için yeni şifre girin" : "Şifre"}
                                />
                                {fieldErrors.passwordHash && <p className="text-sm text-destructive">{fieldErrors.passwordHash}</p>}
                            </div>
                            
                            <div className="flex flex-col gap-2">
                                <Label>Rol</Label>
                                <Select 
                                    value={form.role.toString()} 
                                    onValueChange={value => setForm({ ...form, role: Number(value) })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Rol seçin" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="1">Admin</SelectItem>
                                        <SelectItem value="2">Garson</SelectItem>
                                        <SelectItem value="3">Kasiyer</SelectItem>
                                        <SelectItem value="4">Mutfak</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <DialogFooter className="mt-4">
                                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                                    İptal
                                </Button>
                                <Button type="submit">
                                    Kaydet
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                <AlertDialog open={deleteTargetId !== null} onOpenChange={(open) => !open && setDeleteTargetId(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Personeli sil</AlertDialogTitle>
                            <AlertDialogDescription>Bu personeli silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.</AlertDialogDescription>
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
          </>
    );
}
