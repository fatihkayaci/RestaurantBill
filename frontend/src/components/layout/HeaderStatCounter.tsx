export default function HeaderStatCounter({ label, count, color }: { label: string; count: number; color: string }) {
    const live = count > 0;
    const dotColor = color.replace('text-', 'bg-');

    return (
        <div className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors ${live ? 'bg-white/5' : ''}`}>
            <span className={`font-serif text-xl font-bold leading-none ${color} ${live ? '' : 'opacity-55'}`}>{count}</span>
            <span className="flex items-center gap-1">
                <span className={`w-1 h-1 rounded-full shrink-0 ${dotColor} ${live ? '' : 'opacity-50'}`} />
                <span className={`text-[9px] font-bold tracking-widest uppercase whitespace-nowrap ${color} ${live ? '' : 'opacity-60'}`}>{label}</span>
            </span>
        </div>
    );
}
