import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { orderService } from '../api/orderService';
import type { Order } from '../features/order/types';

// OrderStatus enum — backend ile eşleşiyor
const OrderStatus = {
  Active: 1,
  Pending: 2,
  Preparing: 3,
  Ready: 4,
  Served: 5,
  Paid: 6,
  Cancelled: 7,
} as const;

// Mutfağın görmesi gereken siparişler
const KITCHEN_STATUSES: number[] = [OrderStatus.Pending, OrderStatus.Preparing, OrderStatus.Ready];

const statusConfig: Record<number, { label: string; border: string; badge: string; dot: string }> = {
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

export default function KitchenPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const all = await orderService.getAllOrders();
        setOrders(all.filter((o: Order) => KITCHEN_STATUSES.includes(o.status)));
      } catch {
        setError("Siparişler yüklenemedi.");
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  const counts = {
    [OrderStatus.Pending]: orders.filter((o) => o.status === OrderStatus.Pending).length,
    [OrderStatus.Preparing]: orders.filter((o) => o.status === OrderStatus.Preparing).length,
    [OrderStatus.Ready]: orders.filter((o) => o.status === OrderStatus.Ready).length,
  };

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
            <span className="text-sm text-red-300">{counts[OrderStatus.Pending]} Bekliyor</span>
          </div>
          <div className="flex items-center gap-2 bg-yellow-400/10 border border-yellow-400/30 px-3 py-1.5 rounded-lg">
            <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse"></span>
            <span className="text-sm text-yellow-300">{counts[OrderStatus.Preparing]} Hazırlanıyor</span>
          </div>
          <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/30 px-3 py-1.5 rounded-lg">
            <span className="w-2 h-2 rounded-full bg-green-400"></span>
            <span className="text-sm text-green-300">{counts[OrderStatus.Ready]} Hazır</span>
          </div>
        </div>

        <Link
          to="/"
          className="text-sm text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 px-4 py-2 rounded-lg transition-colors"
        >
          ← Masalara Dön
        </Link>
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
                    {order.orderItems.map((item, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <span className="w-8 h-8 shrink-0 bg-gray-800 border border-gray-700 rounded-lg flex items-center justify-center text-base font-black text-white">
                          {item.quantity}
                        </span>
                        <p className="text-base font-semibold text-gray-100 leading-tight mt-1">
                          {item.productName}
                        </p>
                      </div>
                    ))}
                    {order.note && (
                      <p className="text-xs text-amber-400/80 pt-1">📝 {order.note}</p>
                    )}
                  </div>

                  <div className="mx-4 border-t border-gray-800"></div>

                  {/* Action Button */}
                  <div className="p-4">
                    {order.status === OrderStatus.Pending && (
                      <button className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 rounded-xl text-sm transition-colors shadow-md shadow-blue-900/40">
                        Hazırlamaya Başla
                      </button>
                    )}
                    {order.status === OrderStatus.Preparing && (
                      <button className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-2.5 rounded-xl text-sm transition-colors shadow-md shadow-green-900/40">
                        ✓ Hazır — Teslim Et
                      </button>
                    )}
                    {order.status === OrderStatus.Ready && (
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
