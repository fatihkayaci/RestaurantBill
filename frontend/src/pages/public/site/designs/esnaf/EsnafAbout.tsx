import type { PublicSite, SiteTeamMember } from '@/features/customerSite/types';
import { cn } from '@/lib/utils';
import { StockImageLabel } from '../../../components/StockImageLabel';
import { PageEmpty, SitePage } from '../../SiteFrame';
import { hasAboutPage, serif } from '../../siteParts';
import { initials } from '../../siteTheme';
import { aboutStats } from '../../aboutStats';
import { restaurantName } from '../../useSite';
import { AddCard, EditableBlock, EditableText, EmptySlot, ListCard } from '../../siteEdit';
import { SITE_LIMITS, editTarget, useSiteEdit } from '../../siteEditContext';
import type { DesignPageProps } from '../registry';
import { CallBand, EsHeading, TileStrip, YearStamp } from './EsnafBits';
import { useEsnafMobileActions } from './esnafActions';
import { esNarrow, esSign, esWrap } from './esnafParts';
import { TEAM_LIST, TEAM_SAMPLES, isSoloLast, useTeam } from '../../team';
import { TeamEditorNote, TeamIntro, TeamName, TeamNote, TeamPhoto, TeamRole, TeamSample, TeamTitle } from '../../teamParts';

// Esnaf Tabelası Hakkımızda: "USTAMIZ". Dergi kutuları ya da gece hikâyesi yerine dükkânın duvarındaki çerçeveler.
// (1) Tabela: dev büyük harf hikâye başlığı (yoksa ad), kısa giriş; yanında kuruluş yılı mührü. Çini şerit.
// (2) Usta: kalın çerçeveli portre (yoksa çini zeminde baş harfler), dev ad ve unvan; yanında ustanın sözü elle yazılmış
//     kâğıt gibi kesikli çerçevede. (3) Hikâye: geniş ekranda iki sütun gazete kupürü. (4) Rakamlar: tezgâh camı gibi
//     kalın çerçeveli kutularda dev sayılar. (5) "Dükkânın usulü" (değerler): mürekkep plakalar. (6) Yıllar: yıl
//     plakaları alt alta, kalın çizgiyle bağlı. (7) "Buyurun" bandı.

export default function EsnafAbout({ site }: DesignPageProps) {
    const edit = useSiteEdit();
    const showEmpty = Boolean(edit?.showEmpty);
    const mobileActions = useEsnafMobileActions(site, 'hakkimizda');
    if (!hasAboutPage(site) && !showEmpty) {
        return (
            <SitePage site={site} current="hakkimizda" mobileActions={mobileActions}>
                <main className="flex flex-1 flex-col">
                    <Hero site={site} />
                    <PageEmpty text="Hakkımızda yazısı henüz eklenmedi." />
                </main>
            </SitePage>
        );
    }
    return (
        <SitePage site={site} current="hakkimizda" mobileActions={mobileActions}>
            <main className="flex flex-1 flex-col">
                <Hero site={site} />
                <Founder site={site} />
                <Team site={site} />
                <StoryText site={site} />
                <Facts site={site} />
                <Values site={site} />
                <Journey site={site} />
                <CallBand site={site} title="Buyurun, sofra hazır" />
            </main>
        </SitePage>
    );
}

function Hero({ site }: { site: PublicSite }) {
    const edit = useSiteEdit();
    const showEmpty = Boolean(edit?.showEmpty);
    const c = site.site;
    const title = c.storyTitle || restaurantName(site);
    const photo = c.aboutHeroUrl;
    return (
        <section aria-labelledby="es-hk" className="rb-es-sign relative bg-[var(--site-hero-bg)] text-[var(--site-on-cover)]">
            <div className={cn(esWrap, 'grid items-center gap-8 pb-12 pt-10 sm:pt-14 md:grid-cols-[minmax(0,1fr)_auto] md:gap-12')}>
                <div className="flex min-w-0 flex-col gap-5">
                    <p className="m-0 text-[13px] font-extrabold uppercase tracking-[0.18em] text-[var(--site-cover-accent)]">Hakkımızda</p>
                    {edit ? (
                        <EditableText as="h1" id="es-hk" field="storyTitle" value={c.storyTitle} fallback={title} placeholder="Slogan yazın"
                            className={cn(esSign, 'text-[56px] sm:text-[88px] lg:text-[112px]')} />
                    ) : (
                        <h1 id="es-hk" className={cn(esSign, 'text-balance text-[56px] sm:text-[88px] lg:text-[112px]')}>{title}</h1>
                    )}
                    {(c.tagline || showEmpty) && (
                        <EditableText as="p" field="tagline" value={c.tagline} placeholder="Kısa giriş yazın"
                            className="m-0 max-w-[52ch] text-[18px] font-semibold leading-snug" />
                    )}
                </div>
                {c.foundedYear && (
                    <EditableBlock target="year" label="Kuruluş yılı" className="justify-self-start rounded-full md:justify-self-end">
                        <YearStamp year={c.foundedYear} className="text-[var(--site-on-cover)]" />
                    </EditableBlock>
                )}
            </div>
            {(photo || edit) && (
                <div className={cn(esWrap, 'pb-10')}>
                    <EditableBlock target="photo:hero-hakkimizda" label="Hakkımızda kapağı" chip="Fotoğrafı değiştir">
                        {photo ? (
                            <div className="relative overflow-hidden rounded-md border-[6px] border-[var(--site-on-cover)]">
                                <img src={photo} alt="" className="block aspect-[21/8] w-full object-cover" />
                                {photo.includes('/shared/stock/') && <StockImageLabel className="bottom-3 right-3" />}
                            </div>
                        ) : (
                            <p className="m-0 rounded-md border-[3px] border-dashed border-[var(--site-on-cover)] px-4 py-8 text-center font-bold">+ Hakkımızda kapağı seç</p>
                        )}
                    </EditableBlock>
                </div>
            )}
            <TileStrip />
        </section>
    );
}

function Founder({ site }: { site: PublicSite }) {
    const edit = useSiteEdit();
    const c = site.site;
    if (!c.founderName && !c.founderQuote && !edit?.showEmpty) return null;
    const photoT = editTarget(edit, 'photo:founder', 'Usta portresi');
    return (
        <section aria-labelledby="es-usta" className={cn(esWrap, 'grid items-center gap-10 py-14 sm:py-20 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:gap-14')}>
            <div className="relative mx-auto w-full max-w-[400px]">
                {c.founderPhotoUrl ? (
                    <>
                        <img src={c.founderPhotoUrl} alt={c.founderName} {...photoT} className={cn('block aspect-[4/5] w-full rounded-md border-[6px] border-[var(--site-text)] object-cover', photoT.className)} />
                        {c.founderPhotoUrl.includes('/shared/stock/') && <StockImageLabel className="bottom-3 right-3" />}
                    </>
                ) : edit ? (
                    <EmptySlot target="photo:founder" title="+ Portre ekle" className="aspect-[4/5] bg-[var(--site-card)]" />
                ) : (
                    <span aria-hidden="true" className={cn(serif, 'rb-es-tilesoft flex aspect-[4/5] w-full items-center justify-center rounded-md border-[6px] border-[var(--site-text)] text-[120px] leading-none text-[var(--site-text)]')}>
                        {initials(c.founderName || restaurantName(site))}
                    </span>
                )}
            </div>
            <div className="flex min-w-0 flex-col gap-5">
                <p className="m-0 text-[13px] font-extrabold uppercase tracking-[0.18em] text-[var(--site-accent-text)]">Ustamız</p>
                <EditableText as="h2" id="es-usta" field="founderName" value={c.founderName} placeholder="Ustanın adı"
                    className={cn(serif, 'm-0 break-words text-[56px] leading-[0.9] sm:text-[80px]')} />
                {(c.founderTitle || edit?.showEmpty) && (
                    <EditableText as="p" field="founderTitle" value={c.founderTitle} placeholder="Unvanı"
                        className="m-0 text-[19px] font-bold leading-snug text-[var(--site-sub)]" />
                )}
                {(c.founderQuote || edit?.showEmpty) && (
                    <figure className="m-0 mt-2 rotate-[-1deg] rounded-[4px] border-[3px] border-dashed border-[var(--site-text)] bg-[var(--site-card)] p-6 sm:p-8">
                        <blockquote className={cn(serif, 'm-0 text-[32px] leading-[1.02] sm:text-[42px]')}>
                            “<EditableText field="founderQuote" value={c.founderQuote} multiline placeholder="Ustanın tek cümlelik sözü" />”
                        </blockquote>
                    </figure>
                )}
            </div>
        </section>
    );
}

/** "Tezgâhın ustaları": ustanınki gibi kalın çerçeveli portreler (fotoğraf yoksa çini zeminde baş harfler). */
function Team({ site }: { site: PublicSite }) {
    const team = useTeam(site);
    if (!team) return null;
    const { members, empty, canAdd } = team;
    // Telefonda iki sütun: ekle kartı da ızgaranın bir hücresidir; tek kalan son kart iki sütunu kaplar, portre yatay olur.
    const cells = members.length + (canAdd ? 1 : 0);
    const addSolo = isSoloLast(members.length, cells);
    const addHint = empty ? 'Ad, rol, fotoğraf' : `en fazla ${SITE_LIMITS.teamMember.max}`;
    return (
        <section aria-labelledby="es-ekip" className={cn(esWrap, 'flex flex-col gap-8 pb-14 sm:pb-20')}>
            <EsHeading id="es-ekip" title={<TeamTitle site={site} as="span" fallback="Tezgâhın ustaları" accentClassName="not-italic" />}
                note={<TeamIntro site={site} as="span" fallback="Ocaktan tezgâha, her gün sizi karşılayanlar." />}
                aside={<TeamEditorNote team={team} />} />
            <ul className="m-0 grid list-none grid-cols-2 gap-x-3 gap-y-6 p-0 sm:gap-x-4 md:grid-cols-[repeat(auto-fill,minmax(220px,1fr))] md:gap-y-8">
                {members.map((m, i) => {
                    const solo = isSoloLast(i, cells);
                    return (
                        <li key={m.id} className={cn('min-w-0', solo && 'max-md:col-span-2')}>
                            <ListCard list={TEAM_LIST} index={i} count={members.length} label="Ekip üyesi" className="h-full rounded-md">
                                <EsnafMember member={m} solo={solo} />
                            </ListCard>
                        </li>
                    );
                })}
                {canAdd && (
                    <li className={cn('min-w-0', addSolo && 'max-md:col-span-2')}>
                        <AddCard list={TEAM_LIST} label="Ekip üyesi ekle" count={members.length} max={SITE_LIMITS.teamMember.max} hint={addHint}
                            className={cn('h-auto rounded-md', addSolo ? 'aspect-[16/11] md:aspect-[4/5]' : 'aspect-[4/5]')} />
                    </li>
                )}
                {empty && TEAM_SAMPLES.map((m, i) => (
                    <li key={m.id} className="hidden min-w-0 md:block">
                        <TeamSample index={i}><EsnafMember member={m} solo={false} /></TeamSample>
                    </li>
                ))}
            </ul>
        </section>
    );
}

function EsnafMember({ member, solo }: { member: SiteTeamMember; solo: boolean }) {
    return (
        <div className="flex h-full flex-col gap-2.5 sm:gap-3">
            <TeamPhoto member={member} className={cn('rounded-md border-[4px] border-[var(--site-text)]', solo ? 'aspect-[16/11] md:aspect-[4/5]' : 'aspect-[4/5]')}
                initialsClassName={cn(serif, 'rb-es-tilesoft text-[56px] leading-none text-[var(--site-text)] sm:text-[88px]')} />
            <TeamRole member={member} className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-[var(--site-accent-text)] sm:text-[13px]" />
            <TeamName member={member} className={cn(serif, 'm-0 break-words text-[26px] leading-[0.95] sm:text-[34px]')} />
            <TeamNote member={member} className="m-0 text-[14px] font-medium leading-relaxed text-[var(--site-sub)] sm:text-[15px]" />
        </div>
    );
}

function StoryText({ site }: { site: PublicSite }) {
    const edit = useSiteEdit();
    const c = site.site;
    if (!c.about && !edit?.showEmpty) return null;
    return (
        <section aria-labelledby="es-hikaye" className="border-y-[6px] border-[var(--site-text)] bg-[var(--site-alt)] py-14 sm:py-20">
            <div className={cn(esWrap, 'flex flex-col gap-8')}>
                <h2 id="es-hikaye" className={cn(serif, 'm-0 text-[44px] leading-[0.9] sm:text-[60px]')}>Dükkânın hikâyesi</h2>
                <EditableText as="p" field="about" value={c.about} multiline placeholder="Hikâyenizi yazın: nasıl başladınız, neyi farklı yapıyorsunuz."
                    className="m-0 max-w-[68ch] whitespace-pre-line text-[18px] leading-[1.75] text-[var(--site-text)] lg:max-w-none lg:columns-2 lg:gap-14" />
            </div>
        </section>
    );
}

/** Rakamlar: kalın çerçeveli kutularda dev sayı, altında etiket. Yalnız gerçek veriden (aboutStats). */
function Facts({ site }: { site: PublicSite }) {
    const facts = aboutStats(site);
    if (facts.length === 0) return null;
    return (
        <section aria-label="Rakamlarla" className={cn(esWrap, 'py-14 sm:py-16')}>
            <dl className={cn('m-0 grid grid-cols-2 gap-4', facts.length > 2 && 'lg:grid-cols-4')}>
                {facts.map(f => {
                    const box = (
                        <div className="flex h-full flex-col-reverse justify-end gap-2 rounded-md border-[3px] border-[var(--site-text)] bg-[var(--site-card)] p-4 sm:p-5">
                            <dt className="text-sm font-extrabold uppercase tracking-[0.06em] text-[var(--site-sub)]">{f.label}</dt>
                            <dd className={cn(serif, 'm-0 text-[56px] leading-[0.9] tabular-nums text-[var(--site-accent-text)] sm:text-[72px]')}>{f.value}</dd>
                        </div>
                    );
                    return <div key={f.key} className="min-w-0">{f.wrap ? f.wrap(box) : box}</div>;
                })}
            </dl>
        </section>
    );
}

function Values({ site }: { site: PublicSite }) {
    const edit = useSiteEdit();
    const values = site.site.values;
    if (values.length === 0 && !edit?.showEmpty) return null;
    return (
        <section aria-labelledby="es-usul" className={cn(esWrap, 'flex flex-col gap-8 pb-14 sm:pb-20')}>
            <EsHeading id="es-usul" title="Dükkânın usulü" />
            <ul className="m-0 grid list-none gap-4 p-0 md:grid-cols-3">
                {values.map((v, i) => (
                    <li key={i} className="min-w-0">
                        <ListCard list="values" index={i} count={values.length} label="Değer" className="h-full">
                            <div className="flex h-full flex-col gap-3 rounded-md bg-[var(--site-paper)] p-5 text-[var(--site-on-paper)] shadow-[inset_0_-6px_0_rgba(0,0,0,0.35)] sm:p-6">
                                <EditableText as="h3" field={`value:${i}:title`} value={v.title} placeholder="Başlık"
                                    className={cn(serif, 'm-0 break-words text-[30px] leading-[0.95] text-[var(--site-pop)] sm:text-[34px]')} />
                                {(v.text || edit) && (
                                    <EditableText as="p" field={`value:${i}:text`} value={v.text} placeholder="Tek cümle"
                                        className="m-0 text-base leading-relaxed text-[var(--site-on-paper-sub)]" />
                                )}
                            </div>
                        </ListCard>
                    </li>
                ))}
            </ul>
            <AddCard list="values" label="Değer ekle" count={values.length} max={SITE_LIMITS.value.max} />
        </section>
    );
}

function Journey({ site }: { site: PublicSite }) {
    const edit = useSiteEdit();
    const milestones = site.site.milestones;
    // Sitede en az 2 durak olunca görünür; düzenleyicide eklenebilsin diye boşken de.
    if (!(milestones.length >= 2 || (edit && (milestones.length > 0 || edit.showEmpty)))) return null;
    return (
        <section aria-labelledby="es-yil" className={cn(esNarrow, 'flex flex-col gap-8 pb-14 sm:pb-20')}>
            <EsHeading id="es-yil" title="Yıllar içinde" note={edit && milestones.length < 2 ? 'En az 2 olunca görünür.' : undefined} />
            <ol className="relative m-0 flex list-none flex-col gap-4 p-0 before:absolute before:bottom-4 before:left-[46px] before:top-4 before:w-[6px] before:bg-[var(--site-text)] sm:before:left-[58px]">
                {milestones.map((m, i) => (
                    <li key={i} className="relative">
                        <ListCard list="milestones" index={i} count={milestones.length} label="Kilometre taşı">
                            <div className="grid grid-cols-[98px_1fr] items-center gap-x-5 sm:grid-cols-[122px_1fr]">
                                <EditableText field={`milestone:${i}:year`} value={m.year ? String(m.year) : ''} placeholder="Yıl"
                                    className={cn(serif, 'relative z-[1] rounded-[4px] bg-[var(--site-hero-bg)] px-2 py-2 text-center text-[28px] leading-none tabular-nums text-[var(--site-on-cover)] sm:text-[34px]')} />
                                <EditableText as="p" field={`milestone:${i}:text`} value={m.text} placeholder="Ne oldu?"
                                    className="m-0 border-b-2 border-[var(--site-border-strong)] py-3 text-[17px] font-medium leading-relaxed" />
                            </div>
                        </ListCard>
                    </li>
                ))}
            </ol>
            {edit && <AddCard list="milestones" label="Kilometre taşı ekle" count={milestones.length} max={SITE_LIMITS.milestone.max} />}
        </section>
    );
}
