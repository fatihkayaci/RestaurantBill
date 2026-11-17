import type { PublicSite } from '@/features/customerSite/types';
import { useOnlineOrdering } from '@/features/delivery/useOnlineOrderingAvailable';
import { cn } from '@/lib/utils';
import { serif } from './siteParts';
import { faqItems } from './siteFaqs';
import { useSiteEdit } from './siteEditContext';

// İletişim sayfasının yalnız düzenleyicide görünen Sık sorulanlar listesi (her tasarımda aynı).

const box = 'rounded-[24px] bg-[var(--site-card)] text-[var(--site-text)] md:rounded-[32px]';

/**
 * Yalnız düzenleyicide: bütün hazır sorular. Şu an geçerli olanların yanında aç/kapa anahtarı (kapatılan, taslağın
 * hiddenFaqs listesine yazılır; Yayınla'ya kadar müşteri sitesi değişmez); geçerli olmayanlar soluk ve nedeniyle.
 */
export default function FaqEditorBox({ site }: { site: PublicSite }) {
    const edit = useSiteEdit();
    const items = faqItems(site, useOnlineOrdering());
    if (!edit) return null;
    const hidden = new Set(site.site.hiddenFaqs ?? []);
    const live = items.filter(f => f.a !== null);
    const waiting = items.filter(f => f.a === null);
    return (
        <section aria-labelledby="ilt-sss-ed" className={cn(box, 'flex flex-col gap-5 p-6 sm:p-10')}>
            <div className="flex flex-col gap-1.5">
                <h2 id="ilt-sss-ed" className={cn(serif, 'm-0 text-[34px] font-bold leading-none md:text-[40px]')}>Sık sorulanlar</h2>
                <p className="m-0 font-[family-name:'DM_Sans',system-ui,sans-serif] text-sm text-[var(--site-sub)]">
                    Sorular ve cevaplar ayarlarınızdan kendiliğinden oluşur. İstemediğinizi kapatın; değişiklik Yayınla'dan sonra sitede görünür.
                </p>
            </div>
            <ul className="m-0 flex list-none flex-col p-0">
                {live.map(f => {
                    const on = !hidden.has(f.key);
                    return (
                        <li key={f.key} className="flex items-start gap-4 border-b border-[var(--site-line)] py-4">
                            <div className={cn('min-w-0 flex-1', !on && 'opacity-55')}>
                                <p className="m-0 font-bold">{f.q}</p>
                                <p className="m-0 mt-1 text-sm leading-relaxed text-[var(--site-sub)]">{f.a}</p>
                            </div>
                            <button type="button" role="switch" aria-checked={on} aria-label={`${f.q} ${on ? 'sitede görünüyor' : 'gizli'}`}
                                onClick={() => edit.toggleFaq?.(f.key)}
                                className="flex h-11 shrink-0 items-center gap-2 rounded-full px-1 font-[family-name:'DM_Sans',system-ui,sans-serif] text-sm font-semibold">
                                <span aria-hidden="true" className={cn('relative h-6 w-11 rounded-full transition-colors', on ? 'bg-[#2B7FFF]' : 'bg-[#CFC5B4]')}>
                                    <span className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-[left]', on ? 'left-[22px]' : 'left-0.5')} />
                                </span>
                                <span className="w-12 text-left">{on ? 'Açık' : 'Gizli'}</span>
                            </button>
                        </li>
                    );
                })}
            </ul>
            {waiting.length > 0 && (
                <div className="flex flex-col gap-2">
                    <p className="m-0 font-[family-name:'DM_Sans',system-ui,sans-serif] text-xs font-bold uppercase tracking-[0.14em] text-[var(--site-muted)]">Şu an görünmeyenler</p>
                    <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
                        {waiting.map(f => (
                            <li key={f.key} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 text-sm text-[var(--site-muted)]">
                                <span className="font-semibold">{f.q}</span>
                                <span className="font-[family-name:'DM_Sans',system-ui,sans-serif] text-[13px]">{f.reason}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </section>
    );
}
