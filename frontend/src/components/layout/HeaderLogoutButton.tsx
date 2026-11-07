import { LogOut } from 'lucide-react';

export default function HeaderLogoutButton({ onClick, large = false }: { onClick: () => void; large?: boolean }) {
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-1.5 font-semibold text-rb-red/85 border border-rb-red/25 rounded-lg hover:bg-rb-red-bg hover:text-rb-red hover:border-rb-red/45 transition-colors ${large ? 'min-h-11 px-4 text-sm' : 'px-3 py-1.5 text-xs'}`}
            title="Çıkış Yap"
        >
            <LogOut className={large ? 'w-4 h-4' : 'w-3.5 h-3.5'} />
            Çıkış
        </button>
    );
}
