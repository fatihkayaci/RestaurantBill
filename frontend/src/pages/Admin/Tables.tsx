import { useEffect, useState } from "react";
import type { Table } from "../../features/tables/types";
import { tableService } from "../../api/tableService";
import { Button } from "@/components/ui/button";
import { Badge, MoreHorizontal, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export default function Tables() {
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
        <>
            <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Table Management</h2>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Table
            </Button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {tables.map(table => (
              <Card 
                key={table.id}
                className={
                  table.status === 1 ? 'border-green-300 bg-green-50' :
                  table.status === 2 ? 'border-amber-300 bg-amber-50' : ''
                }
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-2xl font-bold">#{table.number}</span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>Set Available</DropdownMenuItem>
                        <DropdownMenuItem>Set Occupied</DropdownMenuItem>
                        <DropdownMenuItem>Set Reserved</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">{table.seats} seats</p>
                    <Badge 
                      variant={
                        table.status === 'available' ? 'outline' :
                        table.status === 'occupied' ? 'default' : 'secondary'
                      }
                      className="capitalize"
                    >
                      {table.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
        // <div>
        //     <div className="flex items-center justify-between mb-6">
        //         <h2 className="text-xl font-bold text-white">Masalar</h2>
        //         <button onClick={openCreateModal} className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-lg">
        //             + Yeni Masa
        //         </button>
        //     </div>

        //     <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        //         {tables.map(table => (
        //             <TableCard key={table.id} table={table} onDelete={handleDelete} onUpdate={openEditModal}/>
        //         ))}
        //     </div>
        //     {/* popup */}
        //     {isModalOpen && (
        //         <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
        //             <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 w-96">
        //                 <h2>{editTable ? 'Masayı Düzenle' : 'Yeni Masa Ekle'}</h2>
                        
        //                 <form onSubmit={handleSubmit}>
        //                     <div className="mb-4">
        //                         <label className="block text-gray-400 text-sm mb-2">Masa Adı</label>
                                
        //                         <input
        //                             value={newTableName}
        //                             onChange={(e) => setNewTableName(e.target.value)} 
        //                             type="text"
        //                             className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white text-sm"
        //                             placeholder="Masa 1"
        //                         />
        //                     </div>
        //                     <div className="flex gap-3 mt-6">
        //                         <button
        //                             type="button"
        //                             onClick={() => setIsModalOpen(false)}
        //                             className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg text-sm"
        //                         >
        //                             İptal
        //                         </button>
        //                         <button
        //                             type="submit"
        //                             className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg text-sm"
        //                         >
        //                             Kaydet
        //                         </button>
        //                     </div>
        //                 </form>
        //             </div>
        //         </div>
        //     )}
        // </div>
    );
}