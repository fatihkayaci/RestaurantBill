import { useState } from 'react';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { Modal, ModalTitle } from '@/components/ui/modal';
import type { Region } from '@/features/regions/types';
import { inputClass, labelClass } from '@/lib/formStyles';
import { cn } from '@/lib/utils';
import { tableService } from '../api/tableService';
import { buildTableNames, nextTableNumber } from '../tableNames';
import type { Table } from '../types';

interface Props {
    tables: Table[];
    regions: Region[];
    /** Sayfada seçili bölge; "Tümü" seçiliyse ilk bölge gelir. */
    defaultRegionId: string | null;
    onClose: () => void;
    /** Masalar eklendikten sonra listeyi yenilemek için. */
    onCreated: () => Promise<void> | void;
}

// Backend sınırlarıyla aynı (BulkCreateTablesCommand.MaxCount, validator).
const MAX_COUNT = 100;
const MAX_PREFIX_LENGTH = 40;
const MAX_START_NUMBER = 9999;
const DEFAULT_PREFIX = 'Masa';

// Masalar sayfasından açılır: bir bölgeye "Masa 1" … "Masa 20" gibi sıralı masaları tek seferde ekler.
export default function BulkTableCreateModal({ tables, regions, defaultRegionId, onClose, onCreated }: Props) {
    const namesInRegion = (id: string) => tables.filter(t => t.regionId === id).map(t => t.name);

    const [regionId, setRegionId] = useState(defaultRegionId ?? regions[0]?.id ?? '');
    const [prefix, setPrefix] = useState(DEFAULT_PREFIX);
    const [startNumber, setStartNumber] = useState(() => String(nextTableNumber(namesInRegion(regionId), DEFAULT_PREFIX)));
    const [count, setCount] = useState('10');
    const [saving, setSaving] = useState(false);

    // Bölge ya da ön ek değişince başlangıç, o bölgedeki son numaranın bir fazlasına çekilir.
    const changeRegion = (id: string) => {
        setRegionId(id);
        setStartNumber(String(nextTableNumber(namesInRegion(id), prefix)));
    };
    const changePrefix = (value: string) => {
        setPrefix(value);
        setStartNumber(String(nextTableNumber(namesInRegion(regionId), value)));
    };

    const start = Number(startNumber);
    const total = Number(count);
    const error =
        !regionId ? 'Bölge seçilmelidir.'
        : prefix.trim().length > MAX_PREFIX_LENGTH ? `Ön ek en fazla ${MAX_PREFIX_LENGTH} karakter olabilir.`
        : !Number.isInteger(start) || start < 1 || start > MAX_START_NUMBER ? `Başlangıç numarası 1 ile ${MAX_START_NUMBER} arasında olmalıdır.`
        : !Number.isInteger(total) || total < 1 || total > MAX_COUNT ? `Tek seferde 1 ile ${MAX_COUNT} arasında masa eklenebilir.`
        : null;

    // Ad eşleşmesi backend'deki gibi birebirdir (aynı bölgede aynı ad).
    const existing = new Set(namesInRegion(regionId));
    const names = error ? [] : buildTableNames(prefix, start, total);
    const skipped = names.filter(name => existing.has(name));
    const toCreate = names.length - skipped.length;

    const handleSubmit = async () => {
        if (error || toCreate === 0) return;
        setSaving(true);
        try {
            const result = await tableService.bulkCreateTables(regionId, prefix.trim(), start, total);
            await onCreated();
            toast.success(`${result.createdNames.length} masa eklendi.`, {
                description: result.skippedNames.length > 0
                    ? `Zaten olduğu için atlandı: ${result.skippedNames.join(', ')}`
                    : undefined,
            });
            onClose();
        } catch (err: unknown) {
            if (axios.isAxiosError(err)) {
                toast.error(err.response?.data?.error ?? err.response?.data?.message ?? 'Masalar eklenemedi.');
            }
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal onClose={onClose} closeOnOverlay={false} overlayClassName="bg-black/55 p-4">
            <div className="flex max-h-[calc(100dvh-2rem)] w-full max-w-lg flex-col overflow-hidden rounded-2xl sm:max-h-[90vh] border border-border bg-card shadow-2xl">
                <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border p-5">
                    <div>
                        <ModalTitle className="font-serif text-2xl font-bold leading-tight text-foreground">Toplu Masa Ekle</ModalTitle>
                        <p className="mt-0.5 text-sm text-rb-text-sub">Bir bölgeye sıralı numaralı masaları tek seferde ekleyin.</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Kapat"
                        className="-mr-1.5 -mt-1.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                        <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                </div>

                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
                    <div>
                        <label className={labelClass}>Bölge</label>
                        <select className={inputClass} value={regionId} onChange={e => changeRegion(e.target.value)}>
                            <option value="">Bölge seçin</option>
                            {regions.map(r => (
                                <option key={r.id} value={r.id}>{r.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <label className={labelClass}>Ön Ek</label>
                            <input
                                className={inputClass}
                                value={prefix}
                                onChange={e => changePrefix(e.target.value)}
                                placeholder={DEFAULT_PREFIX}
                            />
                        </div>
                        <div>
                            <label className={labelClass}>Başlangıç</label>
                            <input
                                type="number"
                                min={1}
                                max={MAX_START_NUMBER}
                                className={inputClass}
                                value={startNumber}
                                onChange={e => setStartNumber(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className={labelClass}>Adet</label>
                            <input
                                type="number"
                                min={1}
                                max={MAX_COUNT}
                                className={inputClass}
                                value={count}
                                onChange={e => setCount(e.target.value)}
                            />
                        </div>
                    </div>

                    {error ? (
                        <p className="text-xs text-destructive">{error}</p>
                    ) : (
                        <div className="space-y-2">
                            <p className="text-sm text-rb-text-sub">
                                {names[0]} – {names[names.length - 1]} · <span className="font-semibold text-foreground">{toCreate} masa eklenecek</span>
                                {skipped.length > 0 && ` · ${skipped.length} tanesi zaten var, atlanacak`}
                            </p>
                            <div className="flex max-h-48 flex-wrap gap-1.5 overflow-y-auto rounded-[10px] border border-border bg-background p-3">
                                {names.map(name => {
                                    const exists = existing.has(name);
                                    return (
                                        <span
                                            key={name}
                                            title={exists ? 'Bu bölgede zaten var, atlanacak' : undefined}
                                            className={cn(
                                                'rounded-md px-2 py-0.5 text-xs font-medium',
                                                exists ? 'bg-muted text-muted-foreground line-through' : 'bg-rb-gold-bg text-foreground'
                                            )}
                                        >
                                            {name}
                                        </span>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex shrink-0 items-center justify-end gap-3 border-t border-border p-5">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-sm rounded-lg border border-border text-foreground hover:bg-muted transition-colors"
                    >
                        İptal
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={saving || error !== null || toCreate === 0}
                        className="px-4 py-2 text-sm rounded-lg bg-rb-gold hover:opacity-90 text-rb-gold-foreground font-medium transition-colors disabled:opacity-60"
                    >
                        {saving ? 'Ekleniyor...' : `${toCreate} Masa Ekle`}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
