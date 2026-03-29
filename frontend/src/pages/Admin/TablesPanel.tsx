import { useEffect, useState } from "react";
import type { Table } from "../../features/tables/types";
import { tableService } from "../../api/tableService";
import TableCard from "../../features/Admin/TablePanel/components/TableCard";

export default function TablesPanel() {
    const [tables, setTables] = useState<Table[]>([]);
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

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">Masalar</h2>
                <button className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-lg">
                    + Yeni Masa
                </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {tables.map(table => (
                    <TableCard key={table.id} table={table} onDelete={handleDelete}/>
                ))}
            </div>
        </div>
    );
}