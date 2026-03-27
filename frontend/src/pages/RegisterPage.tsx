import { useState } from "react";
import { authService } from "../api/authService";
import { useNavigate } from "react-router-dom";
import type { Register } from "../features/auths/types";

export default function RegisterPage() {
    
    const navigate = useNavigate();
    const [form, setForm] = useState<Register>({
        fullName: '',
        userName: '',
        email: '',
        userCode: '',
        password: ''
    });

    const handleSubmit = async (e: any) => {
            e.preventDefault();
            try {
                await authService.register(form);
                navigate("/login");
            } catch (error: any) {
                console.log(error.response?.data || "Bilinmeyen bir hata oluştu");
            }
        }
        
    return(
        <div className="min-h-screen bg-gray-950 flex items-center justify-center">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-10 w-96">

                <h1 className="text-white text-2xl font-bold mb-1">Kayıt Ol</h1>
                <p className="text-gray-500 text-sm mb-8">Yeni hesap oluşturun</p>

                <form onSubmit={handleSubmit}> 
                    <div className="mb-4">
                        <label className="block text-gray-400 text-sm mb-2">Ad Soyad</label>
                        <input
                        type="text"
                        value={form.fullName}
                        onChange={(e) => setForm({...form, fullName: e.target.value})}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white text-sm"
                        placeholder="Ad Soyad"
                        />
                    </div>

                    <div className="mb-4">
                        <label className="block text-gray-400 text-sm mb-2">Kullanıcı Adı</label>
                        <input
                        type="text"
                        value={form.userName}
                        onChange={(e) => setForm({...form, userName: e.target.value})}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white text-sm"
                        placeholder="kullanici_adi"
                        />
                    </div>

                    <div className="mb-4">
                        <label className="block text-gray-400 text-sm mb-2">Email</label>
                        <input
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm({...form, email: e.target.value})}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white text-sm"
                        placeholder="ornek@mail.com"
                        />
                    </div>

                    <div className="mb-4">
                        <label className="block text-gray-400 text-sm mb-2">Kullanıcı Kodu</label>
                        <input
                        type="text"
                        value={form.userCode}
                        onChange={(e) => setForm({...form, userCode: e.target.value})}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white text-sm"
                        placeholder="USR001"
                        />
                    </div>

                    <div className="mb-6">
                        <label className="block text-gray-400 text-sm mb-2">Şifre</label>
                        <input
                        type="password"
                        value={form.password}
                        onChange={(e) => setForm({...form, password: e.target.value})}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white text-sm"
                        placeholder="••••••••"
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-lg text-sm font-medium"
                    >
                        Kayıt Ol
                    </button>

                    <p className="text-center text-gray-500 text-sm mt-4">
                        Hesabın var mı?{' '}
                        <span onClick={() => navigate('/login')} className="text-indigo-400 cursor-pointer hover:underline">
                        Giriş Yap
                        </span>
                    </p>
                </form>

            </div>
            </div>
    )
}
