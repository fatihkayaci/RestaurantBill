import { Link } from 'react-router-dom';

// Mutfak için geçici sipariş verileri
const mockKitchenOrders = [
  {
    orderId: 101,
    tableId: 3,
    time: "18:45",
    status: "bekliyor", // bekliyor, hazirlaniyor, tamamlandi
    items: [
      { productId: 1, name: "Adana Kebap", quantity: 2 },
      { productId: 3, name: "Lahmacun", quantity: 3 }
    ]
  },
  {
    orderId: 102,
    tableId: 5,
    time: "18:50",
    status: "hazirlaniyor",
    items: [
      { productId: 2, name: "Mercimek Çorbası", quantity: 1 },
      { productId: 5, name: "Kola", quantity: 2 }
    ]
  },
  {
    orderId: 103,
    tableId: 1,
    time: "18:55",
    status: "bekliyor",
    items: [
      { productId: 4, name: "Tavuk Şiş", quantity: 1 }
    ]
  }
];

export default function KitchenPage() {
  return (
    <div className="min-h-screen bg-gray-900 p-6 text-gray-100">
      
      {/* Üst Bilgi Alanı */}
      <div className="flex justify-between items-center mb-8 border-b border-gray-700 pb-4">
        <h1 className="text-3xl font-bold text-white">Mutfak Ekranı (KDS)</h1>
        <Link to="/" className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded text-white transition-colors">
          Masalara Dön
        </Link>
      </div>

      {/* Sipariş Kartları (Grid) */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
        
        {mockKitchenOrders.map((order) => (
          <div 
            key={order.orderId} 
            className={`rounded-lg overflow-hidden flex flex-col shadow-lg border-t-8 ${
              order.status === 'bekliyor' ? 'border-red-500 bg-gray-800' : 'border-yellow-500 bg-gray-800'
            }`}
          >
            {/* Kart Başlığı */}
            <div className="bg-gray-700 p-3 flex justify-between items-center">
              <span className="font-bold text-xl">Masa {order.tableId}</span>
              <span className="text-sm bg-gray-900 px-2 py-1 rounded">{order.time}</span>
            </div>

            {/* Sipariş Kalemleri */}
            <div className="p-4 flex-1">
              <ul className="space-y-3">
                {order.items.map((item, index) => (
                  <li key={index} className="flex items-start text-lg border-b border-gray-700 pb-2 last:border-0">
                    <span className="font-bold text-white bg-gray-700 w-8 h-8 rounded flex items-center justify-center mr-3 shrink-0">
                      {item.quantity}
                    </span>
                    <span className="mt-1">{item.name}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Aksiyon Butonları (Mantığı sen yazacaksın) */}
            <div className="p-4 bg-gray-800 mt-auto">
              {order.status === 'bekliyor' ? (
                <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded text-lg transition-colors">
                  Hazırlamaya Başla
                </button>
              ) : (
                <button className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded text-lg transition-colors">
                  Hazır (Teslim Et)
                </button>
              )}
            </div>
            
          </div>
        ))}

      </div>
    </div>
  );
}