import { ELITE_CSS, ELITE_FLOW_CSS, isElit } from './eliteParts';

/** Elit'te akış sayfalarının hareket ve giydirme stilleri (kökte `rb-el-flow` sınıfıyla); diğer tasarımlarda hiçbir şey. */
export function EliteFlowStyle({ design }: { design?: string | null }) {
    if (!isElit(design)) return null;
    return <><style>{ELITE_CSS}</style><style>{ELITE_FLOW_CSS}</style></>;
}
