import type { PublicSite } from '@/features/customerSite/types';
import { cn } from '@/lib/utils';
import { StockImageLabel } from '../../../components/StockImageLabel';
import { PageEmpty, SitePage } from '../../SiteFrame';
import { hasAboutPage, serif, sinceYear } from '../../siteParts';
import { initials } from '../../siteTheme';
import { aboutStats } from '../../aboutStats';
import { restaurantName } from '../../useSite';
import { AddCard, EditableBlock, EditableText, EmptySlot, ListCard } from '../../siteEdit';
import { SITE_LIMITS, editTarget, useSiteEdit } from '../../siteEditContext';
import type { DesignPageProps } from '../registry';
import { LampString, MhHeading, NightBackdrop, Ornament, ReserveBand } from './MeyhaneBits';
import { mhLeader, mhNarrow, mhSign, mhUnderHeader, mhWrap } from './meyhaneParts';

// Meyhane Gecesi Hakkımızda: kutu kutu dergi düzeni yerine tek sütunda okunan bir akşam hikâyesi.
// (1) Gece kapağı: ortada tabela gibi hikâye başlığı (yoksa ad), altında "1987'den beri" ve kısa giriş.
// (2) Hikâye: dar okuma sütunu, büyük ilk harf. (3) Ustanın sözü: ortalı büyük alıntı, süs. (4) Usta: kemer
// çerçeveli portre ve adı. (5) "Sofranın adabı" (değerler): başlık ve tek cümle, iki sütun. (6) Yolculuk: dikey zaman
// çizgisi (yıl solda). (7) Rakamlar adisyon satırı gibi (etiket · noktalı çizgi · değer). (8) "Masa ayırt" bandı.

export default function MeyhaneAbout({ site }: DesignPageProps) {
    const edit = useSiteEdit();
    const showEmpty = Boolean(edit?.showEmpty);
    if (!hasAboutPage(site) && !showEmpty) {
        return (
            <SitePage site={site} current="hakkimizda">
                <main className="flex flex-1 flex-col">
                    <Hero site={site} />
                    <PageEmpty text="Hakkımızda yazısı henüz eklenmedi." />
                </main>
            </SitePage>
        );
    }
    return (
        <SitePage site={site} current="hakkimizda">
            <main className="flex flex-1 flex-col">
                <Hero site={site} />
                <StoryText site={site} />
                <Quote site={site} />
                <Founder site={site} />
                <Values site={site} />
                <Journey site={site} />
                <Facts site={site} />
                <ReserveBand site={site} title="Hikâyenin devamı sofrada." />
            </main>
        </SitePage>
    );
}

function Hero({ site }: { site: PublicSite }) {
    const edit = useSiteEdit();
    const showEmpty = Boolean(edit?.showEmpty);
    const c = site.site;
    const title = c.storyTitle || restaurantName(site);
    return (
        <section aria-labelledby="mh-hk" className={cn('relative isolate overflow-hidden', !edit && mhUnderHeader)}>
            <NightBackdrop image={c.aboutHeroUrl || c.coverImageUrl || undefined} target="photo:hero-hakkimizda" label="Hakkımızda kapağı" emptyHint="+ Hakkımızda kapağı seç" />
            <LampString className="top-[76px] lg:top-[92px]" sag={30} />
            <div className="pointer-events-none relative z-[1] [&_[data-edit-target]]:pointer-events-auto mx-auto flex min-h-[min(70svh,620px)] max-w-[900px] flex-col items-center justify-center gap-5 px-4 pb-16 pt-[150px] text-center sm:px-8 lg:pt-[176px] [&_[data-edit-text]]:pointer-events-auto">
                {edit ? (
                    <EditableText as="h1" id="mh-hk" field="storyTitle" value={c.storyTitle} fallback={title} placeholder="Slogan yazın"
                        className={cn(mhSign, 'text-[48px] sm:text-[72px] md:text-[96px]')} />
                ) : (
                    <h1 id="mh-hk" className={cn(mhSign, 'text-balance text-[48px] sm:text-[72px] md:text-[96px]')}>{title}</h1>
                )}
                {c.foundedYear && (
                    <EditableBlock target="year" label="Kuruluş yılı">
                        <p className={cn(serif, 'm-0 text-[22px] text-[var(--site-accent-text)] sm:text-[26px]')}>{sinceYear(c.foundedYear)}</p>
                    </EditableBlock>
                )}
                {(c.tagline || showEmpty) && (
                    <EditableText as="p" field="tagline" value={c.tagline} placeholder="Kısa giriş yazın"
                        className="m-0 max-w-[52ch] text-[17px] leading-relaxed text-[var(--site-sub)]" />
                )}
            </div>
        </section>
    );
}

function StoryText({ site }: { site: PublicSite }) {
    const edit = useSiteEdit();
    const c = site.site;
    if (!c.about && !edit?.showEmpty) return null;
    return (
        <section aria-label="Hikâyemiz" className={cn(mhNarrow, 'py-16 sm:py-20')}>
            <EditableText as="p" field="about" value={c.about} multiline placeholder="Hikâyenizi yazın: nasıl başladınız, neyi farklı yapıyorsunuz."
                className={cn('m-0 whitespace-pre-line text-[18px] leading-[1.85] text-[var(--site-sub)] sm:text-[19px]',
                    c.about && 'first-letter:float-left first-letter:pr-3 first-letter:pt-2 first-letter:font-[family-name:var(--site-serif)] first-letter:text-[84px] first-letter:leading-[0.8] first-letter:text-[var(--site-accent-text)]')} />
        </section>
    );
}

function Quote({ site }: { site: PublicSite }) {
    const edit = useSiteEdit();
    const c = site.site;
    if (!c.founderQuote && !edit?.showEmpty) return null;
    return (
        <figure className="m-0 border-y border-[var(--site-border)] bg-[var(--site-alt)] px-4 py-16 text-center sm:py-20">
            <div className="mx-auto flex max-w-[860px] flex-col items-center gap-6">
                <Ornament />
                <blockquote className={cn(serif, 'm-0 text-balance text-[30px] leading-[1.25] sm:text-[40px] md:text-[48px]')}>
                    “<EditableText field="founderQuote" value={c.founderQuote} multiline placeholder="Ustanın tek cümlelik sözü" />”
                </blockquote>
                {(c.founderName || edit) && (
                    <figcaption className="text-[15px] text-[var(--site-sub)]">
                        <EditableText field="founderName" value={c.founderName} placeholder="Ustanın adı" className="font-bold text-[var(--site-text)]" />
                        {(c.founderTitle || edit) && <>, <EditableText field="founderTitle" value={c.founderTitle} placeholder="Unvanı" /></>}
                    </figcaption>
                )}
            </div>
        </figure>
    );
}

function Founder({ site }: { site: PublicSite }) {
    const edit = useSiteEdit();
    const c = site.site;
    if (!c.founderName && !edit?.showEmpty) return null;
    const photoT = editTarget(edit, 'photo:founder', 'Usta portresi');
    return (
        <section aria-labelledby="mh-usta" className={cn(mhWrap, 'grid items-center gap-10 py-16 sm:py-24 md:grid-cols-2 md:gap-16')}>
            <div className="relative mx-auto w-full max-w-[380px]">
                {c.founderPhotoUrl ? (
                    <>
                        <img src={c.founderPhotoUrl} alt={c.founderName} {...photoT} className={cn('block aspect-[4/5] w-full rounded-t-full border border-[var(--site-border-mid)] object-cover', photoT.className)} />
                        {c.founderPhotoUrl.includes('/shared/stock/') && <StockImageLabel className="bottom-3 right-3" />}
                    </>
                ) : edit ? (
                    <EmptySlot target="photo:founder" title="+ Portre ekle" className="aspect-[4/5] rounded-t-full bg-[var(--site-card)]" />
                ) : (
                    <span aria-hidden="true" className={cn(serif, 'rb-mh-tray flex aspect-[4/5] w-full items-center justify-center rounded-t-full text-[96px] text-[var(--site-accent-text)]')}>
                        {initials(c.founderName)}
                    </span>
                )}
            </div>
            <div className="flex min-w-0 flex-col gap-4 text-center md:text-left">
                <EditableText as="h2" id="mh-usta" field="founderName" value={c.founderName} placeholder="Ustanın adı"
                    className={cn(serif, 'm-0 break-words text-[44px] leading-none sm:text-[56px]')} />
                {(c.founderTitle || edit?.showEmpty) && (
                    <EditableText as="p" field="founderTitle" value={c.founderTitle} placeholder="Unvanı"
                        className="m-0 text-[17px] leading-relaxed text-[var(--site-accent-text)]" />
                )}
                {!edit && (
                    <p className="m-0 text-base text-[var(--site-sub)]">Mutfağın başında.</p>
                )}
            </div>
        </section>
    );
}

function Values({ site }: { site: PublicSite }) {
    const edit = useSiteEdit();
    const values = site.site.values;
    if (values.length === 0 && !edit?.showEmpty) return null;
    return (
        <section aria-labelledby="mh-adap" className={cn(mhWrap, 'flex flex-col gap-10 pb-16 sm:pb-24')}>
            <MhHeading id="mh-adap" title="Sofranın adabı" />
            <ul className="m-0 grid list-none gap-x-14 gap-y-0 p-0 md:grid-cols-2">
                {values.map((v, i) => (
                    <li key={i} className="min-w-0 border-t border-[var(--site-border-mid)]">
                        <ListCard list="values" index={i} count={values.length} label="Değer" className="rounded-none">
                            <div className="flex flex-col gap-2 py-6">
                                <EditableText as="h3" field={`value:${i}:title`} value={v.title} placeholder="Başlık"
                                    className={cn(serif, 'm-0 break-words text-[26px] leading-[1.1] sm:text-[30px]')} />
                                {(v.text || edit) && (
                                    <EditableText as="p" field={`value:${i}:text`} value={v.text} placeholder="Tek cümle"
                                        className="m-0 text-base leading-relaxed text-[var(--site-sub)]" />
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
        <section aria-labelledby="mh-yol" className={cn(mhNarrow, 'flex flex-col gap-10 pb-16 sm:pb-24')}>
            <MhHeading id="mh-yol" title="Yıllar içinde" note={edit && milestones.length < 2 ? 'En az 2 olunca görünür.' : undefined} />
            <ol className="relative m-0 flex list-none flex-col gap-0 p-0 before:absolute before:bottom-2 before:left-[84px] before:top-2 before:w-px before:bg-[var(--site-border-mid)] sm:before:left-[112px]">
                {milestones.map((m, i) => (
                    <li key={i} className="relative">
                        <ListCard list="milestones" index={i} count={milestones.length} label="Kilometre taşı" className="rounded-none">
                            <div className="grid grid-cols-[84px_1fr] items-baseline gap-x-6 py-4 sm:grid-cols-[112px_1fr]">
                                <EditableText field={`milestone:${i}:year`} value={m.year ? String(m.year) : ''} placeholder="Yıl"
                                    className={cn(serif, 'pr-4 text-right text-[26px] leading-none tabular-nums text-[var(--site-accent-text)] sm:text-[32px]')} />
                                <span aria-hidden="true" className={cn('absolute left-[80px] top-[26px] h-[9px] w-[9px] rounded-full sm:left-[108px]',
                                    i === milestones.length - 1 ? 'bg-[var(--site-accent)] shadow-[0_0_12px_2px_color-mix(in_srgb,var(--site-accent)_55%,transparent)]' : 'bg-[var(--site-border-strong)]')} />
                                <EditableText as="p" field={`milestone:${i}:text`} value={m.text} placeholder="Ne oldu?"
                                    className="m-0 text-[17px] leading-relaxed" />
                            </div>
                        </ListCard>
                    </li>
                ))}
            </ol>
            {edit && <AddCard list="milestones" label="Kilometre taşı ekle" count={milestones.length} max={SITE_LIMITS.milestone.max} />}
        </section>
    );
}

/** Rakamlar adisyon satırı gibi: etiket, noktalı çizgi, değer. Yalnız gerçek veriden (aboutStats). */
function Facts({ site }: { site: PublicSite }) {
    const facts = aboutStats(site);
    if (facts.length === 0) return null;
    return (
        <section aria-label="Rakamlarla" className={cn(mhNarrow, 'pb-16 sm:pb-24')}>
            <dl className="m-0 flex flex-col border-y border-[var(--site-border-mid)] py-3">
                {facts.map(f => {
                    const row = (
                        <div className="flex items-baseline gap-3 py-3">
                            <dt className="text-[17px] text-[var(--site-sub)]">{f.label.charAt(0).toLocaleUpperCase('tr-TR') + f.label.slice(1)}</dt>
                            <span aria-hidden="true" className={mhLeader} />
                            <dd className={cn(serif, 'm-0 text-[30px] leading-none tabular-nums text-[var(--site-accent-text)]')}>{f.value}</dd>
                        </div>
                    );
                    return <div key={f.key}>{f.wrap ? f.wrap(row) : row}</div>;
                })}
            </dl>
        </section>
    );
}
