import type { ReactNode } from 'react';
import type { PublicSite } from '@/features/customerSite/types';
import { formatRating, productCount } from './siteParts';
import { EditableBlock } from './siteEdit';

// Hakkımızda'nın rakamları (Renkli/Sade ve Elit birlikte kullanır). Yalnız gerçek veriden; düzenleyicide yıl ve puan
// tıklanınca kendi penceresini açar.

export interface AboutStat { key: string; value: string; label: string; wrap?: (node: ReactNode) => ReactNode }

/** Yalnız gerçek veriden rakamlar: kaç yıldır, menüdeki ürün sayısı, salon kapasitesi (her masanın kapasitesi girildiyse), Google puanı. */
export function aboutStats(site: PublicSite): AboutStat[] {
    const c = site.site;
    const out: AboutStat[] = [];
    const years = c.foundedYear ? new Date().getFullYear() - c.foundedYear : 0;
    if (years >= 1) out.push({ key: 'yil', value: String(years), label: 'yıldır sizinle', wrap: n => <EditableBlock target="year" label="Kuruluş yılı" className="h-full">{n}</EditableBlock> });
    const products = productCount(site);
    if (products > 0) out.push({ key: 'urun', value: String(products), label: 'menüdeki lezzet' });
    const tables = site.regions.flatMap(r => r.tables);
    if (tables.length > 0 && tables.every(t => t.capacity && t.capacity > 0)) {
        out.push({ key: 'kapasite', value: String(tables.reduce((sum, t) => sum + (t.capacity ?? 0), 0)), label: 'kişilik salon' });
    }
    if (c.rating !== null) out.push({ key: 'puan', value: formatRating(c.rating), label: 'Google puanı', wrap: n => <EditableBlock target="rating" label="Google puanı" className="h-full">{n}</EditableBlock> });
    return out.slice(0, 4);
}
