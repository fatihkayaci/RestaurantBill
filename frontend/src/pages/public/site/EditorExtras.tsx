import type { PublicSite } from '@/features/customerSite/types';
import { cn } from '@/lib/utils';
import { InstagramIcon } from './SiteCards';
import { VisitSection } from './SiteFrame';
import { instagramHandle } from './siteParts';
import { EmptySlot } from './siteEdit';
import { editTarget, useSiteEdit } from './siteEditContext';

// Ana sayfanın yalnız düzenleyicide görünen kutuları (her tasarımda aynı): mekân fotoğrafları + Instagram ve
// saatler + iletişim. Müşteri sitesinde çizilmez.

const box = 'rounded-[24px] bg-[var(--site-card)] text-[var(--site-text)] md:rounded-[36px]';

// ── Yalnız düzenleyicide ─────────────────────────────────────────────────────────────────────────

/**
 * Mekân fotoğrafları (galeri) ve Instagram bağlantısı yeni ana sayfa tasarımında yok; düzenleyicide yine buradan
 * değiştirilebilsinler diye yalnız düzenleme görünümünde kutu olarak çizilir. Müşteri görmez.
 */
export function EditorGallery({ site }: { site: PublicSite }) {
    const edit = useSiteEdit();
    if (!edit) return null;
    const photos = site.site.galleryImageUrls.slice(0, 6);
    const instagram = site.site.instagramUrl;
    const igX = editTarget(edit, 'contact', 'Instagram');
    return (
        <section aria-label="Mekân fotoğrafları" className={cn(box, 'flex flex-col gap-4 p-5 sm:p-8')}>
            <p className="m-0 font-[family-name:'DM_Sans',system-ui,sans-serif] text-sm text-[var(--site-sub)]">Mekân fotoğrafları ve Instagram (ana sayfada görünmez; Mekân sayfasında ve paylaşımda kullanılır).</p>
            {photos.length > 0 ? (
                <div className="grid grid-cols-3 gap-2 md:grid-cols-6">
                    {photos.map((url, i) => {
                        const x = editTarget(edit, `gallery:${i}`, `Mekân fotoğrafı ${i + 1}`);
                        return <img key={i} src={url} alt="" {...x} className={cn('block aspect-square w-full rounded-[14px] object-cover', x.className)} />;
                    })}
                </div>
            ) : <EmptySlot target="gallery:add" title="+ Fotoğraf ekle" />}
            {instagram ? (
                <a href={instagram} target="_blank" rel="noopener noreferrer" {...igX}
                    className={cn('inline-flex h-12 items-center gap-2.5 self-start rounded-full bg-[var(--site-bg)] px-5 font-bold no-underline', igX.className)}>
                    <span aria-hidden="true" className="[&>svg]:h-5 [&>svg]:w-5"><InstagramIcon /></span>{instagramHandle(instagram)}
                </a>
            ) : <EmptySlot target="contact" title="+ Instagram ekle" className="min-h-[64px]" />}
        </section>
    );
}

// Adres · saatler · iletişim her sayfada alt bilgide durur. Düzenleyicide alt bilgi çizilmez; saatler ve iletişim
// orada da değiştirilebilsin diye yalnız düzenleme görünümünde sayfanın sonunda gösterilir.
export function EditorVisit({ site }: { site: PublicSite }) {
    const edit = useSiteEdit();
    if (!edit) return null;
    return <div className={box}><VisitSection site={site} /></div>;
}
