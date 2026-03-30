import { useEffect, useState } from "react";
import { userService } from "../../api/userService";
import type { User, CreateUser } from "../../features/auths/userTypes";
import UserCard from "../../features/Admin/UserPanel/components/UserCard";

export default function UsersPanel() {
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
            await userService.updateUser({ id: editUser.id, ...form });
        } else {
            await userService.createUser(form);
        }
        const updated = await userService.getUsersByRestaurantId();
        setUsers(updated);
        setIsModalOpen(false);
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">Kullanıcılar</h2>
                <button onClick={openCreateModal} className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-lg">
                    + Yeni Kullanıcı
                </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {users.map(user => (
                    <UserCard key={user.id} user={user} onDelete={handleDelete} onUpdate={openEditModal} />
                ))}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
                    <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 w-96">
                        <h2 className="text-white text-lg font-bold mb-6">
                            {editUser ? 'Kullanıcıyı Düzenle' : 'Yeni Kullanıcı Ekle'}
                        </h2>
                        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                            <div>
                                <label className="block text-gray-400 text-sm mb-2">Ad Soyad</label>
                                <input value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })}
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white text-sm" placeholder="Ad Soyad" />
                            </div>
                            <div>
                                <label className="block text-gray-400 text-sm mb-2">Kullanıcı Adı</label>
                                <input value={form.userName} onChange={e => setForm({ ...form, userName: e.target.value })}
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white text-sm" placeholder="kullanici_adi" />
                            </div>
                            <div>
                                <label className="block text-gray-400 text-sm mb-2">Telefon</label>
                                <input value={form.phoneNumber} onChange={e => setForm({ ...form, phoneNumber: e.target.value })}
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white text-sm" placeholder="0532 000 00 00" />
                            </div>
                            <div>
                                <label className="block text-gray-400 text-sm mb-2">Kullanıcı Kodu</label>
                                <input value={form.userCode} onChange={e => setForm({ ...form, userCode: e.target.value })}
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white text-sm" placeholder="USR001" />
                            </div>
                            <div>
                                <label className="block text-gray-400 text-sm mb-2">Şifre</label>
                                <input type="password" value={form.passwordHash} onChange={e => setForm({ ...form, passwordHash: e.target.value })}
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white text-sm" placeholder="••••••••" />
                            </div>
                            <div>
                                <label className="block text-gray-400 text-sm mb-2">Rol</label>
                                <select value={form.role} onChange={e => setForm({ ...form, role: Number(e.target.value) })}
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white text-sm">
                                    <option value={1}>Admin</option>
                                    <option value={2}>Garson</option>
                                    <option value={3}>Kasiyer</option>
                                    <option value={4}>Mutfak</option>
                                </select>
                            </div>
                            <div className="flex gap-3 mt-2">
                                <button type="button" onClick={() => setIsModalOpen(false)}
                                    className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg text-sm">İptal</button>
                                <button type="submit"
                                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg text-sm">Kaydet</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
