import type { ElementType, ReactNode } from 'react';
import type { PublicSite, SiteTeamMember } from '@/features/customerSite/types';
import type { TeamView } from './team';
import { cn } from '@/lib/utils';
import { EditableText, EmptySlot } from './siteEdit';
import { SITE_LIMITS, SiteEditContext, editTarget, useSiteEdit } from './siteEditContext';
import { initials, splitAccent } from './siteTheme';

// Hakkımızda'daki "Ekibimiz" bölümünün tasarımlardan bağımsız parçaları (kurallar: team.ts): başlık ve giriş (restoran
// yazar; boşsa tasarımın varsayılanı), portre (kendi fotoğrafı; yoksa sitede baş harfler, düzenleyicide "+ Fotoğraf ekle"),
// ad / rol / not yazıları ve düzenleyicinin sayaç satırı. Her tasarım bunları kendi diliyle dizer (RestaurantAboutPage,
// EliteAbout, MeyhaneAbout, BahceAbout, EsnafAbout). Ekip fotoğrafı hiçbir zaman hazır görsel değildir.

/**
 * Bölüm başlığı: restoranın yazdığı (yoksa `fallback`). Sitede virgülden sonrası (yoksa son kelime) italik vurgu;
 * düzenleyicide yerinde yazılır.
 */
export function TeamTitle({ site, fallback, as = 'h2', id, className, accentClassName = 'italic' }: {
    site: PublicSite; fallback: string; as?: ElementType; id?: string; className?: string; accentClassName?: string;
}) {
    const edit = useSiteEdit();
    const Tag = as;
    const value = site.site.teamTitle ?? '';
    if (edit) return <EditableText as={as} id={id} field="teamTitle" value={value} fallback={fallback} placeholder={fallback} className={className} />;
    const [main, accent] = splitAccent(value || fallback);
    return <Tag id={id} className={className}>{main && <>{main} </>}<em className={accentClassName}>{accent}</em></Tag>;
}

/** Giriş cümlesi: restoranın yazdığı, yoksa `fallback` (boşsa sitede çizilmez; düzenleyicide yer tutucu). */
export function TeamIntro({ site, fallback = '', as = 'p', className }: { site: PublicSite; fallback?: string; as?: ElementType; className?: string }) {
    const edit = useSiteEdit();
    const value = site.site.teamIntro ?? '';
    if (!edit && !value && !fallback) return null;
    return <EditableText as={as} field="teamIntro" value={value} fallback={fallback} placeholder={fallback || 'Kısa bir giriş cümlesi (isteğe bağlı)'} className={className} />;
}

/** Düzenleyicide başlığın yanındaki satır: "3 / 6 üye" ya da boşken "Sitede, en az 1 üye eklenince görünür.". */
export function TeamEditorNote({ team, className }: { team: TeamView; className?: string }) {
    if (!team.edit) return null;
    return (
        <span className={cn("font-[family-name:'DM_Sans',system-ui,sans-serif] text-sm text-[#7A4E0E]", className)}>
            {team.empty ? 'Sitede, en az 1 üye eklenince görünür.' : `${team.members.length} / ${SITE_LIMITS.teamMember.max} üye`}
        </span>
    );
}

/**
 * Üyenin portresi. Fotoğraf varsa `img` (düzenleyicide tıklanınca "Yükle · Kaldır"); yoksa sitede baş harfler
 * (`initialsClassName`), düzenleyicide boş alanlar açıkken "+ Fotoğraf ekle" kesikli kutusu (`emptyClassName`), kapalıyken
 * tıklanabilir baş harfler. `className` her durumda kutunun biçimi (oran, köşe, çerçeve).
 */
export function TeamPhoto({ member, className, imgClassName, initialsClassName, emptyClassName, children }: {
    member: SiteTeamMember; className?: string; imgClassName?: string; initialsClassName?: string; emptyClassName?: string;
    /** Baş harflerin üstündeki süs (halka vb.). */
    children?: ReactNode;
}) {
    const edit = useSiteEdit();
    const target = `photo:team:${member.id}`;
    const t = editTarget(edit, target, 'Ekip portresi');
    if (member.photoUrl) {
        return (
            <span className={cn('relative block shrink-0 overflow-hidden', className)}>
                <img src={member.photoUrl} alt={member.name} loading="lazy" {...t} className={cn('block h-full w-full object-cover', imgClassName, t.className)} />
            </span>
        );
    }
    if (edit?.showEmpty) return <EmptySlot target={target} title="+ Fotoğraf ekle" className={cn('h-auto min-h-0 shrink-0', className, emptyClassName)} />;
    return (
        <span aria-hidden={edit ? undefined : true} {...t} className={cn('relative flex shrink-0 items-center justify-center overflow-hidden', className, initialsClassName, t.className)}>
            {children}
            <span className="relative">{initials(member.name) || '?'}</span>
        </span>
    );
}

/** Ad: zorunlu; düzenleyicide yerinde yazılır. */
export function TeamName({ member, as = 'h3', className }: { member: SiteTeamMember; as?: ElementType; className?: string }) {
    return <EditableText as={as} field={`team:${member.id}:name`} value={member.name} placeholder="Adı" className={className} />;
}

/** Rol: boşsa sitede çizilmez, düzenleyicide soluk yer tutucu. */
export function TeamRole({ member, as = 'span', className }: { member: SiteTeamMember; as?: ElementType; className?: string }) {
    const edit = useSiteEdit();
    if (!member.role && !edit) return null;
    return <EditableText as={as} field={`team:${member.id}:role`} value={member.role} placeholder="Rolü (ör. Salon şefi)" className={className} />;
}

/** Tek satır not: isteğe bağlı; boşsa sitede çizilmez. */
export function TeamNote({ member, as = 'p', className }: { member: SiteTeamMember; as?: ElementType; className?: string }) {
    const edit = useSiteEdit();
    if (!member.note && !edit) return null;
    return <EditableText as={as} field={`team:${member.id}:note`} value={member.note} placeholder="Tek satır not (isteğe bağlı)" className={className} />;
}

/**
 * Örnek kartın sarmalayıcısı: düzenleme bağlamı kapalı (müşteri sitesi gibi çizilir, yazılar tıklanmaz), soluk ve
 * "Örnek" etiketli. `index`: soldan sağa giderek silikleşir.
 */
export function TeamSample({ index, className, children }: { index: number; className?: string; children: ReactNode }) {
    return (
        <div aria-hidden="true" inert className={cn('pointer-events-none relative select-none', index === 0 ? 'opacity-45' : 'opacity-30', className)}>
            <SiteEditContext.Provider value={null}>{children}</SiteEditContext.Provider>
            <span className="absolute left-2.5 top-2.5 z-[1] rounded-full bg-black/45 px-2.5 py-1 font-[family-name:'DM_Sans',system-ui,sans-serif] text-[11px] font-semibold text-white">Örnek</span>
        </div>
    );
}
