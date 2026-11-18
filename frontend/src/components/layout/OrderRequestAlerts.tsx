import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { HandPlatter, QrCode } from 'lucide-react';
import { createHubConnection } from '@/lib/signalrConnection';
import { playStaffTone, setStaffAlertCount } from '@/lib/staffAlerts';
import { clearBlockingAlerts, pushBlockingAlert, useBlockingAlerts, type BlockingAlert, type BlockingAlertKind } from '@/lib/blockingAlerts';
import { cn } from '@/lib/utils';
import type { OrderRequestCreatedEvent } from '@/features/customerSite/types';
import { playOrderRequestSound } from '@/pages/waiter/waiterSound';
import { emitOpenTable } from '@/pages/waiter/waiterEvents';

interface Props {
    /**
     * waiter: masa hub'ı; sunucu olayı yalnızca masaya bakan garsonlara gönderir (garson çağrısı ile aynı kural).
     * manager: kasiyer hub'ının yönetici grubu (Admin/Owner paneli).
     */
    variant: 'waiter' | 'manager';
}

const KIND_UI: Record<BlockingAlertKind, { label: string; ring: string; chip: string; text: string; button: string; outline: string }> = {
    order: {
        label: 'Yeni QR sipariş',
        ring: 'border-amber-400',
        chip: 'bg-amber-400 text-black',
        text: 'text-amber-600 dark:text-amber-400',
        button: 'bg-amber-400 text-black hover:bg-amber-300 focus-visible:outline-amber-500',
        outline: 'border-amber-400 hover:bg-amber-400/10',
    },
    call: {
        label: 'Garson çağırıyor',
        ring: 'border-red-500',
        chip: 'bg-red-500 text-white',
        text: 'text-red-600 dark:text-red-400',
        button: 'bg-red-500 text-white hover:bg-red-400 focus-visible:outline-red-600',
        outline: 'border-red-500 hover:bg-red-500/10',
    },
};

function KindIcon({ kind, className }: { kind: BlockingAlertKind; className?: string }) {
    return kind === 'call' ? <HandPlatter className={className} aria-hidden="true" /> : <QrCode className={className} aria-hidden="true" />;
}

// Müşteri masadaki QR menüden sipariş gönderince (ve WaiterCallAlerts'ten garson çağrısı gelince): ses + ekranın
// ortasında, arka planı kaplayan uyarı penceresi. Pencere "Tamam" (ya da "Masaya git") basılmadan kapanmaz; arka
// plana tıklamak ve Esc kapatmaz. Aynı anda birden çok uyarı gelirse hepsi tek pencerede listelenir. Kartın yanması
// masalar ekranlarında bekleyen talep listesinden gelir; onay/ret masanın panelinde yapılır.
export default function OrderRequestAlerts({ variant }: Props) {
    const navigate = useNavigate();
    const alerts = useBlockingAlerts();
    const okRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        const { connection, stop } = createHubConnection(variant === 'waiter' ? '/table-hub' : '/cashier-hub');

        connection.on('OrderRequestCreated', (event: OrderRequestCreatedEvent) => {
            if (!event?.tableId) return;
            if (variant === 'waiter') playOrderRequestSound();
            else playStaffTone('request');
            const items = event.itemCount > 0 ? `${event.itemCount} ürün` : 'Sipariş';
            pushBlockingAlert({
                kind: 'order',
                tableId: event.tableId,
                tableName: event.tableName,
                detail: `${items}${event.regionName ? ` · ${event.regionName}` : ''} · onayınızı bekliyor`,
            });
        });

        let cancelled = false;
        connection.start().catch(err => { if (!cancelled) console.error('OrderRequestCreated SignalR:', err); });
        return () => { cancelled = true; stop(); };
    }, [variant]);

    useEffect(() => {
        setStaffAlertCount('blocking-alerts', alerts.length);
        if (alerts.length > 0) okRef.current?.focus();
    }, [alerts.length]);

    useEffect(() => () => setStaffAlertCount('blocking-alerts', 0), []);

    if (alerts.length === 0) return null;

    const openTable = (tableId: string) => {
        clearBlockingAlerts();
        if (variant === 'waiter') {
            navigate('/waiter');
            emitOpenTable(tableId);
        } else {
            navigate(`/admin/tables?table=${tableId}`);
        }
    };
    const single: BlockingAlert | null = alerts.length === 1 ? alerts[0] : null;
    // Birden çok uyarıda çağrı varsa kırmızı, yoksa altın çerçeve.
    const frameKind: BlockingAlertKind = single ? single.kind : (alerts.some(a => a.kind === 'call') ? 'call' : 'order');
    const ui = KIND_UI[frameKind];

    return createPortal(
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
            // Arka plana tıklama pencereyi kapatmaz; Esc de kapatmaz (yalnız düğmeler).
            onKeyDown={e => { if (e.key === 'Escape') e.preventDefault(); }}>
            <div role="alertdialog" aria-modal="true" aria-labelledby="staff-blocking-alert-title" aria-describedby="staff-blocking-alert-desc"
                className={cn('w-full max-w-md rounded-3xl border-4 bg-card p-6 text-center text-card-foreground shadow-2xl sm:p-8', ui.ring)}>
                <span className={cn('mx-auto flex h-20 w-20 items-center justify-center rounded-full motion-safe:animate-pulse', ui.chip)}>
                    <KindIcon kind={frameKind} className="h-10 w-10" />
                </span>
                <h2 id="staff-blocking-alert-title" className="mt-5 text-3xl font-extrabold leading-tight">
                    {single ? single.tableName : `${alerts.length} yeni uyarı`}
                    {single && <span className={cn('mt-1 block text-xl font-bold', ui.text)}>{ui.label}</span>}
                </h2>
                <div id="staff-blocking-alert-desc" className="mt-4">
                    {single ? (
                        <p className="m-0 text-lg text-muted-foreground">{single.detail}</p>
                    ) : (
                        <ul className="m-0 flex max-h-[45vh] list-none flex-col gap-2 overflow-y-auto p-0 text-left">
                            {alerts.map(a => (
                                <li key={`${a.kind}-${a.tableId}`}>
                                    <button type="button" onClick={() => openTable(a.tableId)}
                                        className="flex w-full items-center gap-3 rounded-2xl bg-muted px-4 py-3 text-left hover:bg-muted/70">
                                        <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full', KIND_UI[a.kind].chip)}>
                                            <KindIcon kind={a.kind} className="h-5 w-5" />
                                        </span>
                                        <span className="min-w-0 flex-1">
                                            <span className="block text-lg font-bold">{a.tableName}</span>
                                            <span className={cn('block text-sm font-semibold', KIND_UI[a.kind].text)}>{KIND_UI[a.kind].label}</span>
                                        </span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                    {single && (
                        <button type="button" onClick={() => openTable(single.tableId)}
                            className={cn('h-14 flex-1 rounded-2xl border-2 text-lg font-bold', ui.outline)}>
                            {single.kind === 'order' ? 'Siparişi gör' : 'Masaya git'}
                        </button>
                    )}
                    <button ref={okRef} type="button" onClick={clearBlockingAlerts}
                        className={cn('h-14 flex-1 rounded-2xl text-lg font-extrabold focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2', ui.button)}>
                        Tamam
                    </button>
                </div>
            </div>
        </div>,
        document.body,
    );
}
