import { useState, useEffect } from 'react';
import TableCard from '../features/tables/components/TableCard';
import { tableService } from '../api/tableService';
import type { Table } from '../features/tables/types';

export default function TablesPage() {
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
      tableService.getTables()
          .then((data) => {
              setTables(data);
              setLoading(false);
          })
          .catch((error) => {
              console.error("Masalar çekilirken hata oluştu:", error);
              setLoading(false);
          });
  }, []);

  if (loading) {
      return (
          <div className="p-6 bg-slate-100 min-h-screen flex items-center justify-center">
              <h2 className="text-2xl font-bold text-slate-600">Masalar Yükleniyor...</h2>
          </div>
      );
  }

  return (
      <div className="p-6 bg-slate-100 min-h-screen">
          <h1 className="text-3xl font-bold mb-6 text-slate-800">Masalar</h1>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {tables.map(table => (
                  <TableCard key={table.id} table={table} />
              ))}
          </div>
      </div>
  );
}