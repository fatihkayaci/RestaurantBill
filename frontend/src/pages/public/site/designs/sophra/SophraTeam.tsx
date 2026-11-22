import { Link } from 'react-router-dom';
import type { PublicSite } from '@/features/customerSite/types';
import { cn } from '@/lib/utils';
import { serif, teamOnSite } from '../../siteParts';
import { SiteEditContext, useSiteEdit } from '../../siteEditContext';
import { TeamPhoto, TeamTitle } from '../../teamParts';
import { ArrowGlyph } from './SophraIcons';
import { spEyebrow, spLink, spTitle, spWrap } from './sophraParts';

// Sophra anasayfasının "Ekibimiz" bölümü (homeSections "team"; varsayılanı kapalı, restoran açar). Kısa hâli: başlık,
// tek sıra yuvarlak portre (ad ve rol altında) ve Hakkımızda'ya bağlantı. Üyeler, başlık ve fotoğraflar Hakkımızda'da
// düzenlenir: burada düzenleyicide de yalnız gösterilir.

export function TeamSection({ site }: { site: PublicSite }) {
    const edit = useSiteEdit();
    const members = teamOnSite(site);
    if (members.length === 0) return null;
    return (
        <section aria-labelledby="sp-ekip" className="py-14 sm:py-20">
            {/* İçerik Hakkımızda'da değişir: düzenleyicide yazılar ve fotoğraflar burada tıklanmaz. */}
            <SiteEditContext.Provider value={null}>
                <div className={cn(spWrap, 'flex flex-col items-center gap-8 text-center sm:gap-10')}>
                    <div className="flex flex-col items-center gap-3">
                        <p className={spEyebrow}>Ekibimiz</p>
                        <TeamTitle site={site} id="sp-ekip" fallback="Sofranın arkasındakiler." className={spTitle} />
                    </div>
                    <ul className="m-0 flex w-full list-none flex-wrap justify-center gap-x-5 gap-y-7 p-0 sm:gap-x-8">
                        {members.map(m => (
                            <li key={m.id} className="flex w-[132px] min-w-0 flex-col items-center gap-2 sm:w-[156px]">
                                <TeamPhoto member={m} className="h-[104px] w-[104px] rounded-full border border-[var(--site-border)] sm:h-[128px] sm:w-[128px]"
                                    initialsClassName={cn(serif, 'bg-[var(--site-alt)] text-[36px] text-[var(--site-accent-text)] sm:text-[44px]')} />
                                <span className={cn(serif, 'mt-1 break-words text-[18px] leading-tight sm:text-[20px]')}>{m.name}</span>
                                {m.role && <span className="text-[13px] leading-snug text-[var(--site-sub)]">{m.role}</span>}
                            </li>
                        ))}
                    </ul>
                    {!edit && (
                        <Link to="/hakkimizda" className={cn(spLink, 'self-center')}>
                            Ekibimizi tanıyın<ArrowGlyph className="h-4 w-4 transition-transform group-hover:translate-x-1 motion-reduce:transition-none" />
                        </Link>
                    )}
                </div>
            </SiteEditContext.Provider>
        </section>
    );
}
