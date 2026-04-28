import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Order } from "../features/order/types";
import * as signalR from "@microsoft/signalr";
import { orderService } from "../api/orderService";
import { authService } from "../api/authService";

// shadcn/ui & Icons
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Card, 
  CardContent, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { ChefHat, Check, Play } from "lucide-react";

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
  1: { label: "Bekliyor",     dot: "bg-red-500 animate-pulse",    text: "text-red-500" },
  2: { label: "Hazırlanıyor", dot: "bg-yellow-500 animate-pulse", text: "text-yellow-500" },
  3: { label: "Hazır",        dot: "bg-green-500",                text: "text-green-500" },
  4: { label: "Teslim Edildi",dot: "bg-gray-500",                 text: "text-gray-500" },
};

export default function KitchenPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  
  const statusConfig: Record<number, { label: string; border: string; variant: "default" | "secondary" | "destructive" | "outline"; dot: string }> = {
    [OrderStatus.Active]: {
      label: "Yeni",
      border: "border-t-blue-500",
      variant: "default",
      dot: "bg-blue-500 animate-pulse",
    },
    [OrderStatus.Pending]: {
      label: "Bekliyor",
      border: "border-t-red-500",
      variant: "destructive",
      dot: "bg-red-100 animate-pulse", // Kırmızı badge içinde beyaz kalsın diye
    },
    [OrderStatus.Preparing]: {
      label: "Hazırlanıyor",
      border: "border-t-yellow-500",
      variant: "secondary",
      dot: "bg-yellow-500 animate-pulse",
    },
    [OrderStatus.Ready]: {
      label: "Hazır",
      border: "border-t-green-500",
      variant: "outline",
      dot: "bg-green-500",
    },
  };

  const itemStatusMap: Record<number, { from: number; to: number }> = {
    [OrderStatus.Preparing]: { from: 1, to: 2 },
    [OrderStatus.Ready]:     { from: 2, to: 3 },
  };

  const handleStatusUpdate = async (orderId: number, newStatus: number) => {
    try {
      console.log("updateOrderStatus çağrılıyor:", orderId, newStatus);
      await orderService.updateOrderStatus(orderId, newStatus);
      console.log("updateOrderStatus başarılı");
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

  // --- USE EFFECT VE SIGNALR MANTIĞI AYNEN KORUNDU ---
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const all = await orderService.getAllOrdersToKitchen();
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
    const kitchenConnection = new signalR.HubConnectionBuilder()
      .withUrl(`${import.meta.env.VITE_API_URL ?? 'http://localhost:5077'}/kitchen-hub`)
      .withAutomaticReconnect()
      .build();

    kitchenConnection.on("ReceiveNewOrder", (newOrder: Order) => {
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

    const tableConnection = new signalR.HubConnectionBuilder()
      .withUrl(`${import.meta.env.VITE_API_URL ?? 'http://localhost:5077'}/table-hub`)
      .withAutomaticReconnect()
      .build();

    tableConnection.on("OrderUpdated", async () => {
      try {
        const all = await orderService.getAllOrdersToKitchen();
        setOrders(all);
      } catch {
        // silently ignore refresh errors
      }
    });

    tableConnection.on("OrderClosed", (_tableId: number, closedOrderId: number) => {
      console.log("OrderClosed geldi, orderId:", closedOrderId);
      setOrders((prev) => prev.filter((o) => o.id !== closedOrderId));
    });

    let isCancelled = false;

    kitchenConnection.start()
      .catch((err) => { if (!isCancelled) console.error("🔴 SignalR Kitchen Connection Error:", err); });

    tableConnection.start()
      .then(() => console.log("✅ table-hub bağlantısı kuruldu"))
      .catch((err) => { if (!isCancelled) console.error("🔴 SignalR Table Connection Error:", err); });

    return () => {
      isCancelled = true;
      kitchenConnection.stop();
      tableConnection.stop();
    };
  }, []);
  // ---------------------------------------------------

  return (
    <div className="min-h-screen bg-background text-foreground" style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* ── Top Bar ── */}
      <header className="bg-card border-b px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-500">
            <ChefHat className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold leading-none">Mutfak Ekranı</h1>
            <p className="text-xs text-muted-foreground mt-1">Kitchen Display System</p>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-4">
          <div className="flex gap-3 mr-4">
            <Badge variant="destructive" className="gap-2 px-3 py-1">
              <span className="w-2 h-2 rounded-full bg-red-100 animate-pulse"></span> Bekliyor
            </Badge>
            <Badge variant="secondary" className="gap-2 px-3 py-1">
              <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></span> Hazırlanıyor
            </Badge>
            <Badge variant="outline" className="gap-2 px-3 py-1 border-green-500/30 text-green-600">
              <span className="w-2 h-2 rounded-full bg-green-500"></span> Hazır
            </Badge>
          </div>
        </div>
      </header>

      {/* ── Content ── */}
      <main className="p-6">
        {loading && (
          <div className="flex items-center justify-center h-64 text-muted-foreground text-lg">
            Siparişler yükleniyor...
          </div>
        )}
      
        {error && (
          <div className="flex items-center justify-center h-64 text-destructive text-lg font-medium">
            {error}
          </div>
        )}

        {!loading && !error && orders.length === 0 && (
          <div className="flex items-center justify-center h-64 text-muted-foreground text-lg border-2 border-dashed rounded-xl m-8">
            Aktif sipariş bulunmuyor. Şef dinlenebilir! ☕
          </div>
        )}

       {!loading && !error && orders.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {orders.map((order) => {
              const cfg = statusConfig[order.status] || statusConfig[OrderStatus.Pending];
              
              return (
                <Card 
                  key={order.id} 
                  className={`border-t-4 shadow-md flex flex-col overflow-hidden ${cfg.border}`}
                >
                  <CardHeader className="pb-3 flex flex-row items-start justify-between space-y-0 bg-muted/30">
                    <div>
                      <CardTitle className="text-2xl font-extrabold">Masa {order.tableId}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">Sipariş #{order.id}</p>
                    </div>
                    <Badge variant={cfg.variant} className="gap-1.5 px-2.5 py-1">
                      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`}></span>
                      {cfg.label}
                    </Badge>
                  </CardHeader>

                  <CardContent className="pt-4 flex-1 space-y-4">
                    {order.orderItems.map((item, i) => {
                      const itemCfg = ItemStatusConfig[item.status] ?? ItemStatusConfig[1];
                      return (
                        <div key={i} className="flex items-start gap-3">
                          <Badge variant="secondary" className="w-8 h-8 shrink-0 flex items-center justify-center rounded-md text-base font-bold">
                            {item.quantity}
                          </Badge>
                          <div className="flex-1 space-y-1">
                            <p className="text-base font-semibold leading-tight">
                              {item.productName}
                            </p>
                            <div className={`flex items-center gap-1.5 text-xs font-medium ${itemCfg.text}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${itemCfg.dot}`}></span>
                              {itemCfg.label}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    
                    {order.note && (
                      <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                        <p className="text-sm text-amber-600 dark:text-amber-400 font-medium flex gap-2 items-start">
                          <span className="text-base">📝</span> {order.note}
                        </p>
                      </div>
                    )}
                  </CardContent>

                  <CardFooter className="p-4 bg-muted/10 border-t">
                    {order.orderItems.some(i => i.status === 1) && (
                      <Button 
                        onClick={() => handleStatusUpdate(order.id, OrderStatus.Preparing)}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white gap-2"
                        size="lg"
                      >
                        <Play className="w-4 h-4 fill-current" />
                        Hazırlamaya Başla
                      </Button>
                    )}
                    
                    {order.orderItems.some(i => i.status === 2) && (
                      <Button 
                        onClick={() => handleStatusUpdate(order.id, OrderStatus.Ready)}
                        className="w-full bg-green-600 hover:bg-green-700 text-white gap-2"
                        size="lg"
                      >
                        <Check className="w-4 h-4" strokeWidth={3} />
                        Hazır — Teslim Et
                      </Button>
                    )}
                    
                    {order.orderItems.every(i => i.status === 3) && (
                      <Button 
                        variant="secondary"
                        disabled
                        className="w-full opacity-70"
                        size="lg"
                      >
                        Servis Bekleniyor
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}