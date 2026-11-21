import { cn } from '@/lib/utils';
import { initials } from '@/pages/public/site/siteTheme';

// "Google ve paylaşım" seçiliyken önizleme alanı (canvas 12): taslağın Google arama sonucu ve WhatsApp kartı.
// Sağdaki alanlar değiştikçe hemen güncellenir. Açıklama kırpılmaz (Google kendisi kısaltır).

export interface SeoValues {
    title: string;
    description: string;
    imageUrl: string;
}

function hostOf(url: string): string {
    try { return new URL(url).host; } catch { return url; }
}

export function SeoPreview({ name, siteUrl, draft, live, compact = false }: {
    name: string; siteUrl: string; draft: SeoValues;
    /** "Genel ayarlar" içinde: başlıksız, tek sütun. */
    compact?: boolean;
    /** Müşterinin bugün gördüğü (yayındaki); taslakla aynıysa gösterilmez. */
    live: SeoValues | null;
}) {
    const url = siteUrl || 'https://restoraniniz.sophram.com';
    const host = hostOf(url);
    const showLive = live && (live.title !== draft.title || live.description !== draft.description);
    return (
        <div className={cn("flex min-h-full flex-col bg-[#EFE8DB] font-[family-name:'DM_Sans',system-ui,sans-serif] text-[#2A1F14]", compact ? 'gap-4 p-4' : 'gap-8 p-6 md:p-12')}>
            {compact ? <span className="text-[13px] font-bold uppercase tracking-[0.08em] text-[#6B5E52]">Canlı önizleme · taslak</span> : (
            <div className="flex flex-col gap-2">
                <span className="text-[13px] font-bold uppercase tracking-[0.08em] text-[#6B5E52]">Canlı önizleme · taslak</span>
                <h2 className="m-0 text-2xl font-bold md:text-[32px]">Sitenizin bağlantısı Google'da ve WhatsApp'ta böyle görünür</h2>
                <p className="m-0 text-base text-[#5C5046] md:text-lg">Sağdaki alanları değiştirdikçe iki önizleme de hemen güncellenir. Yayınla'dan sonra Google'ın yenilemesi birkaç gün sürebilir.</p>
            </div>
            )}
            <div className={cn('grid grid-cols-1 items-start gap-7', !compact && 'xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]')}>
                <div className="flex flex-col gap-3">
                    <span className="text-[15px] font-bold">Google arama sonucu</span>
                    <div className="flex flex-col gap-1.5 rounded-[18px] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)] [font-family:Arial,Helvetica,sans-serif]">
                        <div className="flex items-center gap-3">
                            <span aria-hidden="true" className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F1EAE0] font-[family-name:'Instrument_Serif',serif] text-[22px] italic text-[#A0452A]">{initials(name).slice(0, 1)}</span>
                            <span className="flex flex-col leading-[1.3]">
                                <span className="text-[15px] text-[#202124]">{name}</span>
                                <span className="text-[13px] text-[#4d5156]">{url}</span>
                            </span>
                        </div>
                        <span className="mt-1 text-[22px] leading-[1.3] text-[#1a0dab]">{draft.title}</span>
                        <span className="text-[15px] leading-[1.55] text-[#4d5156]">{draft.description}</span>
                    </div>
                    {showLive && (
                        <div className="flex flex-col gap-1 rounded-[14px] border border-dashed border-[#C2B6A3] bg-white/50 px-5 py-4 opacity-85 [font-family:Arial,Helvetica,sans-serif]">
                            <span className="font-[family-name:'DM_Sans',system-ui,sans-serif] text-[13px] font-bold text-[#A3301A]">Bugün görünen</span>
                            <span className="text-lg text-[#1a0dab] line-through">{live.title}</span>
                            <span className="text-sm text-[#4d5156]">{live.description}</span>
                        </div>
                    )}
                </div>
                <div className="flex flex-col gap-3">
                    <span className="text-[15px] font-bold">WhatsApp'ta paylaşılınca</span>
                    <div className="flex flex-col items-end gap-1.5 rounded-[18px] bg-[#EFEAE2] p-6 [font-family:system-ui,sans-serif]">
                        <div className="w-full max-w-[340px] rounded-[12px_2px_12px_12px] bg-[#D9FDD3] p-[5px] shadow-[0_1px_1px_rgba(0,0,0,0.1)]">
                            <div className="overflow-hidden rounded-lg bg-[#CFEFC8]">
                                {draft.imageUrl
                                    ? <img src={draft.imageUrl} alt="" className="block h-[178px] w-full object-cover" />
                                    : <div className="flex h-[90px] items-center justify-center text-xs text-[#667781]">Görsel yok: kapak fotoğrafı ekleyin</div>}
                                <div className="flex flex-col gap-[3px] px-3 py-2.5">
                                    <b className="text-[15px] text-[#111b21]">{draft.title}</b>
                                    <span className="line-clamp-2 text-[13px] leading-[1.35] text-[#3b4a54]">{draft.description}</span>
                                    <span className="text-xs text-[#667781]">{host}</span>
                                </div>
                            </div>
                            <div className="px-1.5 pb-0.5 pt-1.5 text-sm text-[#027eb5]">{url}</div>
                            <div className="px-1.5 pb-0.5 text-right text-xs text-[#667781]">19:42 ✓✓</div>
                        </div>
                    </div>
                    <span className="text-sm text-[#5C5046]">Instagram, Facebook ve Telegram da aynı görseli ve başlığı kullanır.</span>
                </div>
            </div>
        </div>
    );
}
