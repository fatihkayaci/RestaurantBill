import { useState } from 'react';
import { LogOut } from 'lucide-react';
import LogoutConfirmDialog from './LogoutConfirmDialog';

export default function HeaderLogoutButton({ onClick, large = false }: { onClick: () => void; large?: boolean }) {
    const [confirmOpen, setConfirmOpen] = useState(false);

    return (
        <>
            <button
                type="button"
                onClick={() => setConfirmOpen(true)}
                className={`flex items-center gap-1.5 font-semibold text-rb-red/85 border border-rb-red/25 rounded-lg hover:bg-rb-red-bg hover:text-rb-red hover:border-rb-red/45 transition-colors ${large ? 'min-h-11 px-4 text-sm' : 'px-3 py-1.5 text-xs'}`}
                title="Çıkış Yap"
            >
                <LogOut className={large ? 'w-4 h-4' : 'w-3.5 h-3.5'} />
                Çıkış
            </button>
            <LogoutConfirmDialog open={confirmOpen} onOpenChange={setConfirmOpen} onConfirm={onClick} />
        </>
    );
}
