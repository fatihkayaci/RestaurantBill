import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    CreditCard,
    Banknote,
    Receipt,
    DollarSign,
    TrendingUp,
    Clock,
    CheckCircle,
    Printer,
    X,
} from 'lucide-react';

interface MockOrderItem {
    name: string;
    quantity: number;
    unitPrice: number;
}

interface MockOrder {
    id: string;
    tableNumber: number;
    waiterName: string;
    subtotal: number;
    tax: number;
    total: number;
    items: MockOrderItem[];
}

interface MockTransaction {
    id: string;
    table: number;
    amount: number;
    time: string;
    method: 'Kart' | 'Nakit';
}

const TAX_RATE = 0.08;

const mockServedOrders: MockOrder[] = [
    {
        id: 'ORD-1042',
        tableNumber: 3,
        waiterName: 'Ali Demir',
        subtotal: 240,
        tax: 19.2,
        total: 259.2,
        items: [
            { name: 'Adana Kebap', quantity: 2, unitPrice: 95 },
            { name: 'Ayran', quantity: 2, unitPrice: 25 },
        ],
    },
    {
        id: 'ORD-1043',
        tableNumber: 7,
        waiterName: 'Zeynep Kaya',
        subtotal: 180,
        tax: 14.4,
        total: 194.4,
        items: [
            { name: 'Karışık Pizza', quantity: 1, unitPrice: 150 },
            { name: 'Cola', quantity: 1, unitPrice: 30 },
        ],
    },
    {
        id: 'ORD-1044',
        tableNumber: 12,
        waiterName: 'Mehmet Yıldız',
        subtotal: 420,
        tax: 33.6,
        total: 453.6,
        items: [
            { name: 'Tavuk Şiş', quantity: 3, unitPrice: 110 },
            { name: 'Salata', quantity: 2, unitPrice: 45 },
        ],
    },
];

const mockTransactions: MockTransaction[] = [
    { id: 'TXN-001', table: 4, amount: 287.5, time: '2 dk önce', method: 'Kart' },
    { id: 'TXN-002', table: 1, amount: 145.99, time: '15 dk önce', method: 'Nakit' },
    { id: 'TXN-003', table: 6, amount: 523.45, time: '32 dk önce', method: 'Kart' },
    { id: 'TXN-004', table: 8, amount: 167.8, time: '45 dk önce', method: 'Kart' },
];

const mockPaidTotal = 4280.55;

export default function CashierPage() {
    const [selectedOrder, setSelectedOrder] = useState<MockOrder | null>(null);
    const [tip, setTip] = useState<number>(0);
    const [paymentMethod, setPaymentMethod] = useState<'kart' | 'nakit' | null>(null);

    const todayRevenue =
        mockPaidTotal + mockServedOrders.reduce((sum, o) => sum + o.total, 0);
    const totalOrderCount = mockTransactions.length + mockServedOrders.length;
    const avgTicket = totalOrderCount > 0 ? todayRevenue / totalOrderCount : 0;

    const handleSelectTip = (percentage: number) => {
        if (selectedOrder) {
            setTip(selectedOrder.subtotal * (percentage / 100));
        }
    };

    const calculateTotal = () => {
        if (!selectedOrder) return 0;
        return selectedOrder.subtotal + selectedOrder.tax + tip;
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
                            <p className="text-2xl font-bold">{mockServedOrders.length}</p>
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
                            <p className="text-2xl font-bold">{mockTransactions.length}</p>
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
                        {mockServedOrders.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-8">
                                Ödeme bekleyen sipariş bulunmuyor
                            </p>
                        ) : (
                            mockServedOrders.map(order => (
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
                                                {order.tableNumber}
                                            </span>
                                            <div>
                                                <p className="font-semibold">Masa {order.tableNumber}</p>
                                                <p className="text-sm text-muted-foreground">{order.id}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-lg font-bold">{order.total.toFixed(2)} ₺</p>
                                            <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">
                                                Servis Edildi
                                            </Badge>
                                        </div>
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                        {order.items.length} ürün · Garson: {order.waiterName}
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
                        <div className="space-y-3">
                            {mockTransactions.map(txn => (
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
                    </CardContent>
                </Card>
            </div>

            {/* Ödeme Dialogu */}
            <Dialog open={selectedOrder !== null} onOpenChange={(open) => !open && closeDialog()}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center justify-between">
                            <span>Ödeme Al — Masa {selectedOrder?.tableNumber}</span>
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
                                {selectedOrder.items.map((item, idx) => (
                                    <div key={idx} className="flex justify-between text-sm">
                                        <span>
                                            <span className="font-medium">{item.quantity}x</span> {item.name}
                                        </span>
                                        <span>{(item.unitPrice * item.quantity).toFixed(2)} ₺</span>
                                    </div>
                                ))}
                            </div>

                            <div className="border-t pt-3 space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Ara Toplam</span>
                                    <span>{selectedOrder.subtotal.toFixed(2)} ₺</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">KDV (%{(TAX_RATE * 100).toFixed(0)})</span>
                                    <span>{selectedOrder.tax.toFixed(2)} ₺</span>
                                </div>

                                {/* Bahşiş */}
                                <div className="pt-2">
                                    <p className="text-sm text-muted-foreground mb-2">Bahşiş Ekle</p>
                                    <div className="grid grid-cols-4 gap-2">
                                        {[5, 10, 15, 20].map(pct => (
                                            <Button
                                                key={pct}
                                                variant={tip === selectedOrder.subtotal * (pct / 100) ? 'default' : 'outline'}
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
