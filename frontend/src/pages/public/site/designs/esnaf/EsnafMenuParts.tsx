import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { serif } from '../../siteParts';

// Ortak menünün (DeliveryMenu, variant "esnaf") Esnaf Tabelası parçaları: duvardaki FİYAT PANOSU. Her kategori çini
// kenarlı ayrı bir pano; panolar dar ekranda alt alta, genişledikçe (kapsayıcı genişliği, container query) iki ve üç
// sütun duvar gibi dizilir. Hazır menüler ve "Şefin önerileri" bütün sütunları kaplar. Site Menü sayfası, masa QR menüsü
// ve paket sipariş menüsü aynı parçaları kullanır (kategori şeridinin sekmesi esnafParts.ts'te).

/** Panonun başlığı: menü kutusu renginde plaka, büyük harf ad, sağda "8 çeşit" mühürü; altında ince çini şerit. */
export function EsnafCategoryHeader({ id, name, total, note, level = 'h2' }: { id: string; name: string; total: number; note?: ReactNode; level?: 'h2' | 'h3' }) {
    const Heading = level;
    return (
        <div className="bg-[var(--site-menu-box)] text-[var(--site-on-menu-box)]">
            <div className="flex items-center justify-between gap-3 px-4 pb-3 pt-3.5 sm:px-5">
                <div className="min-w-0">
                    <Heading id={id} className={cn(serif, 'm-0 break-words text-[28px] leading-[0.95] sm:text-[32px]')}>{name}</Heading>
                    {note && <p className="m-0 mt-1 text-sm text-[var(--site-on-menu-box-sub)]">{note}</p>}
                </div>
                <span className="shrink-0 rounded-[4px] border-2 border-current px-2 py-1 text-xs font-extrabold uppercase tracking-[0.08em] tabular-nums">{total} çeşit</span>
            </div>
            <span aria-hidden="true" className="rb-es-tiles block h-2" />
        </div>
    );
}
