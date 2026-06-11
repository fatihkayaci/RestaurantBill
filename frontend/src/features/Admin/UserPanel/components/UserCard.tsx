import type { User } from '../../../auths/userTypes';

const roleLabel = (role: number) => {
    switch (role) {
        case 1: return { label: 'Admin', color: 'text-purple-400 border-purple-400/30' };
        case 2: return { label: 'Garson', color: 'text-indigo-400 border-indigo-400/30' };
        case 3: return { label: 'Kasiyer', color: 'text-yellow-400 border-yellow-400/30' };
        case 4: return { label: 'Mutfak', color: 'text-green-400 border-green-400/30' };
        default: return { label: 'Bilinmiyor', color: 'text-gray-400 border-gray-400/30' };
    }
};

interface UserCardProps {
    user: User;
    onDelete: (id: string) => void;
    onUpdate: (user: User) => void;
}

export default function UserCard({ user, onDelete, onUpdate }: UserCardProps) {
    const { label, color } = roleLabel(user.role);
    return (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 flex flex-col gap-3">
            <div>
                <p className="text-white font-medium">{user.fullName}</p>
                <p className="text-gray-500 text-xs mt-1">@{user.userName}</p>
            </div>
            <span className={`text-xs border rounded-full px-2 py-0.5 w-fit ${color}`}>{label}</span>
            <div className="flex gap-2 mt-1">
                <button
                    onClick={() => onUpdate(user)}
                    className="flex-1 text-indigo-400 hover:text-indigo-300 text-xs border border-indigo-400/30 rounded-lg py-1"
                >
                    Düzenle
                </button>
                <button
                    onClick={() => onDelete(user.id)}
                    className="flex-1 text-red-400 hover:text-red-300 text-xs border border-red-400/30 rounded-lg py-1"
                >
                    Sil
                </button>
            </div>
        </div>
    );
}
