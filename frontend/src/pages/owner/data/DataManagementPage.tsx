import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { DoorOpen, RotateCcw, Trash2, type LucideIcon } from 'lucide-react';
import { PageError, PageLoading } from '@/components/ui/page-state';
import { cn } from '@/lib/utils';
import { dataManagementService } from '@/features/dataManagement/api/dataManagementService';
import type { DataOverview } from '@/features/dataManagement/types';
import SelectiveDeleteFlow from './SelectiveDeleteFlow';
import ResetFlow from './ResetFlow';
import CloseAccountFlow from './CloseAccountFlow';

type Flow = 'delete' | 'reset' | 'close';

// Şirket modu (Tümü) → Verileri sil. Üç kart; biri açılınca adımları kartın içinde görünür.
// Her akış: seç → önizle → onayla (ad + şifre) → sonuç.
export default function DataManagementPage() {
    const [overview, setOverview] = useState<DataOverview | null>(null);
    const [failed, setFailed] = useState(false);
    const [open, setOpen] = useState<Flow | null>(null);

    const fetchOverview = useCallback(
        () => dataManagementService.overview().then(setOverview).catch(() => setFailed(true)),
        [],
    );
    const load = () => { setFailed(false); void fetchOverview(); };

    useEffect(() => { void fetchOverview(); }, [fetchOverview]);

    if (failed) return <PageError onRetry={load} />;
    if (!overview) return <PageLoading />;

    const close = () => setOpen(null);

    return (
        <div className="max-w-2xl space-y-4">
            <div>
                <h1 className="text-2xl font-serif font-bold text-foreground">Verileri sil</h1>
                <p className="mt-0.5 text-sm text-muted-foreground">Silmeden önce ne silineceğini sayılarıyla görürsünüz.</p>
            </div>

            <FlowCard
                icon={Trash2}
                title="Seçerek sil"
                text="Satış geçmişi, menü, masalar gibi seçtiğiniz verileri siler."
                isOpen={open === 'delete'}
                onOpen={() => setOpen('delete')}
            >
                <SelectiveDeleteFlow overview={overview} onClose={close} />
            </FlowCard>

            <FlowCard
                icon={RotateCcw}
                title="Sıfırla"
                text="Ayarları ilk günkü hâline döndürür. Kayıtlar silinmez."
                isOpen={open === 'reset'}
                onOpen={() => setOpen('reset')}
            >
                <ResetFlow overview={overview} onClose={close} />
            </FlowCard>

            <FlowCard
                icon={DoorOpen}
                title="Hesabı kapat"
                text={`Restoran hemen durur. ${overview.closureGraceDays} gün sonra her şey kalıcı olarak silinir.`}
                isOpen={open === 'close'}
                onOpen={() => setOpen('close')}
            >
                <CloseAccountFlow overview={overview} onClose={close} />
            </FlowCard>
        </div>
    );
}

function FlowCard({ icon: Icon, title, text, isOpen, onOpen, children }: {
    icon: LucideIcon;
    title: string;
    text: string;
    isOpen: boolean;
    onOpen: () => void;
    children: ReactNode;
}) {
    return (
        <section className={cn('rounded-xl border bg-card p-5', isOpen ? 'border-rb-gold/50' : 'border-border')}>
            <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <Icon className="h-4 w-4 text-foreground" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                    <h2 className="text-base font-semibold text-foreground">{title}</h2>
                    <p className="mt-0.5 text-sm text-muted-foreground">{text}</p>
                </div>
                {!isOpen && (
                    <button
                        type="button"
                        onClick={onOpen}
                        className="h-9 shrink-0 rounded-lg border border-border px-4 text-sm font-medium text-foreground hover:bg-muted"
                    >
                        Başla
                    </button>
                )}
            </div>
            {isOpen && <div className="mt-5 border-t border-border pt-5">{children}</div>}
        </section>
    );
}
