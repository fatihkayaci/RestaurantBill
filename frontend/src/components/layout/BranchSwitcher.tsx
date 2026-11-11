import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Check, ChevronsUpDown, Landmark, Plus } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
    DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { authService } from '@/features/auth/api/authService';
import type { Branch } from '@/features/branches/types';
import { getHomePathFromToken, startSession } from '@/lib/auth';
import { cn } from '@/lib/utils';

interface Props {
    branches: Branch[];
    isOwner: boolean;
    // Owner "Tümü" modunda: şirket geneli görünüm, aktif şube yok.
    companyMode: boolean;
    activeBranchId: string | null;
    activeBranchName?: string | null;
    collapsed: boolean;
}

export default function BranchSwitcher({ branches, isOwner, companyMode, activeBranchId, activeBranchName, collapsed }: Props) {
    const navigate = useNavigate();
    const [switching, setSwitching] = useState(false);

    const activeBranch = branches.find(b => b.id === activeBranchId);
    const title = companyMode
        ? `Tümü · ${branches.length} şube`
        : (activeBranch?.branchName ?? activeBranchName ?? 'Şube');
    const caption = companyMode ? 'GÖRÜNÜM' : 'ŞUBE';
    const Icon = companyMode ? Landmark : Building2;

    // Tek şubeli admin için seçecek bir şey yok; kutu yalnızca bilgi verir.
    const canSwitch = isOwner || branches.length > 1;

    const switchTo = async (branchId: string | null) => {
        const unchanged = companyMode ? branchId === null : branchId === activeBranchId;
        if (unchanged || switching) return;

        try {
            setSwitching(true);
            const token = await authService.switchBranch(branchId);
            startSession(token);
            // Token kapsamı değişti: SignalR bağlantıları ve sayfa cache'leri yeni şube için sıfırdan kurulsun.
            window.location.assign(getHomePathFromToken(token));
        } catch (error) {
            setSwitching(false);
            if (axios.isAxiosError(error)) {
                toast.error(error.response?.data?.error ?? 'Şube değiştirilemedi.');
            } else {
                toast.error('Şube değiştirilemedi.');
            }
        }
    };

    const trigger = (
        <button
            type="button"
            disabled={!canSwitch || switching}
            aria-label={canSwitch ? 'Şube değiştir' : undefined}
            className={cn(
                'flex items-center gap-2.5 w-full rounded-xl border px-2.5 py-2 text-left transition-colors',
                'border-rb-gold/35 bg-rb-gold/10 text-sidebar-foreground',
                canSwitch && 'hover:bg-rb-gold/20 data-[state=open]:border-rb-gold/70 data-[state=open]:bg-rb-gold/20',
                !canSwitch && 'cursor-default',
                switching && 'opacity-60',
                collapsed && 'md:justify-center md:px-0'
            )}
        >
            <span className="w-7 h-7 rounded-lg bg-rb-gold/20 flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-rb-gold" />
            </span>
            <span className={cn('flex-1 min-w-0 flex flex-col gap-0.5', collapsed && 'md:hidden')}>
                <span className="text-[10px] font-semibold tracking-[0.15em] text-rb-gold leading-none">{caption}</span>
                <span className="font-serif font-bold text-base leading-none truncate">{title}</span>
            </span>
            {canSwitch && (
                <ChevronsUpDown className={cn('w-3.5 h-3.5 text-sidebar-foreground/50 shrink-0', collapsed && 'md:hidden')} />
            )}
        </button>
    );

    if (!canSwitch) return trigger;

    const itemClass = 'gap-2.5 rounded-lg px-2.5 py-2 text-sm text-sidebar-foreground/85 focus:bg-white/10 focus:text-sidebar-foreground cursor-pointer';

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
            <DropdownMenuContent
                side="top"
                align="start"
                sideOffset={8}
                className="w-56 rounded-2xl border-white/10 bg-[#241D16] p-2 text-sidebar-foreground shadow-2xl"
            >
                {isOwner && (
                    <>
                        <DropdownMenuLabel className="px-2.5 pb-1 pt-1.5 text-[10px] font-semibold tracking-[0.15em] text-sidebar-foreground/45">
                            GÖRÜNÜM
                        </DropdownMenuLabel>
                        <DropdownMenuItem
                            onSelect={() => switchTo(null)}
                            className={cn(itemClass, companyMode && 'bg-rb-gold/15 text-sidebar-foreground')}
                        >
                            <Landmark className="w-4 h-4 text-rb-gold" />
                            <span className="flex-1 flex flex-col">
                                <span>Tümü</span>
                                <span className="text-[11px] text-sidebar-foreground/45">Şirket geneli · {branches.length} şube</span>
                            </span>
                            {companyMode && <Check className="w-4 h-4 text-rb-gold" />}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="my-1 bg-white/10" />
                    </>
                )}

                <DropdownMenuLabel className="px-2.5 pb-1 pt-1.5 text-[10px] font-semibold tracking-[0.15em] text-sidebar-foreground/45">
                    ŞUBELER
                </DropdownMenuLabel>
                {branches.map(branch => {
                    const active = !companyMode && branch.id === activeBranchId;
                    return (
                        <DropdownMenuItem
                            key={branch.id}
                            onSelect={() => switchTo(branch.id)}
                            className={cn(itemClass, active && 'bg-rb-gold/15 text-sidebar-foreground')}
                        >
                            <span className="w-2 h-2 rounded-full bg-rb-green shrink-0" />
                            <span className="flex-1 truncate">{branch.branchName}</span>
                            {active && <Check className="w-4 h-4 text-rb-gold" />}
                        </DropdownMenuItem>
                    );
                })}

                {isOwner && (
                    <>
                        <DropdownMenuSeparator className="my-1 bg-white/10" />
                        <DropdownMenuItem
                            onSelect={() => navigate(companyMode ? '/owner/branches' : '/admin/branches')}
                            className={cn(itemClass, 'text-rb-gold focus:text-rb-gold')}
                        >
                            <Plus className="w-3.5 h-3.5" />
                            Yeni şube ekle
                        </DropdownMenuItem>
                    </>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
