import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';

// Önizleme çerçevesi. Neden iframe: sitenin bileşenleri ekran genişliğine (Tailwind md:/xl: medya sorguları),
// `fixed` başlığa/alt çubuğa ve `min-h-screen`e göre çizilir. Aynı belgede çizilseler admin ekranının genişliğini
// görürler, başlık admin'in üstüne biner ve "Telefon" görünümü telefon düzenini gösteremezdi. Çerçeve kendi
// penceresini verir: site gerçekte nasılsa (masaüstü 1280 px, telefon 390 px) öyle çizilir.
//
// Çerçevenin içinde AYRI bir React kökü çalışır (aynı paket, aynı bileşenler): admin'in yönlendiricisi ve bağlamları
// sızmaz, sitenin kendi bellek yönlendiricisi olur. Durum admin'de tutulur; her çizimde kök yeniden çizilir.
// Stiller admin belgesinin <head>'inden kopyalanır ve değiştikçe (Vite HMR, sonradan yüklenen CSS) güncellenir.

const SRC_DOC = '<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0"><div id="root"></div></body></html>';

function isSheet(node: Node): node is HTMLStyleElement | HTMLLinkElement {
    if (node.nodeName === 'STYLE') return true;
    return node.nodeName === 'LINK' && (node as HTMLLinkElement).rel === 'stylesheet';
}

/** Admin'in stillerini çerçeveye kopyalar ve eşitler; durdurma işlevini döner. */
function mirrorStyles(target: Document): () => void {
    const clones = new Map<Node, Element>();
    const add = (node: Node) => {
        const clone = node.cloneNode(true) as Element;
        clone.setAttribute('data-rb-copied', '');
        target.head.appendChild(clone);
        clones.set(node, clone);
    };
    document.head.childNodes.forEach(node => { if (isSheet(node)) add(node); });

    const observer = new MutationObserver(records => {
        for (const record of records) {
            if (record.type === 'childList' && record.target === document.head) {
                record.addedNodes.forEach(node => { if (isSheet(node)) add(node); });
                record.removedNodes.forEach(node => {
                    clones.get(node)?.remove();
                    clones.delete(node);
                });
                continue;
            }
            // <style> içeriği değişti (HMR): kopyanın metni güncellenir.
            let node: Node | null = record.target;
            while (node && node.parentNode !== document.head) node = node.parentNode;
            const clone = node ? clones.get(node) : undefined;
            if (node && clone) clone.textContent = node.textContent;
        }
    });
    observer.observe(document.head, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
}

/**
 * `width × height` piksellik bir pencerede `render(pencere)` çizer ve `scale` ile küçültür.
 * `onWindow`: çerçevenin penceresi hazır olunca (yazıyı bitirmek için odak, kaydırma).
 */
export function SitePreviewFrame({ width, height, scale, title, className, render, onWindow }: {
    width: number; height: number; scale: number; title: string; className?: string;
    render: (win: Window) => ReactNode; onWindow?: (win: Window | null) => void;
}) {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [mount, setMount] = useState<{ root: Root; win: Window } | null>(null);
    const stopRef = useRef<(() => void) | null>(null);

    const onLoad = () => {
        const iframe = iframeRef.current;
        const doc = iframe?.contentDocument;
        const win = iframe?.contentWindow;
        const container = doc?.getElementById('root');
        if (!doc || !win || !container || stopRef.current) return;
        const stopStyles = mirrorStyles(doc);
        const root = createRoot(container);
        stopRef.current = () => {
            stopStyles();
            // Kök, admin'in çizimi bitince kaldırılır (çizim sırasında unmount uyarısı olmasın).
            window.setTimeout(() => root.unmount(), 0);
        };
        setMount({ root, win });
        onWindow?.(win);
    };

    useEffect(() => () => {
        stopRef.current?.();
        stopRef.current = null;
    }, []);

    useLayoutEffect(() => {
        if (mount) mount.root.render(render(mount.win));
    });

    return (
        <div className={className} style={{ width: width * scale, height: height * scale }}>
            <iframe
                ref={iframeRef}
                title={title}
                srcDoc={SRC_DOC}
                onLoad={onLoad}
                style={{ width, height, transform: `scale(${scale})`, transformOrigin: '0 0', border: 0, display: 'block', background: '#fff' }}
            />
        </div>
    );
}
