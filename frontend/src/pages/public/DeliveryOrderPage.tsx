import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Clock, MapPin, Minus, Plus, ShoppingBag, Store } from 'lucide-react';
import { publicService } from '@/features/customerSite/api/publicService';
import { publicDeliveryService } from '@/features/delivery/api/publicDeliveryService';
import {
    addLine, changeQuantity, clearCart, estimatedSubtotal, itemCount, loadBranchChoice, loadCart, loadRecentOrders,
    newClientRequestId, productKey, pruneUnavailable, quantityOf, rememberOrder, saveBranchChoice, saveCart, selectionNames,
    setLineNote, setMenuKey, setMenuUnitPrice, toCartInput, type DeliveryCartLine, type RecentDeliveryOrder,
} from '@/features/delivery/deliveryCart';
import type {
    CartLineInput, DeliveryQuote, OnlineMenuProduct, OnlineOrdering, OnlineSetMenu, SubmittedDeliveryOrder,
} from '@/features/delivery/types';
import { getApiErrorMessage } from '@/lib/apiError';
import { formatPrice } from '@/lib/format';
import { cn } from '@/lib/utils';
import DeliveryMenu from './delivery/DeliveryMenu';
import DeliverySetMenuSheet from './delivery/DeliverySetMenuSheet';
import DeliveryCheckout from './delivery/DeliveryCheckout';
import Sheet from './delivery/Sheet';
import { SITE_FONTS_HREF, headingFont, siteRootStyle, telHref } from './site/siteTheme';

const QUOTE_DEBOUNCE_MS = 400;

function timeOfDay(iso: string): string {
    return new Date(iso).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

// Online paket sipariş sayfası (/siparis, restoranın alan adında). Sıra: şube (birden fazlaysa) → mahalle (ücret ve en az
// tutar) → menü → sepet → teslimat bilgileri. Sepet, mahalle ve gönderim anahtarı (clientRequestId) cihazda şube başına
// saklanır; gönderim anahtarı sipariş açılana kadar değişmez, bağlantı kopunca yeniden göndermek aynı siparişi döndürür.
// Gösterilen tutarlar sunucunun teklifidir (quote); kapalı/durdurulmuş restoranda menü görünür ama sipariş gönderilmez.
export default function DeliveryOrderPage() {
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const [data, setData] = useState<OnlineOrdering | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    // ?sube=<id>: masa QR'ının "Paket servis" bağlantısı şubeyi verir; yoksa bu cihazda son seçilen şube.
    const [branchId, setBranchId] = useState<string | null>(() => params.get('sube') || loadBranchChoice());
    const [pickingBranch, setPickingBranch] = useState(false);
    const [site, setSite] = useState<{ name: string; accent?: string } | null>(null);

    const [lines, setLines] = useState<DeliveryCartLine[]>([]);
    const [zoneId, setZoneId] = useState<string | null>(null);
    const [clientRequestId, setClientRequestId] = useState<string>(() => newClientRequestId());
    const [cartReady, setCartReady] = useState(false);
    const [prunedCount, setPrunedCount] = useState(0);

    const [quote, setQuote] = useState<{ key: string; value: DeliveryQuote } | null>(null);
    const [quoteError, setQuoteError] = useState<string | null>(null);
    const [quoting, setQuoting] = useState(false);
    const quoteSeq = useRef(0);

    const [cartOpen, setCartOpen] = useState(false);
    const [checkoutOpen, setCheckoutOpen] = useState(false);
    const [setMenuOpen, setSetMenuOpen] = useState<OnlineSetMenu | null>(null);
    const [recent] = useState<RecentDeliveryOrder[]>(() => loadRecentOrders());

    // ── Yükleme ──
    // Yalnızca istek sonunda state yazar; yeniden yüklemeden önce ekranı sıfırlamak çağıranın işi (resetForLoad).
    const load = useCallback((requestedBranch: string | null) => {
        publicDeliveryService.getOnlineOrdering(requestedBranch ?? undefined)
            .then(result => {
                // Kayıtlı şube artık online sipariş almıyorsa varsayılana dönülür.
                if (requestedBranch && result.branches.length > 0 && !result.branches.some(b => b.id === requestedBranch)) {
                    setBranchId(null);
                    return;
                }
                setData(result);
                setLoadError(null);
                if (requestedBranch) saveBranchChoice(result.branchId);
                const stored = loadCart(result.branchId);
                const pruned = pruneUnavailable(stored?.lines ?? [], result.categories, result.setMenus);
                setLines(pruned.lines);
                setPrunedCount(pruned.removed);
                setClientRequestId(stored?.clientRequestId ?? newClientRequestId());
                const zones = result.zones;
                setZoneId(stored?.zoneId && zones.some(z => z.id === stored.zoneId) ? stored.zoneId : zones.length === 1 ? zones[0].id : null);
                setQuote(null);
                setCartReady(true);
            })
            .catch(err => setLoadError(getApiErrorMessage(err, 'Sipariş sayfası yüklenemedi. İnternet bağlantınızı kontrol edip yenileyin.')));
        publicService.getSite(requestedBranch ?? undefined)
            .then(s => setSite({ name: s.companyName || s.branchName, accent: s.site.accentColor }))
            .catch(() => {});
    }, []);

    useEffect(() => { load(branchId); }, [branchId, load]);

    // Birden fazla şube varken müşteri henüz seçmediyse önce şube seçilir.
    const needsBranchChoice = !!data && data.branches.length > 1 && !branchId;

    // ── Sepeti sakla ──
    useEffect(() => {
        if (!data || !cartReady) return;
        saveCart(data.branchId, { lines, zoneId, clientRequestId });
    }, [data, cartReady, lines, zoneId, clientRequestId]);

    // ── Sunucu teklifi (fiyat, ücret, en az tutar) ──
    // Notlar fiyatı değiştirmez: not yazarken teklif yeniden istenmez.
    const quoteKey = useMemo(
        () => JSON.stringify({ zoneId, lines: toCartInput(lines).map(l => ({ ...l, note: undefined })) }),
        [zoneId, lines],
    );
    const hasLines = lines.length > 0;

    useEffect(() => {
        if (!data || !hasLines) return;
        const seq = ++quoteSeq.current;
        const request = JSON.parse(quoteKey) as { zoneId: string | null; lines: CartLineInput[] };
        const timer = setTimeout(() => {
            setQuoting(true);
            publicDeliveryService.quote(data.branchId, request.zoneId, request.lines)
                .then(value => {
                    if (seq !== quoteSeq.current) return;
                    setQuote({ key: quoteKey, value });
                    setQuoteError(null);
                })
                .catch(err => {
                    if (seq !== quoteSeq.current) return;
                    setQuote(null);
                    setQuoteError(getApiErrorMessage(err, 'Sepet tutarı hesaplanamadı. Bağlantınızı kontrol edin.'));
                })
                .finally(() => { if (seq === quoteSeq.current) setQuoting(false); });
        }, QUOTE_DEBOUNCE_MS);
        return () => clearTimeout(timer);
    }, [data, quoteKey, hasLines]);

    const currentQuote = quote && quote.key === quoteKey && lines.length > 0 ? quote.value : null;

    // ── Sepet işlemleri ──
    const addProduct = (product: OnlineMenuProduct) => {
        if (product.isOutOfStock) return;
        setLines(prev => addLine(prev, {
            key: productKey(product.id), kind: 'product', productId: product.id, name: product.name, unitPrice: product.price,
            note: '', selections: {}, selectionNames: [],
        }));
    };
    const removeProduct = (product: OnlineMenuProduct) => setLines(prev => changeQuantity(prev, productKey(product.id), -1));
    const addSetMenu = (menu: OnlineSetMenu, selections: Record<string, string>, quantity: number, note: string) => {
        const key = setMenuKey(menu.id, selections) + (note ? `:${note}` : '');
        setLines(prev => addLine(prev, {
            key, kind: 'setMenu', setMenuId: menu.id, name: menu.name, unitPrice: setMenuUnitPrice(menu, selections),
            note, selections, selectionNames: selectionNames(menu, selections),
        }, quantity));
        setSetMenuOpen(null);
    };

    const onSubmitted = (result: SubmittedDeliveryOrder) => {
        if (!data) return;
        rememberOrder({ token: result.token, number: result.number, createdAt: new Date().toISOString() });
        clearCart(data.branchId);
        setLines([]);
        setClientRequestId(newClientRequestId());
        setCheckoutOpen(false);
        setCartOpen(false);
        navigate(`/siparis/takip/${encodeURIComponent(result.token)}`);
    };

    const resetForLoad = () => {
        setData(null);
        setLoadError(null);
        setCartReady(false);
    };

    const chooseBranch = (id: string) => {
        saveBranchChoice(id);
        setPickingBranch(false);
        setCartOpen(false);
        if (id === branchId) return;
        resetForLoad();
        setBranchId(id);
    };

    // ── Görünüm ──
    const root = (children: ReactNode) => (
        <div style={siteRootStyle(site?.accent)} className="min-h-screen bg-[var(--site-bg)]">
            <link rel="stylesheet" href={SITE_FONTS_HREF} precedence="default" />
            {children}
        </div>
    );

    if (loadError) {
        return root(
            <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
                <h1 className={cn(headingFont, 'text-3xl font-bold')}>Sipariş sayfası açılamadı</h1>
                <p className="mt-2 max-w-sm text-base text-[var(--site-sub)]">{loadError}</p>
                <button type="button" onClick={() => { resetForLoad(); load(branchId); }} className="mt-6 h-12 rounded-full bg-[var(--site-paper)] px-6 font-semibold text-[var(--site-on-paper)]">Tekrar dene</button>
                <Link to="/" className="mt-3 text-sm font-semibold text-[var(--site-sub)] underline">Ana sayfa</Link>
            </main>
        );
    }

    if (!data) {
        return root(
            <main className="min-h-screen px-4 py-6" aria-busy="true">
                <div className="h-8 w-48 animate-pulse rounded-lg bg-[var(--site-raised)]" />
                <div className="mt-6 space-y-3">
                    {[...Array(6)].map((_, i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-[var(--site-raised)]" />)}
                </div>
            </main>
        );
    }

    const restaurant = site?.name || data.branchName;
    const multiBranch = data.branches.length > 1;

    if (needsBranchChoice || pickingBranch) {
        return root(
            <main className="mx-auto min-h-screen max-w-xl px-4 py-6">
                <Header restaurant={restaurant} subtitle="Paket sipariş" />
                <h2 className={cn(headingFont, 'mt-6 text-2xl font-bold')}>Hangi şubeden sipariş vermek istersiniz?</h2>
                <ul className="mt-4 flex flex-col gap-2.5">
                    {data.branches.map(b => (
                        <li key={b.id}>
                            <button type="button" onClick={() => chooseBranch(b.id)}
                                className={cn('flex min-h-16 w-full items-center gap-3 rounded-2xl border px-4 text-left transition-colors hover:border-[var(--site-accent)]',
                                    b.id === data.branchId && !needsBranchChoice ? 'border-[var(--site-accent)]' : 'border-[var(--site-border-strong)]')}>
                                <Store className="h-5 w-5 shrink-0 text-[var(--site-sub)]" aria-hidden="true" />
                                <span className="min-w-0">
                                    <span className="block text-base font-semibold">{b.name}</span>
                                    {b.district && <span className="block text-sm text-[var(--site-sub)]">{b.district}</span>}
                                </span>
                            </button>
                        </li>
                    ))}
                </ul>
                {pickingBranch && (
                    <button type="button" onClick={() => setPickingBranch(false)} className="mt-4 h-11 text-sm font-semibold text-[var(--site-sub)] underline">Vazgeç</button>
                )}
            </main>
        );
    }

    const open = data.state === 'open';
    const zone = data.zones.find(z => z.id === zoneId) ?? null;
    const count = itemCount(lines);
    const estimate = estimatedSubtotal(lines);
    const subtotal = currentQuote?.subtotal ?? estimate;
    const fee = currentQuote?.deliveryFee ?? zone?.fee ?? 0;
    const total = currentQuote?.total ?? subtotal + fee;
    const amountToMinimum = currentQuote ? currentQuote.amountToMinimum : zone ? Math.max(0, zone.minOrderAmount - estimate) : 0;
    const canCheckout = open && !!zone && !!currentQuote && currentQuote.meetsMinimum && !quoteError;

    const checkoutHint = !open ? 'Restoran şu an sipariş almıyor.'
        : !zone ? 'Devam etmek için teslimat mahallenizi seçin.'
            : amountToMinimum > 0 ? `Minimum sepet tutarına ${formatPrice(amountToMinimum)} ₺ kaldı.`
                : quoteError ?? (quoting || !currentQuote ? 'Tutar hesaplanıyor…' : null);

    return root(
        <main className="min-h-screen pb-40">
            <div className="border-b border-[var(--site-border)] px-4 py-4">
                <Header
                    restaurant={restaurant}
                    subtitle={multiBranch ? `Paket sipariş · ${data.branchName}` : 'Paket sipariş'}
                    action={multiBranch ? (
                        <button type="button" onClick={() => setPickingBranch(true)}
                            className="flex h-11 items-center rounded-full border border-[var(--site-border-strong)] px-3.5 text-sm font-semibold hover:bg-[var(--site-raised)]">
                            Şube değiştir
                        </button>
                    ) : null}
                />
            </div>

            <div className="mx-auto flex max-w-3xl flex-col gap-3 px-4 pt-4 md:px-6">
                {recent.length > 0 && (
                    <nav aria-label="Son siparişleriniz" className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="text-[var(--site-sub)]">Siparişleriniz:</span>
                        {recent.map(o => (
                            <Link key={o.token} to={`/siparis/takip/${encodeURIComponent(o.token)}`}
                                className="rounded-full border border-[var(--site-border-strong)] px-3 py-1.5 font-semibold text-[var(--site-text)] no-underline hover:border-[var(--site-accent)]">
                                #{o.number} takip →
                            </Link>
                        ))}
                    </nav>
                )}

                {!open && <StateBanner data={data} />}

                {prunedCount > 0 && (
                    <p className="rounded-2xl bg-[var(--site-raised)] px-4 py-3 text-sm">
                        Sepetinizdeki {prunedCount} ürün artık sipariş verilemediği için çıkarıldı.
                    </p>
                )}

                {data.state !== 'disabled' && (
                    <section aria-label="Teslimat mahallesi" className="rounded-2xl border border-[var(--site-border-strong)] p-4">
                        <label htmlFor="mahalle" className="flex items-center gap-2 text-sm font-semibold">
                            <MapPin className="h-4 w-4 text-[var(--site-accent)]" aria-hidden="true" />Teslimat mahallesi
                        </label>
                        {data.zones.length === 0 ? (
                            <p className="mt-1.5 text-sm text-[var(--site-sub)]">Restoran henüz teslimat bölgesi tanımlamadı.</p>
                        ) : (
                            <>
                                <select
                                    id="mahalle"
                                    value={zoneId ?? ''}
                                    onChange={e => setZoneId(e.target.value || null)}
                                    className="mt-1.5 h-12 w-full rounded-xl border border-[var(--site-border-strong)] bg-[var(--site-bg)] px-3 text-[15px] focus:outline-none focus:ring-2 focus:ring-[var(--site-accent)]"
                                >
                                    <option value="">Mahallenizi seçin</option>
                                    {data.zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                                </select>
                                {zone ? (
                                    <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm text-[var(--site-sub)]">
                                        {open && data.lastOrderAt && <span>Bugün son sipariş {timeOfDay(data.lastOrderAt)}</span>}
                                        <span>Teslimat {zone.fee > 0 ? `${formatPrice(zone.fee)} ₺` : 'ücretsiz'}</span>
                                        {zone.minOrderAmount > 0 && <span>En az sepet {formatPrice(zone.minOrderAmount)} ₺</span>}
                                        <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" aria-hidden="true" />~{zone.estimatedMinutes} dk</span>
                                    </p>
                                ) : (
                                    <p className="mt-2 text-sm text-[var(--site-sub)]">Listede olmayan mahalleye teslimat yapılmıyor.</p>
                                )}
                            </>
                        )}
                    </section>
                )}
            </div>

            {data.state !== 'disabled' && (
                <div className="mx-auto max-w-3xl">
                    <DeliveryMenu
                        categories={data.categories}
                        setMenus={data.setMenus}
                        productQuantity={id => quantityOf(lines, l => l.productId === id && l.kind === 'product')}
                        setMenuQuantity={id => quantityOf(lines, l => l.setMenuId === id)}
                        onAddProduct={addProduct}
                        onRemoveProduct={removeProduct}
                        onOpenSetMenu={setSetMenuOpen}
                    />
                </div>
            )}

            {count > 0 && (
                <div className="fixed inset-x-0 bottom-0 z-20 border-t border-[var(--site-border)] bg-[var(--site-bg)] px-4 pb-5 pt-3">
                    <div className="mx-auto max-w-3xl">
                        {checkoutHint && <p className="mb-2.5 text-center text-[13px] font-medium text-[var(--site-muted)]">{checkoutHint}</p>}
                        <button type="button" onClick={() => setCartOpen(true)}
                            className="flex h-14 w-full items-center justify-between rounded-full bg-[var(--site-accent)] px-6 text-[var(--site-on-accent)] transition-opacity hover:opacity-90">
                            <span className="flex items-center gap-2.5 text-base font-semibold">
                                <ShoppingBag className="h-5 w-5" aria-hidden="true" />Sepeti gör · {count} ürün
                            </span>
                            <span className={cn(headingFont, 'text-lg font-bold tabular-nums')}>{formatPrice(total)} ₺</span>
                        </button>
                    </div>
                </div>
            )}

            {cartOpen && (
                <Sheet
                    title="Sepetiniz"
                    onClose={() => setCartOpen(false)}
                    footer={(
                        <>
                            <dl className="mb-3 space-y-1 text-[15px]">
                                <div className="flex justify-between"><dt className="text-[var(--site-sub)]">Ara toplam</dt><dd className="tabular-nums">{formatPrice(subtotal)} ₺</dd></div>
                                <div className="flex justify-between"><dt className="text-[var(--site-sub)]">Teslimat{zone ? ` (${zone.name})` : ''}</dt><dd className="tabular-nums">{zone ? `${formatPrice(fee)} ₺` : '—'}</dd></div>
                                <div className={cn(headingFont, 'flex justify-between text-xl font-bold')}><dt>Toplam</dt><dd className="tabular-nums">{formatPrice(total)} ₺</dd></div>
                            </dl>
                            {checkoutHint && (
                                <p className={cn('mb-3 rounded-xl px-3 py-2.5 text-sm font-medium',
                                    quoteError ? 'border border-[var(--site-error-line)] bg-[var(--site-error-bg)] text-[var(--site-error)]' : 'bg-[var(--site-raised)]')}>
                                    {checkoutHint}
                                </p>
                            )}
                            <button type="button" disabled={!canCheckout} onClick={() => { setCartOpen(false); setCheckoutOpen(true); }}
                                className="flex h-14 w-full items-center justify-center rounded-full bg-[var(--site-accent)] text-base font-semibold text-[var(--site-on-accent)] transition-opacity hover:opacity-90 disabled:opacity-50">
                                Devam et
                            </button>
                        </>
                    )}
                >
                    {lines.length === 0 ? (
                        <p className="py-8 text-center text-base text-[var(--site-sub)]">Sepetiniz boş.</p>
                    ) : (
                        <ul className="divide-y divide-[var(--site-border)]">
                            {lines.map((line, i) => {
                                const quoted = currentQuote && currentQuote.lines.length === lines.length ? currentQuote.lines[i] : null;
                                return (
                                    <li key={line.key} className="py-3">
                                        <div className="flex items-center gap-3">
                                            <div className="min-w-0 flex-1">
                                                <p className="text-[15px] font-semibold">{line.name}</p>
                                                {line.selectionNames.length > 0 && <p className="text-sm text-[var(--site-sub)]">{line.selectionNames.join(', ')}</p>}
                                                <p className="text-sm tabular-nums text-[var(--site-sub)]">{formatPrice(quoted?.lineTotal ?? line.unitPrice * line.quantity)} ₺</p>
                                            </div>
                                            <div className="flex shrink-0 items-center gap-1 rounded-full bg-[var(--site-raised)] p-0.5">
                                                <button type="button" onClick={() => setLines(prev => changeQuantity(prev, line.key, -1))} aria-label={`${line.name} bir azalt`}
                                                    className="flex h-11 w-11 items-center justify-center rounded-full"><Minus className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" /></button>
                                                <span className="min-w-5 text-center text-base font-bold">{line.quantity}</span>
                                                <button type="button" onClick={() => setLines(prev => changeQuantity(prev, line.key, 1))} aria-label={`${line.name} bir artır`}
                                                    className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--site-accent)] text-[var(--site-on-accent)]"><Plus className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" /></button>
                                            </div>
                                        </div>
                                        {line.kind === 'product' && (
                                            <input
                                                value={line.note}
                                                onChange={e => setLines(prev => setLineNote(prev, line.key, e.target.value))}
                                                maxLength={300}
                                                placeholder="Not ekle (ör. acısız)"
                                                aria-label={`${line.name} için not`}
                                                className="mt-2 h-11 w-full rounded-xl border border-[var(--site-border-strong)] bg-[var(--site-bg)] px-3 text-[15px] focus:outline-none focus:ring-2 focus:ring-[var(--site-accent)]"
                                            />
                                        )}
                                        {line.kind === 'setMenu' && line.note && <p className="mt-1 text-sm text-[var(--site-sub)]">Not: {line.note}</p>}
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </Sheet>
            )}

            {checkoutOpen && zone && currentQuote && (
                <DeliveryCheckout
                    data={data}
                    zone={zone}
                    lines={lines}
                    quote={currentQuote}
                    clientRequestId={clientRequestId}
                    onQuoteChanged={value => setQuote({ key: quoteKey, value })}
                    onSubmitted={onSubmitted}
                    onClose={() => setCheckoutOpen(false)}
                />
            )}

            {setMenuOpen && (
                <DeliverySetMenuSheet
                    menu={setMenuOpen}
                    onClose={() => setSetMenuOpen(null)}
                    onAdd={(selections, quantity, note) => addSetMenu(setMenuOpen, selections, quantity, note)}
                />
            )}
        </main>
    );
}

function Header({ restaurant, subtitle, action }: { restaurant: string; subtitle: string; action?: ReactNode }) {
    return (
        <header className="mx-auto flex max-w-3xl items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
                <Link to="/" aria-label="Restoranın ana sayfası" className="-ml-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[var(--site-text)] hover:bg-[var(--site-raised)]">
                    <ArrowLeft className="h-5 w-5" aria-hidden="true" />
                </Link>
                <div className="min-w-0">
                    <h1 className={cn(headingFont, 'truncate text-xl font-bold')}>{restaurant}</h1>
                    <p className="truncate text-sm text-[var(--site-sub)]">{subtitle}</p>
                </div>
            </div>
            {action}
        </header>
    );
}

/** Kapalı / durdurulmuş / online sipariş almıyor. Mesaj sunucudan gelir ve şubenin yerel saatiyle yazılmıştır. */
function StateBanner({ data }: { data: OnlineOrdering }) {
    const title = data.state === 'paused' ? 'Şu an sipariş alamıyoruz'
        : data.state === 'closed' ? 'Şu an kapalıyız'
            : 'Online sipariş kapalı';
    return (
        <div role="status" className="rounded-2xl border border-[var(--site-error-line)] bg-[var(--site-error-bg)] px-4 py-3 text-[var(--site-error)]">
            <p className="font-semibold">{title}</p>
            {data.message && <p className="mt-0.5 text-sm">{data.message}</p>}
            {data.restaurantPhone && (
                <p className="mt-1 text-sm">Telefonla sipariş: <a className="font-semibold underline" href={telHref(data.restaurantPhone)}>{data.restaurantPhone}</a></p>
            )}
        </div>
    );
}
