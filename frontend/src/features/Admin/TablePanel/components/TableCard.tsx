import type { Table } from '../types';

interface TableCardProps {
    table: Table;
    onDelete: (id: number) => void;
}
export default function TableCard({ table, onDelete }: TableCardProps) {
    return (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 flex items-center justify-between">
            <div>
                <p className="text-white font-medium">{table.name}</p>
                <p className="text-gray-400 text-xs mt-1">{table.status === 1 ? 'Boş' : table.status === 2 ? 'Dolu' : 'Rezerve'}</p>
            </div>
            <div className="flex gap-2">
                <button onClick={() => onDelete(table.id)} className="text-red-400 hover:text-red-300 text-xs">Sil</button>
                <button className="text-indigo-400 hover:text-indigo-300 text-xs">Düzenle</button>
            </div>
        </div>
    );
}
