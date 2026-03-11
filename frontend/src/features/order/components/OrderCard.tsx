import type { OrderItem } from '../types';

interface OrderCardProps {
    item: OrderItem;
}

export default function OrderCard({ item }: OrderCardProps) {
    // DİKKAT: Buradaki div'den key="..." kısmını sildik!
    return (
        <div className="bg-white p-3 rounded mb-2 shadow-sm flex items-center justify-between">
            <div>
                <div className="font-bold text-gray-800">{item.productName}</div>
                <div className="text-sm text-gray-500">{item.unitPrice} ₺</div>
            </div>

            <div className="flex items-center gap-2">
                <button className="bg-red-500 text-white w-8 h-8 rounded flex items-center justify-center font-bold text-xl hover:bg-red-600">-</button>
                <span className="font-bold text-lg w-6 text-center">{item.quantity}</span>
                <button className="bg-blue-500 text-white w-8 h-8 rounded flex items-center justify-center font-bold text-xl hover:bg-blue-600">+</button>
            </div>
        </div>
    );
}