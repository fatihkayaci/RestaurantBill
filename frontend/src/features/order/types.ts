export interface OrderItem{
    productId: number;
    productName: string;
    unitPrice: number;
    quantity: number;
}
export interface Order {
    id: number;
    note: string;
    totalPrice: number;
    status: number;
    orderItems: OrderItem[];
}