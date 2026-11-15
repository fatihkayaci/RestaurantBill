import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { onlineOrderingSettingsService } from '@/features/delivery/api/deliveryService';
import type { DeliveryZone, DeliveryZoneInput } from '@/features/delivery/types';
import { getApiErrorMessage } from '@/lib/apiError';
import { inputClass } from '@/lib/formStyles';
import { cn } from '@/lib/utils';

interface Row extends DeliveryZoneInput {
    id: string | null;
    /** Kaydedilmemiş değişiklik var. */
    dirty: boolean;
}

const EMPTY: DeliveryZoneInput = { name: '', fee: 0, minOrderAmount: 0, estimatedMinutes: 30, isActive: true };

function toRow(zone: DeliveryZone): Row {
    return {
        id: zone.id, name: zone.name, fee: zone.fee, minOrderAmount: zone.minOrderAmount,
        estimatedMinutes: zone.estimatedMinutes, isActive: zone.isActive, dirty: false,
    };
}

function validate(row: DeliveryZoneInput): string | null {
    if (!row.name.trim()) return 'Bölge adını yazın.';
    if (row.name.trim().length > 80) return 'Bölge adı en fazla 80 karakter olabilir.';
    if (!(row.fee >= 0)) return 'Teslimat ücreti 0 ya da daha büyük olmalı.';
    if (!(row.minOrderAmount >= 0)) return 'En az sipariş tutarı 0 ya da daha büyük olmalı.';
    if (!Number.isInteger(row.estimatedMinutes) || row.estimatedMinutes < 10 || row.estimatedMinutes > 180) return 'Tahmini süre 10–180 dakika arasında olmalı.';
    return null;
}

// "Teslimat bölgeleri": mahalle listesi. Müşteri önce mahallesini seçer; ücret, en az sipariş tutarı ve tahmini süre
// buradan gelir. Satırlar yerinde düzenlenir ve tek tek kaydedilir; sıra oklarla değişir (sitedeki sıra).
export default function DeliveryZonesTab() {
    const [rows, setRows] = useState<Row[] | null>(null);
    const [busyId, setBusyId] = useState<string | null>(null);
    const [draft, setDraft] = useState<DeliveryZoneInput>(EMPTY);
    const [adding, setAdding] = useState(false);

    const load = useCallback(() => {
        onlineOrderingSettingsService.getZones()
            .then(zones => setRows([...zones].sort((a, b) => a.sortOrder - b.sortOrder).map(toRow)))
            .catch(err => { toast.error(getApiErrorMessage(err, 'Bölgeler yüklenemedi.')); setRows([]); });
    }, []);

    useEffect(() => { load(); }, [load]);

    const edit = (id: string, patch: Partial<DeliveryZoneInput>) =>
        setRows(prev => prev?.map(r => r.id === id ? { ...r, ...patch, dirty: true } : r) ?? prev);

    const saveRow = async (row: Row) => {
        if (!row.id) return;
        const error = validate(row);
        if (error) { toast.error(error); return; }
        setBusyId(row.id);
        try {
            const saved = await onlineOrderingSettingsService.updateZone(row.id, {
                name: row.name.trim(), fee: row.fee, minOrderAmount: row.minOrderAmount,
                estimatedMinutes: row.estimatedMinutes, isActive: row.isActive,
            });
            setRows(prev => prev?.map(r => r.id === row.id ? toRow(saved) : r) ?? prev);
            toast.success(`${saved.name} kaydedildi.`);
        } catch (err) {
            toast.error(getApiErrorMessage(err, 'Bölge kaydedilemedi.'));
        } finally {
            setBusyId(null);
        }
    };

    const toggleActive = async (row: Row) => {
        if (!row.id) return;
        // Aktiflik anahtarı hemen kaydedilir; satırdaki diğer kaydedilmemiş değişiklikler de birlikte gider.
        await saveRow({ ...row, isActive: !row.isActive });
    };

    const remove = async (row: Row) => {
        if (!row.id || !window.confirm(`${row.name} bölgesi silinsin mi? Müşteri bu mahalleyi artık seçemez.`)) return;
        setBusyId(row.id);
        try {
            await onlineOrderingSettingsService.deleteZone(row.id);
            setRows(prev => prev?.filter(r => r.id !== row.id) ?? prev);
            toast.success(`${row.name} silindi.`);
        } catch (err) {
            toast.error(getApiErrorMessage(err, 'Bölge silinemedi.'));
        } finally {
            setBusyId(null);
        }
    };

    const move = async (index: number, delta: -1 | 1) => {
        if (!rows) return;
        const target = index + delta;
        if (target < 0 || target >= rows.length) return;
        const next = [...rows];
        [next[index], next[target]] = [next[target], next[index]];
        setRows(next);
        try {
            const saved = await onlineOrderingSettingsService.reorderZones(next.map(r => r.id!).filter(Boolean));
            // Sıra kaydedildi; düzenlenmekte olan satırların değişikliği korunur.
            const order = new Map(saved.map(z => [z.id, z.sortOrder]));
            setRows(prev => prev ? [...prev].sort((a, b) => (order.get(a.id!) ?? 0) - (order.get(b.id!) ?? 0)) : prev);
        } catch (err) {
            toast.error(getApiErrorMessage(err, 'Sıra kaydedilemedi.'));
            load();
        }
    };

    const add = async () => {
        const error = validate(draft);
        if (error) { toast.error(error); return; }
        setAdding(true);
        try {
            const created = await onlineOrderingSettingsService.createZone({ ...draft, name: draft.name.trim() });
            setRows(prev => [...(prev ?? []), toRow(created)]);
            setDraft(EMPTY);
            toast.success(`${created.name} eklendi.`);
        } catch (err) {
            toast.error(getApiErrorMessage(err, 'Bölge eklenemedi.'));
        } finally {
            setAdding(false);
        }
    };

    if (!rows) return <div className="h-48 max-w-4xl animate-pulse rounded-2xl bg-muted" aria-busy="true" />;

    const numberInput = (value: number, onChange: (v: number) => void, label: string, step = 1) => (
        <input
            type="number"
            inputMode="decimal"
            min={0}
            step={step}
            value={Number.isFinite(value) ? value : ''}
            onChange={e => onChange(e.target.value === '' ? NaN : Number(e.target.value))}
            aria-label={label}
            className={cn(inputClass, 'w-full min-w-20 py-1.5 tabular-nums')}
        />
    );

    return (
        <div className="max-w-5xl space-y-4">
            <p className="text-sm text-muted-foreground">
                Müşteri sipariş verirken önce mahallesini seçer. Listede olmayan mahalleye sipariş verilemez.
            </p>

            <div className="overflow-x-auto rounded-2xl border border-border bg-card">
                <table className="w-full min-w-[720px] text-sm">
                    <thead>
                        <tr className="border-b border-border text-left text-[11px] uppercase tracking-widest text-muted-foreground">
                            <th className="w-20 px-3 py-2 font-semibold">Sıra</th>
                            <th className="px-3 py-2 font-semibold">Mahalle / bölge</th>
                            <th className="w-28 px-3 py-2 font-semibold">Ücret ₺</th>
                            <th className="w-28 px-3 py-2 font-semibold">En az ₺</th>
                            <th className="w-24 px-3 py-2 font-semibold">Süre dk</th>
                            <th className="w-20 px-3 py-2 font-semibold">Aktif</th>
                            <th className="w-36 px-3 py-2" />
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {rows.length === 0 && (
                            <tr><td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">Henüz bölge yok. Aşağıdan ekleyin.</td></tr>
                        )}
                        {rows.map((row, i) => (
                            <tr key={row.id} className={cn(!row.isActive && 'opacity-60')}>
                                <td className="px-3 py-2">
                                    <div className="flex gap-1">
                                        <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`${row.name} yukarı`}
                                            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border disabled:opacity-30"><ArrowUp className="h-4 w-4" /></button>
                                        <button type="button" onClick={() => move(i, 1)} disabled={i === rows.length - 1} aria-label={`${row.name} aşağı`}
                                            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border disabled:opacity-30"><ArrowDown className="h-4 w-4" /></button>
                                    </div>
                                </td>
                                <td className="px-3 py-2">
                                    <input value={row.name} maxLength={80} onChange={e => edit(row.id!, { name: e.target.value })} aria-label="Bölge adı"
                                        className={cn(inputClass, 'py-1.5')} />
                                </td>
                                <td className="px-3 py-2">{numberInput(row.fee, fee => edit(row.id!, { fee }), `${row.name} teslimat ücreti`, 0.5)}</td>
                                <td className="px-3 py-2">{numberInput(row.minOrderAmount, minOrderAmount => edit(row.id!, { minOrderAmount }), `${row.name} en az sipariş`, 1)}</td>
                                <td className="px-3 py-2">{numberInput(row.estimatedMinutes, estimatedMinutes => edit(row.id!, { estimatedMinutes }), `${row.name} tahmini süre`, 5)}</td>
                                <td className="px-3 py-2">
                                    <Switch checked={row.isActive} disabled={busyId === row.id} onCheckedChange={() => toggleActive(row)} aria-label={`${row.name} aktif`} />
                                </td>
                                <td className="px-3 py-2">
                                    <div className="flex justify-end gap-1.5">
                                        {row.dirty && (
                                            <button type="button" onClick={() => saveRow(row)} disabled={busyId === row.id}
                                                className="h-9 rounded-lg bg-rb-gold px-3 text-xs font-semibold text-rb-gold-foreground disabled:opacity-50">Kaydet</button>
                                        )}
                                        <button type="button" onClick={() => remove(row)} disabled={busyId === row.id} aria-label={`${row.name} sil`}
                                            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-destructive">
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr className="border-t border-border bg-muted/40">
                            <td className="px-3 py-2 text-xs font-semibold text-muted-foreground">Yeni</td>
                            <td className="px-3 py-2">
                                <input value={draft.name} maxLength={80} placeholder="ör. Moda" onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
                                    onKeyDown={e => { if (e.key === 'Enter') add(); }} aria-label="Yeni bölge adı" className={cn(inputClass, 'py-1.5')} />
                            </td>
                            <td className="px-3 py-2">{numberInput(draft.fee, fee => setDraft(d => ({ ...d, fee })), 'Yeni bölge ücreti', 0.5)}</td>
                            <td className="px-3 py-2">{numberInput(draft.minOrderAmount, minOrderAmount => setDraft(d => ({ ...d, minOrderAmount })), 'Yeni bölge en az sipariş', 1)}</td>
                            <td className="px-3 py-2">{numberInput(draft.estimatedMinutes, estimatedMinutes => setDraft(d => ({ ...d, estimatedMinutes })), 'Yeni bölge tahmini süre', 5)}</td>
                            <td className="px-3 py-2">
                                <Switch checked={draft.isActive} onCheckedChange={isActive => setDraft(d => ({ ...d, isActive }))} aria-label="Yeni bölge aktif" />
                            </td>
                            <td className="px-3 py-2 text-right">
                                <button type="button" onClick={add} disabled={adding}
                                    className="inline-flex h-9 items-center gap-1 rounded-lg bg-rb-gold px-3 text-xs font-semibold text-rb-gold-foreground disabled:opacity-50">
                                    <Plus className="h-4 w-4" aria-hidden="true" />{adding ? 'Ekleniyor…' : 'Ekle'}
                                </button>
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
}
