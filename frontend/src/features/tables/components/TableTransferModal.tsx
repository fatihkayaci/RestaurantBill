import { useState } from 'react';
import { X, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { orderService } from '@/features/orders/api/orderService';
import type { Table } from '@/features/tables/types';

interface Props {
    sourceTable: Table;
    tables: Table[];
    onClose: () => void;
    onDone: () => void;
}

const STATUS_BADGE: Record<number, { label: string; cls: string }> = {
    1: { label: 'BOŞ', cls: 'bg-rb-green-bg text-rb-green' },
    2: { label: 'DOLU', cls: 'bg-rb-orange-bg text-rb-orange' },
    3: { label: 'REZERVE', cls: 'bg-rb-amber-bg text-rb-amber' },
    4: { label: 'HİZMET DIŞI', cls: 'bg-muted text-muted-foreground' },
};

const TRANSFER_MODE = { Move: 1, Merge: 2, Swap: 3 } as const;

export default function TableTransferModal({ sourceTable, tables, onClose, onDone }: Props) {
    const [confirmTarget, setConfirmTarget] = useState<Table | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const destinations = tables.filter(t => t.id !== sourceTable.id);
    const groupedByRegion = Object.values(
        destinations.reduce((acc, table) => {
            const key = table.regionId;
            if (!acc[key]) acc[key] = { regionName: table.regionName, tables: [] as Table[] };
            acc[key].tables.push(table);
            return acc;
        }, {} as Record<string, { regionName: string; tables: Table[] }>)
    );

    const runTransfer = async (destinationTableId: string, mode: 1 | 2 | 3) => {
        try {
            setSubmitting(true);
            await orderService.transferOrder(sourceTable.id, destinationTableId, mode);
            toast.success('Masa işlemi tamamlandı.');
            onDone();
        } catch (err: unknown) {
            const message = (err as { response?: { data?: { error?: string; message?: string } } })
                .response?.data?.error
                ?? (err as { response?: { data?: { error?: string; message?: string } } }).response?.data?.message
                ?? 'İşlem tamamlanamadı.';
            toast.error(message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleRowClick = (table: Table) => {
        if (submitting) return;
        if (table.status === 1) {
            void runTransfer(table.id, TRANSFER_MODE.Move);
        } else if (table.status === 2) {
            setConfirmTarget(table);
        }
    };

    return (
        <div className="fixed inset-0 z-80 flex items-center justify-center bg-black/60 backdrop-blur-[3px] p-4">
            <div className="w-full max-w-sm bg-card border border-border rounded-2xl shadow-2xl p-6">
                {confirmTarget ? (
                    <>
                        <div className="flex items-start justify-between mb-1">
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setConfirmTarget(null)}
                                    className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                </button>
                                <h2 className="font-serif text-lg font-bold text-foreground">
                                    {confirmTarget.name} dolu
                                </h2>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <p className="text-sm text-muted-foreground mt-3">
                            {sourceTable.name} masasındaki sipariş için ne yapmak istersiniz?
                        </p>
                        <div className="mt-5 flex flex-col gap-2">
                            <button
                                onClick={() => runTransfer(confirmTarget.id, TRANSFER_MODE.Merge)}
                                disabled={submitting}
                                className="w-full rounded-xl py-3 text-sm font-semibold text-white bg-rb-accent hover:opacity-90 transition-opacity disabled:opacity-50"
                            >
                                {submitting ? 'İşleniyor...' : 'Siparişlerimi Taşı'}
                            </button>
                            <button
                                onClick={() => runTransfer(confirmTarget.id, TRANSFER_MODE.Swap)}
                                disabled={submitting}
                                className="w-full rounded-xl py-3 text-sm font-semibold text-foreground border border-border hover:bg-muted transition-colors disabled:opacity-50"
                            >
                                {submitting ? 'İşleniyor...' : 'Masaları Değiştir'}
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="flex items-start justify-between mb-1">
                            <div>
                                <h2 className="font-serif text-lg font-bold text-foreground">Masayı Taşı</h2>
                                <p className="text-sm text-muted-foreground mt-0.5">{sourceTable.name} — hedef masa seçin</p>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="mt-4 max-h-96 overflow-y-auto space-y-4">
                            {groupedByRegion.map(group => (
                                <div key={group.regionName}>
                                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                                        {group.regionName}
                                    </p>
                                    <div className="grid grid-cols-2 gap-2">
                                        {group.tables.map(table => {
                                            const badge = STATUS_BADGE[table.status];
                                            const disabled = table.status === 3 || table.status === 4 || submitting;
                                            return (
                                                <button
                                                    key={table.id}
                                                    onClick={() => handleRowClick(table)}
                                                    disabled={disabled}
                                                    className={`flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2.5 text-left transition-colors ${
                                                        disabled ? 'opacity-40 cursor-not-allowed' : 'hover:bg-muted/50 cursor-pointer'
                                                    }`}
                                                >
                                                    <span className="text-sm font-medium text-foreground truncate">{table.name}</span>
                                                    {badge && (
                                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${badge.cls}`}>
                                                            {badge.label}
                                                        </span>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                            {destinations.length === 0 && (
                                <p className="text-sm text-muted-foreground text-center py-6">Başka masa bulunmuyor.</p>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
