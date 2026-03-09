import { useState, } from 'react';
import { Link, useParams } from 'react-router-dom';
interface OrderItem {
    productId: number;
    name: string;
    quantity: number;
    unitPrice: number;
}
interface Order {
    tableId: number;
    orderItems: OrderItem[];
}
const mockCategory = [
  { id: 1, name: 'kategori 1'},
  { id: 2, name: 'kategori 2'},
  { id: 3, name: 'kategori 3'},
  { id: 4, name: 'kategori 4'},
  { id: 5, name: 'kategori 5'},
];
const mockProduct = [
  { id: 1, categoryId:1, name: 'ürün 1', fiyat: 100 },
  { id: 2, categoryId:1, name: 'ürün 2', fiyat: 200 },
  { id: 3, categoryId:1, name: 'ürün 3', fiyat: 150 },
  { id: 4, categoryId:2, name: 'ürün 4', fiyat: 130 },
  { id: 5, categoryId:3, name: 'ürün 5', fiyat: 115 },
];
export default function PosPage() {
    const { tableId } = useParams();
    const [orders, setOrders] = useState<Order>({
        tableId: Number(tableId),
        orderItems: []
    });
    function increaseQuantity(productId:number) {
        const updatedOrderItem = orders.orderItems.map(orderItem => {
            if (orderItem.productId === productId)
                return { ...orderItem, quantity: orderItem.quantity + 1 };

            return orderItem;
        });
        setOrders({
            ...orders,
            orderItems: updatedOrderItem
        });
    }
    function decreaseQuantity(productId:number) {
        const targetItem = orders.orderItems.find(item => item.productId === productId);

        if (!targetItem) return;

        if (targetItem.quantity === 1) {
            if (confirm("Ürünü silmek istediğinize emin misiniz?")) {
                const filteredItems = orders.orderItems.filter(item => item.productId !== productId);
                setOrders({
                    ...orders,
                    orderItems: filteredItems
                });
            }
            return; 
        }

        const updatedOrderItems = orders.orderItems.map(orderItem => {
            if (orderItem.productId === productId) {
                return { ...orderItem, quantity: orderItem.quantity - 1 };
            }
            return orderItem;
        });

        setOrders({
            ...orders,
            orderItems: updatedOrderItems
        });
    }
    function submitOrder() {
        if (orders.orderItems.length === 0) {
            alert("Adisyonda ürün yok!");
            return;
        }
        
        // Backend'e gidecek tam JSON formatı
        console.log("Mutfak API'sine gönderilecek veri:", orders);
        alert(`Masa ${tableId} siparişi mutfağa iletildi!`);
    }
    function addOrderItem(productId:number) {
        const targetProduct = mockProduct.find(item => item.id === productId);
        if (!targetProduct) return;

        const existItem = orders.orderItems.find(item => item.productId === productId);
        if (existItem) {
            increaseQuantity(existItem.productId);
        }else{
            const newOrderItem = {
                productId: targetProduct.id,
                name: targetProduct.name,
                quantity: 1,
                unitPrice: targetProduct.fiyat
            };

            setOrders({
                ...orders,
                orderItems: [...orders.orderItems, newOrderItem] 
            });
        }
    }
    const [selectedCategoryId, setSelectedCategoryId] = useState(mockCategory[0].id);
    const filteredProducts = mockProduct.filter(product => product.categoryId === selectedCategoryId);

    return (
        <div className="flex h-screen">
        
        <div className="w-2/3 flex flex-col h-screen border-r border-gray-300">
            
            <div className="bg-white p-4 shadow-sm flex items-center gap-4 overflow-x-auto min-h-25">
                {mockCategory.map((category) => (
                    <button
                        key={category.id}
                        onClick={() => setSelectedCategoryId(category.id)}
                        className={`px-6 py-3 rounded-lg font-bold whitespace-nowrap transition-colors ${
                            selectedCategoryId === category.id 
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                    >
                        {category.name}
                    </button>
                ))}
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-gray-100">
                <div className="grid grid-cols-3 gap-6">
                    {filteredProducts.map((product) => (
                        <button 
                            key={product.id}
                            onClick={() => addOrderItem(product.id)}
                            className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg hover:scale-105 transition-all flex flex-col items-center justify-center h-32"
                        >
                            <span className="font-bold text-lg text-gray-800">{product.name}</span>
                            <span className="text-green-600 font-bold mt-2 text-xl">{product.fiyat} ₺</span>
                        </button>
                    ))}
                </div>
            </div>

        </div>

        <div className="w-1/3 bg-gray-200 p-6 flex flex-col">
            <h2 className="text-2xl font-bold mb-4 border-b border-gray-400 pb-2">
                Masa {tableId} Adisyonu
            </h2>
            <div className="flex-1">
                {orders.orderItems.map(orderItem => (
                    <div key={orderItem.productId} className="bg-white p-3 rounded mb-2 shadow-sm flex items-center justify-between">
                        <div>
                            <div className="font-bold text-gray-800">{orderItem.name}</div>
                            <div className="text-sm text-gray-500">{orderItem.unitPrice} ₺</div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button className="bg-red-500 text-white w-8 h-8 rounded flex items-center justify-center font-bold text-xl hover:bg-red-600" 
                            onClick={() => decreaseQuantity(orderItem.productId)}>-</button>
                            <span className="font-bold text-lg w-6 text-center">{orderItem.quantity}</span>
                            <button 
                            className="bg-blue-500 text-white w-8 h-8 rounded flex items-center justify-center font-bold text-xl hover:bg-blue-600" 
                            onClick={() => increaseQuantity(orderItem.productId)}>+</button>
                        </div>
                        
                    </div>
                ))}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-400">
                <div className="flex justify-between font-bold text-xl mb-4">
                    <span>Genel Toplam:</span>
                    <span>{orders.orderItems.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0)} ₺</span>
                </div>
                <button 
                    className="w-full bg-green-600 text-white font-bold py-4 rounded-lg shadow hover:bg-green-700 text-xl"
                    onClick={submitOrder}
                >
                    Siparişi Onayla
                </button>
            </div>
            <Link to="/kitchen" className="text-blue-500 underline text-center block mt-4">
                Mutfak Ekranına Git
            </Link>
        </div>
        </div>
    );
}