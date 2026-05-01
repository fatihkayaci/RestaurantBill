import { useEffect, useState } from "react";
import { userService } from "../../api/userService";
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Pencil, Trash2, MoreHorizontal} from 'lucide-react'
import { DropdownMenu, DropdownMenuContent,DropdownMenuItem, DropdownMenuTrigger} from '@/components/ui/dropdown-menu'
import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select"
import type { CreateUser, User } from "@/features/auths/userTypes";

export default function Staff() {
    const roleMap: Record<number, string> = {
        1: "Admin",
        2: "Kasiyer",
        3: "Garson",
        4: "Mutfak"
    };
    const [users, setUsers] = useState<User[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editUser, setEditUser] = useState<User | null>(null);
    const [form, setForm] = useState<CreateUser>({
        fullName: '', userName: '', email: '', phoneNumber: '',
        passwordHash: '', userCode: '', role: 2
    });

    useEffect(() => {
        userService.getUsersByRestaurantId().then(setUsers).catch(console.error);
    }, []);

    const openCreateModal = () => {
        setEditUser(null);
        setForm({ fullName: '', userName: '', email: '', phoneNumber: '', passwordHash: '', userCode: '', role: 2 });
        setIsModalOpen(true);
    };

    const openEditModal = (user: User) => {
        setEditUser(user);
        setForm({ fullName: user.fullName, userName: user.userName, email: user.email, phoneNumber: user.phoneNumber, passwordHash: '', userCode: user.userCode, role: user.role });
        setIsModalOpen(true);
    };

    const handleDelete = async (id: number) => {
        await userService.deleteUser(id);
        setUsers(users.filter(u => u.id !== id));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (editUser) {
            await userService.updateUser({ id: editUser.id, ...form, password: form.passwordHash });
        } else {
            await userService.createUser(form);
        }
        const updated = await userService.getUsersByRestaurantId();
        setUsers(updated);
        setIsModalOpen(false);
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
                                            onClick={() => handleDelete(user.id)}
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
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>
                                {editUser ? 'Kullanıcıyı Düzenle' : 'Yeni Kullanıcı Ekle'}
                            </DialogTitle>
                            <DialogDescription aria-describedby={undefined} />
                        </DialogHeader>
                        
                        <form onSubmit={handleSubmit} className="flex flex-col gap-4 py-4">
                            <div className="flex flex-col gap-2">
                                <Label>Ad Soyad</Label>
                                <Input 
                                    value={form.fullName} 
                                    onChange={e => setForm({ ...form, fullName: e.target.value })}
                                    placeholder="Ad Soyad" 
                                />
                            </div>
                            
                            <div className="flex flex-col gap-2">
                                <Label>Kullanıcı Adı</Label>
                                <Input 
                                    value={form.userName} 
                                    onChange={e => setForm({ ...form, userName: e.target.value })}
                                    placeholder="kullanici_adi" 
                                />
                            </div>
                            
                            <div className="flex flex-col gap-2">
                                <Label>Telefon</Label>
                                <Input 
                                    value={form.phoneNumber} 
                                    onChange={e => setForm({ ...form, phoneNumber: e.target.value })}
                                    placeholder="0532 000 00 00" 
                                />
                            </div>
                            
                            <div className="flex flex-col gap-2">
                                <Label>Kullanıcı Kodu</Label>
                                <Input 
                                    value={form.userCode} 
                                    onChange={e => setForm({ ...form, userCode: e.target.value })}
                                    placeholder="USR001" 
                                />
                            </div>
                            
                            <div className="flex flex-col gap-2">
                                <Label>Şifre</Label>
                                <Input
                                    type="text"
                                    value={form.passwordHash}
                                    onChange={e => setForm({ ...form, passwordHash: e.target.value })}
                                    placeholder={editUser ? "Değiştirmek için yeni şifre girin" : "Şifre"}
                                />
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
            </div>
          </>
    );
}
