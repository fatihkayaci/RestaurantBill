export default function AdminPage() {
    return (
        <div className="min-h-screen bg-gray-950 text-white">
            
            {/* Sidebar */}
            <div className="flex">
                <div className="w-64 min-h-screen bg-gray-900 border-r border-gray-800 p-6">
                    <h2 className="text-xl font-bold mb-8">Admin Panel</h2>
                    <nav className="flex flex-col gap-2">
                        <button className="text-left px-4 py-2 rounded-lg hover:bg-gray-800 text-gray-300">
                            Ürünler
                        </button>
                        <button className="text-left px-4 py-2 rounded-lg hover:bg-gray-800 text-gray-300">
                            Kategoriler
                        </button>
                        <button className="text-left px-4 py-2 rounded-lg hover:bg-gray-800 text-gray-300">
                            Masalar
                        </button>
                    </nav>
                </div>

                {/* Content */}
                <div className="flex-1 p-8">
                    <h1 className="text-2xl font-bold">Hoş geldiniz</h1>
                </div>
            </div>

        </div>
    );
}
