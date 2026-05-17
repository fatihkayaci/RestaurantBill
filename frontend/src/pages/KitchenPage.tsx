import { useEffect, useState } from "react";
import type { Order } from "../features/order/types";
import * as signalR from "@microsoft/signalr";
import { orderService } from "../api/orderService";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent
} from "@/components/ui/card";
import { Clock, CheckCircle2, ChefHat } from "lucide-react";
import OrderCard from "@/components/OrderCard";

const OrderStatus = {
  Active: 1,
  Pending: 2,
  Preparing: 3,
  Ready: 4,
  Served: 5,
  Paid: 6,
  Cancelled: 7,
} as const;

// const ItemStatusConfig: Record<
//   number,
//   { label: string; dot: string; text: string }
// > = {
//   1: {
//     label: "Bekliyor",
//     dot: "bg-red-500 animate-pulse",
//     text: "text-red-500",
//   },
//   2: {
//     label: "Hazırlanıyor",
//     dot: "bg-yellow-500 animate-pulse",
//     text: "text-yellow-500",
//   },
//   3: { label: "Hazır", dot: "bg-green-500", text: "text-green-500" },
//   4: { label: "Teslim Edildi", dot: "bg-gray-500", text: "text-gray-500" },
// };

export default function KitchenPage() {
  // const [loading, setLoading] = useState(false);
  // const [error, setError] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);

  // Her order için her status grubunu ayrı bir kart kaydı olarak üret
  interface OrderGroup { order: Order; items: Order['orderItems']; colStatus: number }

  const orderGroups: OrderGroup[] = orders.flatMap(order => {
    const byStatus = [1, 2, 3].map(s => ({
      order,
      items: order.orderItems.filter(i => i.status === s),
      colStatus: s,
    }))
    return byStatus.filter(g => g.items.length > 0)
  })

  const pendingGroups   = orderGroups.filter(g => g.colStatus === 1)
  const preparingGroups = orderGroups.filter(g => g.colStatus === 2)
  const readyGroups     = orderGroups.filter(g => g.colStatus === 3)

  // const statusConfig: Record<
  //   number,
  //   {
  //     label: string;
  //     border: string;
  //     variant: "default" | "secondary" | "destructive" | "outline";
  //     dot: string;
  //   }
  // > = {
  //   [OrderStatus.Active]: {
  //     label: "Yeni",
  //     border: "border-t-blue-500",
  //     variant: "default",
  //     dot: "bg-blue-500 animate-pulse",
  //   },
  //   [OrderStatus.Pending]: {
  //     label: "Bekliyor",
  //     border: "border-t-red-500",
  //     variant: "destructive",
  //     dot: "bg-red-100 animate-pulse", // Kırmızı badge içinde beyaz kalsın diye
  //   },
  //   [OrderStatus.Preparing]: {
  //     label: "Hazırlanıyor",
  //     border: "border-t-yellow-500",
  //     variant: "secondary",
  //     dot: "bg-yellow-500 animate-pulse",
  //   },
  //   [OrderStatus.Ready]: {
  //     label: "Hazır",
  //     border: "border-t-green-500",
  //     variant: "outline",
  //     dot: "bg-green-500",
  //   },
  // };

  const itemStatusMap: Record<number, { from: number; to: number }> = {
    [OrderStatus.Preparing]: { from: 1, to: 2 },
    [OrderStatus.Ready]:     { from: 2, to: 3 },
    [OrderStatus.Served]:    { from: 3, to: 4 },
  };

  const handleItemStatusUpdate = async (orderId: number, itemId: number, newStatus: number) => {
    try {
      await orderService.updateOrderItemStatus(orderId, itemId, newStatus);
      setOrders(prev =>
        prev.map(o => {
          if (o.id !== orderId) return o;
          return {
            ...o,
            orderItems: o.orderItems.map(i =>
              i.id === itemId ? { ...i, status: newStatus } : i
            )
          };
        })
      );
    } catch (err) {
      console.error("handleItemStatusUpdate error:", err);
    }
  };

  const handleStatusUpdate = async (orderId: number, newStatus: number) => {
    try {
      await orderService.updateOrderStatus(orderId, newStatus);
      setOrders((prev) =>
        prev.map((o) => {
          if (o.id !== orderId) return o;
          const map = itemStatusMap[newStatus];
          const updatedItems = map
            ? o.orderItems.map((i) =>
                i.status === map.from ? { ...i, status: map.to } : i
              )
            : o.orderItems;
          return { ...o, status: newStatus, orderItems: updatedItems };
        })
      );
    } catch (err) {
      console.error("handleStatusUpdate error:", err);
      // setError("Durum güncellenemedi.");
    }
  };

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const all = await orderService.getAllOrdersToKitchen();
        console.log("kitchen orders:", all);
        setOrders(all);
      } catch (err) {
        console.error("fetchOrders error:", err);
        // setError("Siparişler yüklenemedi.");
      } 
      // finally {
      //   setLoading(false);
      // }
    };
    fetchOrders();
  }, []);

  
  useEffect(() => {
    const kitchenConnection = new signalR.HubConnectionBuilder()
      .withUrl(`${import.meta.env.VITE_API_URL ?? 'http://localhost:5077'}/kitchen-hub`)
      .withAutomaticReconnect()
      .build();

    kitchenConnection.on("ReceiveNewOrder", async () => {
      try {
        const all = await orderService.getAllOrdersToKitchen();
        setOrders(all);
      } catch (err) {
        console.error("ReceiveNewOrder refresh error:", err);
      }
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
    <div className="flex flex-col gap-6">
      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm text-amber-800 font-medium">Pending</p>
              <p className="text-3xl font-bold text-amber-900">{pendingGroups.length}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-200">
              <Clock className="h-6 w-6 text-amber-700" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm text-blue-800 font-medium">Preparing</p>
              <p className="text-3xl font-bold text-blue-900">{preparingGroups.length}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-200">
              <ChefHat className="h-6 w-6 text-blue-700" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm text-green-800 font-medium">Ready</p>
              <p className="text-3xl font-bold text-green-900">{readyGroups.length}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-200">
              <CheckCircle2 className="h-6 w-6 text-green-700" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b">
            <div className="h-3 w-3 rounded-full bg-amber-500" />
            <h2 className="font-semibold">New Orders</h2>
            <Badge variant="secondary">{pendingGroups.length}</Badge>
          </div>
          <div className="space-y-4">
            {pendingGroups.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No pending orders
              </p>
            ) : (
              pendingGroups.map(g => (
                <OrderCard
                  key={`${g.order.id}-pending`}
                  order={g.order}
                  visibleItems={g.items}
                  onAccept={(id) => handleStatusUpdate(id, OrderStatus.Preparing)}
                  onItemAccept={(orderId, itemId) => handleItemStatusUpdate(orderId, itemId, 2)}
                />
              ))
            )}
          </div>
        </div>

        {/* Preparing Column */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b">
            <div className="h-3 w-3 rounded-full bg-blue-500" />
            <h2 className="font-semibold">Preparing</h2>
            <Badge variant="secondary">{preparingGroups.length}</Badge>
          </div>
          <div className="space-y-4">
            {preparingGroups.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No orders being prepared
              </p>
            ) : (
              preparingGroups.map(g => (
                <OrderCard
                  key={`${g.order.id}-preparing`}
                  order={g.order}
                  visibleItems={g.items}
                  showBatches
                  onReady={(id) => handleStatusUpdate(id, OrderStatus.Ready)}
                  onItemReady={(orderId, itemId) => handleItemStatusUpdate(orderId, itemId, 3)}
                />
              ))
            )}
          </div>
        </div>

        {/* Ready Column */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b">
            <div className="h-3 w-3 rounded-full bg-green-500" />
            <h2 className="font-semibold">Ready to Serve</h2>
            <Badge variant="secondary">{readyGroups.length}</Badge>
          </div>
          <div className="space-y-4">
            {readyGroups.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No orders ready
              </p>
            ) : (
              readyGroups.map(g => (
                <OrderCard
                  key={`${g.order.id}-ready`}
                  order={g.order}
                  visibleItems={g.items}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
    // <div className="min-h-screen bg-background text-foreground" style={{ fontFamily: "'Inter', sans-serif" }}>

    //   {/* ── Top Bar ── */}
    //   <header className="bg-card border-b px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
    //     <div className="flex items-center gap-4">
    //       <div className="w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-500">
    //         <ChefHat className="w-6 h-6" />
    //       </div>
    //       <div>
    //         <h1 className="text-xl font-bold leading-none">Mutfak Ekranı</h1>
    //         <p className="text-xs text-muted-foreground mt-1">Kitchen Display System</p>
    //       </div>
    //     </div>
    //     <div className="grid grid-cols-3 gap-4">
    //       <Card className="border-amber-200 bg-amber-50">
    //         <CardContent className="flex items-center justify-between p-4">
    //           <div>
    //             <p className="text-sm text-amber-800 font-medium">Pending</p>
    //             <p className="text-3xl font-bold text-amber-900">10</p>
    //           </div>
    //           <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-200">
    //             <Clock className="h-6 w-6 text-amber-700" />
    //           </div>
    //         </CardContent>
    //       </Card>
    //       <Card className="border-blue-200 bg-blue-50">
    //         <CardContent className="flex items-center justify-between p-4">
    //           <div>
    //             <p className="text-sm text-blue-800 font-medium">Preparing</p>
    //             <p className="text-3xl font-bold text-blue-900">15</p>
    //           </div>
    //           <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-200">
    //             <ChefHat className="h-6 w-6 text-blue-700" />
    //           </div>
    //         </CardContent>
    //       </Card>
    //       <Card className="border-green-200 bg-green-50">
    //         <CardContent className="flex items-center justify-between p-4">
    //           <div>
    //             <p className="text-sm text-green-800 font-medium">Ready</p>
    //             <p className="text-3xl font-bold text-green-900">3</p>
    //           </div>
    //           <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-200">
    //             <CheckCircle2 className="h-6 w-6 text-green-700" />
    //           </div>
    //         </CardContent>
    //       </Card>
    //     </div>
    //     <div className="hidden md:flex items-center gap-4">
    //       <div className="flex gap-3 mr-4">
    //         <Badge variant="destructive" className="gap-2 px-3 py-1">
    //           <span className="w-2 h-2 rounded-full bg-red-100 animate-pulse"></span> Bekliyor
    //         </Badge>
    //         <Badge variant="secondary" className="gap-2 px-3 py-1">
    //           <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></span> Hazırlanıyor
    //         </Badge>
    //         <Badge variant="outline" className="gap-2 px-3 py-1 border-green-500/30 text-green-600">
    //           <span className="w-2 h-2 rounded-full bg-green-500"></span> Hazır
    //         </Badge>
    //       </div>
    //     </div>
    //   </header>

    //   {/* ── Content ── */}
    //   <main className="p-6">
    //     {loading && (
    //       <div className="flex items-center justify-center h-64 text-muted-foreground text-lg">
    //         Siparişler yükleniyor...
    //       </div>
    //     )}

    //     {error && (
    //       <div className="flex items-center justify-center h-64 text-destructive text-lg font-medium">
    //         {error}
    //       </div>
    //     )}

    //     {!loading && !error && orders.length === 0 && (
    //       <div className="flex items-center justify-center h-64 text-muted-foreground text-lg border-2 border-dashed rounded-xl m-8">
    //         Aktif sipariş bulunmuyor. Şef dinlenebilir! ☕
    //       </div>
    //     )}

    //    {!loading && !error && orders.length > 0 && (
    //       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
    //         {orders.map((order) => {
    //           const cfg = statusConfig[order.status] || statusConfig[OrderStatus.Pending];

    //           return (
    //             <Card
    //               key={order.id}
    //               className={`border-t-4 shadow-md flex flex-col overflow-hidden ${cfg.border}`}
    //             >
    //               <CardHeader className="pb-3 flex flex-row items-start justify-between space-y-0 bg-muted/30">
    //                 <div>
    //                   <CardTitle className="text-2xl font-extrabold">Masa {order.tableId}</CardTitle>
    //                   <p className="text-xs text-muted-foreground mt-1">Sipariş #{order.id}</p>
    //                 </div>
    //                 <Badge variant={cfg.variant} className="gap-1.5 px-2.5 py-1">
    //                   <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`}></span>
    //                   {cfg.label}
    //                 </Badge>
    //               </CardHeader>

    //               <CardContent className="pt-4 flex-1 space-y-4">
    //                 {order.orderItems.map((item, i) => {
    //                   const itemCfg = ItemStatusConfig[item.status] ?? ItemStatusConfig[1];
    //                   return (
    //                     <div key={i} className="flex items-start gap-3">
    //                       <Badge variant="secondary" className="w-8 h-8 shrink-0 flex items-center justify-center rounded-md text-base font-bold">
    //                         {item.quantity}
    //                       </Badge>
    //                       <div className="flex-1 space-y-1">
    //                         <p className="text-base font-semibold leading-tight">
    //                           {item.productName}
    //                         </p>
    //                         <div className={`flex items-center gap-1.5 text-xs font-medium ${itemCfg.text}`}>
    //                           <span className={`w-1.5 h-1.5 rounded-full ${itemCfg.dot}`}></span>
    //                           {itemCfg.label}
    //                         </div>
    //                       </div>
    //                     </div>
    //                   );
    //                 })}

    //                 {order.note && (
    //                   <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
    //                     <p className="text-sm text-amber-600 dark:text-amber-400 font-medium flex gap-2 items-start">
    //                       <span className="text-base">📝</span> {order.note}
    //                     </p>
    //                   </div>
    //                 )}
    //               </CardContent>

    //               <CardFooter className="p-4 bg-muted/10 border-t">
    //                 {order.orderItems.some(i => i.status === 1) && (
    //                   <Button
    //                     onClick={() => handleStatusUpdate(order.id, OrderStatus.Preparing)}
    //                     className="w-full bg-blue-600 hover:bg-blue-700 text-white gap-2"
    //                     size="lg"
    //                   >
    //                     <Play className="w-4 h-4 fill-current" />
    //                     Hazırlamaya Başla
    //                   </Button>
    //                 )}

    //                 {order.orderItems.some(i => i.status === 2) && (
    //                   <Button
    //                     onClick={() => handleStatusUpdate(order.id, OrderStatus.Ready)}
    //                     className="w-full bg-green-600 hover:bg-green-700 text-white gap-2"
    //                     size="lg"
    //                   >
    //                     <Check className="w-4 h-4" strokeWidth={3} />
    //                     Hazır — Teslim Et
    //                   </Button>
    //                 )}

    //                 {order.orderItems.every(i => i.status === 3) && (
    //                   <Button
    //                     variant="secondary"
    //                     disabled
    //                     className="w-full opacity-70"
    //                     size="lg"
    //                   >
    //                     Servis Bekleniyor
    //                   </Button>
    //                 )}
    //               </CardFooter>
    //             </Card>
    //           );
    //         })}
    //       </div>
    //     )}
    //   </main>
    // </div>
  );
}
