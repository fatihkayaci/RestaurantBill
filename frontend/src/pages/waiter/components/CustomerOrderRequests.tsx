import { useState } from 'react';
import { BellRing, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { customerRequestService } from '@/features/customerSite/api/customerRequestService';
import type { OrderRequest } from '@/features/customerSite/types';
import { getApiErrorMessage } from '@/lib/apiError';
import { formatPrice } from '@/lib/format';

interface Props {
    requests: OrderRequest[];
    /** Onay/red sonrası liste yeniden çekilsin. */
    onChanged: () => void;
    /** Garsonun "Masa taşı ve rezervasyon" yetkisi yoksa talepler yalnızca görüntülenir. */
    canDecide?: boolean;
}

function minutesAgo(createdAt: string, now: number): string {
    // Backend UTC döner ama "Z" eki olmayabilir.
    const created = new Date(createdAt.endsWith('Z') ? createdAt : `${createdAt}Z`).getTime();
    const minutes = Math.max(0, Math.floor((now - created) / 60000));
    return minutes === 0 ? 'şimdi' : `${minutes} dk önce`;
}

// Müşterilerin masadaki QR'dan gönderdiği, garson onayı bekleyen siparişler.
// Onaylanan sipariş masanın adisyonuna eklenir ve mutfağa düşer; reddedilen hiçbir yere gitmez.
// Ret nedeni müşterinin telefonunda "Onaylanmadı" kartında alıntı olarak görünür; hızlı seçim ya da serbest metin.
const QUICK_REASONS = [
    'Ürünlerden biri bu akşam bitti.',
    'Mutfak şu an yoğun, biraz bekletebilir miyiz?',
    'Siparişinizi masanızda birlikte alalım.',
] as const;
const REASON_MAX = 300;

export default function CustomerOrderRequests({ requests, onChanged, canDecide = true }: Props) {
    const [busyId, setBusyId] = useState<string | null>(null);
    const [now] = useState(() => Date.now());
    const [rejectingId, setRejectingId] = useState<string | null>(null);
    const [reason, setReason] = useState('');

    if (requests.length === 0) return null;

    const startReject = (request: OrderRequest) => {
        setRejectingId(request.id);
        setReason('');
    };

    const decide = async (request: OrderRequest, approve: boolean) => {
        if (busyId) return;
        setBusyId(request.id);
        try {
            if (approve) {
                await customerRequestService.approveOrderRequest(request.id);
                toast.success(`${request.tableName} siparişi onaylandı, mutfağa gönderildi.`);
            } else {
                await customerRequestService.rejectOrderRequest(request.id, reason.trim() || undefined);
                toast.success(`${request.tableName} siparişi reddedildi.`);
                setRejectingId(null);
                setReason('');
            }
        } catch (err) {
            toast.error(getApiErrorMessage(err, 'İşlem yapılamadı. Lütfen tekrar deneyin.'));
        } finally {
            setBusyId(null);
            onChanged();
        }
    };

    return (
        <section aria-label="Onay bekleyen müşteri siparişleri" className="flex flex-col gap-2.5 sm:gap-3.5">
            <div className="flex items-center gap-2.5">
                <BellRing className="h-6 w-6 text-rb-amber" aria-hidden="true" />
                <h2 className="font-serif text-[26px] sm:text-[30px] font-bold leading-tight text-foreground">Müşteri siparişleri</h2>
                <span className="rounded-full bg-rb-gold px-2.5 py-0.5 text-sm font-bold text-rb-gold-foreground">{requests.length}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-2.5 sm:gap-4">
                {requests.map(request => (
                    <article key={request.id} className="flex flex-col rounded-[20px] border-[1.5px] border-rb-gold bg-rb-gold-bg p-4">
                        <div className="flex items-baseline justify-between gap-3">
                            <h3 className="font-serif text-[24px] font-bold leading-tight text-foreground">{request.tableName}</h3>
                            <span className="shrink-0 text-sm text-rb-text-sub">{minutesAgo(request.createdAt, now)}</span>
                        </div>
                        <p className="text-sm text-rb-text-sub">{request.regionName} · onay bekliyor</p>

                        <ul className="mt-3 flex flex-col gap-1.5">
                            {request.items.map((item, index) => (
                                <li key={`${item.setMenuId ?? item.productId}-${index}`} className="text-base text-foreground">
                                    <span className="font-bold">{item.quantity}×</span> {item.productName}
                                    {item.kind === 'setMenu' && (
                                        <span className="ml-1.5 rounded-full bg-card px-2 py-0.5 align-middle text-xs font-semibold text-rb-text-sub">Menü</span>
                                    )}
                                    {item.selections && item.selections.length > 0 && (
                                        <span className="block pl-7 text-sm text-foreground">{item.selections.join(' · ')}</span>
                                    )}
                                    {item.note && <span className="block pl-7 text-sm text-rb-text-sub">Not: {item.note}</span>}
                                </li>
                            ))}
                        </ul>
                        {request.note && (
                            <p className="mt-2.5 rounded-xl bg-card px-3 py-2 text-sm text-foreground">
                                <span className="font-semibold">Müşteri notu:</span> {request.note}
                            </p>
                        )}

                        <p className="mt-3 text-base font-semibold text-foreground">Toplam {formatPrice(request.total)} ₺</p>

                        {!canDecide ? (
                            <p className="mt-3 text-sm text-rb-text-sub">Onaylamak için yetkiniz yok; yöneticinize haber verin.</p>
                        ) : rejectingId === request.id ? (
                            <div className="mt-3 flex flex-col gap-2.5 rounded-xl bg-card p-3">
                                <label htmlFor={`ret-${request.id}`} className="text-sm font-semibold text-foreground">Müşteriye neden yazın <span className="font-normal text-rb-text-sub">(isteğe bağlı)</span></label>
                                <div className="flex flex-wrap gap-1.5">
                                    {QUICK_REASONS.map(text => (
                                        <button key={text} type="button" onClick={() => setReason(text)}
                                            className={`min-h-9 rounded-full border px-3 text-left text-[13px] font-medium transition-colors ${reason === text ? 'border-rb-gold bg-rb-gold-bg text-foreground' : 'border-border text-rb-text-sub hover:text-foreground'}`}>
                                            {text}
                                        </button>
                                    ))}
                                </div>
                                <textarea
                                    id={`ret-${request.id}`}
                                    value={reason}
                                    onChange={e => setReason(e.target.value.slice(0, REASON_MAX))}
                                    rows={2}
                                    maxLength={REASON_MAX}
                                    placeholder="ör. Künefe bu akşam bitti, katmer önerebiliriz."
                                    className="w-full rounded-xl border-[1.5px] border-border bg-background px-3 py-2 text-base text-foreground focus:outline-none focus:ring-2 focus:ring-rb-gold"
                                />
                                <div className="grid grid-cols-2 gap-2.5">
                                    <button type="button" onClick={() => setRejectingId(null)} disabled={busyId !== null}
                                        className="flex h-12 items-center justify-center rounded-xl border-[1.5px] border-border bg-card text-base font-semibold text-foreground disabled:opacity-50">
                                        Vazgeç
                                    </button>
                                    <button type="button" onClick={() => decide(request, false)} disabled={busyId !== null}
                                        className="flex h-12 items-center justify-center gap-2 rounded-xl bg-rb-red text-base font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50">
                                        <X className="h-[18px] w-[18px]" strokeWidth={2.5} aria-hidden="true" />
                                        {busyId === request.id ? 'İşleniyor…' : 'Reddet'}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="mt-3 grid grid-cols-2 gap-2.5">
                                <button
                                    type="button"
                                    onClick={() => startReject(request)}
                                    disabled={busyId !== null}
                                    className="flex h-12 items-center justify-center gap-2 rounded-xl border-[1.5px] border-border bg-card text-base font-semibold text-foreground transition-colors hover:border-rb-red hover:text-rb-red disabled:opacity-50"
                                >
                                    <X className="h-[18px] w-[18px]" strokeWidth={2.5} aria-hidden="true" />
                                    Reddet
                                </button>
                                <button
                                    type="button"
                                    onClick={() => decide(request, true)}
                                    disabled={busyId !== null}
                                    className="flex h-12 items-center justify-center gap-2 rounded-xl bg-rb-gold text-base font-semibold text-rb-gold-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                                >
                                    <Check className="h-[18px] w-[18px]" strokeWidth={2.5} aria-hidden="true" />
                                    {busyId === request.id ? 'İşleniyor…' : 'Onayla'}
                                </button>
                            </div>
                        )}
                    </article>
                ))}
            </div>
        </section>
    );
}
