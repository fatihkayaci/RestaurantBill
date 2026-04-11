import { useState } from "react";
import { useNavigate } from "react-router-dom";
import TablesPanel from "../pages/Admin/TablesPanel";
import ProductsPanel from "../pages/Admin/ProductsPanel";
import CategoriesPanel from "../pages/Admin/CategoriesPanel";
import UsersPanel from "../pages/Admin/UsersPanel";
import { authService } from "../api/authService";


export default function AdminDashboard() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('overview');

    const handleLogout = () => {
        authService.logout();
        navigate('/login');
    };
    {activeTab === 'overview' && <p>Genel Bakış</p>}
    {activeTab === 'tables' && <TablesPanel />}
    {activeTab === 'products' && <ProductsPanel />}
    {activeTab === 'categories' && <CategoriesPanel />}
    {activeTab === 'users' && <UsersPanel />}
    return (
        <div className="min-h-screen bg-gray-950 text-white flex">
            
            <div className="w-64 min-h-screen bg-gray-900 border-r border-gray-800 p-6 flex flex-col">
                <h2 className="text-xl font-bold mb-2">Admin Panel</h2>
                <p className="text-gray-500 text-xs mb-8">deneme restaurant</p>
                <nav className="flex flex-col gap-1">
                    <button onClick={() => setActiveTab("overview")} className="text-left px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm">Genel Bakış</button>
                    <button onClick={() => setActiveTab("tables")} className="text-left px-4 py-2 rounded-lg hover:bg-gray-800 text-gray-400 text-sm">Masalar</button>
                    <button onClick={() => setActiveTab("products")} className="text-left px-4 py-2 rounded-lg hover:bg-gray-800 text-gray-400 text-sm">Ürünler</button>
                    <button onClick={() => setActiveTab("categories")} className="text-left px-4 py-2 rounded-lg hover:bg-gray-800 text-gray-400 text-sm">Kategoriler</button>
                    <button onClick={() => setActiveTab("users")} className="text-left px-4 py-2 rounded-lg hover:bg-gray-800 text-gray-400 text-sm">Kullanıcılar</button>
                </nav>
                <div className="mt-auto pt-6 border-t border-gray-800">
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-4 py-2 rounded-lg text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/30 transition-colors text-sm font-semibold"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                        Çıkış Yap
                    </button>
                </div>
            </div>

            <div className="flex-1 p-8">
                {activeTab === 'overview' && (
                    <>
                        <h1 className="text-2xl font-bold mb-2">Hoş geldiniz</h1>
                        <p className="text-gray-500 text-sm">Sol menüden yönetmek istediğiniz bölümü seçin.</p>
                    </>
                )}
                {activeTab === 'tables' && <TablesPanel />}
                {activeTab === 'products' && <ProductsPanel />}
                {activeTab === 'categories' && <CategoriesPanel />}
                {activeTab === 'users' && <UsersPanel />}
            </div>

        </div>
    );
}