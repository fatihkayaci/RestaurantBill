import { Fragment, type ReactNode } from 'react';
import { canReserveOnline, type PublicSite } from '@/features/customerSite/types';
import { cn } from '@/lib/utils';
import { MyReservations } from '../../SiteChrome';
import { SitePage } from '../../SiteFrame';
import type { MobileAction } from '../../siteActions';
import { useSiteEdit } from '../../siteEditContext';
import {
    HOME_SECTION_INFO, featuredProducts, filledCategories, homeSectionHasContent, resolveHomeSections, type HomeSectionKey,
} from '../../homeSections';
import type { DesignHomeProps } from '../registry';
import { SophraHero } from './SophraHero';
import { CalendarGlyph, MenuGlyph, PhoneGlyph } from './SophraIcons';
import { AboutSection, CategoriesSection, ContactSection, FeaturedSection, FeaturesSection, GallerySection, ReviewsSection } from './SophraSections';
import { SOPHRA_CSS, spWrap } from './sophraParts';
import { telHref } from '../../siteTheme';

// Sophra ana sayfası (varsayılan tasarım). Kapak sabit en üstte; ardından restoranın sıraladığı ve açtığı bölümler
// (homeSections: kategoriler, öne çıkanlar, hakkımızda, değerler ve olanaklar, galeri + Instagram, puan ve yorumlar,
// iletişim). Kapalı ya da içeriği olmayan bölüm çizilmez, boşluk bırakmaz. Kategoriler kapağın hemen ardındaysa dalgaya
// biner. Telefonda alt çubuk: Ara · Menü · (Rezervasyon). Düzenleyicide gizli bölümler ve menüden gelen
// bölümler ince bir şeritle görünür; tıklanınca "Anasayfa bölümleri" penceresi açılır.

export default function SophraHome({ site, mine }: DesignHomeProps) {
    const edit = useSiteEdit();
    const order = resolveHomeSections(site.site.homeSections);
    const shown = order.filter(s => s.enabled && homeSectionHasContent(site, s.key));
    const overlap = !edit && shown[0]?.key === 'categories' && mine.length === 0;

    const render = (key: HomeSectionKey, first: boolean): ReactNode => {
        switch (key) {
            case 'categories': return <CategoriesSection site={site} overlap={first && overlap} />;
            case 'featured': return <FeaturedSection site={site} />;
            case 'about': return <AboutSection site={site} />;
            case 'features': return <FeaturesSection site={site} />;
            case 'gallery': return <GallerySection site={site} />;
            case 'reviews': return <ReviewsSection site={site} />;
            case 'contact': return <ContactSection site={site} />;
        }
    };

    return (
        <SitePage site={site} current="home" overlayHeader mobileActions={mobileActions(site)}>
            <style>{SOPHRA_CSS}</style>
            <main className="flex flex-1 flex-col">
                <SophraHero site={site} overlapNext={overlap} />
                {mine.length > 0 && <div className={cn(spWrap, 'pt-10')}><MyReservations items={mine} /></div>}
                {edit
                    ? order.map(s => <EditorSlot key={s.key} site={site} sectionKey={s.key} enabled={s.enabled}>{render(s.key, false)}</EditorSlot>)
                    : shown.map((s, i) => <Fragment key={s.key}>{render(s.key, i === 0)}</Fragment>)}
            </main>
        </SitePage>
    );
}

/** Telefonun alt çubuğu: Ara, Menü; rezervasyon açıksa ana düğme "Rezervasyon" (değilse Menü ana düğme). */
function mobileActions(site: PublicSite): MobileAction[] {
    const actions: MobileAction[] = [];
    const reserve = canReserveOnline(site);
    if (site.phone) actions.push({ key: 'ara', label: 'Ara', icon: <PhoneGlyph className="h-[18px] w-[18px]" />, href: telHref(site.phone) });
    actions.push({ key: 'menu', label: 'Menü', icon: <MenuGlyph className="h-[18px] w-[18px]" />, to: '/menu', primary: !reserve });
    if (reserve) actions.push({ key: 'rez', label: 'Rezervasyon', icon: <CalendarGlyph className="h-[18px] w-[18px]" />, to: '/rezervasyon', primary: true });
    return actions;
}

// ── Düzenleyicide bölümün yeri ──────────────────────────────────────────────────────────────────

const MENU_SECTIONS: HomeSectionKey[] = ['categories', 'featured'];

/**
 * Düzenleyicide her bölüm sırasıyla: kapalıysa "Gizli" şeridi; menüden gelen bölüm (kategoriler, öne çıkanlar) kısa bir
 * özet şeridi (içeriği Yemeklerimiz'de değişir); yerinde yazılan bölüm kendisi (içeriği yoksa ve boş alanlar gizliyse
 * "sitede görünmez" şeridi). Şeride tıklanınca "Anasayfa bölümleri" açılır.
 */
function EditorSlot({ site, sectionKey, enabled, children }: { site: PublicSite; sectionKey: HomeSectionKey; enabled: boolean; children: ReactNode }) {
    const edit = useSiteEdit();
    const info = HOME_SECTION_INFO[sectionKey];
    const has = homeSectionHasContent(site, sectionKey);
    if (enabled && !MENU_SECTIONS.includes(sectionKey) && (has || edit?.showEmpty)) return <>{children}</>;

    let note: string;
    if (!enabled) note = 'Gizli: sitede görünmez.';
    else if (sectionKey === 'categories') note = has ? `${filledCategories(site).length} kategori, menüden gelir.` : 'Menüde ürünlü kategori yok: sitede görünmez.';
    else if (sectionKey === 'featured') note = has ? `${featuredProducts(site).length} öne çıkan ürün, Yemeklerimiz'den gelir.` : "Öne çıkan ürün yok (Yemeklerimiz'de işaretleyin): sitede görünmez.";
    else note = 'İçerik yok: sitede görünmez.';
    const selected = edit?.selected === 'homeSections';
    return (
        <div className={cn(spWrap, 'py-2')}>
            <div data-edit-target="homeSections"
                className={cn("flex min-h-14 cursor-pointer items-center justify-between gap-3 rounded-2xl border border-dashed px-4 py-2 font-[family-name:'DM_Sans',system-ui,sans-serif] text-[14px] transition-colors hover:border-[#2B7FFF]",
                    enabled ? 'border-[#CFC5B4] text-[#5F564B]' : 'border-[#CFC5B4] bg-[repeating-linear-gradient(135deg,transparent_0_8px,rgba(0,0,0,0.03)_8px_16px)] text-[#8A7D6E]',
                    selected && 'border-solid border-[#2B7FFF]')}>
                <span className="flex min-w-0 flex-col">
                    <b className="text-[15px] text-[#2A1F14]">{info.label}</b>
                    <span className="truncate">{note}</span>
                </span>
                <span className="shrink-0 rounded-full bg-white px-3 py-1 text-[13px] font-semibold text-[#1E4FA0] shadow-[0_1px_2px_rgba(0,0,0,0.1)]">Bölümleri düzenle</span>
            </div>
        </div>
    );
}
