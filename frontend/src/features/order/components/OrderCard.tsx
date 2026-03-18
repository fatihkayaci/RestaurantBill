import type { OrderItem } from '../types';

interface OrderCardProps {
    item: OrderItem;
}

export default function OrderCard({ item }: OrderCardProps) {
    return (
        <div className="bg-slate-800 p-4 rounded-xl mb-2 shadow-md border border-slate-700 flex items-center justify-between transition-all hover:border-slate-600">
            <div>
                <div className="font-bold text-slate-200">{item.productName}</div>
                <div className="text-sm text-slate-400">{item.unitPrice} ₺</div>
            </div>

            <div className="flex items-center gap-3">
                <button className="bg-slate-700/50 text-red-400 border border-slate-600 w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xl hover:bg-red-500 hover:text-white hover:border-red-500 transition-all active:scale-95">-</button>
                <span className="font-bold text-lg w-6 text-center text-slate-200">{item.quantity}</span>
                <button className="bg-slate-700/50 text-blue-400 border border-slate-600 w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xl hover:bg-blue-500 hover:text-white hover:border-blue-500 transition-all active:scale-95">+</button>
            </div>
        </div>
    );
}