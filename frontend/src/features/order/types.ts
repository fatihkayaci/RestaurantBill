export interface OrderItem{
    productId: number;
    productName: string;
    unitPrice: number;
    quantity: number;
}
export interface Order {
    tableId: number;
    note: string;
    totalPrice: number;
    status: number;
    orderItems: OrderItem[];
}