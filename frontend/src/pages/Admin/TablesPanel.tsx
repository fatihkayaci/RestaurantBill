import { useEffect, useState } from "react";
import type { Table } from "../../features/tables/types";
import { tableService } from "../../api/tableService";
import TableCard from "../../features/Admin/TablePanel/components/TableCard";

export default function TablesPanel() {
    const [tables, setTables] = useState<Table[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newTableName, setNewTableName] = useState('');
    const [editTable, setEditTable] = useState<Table | null>(null);

    const openCreateModal = () => {
        setEditTable(null);
        setNewTableName('');
        setIsModalOpen(true);
    };
    const openEditModal = (table: Table) => {
        setEditTable(table);
        setNewTableName(table.name);
        setIsModalOpen(true);
    };


    useEffect(() => {
        tableService.getTables()
            .then((data) => {
                setTables(data);
            })
            .catch((error) => {
                console.error("Masalar çekilirken hata oluştu:", error);
            });
    }, []);
    
    const handleDelete = async (id: number) => {
        await tableService.deleteTable(id);
        setTables(tables.filter(t => t.id !== id));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTableName) return;
        
        if (editTable) {
            await tableService.updateTable(editTable.id, newTableName);
        } else {
            await tableService.createTable(newTableName);
        }
        
        const updated = await tableService.getTables();
        setTables(updated);
        setNewTableName('');
        setEditTable(null);
        setIsModalOpen(false);
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">Masalar</h2>
                <button onClick={openCreateModal} className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-lg">
                    + Yeni Masa
                </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {tables.map(table => (
                    <TableCard key={table.id} table={table} onDelete={handleDelete} onUpdate={openEditModal}/>
                ))}
            </div>
            {/* popup */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
                    <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 w-96">
                        <h2>{editTable ? 'Masayı Düzenle' : 'Yeni Masa Ekle'}</h2>
                        
                        <form onSubmit={handleSubmit}>
                            <div className="mb-4">
                                <label className="block text-gray-400 text-sm mb-2">Masa Adı</label>
                                
                                <input
                                    value={newTableName}
                                    onChange={(e) => setNewTableName(e.target.value)} 
                                    type="text"
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white text-sm"
                                    placeholder="Masa 1"
                                />
                            </div>
                            <div className="flex gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg text-sm"
                                >
                                    İptal
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg text-sm"
                                >
                                    Kaydet
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}