import { useEffect, useRef, useState } from 'react';
import { QRCodeCanvas, QRCodeSVG } from 'qrcode.react';
import { Copy, Download, X } from 'lucide-react';
import { toast } from 'sonner';
import { branchService } from '@/features/branches/api/branchService';
import { ROOT_DOMAIN } from '@/lib/tenant';
import type { Table } from '../types';

interface Props {
    table: Table;
    onClose: () => void;
}

// Masanın müşteri QR'ı: okutan kişi bu masanın menüsüne gelir ve sipariş talebi gönderebilir.
export default function TableQrModal({ table, onClose }: Props) {
    const [slug, setSlug] = useState<string | null>(null);
    const [loaded, setLoaded] = useState(false);
    const downloadRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        let cancelled = false;
        branchService.getMyBranch()
            .then(branch => { if (!cancelled) setSlug(branch.slug || null); })
            .catch(() => { /* adres yoksa aşağıda uyarı gösterilir */ })
            .finally(() => { if (!cancelled) setLoaded(true); });
        return () => { cancelled = true; };
    }, []);

    useEffect(() => {
        const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    const url = slug ? `https://${slug}.${ROOT_DOMAIN}/masa/${table.id}` : '';

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(url);
            toast.success('Masa bağlantısı kopyalandı.');
        } catch {
            toast.error('Kopyalanamadı.');
        }
    };

    const download = () => {
        const canvas = downloadRef.current;
        if (!canvas) return;
        const link = document.createElement('a');
        link.download = `${slug}-${table.name.replace(/\s+/g, '-').toLowerCase()}-qr.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 animate-in fade-in duration-200" onClick={onClose}>
            <div
                role="dialog"
                aria-modal="true"
                aria-label={`${table.name} QR kodu`}
                className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-2xl"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <h2 className="font-serif text-2xl font-bold leading-tight text-foreground">{table.name}</h2>
                        <p className="mt-0.5 text-sm text-rb-text-sub">Müşteri bu kodu okutup menüyü görür ve sipariş gönderir.</p>
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

                {url ? (
                    <>
                        <div className="mt-4 flex justify-center rounded-[14px] border border-border bg-white p-4">
                            <QRCodeSVG value={url} size={200} role="img" aria-label={`${table.name} menü QR kodu`} />
                        </div>
                        <QRCodeCanvas ref={downloadRef} value={url} size={768} marginSize={2} className="hidden" aria-hidden="true" />
                        <p className="mt-3 break-all rounded-[10px] border border-border bg-background px-3 py-2 font-mono text-xs text-foreground">
                            {url.replace(/^https:\/\//, '')}
                        </p>
                        <div className="mt-3 grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={copy}
                                className="flex h-11 items-center justify-center gap-1.5 rounded-[10px] border border-border bg-card text-[13.5px] font-semibold text-foreground transition-colors hover:bg-muted"
                            >
                                <Copy className="h-[15px] w-[15px]" aria-hidden="true" />
                                Bağlantıyı kopyala
                            </button>
                            <button
                                type="button"
                                onClick={download}
                                className="flex h-11 items-center justify-center gap-1.5 rounded-[10px] bg-rb-gold text-[13.5px] font-semibold text-rb-gold-foreground transition-opacity hover:opacity-90"
                            >
                                <Download className="h-[15px] w-[15px]" aria-hidden="true" />
                                QR indir
                            </button>
                        </div>
                    </>
                ) : (
                    <p className="mt-4 rounded-[10px] border border-dashed border-border px-3 py-6 text-center text-sm text-rb-text-sub">
                        {loaded ? 'Restoran adresi henüz belirlenmemiş; QR kod için önce adresi ayarlayın.' : 'Yükleniyor…'}
                    </p>
                )}
            </div>
        </div>
    );
}
