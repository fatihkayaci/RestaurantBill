import { useState } from 'react';
import { Link } from 'react-router-dom';
import { canReserveOnline, type PublicSite } from '@/features/customerSite/types';
import { cn } from '@/lib/utils';
import { SitePage } from '../SiteFrame';
import { aboutStats } from '../aboutStats';
import { RESERVATION_PATH, hasAboutPage, sinceYear } from '../siteParts';
import { initials, splitAccent } from '../siteTheme';
import { hoursLine, restaurantName } from '../useSite';
import { AddCard, EditableBlock, EditableText, EmptySlot, ExternalHint, ListCard } from '../siteEdit';
import { SITE_LIMITS, editTarget, useSiteEdit } from '../siteEditContext';
import { EliteEmpty, EliteHero, EliteKicker } from './EliteBits';
import { elButton, elItalic, elSection, elSerif, elTitle, elWrap, heroLead, onDark, roman } from './eliteParts';
import { StockImageLabel } from '../../components/StockImageLabel';
import type { SiteTeamMember } from '@/features/customerSite/types';
import { TEAM_LIST, TEAM_SAMPLES, useTeam } from '../team';
import { TeamEditorNote, TeamIntro, TeamName, TeamNote, TeamPhoto, TeamRole, TeamSample, TeamTitle } from '../teamParts';

// /hakkimizda, Elit (tasarım: EliteHakkimizda). (1) Tam genişlik kapak: "Hikâyemiz", slogan (yoksa ad + kuruluş yılı),
// kısa giriş. (2) "Nasıl başladı": altın çerçeveli hikâye fotoğrafı, ad, büyük ilk harfli hikâye ve gerçek rakamlar.
// (3) Koyu bant: ustanın sözü, portresi, adı ve unvanı. (4) "Ekibimiz": altın halkalı yuvarlak portreler, Romen
// rakamı, ince dikey ayırıcılar. (5) "Değişmeyenlerimiz" (değerler). (6) "Yolculuğumuz" (kilometre taşları; yıl
// sekmeleri). (7) Davet. Verisi olmayan bölüm çizilmez; restoranın girmediği bilgi uydurulmaz.

export default function EliteAbout({ site }: { site: PublicSite }) {
    const edit = useSiteEdit();
    const showEmpty = Boolean(edit?.showEmpty);
    const empty = !hasAboutPage(site) && !showEmpty;
    return (
        <SitePage site={site} current="hakkimizda" overlayHeader>
            <main className="flex flex-1 flex-col bg-[var(--site-bg)] text-[var(--site-text)]">
                <AboutHero site={site} />
                {empty ? <EliteEmpty text="Hakkımızda yazısı henüz eklenmedi." /> : (
                    <>
                        <Story site={site} />
                        <Founder site={site} />
                        <Team site={site} />
                        <Values site={site} />
                        <Journey site={site} />
                        <Invitation site={site} />
                    </>
                )}
            </main>
        </SitePage>
    );
}

function AboutHero({ site }: { site: PublicSite }) {
    const edit = useSiteEdit();
    const showEmpty = Boolean(edit?.showEmpty);
    const c = site.site;
    const name = restaurantName(site);
    const fallback: [string, string] = c.foundedYear ? [`${name},`, `${sinceYear(c.foundedYear)}.`] : splitAccent(name);
    const [main, accent] = c.storyTitle ? splitAccent(c.storyTitle) : fallback;
    const title = edit
        ? <EditableText field="storyTitle" value={c.storyTitle} fallback={[main, accent].filter(Boolean).join(' ')} placeholder="Slogan yazın" />
        : <>{main && <>{main}<br /></>}<em className="italic">{accent}</em></>;
    const lead = c.tagline || showEmpty
        ? <EditableText as="p" field="tagline" value={c.tagline} placeholder="Kısa giriş yazın" className={heroLead} />
        : null;
    return (
        <EliteHero titleId="hk-baslik" label="Hikâyemiz" title={title} lead={lead}
            image={c.aboutHeroUrl || c.coverImageUrl} ownImage={Boolean(c.aboutHeroUrl)}
            imageTarget="photo:hero-hakkimizda" imageLabel="Hakkımızda kapağı" emptyHint="+ Hakkımızda kapağı seç" />
    );
}

// ── Nasıl başladı ────────────────────────────────────────────────────────────────────────────────

function Story({ site }: { site: PublicSite }) {
    const edit = useSiteEdit();
    const showEmpty = Boolean(edit?.showEmpty);
    const c = site.site;
    const name = restaurantName(site);
    const since = c.foundedYear ? sinceYear(c.foundedYear) : null;
    const hasStory = Boolean(c.about) || showEmpty;
    const facts = aboutStats(site);
    const photo = c.aboutImageUrl;
    const showPhoto = Boolean(photo) || showEmpty;
    const place = [[site.district, site.openAddress].filter(Boolean).join(', '), hoursLine(site)].filter(Boolean).join('. ');

    return (
        <section aria-labelledby="hk-hikaye" className="bg-[var(--site-bg)]">
            <div className={cn(elWrap, elSection, 'flex max-w-[1240px] flex-col gap-16 md:py-[140px]')}>
                <div className="flex flex-wrap items-center gap-x-24 gap-y-14">
                    {showPhoto && (
                        <div className="relative min-w-0 flex-[1_1_460px] pb-5 pr-5 sm:pb-7 sm:pr-7">
                            <span aria-hidden="true" className="absolute bottom-0 right-0 h-[calc(100%-20px)] w-[calc(100%-20px)] border border-[var(--site-accent)] sm:h-[calc(100%-28px)] sm:w-[calc(100%-28px)]" />
                            <EditableBlock target="photo:about" label="Hikâye fotoğrafı" chip="Fotoğrafı değiştir" className="relative">
                                <div className="rb-el-zoom relative h-[420px] overflow-hidden bg-[var(--site-placeholder)] md:h-[600px]">
                                    {photo
                                        ? <img src={photo} alt="" loading="lazy" className="h-full w-full object-cover" />
                                        : <span className="flex h-full items-center justify-center font-[family-name:'DM_Sans',system-ui,sans-serif] text-[15px] font-semibold text-[var(--site-muted)]">+ Hikâye fotoğrafı ekle</span>}
                                    {photo?.includes('/shared/stock/') && <StockImageLabel className="bottom-auto right-3 top-3" />}
                                </div>
                            </EditableBlock>
                        </div>
                    )}
                    <div className={cn('flex min-w-0 flex-[1_1_420px] flex-col gap-[26px]', !showPhoto && 'mx-auto max-w-[760px]')}>
                        <EditableBlock target="year" label="Kuruluş yılı" className="self-start">
                            <EliteKicker>{since ? `Nasıl başladı · ${since}` : 'Nasıl başladı'}</EliteKicker>
                        </EditableBlock>
                        <h2 id="hk-hikaye" className={cn(elTitle, 'md:text-[clamp(40px,4vw,62px)] md:leading-[1.05]')}>
                            {hasStory ? name : <>Bizi <em className="italic">menümüzden</em> tanıyın.</>}
                        </h2>
                        {hasStory ? (
                            <EditableText as="p" field="about" value={c.about} multiline placeholder="Hikâyenizi yazın: nasıl başladınız, neyi farklı yapıyorsunuz."
                                className={cn('m-0 whitespace-pre-line text-[17px] leading-[1.9] text-[var(--site-sub)] md:text-lg',
                                    c.about && 'first-letter:float-left first-letter:pr-3.5 first-letter:pt-2 first-letter:font-[family-name:var(--site-serif)] first-letter:text-[72px] first-letter:leading-[0.8] first-letter:text-[var(--site-accent-text)] md:first-letter:text-[84px]')} />
                        ) : (
                            <>
                                {place && <p className="m-0 text-[17px] leading-[1.9] text-[var(--site-sub)]">{place}.</p>}
                                <Link to="/menu" className={elButton.dark}>Menüyü gör</Link>
                            </>
                        )}
                    </div>
                </div>
                {facts.length > 0 && (
                    <dl className={cn('m-0 grid grid-cols-2 border-t border-[color-mix(in_srgb,var(--site-text)_18%,transparent)]',
                        ({ 1: 'grid-cols-1', 2: 'md:grid-cols-2', 3: 'md:grid-cols-3', 4: 'md:grid-cols-4' } as Record<number, string>)[facts.length])}>
                        {facts.map(f => {
                            const cell = (
                                <div className="flex h-full flex-col items-center gap-2 px-3 pt-9 text-center">
                                    <dd className={cn(elSerif, 'order-1 m-0 text-[48px] leading-none md:text-[60px]')}>{f.value}</dd>
                                    <dt className="order-2 text-xs uppercase tracking-[0.24em] text-[var(--site-muted)]">{f.label}</dt>
                                </div>
                            );
                            return (
                                <div key={f.key} className="min-w-0 border-[color-mix(in_srgb,var(--site-text)_18%,transparent)] even:border-l odd:last:col-span-2 md:border-l md:odd:last:col-span-1 md:first:border-l-0">
                                    {f.wrap ? f.wrap(cell) : cell}
                                </div>
                            );
                        })}
                    </dl>
                )}
            </div>
        </section>
    );
}

// ── Usta ─────────────────────────────────────────────────────────────────────────────────────────

function Founder({ site }: { site: PublicSite }) {
    const edit = useSiteEdit();
    const showEmpty = Boolean(edit?.showEmpty);
    const c = site.site;
    if (!(c.founderQuote || c.founderName || showEmpty)) return null;
    const [main, accent] = splitAccent(c.founderQuote);
    const photoT = editTarget(edit, 'photo:founder', 'Usta portresi');
    return (
        <section aria-labelledby="hk-usta" className={cn('relative overflow-hidden', onDark)}>
            <div className={cn(elWrap, elSection, 'flex max-w-[1040px] flex-col items-center gap-[30px] text-center md:py-[140px]')}>
                {c.founderPhotoUrl ? (
                    <div className="relative">
                        <img src={c.founderPhotoUrl} alt={c.founderName} {...photoT} loading="lazy"
                            className={cn('h-[120px] w-[120px] rounded-full border border-[var(--site-accent-on-dark)] object-cover p-1', photoT.className)} />
                        {c.founderPhotoUrl.includes('/shared/stock/') && <StockImageLabel className="-bottom-1 right-1/2 translate-x-1/2 whitespace-nowrap" />}
                    </div>
                ) : edit ? (
                    <div className="w-[200px]"><EmptySlot target="photo:founder" title="+ Portre ekle" className="bg-[var(--site-card)]" /></div>
                ) : c.founderName && !c.founderQuote && (
                    <span aria-hidden="true" className={cn(elSerif, 'flex h-[120px] w-[120px] items-center justify-center rounded-full border border-[color-mix(in_srgb,var(--site-accent-on-dark)_50%,transparent)] text-[52px] text-[var(--site-accent-on-dark)]')}>{initials(c.founderName)}</span>
                )}
                {(c.founderQuote || showEmpty) && (
                    <>
                        <span aria-hidden="true" className={cn(elSerif, 'text-[90px] leading-[0.6] text-[var(--site-accent-on-dark)]')}>“</span>
                        <blockquote className={cn(elSerif, 'm-0 break-words text-[30px] leading-[1.22] md:text-[clamp(34px,3.6vw,54px)]')}>
                            {edit
                                ? <EditableText field="founderQuote" value={c.founderQuote} multiline placeholder="Ustanın tek cümlelik sözü" />
                                : <>{main && <>{main} </>}<em className="italic text-[var(--site-accent-on-dark)]">{accent}</em></>}
                        </blockquote>
                    </>
                )}
                <h2 id="hk-usta" className="m-0 flex flex-wrap justify-center gap-x-1.5 text-xs font-normal uppercase tracking-[0.32em] text-[var(--site-on-paper-sub)]">
                    {edit ? (
                        <>
                            <EditableText field="founderName" value={c.founderName} placeholder="Ustanın adı" />·
                            <EditableText field="founderTitle" value={c.founderTitle} placeholder="Unvanı" />
                        </>
                    ) : [c.founderName, c.founderTitle].filter(Boolean).join(' · ') || 'Mutfağın başında'}
                </h2>
            </div>
        </section>
    );
}

// ── Ekibimiz ─────────────────────────────────────────────────────────────────────────────────────

function Team({ site }: { site: PublicSite }) {
    const team = useTeam(site);
    if (!team) return null;
    const { members, empty, canAdd } = team;
    // Satırdaki ilk kartta ayırıcı yok: telefonda 2'li, geniş ekranda 4'lü sıralar (flex: eksik sıra ortalanır).
    const cell = 'flex min-w-0 basis-1/2 flex-col items-center gap-3.5 px-2 text-center md:basis-1/4 md:px-7';
    const rule = 'md:border-l md:border-[color-mix(in_srgb,var(--site-accent-text)_25%,transparent)] md:[&:nth-child(4n+1)]:border-l-0';
    return (
        <section aria-labelledby="hk-ekip" className="bg-[var(--site-bg)]">
            <div className={cn(elWrap, elSection, 'flex max-w-[1240px] flex-col gap-14 md:gap-16')}>
                <div className="flex flex-col items-center gap-[18px] text-center">
                    <EliteKicker centered>Ekibimiz</EliteKicker>
                    <TeamTitle site={site} id="hk-ekip" fallback="Mutfağın ustaları" className={elTitle} />
                    <TeamIntro site={site} className="m-0 max-w-[52ch] text-base leading-[1.8] text-[var(--site-sub)]" />
                    <TeamEditorNote team={team} />
                </div>
                <ul className="m-0 flex list-none flex-wrap justify-center gap-y-11 p-0">
                    {members.map((m, i) => (
                        <li key={m.id} className={cn(cell, rule)}>
                            <ListCard list={TEAM_LIST} index={i} count={members.length} label="Ekip üyesi" className="flex w-full flex-col items-center rounded-none">
                                <EliteMember member={m} index={i} />
                            </ListCard>
                        </li>
                    ))}
                    {canAdd && (
                        <li className={cell}>
                            <AddCard list={TEAM_LIST} label="Ekip üyesi ekle" count={members.length} max={SITE_LIMITS.teamMember.max}
                                hint={empty ? 'Ad, rol, fotoğraf' : `en fazla ${SITE_LIMITS.teamMember.max}`} className="aspect-square max-w-[200px] rounded-full" />
                        </li>
                    )}
                    {empty && TEAM_SAMPLES.map((m, i) => (
                        <li key={m.id} className={cn(cell, 'hidden md:flex')}>
                            <TeamSample index={i} className="flex flex-col items-center"><EliteMember member={m} index={i} /></TeamSample>
                        </li>
                    ))}
                </ul>
            </div>
        </section>
    );
}

function EliteMember({ member, index }: { member: SiteTeamMember; index: number }) {
    return (
        <div className="flex w-full flex-col items-center gap-3.5">
            <span className="block h-[132px] w-[132px] rounded-full border border-[var(--site-accent)] p-[5px] md:h-[168px] md:w-[168px]">
                <TeamPhoto member={member} className="h-full w-full rounded-full"
                    initialsClassName={cn(elSerif, 'bg-[var(--site-alt)] text-[44px] text-[var(--site-accent-text)] md:text-[56px]')} />
            </span>
            <span aria-hidden="true" className={cn(elItalic, 'text-lg text-[var(--site-accent-text)]')}>{roman(index + 1).toLowerCase()}.</span>
            <TeamName member={member} className={cn(elSerif, 'm-0 break-words text-[26px] leading-[1.1] md:text-[30px]')} />
            <TeamRole member={member} className="text-[11px] uppercase tracking-[0.32em] text-[var(--site-sub)]" />
            <TeamNote member={member} className="m-0 max-w-[28ch] text-sm leading-[1.75] text-[var(--site-sub)]" />
        </div>
    );
}

// ── Değişmeyenlerimiz ────────────────────────────────────────────────────────────────────────────

const COUNT_WORDS = ['', 'Bir', 'İki', 'Üç', 'Dört', 'Beş', 'Altı'];

function Values({ site }: { site: PublicSite }) {
    const edit = useSiteEdit();
    const showEmpty = Boolean(edit?.showEmpty);
    const values = site.site.values;
    if (values.length === 0 && !showEmpty) return null;
    const word = COUNT_WORDS[values.length];
    return (
        <section aria-labelledby="hk-degerler" className="bg-[var(--site-alt)]">
            <div className={cn(elWrap, elSection, 'flex max-w-[1240px] flex-col gap-14 md:gap-16 md:py-[140px]')}>
                <div className="flex flex-col items-center gap-[18px] text-center">
                    <EliteKicker centered>Değişmeyenlerimiz</EliteKicker>
                    <h2 id="hk-degerler" className={elTitle}>{word ? <>{word} <em className="italic">söz</em></> : <em className="italic">Sözlerimiz</em>}</h2>
                </div>
                <ol className="m-0 grid list-none grid-cols-1 p-0 md:grid-cols-[repeat(auto-fit,minmax(280px,1fr))]">
                    {values.map((v, i) => (
                        <li key={i} className={cn('min-w-0 border-[color-mix(in_srgb,var(--site-text)_18%,transparent)]', i > 0 && 'border-t md:border-l md:border-t-0')}>
                            <ListCard list="values" index={i} count={values.length} label="Değer" className="h-full rounded-none">
                                <div className={cn('flex h-full flex-col gap-3.5 py-9 md:pb-0 md:pt-10', i > 0 ? 'md:pl-10' : '', 'md:pr-10')}>
                                    <span aria-hidden="true" className={cn(elItalic, 'text-[28px] text-[var(--site-accent-text)]')}>{roman(i + 1)}</span>
                                    <EditableText as="h3" field={`value:${i}:title`} value={v.title} placeholder="Başlık"
                                        className={cn(elSerif, 'm-0 break-words text-[30px] leading-[1.1] md:text-[32px]')} />
                                    {(v.text || edit) && (
                                        <EditableText as="p" field={`value:${i}:text`} value={v.text} placeholder="Tek cümle"
                                            className="m-0 text-base leading-[1.8] text-[var(--site-sub)]" />
                                    )}
                                </div>
                            </ListCard>
                        </li>
                    ))}
                </ol>
                <AddCard list="values" label="Değer ekle" count={values.length} max={SITE_LIMITS.value.max} />
            </div>
        </section>
    );
}

// ── Yolculuğumuz ─────────────────────────────────────────────────────────────────────────────────

function Journey({ site }: { site: PublicSite }) {
    const edit = useSiteEdit();
    const showEmpty = Boolean(edit?.showEmpty);
    const milestones = site.site.milestones;
    const [sel, setSel] = useState(0);
    // Sitede en az 2 durak olunca görünür; düzenleyicide eklenebilsin diye boşken de.
    if (!(milestones.length >= 2 || (edit && (milestones.length > 0 || showEmpty)))) return null;
    const first = milestones.find(m => m.year)?.year;
    const index = Math.min(sel, milestones.length - 1);
    const cols = ({ 2: 'grid-cols-2', 3: 'grid-cols-3', 4: 'grid-cols-2 sm:grid-cols-4', 5: 'grid-cols-3 sm:grid-cols-5' } as Record<number, string>)[milestones.length] ?? 'grid-cols-1';

    return (
        <section aria-labelledby="hk-yol" className="bg-[var(--site-bg)]">
            <div className={cn(elWrap, elSection, 'flex max-w-[1240px] flex-col gap-12 md:gap-14 md:py-[140px]')}>
                <div className="flex flex-wrap items-end justify-between gap-5">
                    <h2 id="hk-yol" className="m-0"><EliteKicker>Yolculuğumuz</EliteKicker></h2>
                    {first && !edit && <span className="text-xs uppercase tracking-[0.2em] text-[var(--site-muted)]">{first} — Bugün</span>}
                    {edit && milestones.length < 2 && <span className="font-[family-name:'DM_Sans',system-ui,sans-serif] text-sm text-[#7A4E0E]">En az 2 olunca görünür.</span>}
                </div>
                {edit ? (
                    <ol className="m-0 grid list-none grid-cols-1 gap-8 border-t border-[color-mix(in_srgb,var(--site-text)_18%,transparent)] p-0 pt-7 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fit,minmax(200px,1fr))]">
                        {milestones.map((m, i) => (
                            <li key={i} className="min-w-0">
                                <ListCard list="milestones" index={i} count={milestones.length} label="Kilometre taşı" className="h-full rounded-none">
                                    <div className="flex flex-col gap-3">
                                        <EditableText field={`milestone:${i}:year`} value={m.year ? String(m.year) : ''} placeholder="Yıl" className={cn(elSerif, 'text-[40px] leading-none tabular-nums')} />
                                        <EditableText as="p" field={`milestone:${i}:text`} value={m.text} placeholder="Ne oldu?" className={cn(elItalic, 'm-0 text-xl leading-[1.4]')} />
                                    </div>
                                </ListCard>
                            </li>
                        ))}
                        {milestones.length < SITE_LIMITS.milestone.max && (
                            <li><AddCard list="milestones" label="Kilometre taşı ekle" count={milestones.length} max={SITE_LIMITS.milestone.max} /></li>
                        )}
                    </ol>
                ) : (
                    <>
                        <div role="group" aria-label="Yıllar" className={cn('grid border-t border-[color-mix(in_srgb,var(--site-text)_18%,transparent)]', cols)}>
                            {milestones.map((m, i) => {
                                const on = i === index;
                                return (
                                    <button key={i} type="button" aria-pressed={on} onClick={() => setSel(i)} onMouseEnter={() => setSel(i)}
                                        className={cn('flex min-h-[88px] flex-col items-start gap-2.5 bg-transparent pt-7 text-left transition-colors',
                                            on ? 'text-[var(--site-text)] shadow-[inset_0_2px_0_var(--site-accent-text)]' : 'text-[var(--site-muted)] hover:text-[var(--site-text)]')}>
                                        <span className={cn(elSerif, 'text-[34px] leading-none tabular-nums md:text-[40px]')}>{m.year || '—'}</span>
                                    </button>
                                );
                            })}
                        </div>
                        <p key={index} aria-live="polite" className={cn(elItalic, 'rb-el-belir-hizli m-0 max-w-[760px] text-2xl leading-[1.4] md:text-[30px]')}>{milestones[index]?.text}</p>
                    </>
                )}
            </div>
        </section>
    );
}

// ── Davet ────────────────────────────────────────────────────────────────────────────────────────

function Invitation({ site }: { site: PublicSite }) {
    const edit = useSiteEdit();
    if (edit) return null;
    const canReserve = canReserveOnline(site);
    return (
        <ExternalHint source="reservation">
            <section aria-labelledby="hk-davet" className="bg-[var(--site-alt)]">
                <div className={cn(elWrap, 'flex max-w-[1240px] flex-wrap items-center justify-between gap-8 py-20 md:py-[120px]')}>
                    <h2 id="hk-davet" className={cn(elTitle, 'md:text-[clamp(40px,4.2vw,64px)]')}>Hikâyenin devamı<br /><em className="italic">sizin masanızda.</em></h2>
                    <div className="flex flex-wrap gap-3.5">
                        {canReserve && <Link to={RESERVATION_PATH} className={elButton.dark}>Rezervasyon yaptır</Link>}
                        <Link to="/menu" className={elButton.line}>Menüyü gör</Link>
                    </div>
                </div>
            </section>
        </ExternalHint>
    );
}
