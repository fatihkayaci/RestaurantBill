// Düzenleyicinin admin tarafı sınıfları (canvas "Site Düzenleyici"): admin renk değişkenleriyle, karanlık temada da okunur.

const btnBase = 'inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50';

export const ed = {
    btn: `${btnBase} h-10 rounded-[10px] border border-[#DDD3C2] bg-card px-4 text-sm text-foreground hover:bg-muted dark:border-border`,
    btnGold: `${btnBase} h-10 rounded-[10px] border border-rb-gold bg-rb-gold px-4 text-sm text-rb-gold-foreground hover:opacity-90`,
    btnGhost: `${btnBase} h-10 rounded-[10px] border border-transparent bg-transparent px-4 text-sm text-muted-foreground hover:bg-muted hover:text-foreground`,
    btnRed: `${btnBase} h-10 rounded-[10px] border border-[#A3301A] bg-[#A3301A] px-4 text-sm text-white hover:opacity-90`,
    btnSm: `${btnBase} h-[34px] rounded-[9px] border border-[#DDD3C2] bg-card px-3 text-[13px] text-foreground hover:bg-muted dark:border-border`,
    seg: 'flex gap-0.5 rounded-[10px] border border-[#DDD3C2] bg-[#F1EBE0] p-[3px] dark:border-border dark:bg-muted',
    segItem: 'flex h-7 items-center gap-1.5 rounded-[7px] px-2.5 text-[13px] font-semibold text-muted-foreground transition-colors hover:text-foreground',
    segOn: 'bg-card text-foreground shadow-[0_1px_2px_rgba(42,31,20,0.12)]',
    cap: 'text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground',
    row: 'flex w-full items-center gap-2.5 rounded-[10px] px-2.5 py-[9px] text-left text-sm text-foreground transition-colors hover:bg-[#F1EBE0] dark:hover:bg-muted',
    link: 'text-[13px] font-semibold text-[#1E5FC4] hover:underline dark:text-sky-300',
    soft: 'rounded-xl bg-[#F1EBE0] px-3.5 py-3 text-[13px] leading-normal dark:bg-muted',
    draftNote: 'flex items-start gap-2 rounded-[10px] bg-[#FBEFD6] px-2.5 py-2 text-xs leading-[1.45] text-[#6A440C] dark:bg-rb-amber-bg dark:text-rb-amber',
    dot: 'h-2 w-2 shrink-0 rounded-full bg-[#C9821A]',
    autoPill: 'rounded-full bg-[#E3F1E6] px-2 py-0.5 text-xs font-bold text-[#1B6A43] dark:bg-rb-green-bg dark:text-rb-green',
    label: 'text-sm font-semibold text-foreground',
    counter: 'text-xs font-semibold text-muted-foreground tabular-nums',
} as const;
