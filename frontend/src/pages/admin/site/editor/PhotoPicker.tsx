import { useMemo, useRef, useState, type DragEvent } from 'react';
import { Camera, Check, ImageOff, Loader2, Search } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { VENUE_STOCK_GROUPS, type StockImage } from '@/features/stockImages/api/stockImageService';
import { useStockImageSearch } from '@/features/stockImages/useStockImageSearch';
import { cn } from '@/lib/utils';
import { tooBig } from './editorModel';
import { ed } from './editorStyles';

// Hazır görsel seçici (arama, grup çipleri, ızgara; "Temsili görsel" etiketi, kullanılan görsel işaretli). Arama ve
// sıralama ürünlerdeki hazır görsel penceresiyle aynı (useStockImageSearch) ama mekân kapsamında: site fotoğrafları için
// mekân/ortam fotoğrafları önce gelir. Çipler: Tümü (mekân önce) · mekân grupları · Yemekler (yemek kapsamı, altında
// yemek grupları). Önizlemenin üstündeki büyük katman (StockOverlay) ve "Genel ayarlar"daki paylaşım görseli (PhotoPicker)
// kullanır.

const ACCEPT = 'image/jpeg,image/png,image/webp';

/** Üst çip: 'all' mekân önce hepsi, bir mekân grubu ya da 'food' yemekler. */
type StockChip = 'all' | 'food' | (typeof VENUE_STOCK_GROUPS)[number];
const CHIPS: { key: StockChip; label: string }[] = [
    { key: 'all', label: 'Tümü' },
    ...VENUE_STOCK_GROUPS.map(g => ({ key: g, label: g })),
    { key: 'food', label: 'Yemekler' },
];

const chipClass = (on: boolean) => cn('flex h-7 items-center rounded-full border px-[11px] text-xs font-semibold',
    on ? 'border-[#2A1F14] bg-[#2A1F14] text-[#FDFAF5] dark:border-foreground dark:bg-foreground dark:text-background' : 'border-[#DDD3C2] text-foreground dark:border-border');

export function StockGrid({ currentUrl, markLabel, actionHint, busy, onPick, large = false, autoFocus = false }: {
    /** Yuvada şu an kullanılan görsel: ızgarada işaretlenir. */
    currentUrl: string;
    /** "Kapakta", "Galeride"… */
    markLabel: string;
    /** Seçilince ne olur: "tıklayınca kapağa gelir". */
    actionHint: string;
    busy: boolean;
    onPick: (image: StockImage) => void;
    /** Büyük katmanda daha çok sütun ve büyük kareler. */
    large?: boolean;
    autoFocus?: boolean;
}) {
    const [query, setQuery] = useState('');
    const [chip, setChip] = useState<StockChip>('all');
    // Yemekler çipinin altındaki yemek grubu (gelen listeden, istemcide süzülür).
    const [group, setGroup] = useState<string | null>(null);
    const [picked, setPicked] = useState<string | null>(null);
    const options = useMemo(() => (chip === 'food' ? { scope: 'food' as const } : { scope: 'venue' as const, group: chip === 'all' ? undefined : chip }), [chip]);
    const { state, retry } = useStockImageSearch(query, options);
    const items = useMemo(() => (state.status === 'ready' ? state.items : []), [state]);
    const groups = useMemo(() => (chip === 'food' ? [...new Set(items.map(i => i.group).filter((g): g is string => !!g))].slice(0, large ? 10 : 6) : []), [items, large, chip]);
    const shown = group ? items.filter(i => i.group === group) : items;
    const selectChip = (next: StockChip) => { setChip(next); setGroup(null); };
    const grid = large ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5' : 'grid-cols-2';
    const thumb = large ? 'h-[120px] md:h-[140px]' : 'h-[82px]';

    return (
        <div className="flex flex-col gap-2.5">
            <label className="flex h-10 items-center gap-2 rounded-[10px] border border-[#DDD3C2] bg-white px-2.5 text-[#6B5E52] dark:border-border dark:bg-card">
                <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="sr-only">Görsel ara</span>
                <input type="search" value={query} autoFocus={autoFocus} onChange={e => { setQuery(e.target.value); setGroup(null); }} placeholder="Ara: avlu, mangal, çay…"
                    className="min-w-0 flex-1 border-0 bg-transparent text-sm text-foreground outline-none" />
            </label>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Görsel grubu">
                {CHIPS.map(c => (
                    <button key={c.key} type="button" onClick={() => selectChip(c.key)} aria-pressed={chip === c.key} className={chipClass(chip === c.key)}>
                        {c.label}
                    </button>
                ))}
            </div>
            {groups.length > 1 && (
                <div className="flex flex-wrap gap-1.5 border-l-2 border-[#DDD3C2] pl-2 dark:border-border" role="group" aria-label="Yemek grubu">
                    {[null, ...groups].map(g => (
                        <button key={g ?? 'all'} type="button" onClick={() => setGroup(g)} aria-pressed={group === g} className={chipClass(group === g)}>
                            {g ?? 'Tüm yemekler'}
                        </button>
                    ))}
                </div>
            )}
            <div className="min-h-[180px]" aria-live="polite" aria-busy={state.status === 'loading'}>
                {state.status === 'loading' && (
                    <div className={cn('grid gap-x-2 gap-y-2.5', grid)}>
                        {Array.from({ length: large ? 10 : 6 }, (_, i) => <Skeleton key={i} className={cn('w-full rounded-[9px]', thumb)} />)}
                    </div>
                )}
                {state.status === 'error' && (
                    <div className="flex flex-col items-center gap-2 py-8 text-center">
                        <p className="text-sm text-destructive">{state.message}</p>
                        <button type="button" onClick={retry} className={ed.btnSm}>Tekrar dene</button>
                    </div>
                )}
                {state.status === 'ready' && items.length === 0 && (chip === 'food' ? (
                    <div className="flex flex-col items-center gap-2 py-8 text-center text-muted-foreground">
                        <ImageOff className="h-6 w-6" aria-hidden="true" />
                        <p className="text-sm">Henüz hazır görsel yok.</p>
                    </div>
                ) : (
                    <div className="mx-auto flex max-w-sm flex-col items-center gap-3 py-8 text-center text-muted-foreground">
                        <ImageOff className="h-6 w-6" aria-hidden="true" />
                        <p className="m-0 text-sm">
                            Mekân fotoğrafları yakında eklenecek. Şimdilik yemek fotoğraflarından seçebilir ya da kendi fotoğrafınızı yükleyebilirsiniz.
                        </p>
                        <button type="button" onClick={() => selectChip('food')} className={ed.btnSm}>Yemek fotoğraflarına geç</button>
                    </div>
                ))}
                {state.status === 'ready' && state.noMatch && items.length > 0 && (
                    <p className="mb-2 text-xs text-muted-foreground">“{query.trim()}” için eşleşen görsel yok. Tüm hazır görseller:</p>
                )}
                {shown.length > 0 && (
                    <ul className={cn('grid gap-x-2 gap-y-2.5', grid)}>
                        {shown.map(image => {
                            const inUse = image.url === currentUrl;
                            const isPicked = picked === image.id;
                            return (
                                <li key={image.id}>
                                    <button type="button" disabled={busy} title={image.group ? `${image.title} · ${image.group}` : image.title}
                                        onClick={() => { setPicked(image.id); onPick(image); }}
                                        className="group flex w-full flex-col gap-1 text-left focus-visible:outline-none disabled:cursor-wait">
                                        <span className={cn('relative block w-full overflow-hidden rounded-[9px] bg-muted', thumb,
                                            inUse ? 'ring-2 ring-[#C8A96E]' : isPicked ? 'ring-[3px] ring-[#2B7FFF]' : 'group-hover:ring-2 group-hover:ring-[#2B7FFF]/60 group-focus-visible:ring-2 group-focus-visible:ring-ring')}>
                                            <img src={image.url} alt="" loading="lazy" className="h-full w-full object-cover" />
                                            {inUse && <span className="absolute left-1.5 top-1.5 rounded-[5px] bg-[#C8A96E] px-1.5 py-0.5 text-xs font-bold text-[#1C1510]">{markLabel}</span>}
                                            {isPicked && (
                                                <span className="absolute right-1.5 top-1.5 flex h-[22px] w-[22px] items-center justify-center rounded-full bg-[#2B7FFF] text-white">
                                                    {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Check className="h-3.5 w-3.5" aria-hidden="true" />}
                                                </span>
                                            )}
                                            <span className="absolute bottom-1.5 left-1.5 rounded bg-black/50 px-1.5 py-px text-xs font-semibold text-white">Temsili görsel</span>
                                        </span>
                                        <span className="truncate text-xs font-semibold text-foreground">
                                            {image.title}
                                            <span className="hidden font-medium text-[#1E4FA0] group-hover:inline dark:text-sky-300"> · {actionHint}</span>
                                        </span>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        </div>
    );
}

/** Dosya seçme düğmesi + sürükle bırak alanı. */
export function UploadDrop({ busy, multiple = false, onFiles, compact = false }: { busy: boolean; multiple?: boolean; onFiles: (files: File[]) => void; compact?: boolean }) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [dragging, setDragging] = useState(false);
    const pick = (list: FileList | null) => {
        const files = Array.from(list ?? []).filter(f => !tooBig(f));
        if (files.length) onFiles(multiple ? files : files.slice(0, 1));
    };
    const onDrop = (e: DragEvent) => {
        e.preventDefault();
        setDragging(false);
        pick(e.dataTransfer.files);
    };
    return (
        <div onDragOver={e => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={onDrop}
            className={cn('flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed text-center', compact ? 'p-3' : 'p-5',
                dragging ? 'border-[#2B7FFF] bg-[#EAF2FF]' : 'border-[#C2B6A3] bg-[#F7F2EA] dark:bg-muted')}>
            <button type="button" disabled={busy} onClick={() => inputRef.current?.click()} className={ed.btnGold}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Camera className="h-4 w-4" aria-hidden="true" />}
                {busy ? 'Yükleniyor…' : 'Fotoğraf çek ya da yükle'}
            </button>
            <span className="text-xs text-muted-foreground">JPEG, PNG ya da WebP, en çok 10 MB · ya da dosyayı buraya sürükleyin</span>
            <input ref={inputRef} type="file" accept={ACCEPT} multiple={multiple} className="hidden"
                onChange={e => { pick(e.target.files); e.target.value = ''; }} />
        </div>
    );
}

/** Sekmeli seçici: "Hazır görseller | Kendi fotoğrafım" (Genel ayarlar → paylaşım görseli). */
export function PhotoPicker({ currentUrl, markLabel, actionHint, busy, onStock, onUpload }: {
    currentUrl: string; markLabel: string; actionHint: string; busy: boolean;
    onStock: (image: StockImage) => void; onUpload: (files: File[]) => void;
}) {
    const [source, setSource] = useState<'stock' | 'own'>('stock');
    return (
        <div className="flex flex-col gap-2.5">
            <div role="tablist" aria-label="Fotoğraf kaynağı" className={cn(ed.seg, 'grid grid-cols-2')}>
                {([['stock', 'Hazır görseller'], ['own', 'Kendi fotoğrafım']] as const).map(([key, label]) => (
                    <button key={key} type="button" role="tab" aria-selected={source === key} onClick={() => setSource(key)}
                        className={cn(ed.segItem, 'h-8 justify-center', source === key && ed.segOn)}>
                        {label}
                    </button>
                ))}
            </div>
            {source === 'stock'
                ? <StockGrid currentUrl={currentUrl} markLabel={markLabel} actionHint={actionHint} busy={busy} onPick={onStock} />
                : <UploadDrop busy={busy} onFiles={onUpload} />}
        </div>
    );
}
