import { useEffect, useState } from "react";
import type { Order } from "../features/order/types";
import * as signalR from "@microsoft/signalr";
import { orderService } from "../api/orderService";
const OrderStatus = {
  Active: 1,
  Pending: 2,
  Preparing: 3,
  Ready: 4,
  Served: 5,
  Paid: 6,
  Cancelled: 7,
} as const;

const ItemStatusConfig: Record<number, { label: string; dot: string; text: string }> = {
  1: { label: "Bekliyor",     dot: "bg-red-400 animate-pulse",    text: "text-red-400" },
  2: { label: "Hazırlanıyor", dot: "bg-yellow-400 animate-pulse", text: "text-yellow-400" },
  3: { label: "Hazır",        dot: "bg-green-400",                text: "text-green-400" },
  4: { label: "Teslim Edildi",dot: "bg-gray-400",                 text: "text-gray-400" },
};
export default function KitchenPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  
  const statusConfig: Record<number, { label: string; border: string; badge: string; dot: string }> = {
    [OrderStatus.Active]: {
      label: "Aktif / Yeni",
      border: "border-blue-500",
      badge: "bg-blue-500/20 text-blue-400 border border-blue-500/40",
      dot: "bg-blue-400 animate-pulse",
    },
    [OrderStatus.Pending]: {
      label: "Bekliyor",
      border: "border-red-500",
      badge: "bg-red-500/20 text-red-400 border border-red-500/40",
      dot: "bg-red-400 animate-pulse",
    },
    [OrderStatus.Preparing]: {
      label: "Hazırlanıyor",
      border: "border-yellow-400",
      badge: "bg-yellow-400/20 text-yellow-300 border border-yellow-400/40",
      dot: "bg-yellow-400 animate-pulse",
    },
    [OrderStatus.Ready]: {
      label: "Hazır",
      border: "border-green-500",
      badge: "bg-green-500/20 text-green-400 border border-green-500/40",
      dot: "bg-green-400",
    },
  };

  const itemStatusMap: Record<number, { from: number; to: number }> = {
    [OrderStatus.Preparing]: { from: 1, to: 2 },
    [OrderStatus.Ready]:     { from: 2, to: 3 },
  };

  const handleStatusUpdate = async (orderId: number, newStatus: number) => {
    try {
      await orderService.updateOrderStatus(orderId, newStatus);
      setOrders((prev) =>
        prev.map((o) => {
          if (o.id !== orderId) return o;
          const map = itemStatusMap[newStatus];
          const updatedItems = map
            ? o.orderItems.map(i => i.status === map.from ? { ...i, status: map.to } : i)
            : o.orderItems;
          return { ...o, status: newStatus, orderItems: updatedItems };
        })
      );
    } catch {
      setError("Durum güncellenemedi.");
    }
  };

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const all = await orderService.getAllOrdersToKitchen();
        console.log(all);
        setOrders(all);
      } catch {
        setError("Siparişler yüklenemedi.");
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);
  useEffect(() => {
    const connection = new signalR.HubConnectionBuilder()
      .withUrl("http://localhost:5077/kitchen-hub") 
      .withAutomaticReconnect()
      .build();

    connection.on("ReceiveNewOrder", (newOrder: Order) => {
      const formattedOrder: Order = {
        id: newOrder.id,
        tableId: newOrder.tableId,
        note: newOrder.note || "Yeni Sipariş",
        totalPrice: newOrder.totalPrice || 0,
        status: 1,
        orderItems: newOrder.orderItems || []
      };
      setOrders((prevOrders) => {
        if (prevOrders.some(o => o.id === newOrder.id)) return prevOrders;
        return [formattedOrder, ...prevOrders];
      });
    });

    connection.start()
      .then(() => console.log("🟢 SignalR: Mutfak sistemine canlı bağlanıldı!"))
      .catch((err) => console.error("🔴 SignalR Bağlantı Hatası:", err));

    return () => {
      connection.stop();
    };
  }, []);
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100" style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* ── Top Bar ── */}
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-xl">
            🍳
          </div>
          <div>
            <h1 className="text-xl font-bold text-white leading-none">Mutfak Ekranı</h1>
            <p className="text-xs text-gray-500 mt-0.5">Kitchen Display System</p>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-3">
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 px-3 py-1.5 rounded-lg">
            <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse"></span>
            <span className="text-sm text-red-300">Bekliyor</span>
          </div>
          <div className="flex items-center gap-2 bg-yellow-400/10 border border-yellow-400/30 px-3 py-1.5 rounded-lg">
            <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse"></span>
            <span className="text-sm text-yellow-300">Hazırlanıyor</span>
          </div>
          <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/30 px-3 py-1.5 rounded-lg">
            <span className="w-2 h-2 rounded-full bg-green-400"></span>
            <span className="text-sm text-green-300">Hazır</span>
          </div>
        </div>
      </header>

      {/* ── Content ── */}
      <main className="p-6">
        {loading && (
          <div className="flex items-center justify-center h-64 text-gray-500 text-lg">
            Yükleniyor...
          </div>
        )}
      
        {error && (
          <div className="flex items-center justify-center h-64 text-red-400 text-lg">
            {error}
          </div>
        )}

        {!loading && !error && orders.length === 0 && (
          <div className="flex items-center justify-center h-64 text-gray-500 text-lg">
            Aktif sipariş yok.
          </div>
        )}

       {!loading && !error && orders.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {orders.map((order) => {
              const cfg = statusConfig[order.status];
              return (
                <div
                  key={order.id}
                  className={`bg-gray-900 rounded-2xl border-t-4 ${cfg.border} flex flex-col shadow-xl overflow-hidden`}
                >
                  {/* Card Header */}
                  <div className="px-4 pt-4 pb-3 flex items-center justify-between">
                    <div>
                      <span className="text-2xl font-extrabold text-white">Masa {order.tableId}</span>
                      <p className="text-xs text-gray-500 mt-0.5">#{order.id}</p>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1.5 ${cfg.badge}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`}></span>
                      {cfg.label}
                    </span>
                  </div>

                  <div className="mx-4 border-t border-gray-800"></div>

                  {/* Order Items */}
                  <div className="px-4 py-3 flex-1 space-y-2.5">
                    {order.orderItems.map((item, i) => {
                      const itemCfg = ItemStatusConfig[item.status] ?? ItemStatusConfig[1];
                      return (
                        <div key={i} className="flex items-center gap-3">
                          <span className="w-8 h-8 shrink-0 bg-gray-800 border border-gray-700 rounded-lg flex items-center justify-center text-base font-black text-white">
                            {item.quantity}
                          </span>
                          <p className="text-base font-semibold text-gray-100 leading-tight flex-1">
                            {item.productName}
                          </p>
                          <span className={`flex items-center gap-1 text-xs font-semibold ${itemCfg.text}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${itemCfg.dot}`}></span>
                            {itemCfg.label}
                          </span>
                        </div>
                      );
                    })}
                    {order.note && (
                      <p className="text-xs text-amber-400/80 pt-1">📝 {order.note}</p>
                    )}
                  </div>

                  <div className="mx-4 border-t border-gray-800"></div>

                  {/* Action Button */}
                  <div className="p-4 space-y-2">
                    {order.orderItems.some(i => i.status === 1) && (
                      <button
                        onClick={() => handleStatusUpdate(order.id, OrderStatus.Preparing)}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 rounded-xl text-sm transition-colors shadow-md shadow-blue-900/40"
                      >
                        Hazırlamaya Başla
                      </button>
                    )}
                    {order.orderItems.some(i => i.status === 2) && (
                      <button
                        onClick={() => handleStatusUpdate(order.id, OrderStatus.Ready)}
                        className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-2.5 rounded-xl text-sm transition-colors shadow-md shadow-green-900/40"
                      >
                        ✓ Hazır — Teslim Et
                      </button>
                    )}
                    {order.orderItems.every(i => i.status === 3) && (
                      <div className="w-full bg-gray-800 text-gray-500 font-bold py-2.5 rounded-xl text-sm text-center cursor-default">
                        Servis Bekleniyor
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
