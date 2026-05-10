import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { CreditCard, Banknote, Receipt, DollarSign, TrendingUp, Clock, CheckCircle, Printer, X } from 'lucide-react';
import type { Order } from '@/features/order/types';
import { orderService } from '@/api/orderService';

interface MockTransaction {
    id: string;
    table: number;
    amount: number;
    time: string;
    method: 'Kart' | 'Nakit';
}

const TAX_RATE = 0.08;

const transactions: MockTransaction[] = [];

export default function CashierPage() {
    const [servedOrders, setServedOrders] = useState<Order[]>([]);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [tip, setTip] = useState<number>(0);
    const [paymentMethod, setPaymentMethod] = useState<'kart' | 'nakit' | null>(null);

    useEffect(() => {
        orderService.getAllOrdersToCashier()
            .then(setServedOrders)
            .catch((error) => console.error('Kasiyer siparişleri çekilirken hata:', error));
    }, []);

    const todayRevenue = servedOrders.reduce((sum, o) => sum + o.totalPrice, 0);
    const totalOrderCount = transactions.length + servedOrders.length;
    const avgTicket = totalOrderCount > 0 ? todayRevenue / totalOrderCount : 0;

    const handleSelectTip = (percentage: number) => {
        if (selectedOrder) {
            setTip(selectedOrder.totalPrice * (percentage / 100));
        }
    };

    const calculateTotal = () => {
        if (!selectedOrder) return 0;
        const tax = selectedOrder.totalPrice * TAX_RATE;
        return selectedOrder.totalPrice + tax + tip;
    };

    const closeDialog = () => {
        setSelectedOrder(null);
        setTip(0);
        setPaymentMethod(null);
    };

    return (
        <div className="flex flex-col gap-6 p-4 lg:p-6">
            {/* İstatistik Kartları */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="flex items-center gap-3 p-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
                            <DollarSign className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Bugünkü Gelir</p>
                            <p className="text-2xl font-bold">{todayRevenue.toFixed(2)} ₺</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="flex items-center gap-3 p-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                            <TrendingUp className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Ortalama Adisyon</p>
                            <p className="text-2xl font-bold">{avgTicket.toFixed(2)} ₺</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="flex items-center gap-3 p-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
                            <Clock className="h-5 w-5 text-amber-600" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Ödeme Bekleyen</p>
                            <p className="text-2xl font-bold">{servedOrders.length}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="flex items-center gap-3 p-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10">
                            <CheckCircle className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Tamamlanan</p>
                            <p className="text-2xl font-bold">{transactions.length}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
                {/* Ödeme Bekleyen Siparişler */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Receipt className="h-5 w-5" />
                            Ödeme Bekleyen Siparişler
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {servedOrders.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-8">
                                Ödeme bekleyen sipariş bulunmuyor
                            </p>
                        ) : (
                            servedOrders.map(order => (
                                <div
                                    key={order.id}
                                    className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors cursor-pointer"
                                    onClick={() => {
                                        setSelectedOrder(order);
                                        setTip(0);
                                        setPaymentMethod(null);
                                    }}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-3">
                                            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold">
                                                {order.tableId}
                                            </span>
                                            <div>
                                                <p className="font-semibold">Masa {order.tableId}</p>
                                                <p className="text-sm text-muted-foreground">#{order.id}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-lg font-bold">{order.totalPrice.toFixed(2)} ₺</p>
                                            <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">
                                                Servis Edildi
                                            </Badge>
                                        </div>
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                        {order.orderItems.length} ürün
                                    </div>
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>

                {/* Son İşlemler */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <CheckCircle className="h-5 w-5" />
                            Son İşlemler
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {transactions.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-8">
                                Henüz tamamlanan işlem bulunmuyor
                            </p>
                        ) : (
                            <div className="space-y-3">
                                {transactions.map(txn => (
                                    <div
                                        key={txn.id}
                                        className="flex items-center justify-between p-3 rounded-lg border"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500/10">
                                                {txn.method === 'Kart' ? (
                                                    <CreditCard className="h-4 w-4 text-green-600" />
                                                ) : (
                                                    <Banknote className="h-4 w-4 text-green-600" />
                                                )}
                                            </div>
                                            <div>
                                                <p className="font-medium">Masa {txn.table}</p>
                                                <p className="text-xs text-muted-foreground">{txn.time}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-semibold text-green-600">+{txn.amount.toFixed(2)} ₺</p>
                                            <Badge variant="outline" className="text-xs">{txn.method}</Badge>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Ödeme Dialogu */}
            <Dialog open={selectedOrder !== null} onOpenChange={(open) => !open && closeDialog()}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center justify-between">
                            <span>Ödeme Al — Masa {selectedOrder?.tableId}</span>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={closeDialog}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </DialogTitle>
                    </DialogHeader>

                    {selectedOrder && (
                        <div className="space-y-4">
                            {/* Sipariş Ürünleri */}
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                                {selectedOrder.orderItems.map((item, idx) => (
                                    <div key={idx} className="flex justify-between text-sm">
                                        <span>
                                            <span className="font-medium">{item.quantity}x</span> {item.productName}
                                        </span>
                                        <span>{(item.unitPrice * item.quantity).toFixed(2)} ₺</span>
                                    </div>
                                ))}
                            </div>

                            <div className="border-t pt-3 space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Ara Toplam</span>
                                    <span>{selectedOrder.totalPrice.toFixed(2)} ₺</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">KDV (%{(TAX_RATE * 100).toFixed(0)})</span>
                                    <span>{(selectedOrder.totalPrice * TAX_RATE).toFixed(2)} ₺</span>
                                </div>

                                {/* Bahşiş */}
                                <div className="pt-2">
                                    <p className="text-sm text-muted-foreground mb-2">Bahşiş Ekle</p>
                                    <div className="grid grid-cols-4 gap-2">
                                        {[5, 10, 15, 20].map(pct => (
                                            <Button
                                                key={pct}
                                                variant={tip === selectedOrder.totalPrice * (pct / 100) ? 'default' : 'outline'}
                                                size="sm"
                                                onClick={() => handleSelectTip(pct)}
                                            >
                                                %{pct}
                                            </Button>
                                        ))}
                                    </div>
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className="text-sm text-muted-foreground">Özel:</span>
                                        <Input
                                            type="number"
                                            placeholder="0.00"
                                            className="w-24 h-8"
                                            value={tip || ''}
                                            onChange={(e) => setTip(Number(e.target.value) || 0)}
                                        />
                                        <span className="text-sm text-muted-foreground">₺</span>
                                    </div>
                                </div>

                                {tip > 0 && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Bahşiş</span>
                                        <span>{tip.toFixed(2)} ₺</span>
                                    </div>
                                )}

                                <div className="flex justify-between text-lg font-bold pt-2 border-t">
                                    <span>Toplam</span>
                                    <span className="text-primary">{calculateTotal().toFixed(2)} ₺</span>
                                </div>
                            </div>

                            {/* Ödeme Yöntemi */}
                            <div className="grid grid-cols-2 gap-3">
                                <Button
                                    variant={paymentMethod === 'kart' ? 'default' : 'outline'}
                                    className="h-16 flex-col gap-1"
                                    onClick={() => setPaymentMethod('kart')}
                                >
                                    <CreditCard className="h-5 w-5" />
                                    <span>Kart</span>
                                </Button>
                                <Button
                                    variant={paymentMethod === 'nakit' ? 'default' : 'outline'}
                                    className="h-16 flex-col gap-1"
                                    onClick={() => setPaymentMethod('nakit')}
                                >
                                    <Banknote className="h-5 w-5" />
                                    <span>Nakit</span>
                                </Button>
                            </div>
                        </div>
                    )}

                    <DialogFooter className="flex-col gap-2 sm:flex-col">
                        <Button
                            className="w-full gap-2"
                            size="lg"
                            disabled={!paymentMethod}
                        >
                            <CheckCircle className="h-4 w-4" />
                            Ödemeyi Tamamla
                        </Button>
                        <Button variant="outline" className="w-full gap-2">
                            <Printer className="h-4 w-4" />
                            Fiş Yazdır
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
