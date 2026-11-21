import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { CalendarDays, ChevronLeft, Repeat, Search } from 'lucide-react';
import { toast } from 'sonner';
import type { Product } from '@/features/products/types';
import type { SetMenu } from '@/features/setMenus/types';
import type { Order } from '@/features/orders/types';
import type { Table } from '@/features/tables/types';
import { getApiErrorMessage } from '@/lib/apiError';
import { quickNotesFor } from '../waiterUi';
import { useWaiterMenu } from '../useWaiterMenu';
import { useKeyboardInset } from '../useKeyboardInset';
import {
    addOne, addSeparateLine, changeQuantity, lastRound, lineNote, linesFromItems, mergeLines, removeOne,
    setLineText, toggleChip, type CartLine,
} from '../orderCart';
import { clearDraft, readDraft, writeDraft } from '../orderDraft';
import { bumpUsage, frequentItems, readUsage } from '../productUsage';
import { sendToKitchen, type SetLineToSend } from '../sendOrder';
import {
    addOneSet, addSet, defaultSelections, mergeSetLines, removeOneSet, selectionsToSend, setLinesFromItems, setUnitPrice,
    updateSetLine, type SetCartLine,
} from '../setMenuCart';
import CategoryChips from './CategoryChips';
import ProductRow from './ProductRow';
import SetMenuRow from './SetMenuRow';
import SetMenuSheet from './SetMenuSheet';
import SendBar from './SendBar';
import type { LineNoteActions } from './LineNotesPanel';

interface Props {
    table: Table;
    order: Order | null;
    onBack: () => void;
    /** Geri düğmesinin erişilebilir adı; varsayılan "<masa> masasına dön". */
    backLabel?: string;
    /** Boş masa doğrudan buradan açıldıysa rezervasyona geçiş (yetki varsa). */
    onReserve?: () => void;
    /** Sipariş gönderildi (gerekirse masa açıldı); detay yenilenir. */
    onSent: () => void;
    /** Masa bu ekrandan açıldıysa liste hemen "Dolu" görsün. */
    onTableOpened: () => void;
}

/** Sanal kategori çipleri. */
const FREQUENT = 'frequent';
const ALL = 'all';
const SET_MENUS = 'set-menus';

const NO_LINES: CartLine[] = [];
const NO_SET_LINES: SetCartLine[] = [];

/** Listedeki bir satır: ürün ya da menü. "Sık satılanlar" ikisini birlikte sıralar. */
type MenuEntry =
    | { kind: 'product'; id: string; product: Product }
    | { kind: 'set'; id: string; setMenu: SetMenu };

/** Menü seçim penceresi: lineId null ise yeni satır, doluysa o satırın düzenlemesi. */
interface SetPicker { setMenuId: string; lineId: string | null; }

// Telefon · Ürün ekleme: ara, kategori seç, satıra dokunup ekle, gerekirse not yaz, "Mutfağa gönder".
// Masa değişince ekran o masanın taslağıyla sıfırdan kurulsun diye key masa kimliğidir.
export default function AddItemsView(props: Props) {
    return <AddItemsScreen key={props.table.id} {...props} />;
}

function AddItemsScreen({ table, order, onBack, backLabel, onReserve, onSent, onTableOpened }: Props) {
    const tableId = String(table.id);
    const { menu, loading } = useWaiterMenu();
    const { categories, products, setMenus } = menu;

    const [initialDraft] = useState(() => readDraft(tableId));
    const [lines, setLines] = useState<CartLine[]>(initialDraft?.lines ?? []);
    const [setMenuLines, changeSetMenuLines] = useState<SetCartLine[]>(initialDraft?.setLines ?? []);
    const [picker, setPicker] = useState<SetPicker | null>(null);
    const [orderNote, setOrderNote] = useState(initialDraft?.orderNote || order?.note || '');
    const [usage] = useState(readUsage);
    const [pickedCategory, setPickedCategory] = useState<string | null>(null);
    const [query, setQuery] = useState('');
    const [notesFor, setNotesFor] = useState<string | null>(null);
    const [sending, setSending] = useState(false);
    const keyboardInset = useKeyboardInset();

    // Sepet her değiştiğinde masanın taslağı güncellenir (boşsa silinir).
    useEffect(() => { writeDraft(tableId, { lines, setLines: setMenuLines, orderNote }); }, [tableId, lines, setMenuLines, orderNote]);

    const productById = useMemo(() => new Map(products.map(p => [p.id, p])), [products]);
    const setMenuById = useMemo(() => new Map(setMenus.map(s => [s.id, s])), [setMenus]);
    const categoryName = useMemo(() => new Map(categories.map(c => [c.id, c.name])), [categories]);
    const quickNotesOf = (product: Product) => quickNotesFor(categoryName.get(product.categoryId) ?? product.categoryName ?? '');

    const productEntries = useMemo(() => products.map((p): MenuEntry => ({ kind: 'product', id: p.id, product: p })), [products]);
    const setEntries = useMemo(() => setMenus.map((s): MenuEntry => ({ kind: 'set', id: s.id, setMenu: s })), [setMenus]);

    // "Sık satılanlar" veri varsa varsayılan seçimdir; yoksa "Tümü". "Menüler" yalnızca satışta menü varsa çıkar.
    const frequent = useMemo(() => frequentItems([...setEntries, ...productEntries], usage), [setEntries, productEntries, usage]);
    const categoryId = pickedCategory ?? (frequent.length > 0 ? FREQUENT : ALL);
    const categoryOptions = [
        ...(frequent.length > 0 ? [{ id: FREQUENT, name: 'Sık satılanlar' }] : []),
        { id: ALL, name: 'Tümü' },
        ...(setMenus.length > 0 ? [{ id: SET_MENUS, name: 'Menüler' }] : []),
        ...categories,
    ];

    // Aramada önce eşleşen menüler, sonra ürünler.
    const visible = useMemo((): MenuEntry[] => {
        const q = query.trim().toLocaleLowerCase('tr-TR');
        const nameOf = (entry: MenuEntry) => (entry.kind === 'set' ? entry.setMenu.name : entry.product.name);
        if (q) return [...setEntries, ...productEntries].filter(e => nameOf(e).toLocaleLowerCase('tr-TR').includes(q));
        if (categoryId === FREQUENT) return frequent;
        if (categoryId === ALL) return productEntries;
        if (categoryId === SET_MENUS) return setEntries;
        return productEntries.filter(e => e.kind === 'product' && e.product.categoryId === categoryId);
    }, [productEntries, setEntries, frequent, query, categoryId]);

    const linesByProduct = useMemo(() => {
        const map = new Map<string, CartLine[]>();
        for (const line of lines) map.set(line.productId, [...(map.get(line.productId) ?? []), line]);
        return map;
    }, [lines]);

    const setLinesByMenu = useMemo(() => {
        const map = new Map<string, SetCartLine[]>();
        for (const line of setMenuLines) map.set(line.setMenuId, [...(map.get(line.setMenuId) ?? []), line]);
        return map;
    }, [setMenuLines]);

    // Yalnızca menüde (aktif) olan ürünlerin ve satıştaki menülerin satırları sayılır ve gönderilir.
    const cartLines = lines.filter(l => productById.has(l.productId));
    const cartSetLines = setMenuLines.filter(l => setMenuById.has(l.setMenuId));
    const cartCount = [...cartLines, ...cartSetLines].reduce((sum, l) => sum + l.quantity, 0);
    const cartTotal = cartLines.reduce((sum, l) => sum + l.quantity * (productById.get(l.productId)?.price ?? 0), 0)
        + cartSetLines.reduce((sum, l) => sum + l.quantity * setUnitPrice(setMenuById.get(l.setMenuId)!, l.selections), 0);
    const noteCount = cartLines.filter(l => lineNote(l)).length + cartSetLines.filter(l => l.note.trim()).length;

    const previousRound = useMemo(() => lastRound(order), [order]);

    // Satır kimliğiyle çalışan not işlemleri; ürüne bağlı olanlar (ekle/azalt/ayrı satır) listede verilir.
    const lineActions: Omit<LineNoteActions, 'onAddSeparate'> = {
        onLineQuantity: (lineId, delta) => setLines(prev => changeQuantity(prev, lineId, delta)),
        onToggleChip: (lineId, chip) => setLines(prev => toggleChip(prev, lineId, chip)),
        onLineText: (lineId, text) => setLines(prev => setLineText(prev, lineId, text)),
    };

    // Menüye dokunuş: sepetteyse son satırına 1 ekler; değilse varsayılanlarla ekler. Bir bölümün varsayılanı
    // yoksa seçim penceresi açılır.
    const tapSetMenu = (setMenu: SetMenu) => {
        const defaults = defaultSelections(setMenu);
        if (!setLinesByMenu.has(setMenu.id) && !defaults) {
            setPicker({ setMenuId: setMenu.id, lineId: null });
            return;
        }
        changeSetMenuLines(prev => addOneSet(prev, setMenu.id, defaults ?? {}));
    };

    // Pencere kapanınca düzenleme sonucu aynı seçimli olan satırlar birleşir.
    const closePicker = () => {
        setPicker(null);
        changeSetMenuLines(prev => mergeSetLines(prev));
    };

    const repeatLastRound = () => {
        const added = linesFromItems(previousRound, productId => {
            const product = productById.get(productId);
            // Tükenen ürün son turdan tekrar eklenmez.
            return product && !product.isOutOfStock ? quickNotesOf(product) : null;
        });
        const addedSets = setLinesFromItems(previousRound, setMenuById);
        if (added.length === 0 && addedSets.length === 0) {
            toast.error('Son turdaki ürünler artık menüde yok ya da tükendi.');
            return;
        }
        setLines(prev => mergeLines([...prev, ...added]));
        changeSetMenuLines(prev => mergeSetLines([...prev, ...addedSets]));
        const count = [...added, ...addedSets].reduce((sum, l) => sum + l.quantity, 0);
        toast.success(`Son tur sepete eklendi (${count} ürün).`);
    };

    const send = async () => {
        if (cartCount === 0 || sending) return;
        setSending(true);
        try {
            const toSend = mergeLines(cartLines);
            const setsToSend: SetLineToSend[] = cartSetLines.map(line => {
                const setMenu = setMenuById.get(line.setMenuId)!;
                return {
                    lineId: line.id,
                    setMenuId: line.setMenuId,
                    name: setMenu.name,
                    quantity: line.quantity,
                    note: line.note,
                    selections: selectionsToSend(setMenu, line.selections),
                };
            });
            const failures = await sendToKitchen({ tableId, order, orderNote, lines: toSend, setLines: setsToSend, onTableOpened });

            // Gönderilenler sepetten çıkar; başarısız olanlar ve gönderim sürerken eklenenler kalır.
            const productsFailed = failures.some(f => f.products);
            const failedSetIds = new Set(failures.map(f => f.setLineId));
            const sentProductLines = productsFailed ? [] : cartLines;
            const sentSetLines = cartSetLines.filter(l => !failedSetIds.has(l.id));
            const sentLineIds = new Set([...sentProductLines, ...sentSetLines].map(l => l.id));
            setLines(prev => prev.filter(l => !sentLineIds.has(l.id)));
            changeSetMenuLines(prev => prev.filter(l => !sentLineIds.has(l.id)));
            bumpUsage([
                ...(productsFailed ? [] : toSend.map(l => ({ id: l.productId, quantity: l.quantity }))),
                ...sentSetLines.map(l => ({ id: l.setMenuId, quantity: l.quantity })),
            ]);
            const sentCount = [...sentProductLines, ...sentSetLines].reduce((sum, l) => sum + l.quantity, 0);

            if (failures.length === 0) {
                clearDraft(tableId);
                toast.success(`${table.name} → ${sentCount} ürün mutfağa gönderildi.`);
                onSent();
                return;
            }
            // Kısmi hata: ekranda kalınır; garson kalan satırları görüp yeniden gönderir.
            if (sentCount > 0) toast.success(`${table.name} → ${sentCount} ürün mutfağa gönderildi.`);
            toast.error(`Gönderilemedi: ${failures.map(f => f.label).join(', ')}. Sepette duruyor, tekrar deneyin.`, {
                description: failures.map(f => f.message).join(' · '),
            });
        } catch (err) {
            // Masa açılamadı: hiçbir şey gitmedi, sepet olduğu gibi durur.
            toast.error(getApiErrorMessage(err, 'Sipariş gönderilemedi. Sepet duruyor, tekrar deneyin.'));
        } finally {
            setSending(false);
        }
    };

    const pickerMenu = picker ? setMenuById.get(picker.setMenuId) : undefined;
    const pickerLine = picker?.lineId ? setMenuLines.find(l => l.id === picker.lineId) ?? null : null;

    return (
        <div className="relative flex h-full min-h-0 flex-col bg-[#F5F0E8] dark:bg-background">
            <header className="flex shrink-0 flex-col gap-3 px-4 pt-3 pb-2.5">
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={onBack}
                        aria-label={backLabel ?? `${table.name} masasına dön`}
                        className="-ml-2 flex size-12 items-center justify-center rounded-full text-foreground hover:bg-muted"
                    >
                        <ChevronLeft className="size-6" aria-hidden="true" />
                    </button>
                    <div className="flex min-w-0 flex-col">
                        <span className="truncate text-[13px] font-medium text-rb-text-sub">{table.name} · {table.regionName}</span>
                        <h2 className="font-serif text-[28px] font-bold leading-none text-foreground">Ürün ekle</h2>
                    </div>
                    {previousRound.length > 0 && (
                        <HeaderButton onClick={repeatLastRound} disabled={loading} icon={<Repeat className="size-4.5" aria-hidden="true" />}>
                            Aynısından
                        </HeaderButton>
                    )}
                    {onReserve && (
                        <HeaderButton onClick={onReserve} icon={<CalendarDays className="size-4.5" aria-hidden="true" />}>
                            Rezerve et
                        </HeaderButton>
                    )}
                </div>
                <label className="relative block">
                    <span className="sr-only">Ürün ara</span>
                    <Search className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-rb-text-sub" aria-hidden="true" />
                    <input
                        type="search"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder="Ürün ara (ör. latte)"
                        className="h-12 w-full rounded-2xl border border-border bg-card pr-3 pl-11 text-base text-foreground outline-none placeholder:text-rb-text-muted focus:ring-2 focus:ring-ring"
                    />
                </label>
                {!query && <CategoryChips options={categoryOptions} selectedId={categoryId} onSelect={setPickedCategory} />}
            </header>

            <main className="min-h-0 flex-1 overflow-y-auto px-4 pt-1 pb-4">
                {loading ? (
                    <div className="flex flex-col gap-2">
                        {[...Array(6)].map((_, i) => <div key={i} className="h-18 animate-pulse rounded-2xl bg-muted" />)}
                    </div>
                ) : visible.length === 0 ? (
                    <p className="py-10 text-center text-sm text-rb-text-sub">{query ? `"${query}" için ürün bulunamadı.` : 'Bu kategoride ürün yok.'}</p>
                ) : (
                    <ul className="flex flex-col gap-2">
                        {visible.map(entry => entry.kind === 'set' ? (
                            <SetMenuRow
                                key={entry.id}
                                setMenu={entry.setMenu}
                                lines={setLinesByMenu.get(entry.id) ?? NO_SET_LINES}
                                onAdd={() => tapSetMenu(entry.setMenu)}
                                onRemove={() => changeSetMenuLines(prev => removeOneSet(prev, entry.id))}
                                onEdit={lineId => setPicker({ setMenuId: entry.id, lineId })}
                                onAddDifferent={() => setPicker({ setMenuId: entry.id, lineId: null })}
                            />
                        ) : (
                            <ProductRow
                                key={entry.id}
                                product={entry.product}
                                lines={linesByProduct.get(entry.id) ?? NO_LINES}
                                quickNotes={quickNotesOf(entry.product)}
                                notesOpen={notesFor === entry.id}
                                onToggleNotes={() => setNotesFor(current => (current === entry.id ? null : entry.id))}
                                onAdd={() => setLines(prev => addOne(prev, entry.id))}
                                onRemove={() => setLines(prev => removeOne(prev, entry.id))}
                                {...lineActions}
                                onAddSeparate={() => setLines(prev => addSeparateLine(prev, entry.id))}
                            />
                        ))}
                    </ul>
                )}
                {cartCount > 0 && (
                    <label className="mt-4 block">
                        <span className="mb-1.5 block text-[13px] font-semibold text-rb-text-sub">Sipariş notu (isteğe bağlı)</span>
                        <textarea
                            value={orderNote}
                            onChange={e => setOrderNote(e.target.value)}
                            rows={2}
                            maxLength={500}
                            placeholder="Tüm masa için, ör. çocuk sandalyesi"
                            className="w-full resize-none rounded-2xl border border-border bg-card px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                        />
                    </label>
                )}
            </main>

            <SendBar
                count={cartCount}
                noteCount={noteCount}
                total={cartTotal}
                sending={sending}
                keyboardInset={keyboardInset}
                onSend={() => void send()}
            />

            {picker && pickerMenu && (
                <SetMenuSheet
                    key={`${picker.setMenuId}:${picker.lineId ?? 'new'}`}
                    setMenu={pickerMenu}
                    line={pickerLine}
                    onChange={(selections, note) => {
                        if (picker.lineId) changeSetMenuLines(prev => updateSetLine(prev, picker.lineId!, { selections, note }));
                    }}
                    onAdd={(selections, note) => changeSetMenuLines(prev => addSet(prev, pickerMenu.id, selections, note))}
                    onClose={closePicker}
                />
            )}
        </div>
    );
}

function HeaderButton({ onClick, disabled, icon, children }: {
    onClick: () => void;
    disabled?: boolean;
    icon: ReactNode;
    children: ReactNode;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className="ml-auto inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border border-border bg-card px-3.5 text-sm font-semibold text-foreground hover:bg-muted disabled:opacity-50"
        >
            {icon}
            {children}
        </button>
    );
}
