import { useEffect, useState } from "react";
import type { Table } from "../../features/tables/types";
import { tableService } from "../../api/tableService";
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'

export default function Tables() {
    const [tables, setTables] = useState<Table[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newTableName, setNewTableName] = useState('');
    const [editTable, setEditTable] = useState<Table | null>(null);
    const [newTableStatus, setNewTableStatus] = useState<number>(1);
    const tableStatusMap: Record<number, string> = {
        1: "available",
        2: "occupied",
        3: "reserved",
        4: "outofservice "
    };
    const openCreateModal = () => {
        setEditTable(null);
        setNewTableName('');
        setIsModalOpen(true);
    };
    const openEditModal = (table: Table) => {
        setEditTable(table);
        setNewTableName(table.name);
        setNewTableStatus(table.status);
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
    
    const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);

    const handleDelete = async () => {
        if (deleteTargetId === null) return;
        await tableService.deleteTable(deleteTargetId);
        setTables(tables.filter(t => t.id !== deleteTargetId));
        setDeleteTargetId(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTableName) return;
        
        if (editTable) {
            await tableService.updateTable(editTable.id, newTableName, newTableStatus);
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
            <Button className="gap-2" onClick={openCreateModal}>
              <Plus className="h-4 w-4" />
              Add Table
            </Button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {tables.map(table => (
              <Card 
                key={table.id}
                className={
                  tableStatusMap[table.status] === "available"? 'border-green-300 bg-green-50' :
                  tableStatusMap[table.status] === "occupied" ? 'border-red-300 bg-red-50' :
                  tableStatusMap[table.status] === "reserved" ? 'border-amber-300 bg-amber-50' :
                  tableStatusMap[table.status] === "outofservice" ? 'border-black-300 bg-black-50' : ''
                }
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-2xl font-bold">#{table.name}</span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem 
                            className="gap-2 cursor-pointer" 
                            onClick={() => openEditModal(table)}
                        >
                            <Pencil className="h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        
                        <DropdownMenuItem 
                            className="gap-2 text-destructive cursor-pointer" 
                            onClick={() => setDeleteTargetId(table.id)}
                        >
                            <Trash2 className="h-4 w-4" /> Remove
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="space-y-1">
                    <Badge 
                      variant={
                        table.status === 1 ? 'outline' :
                        table.status === 2 ? 'default' : 'secondary'
                      }
                      className={`capitalize ${
                        table.status === 1 ? 'bg-green-50 text-green-700 border-green-200' :
                        table.status === 2 ? 'bg-red-50 text-red-700 border-red-200' :
                        table.status === 3 ? 'bg-amber-50 text-amber-700 border-amber-200' : 
                        table.status === 4 ? 'bg-black-50 text-black-700 border-black-200' : ''
                      }`}
                    >
                      {tableStatusMap[table.status]}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        {editTable ? 'Masayı Düzenle' : 'Yeni Masa Ekle'}
                    </DialogTitle>
                        <DialogDescription aria-describedby={undefined} />
                </DialogHeader>
                
                <form onSubmit={handleSubmit} className="flex flex-col gap-4 py-4">
                  <div className="flex flex-col gap-2">
                      <Label>Masa Adı</Label>
                      <Input
                          value={newTableName}
                          onChange={(e) => setNewTableName(e.target.value)} 
                          placeholder="Masa 1"
                      />
                  </div>
                  
                  {editTable && (
                    <div className="flex flex-col gap-2">
                        <Label>Masa Durumu</Label>
                        <Select
                            value={newTableStatus.toString()}
                            onValueChange={(value) => setNewTableStatus(Number(value))}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Durum seçin" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="1">Müsait</SelectItem>
                                <SelectItem value="2">Dolu</SelectItem>
                                <SelectItem value="3">Rezerve</SelectItem>
                                <SelectItem value="4">Servis Dışı</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                  )}
                  
                  {/* ... DialogFooter kısmı aynı ... */}
                  <DialogFooter className="mt-4">
                      <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => setIsModalOpen(false)}
                      >
                          İptal
                      </Button>
                      <Button type="submit">
                          Kaydet
                      </Button>
                  </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <AlertDialog open={deleteTargetId !== null} onOpenChange={(open) => !open && setDeleteTargetId(null)}>
              <AlertDialogContent>
                  <AlertDialogHeader>
                      <AlertDialogTitle>Masayı sil</AlertDialogTitle>
                      <AlertDialogDescription>Bu masayı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                      <AlertDialogCancel>İptal</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                          Sil
                      </AlertDialogAction>
                  </AlertDialogFooter>
              </AlertDialogContent>
          </AlertDialog>
        </>
    );
}