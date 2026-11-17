import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';
import { siteSettingsService } from '@/features/customerSite/api/siteSettingsService';
import type { SiteCompleteness } from '@/features/customerSite/types';
import { cn } from '@/lib/utils';
import { SITE_SETTINGS_PATH, missingItems } from './siteGuidance';

// "Sitenizi güzelleştirin": fotoğraflarla dolu site çok güzel, boş site sönük görünür. Genel Bakış'ta doluluk puanı
// ve en etkili eksikler; "Tamamla" görsel site düzenleyicisini açar (orada her alan sayfanın üstünde düzenlenir).

function scoreTone(score: number): { bar: string; text: string; label: string } {
    if (score >= 85) return { bar: 'bg-rb-green', text: 'text-rb-green', label: 'Siteniz çok iyi görünüyor' };
    if (score >= 55) return { bar: 'bg-rb-amber', text: 'text-rb-amber', label: 'İyi gidiyor, birkaç dokunuş kaldı' };
    return { bar: 'bg-rb-red', text: 'text-rb-red', label: 'Siteniz boş görünüyor' };
}

/** Genel Bakış'taki küçük kart: puan ve en etkili üç eksik; tamamsa çizilmez. */
export function SiteBeautifyCard() {
    const [data, setData] = useState<SiteCompleteness | null>(null);

    useEffect(() => {
        let cancelled = false;
        siteSettingsService.getCompleteness()
            .then(d => { if (!cancelled) setData(d); })
            .catch(() => { /* yetki ya da ağ hatası: kart gösterilmez */ });
        return () => { cancelled = true; };
    }, []);

    if (!data || data.score >= 100) return null;
    const top = missingItems(data).slice(0, 3);
    const tone = scoreTone(data.score);

    return (
        <section aria-labelledby="genel-site" className="flex flex-wrap items-center gap-4 rounded-xl border border-rb-gold/40 bg-rb-gold-bg p-4">
            <div className="flex min-w-[150px] flex-col">
                <h2 id="genel-site" className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                    <Sparkles className="h-4 w-4 text-rb-gold" aria-hidden="true" />Sitenizi güzelleştirin
                </h2>
                <span className={cn('text-2xl font-bold tabular-nums', tone.text)}>%{data.score}</span>
            </div>
            <ul className="min-w-0 flex-1 space-y-0.5 text-sm text-muted-foreground">
                {top.map(i => (
                    <li key={i.key} className="truncate">· <span className="font-medium text-foreground">{i.title}</span>{i.detail && ` (${i.detail})`}</li>
                ))}
            </ul>
            <Link to={SITE_SETTINGS_PATH} className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-foreground px-4 text-sm font-semibold text-background hover:opacity-90">
                Tamamla <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
        </section>
    );
}
