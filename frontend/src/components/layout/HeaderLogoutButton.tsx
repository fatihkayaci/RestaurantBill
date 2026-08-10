import { LogOut } from 'lucide-react';

export default function HeaderLogoutButton({ onClick }: { onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className="flex items-center gap-1.5 text-xs font-semibold text-rb-red/85 border border-rb-red/25 rounded-lg px-3 py-1.5 hover:bg-rb-red-bg hover:text-rb-red hover:border-rb-red/45 transition-colors"
            title="Çıkış Yap"
        >
            <LogOut className="w-3.5 h-3.5" />
            Çıkış
        </button>
    );
}
