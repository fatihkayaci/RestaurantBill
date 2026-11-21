import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Ornament } from './MeyhaneBits';
import { mhTitle } from './meyhaneParts';

// Ortak menünün (DeliveryMenu, variant "meyhane") Meyhane Gecesi parçaları: basılı menü kartının bölüm başlığı (kategori
// şeridinin yazı sekmesi meyhaneParts.ts'te). Site Menü sayfası, masa QR menüsü ve paket sipariş menüsü aynı parçaları kullanır.

/** Bölüm başlığı: ortalı süs, başlık yazı tipinde bölüm adı, altında "8 çeşit" ve isteğe bağlı kısa not. */
export function MeyhaneCategoryHeader({ id, name, total, note }: { id: string; name: string; total: number; note?: ReactNode }) {
    return (
        <div className="flex flex-col items-center gap-2 pb-2 text-center">
            <Ornament />
            <h2 id={id} className={cn(mhTitle, 'text-[30px] sm:text-[38px] md:text-[44px]')}>{name}</h2>
            <p className="m-0 text-sm text-[var(--site-sub)]">{note ? <>{note} </> : null}{total} çeşit</p>
        </div>
    );
}
