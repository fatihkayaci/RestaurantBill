import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ArrowDown, ArrowUp, ChevronRight, Plus, Trash2, X } from 'lucide-react';
import {
    AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Modal, ModalTitle } from '@/components/ui/modal';
import { Switch } from '@/components/ui/switch';
import { onlineOrderingSettingsService } from '@/features/delivery/api/deliveryService';
import type { DeliveryZone, DeliveryZoneInput } from '@/features/delivery/types';
import { getApiErrorMessage } from '@/lib/apiError';
import { inputClass } from '@/lib/formStyles';
import { cn } from '@/lib/utils';
import { useSettingsDirty } from '../settings/settingsTabs';

interface Row extends DeliveryZoneInput {
    id: string;
}

type Field = keyof DeliveryZoneInput;

const EMPTY: DeliveryZoneInput = { name: '', fee: 0, minOrderAmount: 0, estimatedMinutes: 30, isActive: true };

/** Telefondaki düzenleme sayfasında süre için hızlı seçimler. */
const MINUTE_CHIPS = [20, 25, 30, 45] as const;

function toRow(zone: DeliveryZone): Row {
    return {
        id: zone.id, name: zone.name, fee: zone.fee, minOrderAmount: zone.minOrderAmount,
        estimatedMinutes: zone.estimatedMinutes, isActive: zone.isActive,
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

/** "25" / "12,5"; boş alan "—". */
function num(value: number): string {
    return Number.isFinite(value) ? value.toLocaleString('tr-TR') : '—';
}

/** Kaydedilmiş satıra göre değişen alanların okunur açıklaması (alt çubuk için). */
function describeChanges(row: Row, before: Row): string[] {
    const name = before.name || 'Adsız bölge';
    const out: string[] = [];
    if (row.name !== before.name) out.push(`${name} adı → ${row.name.trim() || '(boş)'}`);
    if (row.fee !== before.fee) out.push(`${name} ücreti ₺${num(before.fee)} → ₺${num(row.fee)}`);
    if (row.minOrderAmount !== before.minOrderAmount) out.push(`${name} en az sepeti ₺${num(before.minOrderAmount)} → ₺${num(row.minOrderAmount)}`);
    if (row.estimatedMinutes !== before.estimatedMinutes) out.push(`${name} süresi ${num(before.estimatedMinutes)} → ${num(row.estimatedMinutes)} dk`);
    if (row.isActive !== before.isActive) out.push(`${name} ${row.isActive ? 'açıldı' : 'kapatıldı'}`);
    return out;
}

function zoneSummary(row: DeliveryZoneInput): string {
    const parts = `₺${num(row.fee)} teslimat · en az ₺${num(row.minOrderAmount)} · ~${num(row.estimatedMinutes)} dk`;
    return row.isActive ? parts : `Kapalı · ${parts}`;
}

// Tablo hücresindeki alan: üzerine gelinene ya da odaklanana kadar düz yazı gibi durur.
const cellInput = 'w-full rounded-[10px] border border-transparent bg-transparent px-2.5 py-1.5 text-sm text-foreground transition-colors hover:border-border focus:border-border focus:bg-card focus:outline-none focus:ring-1 focus:ring-ring';
const changedCell = 'bg-rb-gold/20 font-semibold';

type Sheet = { mode: 'edit'; id: string } | { mode: 'create' };

interface Props {
    /** Kaydedilmemiş değişiklik var mı: üst sekme, alt sekme değişiminde uyarmak için dinler. */
    onDirtyChange?: (dirty: boolean) => void;
}

// "Teslimat bölgeleri": mahalle listesi. Müşteri önce mahallesini seçer; ücret, en az sipariş tutarı ve tahmini süre
// buradan gelir. Masaüstünde sade tablo: hücreler yerinde düzenlenir, değişen hücre altınla işaretlenir; hepsi alttaki
// tek "Kaydet" çubuğuyla birlikte kaydedilir. Telefonda bölge kartları ve alttan açılan düzenleme sayfası.
// Ekleme ve silme hemen kaydedilir (silme onay ister).
export default function DeliveryZonesTab({ onDirtyChange }: Props) {
    const [saved, setSaved] = useState<Row[] | null>(null);
    const [rows, setRows] = useState<Row[] | null>(null);
    const [saving, setSaving] = useState(false);
    const [busyId, setBusyId] = useState<string | null>(null);
    const [draft, setDraft] = useState<DeliveryZoneInput>(EMPTY);
    const [newRowOpen, setNewRowOpen] = useState(false);
    const [adding, setAdding] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<Row | null>(null);
    const [sheet, setSheet] = useState<Sheet | null>(null);
    const [sheetDraft, setSheetDraft] = useState<DeliveryZoneInput>(EMPTY);

    const load = useCallback(() => {
        onlineOrderingSettingsService.getZones()
            .then(zones => {
                const list = [...zones].sort((a, b) => a.sortOrder - b.sortOrder).map(toRow);
                setSaved(list);
                setRows(list);
            })
            .catch(err => { toast.error(getApiErrorMessage(err, 'Bölgeler yüklenemedi.')); setSaved([]); setRows([]); });
    }, []);

    useEffect(() => { load(); }, [load]);

    const dirty = !!saved && !!rows && JSON.stringify(rows) !== JSON.stringify(saved);
    // Ayarlar sayfası: üst sekme değişiminde ve sayfayı kapatırken uyarır.
    useSettingsDirty('online-zones', dirty);
    useEffect(() => { onDirtyChange?.(dirty); }, [dirty, onDirtyChange]);
    useEffect(() => () => onDirtyChange?.(false), [onDirtyChange]);

    const savedById = useMemo(() => new Map((saved ?? []).map(r => [r.id, r])), [saved]);

    const changes = useMemo(() => {
        if (!rows || !saved) return [];
        const list: string[] = [];
        for (const row of rows) {
            const before = savedById.get(row.id);
            if (before) list.push(...describeChanges(row, before));
        }
        if (rows.map(r => r.id).join() !== saved.map(r => r.id).join()) list.push('Sıra değişti');
        return list;
    }, [rows, saved, savedById]);

    const isChanged = (row: Row, field: Field) => {
        const before = savedById.get(row.id);
        return !!before && before[field] !== row[field];
    };

    const edit = (id: string, patch: Partial<DeliveryZoneInput>) =>
        setRows(prev => prev?.map(r => r.id === id ? { ...r, ...patch } : r) ?? prev);

    const move = (index: number, delta: -1 | 1) => {
        setRows(prev => {
            if (!prev) return prev;
            const target = index + delta;
            if (target < 0 || target >= prev.length) return prev;
            const next = [...prev];
            [next[index], next[target]] = [next[target], next[index]];
            return next;
        });
    };

    const saveAll = async () => {
        if (!rows) return;
        for (const row of rows) {
            const error = validate(row);
            if (error) { toast.error(`${row.name.trim() || 'Adsız bölge'}: ${error}`); return; }
        }
        setSaving(true);
        try {
            const result = await onlineOrderingSettingsService.saveZonesBulk(rows.map(r => ({ ...r, name: r.name.trim() })));
            const list = [...result].sort((a, b) => a.sortOrder - b.sortOrder).map(toRow);
            setSaved(list);
            setRows(list);
            toast.success('Teslimat bölgeleri kaydedildi.');
        } catch (err) {
            toast.error(getApiErrorMessage(err, 'Bölgeler kaydedilemedi.'));
        } finally {
            setSaving(false);
        }
    };

    const remove = async () => {
        const row = deleteTarget;
        if (!row) return;
        setDeleteTarget(null);
        setBusyId(row.id);
        try {
            await onlineOrderingSettingsService.deleteZone(row.id);
            // Diğer satırlardaki kaydedilmemiş değişiklikler korunur.
            setRows(prev => prev?.filter(r => r.id !== row.id) ?? prev);
            setSaved(prev => prev?.filter(r => r.id !== row.id) ?? prev);
            toast.success(`${savedById.get(row.id)?.name ?? row.name} silindi.`);
        } catch (err) {
            toast.error(getApiErrorMessage(err, 'Bölge silinemedi.'));
        } finally {
            setBusyId(null);
        }
    };

    /** Yeni bölge hemen kaydedilir; başarılıysa true. */
    const create = async (input: DeliveryZoneInput): Promise<boolean> => {
        const error = validate(input);
        if (error) { toast.error(error); return false; }
        setAdding(true);
        try {
            const created = toRow(await onlineOrderingSettingsService.createZone({ ...input, name: input.name.trim() }));
            setRows(prev => [...(prev ?? []), created]);
            setSaved(prev => [...(prev ?? []), created]);
            toast.success(`${created.name} eklendi.`);
            return true;
        } catch (err) {
            toast.error(getApiErrorMessage(err, 'Bölge eklenemedi.'));
            return false;
        } finally {
            setAdding(false);
        }
    };

    const addFromTable = async () => {
        if (await create(draft)) { setDraft(EMPTY); setNewRowOpen(false); }
    };

    const openEditSheet = (row: Row) => {
        const { id, ...input } = row;
        setSheetDraft(input);
        setSheet({ mode: 'edit', id });
    };
    const openCreateSheet = () => {
        setSheetDraft(EMPTY);
        setSheet({ mode: 'create' });
    };
    const confirmSheet = async () => {
        if (!sheet) return;
        if (sheet.mode === 'create') {
            if (await create(sheetDraft)) setSheet(null);
            return;
        }
        const error = validate(sheetDraft);
        if (error) { toast.error(error); return; }
        // Yalnızca yerel satıra uygulanır; kayıt alttaki çubuktan.
        edit(sheet.id, sheetDraft);
        setSheet(null);
    };

    if (!rows) return <div className="h-48 animate-pulse rounded-2xl bg-muted" aria-busy="true" />;

    const numberCell = (value: number, onChange: (v: number) => void, label: string, step: number, changed: boolean, prefix?: string) => (
        <div className={cn('flex items-center rounded-[10px]', changed && changedCell)}>
            {prefix && <span className="pl-2.5 text-sm text-muted-foreground" aria-hidden="true">{prefix}</span>}
            <input
                type="number"
                inputMode="decimal"
                min={0}
                step={step}
                value={Number.isFinite(value) ? value : ''}
                onChange={e => onChange(e.target.value === '' ? NaN : Number(e.target.value))}
                aria-label={label}
                className={cn(cellInput, 'min-w-16 tabular-nums', prefix && 'pl-1')}
            />
        </div>
    );

    const sheetRowIndex = sheet?.mode === 'edit' ? rows.findIndex(r => r.id === sheet.id) : -1;
    const sheetRow = sheetRowIndex >= 0 ? rows[sheetRowIndex] : null;

    return (
        <div className={cn('space-y-4', dirty && 'pb-24')}>
            <p className="text-sm text-muted-foreground">
                Müşteri sipariş verirken önce mahallesini seçer. Listede olmayan mahalleye sipariş verilemez.
            </p>

            {/* Masaüstü: sade tablo */}
            <div className="hidden overflow-hidden rounded-2xl border border-border bg-card md:block">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-border text-left text-[11px] uppercase tracking-widest text-muted-foreground">
                            <th className="w-24 px-4 py-2.5 font-semibold">Sıra</th>
                            <th className="px-2 py-2.5 font-semibold">Mahalle</th>
                            <th className="w-32 px-2 py-2.5 font-semibold">Ücret</th>
                            <th className="w-32 px-2 py-2.5 font-semibold">En az</th>
                            <th className="w-24 px-2 py-2.5 font-semibold">Dk</th>
                            <th className="w-20 px-2 py-2.5 font-semibold">Aktif</th>
                            <th className="w-14 px-4 py-2.5"><span className="sr-only">Sil</span></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {rows.length === 0 && (
                            <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Henüz bölge yok. Aşağıdan ekleyin.</td></tr>
                        )}
                        {rows.map((row, i) => (
                            <tr key={row.id} className={cn(!row.isActive && 'text-muted-foreground')}>
                                <td className="px-4 py-1.5">
                                    <div className="flex gap-1">
                                        <button type="button" onClick={() => move(i, -1)} disabled={i === 0 || saving} aria-label={`${row.name} yukarı`}
                                            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-25"><ArrowUp className="h-4 w-4" /></button>
                                        <button type="button" onClick={() => move(i, 1)} disabled={i === rows.length - 1 || saving} aria-label={`${row.name} aşağı`}
                                            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-25"><ArrowDown className="h-4 w-4" /></button>
                                    </div>
                                </td>
                                <td className="px-2 py-1.5">
                                    <input value={row.name} maxLength={80} onChange={e => edit(row.id, { name: e.target.value })} aria-label="Bölge adı"
                                        className={cn(cellInput, 'font-semibold', !row.isActive && 'text-muted-foreground', isChanged(row, 'name') && changedCell)} />
                                </td>
                                <td className="px-2 py-1.5">{numberCell(row.fee, fee => edit(row.id, { fee }), `${row.name} teslimat ücreti`, 0.5, isChanged(row, 'fee'), '₺')}</td>
                                <td className="px-2 py-1.5">{numberCell(row.minOrderAmount, minOrderAmount => edit(row.id, { minOrderAmount }), `${row.name} en az sipariş`, 1, isChanged(row, 'minOrderAmount'), '₺')}</td>
                                <td className="px-2 py-1.5">{numberCell(row.estimatedMinutes, estimatedMinutes => edit(row.id, { estimatedMinutes }), `${row.name} tahmini süre`, 5, isChanged(row, 'estimatedMinutes'))}</td>
                                <td className="px-2 py-1.5">
                                    <span className={cn('inline-flex rounded-full p-1', isChanged(row, 'isActive') && changedCell)}>
                                        <Switch checked={row.isActive} disabled={saving} onCheckedChange={isActive => edit(row.id, { isActive })}
                                            onClassName="bg-rb-gold" aria-label={`${row.name} aktif`} />
                                    </span>
                                </td>
                                <td className="px-4 py-1.5 text-right">
                                    <button type="button" onClick={() => setDeleteTarget(row)} disabled={busyId === row.id || saving} aria-label={`${row.name} sil`}
                                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-rb-red-bg hover:text-rb-red disabled:opacity-40">
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        {newRowOpen ? (
                            <tr className="border-t border-border bg-muted/40">
                                <td className="px-4 py-2 text-xs font-semibold text-muted-foreground">Yeni</td>
                                <td className="px-2 py-2">
                                    <input value={draft.name} maxLength={80} placeholder="ör. Moda" autoFocus
                                        onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
                                        onKeyDown={e => { if (e.key === 'Enter') void addFromTable(); if (e.key === 'Escape') setNewRowOpen(false); }}
                                        aria-label="Yeni bölge adı" className={cn(inputClass, 'py-1.5')} />
                                </td>
                                {([['fee', 'Yeni bölge ücreti', 0.5], ['minOrderAmount', 'Yeni bölge en az sipariş', 1], ['estimatedMinutes', 'Yeni bölge tahmini süre', 5]] as const).map(([field, label, step]) => (
                                    <td key={field} className="px-2 py-2">
                                        <input type="number" inputMode="decimal" min={0} step={step} aria-label={label}
                                            value={Number.isFinite(draft[field]) ? draft[field] : ''}
                                            onChange={e => setDraft(d => ({ ...d, [field]: e.target.value === '' ? NaN : Number(e.target.value) }))}
                                            onKeyDown={e => { if (e.key === 'Enter') void addFromTable(); }}
                                            className={cn(inputClass, 'py-1.5 tabular-nums')} />
                                    </td>
                                ))}
                                <td className="px-2 py-2">
                                    <Switch checked={draft.isActive} onCheckedChange={isActive => setDraft(d => ({ ...d, isActive }))} onClassName="bg-rb-gold" aria-label="Yeni bölge aktif" />
                                </td>
                                <td className="px-4 py-2">
                                    <div className="flex justify-end gap-1">
                                        <button type="button" onClick={() => void addFromTable()} disabled={adding}
                                            className="inline-flex h-9 items-center gap-1 rounded-lg bg-rb-gold px-3 text-xs font-semibold text-rb-gold-foreground disabled:opacity-50">
                                            {adding ? 'Ekleniyor…' : 'Ekle'}
                                        </button>
                                        <button type="button" onClick={() => { setNewRowOpen(false); setDraft(EMPTY); }} aria-label="Vazgeç"
                                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"><X className="h-4 w-4" /></button>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            <tr className="border-t border-border">
                                <td colSpan={7} className="px-2 py-1">
                                    <button type="button" onClick={() => setNewRowOpen(true)}
                                        className="flex min-h-10 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-rb-accent hover:underline">
                                        <Plus className="h-4 w-4" aria-hidden="true" />Mahalle ekle
                                    </button>
                                </td>
                            </tr>
                        )}
                    </tfoot>
                </table>
            </div>

            {/* Telefon: bölge kartları; dokununca alttan düzenleme sayfası açılır */}
            <div className="flex flex-col gap-2.5 md:hidden">
                {rows.length === 0 && (
                    <p className="rounded-2xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">Henüz bölge yok.</p>
                )}
                {rows.map(row => {
                    const changed = (['name', 'fee', 'minOrderAmount', 'estimatedMinutes', 'isActive'] as Field[]).some(f => isChanged(row, f));
                    return (
                        <button key={row.id} type="button" onClick={() => openEditSheet(row)}
                            className={cn(
                                'flex min-h-16 w-full items-center gap-3 rounded-2xl border bg-card px-4 py-3 text-left',
                                changed ? 'border-rb-gold' : 'border-border',
                                !row.isActive && 'opacity-60'
                            )}>
                            <span className="min-w-0 flex-1">
                                <span className="block truncate font-semibold text-foreground">{row.name || 'Adsız bölge'}</span>
                                <span className="block truncate text-xs text-muted-foreground tabular-nums">{zoneSummary(row)}</span>
                            </span>
                            {changed && <span className="text-[11px] font-semibold text-rb-gold">Değişti</span>}
                            <span className={cn('h-2 w-2 shrink-0 rounded-full', row.isActive ? 'bg-rb-green' : 'bg-border')} aria-label={row.isActive ? 'Açık' : 'Kapalı'} />
                            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                        </button>
                    );
                })}
                <button type="button" onClick={openCreateSheet}
                    className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-dashed border-border text-sm font-semibold text-muted-foreground hover:text-foreground">
                    <Plus className="h-4 w-4" aria-hidden="true" />Mahalle ekle
                </button>
            </div>

            {/* Tek toplu Kaydet çubuğu */}
            {dirty && (
                <div role="status" className="fixed inset-x-3 bottom-3 z-20 flex items-center gap-3 rounded-2xl bg-sidebar px-4 py-3 text-sidebar-foreground shadow-2xl md:inset-x-auto md:right-6 md:bottom-6 md:min-w-[440px] md:max-w-[640px]">
                    <span className="min-w-0 flex-1 truncate text-sm" title={changes.join('\n')}>
                        {changes.length === 1 ? `1 değişiklik: ${changes[0]}` : `${changes.length} değişiklik`}
                    </span>
                    <button type="button" onClick={() => setRows(saved)} disabled={saving}
                        className="min-h-10 shrink-0 rounded-lg px-2 text-sm text-sidebar-foreground/60 hover:text-sidebar-foreground disabled:opacity-40">Geri al</button>
                    <button type="button" onClick={saveAll} disabled={saving}
                        className="h-10 shrink-0 rounded-xl bg-rb-gold px-4 text-sm font-semibold text-rb-gold-foreground disabled:opacity-50">
                        {saving ? 'Kaydediliyor…' : 'Kaydet'}
                    </button>
                </div>
            )}

            {sheet && (sheet.mode === 'create' || sheetRow) && (
                <Modal onClose={() => setSheet(null)} closeOnOverlay={!adding} overlayClassName="z-80 items-end bg-black/55">
                    <div className="flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[28px] bg-card shadow-2xl">
                        <div className="shrink-0 border-b border-border px-4 pt-3 pb-3">
                        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-border" aria-hidden="true" />
                        <div className="flex items-start justify-between gap-3">
                            <ModalTitle className="font-serif text-xl font-bold text-foreground">
                                {sheet.mode === 'create' ? 'Mahalle ekle' : (sheetRow?.name || 'Bölge')}
                            </ModalTitle>
                            <button type="button" onClick={() => setSheet(null)} aria-label="Kapat"
                                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground"><X className="h-4 w-4" /></button>
                        </div>
                        </div>

                        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-3 text-sm">
                            <label className="flex flex-col gap-1 text-xs font-semibold text-muted-foreground">
                                Mahalle adı
                                <input value={sheetDraft.name} maxLength={80} placeholder="ör. Moda"
                                    onChange={e => setSheetDraft(d => ({ ...d, name: e.target.value }))} className={cn(inputClass, 'h-11')} />
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                {([['fee', 'Teslimat ücreti', 0.5], ['minOrderAmount', 'En az sepet', 1]] as const).map(([field, label, step]) => (
                                    <label key={field} className="flex flex-col gap-1 text-xs font-semibold text-muted-foreground">
                                        {label} (₺)
                                        <input type="number" inputMode="decimal" min={0} step={step}
                                            value={Number.isFinite(sheetDraft[field]) ? sheetDraft[field] : ''}
                                            onChange={e => setSheetDraft(d => ({ ...d, [field]: e.target.value === '' ? NaN : Number(e.target.value) }))}
                                            className={cn(inputClass, 'h-11 tabular-nums')} />
                                    </label>
                                ))}
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="text-xs font-semibold text-muted-foreground">Tahmini süre (dk)</span>
                                <div className="grid grid-cols-5 gap-1.5">
                                    {MINUTE_CHIPS.map(m => (
                                        <button key={m} type="button" onClick={() => setSheetDraft(d => ({ ...d, estimatedMinutes: m }))}
                                            aria-pressed={sheetDraft.estimatedMinutes === m}
                                            className={cn('h-11 rounded-lg border text-sm font-bold tabular-nums',
                                                sheetDraft.estimatedMinutes === m ? 'border-rb-gold bg-rb-gold text-rb-gold-foreground' : 'border-border text-foreground')}>
                                            {m}
                                        </button>
                                    ))}
                                    <input type="number" inputMode="numeric" min={10} max={180} step={5} aria-label="Tahmini süre (dk)"
                                        value={Number.isFinite(sheetDraft.estimatedMinutes) ? sheetDraft.estimatedMinutes : ''}
                                        onChange={e => setSheetDraft(d => ({ ...d, estimatedMinutes: e.target.value === '' ? NaN : Number(e.target.value) }))}
                                        className={cn(inputClass, 'h-11 px-2 text-center tabular-nums')} />
                                </div>
                            </div>
                            <div className="flex min-h-11 items-center justify-between">
                                <Switch checked={sheetDraft.isActive} onCheckedChange={isActive => setSheetDraft(d => ({ ...d, isActive }))} onClassName="bg-rb-gold"
                                    label={<span className="text-sm font-semibold text-foreground">{sheetDraft.isActive ? 'Sitede açık' : 'Kapalı'}</span>} />
                                {sheet.mode === 'edit' && sheetRow && (
                                    <div className="flex gap-1">
                                        <button type="button" onClick={() => move(sheetRowIndex, -1)} disabled={sheetRowIndex === 0} aria-label="Yukarı taşı"
                                            className="flex h-11 w-11 items-center justify-center rounded-lg border border-border disabled:opacity-30"><ArrowUp className="h-4 w-4" /></button>
                                        <button type="button" onClick={() => move(sheetRowIndex, 1)} disabled={sheetRowIndex === rows.length - 1} aria-label="Aşağı taşı"
                                            className="flex h-11 w-11 items-center justify-center rounded-lg border border-border disabled:opacity-30"><ArrowDown className="h-4 w-4" /></button>
                                    </div>
                                )}
                            </div>
                            <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
                                Sitede görünecek: “{sheetDraft.name.trim() || 'Mahalle'} için teslimat {num(sheetDraft.fee)} ₺, en az sepet {num(sheetDraft.minOrderAmount)} ₺.”
                            </p>
                        </div>

                        <div className="flex shrink-0 flex-col gap-3 border-t border-border bg-card px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] text-sm">
                            <div className="flex gap-2">
                                {sheet.mode === 'edit' && sheetRow && (
                                    <button type="button" onClick={() => { setDeleteTarget(sheetRow); setSheet(null); }} aria-label="Bölgeyi sil"
                                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-rb-red/40 text-rb-red"><Trash2 className="h-4 w-4" /></button>
                                )}
                                <button type="button" onClick={() => void confirmSheet()} disabled={adding}
                                    className="h-12 flex-1 rounded-xl bg-rb-gold text-sm font-semibold text-rb-gold-foreground disabled:opacity-50">
                                    {sheet.mode === 'create' ? (adding ? 'Ekleniyor…' : 'Ekle') : 'Tamam'}
                                </button>
                            </div>
                            {sheet.mode === 'edit' && (
                                <p className="text-center text-xs text-muted-foreground">Değişiklik alttaki “Kaydet” ile siteye geçer.</p>
                            )}
                        </div>
                    </div>
                </Modal>
            )}

            <AlertDialog open={deleteTarget !== null} onOpenChange={open => !open && setDeleteTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Bölgeyi sil</AlertDialogTitle>
                        <AlertDialogDescription>
                            {deleteTarget && `${savedById.get(deleteTarget.id)?.name ?? deleteTarget.name} bölgesi silinsin mi? Müşteri bu mahalleyi artık seçemez. Açık siparişler etkilenmez.`}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Vazgeç</AlertDialogCancel>
                        <Button variant="destructive" onClick={remove}>Sil</Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
