import type { ReactNode } from 'react';
import type { PublicSite } from '@/features/customerSite/types';
import { EliteHero } from './EliteBits';

// Elit akış sayfalarının kapakları (tasarım: EliteRezervasyon). Rezervasyon kapağı → sitenin kapağı → desenli koyu bant;
// düzenleyicide "Rezervasyon kapağı" buradan seçilir.

export function EliteReservationHero({ site, children }: { site: PublicSite; children?: ReactNode }) {
    const c = site.site;
    return (
        <EliteHero titleId="rz-baslik" label="Rezervasyon" title={<>Masanızı <em className="italic">ayırtın.</em></>}
            image={c.reservationHeroUrl || c.coverImageUrl} ownImage={Boolean(c.reservationHeroUrl)}
            imageTarget="photo:hero-rezervasyon" imageLabel="Rezervasyon kapağı" emptyHint="+ Rezervasyon kapağı seç">
            {children}
        </EliteHero>
    );
}
