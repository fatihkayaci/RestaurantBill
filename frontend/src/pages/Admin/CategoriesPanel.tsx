export default function CategoriesPanel() {
    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">Kategoriler</h2>
                <button className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-lg">
                    + Yeni Kategori
                </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 flex items-center justify-between">
                    <p className="text-white font-medium">Örnek Kategori</p>
                    <button className="text-red-400 hover:text-red-300 text-xs">Sil</button>
                </div>
            </div>
        </div>
    );
}
