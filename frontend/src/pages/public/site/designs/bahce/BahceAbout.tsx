import type { PublicSite } from '@/features/customerSite/types';
import { cn } from '@/lib/utils';
import { StockImageLabel } from '../../../components/StockImageLabel';
import { PageEmpty, SitePage } from '../../SiteFrame';
import { hasAboutPage, serif, sinceYear } from '../../siteParts';
import { initials, resolveFont } from '../../siteTheme';
import { aboutStats } from '../../aboutStats';
import { restaurantName } from '../../useSite';
import { AddCard, EditableBlock, EditableText, EmptySlot, ListCard } from '../../siteEdit';
import { SITE_LIMITS, editTarget, useSiteEdit } from '../../siteEditContext';
import type { DesignPageProps } from '../registry';
import { BhHeading, DrawnPlate, Sprig, WeekendCard } from './BahceBits';
import { DISH_CYCLE, bhDisplay, bhNarrow, bhWrap, nameStyle } from './bahceParts';

// Bahçe Kahvaltısı Hakkımızda: bahçede geçen bir sabah hikâyesi.
// (1) Kapak: solda kalın başlık (hikâye başlığı ya da ad), "… yılından beri" ve kısa giriş; sağda organik (damla)
//     biçimli kapak fotoğrafı, yanında tereyağı güneş ve yaprak dalı. (2) Hikâye: dar sütun, ilk paragraf iri.
// (3) Ustanın sözü: tereyağı damla zeminde büyük alıntı. (4) Usta: tabak kenarlı yuvarlak portre.
// (5) "Sofranın ritüeli" (değerler): çizimli tabak simgeli yuvarlak kartlar. (6) "Bahçenin yılları": yapraklı dal
//     zaman çizgisi (gövde ortada, duraklar iki yana; telefonda tek yana). (7) Rakamlar tabaklarda. (8) Hafta sonu kartı.

export default function BahceAbout({ site }: DesignPageProps) {
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
                <WeekendCard site={site} title="Hikâyenin devamı sofrada." />
            </main>
        </SitePage>
    );
}

function Hero({ site }: { site: PublicSite }) {
    const edit = useSiteEdit();
    const showEmpty = Boolean(edit?.showEmpty);
    const c = site.site;
    const title = c.storyTitle || restaurantName(site);
    const photo = c.aboutHeroUrl || c.aboutImageUrl || c.coverImageUrl;
    const charWidth = resolveFont(c.font, 'bahce').charWidth.bold;
    return (
        <section aria-labelledby="bh-hk" className="relative overflow-hidden">
            <span aria-hidden="true" className="rb-bh-sun pointer-events-none absolute -right-[10%] -top-[24%] h-[560px] w-[560px] rounded-full" />
            <div className={cn(bhWrap, 'relative grid items-center gap-10 pb-14 pt-10 sm:pt-14 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] md:pb-20')}>
                <div className="@container flex min-w-0 flex-col items-start gap-5">
                    {edit ? (
                        <EditableText as="h1" id="bh-hk" field="storyTitle" value={c.storyTitle} fallback={title} placeholder="Slogan yazın"
                            className={cn(bhDisplay, 'w-full text-[48px] sm:text-[72px]')} />
                    ) : (
                        <h1 id="bh-hk" className={cn(bhDisplay, 'w-full text-balance')} style={nameStyle(title, charWidth, { max: 104 })}>{title}</h1>
                    )}
                    {c.foundedYear && (
                        <EditableBlock target="year" label="Kuruluş yılı" className="rounded-full">
                            <p className="m-0 inline-flex min-h-10 items-center rounded-full bg-[var(--site-mustard)] px-4 text-[16px] font-bold text-[var(--site-text)]">{sinceYear(c.foundedYear)}</p>
                        </EditableBlock>
                    )}
                    {(c.tagline || showEmpty) && (
                        <EditableText as="p" field="tagline" value={c.tagline} placeholder="Kısa giriş yazın"
                            className="m-0 max-w-[46ch] text-[18px] leading-relaxed text-[var(--site-sub)] sm:text-[20px]" />
                    )}
                </div>
                <div className="relative mx-auto w-full max-w-[460px]">
                    <EditableBlock target="photo:hero-hakkimizda" label="Hakkımızda kapağı" chip="Fotoğrafı değiştir" className="rb-bh-blob">
                        {photo ? (
                            <span className="relative block">
                                <img src={photo} alt="" className="rb-bh-blob block aspect-square w-full object-cover" />
                                {photo.includes('/shared/stock/') && <StockImageLabel className="bottom-[12%] right-[14%]" />}
                            </span>
                        ) : (
                            <span aria-hidden="true" className="rb-bh-blob rb-bh-cloth grid aspect-square w-full place-items-center">
                                <DrawnPlate kind="egg" className="w-[46%]" />
                                {edit && <span className="absolute bottom-[14%] rounded-full bg-[var(--site-card)] px-3 py-1.5 font-[family-name:'DM_Sans',system-ui,sans-serif] text-[13px] font-semibold">+ Hakkımızda kapağı seç</span>}
                            </span>
                        )}
                    </EditableBlock>
                    <Sprig className="absolute -left-8 bottom-4 w-[150px] -rotate-[18deg]" />
                </div>
            </div>
        </section>
    );
}

function StoryText({ site }: { site: PublicSite }) {
    const edit = useSiteEdit();
    const c = site.site;
    if (!c.about && !edit?.showEmpty) return null;
    return (
        <section aria-label="Hikâyemiz" className={cn(bhNarrow, 'pb-16 sm:pb-20')}>
            <EditableText as="p" field="about" value={c.about} multiline placeholder="Hikâyenizi yazın: nasıl başladınız, neyi farklı yapıyorsunuz."
                className="m-0 whitespace-pre-line text-[18px] leading-[1.85] text-[var(--site-sub)] first-line:font-semibold first-line:text-[var(--site-text)] sm:text-[19px]" />
        </section>
    );
}

function Quote({ site }: { site: PublicSite }) {
    const edit = useSiteEdit();
    const c = site.site;
    if (!c.founderQuote && !edit?.showEmpty) return null;
    return (
        <figure className="m-0 px-3 pb-16 sm:px-5 sm:pb-24">
            <div className="rb-bh-sunny mx-auto flex max-w-[1000px] flex-col items-center gap-6 rounded-[48px] bg-[var(--site-mustard)] px-6 py-14 text-center text-[var(--site-text)] sm:px-14 sm:py-20">
                <blockquote className={cn(serif, 'm-0 text-balance text-[28px] leading-[1.2] tracking-[-0.03em] sm:text-[40px] md:text-[46px]')}>
                    “<EditableText field="founderQuote" value={c.founderQuote} multiline placeholder="Ustanın tek cümlelik sözü" />”
                </blockquote>
                {(c.founderName || edit) && (
                    <figcaption className="text-[15px]">
                        <EditableText field="founderName" value={c.founderName} placeholder="Ustanın adı" className="font-bold" />
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
        <section aria-labelledby="bh-usta" className={cn(bhWrap, 'flex flex-col items-center gap-6 pb-16 text-center sm:flex-row sm:gap-10 sm:pb-24 sm:text-left')}>
            <div className="relative w-[220px] shrink-0 sm:w-[260px]">
                {c.founderPhotoUrl ? (
                    <span className="rb-bh-plate relative block aspect-square overflow-hidden rounded-full p-[5%]">
                        <img src={c.founderPhotoUrl} alt={c.founderName} {...photoT} className={cn('block h-full w-full rounded-full object-cover', photoT.className)} />
                        {c.founderPhotoUrl.includes('/shared/stock/') && <StockImageLabel className="bottom-[16%] right-[20%]" />}
                    </span>
                ) : edit ? (
                    <EmptySlot target="photo:founder" title="+ Portre ekle" className="aspect-square rounded-full bg-[var(--site-card)]" />
                ) : (
                    <span aria-hidden="true" className={cn(serif, 'rb-bh-plate flex aspect-square w-full items-center justify-center rounded-full text-[80px] tracking-[-0.04em] text-[var(--site-accent-text)]')}>
                        {initials(c.founderName)}
                    </span>
                )}
            </div>
            <div className="flex min-w-0 flex-col gap-3">
                <EditableText as="h2" id="bh-usta" field="founderName" value={c.founderName} placeholder="Ustanın adı"
                    className={cn(bhDisplay, 'text-[42px] sm:text-[56px]')} />
                {(c.founderTitle || edit?.showEmpty) && (
                    <EditableText as="p" field="founderTitle" value={c.founderTitle} placeholder="Unvanı"
                        className="m-0 text-[18px] font-semibold text-[var(--site-accent-text)]" />
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
        <section aria-labelledby="bh-ritual" className="rb-bh-cloth py-14 sm:py-20">
            <div className={cn(bhWrap, 'flex flex-col gap-8')}>
                <div className="self-start rounded-full bg-[var(--site-card)] px-6 py-3 shadow-[0_12px_30px_-20px_color-mix(in_srgb,var(--site-text)_60%,transparent)]">
                    <h2 id="bh-ritual" className={cn(serif, 'm-0 text-[30px] leading-none tracking-[-0.03em] sm:text-[40px]')}>Sofranın ritüeli</h2>
                </div>
                <ul className="m-0 grid list-none gap-4 p-0 md:grid-cols-2">
                    {values.map((v, i) => (
                        <li key={i} className="min-w-0">
                            <ListCard list="values" index={i} count={values.length} label="Değer" className="h-full rounded-[30px]">
                                <div className="flex h-full items-start gap-4 rounded-[30px] bg-[var(--site-card)] p-6 sm:p-7">
                                    <DrawnPlate kind={DISH_CYCLE[i % DISH_CYCLE.length]} className="w-14 shrink-0" />
                                    <div className="flex min-w-0 flex-col gap-1.5">
                                        <EditableText as="h3" field={`value:${i}:title`} value={v.title} placeholder="Başlık"
                                            className={cn(serif, 'm-0 break-words text-[24px] leading-[1.1] tracking-[-0.02em]')} />
                                        {(v.text || edit) && (
                                            <EditableText as="p" field={`value:${i}:text`} value={v.text} placeholder="Tek cümle"
                                                className="m-0 text-base leading-relaxed text-[var(--site-sub)]" />
                                        )}
                                    </div>
                                </div>
                            </ListCard>
                        </li>
                    ))}
                </ul>
                <AddCard list="values" label="Değer ekle" count={values.length} max={SITE_LIMITS.value.max} className="bg-[var(--site-card)]" />
            </div>
        </section>
    );
}

/** Yapraklı dal: ortada gövde (telefonda solda), her durak bir yaprakla gövdeye bağlı; yıl tereyağı yuvarlakta. */
function Journey({ site }: { site: PublicSite }) {
    const edit = useSiteEdit();
    const milestones = site.site.milestones;
    // Sitede en az 2 durak olunca görünür; düzenleyicide eklenebilsin diye boşken de.
    if (!(milestones.length >= 2 || (edit && (milestones.length > 0 || edit.showEmpty)))) return null;
    return (
        <section aria-labelledby="bh-yil" className={cn(bhWrap, 'flex flex-col gap-10 py-16 sm:py-24')}>
            <BhHeading id="bh-yil" title="Bahçenin yılları" center note={edit && milestones.length < 2 ? 'En az 2 olunca görünür.' : undefined} />
            <ol className="relative m-0 flex list-none flex-col gap-6 p-0 before:absolute before:bottom-0 before:left-[27px] before:top-0 before:w-[3px] before:rounded-full before:bg-[var(--site-olive)] md:gap-2 md:before:left-1/2 md:before:-ml-[1.5px]">
                {milestones.map((m, i) => {
                    const right = i % 2 === 1;
                    return (
                        <li key={i} className={cn('relative flex pl-[72px] md:w-1/2 md:pl-0', right ? 'md:ml-auto md:pl-12' : 'md:pr-12 md:text-right')}>
                            <span aria-hidden="true" className={cn('absolute left-[29px] top-[22px] h-4 w-9 rounded-[0_100%_0_100%] bg-[var(--site-olive)] md:top-[26px]',
                                right ? 'md:left-0' : 'md:left-auto md:right-0 md:scale-x-[-1]')} />
                            <ListCard list="milestones" index={i} count={milestones.length} label="Kilometre taşı" className="w-full rounded-[26px]">
                                <div className={cn('flex flex-col gap-2 rounded-[26px] border border-[var(--site-border)] bg-[var(--site-card)] p-5', !right && 'md:items-end')}>
                                    <EditableText field={`milestone:${i}:year`} value={m.year ? String(m.year) : ''} placeholder="Yıl"
                                        className={cn(serif, 'inline-flex min-h-10 items-center rounded-full bg-[var(--site-mustard)] px-4 text-[22px] leading-none tabular-nums tracking-[-0.02em] text-[var(--site-text)]')} />
                                    <EditableText as="p" field={`milestone:${i}:text`} value={m.text} placeholder="Ne oldu?"
                                        className="m-0 text-[17px] leading-relaxed" />
                                </div>
                            </ListCard>
                        </li>
                    );
                })}
            </ol>
            {edit && <AddCard list="milestones" label="Kilometre taşı ekle" count={milestones.length} max={SITE_LIMITS.milestone.max} />}
        </section>
    );
}

/** Rakamlar tabaklarda: yuvarlak tabak, ortasında büyük sayı, altında etiket. Yalnız gerçek veriden (aboutStats). */
function Facts({ site }: { site: PublicSite }) {
    const facts = aboutStats(site);
    if (facts.length === 0) return null;
    return (
        <section aria-label="Rakamlarla" className={cn(bhWrap, 'pb-16 sm:pb-24')}>
            <dl className="m-0 grid grid-cols-2 gap-x-4 gap-y-8 sm:flex sm:flex-wrap sm:justify-center sm:gap-10">
                {facts.map(f => {
                    const node = (
                        <div className="flex flex-col-reverse items-center gap-3 text-center">
                            <dt className="text-[15px] font-semibold text-[var(--site-sub)]">{f.label.charAt(0).toLocaleUpperCase('tr-TR') + f.label.slice(1)}</dt>
                            <dd className={cn(serif, 'rb-bh-plate m-0 flex aspect-square w-[128px] items-center justify-center rounded-full text-[40px] leading-none tabular-nums tracking-[-0.03em] text-[var(--site-accent-text)] sm:w-[150px] sm:text-[48px]')}>{f.value}</dd>
                        </div>
                    );
                    return <div key={f.key}>{f.wrap ? f.wrap(node) : node}</div>;
                })}
            </dl>
        </section>
    );
}
