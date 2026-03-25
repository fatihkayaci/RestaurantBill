import type { OrderItem } from '../types';

interface OrderCardProps {
    item: OrderItem;
    increaseQuantity: (productId: number) => void;
    decreaseQuantity: (productId: number) => void;
    onUpdateQuantity: (productId: number, quantity: number) => void;
    removeItem: (productId: number) => void;
}

export default function OrderCard({ item, increaseQuantity, decreaseQuantity, onUpdateQuantity, removeItem }: OrderCardProps) {

    const getStatusBadge = (status: number) => {
        switch (status) {
            case 1:
                return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-700 text-slate-300 border border-slate-600">Yeni</span>;
            case 2:
                return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse">Hazırlanıyor</span>;
            case 3:
                return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/30 shadow-[0_0_8px_rgba(34,197,94,0.2)]">HAZIR</span>;
            default:
                return null;
        }
    };
    
    const isLocalItem = item.is_load === false;
    const isPendingApproved = item.is_load === true && item.status === 1;
    const isLocked = item.is_load === true && item.status !== 1;

    const handleDecrease = () => {
        if (isLocalItem) {
            decreaseQuantity(item.productId);
        } else if (isPendingApproved) {
            if (item.quantity > 1) {
                onUpdateQuantity(item.productId, item.quantity - 1);
            }
        }
    };

    const handleIncrease = () => {
        if (isLocalItem) {
            increaseQuantity(item.productId);
        } else if (isPendingApproved) {
            onUpdateQuantity(item.productId, item.quantity + 1);
        }
    };

    return (
        <div className="bg-slate-800 p-4 rounded-xl mb-2 shadow-md border border-slate-700 flex items-center justify-between transition-all hover:border-slate-600">
            <div className="flex flex-col gap-1">
                <div className="font-bold text-slate-200">
                    {item.productName}
                </div>
                <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm font-black text-emerald-400">{item.unitPrice} ₺</span>
                    {getStatusBadge(item.status)}
                </div>
            </div>

            <div className="flex items-center gap-3">
                <button
                    onClick={handleDecrease}
                    disabled={isLocked}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xl border transition-all active:scale-95
                        ${isLocked
                            ? 'bg-slate-800 text-slate-600 border-slate-700 cursor-not-allowed'
                            : 'bg-slate-700/50 text-red-400 border-slate-600 hover:bg-red-500 hover:text-white hover:border-red-500'
                        }`}
                >-</button>
                <span className="font-bold text-lg w-6 text-center text-slate-200">{item.quantity}</span>
                <button
                    onClick={handleIncrease}
                    disabled={isLocked}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xl border transition-all active:scale-95
                        ${isLocked
                            ? 'bg-slate-800 text-slate-600 border-slate-700 cursor-not-allowed'
                            : 'bg-slate-700/50 text-blue-400 border-slate-600 hover:bg-blue-500 hover:text-white hover:border-blue-500'
                        }`}
                >+</button>
            </div>
            {!isLocked && (
                <button
                    onClick={() => removeItem(item.productId)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center border border-transparent text-red-400 hover:bg-red-500/10 hover:border-red-500/30 transition-all active:scale-95"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                </button>
            )}
        </div>
    );
}
