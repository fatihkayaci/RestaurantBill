import type { PublicSite, SiteTeamMember } from '@/features/customerSite/types';
import { SITE_LIMITS, useSiteEdit, type SiteEditApi } from './siteEditContext';
import { teamOnSite } from './siteParts';

// "Ekibimiz" bölümünün kuralları (bileşenler: teamParts.tsx): hangi üyeler çizilir, ekle kartı, telefonda tek kalan kart.

export const TEAM_LIST = 'teamMembers' as const;

export interface TeamView {
    edit: SiteEditApi | null;
    /** Sitede adı olanlar; düzenleyicide hepsi (adı yazılmamış yeni kart dahil). */
    members: SiteTeamMember[];
    /** Düzenleyicide ekip boş ("Boş alanları göster" açık): örnek kartlar ve ekle kartı. */
    empty: boolean;
    /** Ekle kartı çizilecek mi (düzenleyicide, sınırın altında). */
    canAdd: boolean;
}

/** Bölüm çizilecekse ekip görünümü; değilse null (sitede üye yoksa, düzenleyicide üye yok ve boş alanlar gizliyse). */
export function useTeam(site: PublicSite): TeamView | null {
    const edit = useSiteEdit();
    const members = edit ? site.site.teamMembers ?? [] : teamOnSite(site);
    if (members.length === 0 && !edit?.showEmpty) return null;
    return { edit, members, empty: members.length === 0, canAdd: Boolean(edit) && members.length < SITE_LIMITS.teamMember.max };
}

/** Telefonun iki sütunlu ızgarasında tek kalan son kart iki sütunu kaplar (boşluk kalmaz). */
export function isSoloLast(index: number, total: number): boolean {
    return total % 2 === 1 && index === total - 1;
}

/** Düzenleyicide boş ekibin örnek kartları (tıklanmaz, kaydedilmez): bölümün sitede nasıl görüneceğini gösterir. */
export const TEAM_SAMPLES: SiteTeamMember[] = [
    { id: 'ornek-1', name: 'Ayşe Usta', role: 'Mutfak şefi', note: '', photoUrl: '' },
    { id: 'ornek-2', name: 'Zeynep Arslan', role: 'Salon şefi', note: '', photoUrl: '' },
];
