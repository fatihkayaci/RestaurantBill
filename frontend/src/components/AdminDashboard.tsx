import type { Restaurant } from "../features/Restaurants/types";

interface Props {
    restaurants: Restaurant[];
}

export default function AdminDashboard({ restaurants }: Props) {
    return (
        <div className="min-h-screen bg-gray-950 text-white flex">
            
            {/* Sidebar */}
            <div className="w-64 min-h-screen bg-gray-900 border-r border-gray-800 p-6 flex flex-col">
                <h2 className="text-xl font-bold mb-2">Admin Panel</h2>
                <p className="text-gray-500 text-xs mb-8">{restaurants[0]?.name}</p>
                <nav className="flex flex-col gap-1">
                    <button className="text-left px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm">Genel Bakış</button>
                    <button className="text-left px-4 py-2 rounded-lg hover:bg-gray-800 text-gray-400 text-sm">Masalar</button>
                    <button className="text-left px-4 py-2 rounded-lg hover:bg-gray-800 text-gray-400 text-sm">Ürünler</button>
                    <button className="text-left px-4 py-2 rounded-lg hover:bg-gray-800 text-gray-400 text-sm">Kategoriler</button>
                </nav>
            </div>

            {/* Content */}
            <div className="flex-1 p-8">
                <h1 className="text-2xl font-bold mb-2">Hoş geldiniz</h1>
                <p className="text-gray-500 text-sm">Sol menüden yönetmek istediğiniz bölümü seçin.</p>
            </div>

        </div>
    );
}