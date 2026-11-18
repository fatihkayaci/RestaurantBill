import { cn } from '@/lib/utils';

interface Props {
    tableName: string;
    regionName?: string;
    className?: string;
}

// Masa QR sayfasının kapağında (karşılama ve masa menüsü) masa adı: müşteri telefonda masasını bir bakışta görsün diye
// kapaktaki ana düğmeyle aynı hardal zeminde, koyu yazılı (tableUi.ts karşıtlık notu) kalın bir hap.
export function TableBadge({ tableName, regionName, className }: Props) {
    return (
        <p className={cn('m-0 inline-flex max-w-full items-center gap-2 rounded-full bg-[var(--site-mustard)] px-4 py-1.5 text-[17px] font-extrabold leading-tight text-[var(--site-text)] shadow-[0_2px_10px_rgba(0,0,0,0.18)]', className)}>
            <span className="min-w-0 break-words">
                <span className="sr-only">Masa: </span>{tableName}
                {regionName && <span className="font-bold opacity-75"> · {regionName}</span>}
            </span>
        </p>
    );
}
