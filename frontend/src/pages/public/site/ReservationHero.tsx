import type { ReactNode } from 'react';
import type { PublicSite } from '@/features/customerSite/types';
import { cn } from '@/lib/utils';
import { StockImageLabel } from '../components/StockImageLabel';
import { serif } from './siteParts';
import { EditableBlock } from './siteEdit';
import { useSiteEdit } from './siteEditContext';
import { terracottaBg } from './renkliTones';

// Rezervasyon sayfalarının koyu kapağı (tasarım: "Renkli · Masa ayırt"): koyu kahve kutu, ince dama deseni, sağ üstte
// kiremit daire ve üstünde eğik hardal "bu akşam?" dairesi (süs); hardal üst satır, dev Fraunces başlık (italik parça
// açık hardal), krem açıklama ve sağ altta isteğe bağlı eylem. Rezervasyon kapağı yüklüyse fotoğraf sağda, soldan koyu
// geçişle (düzenleyicide "Rezervasyon kapağı" buradan değişir).

export function ReservationHero({ site, kicker, title, accent, titleProps, children, action, withCover = true }: {
    site: PublicSite;
    kicker: string;
    /** Başlığın ilk satırı ve italik (hardal) ikinci satırı. */
    title: string;
    accent: string;
    /** Başlığa eklenecek düzenleyici öznitelikleri (ör. editExternal). */
    titleProps?: { className: string } & Record<string, string | undefined>;
    children?: ReactNode;
    action?: ReactNode;
    /** Rezervasyon kapağı gösterilsin ve düzenleyicide seçilebilsin mi. */
    withCover?: boolean;
}) {
    const edit = useSiteEdit();
    const photo = withCover ? site.site.reservationHeroUrl : '';
    const { className: titleExtra = '', ...titleAttrs } = titleProps ?? { className: '' };
    const backdrop = (
        <>
            {photo ? (
                <>
                    <img src={photo} alt="" className="absolute inset-0 h-full w-full object-cover object-[70%_45%]" />
                    <span aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(180deg,rgba(36,24,15,0.6)_0%,rgba(36,24,15,0.9)_55%,rgba(36,24,15,0.97)_100%)] md:bg-[linear-gradient(90deg,rgba(36,24,15,0.97)_0%,rgba(36,24,15,0.9)_35%,rgba(36,24,15,0.4)_60%,rgba(36,24,15,0)_80%)]" />
                    {photo.includes('/shared/stock/') && <StockImageLabel className="bottom-auto right-3 top-3" />}
                </>
            ) : (
                <span aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
                    <span className="absolute inset-0 bg-[repeating-conic-gradient(from_45deg,rgba(251,244,232,0.05)_0_25%,transparent_0_50%)] bg-[length:34px_34px]" />
                    <span className={cn(terracottaBg, 'absolute -right-20 -top-20 h-[220px] w-[220px] rounded-full md:h-[340px] md:w-[340px]')} />
                    <span className={cn(serif, 'absolute right-[70px] top-10 hidden h-[150px] w-[150px] -rotate-[10deg] items-center justify-center rounded-full bg-[var(--site-mustard)] text-[30px] font-bold italic text-[var(--site-text)] md:flex')}>bu akşam?</span>
                </span>
            )}
            {edit && withCover && !photo && (
                <span className="absolute left-6 top-6 whitespace-nowrap rounded-full border border-dashed border-[var(--site-paper-line-strong)] bg-[var(--site-card)] px-4 py-2 font-[family-name:'DM_Sans',system-ui,sans-serif] text-[15px] font-semibold text-[var(--site-text)]">
                    + Rezervasyon kapağı seç
                </span>
            )}
        </>
    );

    return (
        <section aria-labelledby="rz-baslik"
            className="relative flex flex-wrap items-end justify-between gap-7 overflow-hidden rounded-[24px] bg-[var(--site-paper)] px-5 py-10 text-[var(--site-on-paper)] sm:px-10 md:rounded-[36px] md:p-14 [--site-accent-text:var(--site-mustard-text)]">
            {withCover ? (
                <EditableBlock target="photo:hero-rezervasyon" label="Rezervasyon kapağı" chip="Fotoğrafı değiştir" className="absolute inset-0">{backdrop}</EditableBlock>
            ) : backdrop}
            <div className="pointer-events-none relative flex min-w-0 max-w-[700px] flex-col gap-4 [&_a]:pointer-events-auto">
                <span className="inline-flex items-center gap-2.5 text-xs font-extrabold uppercase tracking-[0.24em] text-[var(--site-mustard-text)]">
                    <span aria-hidden="true" className="h-0.5 w-7 shrink-0 bg-[var(--site-mustard-text)]" />{kicker}
                </span>
                <h1 id="rz-baslik" {...titleAttrs} className={cn(serif, 'm-0 break-words text-[52px] font-extrabold leading-[0.9] tracking-[-0.025em] md:text-[clamp(60px,7vw,108px)]', titleExtra)}>
                    {title}<br /><em className="rb-accent italic">{accent}</em>
                </h1>
                {children}
            </div>
            {action && <div className="relative">{action}</div>}
        </section>
    );
}

