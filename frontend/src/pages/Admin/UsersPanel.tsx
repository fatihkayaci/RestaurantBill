export default function UsersPanel() {
    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">Kullanıcılar</h2>
                <button className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-lg">
                    + Yeni Kullanıcı
                </button>
            </div>

            <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-gray-700 text-gray-400">
                            <th className="text-left px-4 py-3">Ad Soyad</th>
                            <th className="text-left px-4 py-3">Kullanıcı Adı</th>
                            <th className="text-left px-4 py-3">Rol</th>
                            <th className="text-left px-4 py-3">İşlem</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr className="border-b border-gray-700 text-gray-300">
                            <td className="px-4 py-3">Örnek Kullanıcı</td>
                            <td className="px-4 py-3">kullanici_adi</td>
                            <td className="px-4 py-3">
                                <span className="bg-indigo-600 text-white text-xs px-2 py-1 rounded-full">Garson</span>
                            </td>
                            <td className="px-4 py-3">
                                <button className="text-red-400 hover:text-red-300 text-xs">Sil</button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
}
