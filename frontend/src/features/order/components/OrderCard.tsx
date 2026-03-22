import type { OrderItem } from '../types';

interface OrderCardProps {
    item: OrderItem;
    increaseQuantity: (productId:number) => void,
    decreaseQuantity: (productId:number) => void,
} 

export default function OrderCard({ item, increaseQuantity, decreaseQuantity }: OrderCardProps) {
    
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
                onClick={() => decreaseQuantity(item.productId)}
                className="bg-slate-700/50 text-red-400 border border-slate-600 w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xl hover:bg-red-500 hover:text-white hover:border-red-500 transition-all active:scale-95">-</button>
                <span className="font-bold text-lg w-6 text-center text-slate-200">{item.quantity}</span>
                <button 
                onClick={() => increaseQuantity(item.productId)}
                className="bg-slate-700/50 text-blue-400 border border-slate-600 w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xl hover:bg-blue-500 hover:text-white hover:border-blue-500 transition-all active:scale-95">+</button>
            </div>
        </div>
    );
}