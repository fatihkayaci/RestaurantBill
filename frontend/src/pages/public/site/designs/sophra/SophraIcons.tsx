import type { ReactNode } from 'react';
import type { IconKind } from './iconKinds';

// Sophra'nın çizgi simgeleri (24 px ızgara, currentColor). Hangi simgenin çizileceği sophraIcons.ts'te seçilir.

function Svg({ children, className = 'h-6 w-6' }: { children: ReactNode; className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
            {children}
        </svg>
    );
}

const PATHS: Record<IconKind, ReactNode> = {
    flame: <path d="M12 3c.6 3 3.6 4.6 3.6 8.4a3.6 3.6 0 0 1-7.2 0c0-1.7.8-2.6 1.6-3.6.3 1.4 1 2 1.8 2.2-.4-2.6-.6-4.6.2-7Z M6.5 13.5a5.5 5.5 0 0 0 11 0" />,
    skewer: <><path d="M4 20 20 4" /><rect x="7.2" y="10.3" width="4" height="4" rx="1.4" transform="rotate(-45 9.2 12.3)" /><rect x="10.8" y="6.7" width="4" height="4" rx="1.4" transform="rotate(-45 12.8 8.7)" /><rect x="14.4" y="3.1" width="3" height="3" rx="1" transform="rotate(-45 15.9 4.6)" /></>,
    bowl: <><path d="M3.5 11h17a8.5 8.5 0 0 1-17 0Z" /><path d="M8 7.5c1-1.2 2.6-1.6 4-1.2M12.5 5.5c1.3-.8 3-.6 4 .5" /></>,
    soup: <><path d="M4 11h16a8 8 0 0 1-16 0Z" /><path d="M9 4c-.8 1 .8 2 0 3M12.5 4c-.8 1 .8 2 0 3M16 4c-.8 1 .8 2 0 3" /></>,
    cake: <><path d="M4 20h16v-7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2Z" /><path d="M4 15c1.4 1 2.6 1 4 0s2.6-1 4 0 2.6 1 4 0 2.6-1 4 0M12 11V7" /><path d="M12 7c-.8-.6-.8-1.6 0-2.6.8 1 .8 2 0 2.6Z" /></>,
    cup: <><path d="M6 8h11l-1.2 10.2A2 2 0 0 1 13.8 20H9.2a2 2 0 0 1-2-1.8Z" /><path d="M5 8h13M9 8l1-4h4" /></>,
    leaf: <><path d="M5 19c0-8 5-13 14-14-1 9-6 14-14 14Z" /><path d="M5 19 13 11" /></>,
    fish: <><path d="M3 12c3-4 9-6 14-2l4-3v10l-4-3c-5 4-11 2-14-2Z" /><circle cx="8" cy="11" r=".6" fill="currentColor" /></>,
    egg: <><path d="M12 3c3.5 0 6 5 6 9a6 6 0 0 1-12 0c0-4 2.5-9 6-9Z" /><circle cx="12" cy="13.5" r="2.4" /></>,
    pizza: <><path d="M12 21 3.5 6.5a13 13 0 0 1 17 0Z" /><circle cx="10" cy="10" r="1" /><circle cx="14" cy="13" r="1" /><circle cx="12" cy="16.5" r=".8" /></>,
    bread: <><path d="M5 11a4 4 0 0 1 0-6h14a4 4 0 0 1 0 6v8H5Z" /><path d="M9 8v3M12 8v3M15 8v3" /></>,
    cloche: <><path d="M3 18h18M4.5 18a7.5 7.5 0 0 1 15 0" /><path d="M12 8.5V7M10.5 7h3" /></>,
    chef: <><path d="M7 14a4 4 0 0 1-.6-7.9A5 5 0 0 1 16 5a4 4 0 0 1 1 9" /><path d="M7 14h10v6H7Z" /></>,
    people: <><circle cx="9" cy="8" r="3" /><path d="M3.5 20a5.5 5.5 0 0 1 11 0" /><circle cx="17" cy="9" r="2.4" /><path d="M15.5 14.2A4.5 4.5 0 0 1 21 18.5" /></>,
    hand: <><path d="M7 12V6a1.5 1.5 0 0 1 3 0v5M10 11V4.5a1.5 1.5 0 0 1 3 0V11M13 11V5.5a1.5 1.5 0 0 1 3 0V12" /><path d="M16 9.5a1.5 1.5 0 0 1 3 0V14a7 7 0 0 1-12.5 4.3L4 15a1.6 1.6 0 0 1 2.4-2l.6.6" /></>,
    heart: <path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.3 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10Z" />,
    clock: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>,
    seal: <><path d="m12 3 2.2 1.6 2.7-.1.8 2.6 2.2 1.6-.9 2.5.9 2.5-2.2 1.6-.8 2.6-2.7-.1L12 20l-2.2-1.6-2.7.1-.8-2.6-2.2-1.6.9-2.5-.9-2.5 2.2-1.6.8-2.6 2.7.1Z" /><path d="m9 12 2 2 4-4" /></>,
    car: <><path d="M4 16V12l2-5h12l2 5v4Z" /><path d="M4 12h16" /><circle cx="7.5" cy="16.5" r="1.5" /><circle cx="16.5" cy="16.5" r="1.5" /></>,
    wifi: <><path d="M3 9a13 13 0 0 1 18 0M6 12.5a8.5 8.5 0 0 1 12 0M9 16a4 4 0 0 1 6 0" /><circle cx="12" cy="19" r=".8" fill="currentColor" /></>,
    music: <><path d="M9 18V5l11-2v13" /><circle cx="6.5" cy="18" r="2.5" /><circle cx="17.5" cy="16" r="2.5" /></>,
    card: <><rect x="3" y="6" width="18" height="12" rx="2" /><path d="M3 10h18M7 15h3" /></>,
    child: <><circle cx="12" cy="6" r="2.5" /><path d="M8 21l1-7-3-3M16 21l-1-7 3-3M9 11h6" /></>,
    paw: <><circle cx="7" cy="10" r="1.6" /><circle cx="10.5" cy="6.5" r="1.6" /><circle cx="14.5" cy="6.5" r="1.6" /><circle cx="18" cy="10" r="1.6" /><path d="M12.5 12c2.5 0 4.5 3 4.5 5a2.5 2.5 0 0 1-3.5 2.3 3.5 3.5 0 0 0-3 0A2.5 2.5 0 0 1 7 17c0-2 2-5 4.5-5Z" /></>,
    access: <><circle cx="12" cy="4.5" r="1.6" /><path d="M7 8.5h10M12 8.5V14M12 14l-3 6M12 14l3 6" /></>,
    sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4" /></>,
    gift: <><rect x="3.5" y="9" width="17" height="11" rx="1.5" /><path d="M3.5 13h17M12 9v11M12 9c-1.5-3-5-3.5-5-1.5S9.5 9 12 9Zm0 0c1.5-3 5-3.5 5-1.5S14.5 9 12 9Z" /></>,
};

export function SpIcon({ kind, className }: { kind: IconKind; className?: string }) {
    return <Svg className={className}>{PATHS[kind]}</Svg>;
}

// ── Sosyal ve iletişim simgeleri ──

export function InstagramGlyph({ className = 'h-5 w-5' }: { className?: string }) {
    return <Svg className={className}><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.3" cy="6.7" r=".7" fill="currentColor" /></Svg>;
}

export function WhatsAppGlyph({ className = 'h-5 w-5' }: { className?: string }) {
    return <Svg className={className}><path d="M20.5 11.6a8.5 8.5 0 0 1-12.6 7.5L3.5 20.5l1.4-4.2a8.5 8.5 0 1 1 15.6-4.7Z" /><path d="M9 8.5c0 3.5 2.7 6.5 6.5 6.5l1-1.5-2-1-1 .8c-1-.4-2.2-1.6-2.6-2.6l.8-1-1-2Z" /></Svg>;
}

export function PhoneGlyph({ className = 'h-5 w-5' }: { className?: string }) {
    return <Svg className={className}><path d="M5 4h3.5l1.5 4-2 1.3a10 10 0 0 0 6.7 6.7L16 14l4 1.5V19a1.5 1.5 0 0 1-1.6 1.5A16 16 0 0 1 3.5 5.6 1.5 1.5 0 0 1 5 4Z" /></Svg>;
}

export function PinGlyph({ className = 'h-5 w-5' }: { className?: string }) {
    return <Svg className={className}><path d="M12 21s-6.5-6.2-6.5-11.2a6.5 6.5 0 0 1 13 0C18.5 14.8 12 21 12 21Z" /><circle cx="12" cy="9.8" r="2.3" /></Svg>;
}

export function ClockGlyph({ className = 'h-5 w-5' }: { className?: string }) {
    return <Svg className={className}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></Svg>;
}

export function ArrowGlyph({ className = 'h-4 w-4', dir = 'right' }: { className?: string; dir?: 'left' | 'right' }) {
    return <Svg className={className}>{dir === 'right' ? <path d="M5 12h14M13 6l6 6-6 6" /> : <path d="M19 12H5M11 6l-6 6 6 6" />}</Svg>;
}

export function PlusGlyph({ className = 'h-5 w-5' }: { className?: string }) {
    return <Svg className={className}><path d="M12 5v14M5 12h14" /></Svg>;
}

export function MinusGlyph({ className = 'h-5 w-5' }: { className?: string }) {
    return <Svg className={className}><path d="M5 12h14" /></Svg>;
}

export function StarGlyph({ className = 'h-5 w-5', filled = true }: { className?: string; filled?: boolean }) {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round">
            <path d="m12 3 2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 16.8l-5.4 2.9 1.1-6.1-4.5-4.2 6.1-.8Z" />
        </svg>
    );
}

export function BagGlyph({ className = 'h-5 w-5' }: { className?: string }) {
    return <Svg className={className}><path d="M5 8h14l-1 12H6Z" /><path d="M9 8V6.5a3 3 0 0 1 6 0V8" /></Svg>;
}

export function CalendarGlyph({ className = 'h-5 w-5' }: { className?: string }) {
    return <Svg className={className}><rect x="3.5" y="5" width="17" height="15" rx="2" /><path d="M3.5 10h17M8 3v4M16 3v4" /></Svg>;
}

export function MenuGlyph({ className = 'h-5 w-5' }: { className?: string }) {
    return <Svg className={className}><path d="M6 3.5h10a2 2 0 0 1 2 2v15l-3-1.5-3 1.5-3-1.5-3 1.5v-15a2 2 0 0 1 2-2Z" /><path d="M9 8h6M9 11.5h6M9 15h3" /></Svg>;
}

export function DirectionsGlyph({ className = 'h-5 w-5' }: { className?: string }) {
    return <Svg className={className}><path d="m3.5 11 17-7.5-7.5 17-2-7.5Z" /></Svg>;
}

/** Hakkımızda bölümünün köşesindeki ince yaprak dalı (süs; çizgi rengi bölümün çizgisi). */
export function LeafSprig({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 160 220" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" aria-hidden="true" className={className}>
            <path d="M80 215C78 160 86 100 120 20" />
            <path d="M84 170c-26-6-44-24-48-52 26 4 44 22 48 52Z" />
            <path d="M88 130c22-10 38-30 38-58-24 8-38 30-38 58Z" />
            <path d="M92 98c-22-8-34-26-34-48 22 6 34 24 34 48Z" />
            <path d="M104 62c16-10 26-26 24-46-18 8-26 26-24 46Z" />
            <path d="M84 170 48 124M88 130l30-46M92 98 64 56M104 62l20-38" />
        </svg>
    );
}
