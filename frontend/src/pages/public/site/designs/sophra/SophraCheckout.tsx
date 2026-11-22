import { useState } from 'react';
import { foldSearch, opensText, zoneFacts } from '@/features/delivery/deliveryText';
import type { OrderSession } from '@/features/delivery/useOrderSession';
import { cn } from '@/lib/utils';
import DeliveryCheckout from '../../../delivery/DeliveryCheckout';
import { MinimumProgress } from '../../../delivery/DeliveryOrderParts';
import { serif } from '../../siteParts';
import { directionsUrl } from '../../siteTheme';
import { BagGlyph, ClockGlyph, DirectionsGlyph, PinGlyph } from './SophraIcons';
import { CartTotalsBlock, SpModal, type CartSummary } from './SophraMenuParts';
import { spButton } from './sophraParts';

// Sophra'nın adımlı ödemesi. 1) Şube (birden fazlaysa), teslimat şekli (Adrese teslim: mahalle, ücret, süre, en az tutar;
// Gel al: restoranın adresi, "En kısa sürede (~N dk)"), sunucu teklifiyle toplam. 2) Bilgiler ve ödeme: /siparis'in
// DeliveryCheckout'u (ad, telefon, adres, tarif, not, yalnız açık ödeme yöntemleri, isteğe bağlı IBAN, SMS kodu, bot tuzağı,
// tekrar gönderime karşı clientRequestId, fiyat değiştiyse 409 ve yeni toplam). Onay: takip sayfası (/siparis/takip/:token).

const ZONE_SEARCH_FROM = 7;

export function SophraCheckout({ session, summary, onClose }: { session: OrderSession; summary: CartSummary; onClose: () => void }) {
    const [step, setStep] = useState<'teslimat' | 'bilgiler'>('teslimat');
    const [zoneQuery, setZoneQuery] = useState('');
    const data = session.data!;
    const quote = session.quote.quote;
    const zones = data.zones.filter(z => z.isActive !== false);
    const zone = session.pickup ? null : zones.find(z => z.id === session.zoneId) ?? null;
    const multiBranch = data.branches.length > 1;
    const amountToMinimum = session.pickup ? 0 : quote ? quote.amountToMinimum : zone ? Math.max(0, zone.minOrderAmount - summary.subtotal) : 0;
    const minimum = zone && zone.minOrderAmount > 0 && amountToMinimum > 0
        ? { subtotal: Math.max(0, zone.minOrderAmount - amountToMinimum), target: zone.minOrderAmount, left: amountToMinimum } : null;
    const ready = session.open && (session.pickup || !!zone) && !!quote && (session.pickup || quote.meetsMinimum) && !session.quote.error;
    const hint = !session.open ? (data.nextOpensAt ? `Restoran ${opensText(data.nextOpensAt)}'da sipariş almaya başlıyor.` : data.message || 'Restoran şu an sipariş almıyor.')
        : !session.pickup && !zone ? 'Devam etmek için teslimat mahallenizi seçin.'
            : amountToMinimum > 0 ? null
                : session.quote.error ?? (!quote ? 'Tutar hesaplanıyor…' : null);
    const q = foldSearch(zoneQuery);
    const shownZones = q ? zones.filter(z => foldSearch(z.name).includes(q)) : zones;

    if (step === 'bilgiler' && quote && (zone || session.pickup)) {
        // Pencere yapışkan üst menünün (z-50) üstünde kalsın.
        return (
            <div className="relative z-[60]">
            <DeliveryCheckout data={data} zone={zone} pickup={session.pickup} lines={session.lines} quote={quote}
                clientRequestId={session.clientRequestId} onQuoteChanged={session.quote.setQuote}
                onSubmitted={result => { onClose(); session.onSubmitted(result); }}
                onClose={() => setStep('teslimat')} />
            </div>
        );
    }

    const choice = (on: boolean) => cn('flex min-h-14 w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--site-focus)]',
        on ? 'border-[var(--site-accent)] bg-[var(--site-alt)] shadow-[0_0_0_1px_var(--site-accent)]' : 'border-[var(--site-border-strong)] hover:border-[var(--site-text)]');
    const stepLabel = 'm-0 text-[13px] font-bold uppercase tracking-[0.14em] text-[var(--site-muted)]';
    const pickupAddress = data.pickupAddress ?? '';

    const footer = (
        <div className="flex flex-col gap-3">
            <CartTotalsBlock summary={summary} />
            {minimum && <MinimumProgress {...minimum} />}
            {hint && <p role="status" className={cn('m-0 rounded-xl px-3 py-2 text-[14px] font-medium',
                session.quote.error ? 'border border-[var(--site-error-line)] bg-[var(--site-error-bg)] text-[var(--site-error)]' : 'bg-[var(--site-alt)]')}>{hint}</p>}
            <button type="button" disabled={!ready} onClick={() => setStep('bilgiler')} className={cn(spButton.accent, 'min-h-[56px] w-full disabled:opacity-50')}>
                Bilgilere geç
            </button>
        </div>
    );

    return (
        <SpModal title="Siparişi tamamla" onClose={onClose} footer={footer}>
            <ol className="m-0 flex list-none flex-col gap-6 p-5 sm:p-6">
                <li className="flex flex-col gap-1 text-[14px] text-[var(--site-sub)]">
                    <span><b className="text-[var(--site-text)]">1. Teslimat</b> · 2. Bilgiler ve ödeme · 3. Onay ve takip</span>
                </li>
                {multiBranch && (
                    <li className="flex flex-col gap-2.5">
                        <p className={stepLabel}>Şube</p>
                        <div role="radiogroup" aria-label="Şube" className="flex flex-col gap-2">
                            {data.branches.map(b => (
                                <button key={b.id} type="button" role="radio" aria-checked={b.id === data.branchId} disabled={session.branchLoading}
                                    onClick={() => session.chooseBranch(b.id)} className={choice(b.id === data.branchId)}>
                                    <span className="min-w-0 flex-1">
                                        <span className="block text-[16px] font-bold">{b.name}</span>
                                        {b.district && <span className="block text-[14px] text-[var(--site-sub)]">{b.district}</span>}
                                    </span>
                                </button>
                            ))}
                        </div>
                        <p className="m-0 text-[13px] text-[var(--site-muted)]">Şube değişince sepet o şubenin menüsüne taşınır; orada olmayan ürünler düşer.</p>
                    </li>
                )}
                {data.pickupEnabled && (
                    <li className="flex flex-col gap-2.5">
                        <p className={stepLabel}>Sipariş türü</p>
                        <div role="radiogroup" aria-label="Sipariş türü" className="grid grid-cols-2 gap-2">
                            {[{ value: false, label: 'Adrese teslim' }, { value: true, label: 'Gel al' }].map(o => (
                                <button key={o.label} type="button" role="radio" aria-checked={session.pickup === o.value}
                                    onClick={() => session.setPickup(o.value)} className={cn(choice(session.pickup === o.value), 'justify-center text-[15px] font-bold')}>
                                    {o.value ? <BagGlyph className="h-[18px] w-[18px]" /> : <PinGlyph className="h-[18px] w-[18px]" />}{o.label}
                                </button>
                            ))}
                        </div>
                    </li>
                )}
                {session.pickup ? (
                    <li className="flex flex-col gap-2 rounded-2xl bg-[var(--site-alt)] p-4">
                        <p className={stepLabel}>Gel al · restorandan teslim</p>
                        <p className={cn(serif, 'm-0 text-[24px] leading-tight')}>{data.branchName}</p>
                        {pickupAddress && (
                            <a href={directionsUrl(pickupAddress)} target="_blank" rel="noopener noreferrer" className="flex items-start gap-2 text-[15px] text-[var(--site-sub)] underline-offset-2 hover:underline">
                                <DirectionsGlyph className="mt-0.5 h-4 w-4 shrink-0" /><span className="min-w-0 break-words">{pickupAddress}</span>
                            </a>
                        )}
                        {data.pickupDirections && <p className="m-0 text-[14px] text-[var(--site-sub)]">{data.pickupDirections}</p>}
                        <p className="m-0 flex items-center gap-2 text-[15px] font-semibold">
                            <ClockGlyph className="h-4 w-4" />En kısa sürede{data.pickupEtaMinutes ? ` (~${data.pickupEtaMinutes} dk)` : ''}
                        </p>
                        <p className="m-0 text-[14px] text-[var(--site-sub)]">Teslimat ücreti yok. Ödeme siparişi alırken restoranda yapılır.</p>
                    </li>
                ) : (
                    <li className="flex flex-col gap-2.5">
                        <p className={stepLabel}>Teslimat mahallesi</p>
                        {zones.length === 0 ? (
                            <p className="m-0 text-[15px] text-[var(--site-sub)]">Restoran henüz teslimat bölgesi tanımlamadı.</p>
                        ) : (
                            <>
                                {zones.length >= ZONE_SEARCH_FROM && (
                                    <input value={zoneQuery} onChange={e => setZoneQuery(e.target.value)} placeholder="Mahallenizi arayın" aria-label="Mahallenizi arayın"
                                        className="h-12 w-full rounded-xl border border-[var(--site-border-strong)] bg-[var(--site-bg)] px-3.5 text-[15px] text-[var(--site-text)] placeholder:text-[var(--site-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--site-focus)]" />
                                )}
                                <div role="radiogroup" aria-label="Teslimat mahallesi" className="flex flex-col gap-2">
                                    {shownZones.map(z => {
                                        const f = zoneFacts(z);
                                        return (
                                            <button key={z.id} type="button" role="radio" aria-checked={z.id === session.zoneId} onClick={() => session.setZoneId(z.id)} className={choice(z.id === session.zoneId)}>
                                                <span className="min-w-0 flex-1">
                                                    <span className="block text-[16px] font-bold">{z.name}</span>
                                                    <span className="block text-[14px] text-[var(--site-sub)]">En az sipariş {f.minimum}</span>
                                                </span>
                                                <span className="shrink-0 text-right text-[14px] tabular-nums">
                                                    <span className="block font-semibold">{f.time}</span>
                                                    <span className="block text-[var(--site-sub)]">{f.fee}</span>
                                                </span>
                                            </button>
                                        );
                                    })}
                                    {shownZones.length === 0 && (
                                        <p className="m-0 text-[15px] text-[var(--site-sub)]">“{zoneQuery.trim()}” bölgesine teslimat yok.{data.restaurantPhone ? ` Telefonla sorabilirsiniz: ${data.restaurantPhone}.` : ''}</p>
                                    )}
                                </div>
                            </>
                        )}
                    </li>
                )}
            </ol>
        </SpModal>
    );
}
