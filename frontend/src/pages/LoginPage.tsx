import { useState } from "react";
import { authService } from "../api/authService";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from 'jwt-decode';

export default function LoginPage() {

    const [userName, setUserName] = useState<string>();
    const [password, setPassword] = useState<string>();
    const navigate = useNavigate();

    const handleSubmitUser = async (e: any) => {
        e.preventDefault();
        try {
            if (!userName || !password) return;
            const result = await authService.login(userName, password);
            localStorage.setItem("token",result);
            const decoded: any = jwtDecode(result);
            const role = decoded['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'];

            if (role === 'Admin') navigate('/admin');
            else if(role === 'Kitchen') navigate('/kitchen')
            else navigate('/');
            
        } catch (error: any) {
            console.log(error.response?.data || "Bilinmeyen bir hata oluştu");
        }
    }
    
    return (
        <div className="min-h-screen bg-gray-950 flex items-center justify-center">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-10 w-96">
                
                <h1 className="text-white text-2xl font-bold mb-1">RestaurantBill</h1>
                <p className="text-gray-500 text-sm mb-8">Sisteme giriş yapın</p>

                <form>
                    <div className="mb-4">
                        <label className="block text-gray-400 text-sm mb-2">Kullanıcı Adı</label>
                        <input
                        value={userName}
                        onChange={(e) => setUserName(e.target.value)}
                        type="text"
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white text-sm"
                        placeholder="kullanici_adi"
                        />
                    </div>

                    <div className="mb-6">
                        <label className="block text-gray-400 text-sm mb-2">Şifre</label>
                        <input
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        type="password"
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white text-sm"
                        placeholder="••••••••"
                        />
                    </div>

                    <button
                        onClick={handleSubmitUser}
                        type="submit"
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-lg text-sm font-medium"
                    >
                        Giriş Yap
                    </button>
                    <p className="text-center text-gray-500 text-sm mt-4">
                        Hesabın yok mu?{' '}
                        <span onClick={() => navigate('/register')} className="text-indigo-400 cursor-pointer hover:underline">
                        Kayıt Ol
                        </span>
                    </p>
                </form>

            </div>
        </div>
    );
}