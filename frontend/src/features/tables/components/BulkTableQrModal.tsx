import { useEffect, useMemo, useRef, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Check, Download, Printer, X } from 'lucide-react';
import { toast } from 'sonner';
import { Modal, ModalTitle } from '@/components/ui/modal';
import { branchService } from '@/features/branches/api/branchService';
import type { Region } from '@/features/regions/types';
import { ROOT_DOMAIN } from '@/lib/tenant';
import { cn } from '@/lib/utils';
import type { Table } from '../types';

interface Props {
    tables: Table[];
    regions: Region[];
    onClose: () => void;
}

const QR_SIZE = 512;
const CARD_W = 600;
const CARD_H = 740;

function fileSafe(name: string) {
    return name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9çğıöşü-]/gi, '');
}

// QR'ı masa adı ve bölgesiyle birlikte tek bir beyaz karta çizer: masaya yapıştırılacak hâli.
function drawCard(qr: HTMLCanvasElement, table: Table): HTMLCanvasElement {
    const card = document.createElement('canvas');
    card.width = CARD_W;
    card.height = CARD_H;
    const ctx = card.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, CARD_W, CARD_H);
    ctx.drawImage(qr, (CARD_W - QR_SIZE) / 2, 40, QR_SIZE, QR_SIZE);

    ctx.fillStyle = '#1a1a1a';
    ctx.textAlign = 'center';
    ctx.font = 'bold 44px system-ui, sans-serif';
    ctx.fillText(table.name, CARD_W / 2, 620, CARD_W - 40);
    ctx.fillStyle = '#666666';
    ctx.font = '24px system-ui, sans-serif';
    ctx.fillText(table.regionName ? `${table.regionName} · Menü ve sipariş için okutun` : 'Menü ve sipariş için okutun', CARD_W / 2, 670, CARD_W - 40);
    return card;
}

// Masalar sayfasından açılır: masaları seç, etiketli QR'ları ZIP olarak indir ya da yazdır.
export default function BulkTableQrModal({ tables, regions, onClose }: Props) {
    const [slug, setSlug] = useState<string | null>(null);
    const [loaded, setLoaded] = useState(false);
    const [selected, setSelected] = useState<Set<string>>(() => new Set(tables.map(t => t.id)));
    const [busy, setBusy] = useState(false);
    const canvasRefs = useRef(new Map<string, HTMLCanvasElement>());

    useEffect(() => {
        let cancelled = false;
        branchService.getMyBranch()
            .then(branch => { if (!cancelled) setSlug(branch.slug || null); })
            .catch(() => { /* adres yoksa aşağıda uyarı gösterilir */ })
            .finally(() => { if (!cancelled) setLoaded(true); });
        return () => { cancelled = true; };
    }, []);

    // Bölge sırasıyla gruplanmış masalar; bölgesi silinmiş masa varsa "Diğer" altında.
    const groups = useMemo(() => {
        const known = regions
            .map(region => ({ key: region.id, name: region.name, tables: tables.filter(t => t.regionId === region.id) }))
            .filter(g => g.tables.length > 0);
        const regionIds = new Set(regions.map(r => r.id));
        const rest = tables.filter(t => !regionIds.has(t.regionId));
        return rest.length ? [...known, { key: 'other', name: 'Diğer', tables: rest }] : known;
    }, [tables, regions]);

    const urlFor = (table: Table) => `https://${slug}.${ROOT_DOMAIN}/masa/${table.id}`;
    const selectedTables = tables.filter(t => selected.has(t.id));
    const allSelected = selected.size === tables.length && tables.length > 0;

    const toggle = (ids: string[], on: boolean) => {
        setSelected(prev => {
            const next = new Set(prev);
            ids.forEach(id => (on ? next.add(id) : next.delete(id)));
            return next;
        });
    };

    const cards = () => selectedTables.flatMap(table => {
        const qr = canvasRefs.current.get(table.id);
        return qr ? [{ table, card: drawCard(qr, table) }] : [];
    });

    const downloadZip = async () => {
        if (!selectedTables.length || busy) return;
        setBusy(true);
        try {
            const { default: JSZip } = await import('jszip');
            const zip = new JSZip();
            const used = new Set<string>();
            for (const { table, card } of cards()) {
                const blob = await new Promise<Blob | null>(resolve => card.toBlob(resolve, 'image/png'));
                if (!blob) continue;
                // Aynı adlı iki masa (farklı bölgede) birbirinin üstüne yazmasın.
                let name = fileSafe(table.name) || 'masa';
                if (used.has(name)) name = `${name}-${fileSafe(table.regionName) || table.id.slice(0, 6)}`;
                used.add(name);
                zip.file(`${name}.png`, blob);
            }
            const content = await zip.generateAsync({ type: 'blob' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(content);
            link.download = `${slug}-masa-qr.zip`;
            link.click();
            setTimeout(() => URL.revokeObjectURL(link.href), 10_000);
        } catch {
            toast.error('QR kodları indirilemedi.');
        } finally {
            setBusy(false);
        }
    };

    // Yazdırma sayfası: A4'e 2 sütun etiketli kart; tarayıcının yazdır penceresinden PDF de alınabilir.
    const print = () => {
        if (!selectedTables.length) return;
        const win = window.open('', '_blank');
        if (!win) {
            toast.error('Yazdırma penceresi açılamadı. Tarayıcının açılır pencere iznini kontrol edin.');
            return;
        }
        const images = cards()
            .map(({ table, card }) => `<img src="${card.toDataURL('image/png')}" alt="${table.name.replace(/"/g, '&quot;')}">`)
            .join('');
        win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Masa QR kodları</title>
<style>
  @page { size: A4; margin: 12mm; }
  body { margin: 0; font-family: system-ui, sans-serif; }
  .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8mm; }
  img { width: 100%; border: 1px dashed #bbb; break-inside: avoid; }
</style></head><body><div class="grid">${images}</div>
<script>window.onload = () => { window.focus(); window.print(); };</script></body></html>`);
        win.document.close();
    };

    return (
        <Modal onClose={onClose} overlayClassName="bg-black/55 p-4">
            <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl border border-border bg-card shadow-2xl">
                <div className="flex items-start justify-between gap-3 border-b border-border p-5">
                    <div>
                        <ModalTitle className="font-serif text-2xl font-bold leading-tight text-foreground">Toplu QR</ModalTitle>
                        <p className="mt-0.5 text-sm text-rb-text-sub">İndirmek ya da yazdırmak istediğiniz masaları seçin.</p>
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

                {!slug ? (
                    <p className="m-5 rounded-[10px] border border-dashed border-border px-3 py-6 text-center text-sm text-rb-text-sub">
                        {loaded ? 'Restoran adresi henüz belirlenmemiş; QR kod için önce adresi ayarlayın.' : 'Yükleniyor…'}
                    </p>
                ) : tables.length === 0 ? (
                    <p className="m-5 rounded-[10px] border border-dashed border-border px-3 py-6 text-center text-sm text-rb-text-sub">
                        Henüz masa yok.
                    </p>
                ) : (
                    <>
                        <div className="flex items-center justify-between gap-3 px-5 pt-4">
                            <span className="text-sm text-rb-text-sub">{selected.size} / {tables.length} masa seçili</span>
                            <button
                                type="button"
                                onClick={() => toggle(tables.map(t => t.id), !allSelected)}
                                className="text-sm font-semibold text-rb-amber hover:underline"
                            >
                                {allSelected ? 'Seçimi temizle' : 'Tümünü seç'}
                            </button>
                        </div>

                        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
                            {groups.map(group => {
                                const ids = group.tables.map(t => t.id);
                                const groupAll = ids.every(id => selected.has(id));
                                return (
                                    <section key={group.key} className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-[11px] font-bold uppercase tracking-[0.08em] text-rb-text-sub">{group.name}</h3>
                                            <button
                                                type="button"
                                                onClick={() => toggle(ids, !groupAll)}
                                                className="text-xs font-semibold text-rb-text-sub hover:text-foreground"
                                            >
                                                {groupAll ? 'Bölgeyi kaldır' : 'Bölgeyi seç'}
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                                            {group.tables.map(table => {
                                                const on = selected.has(table.id);
                                                return (
                                                    <button
                                                        key={table.id}
                                                        type="button"
                                                        role="checkbox"
                                                        aria-checked={on}
                                                        onClick={() => toggle([table.id], !on)}
                                                        className={cn(
                                                            'flex h-11 items-center gap-2 rounded-[10px] border px-3 text-left text-sm font-medium transition-colors',
                                                            on ? 'border-rb-gold/60 bg-rb-gold-bg text-foreground' : 'border-border bg-background text-rb-text-sub hover:text-foreground'
                                                        )}
                                                    >
                                                        <span className={cn(
                                                            'flex h-4 w-4 shrink-0 items-center justify-center rounded border',
                                                            on ? 'border-rb-gold bg-rb-gold text-rb-gold-foreground' : 'border-border'
                                                        )}>
                                                            {on && <Check className="h-3 w-3" strokeWidth={3} aria-hidden="true" />}
                                                        </span>
                                                        <span className="truncate">{table.name}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </section>
                                );
                            })}
                        </div>

                        {/* İndirme/yazdırma için görünmeyen, baskıya uygun QR'lar */}
                        <div className="hidden" aria-hidden="true">
                            {tables.map(table => (
                                <QRCodeCanvas
                                    key={table.id}
                                    value={urlFor(table)}
                                    size={QR_SIZE}
                                    marginSize={2}
                                    ref={el => { if (el) canvasRefs.current.set(table.id, el); else canvasRefs.current.delete(table.id); }}
                                />
                            ))}
                        </div>

                        <div className="grid grid-cols-2 gap-2 border-t border-border p-5">
                            <button
                                type="button"
                                onClick={print}
                                disabled={!selected.size}
                                className="flex h-11 items-center justify-center gap-1.5 rounded-[10px] border border-border bg-card text-[13.5px] font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-50"
                            >
                                <Printer className="h-[15px] w-[15px]" aria-hidden="true" />
                                Yazdır
                            </button>
                            <button
                                type="button"
                                onClick={downloadZip}
                                disabled={!selected.size || busy}
                                className="flex h-11 items-center justify-center gap-1.5 rounded-[10px] bg-rb-gold text-[13.5px] font-semibold text-rb-gold-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                            >
                                <Download className="h-[15px] w-[15px]" aria-hidden="true" />
                                {busy ? 'Hazırlanıyor…' : `ZIP indir (${selected.size})`}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </Modal>
    );
}
